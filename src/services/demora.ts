/**
 * Demora simulada de red. Se espera al inicio de cada llamada (antes de validar y de escribir) y
 * también cuando acaba en error, como haría una red real. Nunca va dentro de `transaccion`.
 */

export function simularDemora(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms < 0) {
    return Promise.reject(
      new RangeError('La demora debe ser un número de milisegundos mayor o igual que 0.'),
    );
  }
  if (ms === 0) return Promise.resolve();
  return new Promise((resolver) => {
    setTimeout(resolver, ms);
  });
}
