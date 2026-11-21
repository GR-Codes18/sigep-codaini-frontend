import type { EstadoProyecto, Id } from '@/domain';
import { textoReunion, type DashboardAdministrador, type ProyectoResumen } from '@/services';
import { aInsights, rutaDelElemento, textoProporcion, type FilaInsight } from './reportes';
import { proximaReunionTexto } from './proyectos';

export interface FilaPostulacionDashboard {
  id: Id;
  nombre: string;
  area: string;
  especialidad: string;
  /** «82», o «Sin evaluar». */
  puntajeTexto: string;
  requiereRevision: boolean;
  rutaDetalle: string | null;
}

export interface FilaPorRevisar {
  id: Id;
  idLegible: string;
  titulo: string;
  proyecto: ProyectoResumen;
  responsable: string | null;
  /** «Lleva 3 días» o «Desde hoy». */
  esperaTexto: string;
  rutaDetalle: string | null;
}

export interface FilaReunion {
  proyecto: ProyectoResumen;
  rutaProyecto: string | null;
  /** «Lunes 10:00», o «Sin definir». */
  reunionTexto: string;
  /** «23 nov 2026, 10:00», o «Sin definir». */
  proximaTexto: string;
}

export interface FilaAvance {
  proyecto: ProyectoResumen;
  rutaProyecto: string | null;
  estado: EstadoProyecto;
  /** «40 % (12 de 30)», o «Sin tareas». */
  avanceTexto: string;
  /** Para la barra; 0 si no hay tareas. */
  porcentaje: number;
}

export interface TarjetasDashboard {
  postulaciones: { pendientes: number; requierenRevision: number };
  proyectos: { activos: number; enPausa: number };
  practicantes: { activos: number; sinProyecto: number };
  tareasEsperando: { total: number; demoradas: number };
}

export interface DashboardParaVista {
  tarjetas: TarjetasDashboard;
  /** El plazo de «Supervisión demorada» con que se cuentan las demoradas. */
  plazoDemoraDias: number;
  postulaciones: FilaPostulacionDashboard[];
  alertas: FilaInsight[];
  /** Cuántas alertas activas hay en total (las que no caben en las cinco que se muestran). */
  totalAlertas: number;
  practicantesPorArea: { area: string; practicantes: number }[];
  porRevisar: FilaPorRevisar[];
  reuniones: FilaReunion[];
  avances: FilaAvance[];
}

function esperaTexto(dias: number | null): string {
  if (dias === null || dias <= 0) return 'Desde hoy';
  return dias === 1 ? 'Lleva 1 día' : `Lleva ${dias} días`;
}

/**
 * El resumen de `obtenerDashboardAdministrador` al modelo de presentación. Solo presenta (§5.9: el Dashboard no calcula
 * nada propio): los números, el orden y los topes de cada bloque ya los decidió la consulta.
 */
export function aDashboard(vista: DashboardAdministrador): DashboardParaVista {
  const t = vista.tarjetas;
  return {
    tarjetas: {
      postulaciones: {
        pendientes: t.postulaciones.pendientes,
        requierenRevision: t.postulaciones.requieren_revision,
      },
      proyectos: { activos: t.proyectos.activos, enPausa: t.proyectos.en_pausa },
      practicantes: { activos: t.practicantes.activos, sinProyecto: t.practicantes.sin_proyecto },
      tareasEsperando: {
        total: t.tareas_esperando_supervision.total,
        demoradas: t.tareas_esperando_supervision.demoradas,
      },
    },
    plazoDemoraDias: vista.plazo_demora_dias,
    postulaciones: vista.postulaciones_pendientes.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      area: p.area?.nombre ?? 'Sin área',
      especialidad: p.especialidad?.nombre ?? 'Sin especialidad',
      puntajeTexto: p.puntaje === null ? 'Sin evaluar' : String(p.puntaje),
      requiereRevision: p.requiere_revision_manual,
      rutaDetalle: rutaDelElemento('POSTULANTE', p.id),
    })),
    alertas: aInsights({
      insights: vista.alertas,
      contadores: { TODOS: vista.total_alertas, ACTIVOS: vista.total_alertas, REVISADOS: 0 },
    }).filas,
    totalAlertas: vista.total_alertas,
    practicantesPorArea: vista.practicantes_por_area.map((a) => ({
      area: a.area.nombre,
      practicantes: a.practicantes,
    })),
    porRevisar: vista.por_revisar.map((tarea) => ({
      id: tarea.id,
      idLegible: tarea.id_legible,
      titulo: tarea.titulo,
      proyecto: tarea.proyecto,
      responsable: tarea.responsable,
      esperaTexto: esperaTexto(tarea.dias_esperando),
      rutaDetalle: rutaDelElemento('TAREA', tarea.id),
    })),
    reuniones: vista.proximas_reuniones.map((r) => ({
      proyecto: r.proyecto,
      rutaProyecto: rutaDelElemento('PROYECTO', r.proyecto.id),
      reunionTexto: textoReunion(r.dia_reunion, r.hora_reunion) ?? 'Sin definir',
      proximaTexto: proximaReunionTexto(r),
    })),
    avances: vista.avance_proyectos.map((a) => ({
      proyecto: a.proyecto,
      rutaProyecto: rutaDelElemento('PROYECTO', a.proyecto.id),
      estado: a.estado,
      avanceTexto: a.avance === null ? 'Sin tareas' : textoProporcion(a.avance),
      porcentaje: a.avance?.porcentaje ?? 0,
    })),
  };
}
