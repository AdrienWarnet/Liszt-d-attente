/** Codes d'erreur métier : le front les traduit via `src/labels.ts`. */
export type ValidationCode =
  | 'nameRequired'
  | 'labelRequired'
  | 'endBeforeStart'
  | 'notFound'
  | 'projectDeleted'
  | 'sessionInProgress'
  | 'sessionEnded'
  | 'taskRunning'
  | 'durationInvalid'
  | 'hasTime'
  | 'sectionNameRequired'

export class ValidationError extends Error {
  readonly code: ValidationCode
  /** Précision pour le message (ex. libellés des tâches qui ont du temps). */
  readonly details: string[]

  constructor(code: ValidationCode, details: string[] = []) {
    super(code)
    this.name = 'ValidationError'
    this.code = code
    this.details = details
  }
}

export function isValidationError(e: unknown, code?: ValidationCode): e is ValidationError {
  return e instanceof ValidationError && (code === undefined || e.code === code)
}
