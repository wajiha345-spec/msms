import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';

export async function loginUser(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error('Invalid username or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid username or password');

  const token = jwt.sign(
    { userId: user.id, role: user.role, plan: user.plan },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );

  return {
    token,
    user: {
      id:       user.id,
      username: user.username,
      role:     user.role,
      shopName: user.shopName,
      plan:     user.plan,
    },
  };
}

export async function registerUser(username: string, password: string, role = 'staff') {
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) throw new Error('Username already taken');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, passwordHash, role },
  });

  return { id: user.id, username: user.username, role: user.role };
}