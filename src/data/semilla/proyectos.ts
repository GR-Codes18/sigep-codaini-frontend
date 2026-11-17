/**
 * Proyectos, enlaces y asignaciones de la semilla, con sus eventos y avisos.
 *
 * Reparto de supervisores: `demo-supervisor` lleva dos proyectos activos, `usr-sup-02` uno
 * finalizado y uno activo sin practicantes, y `usr-sup-03` uno en pausa.
 *
 * El contador `ultimo_numero_tarea` sale en 0: lo fija `semilla.ts` con el mayor número de
 * las tareas de cada proyecto.
 */

import type {
  Asignacion,
  DiaSemana,
  EnlaceProyecto,
  EstadoProyecto,
  Hora,
  Id,
  Proyecto,
  Usuario,
} from '@/domain';
import {
  ID_ADMIN,
  ID_PRACTICANTE_DEMO,
  ID_SUPERVISOR_2,
  ID_SUPERVISOR_3,
  ID_SUPERVISOR_DEMO,
} from './personas';
import { fechaDe, type Desfase, type Reloj } from './reloj';
import type { Registro } from './registro';

export const ID_PL2D = 'pry-pl2d';
export const ID_RSV = 'pry-rsv';
export const ID_INV = 'pry-inv';
export const ID_TIE = 'pry-tie';
export const ID_DAT = 'pry-dat';

interface EspecificacionProyecto {
  id: Id;
  nombre: string;
  codigo: string;
  descripcion: string;
  /** Días antes de hoy en que empieza; se crea un día antes. */
  inicio: number;
  /** Fin previsto, en días desde hoy. */
  fin: number;
  estado: EstadoProyecto;
  reunion?: { dia: DiaSemana; hora: Hora; hace: Desfase; por: Id };
  repo: string;
  rama: string;
  supervisor: Id;
  pausado?: Desfase;
  finalizado?: Desfase;
  enlaces: readonly (readonly [nombre: string, url: string])[];
}

const PROYECTOS: readonly EspecificacionProyecto[] = [
  {
    id: ID_PL2D,
    nombre: 'Plataforma 2D: Aventura Andina',
    codigo: 'PL2D',
    descripcion:
      'Videojuego de plataformas en 2D ambientado en los Andes, con tres niveles, un jefe final y guardado de partida.',
    inicio: 40,
    fin: 80,
    estado: 'ACTIVO',
    reunion: { dia: 'LUNES', hora: '10:00', hace: [20, 4], por: ID_SUPERVISOR_DEMO },
    repo: 'https://github.com/org-demo/plataforma-2d',
    rama: 'develop',
    supervisor: ID_SUPERVISOR_DEMO,
    enlaces: [
      ['Documento de diseño del juego', 'https://example.com/pl2d/diseno'],
      ['Tablero de arte en Figma', 'https://example.com/pl2d/arte'],
    ],
  },
  {
    id: ID_RSV,
    nombre: 'Portal de Reservas Turísticas',
    codigo: 'RSV',
    descripcion:
      'Aplicación web para reservar tours y alojamientos, con calendario de disponibilidad y confirmación por correo.',
    inicio: 60,
    fin: 20,
    estado: 'ACTIVO',
    reunion: { dia: 'MIERCOLES', hora: '15:30', hace: [50, 2], por: ID_ADMIN },
    repo: 'https://github.com/org-demo/portal-reservas',
    rama: 'main',
    supervisor: ID_SUPERVISOR_DEMO,
    enlaces: [['Requisitos del cliente', 'https://example.com/rsv/requisitos']],
  },
  {
    id: ID_INV,
    nombre: 'App Móvil de Inventario',
    codigo: 'INV',
    descripcion:
      'Aplicación móvil para controlar existencias en almacén con lectura de códigos de barras y modo sin conexión.',
    inicio: 50,
    fin: 70,
    estado: 'EN_PAUSA',
    repo: 'https://github.com/org-demo/inventario-movil',
    rama: 'develop',
    supervisor: ID_SUPERVISOR_3,
    pausado: [12, 3],
    enlaces: [['Prototipo de pantallas', 'https://example.com/inv/prototipo']],
  },
  {
    id: ID_TIE,
    nombre: 'Tienda en Línea Artesanal',
    codigo: 'TIE',
    descripcion:
      'Tienda en línea para un colectivo de artesanos, con catálogo, carrito de compras y pasarela de pago de prueba.',
    inicio: 100,
    fin: -15,
    estado: 'FINALIZADO',
    repo: 'https://github.com/org-demo/tienda-artesanal',
    rama: 'main',
    supervisor: ID_SUPERVISOR_2,
    finalizado: [18, 2],
    enlaces: [
      ['Manual de la tienda', 'https://example.com/tie/manual'],
      ['Acta de cierre', 'https://example.com/tie/cierre'],
    ],
  },
  {
    id: ID_DAT,
    nombre: 'Panel de Analítica de Ventas',
    codigo: 'DAT',
    descripcion:
      'Panel de indicadores de ventas para la gerencia, con consultas y gráficos por periodo. Aún sin practicantes asignados.',
    inicio: 5,
    fin: 90,
    estado: 'ACTIVO',
    repo: 'https://github.com/org-demo/panel-analitica',
    rama: 'main',
    supervisor: ID_SUPERVISOR_2,
    enlaces: [['Fuentes de datos', 'https://example.com/dat/fuentes']],
  },
];

