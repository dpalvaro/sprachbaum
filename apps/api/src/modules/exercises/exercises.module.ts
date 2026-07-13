import { Module } from '@nestjs/common';
import { CurrentUserService } from './current-user.provider';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

@Module({
  controllers: [ExercisesController],
  providers: [ExercisesService, CurrentUserService],
  exports: [CurrentUserService],
})
export class ExercisesModule {}
