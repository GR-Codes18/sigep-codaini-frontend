/**
 * Definir, cambiar o quitar la reunión semanal de un proyecto (Fase 2, paso 9A; propuesta §5.4 y §8.1; G3-A).
 *
 * La define el Administrador o el Supervisor del proyecto (también con el proyecto FINALIZADO). Día y hora van
 * **juntos**: o se mandan los dos o se mandan los dos en `null` para quitarla. Cada cambio avisa al equipo
 * (supervisor y practicantes activos con asignación vigente), sin quien lo hizo, también cuando se quita. El
 * evento guarda el valor anterior y el nuevo como «lunes a las 10:00» (`null` si no hay reunión).
 */

import { z } from 'zod';
import { puede, type DiaSemana, type Hora, type Proyecto } from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { autorDe, cambio } from '../historial';
import { crearNotificaciones } from '../notificaciones';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import {
  cargarContextoProyecto,
  equipoDelProyecto,
  eventoDeProyecto,
  reemplazarProyecto,
  textoReunion,
} from './comun';
import { esquemaDiaReunion, esquemaHoraReunion, exigirReunionCompleta } from './esquemas';

const esquemaReunion = z
  .object({
    idActor: esquemaId,
    idProyecto: esquemaId,
    /** `null` en los dos campos quita la reunión. */
    dia_reunion: esquemaDiaReunion.nullable(),
    hora_reunion: esquemaHoraReunion.nullable(),
  })
  .superRefine(exigirReunionCompleta);

export type EntradaDefinirReunion = z.input<typeof esquemaReunion>;

export function definirReunion(
  entrada: EntradaDefinirReunion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Proyecto>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaReunion, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const contexto = cargarContextoProyecto(datos, v.idActor, v.idProyecto);
    if (!contexto.ok) return contexto;
    const { actor, proyecto } = contexto.valor;

    const permiso = puede(actor, 'DEFINIR_REUNION', { proyecto });
    if (!permiso.permitido) return denegar(permiso);

    const nuevo: Proyecto = {
      ...proyecto,
      dia_reunion: v.dia_reunion as DiaSemana | null,
      hora_reunion: v.hora_reunion as Hora | null,
    };
    const antes = textoReunion(proyecto.dia_reunion, proyecto.hora_reunion);
    const despues = textoReunion(nuevo.dia_reunion, nuevo.hora_reunion);
    if (antes === despues) return fallo('SIN_CAMBIOS');

    const evento = eventoDeProyecto(
      {
        actor,
        proyecto: nuevo,
        tipo_accion: 'PROYECTO_REUNION_CAMBIADA',
        cambios: [cambio('reunion', antes, despues)],
      },
      marca,
      e.generarId,
    );
    const avisos = crearNotificaciones(
      {
        autor: autorDe(actor.id),
        destinatarios: equipoDelProyecto(datos, nuevo),
        tipo: 'REUNION_SEMANAL_CAMBIADA',
        mensaje:
          despues === null
            ? `La reunión semanal de ${nuevo.nombre} quedó sin definir.`
            : `La reunión semanal de ${nuevo.nombre} quedó el ${despues}.`,
        elemento: { tipo: 'PROYECTO', id: nuevo.id },
      },
      datos.usuarios,
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nuevo,
      cambios: conEfectos(
        datos,
        { proyectos: reemplazarProyecto(datos.proyectos, nuevo) },
        { eventos: [evento], notificaciones: avisos },
      ),
    };
  });
}
