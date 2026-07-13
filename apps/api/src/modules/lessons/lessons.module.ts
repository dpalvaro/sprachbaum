import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { SrsModule } from '../srs/srs.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [ExercisesModule, SrsModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}
