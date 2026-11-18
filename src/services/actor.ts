/**
 * Quién actúa. La sesión solo guarda un resumen (`UsuarioSesion`, sin estado ni celular) y
 * `puede()` pide el `Usuario` completo, así que los servicios reciben el `idActor` y lo resuelven
 * dentro de la transacción: con el rol y el estado vigentes, no los de la sesión.
 */

import type { DatosAlmacen } from '@/data';
import type { Id, Usuario } from '@/domain';
import { exito, fallo, type Resultado } from './resultado';

export function obtenerActor(
  datos: Pick<DatosAlmacen, 'usuarios'>,
  idActor: Id,
): Resultado<Usuario> {
  const actor = datos.usuarios.find((u) => u.id === idActor);
  if (actor === undefined) {
    return fallo('NO_ENCONTRADO', 'No se encontró tu cuenta. Vuelve a iniciar sesión.');
  }
  return exito(actor);
}
