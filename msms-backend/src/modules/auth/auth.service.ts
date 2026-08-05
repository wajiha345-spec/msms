import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/db';
import { sendPasswordResetEmail } from '../../utils/email';

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

export async function loginUser(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username }, include: { shop: true } });
  if (!user) throw new Error('Invalid username or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid username or password');

  const token = jwt.sign(
    { userId: user.id, role: user.role, plan: user.shop.plan, shopId: user.shopId },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );

  return {
    token,
    user: {
      id:       user.id,
      username: user.username,
      role:     user.role,
      shopName: user.shop.name,
      plan:     user.shop.plan,
    },
  };
}

// Generates a 6-digit OTP, emails it to the account's address on file, and
// stores only its hash — never returns whether a matching account exists,
// so a caller can't use this to enumerate usernames.
export async function requestPasswordReset(username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.email) return { sent: false as const };

  const otp     = String(crypto.randomInt(100000, 1000000));
  const otpHash = await bcrypt.hash(otp, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetOtpHash:      otpHash,
      resetOtpExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  await sendPasswordResetEmail({ username: user.username, email: user.email, otp });

  return { sent: true as const, maskedEmail: maskEmail(user.email) };
}

export async function resetPassword(username: string, otp: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
    throw new Error('Invalid or expired reset code');
  }
  if (user.resetOtpExpiresAt < new Date()) {
    throw new Error('Reset code has expired. Please request a new one.');
  }

  const valid = await bcrypt.compare(otp, user.resetOtpHash);
  if (!valid) throw new Error('Invalid or expired reset code');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetOtpHash: null, resetOtpExpiresAt: null },
  });
}