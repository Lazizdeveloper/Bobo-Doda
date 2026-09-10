import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { ValidationDomainError } from '../errors/domain-error';

/**
 * Nested `ValidationError[]` → `{ 'field.path': birinchi_xabar }`.
 */
function flatten(errors: ValidationError[], parentPath = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const err of errors) {
    const path = parentPath ? `${parentPath}.${err.property}` : err.property;
    if (err.constraints) {
      const first = Object.values(err.constraints)[0];
      if (first) out[path] = first;
    }
    if (err.children && err.children.length > 0) {
      Object.assign(out, flatten(err.children, path));
    }
  }
  return out;
}

/**
 * Global `ValidationPipe` — prompt talabi: `whitelist`, `forbidNonWhitelisted`,
 * `transform`. `exceptionFactory` maydon-darajali xatoni `ValidationDomainError`
 * ga o'raydi → `AllExceptionsFilter` uni `{ code: "VALIDATION", fieldErrors }`
 * qiladi.
 */
export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    stopAtFirstError: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new ValidationDomainError(flatten(errors)),
  });
}

export { flatten as flattenValidationErrors };
