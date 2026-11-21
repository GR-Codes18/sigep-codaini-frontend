import type { EventoLinea } from '@/compartido/LineaTiempo';
import type {
  ListadoPracticantesACargo,
  PracticanteACargoDetalle,
  ProyectoResumen,
  SituacionACargo,
} from '@/services';
import { aEventosLinea } from './eventos';
import { aTareaTablero } from './tablero';
import { diaVisiblePeru } from './reportes';
import type { TareaDePracticanteParaVista } from './practicantes';

/** «7 nov 2026» a partir de `AAAA-MM-DD`. */
function diaVisible(fecha: string): string {
  return diaVisiblePeru(`${fecha}T12:00:00.000Z`);
}

export interface FilaPracticanteACargo {
  id: string;
  nombre: string;
  correo: string;
  /** Solo la especialidad: el Supervisor no ve el área técnica (§9.1.2). */
  especialidad: string;
  situacion: SituacionACargo;
  /**
   * Los proyectos suyos en los que participa; si ya salió de todos, aquellos en los que estuvo. Sin repetir, por nombre.
   * Una persona en dos proyectos del Supervisor es una sola fila con ambos.
   */
  proyectos: ProyectoResumen[];
  /** Tareas en progreso en los proyectos de este Supervisor. */
  carga: number;
  /** Tareas suyas esperando la revisión de este Supervisor. */
  esperandoMiRevision: number;
  ultimaActividadTexto: string;
  /** La baja más reciente en sus proyectos; `null` mientras sigue en alguno. */
  bajaTexto: string | null;
}

export interface PracticantesACargoParaVista {
  /** Por nombre, como las entrega la consulta. */
  filas: FilaPracticanteACargo[];
  contadores: ListadoPracticantesACargo['contadores'];
}

function sinRepetir(proyectos: readonly ProyectoResumen[]): ProyectoResumen[] {
  const vistos = new Map<string, ProyectoResumen>();
  for (const p of proyectos) vistos.set(p.id, p);
  return [...vistos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * El listado de `listarPracticantesACargo` a las filas de la tabla. Solo presenta: conserva el orden y los contadores
 * de la consulta, no filtra ni decide quién es activo (eso llega en `situacion`).
 */
export function aPracticantesACargo(
  listado: ListadoPracticantesACargo,
): PracticantesACargoParaVista {
  return {
    filas: listado.practicantes.map((p) => {
      const vigentes = p.proyectos.filter((x) => x.fecha_baja === null).map((x) => x.proyecto);
      const bajas = p.proyectos.flatMap((x) => (x.fecha_baja === null ? [] : [x.fecha_baja]));
      const ultimaBaja = vigentes.length > 0 ? null : ([...bajas].sort().at(-1) ?? null);
      return {
        id: p.id,
        nombre: p.nombre,
        correo: p.correo,
        especialidad: p.especialidad ?? 'Sin especialidad',
        situacion: p.situacion,
        proyectos: sinRepetir(vigentes.length > 0 ? vigentes : p.proyectos.map((x) => x.proyecto)),
        carga: p.carga,
        esperandoMiRevision: p.esperando_mi_revision,
        ultimaActividadTexto:
          p.ultima_actividad === null ? 'Sin actividad' : diaVisiblePeru(p.ultima_actividad),
        bajaTexto: ultimaBaja === null ? null : diaVisible(ultimaBaja),
      };
    }),
    contadores: listado.contadores,
  };
}

export interface ParticipacionACargoParaVista {
  proyecto: ProyectoResumen;
  altaTexto: string;
  /** `null` mientras la asignación sigue vigente. */
  bajaTexto: string | null;
}

export interface DetallePracticanteACargoParaVista {
  id: string;
  nombre: string;
  correo: string;
  celular: string;
  discord: string | null;
  cuentaGithub: string | null;
  /** «20 horas por semana», o `null` si no la indicó. */
  disponibilidadTexto: string | null;
  especialidad: string;
  situacion: SituacionACargo;
  /** La fecha de fin de práctica: el único dato de gestión que ve el Supervisor (§9.1.2). */
  fechaFinTexto: string;
  proyectos: ParticipacionACargoParaVista[];
  tareasActuales: TareaDePracticanteParaVista[];
  tareasCompletadas: TareaDePracticanteParaVista[];
  eventos: EventoLinea[];
}

const aTarea = (
  t: PracticanteACargoDetalle['tareas_actuales'][number],
): TareaDePracticanteParaVista => ({
  tarea: aTareaTablero(t),
  proyecto: t.proyecto,
});

/** El detalle de `obtenerPracticanteACargo` al modelo de presentación. Solo presenta: no hay acciones. */
export function aDetallePracticanteACargo(
  detalle: PracticanteACargoDetalle,
): DetallePracticanteACargoParaVista {
  return {
    id: detalle.id,
    nombre: detalle.nombre,
    correo: detalle.correo,
    celular: detalle.celular,
    discord: detalle.discord,
    cuentaGithub: detalle.cuenta_github,
    disponibilidadTexto:
      detalle.disponibilidad_horaria === null
        ? null
        : `${detalle.disponibilidad_horaria} horas por semana`,
    especialidad: detalle.especialidad ?? 'Sin especialidad',
    situacion: detalle.situacion,
    fechaFinTexto: diaVisible(detalle.fecha_fin_prevista),
    proyectos: detalle.proyectos.map((p) => ({
      proyecto: p.proyecto,
      altaTexto: diaVisible(p.fecha_alta),
      bajaTexto: p.fecha_baja === null ? null : diaVisible(p.fecha_baja),
    })),
    tareasActuales: detalle.tareas_actuales.map(aTarea),
    tareasCompletadas: detalle.tareas_completadas.map(aTarea),
    eventos: aEventosLinea(detalle.eventos),
  };
}
