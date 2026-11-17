import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { simularDemora } from './demora';

describe('simularDemora', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('no resuelve antes de cumplirse el tiempo y sí al cumplirse', async () => {
    let listo = false;
    void simularDemora(600).then(() => {
      listo = true;
    });
    await vi.advanceTimersByTimeAsync(599);
    expect(listo).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(listo).toBe(true);
  });

  it('con 0 resuelve sin crear ningún temporizador', async () => {
    await expect(simularDemora(0)).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rechaza una demora negativa o que no es un número finito', async () => {
    for (const ms of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(simularDemora(ms), String(ms)).rejects.toThrow(RangeError);
    }
  });
});
