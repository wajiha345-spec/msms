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

// Upload a buffer to Cloudinary and return the secure URL
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  filename: string
): Promise<string> {
  return new Promise((resolve, reject) => {
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
}