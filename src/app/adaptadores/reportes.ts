import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  hoyEn,
  type Id,
  type Rol,
  type Severidad,
  type TipoElemento,
  type TipoReglaInsight,
} from '@/domain';
import { PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import type { IndicadoresVista, ListadoInsights, ProyectoResumen } from '@/services';
import { RUTA_DE_DETALLE } from './notificacion';

/** El nombre de cada regla (§5.6), para el filtro por tipo y la tarjeta. */
export const ETIQUETA_REGLA: Record<TipoReglaInsight, string> = {
  PRACTICANTE_INACTIVO: 'Practicante inactivo',
  CARGA_DESBALANCEADA: 'Carga desbalanceada',
  POSIBLE_ATRASO_PROYECTO: 'Posible atraso del proyecto',
  PROYECTO_SIN_ACTIVIDAD: 'Proyecto sin actividad',
  SUPERVISION_DEMORADA: 'Supervisión demorada',
  POSTULACIONES_SIN_DECIDIR: 'Postulaciones sin decidir',
  FIN_PRACTICA: 'Fin de práctica',
};

export const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  CRITICO: 'Crítico',
  ATENCION: 'Atención',
  INFORMATIVO: 'Informativo',
};

/** «7 nov 2026», con el día cortado en hora de Perú. */
export function diaVisiblePeru(instante: string): string {
  return format(parseISO(hoyEn(instante)), 'd MMM yyyy', { locale: es });
}

/**
 * La página de detalle del elemento afectado por un insight, en el panel de `rol` (el del Administrador si no se dice);
 * `null` si ese tipo de elemento no tiene detalle en ese panel. Usa la misma tabla que los avisos (`RUTA_DE_DETALLE`):
 * una sola fuente para los enlaces. Así el Supervisor llega a `/supervisor/practicantes`, `/supervisor/proyectos` y
 * `/supervisor/tareas`, y no a las páginas del Administrador (§9.1.4).
 */
export function rutaDelElemento(
  tipo: TipoElemento,
  id: Id,
  rol: Rol = 'ADMINISTRADOR',
): string | null {
  const detalle = RUTA_DE_DETALLE[rol][tipo];
  return detalle === undefined ? null : `${PREFIJO_POR_ROL[rol]}${detalle(id)}`;
}

export interface FilaInsight {
  /** Un insight no se guarda: se identifica por su regla y su elemento. */
  clave: string;
  tipoRegla: TipoReglaInsight;
  severidad: Severidad;
  titulo: string;
  motivo: string;
  elemento: { tipo: TipoElemento; id: Id };
  /** El enlace al detalle del elemento afectado; `null` si no tiene. */
  rutaElemento: string | null;
  proyectos: ProyectoResumen[];
  /** «7 nov 2026». */
  fechaDeteccionTexto: string;
  /** De quien mira: es independiente por persona. */
  revisado: boolean;
  /** Lo deciden `puede()` y la revisión vigente, y llegan con la consulta. */
  puedeMarcarRevisado: boolean;
  puedeNotificar: boolean;
}

export interface InsightsParaVista {
  /** Por severidad y antigüedad, como las entrega la consulta. */
  filas: FilaInsight[];
  contadores: ListadoInsights['contadores'];
}

/**
 * Los insights de `listarInsights` a las tarjetas. Solo presenta: conserva el orden y los contadores de la consulta, no
 * filtra ni decide nada (los permisos de cada botón llegan ya decididos).
 */
export function aInsights(listado: ListadoInsights, rol: Rol = 'ADMINISTRADOR'): InsightsParaVista {
  return {
    filas: listado.insights.map((i) => ({
      clave: `${i.tipo_regla}:${i.elemento.tipo}:${i.elemento.id}`,
      tipoRegla: i.tipo_regla,
      severidad: i.severidad,
      titulo: i.titulo,
      motivo: i.motivo,
      elemento: { tipo: i.elemento.tipo, id: i.elemento.id },
      rutaElemento: rutaDelElemento(i.elemento.tipo, i.elemento.id, rol),
      proyectos: i.proyectos,
      fechaDeteccionTexto: diaVisiblePeru(i.fecha_deteccion),
      revisado: i.revisado,
      puedeMarcarRevisado: i.puede_marcar_revisado,
      puedeNotificar: i.puede_notificar,
    })),
    contadores: listado.contadores,
  };
}

// ── Indicadores ──────────────────────────────────────────────────────────────────────────────

export const SIN_DATOS = 'Sin datos';

/** Días con un decimal y coma: «1,5 días». Sin muestras (`null`) no es cero: es «Sin datos» (§5.6). */
export function textoDias(dias: number | null): string {
  return dias === null ? SIN_DATOS : `${dias.toFixed(1).replace('.', ',')} días`;
}

/** «40 % (12 de 30)»; sin datos, «Sin datos». El porcentaje ya llega redondeado al entero. */
export function textoProporcion(
  p: { numerador: number; denominador: number; porcentaje: number } | null,
): string {
  return p === null ? SIN_DATOS : `${p.porcentaje} % (${p.numerador} de ${p.denominador})`;
}

/** La última acción registrada como día de Perú, o «Sin actividad». */
export function textoUltimaActividad(instante: string | null): string {
  return instante === null ? 'Sin actividad' : diaVisiblePeru(instante);
}

