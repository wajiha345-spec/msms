import multer from 'multer';
import { cloudinary } from '../config/cloudinary';
import { Request } from 'express';

// Store files in memory (buffer), not on disk
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
  fileFilter(_req: Request, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG and WebP images are allowed'));
    }
  },
});

// The mime-type allowlist above trusts the client-supplied Content-Type
// header. This checks the actual file bytes for the three allowed formats'
// magic numbers, closing the gap where a spoofed Content-Type could smuggle
// an arbitrary file through as a "payment screenshot."
function hasValidImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng  = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return isJpeg || isPng || isWebp;
}

// Upload a buffer to Cloudinary and return the secure URL
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  filename: string
): Promise<string> {
  if (!hasValidImageMagicBytes(buffer)) {
    throw new Error('The uploaded file does not look like a valid JPEG, PNG, or WebP image.');
  }
  const uploadPromise = new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:         `msms/${folder}`,
        public_id:      filename,
        resource_type:  'image',
        transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });

  // 30-second hard timeout so the request never hangs forever
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Cloudinary upload timed out after 30s')), 30000)
  );

  return Promise.race([uploadPromise, timeoutPromise]);
}