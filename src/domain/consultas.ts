/**
 * Ayudantes puros de las consultas (Fase 2, paso 11A; propuesta §5.2, §6.8, §9.1.5 y §9.2.3).
 *
 * Son las reglas de presentación de datos que las pantallas no deben decidir por su cuenta: qué
 * tareas muestra la columna «Terminada», en qué orden van «Mis tareas en curso», qué tareas
 * aparecen en «Pull Requests por atender», en qué situación está un practicante y cuál es la
 * próxima reunión de un proyecto. Todas reciben los datos por parámetro y devuelven copias; ninguna
 * lee el reloj ni modifica su entrada. No importa React, Zustand, `data/` ni `services/`.
 */

import type { FechaHora, Hora, Id } from './comunes';
import { DIAS_SEMANA } from './enumeraciones';
import type { DiaSemana, EstadoPracticante, EstadoPR } from './enumeraciones';
import { etiquetaPRVisible } from './estadoPR';
import { proyectosDeCarga } from './indicadores';
import type { Asignacion, Proyecto } from './proyectos';
import type { Tarea } from './tareas';
import { DESFASE_ZONA_HORARIA_MS, MS_POR_DIA, esAhoraValido } from './tiempo';
import type { Usuario } from './usuarios';

/** Cuántas tareas muestra la columna «Terminada» del tablero (§6.8). */
export const TERMINADAS_EN_TABLERO = 5;

function compararTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ── Tablero ──────────────────────────────────────────────────────────────────────────────────

/**
 * Las tareas TERMINADA, de la más reciente a la más antigua por `fecha_termino` (§6.8). Con la
 * misma fecha, la de número mayor primero. Una terminada sin fecha (dato roto) va al final.
 */
export function ordenarTerminadas(tareas: readonly Tarea[]): Tarea[] {
  return tareas
    .filter((t) => t.estado === 'TERMINADA')
    .sort((a, b) => {
      const fechaA = a.fecha_termino === null ? -Infinity : Date.parse(a.fecha_termino);
      const fechaB = b.fecha_termino === null ? -Infinity : Date.parse(b.fecha_termino);
      if (fechaA !== fechaB) return fechaB > fechaA ? 1 : -1;
      return b.numero - a.numero || compararTexto(a.id, b.id);
    });
}

export interface TerminadasRecientes {
  /** Las más recientes, hasta `limite`. */
  recientes: Tarea[];
  /** Cuántas terminadas hay en total (para «Ver todas las terminadas»). */
  total: number;
}

/** La columna «Terminada»: las `limite` más recientes (5 por defecto) y el total. */
export function terminadasRecientes(
  tareas: readonly Tarea[],
  limite: number = TERMINADAS_EN_TABLERO,
): TerminadasRecientes {
  const todas = ordenarTerminadas(tareas);
  return { recientes: todas.slice(0, Math.max(0, limite)), total: todas.length };
}

// ── Inicio del practicante ───────────────────────────────────────────────────────────────────

/**
 * «Mis tareas en curso» (§9.2.3): las tareas EN_PROGRESO en este orden: primero las devueltas con
 * observaciones, luego las vencidas y luego por fecha límite (la más próxima primero). Con todo
 * igual, por número y por id para que el orden sea estable. `devueltas` son los ids de las tareas
 * con la marca vigente (`devolucionVigente`).
 *
 * No hay un criterio propio para «vencidas» ni recibe `hoy`: una tarea vencida tiene su fecha límite
 * anterior a hoy, así que ordenar por fecha límite ya las pone antes que las demás de su grupo. Un
 * criterio aparte nunca cambiaría el resultado (se comprobó con una mutación: era código muerto).
 */
export function ordenarTareasEnCurso(
  tareas: readonly Tarea[],
  devueltas: ReadonlySet<Id>,
): Tarea[] {
  const primero = (condicion: boolean) => (condicion ? 0 : 1);
  return tareas
    .filter((t) => t.estado === 'EN_PROGRESO')
    .sort(
      (a, b) =>
        primero(devueltas.has(a.id)) - primero(devueltas.has(b.id)) ||
        compararTexto(a.fecha_limite, b.fecha_limite) ||
        a.numero - b.numero ||
        compararTexto(a.id, b.id),
    );
}

/** Etiquetas de PR que piden una acción del practicante (§9.2.3). */
const ETIQUETAS_POR_ATENDER: readonly EstadoPR[] = ['PENDIENTE', 'CON_CONFLICTOS'];

/**
 * «Pull Requests por atender» (§9.2.3): las tareas cuya etiqueta de PR **visible** es Pendiente
 * (falta crearlo) o Con conflictos (hay que resolverlos). Consulta `estado_pr`, no la columna del
 * Kanban: incluye tareas ESPERANDO_SUPERVISION y TERMINADA. Una tarea sin «Requiere PR» no aparece.
 * Orden estable: fecha límite, número e id.
 */
