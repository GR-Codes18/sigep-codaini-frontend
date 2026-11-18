/**
 * Restablecer la contraseña de un practicante o de un supervisor (Fase 2, paso 8B; propuesta §5.2, §5.3 y §8.3).
 *
 * Solo el Administrador, y solo a personas **activas** (con la práctica finalizada o el supervisor inactivo, el
 * mensaje dice que primero se reactive: `USUARIO_OBJETIVO_INACTIVO`). Genera otra contraseña temporal con
 * `entorno.generarContrasena`, deja la cuenta marcada para cambiarla (`debe_cambiar_contrasena`) y la devuelve
 * **una sola vez**; nunca va al historial. El evento no lleva «cambios»: el historial rechaza cualquier campo de
 * contraseña (también `debe_cambiar_contrasena`). No avisa a nadie (§8.1): la entrega es por fuera del sistema.
 */

import { z } from 'zod';
import { puede, type Id } from '@/domain';
import { obtenerActor } from '../actor';
import { ENTORNO, type Entorno } from '../entorno';
import { etiquetaUsuario } from '../etiquetas';
import { autorDe, crearEvento } from '../historial';
import { cargarPersona } from '../practicantes/comun';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';

const esquemaRestablecer = z.object({ idActor: esquemaId, idUsuario: esquemaId });

export type EntradaRestablecerContrasena = z.input<typeof esquemaRestablecer>;

export interface ContrasenaRestablecida {
  id_usuario: Id;
  /** Se muestra una sola vez; el Administrador la entrega por fuera del sistema. */
  contrasena_temporal: string;
}

export function restablecerContrasena(
  entrada: EntradaRestablecerContrasena,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ContrasenaRestablecida>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaRestablecer, entrada);
    if (!valida.ok) return valida;
    const actor = obtenerActor(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const objetivo = cargarPersona(datos, valida.valor.idUsuario);
    if (!objetivo.ok) return objetivo;

    // Solo a practicantes y supervisores (a un administrador, `FUERA_DE_ALCANCE`).
    const permiso = puede(actor.valor, 'RESTABLECER_CONTRASENA', {
      usuario_objetivo: objetivo.valor,
    });
    if (!permiso.permitido) return denegar(permiso);
    if (objetivo.valor.estado !== 'ACTIVO') return fallo('USUARIO_OBJETIVO_INACTIVO');

    const contrasena_temporal = e.generarContrasena();
    const nuevo = {
      ...objetivo.valor,
      contrasena: contrasena_temporal,
      debe_cambiar_contrasena: true,
    };
    const evento = crearEvento(
      {
        autor: autorDe(actor.valor.id),
        tipo_accion:
          nuevo.rol === 'PRACTICANTE'
            ? 'PRACTICANTE_CONTRASENA_RESTABLECIDA'
            : 'SUPERVISOR_CONTRASENA_RESTABLECIDA',
        elemento: { tipo: 'USUARIO', id: nuevo.id, etiqueta: etiquetaUsuario(nuevo) },
        id_proyecto: null,
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: { id_usuario: nuevo.id, contrasena_temporal },
      cambios: conEfectos(
        datos,
        { usuarios: datos.usuarios.map((u) => (u.id === nuevo.id ? nuevo : u)) },
        { eventos: [evento] },
      ),
    };
  });
}
