import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit } from '../rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite requests dentro del límite', () => {
    const limiter = rateLimit({ interval: 60_000 });
    const r1 = limiter.check(3, 'user-1');
    const r2 = limiter.check(3, 'user-1');
    const r3 = limiter.check(3, 'user-1');
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
  });

  it('rechaza cuando se excede el límite', () => {
    const limiter = rateLimit({ interval: 60_000 });
    limiter.check(2, 'user-1');
    limiter.check(2, 'user-1');
    const r3 = limiter.check(2, 'user-1');
    expect(r3.success).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('reporta remaining correctamente', () => {
    const limiter = rateLimit({ interval: 60_000 });
    const r1 = limiter.check(3, 'user-1');
    expect(r1.remaining).toBe(2);
    const r2 = limiter.check(3, 'user-1');
    expect(r2.remaining).toBe(1);
    const r3 = limiter.check(3, 'user-1');
    expect(r3.remaining).toBe(0);
  });

  it('aísla tokens distintos', () => {
    const limiter = rateLimit({ interval: 60_000 });
    limiter.check(1, 'user-1');
    const r = limiter.check(1, 'user-2');
    expect(r.success).toBe(true);
  });

  it('resetea tras pasar el intervalo', () => {
    const limiter = rateLimit({ interval: 60_000 });
    limiter.check(1, 'user-1');
    const blocked = limiter.check(1, 'user-1');
    expect(blocked.success).toBe(false);

    vi.advanceTimersByTime(61_000);

    const afterReset = limiter.check(1, 'user-1');
    expect(afterReset.success).toBe(true);
  });

  it('limita tokens únicos si se excede uniqueTokenPerInterval', () => {
    const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 2 });
    limiter.check(5, 'user-1');
    limiter.check(5, 'user-2');
    // user-3 entra, debería evictar user-1
    limiter.check(5, 'user-3');
    // user-1 fue evictado, debería poder entrar de nuevo sin historial
    const r = limiter.check(1, 'user-1');
    expect(r.success).toBe(true);
  });
});
