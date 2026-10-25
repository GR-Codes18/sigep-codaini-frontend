import type { TareaDetalle } from '@/compartido/DetalleTarea';
import type { EventoLinea } from '@/compartido/LineaTiempo';

// PROVISIONAL: datos mínimos para avanzar. Se reemplazan por la semilla de data/ (Persona A).
const dias = (n: number) => new Date(Date.now() + n * 86_400_000);

export const PROYECTOS_EJEMPLO = [
  { id: 'pl2d', nombre: 'Plataforma 2D', codigo: 'PL2D', estado: 'ACTIVO' },
  { id: 'jmov', nombre: 'Juego móvil', codigo: 'JMOV', estado: 'EN_PAUSA' },
];

export const TAREAS_EJEMPLO: TareaDetalle[] = [
  {
    id: 'PL2D-001',
    titulo: 'Pantalla de login',
    descripcion:
      'Formulario con validación de correo.\nTerminada cuando se pueda entrar con una cuenta demo.',
    estado: 'DISPONIBLE',
    proyecto: 'Plataforma 2D',
    fechaLimite: dias(7),
    requiereSupervision: false,
    requierePr: true,
  },
  {
    id: 'PL2D-002',
    titulo: 'Menú lateral',
    descripcion: 'Menú por rol con grupos y estado activo.',
    estado: 'EN_PROGRESO',
    proyecto: 'Plataforma 2D',
    responsable: 'Practicante Demo',
    fechaLimite: dias(-2),
    requiereSupervision: true,
    requierePr: true,
    devuelta: true,
    observacion: 'Falta resaltar el ítem activo.',
  },
  {
    id: 'PL2D-003',
    titulo: 'Tablero Kanban',
    descripcion: 'Cuatro columnas con tarjetas.',
    estado: 'ESPERANDO_SUPERVISION',
    proyecto: 'Plataforma 2D',
    responsable: 'Practicante Demo',
    fechaLimite: dias(3),
    requiereSupervision: true,
    requierePr: true,
    estadoPr: 'PENDIENTE',
  },
  {
    id: 'PL2D-004',
    titulo: 'Tema oscuro',
    descripcion: 'Tokens para tema claro y oscuro.',
    estado: 'TERMINADA',
    proyecto: 'Plataforma 2D',
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

export const EVENTOS_EJEMPLO: EventoLinea[] = [
  { id: 'e1', fecha: dias(-12), autor: 'Supervisor Demo (Supervisor)', accion: 'Tarea creada' },
  {
    id: 'e2',
    fecha: dias(-9),
    autor: 'Practicante Demo (Practicante)',
    accion: 'Tomada',
    resumen: 'Disponible → En progreso',
  },
  {
    id: 'e3',
    fecha: dias(-3),
    autor: 'Supervisor Demo (Supervisor)',
    accion: 'Devuelta',
    resumen: 'Esperando supervisión → En progreso',
    nota: 'Falta resaltar el ítem activo.',
  },
];
