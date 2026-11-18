/**
 * Restablecer los datos de demostración (Fase 2, paso 10C, parte 2; propuesta §5.8 y §14; solo prototipo).
 *
 * Solo el Administrador (`RESTABLECER_DATOS_DEMOSTRACION`). Descarta todo lo guardado y vuelve a una semilla nueva,
 * con las fechas relativas a `entorno.ahora()`, con el `restablecer` del almacén: una sola escritura y un solo aviso,
 * nunca una base a medias. No deja evento de historial (la base queda nueva) ni avisos.
 *
 * **Contrato de la sesión activa.** `services/` no toca el almacén de sesión: devuelve `{ usuario }` y la pantalla lo
 * aplica. `usuario` es la copia del actor **en la semilla nueva** (nombre, correo, contraseña temporal) si sigue
 * existiendo y está ACTIVO; `null` si ya no existe o quedó inactivo, y entonces la pantalla cierra la sesión.
 * Tampoco se llama a `ejecutarServicio`: su operación solo sabe escribir con `transaccion`; aquí se comprueba el
 * permiso con una consulta (con demora), se restablece, y se vuelve a leer sin demora para refrescar al actor.
 */

import { z } from 'zod';
import { puede } from '@/domain';
import { obtenerActor } from '../actor';
import { aSesionUsuario, type SesionUsuario } from '../cuentas/sesion';
import { ENTORNO, type Entorno } from '../entorno';
import { denegar, exito, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { ejecutarConsulta } from '../transaccional';

const esquemaRestablecer = z.object({ idActor: esquemaId });

export type EntradaRestablecerDatosDemostracion = z.input<typeof esquemaRestablecer>;

export interface DatosRestablecidos {
  /** El actor en los datos nuevos, o `null` si ya no puede seguir con la sesión (la pantalla la cierra). */
  usuario: SesionUsuario | null;
}

export async function restablecerDatosDemostracion(
  entrada: EntradaRestablecerDatosDemostracion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<DatosRestablecidos>> {
  const autorizado = await ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaRestablecer, entrada);
    if (!valida.ok) return valida;
    const actor = obtenerActor(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const permiso = puede(actor.valor, 'RESTABLECER_DATOS_DEMOSTRACION', {});
    if (!permiso.permitido) return denegar(permiso);
    return exito(actor.valor.id);
  });
  if (!autorizado.ok) return autorizado;

  try {
    entorno.almacen.getState().restablecer(entorno.ahora());
  } catch (error) {
    console.error('SIGEP: no se pudieron restablecer los datos de demostración.', error);
    return fallo('ERROR_INESPERADO');
  }

  // Ya sin demora (la espera simulada se hizo al principio): se lee al actor en los datos nuevos.
  return ejecutarConsulta({ ...entorno, demoraMs: 0 }, ({ datos }) => {
    const nuevo = datos.usuarios.find((u) => u.id === autorizado.valor);
    return exito({
      usuario: nuevo !== undefined && nuevo.estado === 'ACTIVO' ? aSesionUsuario(nuevo) : null,
    });
  });
}
