/**
 * Puerto de GitHub (§7.6), simulado en el prototipo (§7.7). Decisión D4-A del paso 5 y P1 a P5 del
 * paso 6.
 *
 * Los servicios no hablan con GitHub directamente: usan `entorno.github`. Las cuatro operaciones de
 * §7.6 son consultar el estado de un PR, listar las ramas, crear el PR y cerrarlo.
 *
 * Es **síncrono** porque la operación de `ejecutarServicio` corre dentro de la transacción del
 * almacén, que es síncrona, y el GitHub simulado siempre responde (S1 del paso 5 de la Fase 1). Con un
 * backend real se reemplaza toda la capa `services/`, no solo este puerto.
 *
 * La simulación no guarda estado propio: todo lo que necesita (proyecto, PR conocidos) llega por
 * parámetro, así que es determinista.
 */

import type { ConsultaGitHub, EstadoPR, Proyecto, ResultadoCreacionPR, Tarea } from '@/domain';

// ── Tipos del puerto ─────────────────────────────────────────────────────────────────────────

/** Lo que la simulación necesita de la tarea: la URL del PR y el último estado conocido. */
export type TareaConsultable = Pick<Tarea, 'url_pull_request' | 'estado_pr'>;

/** El repositorio de un proyecto, con lo que la simulación usa para inventar sus ramas. */
export type RepositorioPR = Pick<
  Proyecto,
  'repositorio_url' | 'codigo' | 'rama_base' | 'ultimo_numero_tarea'
>;

/** Un PR que el sistema ya conoce en el proyecto (de alguna tarea con URL). */
export interface PRConocido {
  url: string;
  rama_origen: string;
  rama_base: string;
  estado_pr: EstadoPR;
  /** Es el PR anterior de la misma tarea: no cuenta como «ya existe» (§7.4, correcciones en un PR nuevo). */
  propio: boolean;
}

export interface SolicitudPR {
  repositorio: RepositorioPR;
  rama_origen: string;
  titulo: string;
  descripcion: string;
  /** Todos los PR conocidos del proyecto: para detectar uno existente y para numerar el nuevo. */
  prs_del_proyecto: readonly PRConocido[];
}

export type RespuestaCrearPR =
  | { ok: true; resultado: ResultadoCreacionPR; url: string; conflictos: boolean }
  | { ok: false; codigo: 'RAMA_INEXISTENTE' };

export interface PuertoGitHub {
  /**
   * Estado actual en GitHub del PR de la tarea: abierto (con o sin conflictos), fusionado o
   * cerrado. Solo se llama si `necesitaConsultaGitHub(tarea)`: la tarea requiere PR y ya tuvo uno.
   */
  consultarPullRequest(tarea: TareaConsultable): ConsultaGitHub;
  /** Ramas ya subidas al repositorio, para el desplegable del modal (§7.2). Sin la rama base. */
  listarRamas(repositorio: RepositorioPR): string[];
  /**
   * Crea el PR de `rama_origen` contra la rama base del proyecto, o detecta uno que ya existía para
   * esas ramas (§7.5). `conflictos` es la consulta que GitHub hace unos segundos después de crearlo.
   */
  crearPullRequest(solicitud: SolicitudPR): RespuestaCrearPR;
  /** Cierra el PR sin fusionarlo (GitHub no permite borrarlo). */
  cerrarPullRequest(url: string): void;
}

// ── Simulación ───────────────────────────────────────────────────────────────────────────────

/**
 * GitHub simulado: responde lo último que el sistema sabe de ese PR. Un `PENDIENTE` con URL es un
 * PR viejo ya fusionado (el recálculo «fusionado → PENDIENTE» conserva la URL), así que responde
 * fusionado. Una URL sin `estado_pr` no puede existir: es un dato roto y lanza.
 */
export function consultaSimulada(tarea: TareaConsultable): ConsultaGitHub {
  if (tarea.url_pull_request === null || tarea.estado_pr === null) {
    throw new Error('GitHub simulado: la tarea no tiene un Pull Request que consultar.');
  }
  switch (tarea.estado_pr) {
    case 'CREADO':
      return { estado: 'ABIERTO', conflictos: false };
    case 'CON_CONFLICTOS':
      return { estado: 'ABIERTO', conflictos: true };
    case 'FUSIONADO':
    case 'PENDIENTE':
      return { estado: 'FUSIONADO' };
    case 'CERRADO':
      return { estado: 'CERRADO' };
  }
}