interface EspecificacionAsignacion {
  practicante: Id;
  proyecto: Id;
  alta: number;
  /** Días antes de hoy en que sale del proyecto. */
  baja?: number;
  /** Cómo sale: lo quita el administrador o finaliza su práctica. */
  salida?: 'QUITADO' | 'PRACTICA_FINALIZADA';
}

const ASIGNACIONES: readonly EspecificacionAsignacion[] = [
  // PL2D
  { practicante: ID_PRACTICANTE_DEMO, proyecto: ID_PL2D, alta: 38 },
  { practicante: 'usr-pra-02', proyecto: ID_PL2D, alta: 38 },
  { practicante: 'usr-pra-04', proyecto: ID_PL2D, alta: 38 },
  { practicante: 'usr-pra-05', proyecto: ID_PL2D, alta: 38 },
  { practicante: 'usr-pra-06', proyecto: ID_PL2D, alta: 36 },
  { practicante: 'usr-pra-03', proyecto: ID_PL2D, alta: 35 },
  // RSV (Lucía está en dos proyectos)
  { practicante: 'usr-pra-06', proyecto: ID_RSV, alta: 58 },
  { practicante: 'usr-pra-07', proyecto: ID_RSV, alta: 58 },
  { practicante: 'usr-pra-08', proyecto: ID_RSV, alta: 58 },
  // INV (en pausa)
  { practicante: 'usr-pra-09', proyecto: ID_INV, alta: 46 },
  { practicante: 'usr-pra-10', proyecto: ID_INV, alta: 46 },
  { practicante: 'usr-pra-11', proyecto: ID_INV, alta: 46 },
  { practicante: 'usr-pra-12', proyecto: ID_INV, alta: 46 },
  { practicante: 'usr-pra-13', proyecto: ID_INV, alta: 46 },
  { practicante: 'usr-pra-14', proyecto: ID_INV, alta: 46 },
  // TIE (finalizado: finalizar el proyecto no cierra las asignaciones)
  { practicante: 'usr-pra-15', proyecto: ID_TIE, alta: 96 },
  { practicante: 'usr-pra-16', proyecto: ID_TIE, alta: 96 },
  { practicante: 'usr-pra-17', proyecto: ID_TIE, alta: 96 },
  { practicante: 'usr-pra-18', proyecto: ID_TIE, alta: 96 },
  { practicante: 'usr-pra-03', proyecto: ID_TIE, alta: 96, baja: 60, salida: 'QUITADO' },
  { practicante: 'usr-pra-20', proyecto: ID_TIE, alta: 96, baja: 70, salida: 'QUITADO' },
  { practicante: 'usr-pra-19', proyecto: ID_TIE, alta: 95, baja: 3, salida: 'PRACTICA_FINALIZADA' },
];

const NOMBRE_DIA: Record<DiaSemana, string> = {
  LUNES: 'lunes',
  MARTES: 'martes',
  MIERCOLES: 'miércoles',
  JUEVES: 'jueves',
  VIERNES: 'viernes',
  SABADO: 'sábado',
  DOMINGO: 'domingo',
};

export interface DatosProyectos {
  proyectos: Proyecto[];
  enlaces: EnlaceProyecto[];
  asignaciones: Asignacion[];
}

