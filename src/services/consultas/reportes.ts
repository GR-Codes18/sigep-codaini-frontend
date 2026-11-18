/**
 * Consultas de Reportes (Fase 2, paso 11D; propuesta §5.6 y §9.1.4): insights e indicadores.
 *
 * Alcance (lo decide `domain/`, con el mismo `puede` de siempre):
 *   - Administrador: las 7 reglas y todos los proyectos.
 *   - Supervisor: 5 reglas y solo sus proyectos; el `ids_proyecto` de cada insight se **recorta** a los suyos
 *     (un practicante compartido con otro supervisor no revela el proyecto ajeno, Q8-A).
 *   - Practicante: `ROL_NO_PERMITIDO`.
 *
 * Los insights no se guardan: se calculan con `calcularInsightsVigentes` (receta única, con los umbrales de
 * Configuración y el momento de la consulta). Ninguna consulta escribe en `data/`.
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  DIAS_PERIODO_PREDETERMINADO,
  aplicarRevisiones,
  filtrarInsightsPorAlcance,
  indicadoresDePostulaciones,
  indicadoresParaUsuario,
  puede,
  type IndicadoresPostulacionesArea,
  type IndicadoresPracticante,
  type IndicadoresProyecto,
  type Id,
  type Insight,
  type PeriodoIndicadores,
  type ResumenIndicadores,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { calcularInsightsVigentes } from '../seguimiento/comun';
import { ejecutarConsulta } from '../transaccional';
import {
  cargarActorActivo,
  exigirPermisoDeModulo,
  nombreDe,
  nombreDeCatalogo,
  resumenDeProyecto,
  type ProyectoResumen,
} from './comun';
import { proyectosDelSupervisor } from './practicantes';

// ── Insights ─────────────────────────────────────────────────────────────────────────────────

export interface InsightVista extends Insight {
  /** Los proyectos del insight con su nombre; para el Supervisor, solo los suyos. */
  proyectos: ProyectoResumen[];
  /** El botón «Marcar como revisado»: permitido por `puede()` y todavía no revisado por quien mira. */
  puede_marcar_revisado: boolean;
  /** El botón «Notificar»: Administrador (inactivo y supervisión demorada) o Supervisor (solo inactivo). */
  puede_notificar: boolean;
}

export interface ListadoInsights {
  /** Por severidad y antigüedad (§5.6). `revisado` es de quien mira: es independiente por persona. */
  insights: InsightVista[];
  contadores: { TODOS: number; ACTIVOS: number; REVISADOS: number };
}

const esquemaEntradaInsights = z.object({ idActor: esquemaId, id_proyecto: esquemaId.optional() });
export type EntradaListarInsights = z.input<typeof esquemaEntradaInsights>;

export function listarInsights(
  entrada: EntradaListarInsights,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ListadoInsights>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaInsights, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const modulo = exigirPermisoDeModulo(actor.valor, 'VER_REPORTES');
    if (!modulo.ok) return modulo;
    const yo = actor.valor;

    const idFiltro = valida.valor.id_proyecto;
    if (idFiltro !== undefined) {
      const elegido = datos.proyectos.find((p) => p.id === idFiltro);
      if (elegido === undefined) return fallo('NO_ENCONTRADO');
      const permiso = puede(yo, 'VER_REPORTES', { proyecto: elegido });
      if (!permiso.permitido) return denegar(permiso);
    }

    const calculados = calcularInsightsVigentes(datos, marca.ahora);
    if (!calculados.ok) return calculados;

    const visibles = filtrarInsightsPorAlcance(calculados.valor, yo, datos.proyectos);
    const conRevision = aplicarRevisiones(visibles, datos.revisiones_insight, yo.id, marca.ahora);
    const propios = new Set(
      yo.rol === 'SUPERVISOR' ? proyectosDelSupervisor(datos, yo).map((p) => p.id) : null,
    );

    const insights = conRevision
      .map((insight): InsightVista => {
        // Los permisos se deciden con el insight completo; solo después se recorta lo que se entrega.
        const contexto = { insight, proyectos: datos.proyectos };
        const idsProyecto =
          yo.rol === 'SUPERVISOR'
            ? insight.ids_proyecto.filter((id) => propios.has(id))
            : insight.ids_proyecto;
        return {
          ...insight,
          ids_proyecto: idsProyecto,
          proyectos: datos.proyectos
            .filter((p) => idsProyecto.includes(p.id))
            .map(resumenDeProyecto),
          puede_marcar_revisado:
            !insight.revisado && puede(yo, 'MARCAR_INSIGHT_REVISADO', contexto).permitido,
          puede_notificar: puede(yo, 'NOTIFICAR_DESDE_INSIGHT', contexto).permitido,
        };
      })
      .filter((i) => idFiltro === undefined || i.ids_proyecto.includes(idFiltro));

    return {
      ok: true,
      valor: {
        insights,
        contadores: {
          TODOS: insights.length,
          ACTIVOS: insights.filter((i) => !i.revisado).length,
          REVISADOS: insights.filter((i) => i.revisado).length,
        },
      },
    };
  });
}

// ── Indicadores ──────────────────────────────────────────────────────────────────────────────

export type IndicadoresProyectoVista = IndicadoresProyecto & { proyecto: ProyectoResumen };
export type IndicadoresPracticanteVista = IndicadoresPracticante & { nombre: string };

