import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { CurrentUserService } from '../exercises/current-user.provider';
import { SubmitReviewSchema } from './dto/submit-review.dto';
import type { SrsReviewResult, SrsSessionResponse } from './srs.service';
import { SrsService } from './srs.service';

@Controller('srs')
export class SrsController {
  constructor(
    private readonly srs: SrsService,
    private readonly currentUser: CurrentUserService,
  ) {}

  @Get('session')
  async getSession(): Promise<SrsSessionResponse> {
    const userId = await this.currentUser.getUserId();
    return this.srs.buildSession(userId);
  }

  @Post('review')
  async submitReview(@Body() body: unknown): Promise<SrsReviewResult> {
    const parsed = SubmitReviewSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const userId = await this.currentUser.getUserId();
    return this.srs.review(userId, parsed.data);
  }
}
