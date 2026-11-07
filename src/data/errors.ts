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

export class ValidationError extends Error {
  readonly code: ValidationCode

  constructor(code: ValidationCode) {
    super(code)
    this.name = 'ValidationError'
    this.code = code
  }
}

export function isValidationError(e: unknown, code?: ValidationCode): e is ValidationError {
  return e instanceof ValidationError && (code === undefined || e.code === code)
}
