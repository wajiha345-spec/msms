import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';

// SmartShop company-operator login — completely separate identity from a
// shop's own User model (see AdminUser in schema.prisma). Signed with
// ADMIN_JWT_SECRET, a different secret from shop-user JWT_SECRET, so a token
// from one can never authenticate against the other.
export async function loginAdmin(username: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { username } });
  if (!admin) throw new Error('Invalid username or password');

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw new Error('Invalid username or password');

  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

  const token = jwt.sign(
    { adminId: admin.id, username: admin.username },
    process.env.ADMIN_JWT_SECRET!,
    { expiresIn: '7d' }
  );

  return { token, admin: { id: admin.id, username: admin.username } };
}
