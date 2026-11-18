/**
 * Cambiar la contraseña propia (Fase 2, paso 10A; propuesta §8.2 y §8.3).
 *
 * Se pide la contraseña actual, la nueva (mínimo 8 caracteres, distinta de la actual) y su confirmación. Las
 * contraseñas no se recortan: los espacios cuentan. El cambio limpia `debe_cambiar_contrasena` (la franja de
 * contraseña temporal desaparece) y deja un `CUENTA_CONTRASENA_CAMBIADA` **sin «cambios»**: el historial nunca
 * guarda una contraseña, ni siquiera ese marcador. No avisa a nadie.
 *
 * Orden: Zod (forma, largo y confirmación) → actor → permiso → contraseña actual → distinta de la actual.
 */

import { z } from 'zod';
import { puede } from '@/domain';
import { obtenerActor } from '../actor';
import { ENTORNO, type Entorno } from '../entorno';
import { etiquetaUsuario } from '../etiquetas';
import { autorDe, crearEvento } from '../historial';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import { aSesionUsuario, type SesionUsuario } from './sesion';

export const LARGO_MINIMO_CONTRASENA = 8;

const esquemaCambio = z
  .object({
    idActor: esquemaId,
    contrasenaActual: z.string().min(1, 'Escribe tu contraseña actual.'),
    contrasenaNueva: z
      .string()
      .min(
        LARGO_MINIMO_CONTRASENA,
        `La contraseña nueva debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
      ),
    confirmacion: z.string(),
  })
  .refine((v) => v.confirmacion === v.contrasenaNueva, {
    path: ['confirmacion'],
    message: 'La confirmación no coincide con la contraseña nueva.',
  });

export type EntradaCambiarMiContrasena = z.input<typeof esquemaCambio>;

export function cambiarMiContrasena(
  entrada: EntradaCambiarMiContrasena,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<SesionUsuario>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaCambio, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;
    const persona = actor.valor;

    const permiso = puede(persona, 'CAMBIAR_CONTRASENA_PROPIA', { usuario_objetivo: persona });
    if (!permiso.permitido) return denegar(permiso);

    if (v.contrasenaActual !== persona.contrasena) {
      const mensaje = 'La contraseña actual no es correcta.';
      return fallo('CONTRASENA_ACTUAL_INCORRECTA', mensaje, { contrasenaActual: mensaje });
    }
    if (v.contrasenaNueva === persona.contrasena) {
      const mensaje = 'La contraseña nueva debe ser distinta de la actual.';
      return fallo('CONTRASENA_IGUAL_A_LA_ACTUAL', mensaje, { contrasenaNueva: mensaje });
    }

    const nuevo = { ...persona, contrasena: v.contrasenaNueva, debe_cambiar_contrasena: false };
    const evento = crearEvento(
      {
        autor: autorDe(persona.id),
        tipo_accion: 'CUENTA_CONTRASENA_CAMBIADA',
        elemento: { tipo: 'USUARIO', id: nuevo.id, etiqueta: etiquetaUsuario(nuevo) },
        id_proyecto: null,
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: aSesionUsuario(nuevo),
      cambios: conEfectos(
        datos,
        { usuarios: datos.usuarios.map((u) => (u.id === nuevo.id ? nuevo : u)) },
        { eventos: [evento] },
      ),
    };
  });
}
