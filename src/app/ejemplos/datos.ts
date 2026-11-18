import { format, parseISO } from 'date-fns';
import type { Asignacion, EventoHistorial, Proyecto, TipoAccionHistorial } from '@/domain';
import type { TareaDetalle } from '@/compartido/DetalleTarea';
import type { EventoLinea } from '@/compartido/LineaTiempo';

const dias = (n: number) => new Date(Date.now() + n * 86_400_000);
const fecha = (n: number) => format(dias(n), 'yyyy-MM-dd');

export const PROYECTOS_EJEMPLO: Proyecto[] = [
  {
    id: 'pl2d',
    nombre: 'Plataforma 2D',
    codigo: 'PL2D',
    descripcion: 'Proyecto de ejemplo para probar tareas.',
    fecha_inicio: fecha(-30),
    fecha_fin_prevista: fecha(60),
    fecha_fin_real: null,
    estado: 'ACTIVO',
    dia_reunion: null,
    hora_reunion: null,
    repositorio_url: 'https://github.com/codaini/plataforma-2d',
    rama_base: 'main',
    id_supervisor: 'demo-supervisor',
    ultimo_numero_tarea: 4,
  },
  {
    id: 'jmov',
    nombre: 'Juego móvil',
    codigo: 'JMOV',
    descripcion: 'Proyecto de ejemplo en pausa.',
    fecha_inicio: fecha(-20),
    fecha_fin_prevista: fecha(70),
    fecha_fin_real: null,
    estado: 'EN_PAUSA',
    dia_reunion: null,
    hora_reunion: null,
    repositorio_url: 'https://github.com/codaini/juego-movil',
    rama_base: 'main',
    id_supervisor: 'demo-supervisor',
    ultimo_numero_tarea: 0,
  },
];

export function proyectoPorId(id: string): Proyecto {
  const proyecto = PROYECTOS_EJEMPLO.find((item) => item.id === id);
  if (!proyecto) throw new Error(`No existe el proyecto de ejemplo "${id}".`);
  return proyecto;
}

export const ASIGNACIONES_EJEMPLO: Asignacion[] = PROYECTOS_EJEMPLO.map((proyecto) => ({
  id: `asignacion-demo-${proyecto.id}`,
  id_practicante: 'demo-practicante',
  id_proyecto: proyecto.id,
  fecha_alta: fecha(-20),
  fecha_baja: null,
}));

export const TAREAS_EJEMPLO: TareaDetalle[] = [
  {
    id: 'PL2D-001',
    numero: 1,
    titulo: 'Pantalla de login',
    descripcion:
      'Formulario con validación de correo.\nTerminada cuando se pueda entrar con una cuenta demo.',
    estado: 'DISPONIBLE',
    idProyecto: 'pl2d',
    proyecto: 'Plataforma 2D',
    idPracticante: null,
    fechaLimite: dias(7),
    requiereSupervision: false,
    requierePr: true,
  },
  {
    id: 'PL2D-002',
    numero: 2,
    titulo: 'Menú lateral',
    descripcion: 'Menú por rol con grupos y estado activo.',
    estado: 'EN_PROGRESO',
    idProyecto: 'pl2d',
    proyecto: 'Plataforma 2D',
    idPracticante: 'demo-practicante',
    responsable: 'Practicante Demo',
    fechaLimite: dias(-2),
    requiereSupervision: true,
    requierePr: true,
  },
  {
    id: 'PL2D-003',
    numero: 3,
    titulo: 'Tablero Kanban',
    descripcion: 'Cuatro columnas con tarjetas.',
    estado: 'ESPERANDO_SUPERVISION',
    idProyecto: 'pl2d',
    proyecto: 'Plataforma 2D',
    idPracticante: 'demo-practicante',
    responsable: 'Practicante Demo',
    fechaLimite: dias(3),
    requiereSupervision: true,
    requierePr: true,
    estadoPr: 'PENDIENTE',
  },
  {
    id: 'PL2D-004',
    numero: 4,
    titulo: 'Tema oscuro',
    descripcion: 'Tokens para tema claro y oscuro.',
    estado: 'TERMINADA',
    idProyecto: 'pl2d',
    proyecto: 'Plataforma 2D',
    idPracticante: 'demo-practicante',
    responsable: 'Practicante Demo',
    fechaLimite: dias(-10),
    requiereSupervision: false,
    requierePr: true,
    estadoPr: 'FUSIONADO',
    urlPr: 'https://github.com/codaini/pl2d/pull/12',
    ramaOrigen: 'feat/tema',
    ramaBase: 'main',
  },
];

