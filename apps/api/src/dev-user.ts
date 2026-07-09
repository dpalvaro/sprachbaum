/**
 * TEMP(E2): no hay auth todavía, así que todo Attempt/LearningEvent se
 * atribuye a este único usuario de desarrollo. Cuando exista login real, este
 * fichero desaparece y CurrentUserService pasa a leer el id del JWT — ver
 * apps/api/src/modules/exercises/current-user.provider.ts.
 */
export const DEV_USER_EMAIL = 'dev@sprachbaum.local';
export const DEV_USER_NAME = 'Dev';
