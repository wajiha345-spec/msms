// Idempotent bootstrap for the very first AdminUser row. Chained onto
// railway.json's preDeployCommand (which already runs `prisma migrate
// deploy` on every deploy) so this runs automatically on first deploy and is
// a cheap no-op on every deploy after — no CLI/manual step, no standing HTTP
// bootstrap endpoint ever exposed.
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';

async function main() {
  const existing = await prisma.adminUser.count();
  if (existing > 0) {
    console.log(`seedAdmin: ${existing} AdminUser row(s) already exist — skipping.`);
    return;
  }

  const username = process.env.ADMIN_BOOTSTRAP_USERNAME;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!username || !password) {
    console.log('seedAdmin: ADMIN_BOOTSTRAP_USERNAME/ADMIN_BOOTSTRAP_PASSWORD not set — skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.create({ data: { username, passwordHash } });
  console.log(`seedAdmin: created first AdminUser "${username}".`);
}

main()
  .catch((e) => {
    console.error('seedAdmin failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