interface IndicadoresBase {
  periodo: PeriodoIndicadores;
  /** Tarjetas generales: tareas terminadas, tiempo de ciclo, espera de supervisión y tasa de devolución. */
  resumen: ResumenIndicadores;
  por_proyecto: IndicadoresProyectoVista[];
  por_practicante: IndicadoresPracticanteVista[];
  /** `true` si no hay ningún proyecto en el alcance (un Supervisor recién creado): estado vacío. */
  vacio: boolean;
}

export interface PostulacionesPorArea extends IndicadoresPostulacionesArea {
  area: { id: Id; nombre: string } | null;
}

export interface PracticantesDeArea {
  area: { id: Id; nombre: string };
  practicantes: number;
}

/** Indicadores del Administrador: además, postulaciones y practicantes por área técnica. */
export interface IndicadoresAdministrador extends IndicadoresBase {
  vista: 'ADMINISTRADOR';
  postulaciones: { decididas: number; por_area: PostulacionesPorArea[] };
  practicantes_por_area: PracticantesDeArea[];
}

/** Indicadores del Supervisor: sin postulaciones ni área técnica (§9.1.4); el tipo no tiene esos campos. */
export interface IndicadoresSupervisor extends IndicadoresBase {
  vista: 'SUPERVISOR';
}

export type IndicadoresVista = IndicadoresAdministrador | IndicadoresSupervisor;

const esquemaEntradaIndicadores = z.object({
  idActor: esquemaId,
  dias: z.number().optional(),
  id_proyecto: esquemaId.optional(),
});
export type EntradaObtenerIndicadores = z.input<typeof esquemaEntradaIndicadores>;

/**
 * Practicantes **activos** de cada área técnica, en el orden del catálogo (el gráfico de §5.6 y el bloque
 * «Practicantes por área» del Dashboard). Con `idProyecto`, solo los que tienen una asignación vigente en él.
 */
export function practicantesPorArea(
  datos: Pick<DatosAlmacen, 'areas_tecnicas' | 'practicantes' | 'usuarios' | 'asignaciones'>,
  idProyecto: Id | null = null,
): PracticantesDeArea[] {
  const activos = datos.practicantes.filter((p) => {
    const cuenta = datos.usuarios.find((u) => u.id === p.id_usuario);
    if (cuenta?.estado !== 'ACTIVO') return false;
    return (
      idProyecto === null ||
      datos.asignaciones.some(
        (a) =>
          a.id_practicante === p.id_usuario &&
          a.id_proyecto === idProyecto &&
          a.fecha_baja === null,
      )
    );
  });
  return datos.areas_tecnicas.map((area) => ({
    area: { id: area.id, nombre: area.nombre },
    practicantes: activos.filter((p) => p.id_area_tecnica === area.id).length,
  }));
}

/**
 * Indicadores con el alcance de quien consulta (§5.6, §9.1.4): periodo de 1 a 365 días (30 por defecto) y,
 * opcionalmente, un proyecto de su alcance. Un periodo inválido da `PERIODO_INVALIDO`; un proyecto
 * inexistente, `NO_ENCONTRADO`, y uno ajeno, `FUERA_DE_ALCANCE`.
 */
export function obtenerIndicadores(
  entrada: EntradaObtenerIndicadores,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<IndicadoresVista>> {
  return ejecutarConsulta<IndicadoresVista>(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaIndicadores, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const modulo = exigirPermisoDeModulo(actor.valor, 'VER_REPORTES');
    if (!modulo.ok) return modulo;
    const yo = actor.valor;

    const idFiltro = valida.valor.id_proyecto ?? null;
    if (idFiltro !== null) {
      const elegido = datos.proyectos.find((p) => p.id === idFiltro);
      if (elegido === undefined) return fallo('NO_ENCONTRADO');
      const permiso = puede(yo, 'VER_REPORTES', { proyecto: elegido });
      if (!permiso.permitido) return denegar(permiso);
    }

    const calculo = indicadoresParaUsuario(
      yo,
      {
        proyectos: datos.proyectos,
        asignaciones: datos.asignaciones,
        tareas: datos.tareas,
        historial: datos.historial,
      },
      { dias: valida.valor.dias ?? DIAS_PERIODO_PREDETERMINADO, id_proyecto: idFiltro },
      marca.ahora,
    );
    if (!calculo.ok) return denegar(calculo);

    const base: IndicadoresBase = {
      periodo: calculo.periodo,
      resumen: calculo.resumen,
      por_proyecto: calculo.por_proyecto.flatMap((fila) => {
        const proyecto = datos.proyectos.find((p) => p.id === fila.id_proyecto);
        return proyecto === undefined ? [] : [{ ...fila, proyecto: resumenDeProyecto(proyecto) }];
      }),
      por_practicante: calculo.por_practicante.map((fila) => ({
        ...fila,
        nombre: nombreDe(datos.usuarios, fila.id_practicante),
      })),
      vacio: calculo.por_proyecto.length === 0,
    };

    if (yo.rol === 'SUPERVISOR') return { ok: true, valor: { vista: 'SUPERVISOR', ...base } };

    const postulaciones = indicadoresDePostulaciones(
      {
        postulantes: datos.postulantes,
        evaluaciones: datos.evaluaciones,
        historial: datos.historial,
        areas: datos.areas_tecnicas.map((a) => a.id),
      },
      calculo.periodo,
    );
    return {
      ok: true,
      valor: {
        vista: 'ADMINISTRADOR',
        ...base,
        postulaciones: {
          decididas: postulaciones.decididas,
          por_area: postulaciones.por_area.map((a) => ({
            ...a,
            area: nombreDeCatalogo(datos.areas_tecnicas, a.id_area_tecnica),
          })),
        },
        practicantes_por_area: practicantesPorArea(datos, idFiltro),
      },
    };
  });
}