export interface FilaIndicadorProyecto {
  proyecto: ProyectoResumen;
  rutaProyecto: string | null;
  /** El avance no depende del periodo. */
  avance: string;
  tareasTerminadas: number;
  tiempoCiclo: string;
  esperaSupervision: string;
  tasaDevolucion: string;
  ultimaActividad: string;
}

export interface FilaIndicadorPracticante {
  id: Id;
  nombre: string;
  rutaPracticante: string | null;
  tareasTerminadas: number;
  tiempoCiclo: string;
  tasaDevolucion: string;
  carga: number;
  ultimaActividad: string;
}

export interface PuntajePorAreaParaVista {
  /** «Sin área» si el catálogo ya no la tiene. */
  area: string;
  decididas: number;
  /** «82,5» con coma, o «Sin datos» si ninguna tiene evaluación. */
  puntaje: string;
}

export interface PracticantesPorAreaParaVista {
  area: string;
  practicantes: number;
}

export interface IndicadoresParaVista {
  /** De quién son los indicadores: el Supervisor ve menos tarjetas y no ve el área técnica (§9.1.4). */
  rol: Rol;
  dias: number;
  /** «Del 18 oct 2026 al 17 nov 2026 · hora de Perú». */
  periodoTexto: string;
  tareasTerminadas: number;
  tiempoCiclo: string;
  esperaSupervision: string;
  tasaDevolucion: string;
  /** `null` para el Supervisor: las postulaciones no son suyas (§9.1.4). */
  postulacionesDecididas: number | null;
  /** `null` para el Supervisor. */
  puntajePorArea: PuntajePorAreaParaVista[] | null;
  porProyecto: FilaIndicadorProyecto[];
  porPracticante: FilaIndicadorPracticante[];
  /** `null` para el Supervisor: no ve el área técnica (§9.1.4). */
  practicantesPorArea: PracticantesPorAreaParaVista[] | null;
  /** No hay ningún proyecto en el alcance. */
  vacio: boolean;
}

/**
 * Los indicadores (`obtenerIndicadores`) al modelo de presentación, del Administrador o del Supervisor. Solo presenta:
 * los números, las proporciones y los promedios ya llegan calculados por `domain/` (con «Sin datos» donde no hay
 * muestras); aquí solo se convierten a texto. Lo que viene de postulaciones y del área técnica solo lo trae la variante
 * del Administrador: para el Supervisor queda en `null`. Los enlaces van a las páginas del panel de quien mira.
 */
export function aIndicadores(vista: IndicadoresVista): IndicadoresParaVista {
  const rol: Rol = vista.vista === 'SUPERVISOR' ? 'SUPERVISOR' : 'ADMINISTRADOR';
  const admin = vista.vista === 'ADMINISTRADOR' ? vista : null;
  return {
    rol,
    dias: vista.periodo.dias,
    periodoTexto: `Del ${diaVisiblePeru(vista.periodo.desde)} al ${diaVisiblePeru(vista.periodo.hasta)} · hora de Perú`,
    tareasTerminadas: vista.resumen.tareas_terminadas,
    tiempoCiclo: textoDias(vista.resumen.tiempo_ciclo_dias),
    esperaSupervision: textoDias(vista.resumen.espera_supervision_dias),
    tasaDevolucion: textoProporcion(vista.resumen.tasa_devolucion),
    postulacionesDecididas: admin === null ? null : admin.postulaciones.decididas,
    puntajePorArea:
      admin === null
        ? null
        : admin.postulaciones.por_area.map((a) => ({
            area: a.area?.nombre ?? 'Sin área',
            decididas: a.decididas,
            puntaje:
              a.puntaje_promedio === null
                ? SIN_DATOS
                : a.puntaje_promedio.toFixed(1).replace('.', ','),
          })),
    porProyecto: vista.por_proyecto.map((p) => ({
      proyecto: p.proyecto,
      rutaProyecto: rutaDelElemento('PROYECTO', p.proyecto.id, rol),
      avance: textoProporcion(p.avance),
      tareasTerminadas: p.tareas_terminadas,
      tiempoCiclo: textoDias(p.tiempo_ciclo_dias),
      esperaSupervision: textoDias(p.espera_supervision_dias),
      tasaDevolucion: textoProporcion(p.tasa_devolucion),
      ultimaActividad: textoUltimaActividad(p.ultima_actividad),
    })),
    porPracticante: vista.por_practicante.map((p) => ({
      id: p.id_practicante,
      nombre: p.nombre,
      rutaPracticante: rutaDelElemento('USUARIO', p.id_practicante, rol),
      tareasTerminadas: p.tareas_terminadas,
      tiempoCiclo: textoDias(p.tiempo_ciclo_dias),
      tasaDevolucion: textoProporcion(p.tasa_devolucion),
      carga: p.carga,
      ultimaActividad: textoUltimaActividad(p.ultima_actividad),
    })),
    practicantesPorArea:
      admin === null
        ? null
        : admin.practicantes_por_area.map((a) => ({
            area: a.area.nombre,
            practicantes: a.practicantes,
          })),
    vacio: vista.vacio,
  };
}
