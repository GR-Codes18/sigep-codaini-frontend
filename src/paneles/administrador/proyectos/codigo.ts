/**
 * El código de un proyecto como lo espera el servicio: sin espacios y en mayúsculas (el servicio no lo normaliza, G1/9A).
 * Que tenga de 3 a 5 caracteres y que sea único lo comprueba el servicio y su mensaje sale en el campo.
 */
export const normalizarCodigoDeProyecto = (texto: string): string =>
  texto.replace(/\s+/g, '').toUpperCase();
