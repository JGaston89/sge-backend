import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { MxCacheService } from '../services/mx-cache.service';
import { TEMP_EMAIL_DOMAINS } from './temp-domains';

// RFC 5322-compatible strict format check
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

@ValidatorConstraint({ name: 'IsValidEmail', async: true })
@Injectable()
export class IsValidEmailConstraint implements ValidatorConstraintInterface {
  constructor(private readonly mxCache: MxCacheService) {}

  async validate(value: unknown): Promise<boolean> {
    if (value === null || value === undefined || value === '') return true; // optional fields

    const email = String(value).toLowerCase().trim();

    // Level 1 — format
    if (!EMAIL_REGEX.test(email)) return false;

    const domain = email.split('@')[1];

    // Level 2 — disposable domain blocklist
    if (TEMP_EMAIL_DOMAINS.has(domain)) return false;

    // Level 3 — MX record verification (fail-open)
    // Guard: if DI didn't inject mxCache, skip MX check rather than throwing
    if (!this.mxCache) return true;
    try {
      return await this.mxCache.hasMx(domain);
    } catch {
      return true; // fail-open on unexpected errors
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const value = String(args.value ?? '').toLowerCase().trim();
    if (!EMAIL_REGEX.test(value)) {
      return 'El formato del email no es válido';
    }
    const domain = value.split('@')[1];
    if (domain && TEMP_EMAIL_DOMAINS.has(domain)) {
      return 'No se permiten emails de dominios temporales o descartables';
    }
    return 'El dominio del email no existe o no puede recibir correos';
  }
}

/**
 * Validates email format + blocks disposable domains + verifies MX record.
 * Fail-open: transient DNS errors are treated as valid.
 * Only use on create/edit endpoints, NOT on login or search queries.
 */
export function IsValidEmail(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsValidEmailConstraint,
    });
  };
}