export function crearProyectos(
  reloj: Reloj,
  registro: Registro,
  usuarios: readonly Usuario[],
): DatosProyectos {
  const nombre = (id: Id) => usuarios.find((u) => u.id === id)?.nombre ?? id;
  const admin = { tipo: 'USUARIO', id_usuario: ID_ADMIN } as const;
  const proyectos: Proyecto[] = [];
  const enlaces: EnlaceProyecto[] = [];
  const asignaciones: Asignacion[] = [];

  const etiqueta = (p: { codigo: string; nombre: string }) => `${p.codigo} · ${p.nombre}`;

  /** Practicantes con asignación vigente en `instante` (alta ≤ instante < baja). */
  const equipoEn = (idProyecto: Id, instante: string): Id[] =>
    ASIGNACIONES.filter((a) => {
      if (a.proyecto !== idProyecto) return false;
      const alta = Date.parse(reloj.hace([a.alta, 5]));
      const baja = a.baja === undefined ? Infinity : Date.parse(reloj.hace([a.baja, 5]));
      return alta <= Date.parse(instante) && Date.parse(instante) < baja;
    }).map((a) => a.practicante);

  for (const spec of PROYECTOS) {
    const creado = reloj.hace([spec.inicio + 1, 3]);
    const base: Proyecto = {
      id: spec.id,
      nombre: spec.nombre,
      codigo: spec.codigo,
      descripcion: spec.descripcion,
      fecha_inicio: reloj.dia(-spec.inicio),
      fecha_fin_prevista: reloj.dia(spec.fin),
      fecha_fin_real: spec.finalizado === undefined ? null : fechaDe(reloj.hace(spec.finalizado)),
      estado: spec.estado,
      dia_reunion: spec.reunion?.dia ?? null,
      hora_reunion: spec.reunion?.hora ?? null,
      repositorio_url: spec.repo,
      rama_base: spec.rama,
      id_supervisor: spec.supervisor,
      ultimo_numero_tarea: 0,
    };
    proyectos.push(base);
    const elemento = { tipo: 'PROYECTO', id: spec.id, etiqueta: etiqueta(spec) } as const;
    const referencia = { tipo: 'PROYECTO', id: spec.id } as const;

    registro.evento({
      fecha: creado,
      autor: admin,
      tipo_accion: 'PROYECTO_CREADO',
      elemento,
      id_proyecto: spec.id,
    });
    registro.notificar({
      fecha: creado,
      autor: admin,
      destinatarios: [spec.supervisor],
      tipo: 'ASIGNADO_A_PROYECTO',
      mensaje: `Te asignaron como supervisor del proyecto ${spec.nombre}.`,
      elemento: referencia,
    });

    spec.enlaces.forEach(([nombreEnlace, url], i) => {
      enlaces.push({
        id: `enl-${spec.codigo.toLowerCase()}-${i + 1}`,
        id_proyecto: spec.id,
        nombre: nombreEnlace,
        url,
      });
      registro.evento({
        fecha: reloj.hace([spec.inicio, 6 - i]),
        autor: { tipo: 'USUARIO', id_usuario: spec.supervisor },
        tipo_accion: 'PROYECTO_ENLACE_AGREGADO',
        elemento,
        id_proyecto: spec.id,
        cambios: [{ campo: 'enlace', valor_anterior: null, valor_nuevo: nombreEnlace }],
      });
    });

    if (spec.reunion !== undefined) {
      const fecha = reloj.hace(spec.reunion.hace);
      const texto = `${NOMBRE_DIA[spec.reunion.dia]} a las ${spec.reunion.hora}`;
      const autor = { tipo: 'USUARIO', id_usuario: spec.reunion.por } as const;
      registro.evento({
        fecha,
        autor,
        tipo_accion: 'PROYECTO_REUNION_CAMBIADA',
        elemento,
        id_proyecto: spec.id,
        cambios: [{ campo: 'reunion', valor_anterior: null, valor_nuevo: texto }],
      });
      registro.notificar({
        fecha,
        autor,
        destinatarios: [spec.supervisor, ...equipoEn(spec.id, fecha)],
        tipo: 'REUNION_SEMANAL_CAMBIADA',
        mensaje: `La reunión semanal de ${spec.nombre} quedó el ${texto}.`,
        elemento: referencia,
      });
    }

    if (spec.pausado !== undefined) {
      const fecha = reloj.hace(spec.pausado);
      registro.evento({
        fecha,
        autor: admin,
        tipo_accion: 'PROYECTO_PAUSADO',
        elemento,
        id_proyecto: spec.id,
        cambios: [{ campo: 'estado', valor_anterior: 'ACTIVO', valor_nuevo: 'EN_PAUSA' }],
        nota: 'El cliente pidió detener el desarrollo hasta definir el presupuesto.',
      });
      registro.notificar({
        fecha,
        autor: admin,
        destinatarios: [spec.supervisor, ...equipoEn(spec.id, fecha)],
        tipo: 'PROYECTO_PAUSADO',
        mensaje: `El proyecto ${spec.nombre} fue pausado.`,
        elemento: referencia,
      });
    }

    if (spec.finalizado !== undefined) {
      const fecha = reloj.hace(spec.finalizado);
      registro.evento({
        fecha,
        autor: admin,
        tipo_accion: 'PROYECTO_FINALIZADO',
        elemento,
        id_proyecto: spec.id,
        cambios: [
          { campo: 'estado', valor_anterior: 'ACTIVO', valor_nuevo: 'FINALIZADO' },
          { campo: 'fecha_fin_real', valor_anterior: null, valor_nuevo: fechaDe(fecha) },
        ],
        nota: 'Entrega aceptada por el cliente.',
      });
      registro.notificar({
        fecha,
        autor: admin,
        destinatarios: [spec.supervisor, ...equipoEn(spec.id, fecha)],
        tipo: 'PROYECTO_FINALIZADO',
        mensaje: `El proyecto ${spec.nombre} fue finalizado.`,
        elemento: referencia,
      });
    }
  }

  const codigoDe = (idProyecto: Id) => proyectos.find((p) => p.id === idProyecto)!;
  ASIGNACIONES.forEach((spec, i) => {
    const proyecto = codigoDe(spec.proyecto);
    const alta = reloj.hace([spec.alta, 5]);
    const baja = spec.baja === undefined ? null : reloj.hace([spec.baja, 5]);
    asignaciones.push({
      id: `asi-${String(i + 1).padStart(2, '0')}`,
      id_practicante: spec.practicante,
      id_proyecto: spec.proyecto,
      fecha_alta: fechaDe(alta),
      fecha_baja: baja === null ? null : fechaDe(baja),
    });
    const elementoPersona = {
      tipo: 'USUARIO',
      id: spec.practicante,
      etiqueta: nombre(spec.practicante),
    } as const;
    registro.evento({
      fecha: alta,
      autor: admin,
      tipo_accion: 'PRACTICANTE_ASIGNADO_A_PROYECTO',
      elemento: elementoPersona,
      id_proyecto: spec.proyecto,
      cambios: [{ campo: 'proyecto', valor_anterior: null, valor_nuevo: proyecto.codigo }],
    });
    registro.notificar({
      fecha: alta,
      autor: admin,
      destinatarios: [spec.practicante],
      tipo: 'ASIGNADO_A_PROYECTO',
      mensaje: `Te asignaron al proyecto ${proyecto.nombre}.`,
      elemento: { tipo: 'PROYECTO', id: spec.proyecto },
    });
    if (baja === null) return;
    if (spec.salida === 'QUITADO') {
      registro.evento({
        fecha: baja,
        autor: admin,
        tipo_accion: 'PRACTICANTE_QUITADO_DE_PROYECTO',
        elemento: elementoPersona,
        id_proyecto: spec.proyecto,
        cambios: [{ campo: 'proyecto', valor_anterior: proyecto.codigo, valor_nuevo: null }],
        nota: 'Reorganización del equipo.',
      });
      registro.notificar({
        fecha: baja,
        autor: admin,
        destinatarios: [spec.practicante],
        tipo: 'QUITADO_DE_PROYECTO',
        mensaje: `Saliste del proyecto ${proyecto.nombre}.`,
        elemento: { tipo: 'PROYECTO', id: spec.proyecto },
      });
    } else {
      // La baja se debe a que la práctica terminó: un solo evento de la persona, sin proyecto.
      registro.evento({
        fecha: baja,
        autor: admin,
        tipo_accion: 'PRACTICANTE_FINALIZADO',
        elemento: elementoPersona,
        id_proyecto: null,
        cambios: [{ campo: 'estado', valor_anterior: 'ACTIVO', valor_nuevo: 'INACTIVO' }],
        nota: 'Cierre de la práctica en la fecha prevista.',
      });
    }
  });

  return { proyectos, enlaces, asignaciones };
}