export const HISTORIAL_EJEMPLO: EventoHistorial[] = [
  {
    id: 'e1',
    fecha: dias(-12).toISOString(),
    autor: { tipo: 'USUARIO', id_usuario: 'demo-supervisor' },
    tipo_accion: 'TAREA_CREADA',
    elemento: { tipo: 'TAREA', id: 'PL2D-002', etiqueta: 'PL2D-002 · Menú lateral' },
    id_proyecto: 'pl2d',
    cambios: [],
    nota: null,
  },
  {
    id: 'e2',
    fecha: dias(-9).toISOString(),
    autor: { tipo: 'USUARIO', id_usuario: 'demo-practicante' },
    tipo_accion: 'TAREA_TOMADA',
    elemento: { tipo: 'TAREA', id: 'PL2D-002', etiqueta: 'PL2D-002 · Menú lateral' },
    id_proyecto: 'pl2d',
    cambios: [{ campo: 'estado', valor_anterior: 'DISPONIBLE', valor_nuevo: 'EN_PROGRESO' }],
    nota: null,
  },
  {
    id: 'e3',
    fecha: dias(-3).toISOString(),
    autor: { tipo: 'USUARIO', id_usuario: 'demo-supervisor' },
    tipo_accion: 'TAREA_DEVUELTA',
    elemento: { tipo: 'TAREA', id: 'PL2D-002', etiqueta: 'PL2D-002 · Menú lateral' },
    id_proyecto: 'pl2d',
    cambios: [
      {
        campo: 'estado',
        valor_anterior: 'ESPERANDO_SUPERVISION',
        valor_nuevo: 'EN_PROGRESO',
      },
    ],
    nota: 'Falta resaltar el ítem activo.',
  },
];

const ACCION_POR_TIPO: Partial<Record<TipoAccionHistorial, string>> = {
  TAREA_CREADA: 'Tarea creada',
  TAREA_TOMADA: 'Tomada',
  TAREA_DEVUELTA: 'Devuelta',
  TAREA_ENVIADA_A_SUPERVISION: 'Enviada a supervisión',
  TAREA_TERMINADA: 'Terminada',
};

const AUTOR_POR_ID: Record<string, string> = {
  'demo-admin': 'Administrador Demo (Administrador)',
  'demo-supervisor': 'Supervisor Demo (Supervisor)',
  'demo-practicante': 'Practicante Demo (Practicante)',
};

const ETIQUETA_ESTADO = new Map<string, string>([
  ['DISPONIBLE', 'Disponible'],
  ['EN_PROGRESO', 'En progreso'],
  ['ESPERANDO_SUPERVISION', 'Esperando supervisión'],
  ['TERMINADA', 'Terminada'],
]);

function etiquetaEstado(estado: string | null): string {
  return estado ? (ETIQUETA_ESTADO.get(estado) ?? estado) : '—';
}

export function eventosDeTarea(historial: EventoHistorial[], idTarea: string): EventoLinea[] {
  return historial
    .filter((evento) => evento.elemento.tipo === 'TAREA' && evento.elemento.id === idTarea)
    .map((evento) => {
      const cambioEstado = evento.cambios.find((cambio) => cambio.campo === 'estado');
      const resumen = cambioEstado
        ? `${etiquetaEstado(cambioEstado.valor_anterior)} → ${etiquetaEstado(cambioEstado.valor_nuevo)}`
        : undefined;

      return {
        id: evento.id,
        fecha: parseISO(evento.fecha),
        autor:
          evento.autor.tipo === 'SISTEMA'
            ? 'Sistema'
            : (AUTOR_POR_ID[evento.autor.id_usuario] ?? evento.autor.id_usuario),
        accion: ACCION_POR_TIPO[evento.tipo_accion] ?? evento.tipo_accion,
        resumen,
        nota: evento.nota ?? undefined,
      };
    });
}

export function observacionDevolucionVigente(
  historial: EventoHistorial[],
  idTarea: string,
): string | undefined {
  return (
    historial
      .filter(
        (evento) =>
          evento.elemento.tipo === 'TAREA' &&
          evento.elemento.id === idTarea &&
          evento.tipo_accion === 'TAREA_DEVUELTA',
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha))[0]?.nota ?? undefined
  );
}
