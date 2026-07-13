import { FillBlank } from '../exercises/FillBlank';
import { Matching } from '../exercises/Matching';
import { MultipleChoice } from '../exercises/MultipleChoice';
import { SentenceOrder } from '../exercises/SentenceOrder';
import { ShortAnswer } from '../exercises/ShortAnswer';
import type { ExerciseOutcome, PublicExercise } from '../../lib/types';

interface ExerciseScreenProps {
  exercise: PublicExercise;
  onAdvance: (outcome: ExerciseOutcome) => void;
}

/**
 * `key={exercise.id}` es lo que permite reutilizar MultipleChoice/FillBlank
 * tal cual sin tocarlos: fuerza a React a remontar el componente (y por tanto
 * useExerciseAttempt) en cada ejercicio nuevo, en vez de arrastrar el estado
 * de intento del ejercicio anterior.
 */
export function ExerciseScreen({ exercise, onAdvance }: ExerciseScreenProps) {
  switch (exercise.type) {
    case 'multiple_choice':
      return (
        <MultipleChoice
          key={exercise.id}
          exercise={exercise}
          onAdvance={onAdvance}
        />
      );
    case 'fill_blank':
      return (
        <FillBlank
          key={exercise.id}
          exercise={exercise}
          onAdvance={onAdvance}
        />
      );
    case 'sentence_order':
      return (
        <SentenceOrder
          key={exercise.id}
          exercise={exercise}
          onAdvance={onAdvance}
        />
      );
    case 'short_answer':
      return (
        <ShortAnswer
          key={exercise.id}
          exercise={exercise}
          onAdvance={onAdvance}
        />
      );
    case 'matching':
      return (
        <Matching key={exercise.id} exercise={exercise} onAdvance={onAdvance} />
      );
  }
}