export function prPorAtender(tareas: readonly Tarea[]): Tarea[] {
  return tareas
    .filter((t) => {
      const etiqueta = etiquetaPRVisible(t);
      return etiqueta !== null && ETIQUETAS_POR_ATENDER.includes(etiqueta);
    })
    .sort(
      (a, b) =>
        compararTexto(a.fecha_limite, b.fecha_limite) ||
        a.numero - b.numero ||
        compararTexto(a.id, b.id),
    );
}

// ── Practicantes ─────────────────────────────────────────────────────────────────────────────

export interface SituacionPracticante {
  /** Presentación derivada de `Usuario.estado` (§4.2): nunca se guarda. */
  estado: EstadoPracticante;
  /**
   * Activo sin ningún proyecto vigente que no esté FINALIZADO (un proyecto EN_PAUSA sí cuenta).
   * Un practicante finalizado nunca está «sin proyecto»: ya no tiene acceso.
   */
  sin_proyecto: boolean;
}

/**
 * Pestañas de §5.2: «Activos» es `estado: 'ACTIVO'` (incluye a los sin proyecto), «Sin proyecto» es
 * `estado: 'ACTIVO'` con `sin_proyecto`, y «Finalizados» es `estado: 'FINALIZADO'`. Los proyectos
 * que cuentan son los mismos de la carga (`proyectosDeCarga`).
 */
export function situacionPracticante(
  usuario: Pick<Usuario, 'id' | 'estado'>,
  asignaciones: readonly Asignacion[],
  proyectos: readonly Pick<Proyecto, 'id' | 'estado'>[],
): SituacionPracticante {
  if (usuario.estado !== 'ACTIVO') return { estado: 'FINALIZADO', sin_proyecto: false };
  return {
    estado: 'ACTIVO',
    sin_proyecto: proyectosDeCarga(usuario.id, asignaciones, proyectos).length === 0,
  };
}

// ── Reuniones ────────────────────────────────────────────────────────────────────────────────

const FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Próxima ocurrencia de la reunión semanal, en hora de Perú (UTC−5), como instante UTC. Una reunión
 * que empieza exactamente en `ahora` cuenta como próxima. `null` si el proyecto no tiene reunión
 * («Sin definir»), si le falta el día o la hora, si la hora no es `HH:mm` o si `ahora` no es válido.
 */
export function proximaReunion(
  reunion: { dia_reunion: DiaSemana | null; hora_reunion: Hora | null },
  ahora: FechaHora,
): FechaHora | null {
  if (reunion.dia_reunion === null || reunion.hora_reunion === null) return null;
  if (!esAhoraValido(ahora)) return null;
  const hora = FORMATO_HORA.exec(reunion.hora_reunion);
  if (hora === null) return null;

  // «Reloj de Perú»: se trabaja con los campos UTC de un instante desplazado, sin usar la zona del equipo.
  const localMs = Date.parse(ahora) + DESFASE_ZONA_HORARIA_MS;
  const local = new Date(localMs);
  const diaObjetivo = (DIAS_SEMANA.indexOf(reunion.dia_reunion) + 1) % 7; // 0 = domingo, como getUTCDay
  const hoyALaHora = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    Number(hora[1]),
    Number(hora[2]),
  );
  const diasHasta = (diaObjetivo - local.getUTCDay() + 7) % 7;
  let candidata = hoyALaHora + diasHasta * MS_POR_DIA;
  if (candidata < localMs) candidata += 7 * MS_POR_DIA;
  return new Date(candidata - DESFASE_ZONA_HORARIA_MS).toISOString();
}

export interface ReunionProxima {
  id_proyecto: Id;
  dia_reunion: DiaSemana | null;
  hora_reunion: Hora | null;
  /** `null` = «Sin definir». */
  proxima: FechaHora | null;
}

/**
 * «Próximas reuniones» (§9.1.5, §9.2.3): una fila por proyecto, la más cercana primero y los
 * «Sin definir» al final. Con la misma hora, por id de proyecto.
 */
export function ordenarReuniones(
  proyectos: readonly Pick<Proyecto, 'id' | 'dia_reunion' | 'hora_reunion'>[],
  ahora: FechaHora,
): ReunionProxima[] {
  return proyectos
    .map((p): ReunionProxima => ({
      id_proyecto: p.id,
      dia_reunion: p.dia_reunion,
      hora_reunion: p.hora_reunion,
      proxima: proximaReunion(p, ahora),
    }))
    .sort((a, b) => {
      if (a.proxima === null && b.proxima === null)
        return compararTexto(a.id_proyecto, b.id_proyecto);
      if (a.proxima === null) return 1;
      if (b.proxima === null) return -1;
      return compararTexto(a.proxima, b.proxima) || compararTexto(a.id_proyecto, b.id_proyecto);
    });
}
