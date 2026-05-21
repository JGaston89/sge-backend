import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

const DEFAULT_COUNTRY: CountryCode = 'AR';

@ValidatorConstraint({ name: 'IsValidPhone', async: false })
export class IsValidPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined || value === '') return true; // optional

    const raw = String(value).trim();
    try {
      return isValidPhoneNumber(raw, DEFAULT_COUNTRY);
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `'${args.value}' no es un número de teléfono válido. Usá formato internacional (+54 9 11 1234-5678) o nacional (011 1234-5678)`;
  }
}

/**
 * Validates phone numbers using libphonenumber-js.
 * Accepts international format or national numbers (default country: AR).
 * Stores normalized to E.164 via @Transform in the DTO.
 */
export function IsValidPhone(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsValidPhoneConstraint,
    });
  };
}

/**
 * Normalizes a phone string to E.164 format (e.g. "+5491123456789").
 * Returns the original string if parsing fails (validation will catch it).
 */
export function normalizePhone(raw: string | undefined | null): string | undefined | null {
  if (!raw) return raw;
  try {
    const parsed = parsePhoneNumber(raw.trim(), DEFAULT_COUNTRY);
    return parsed.isValid() ? parsed.format('E.164') : raw;
  } catch {
    return raw;
  }
}
