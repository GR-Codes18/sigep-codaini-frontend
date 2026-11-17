/**
 * Barril de `data/`: almacén persistente y semilla. Sin reglas de negocio.
 */

export {
  CLAVE_ALMACEN,
  VERSION_ALMACEN,
  crearAlmacen,
  useAlmacen,
  type CambiosAlmacen,
  type EstadoAlmacen,
  type OpcionesAlmacen,
} from './almacen';
export { validarDatos } from './esquemas';
export { crearParametros } from './parametros';
export { crearSemilla } from './semilla';
export { COLECCIONES, type DatosAlmacen } from './tipos';
