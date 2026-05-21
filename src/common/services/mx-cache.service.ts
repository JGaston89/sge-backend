import { Injectable } from '@nestjs/common';
import { promises as dns } from 'dns';

interface CacheEntry {
  valid: boolean;
  expiresAt: number;
}

const TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class MxCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  /**
   * Returns true if the domain has valid MX records (or if the check is
   * inconclusive due to transient DNS errors — fail-open).
   * Only returns false when the domain definitively does not exist (ENOTFOUND).
   */
  async hasMx(domain: string): Promise<boolean> {
    const key = domain.toLowerCase();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.valid;
    }

    let valid = true;
    try {
      const records = await dns.resolveMx(key);
      valid = records.length > 0;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      // Only reject on confirmed non-existent domains; pass all other errors
      if (code === 'ENOTFOUND' || code === 'ENODATA') {
        valid = false;
      }
    }

    this.cache.set(key, { valid, expiresAt: Date.now() + TTL_MS });
    return valid;
  }
}
