import { Injectable } from '@nestjs/common';
import { DEV_USER_EMAIL } from '../../dev-user';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * TEMP(E2): no hay auth todavía (issues 10-12 sin hacer). Todo el tráfico se
 * atribuye al usuario dev fijo sembrado por seedDevUser. Este es el único
 * punto del código que resuelve "quién es el usuario actual" — cuando exista
 * el guard JWT de E2, se sustituye la implementación de `getUserId` por
 * `request.user.id` sin tocar controllers ni services que la consumen.
 */
@Injectable()
export class CurrentUserService {
  private cachedUserId: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getUserId(): Promise<string> {
    if (this.cachedUserId) {
      return this.cachedUserId;
    }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { email: DEV_USER_EMAIL },
      select: { id: true },
    });
    this.cachedUserId = user.id;
    return user.id;
  }
}