function prefijoRamas(codigo: string): string {
  return `feature/${codigo.toLowerCase()}`;
}

/** Rama que aparece en la lista pero ya no existe al crear: el caso de error preparado (P2-A). */
export function ramaEliminada(repositorio: Pick<RepositorioPR, 'codigo'>): string {
  return `${prefijoRamas(repositorio.codigo)}-rama-eliminada`;
}

/** Rama cuyo PR GitHub crea con conflictos contra la base (P5-A). */
export function ramaConConflictos(repositorio: Pick<RepositorioPR, 'codigo'>): string {
  return `${prefijoRamas(repositorio.codigo)}-con-conflictos`;
}

/**
 * Catálogo de ramas de ejemplo (P1-A): una `feature/<código>-NNN` por cada número de tarea del
 * proyecto (de 1 a `ultimo_numero_tarea`, el mismo formato que la semilla) y las dos ramas especiales.
 * La rama base no se lista: no se abre un PR de la base contra sí misma.
 */
export function ramasSimuladas(repositorio: RepositorioPR): string[] {
  const prefijo = prefijoRamas(repositorio.codigo);
  const ramas: string[] = [];
  for (let numero = 1; numero <= repositorio.ultimo_numero_tarea; numero += 1) {
    ramas.push(`${prefijo}-${String(numero).padStart(3, '0')}`);
  }
  ramas.push(ramaConConflictos(repositorio), ramaEliminada(repositorio));
  return ramas;
}

/** Número del PR al final de su URL (`…/pull/7` → 7), o 0 si no tiene ese formato. */
function numeroDePR(url: string): number {
  const coincidencia = /\/pull\/(\d+)$/.exec(url);
  return coincidencia === null ? 0 : Number(coincidencia[1]);
}

const ESTADOS_ABIERTO: readonly EstadoPR[] = ['CREADO', 'CON_CONFLICTOS'];
/** Un PENDIENTE con URL es un PR viejo ya fusionado (ver `consultaSimulada`). */
const ESTADOS_FUSIONADO: readonly EstadoPR[] = ['FUSIONADO', 'PENDIENTE'];

/**
 * Crear un PR en el GitHub simulado:
 *   1. una rama fuera del catálogo o la rama eliminada → `RAMA_INEXISTENTE` (P2-A);
 *   2. un PR de otra tarea con las mismas ramas, abierto → se vincula; fusionado → se vincula como
 *      fusionado; cerrado → no bloquea, como en GitHub (P3-A);
 *   3. si no, un PR nuevo con el número siguiente al mayor conocido del proyecto (nunca repite uno).
 */
export function crearPullRequestSimulado(solicitud: SolicitudPR): RespuestaCrearPR {
  const { repositorio, rama_origen } = solicitud;
  if (
    rama_origen === ramaEliminada(repositorio) ||
    !ramasSimuladas(repositorio).includes(rama_origen)
  ) {
    return { ok: false, codigo: 'RAMA_INEXISTENTE' };
  }

  const mismasRamas = solicitud.prs_del_proyecto.filter(
    (pr) => !pr.propio && pr.rama_origen === rama_origen && pr.rama_base === repositorio.rama_base,
  );
  const abierto = mismasRamas.find((pr) => ESTADOS_ABIERTO.includes(pr.estado_pr));
  if (abierto !== undefined) {
    return {
      ok: true,
      resultado: 'EXISTENTE_ABIERTO',
      url: abierto.url,
      conflictos: abierto.estado_pr === 'CON_CONFLICTOS',
    };
  }
  const fusionado = mismasRamas.find((pr) => ESTADOS_FUSIONADO.includes(pr.estado_pr));
  if (fusionado !== undefined) {
    return { ok: true, resultado: 'EXISTENTE_FUSIONADO', url: fusionado.url, conflictos: false };
  }

  const mayor = Math.max(0, ...solicitud.prs_del_proyecto.map((pr) => numeroDePR(pr.url)));
  return {
    ok: true,
    resultado: 'NUEVO',
    url: `${repositorio.repositorio_url}/pull/${mayor + 1}`,
    conflictos: rama_origen === ramaConConflictos(repositorio),
  };
}

export const GITHUB_SIMULADO: PuertoGitHub = {
  consultarPullRequest: consultaSimulada,
  listarRamas: ramasSimuladas,
  crearPullRequest: crearPullRequestSimulado,
  // GitHub siempre acepta cerrar un PR abierto (§7.5 no define errores al cerrar).
  cerrarPullRequest: () => undefined,
};
