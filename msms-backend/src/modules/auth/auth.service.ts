import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';

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