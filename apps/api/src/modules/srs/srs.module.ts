import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { SrsController } from './srs.controller';
import { SrsService } from './srs.service';

@Module({
  imports: [ExercisesModule],
  controllers: [SrsController],
  providers: [SrsService],
  exports: [SrsService],
})
export class SrsModule {}
