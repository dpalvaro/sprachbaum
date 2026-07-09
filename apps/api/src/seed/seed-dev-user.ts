import { PrismaClient } from '@prisma/client';
import { DEV_USER_EMAIL, DEV_USER_NAME } from '../dev-user';

/** Upsert idempotente del usuario dev fijo (ver ../dev-user.ts). */
export async function seedDevUser(prisma: PrismaClient): Promise<void> {
  await prisma.user.upsert({
    where: { email: DEV_USER_EMAIL },
    update: {},
    create: { email: DEV_USER_EMAIL, name: DEV_USER_NAME },
  });
}
