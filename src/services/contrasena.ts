/**
 * Contraseña temporal de una cuenta nueva (propuesta §5.1, §8.3).
 *
 * 10 caracteres elegidos al azar con `crypto.getRandomValues`, sin los que se confunden al dictarlos
 * (0/O, 1/l/I). Supera el mínimo de 8 que exige §8.3. El Administrador la ve una sola vez y la entrega
 * por fuera del sistema; la persona la cambia al entrar.
 */

export const LONGITUD_CONTRASENA_TEMPORAL = 10;

export const ALFABETO_CONTRASENA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Una fuente de bytes aleatorios (por defecto, la del navegador). Las pruebas pasan una fija. */
export type FuenteAleatoria = (longitud: number) => Uint8Array;

const fuenteDelNavegador: FuenteAleatoria = (longitud) =>
  crypto.getRandomValues(new Uint8Array(longitud));

export function generarContrasenaTemporal(fuente: FuenteAleatoria = fuenteDelNavegador): string {
  // Se descartan los bytes que dejarían unos caracteres más probables que otros.
  const limite = 256 - (256 % ALFABETO_CONTRASENA.length);
  let contrasena = '';
  while (contrasena.length < LONGITUD_CONTRASENA_TEMPORAL) {
    for (const byte of fuente(LONGITUD_CONTRASENA_TEMPORAL * 2)) {
      if (byte < limite && contrasena.length < LONGITUD_CONTRASENA_TEMPORAL) {
        contrasena += ALFABETO_CONTRASENA[byte % ALFABETO_CONTRASENA.length];
      }
    }
  }
  return contrasena;
}
