/**
 * Postulaciones de la semilla: 24 aprobadas (el origen de cada practicante) y 18 en flujo:
 * 9 pendientes, 1 reconsiderada (vuelve a «Pendiente» con una nota) y 8 rechazadas.
 *
 * Cada postulación trae su evaluación. El puntaje, la marca de revisión manual y el desglose
 * salen de `calcularPuntaje` (Fase 1, paso 7) con los criterios del catálogo y los valores
 * vigentes de Configuración: la semilla solo escribe el «juicio» de cada criterio.
 */

import {
  calcularPuntaje,
  type CriterioEvaluacion,
  type EstadoPostulacion,
  type FechaHora,
  type Id,
  type ParametroConfiguracion,
  type PostulacionEvaluacion,
  type PostulacionEvaluacionDetalle,
  type Postulante,
  type Practicante,
  type Usuario,
} from '@/domain';
import { juicios } from './catalogos';
import { celularDe, correoDe, ID_ADMIN, type Aprobacion } from './personas';
import { masMinutos, type Desfase, type Reloj } from './reloj';
import type { Registro } from './registro';

const MS_POR_DIA = 86_400_000;

interface PostulacionEnFlujo {
  nombre: string;
  esp: Id;
  /** Cuándo llegó la postulación. */
  hace: Desfase;
  /** Una letra por criterio activo: área y especialidad (`S` cumple, `N` no cumple). */
  area: string;
  especialidad: string;
  /** Si se decidió, cuántos días después de llegar y con qué texto. */
  rechazada?: { dias: number; motivo: string };
  reconsiderada?: { hace: Desfase; nota: string };
}

const PENDIENTES: readonly PostulacionEnFlujo[] = [
  {
    nombre: 'Mariana Condori Apaza',
    esp: 'esp-sw-front',
    hace: [0, 5],
    area: 'SSSS',
    especialidad: 'SSSS',
  },
  {
    nombre: 'Luis Quispe Ayala',
    esp: 'esp-vj-prog',
    hace: [1, 2],
    area: 'NSSS',
    especialidad: 'SSSS',
  }, // falta un obligatorio
  {
    nombre: 'Jimena Flores Cárdenas',
    esp: 'esp-ux-inv',
    hace: [2, 3],
    area: 'SSNS',
    especialidad: 'SSSN',
  },
  {
    nombre: 'Óscar Benavides Salas',
    esp: 'esp-da-ml',
    hace: [3, 6],
    area: 'SSNN',
    especialidad: 'SSNS',
  }, // 69: banda ambigua
  {
    nombre: 'Valentina Ríos Espinoza',
    esp: 'esp-sw-back',
    hace: [4, 1],
    area: 'SSSS',
    especialidad: 'SSSN',
  },
  {
    nombre: 'Cristian Mamani Huanca',
    esp: 'esp-sw-movil',
    hace: [6, 4],
    area: 'SSNN',
    especialidad: 'SNNS',
  }, // sin decidir
  {
    nombre: 'Ana Lucía Puma Ccama',
    esp: 'esp-ux-int',
    hace: [9, 2],
    area: 'SSSN',
    especialidad: 'SSNS',
  }, // sin decidir
  {
    nombre: 'Percy Alanoca Mendoza',
    esp: 'esp-vj-dis',
    hace: [2, 8],
    area: 'SSNS',
    especialidad: 'SSNN',
  }, // 66: banda ambigua
  {
    nombre: 'Gabriela Santos Rivas',
    esp: 'esp-da-ana',
    hace: [0, 20],
    area: 'SSSS',
    especialidad: 'SSNS',
  },
];

const RECONSIDERADA: PostulacionEnFlujo = {
  nombre: 'Raúl Tupayachi Gómez',
  esp: 'esp-sw-back',
  hace: [12, 2],
  area: 'SSNN',
  especialidad: 'SNSN',
  rechazada: { dias: 5, motivo: 'Parecía no cumplir con la disponibilidad horaria.' },
  reconsiderada: { hace: [2, 4], nota: 'El postulante aclaró su disponibilidad por correo.' },
};

const MOTIVOS = [
  'Puntaje bajo y sin la disponibilidad mínima.',
  'No evidencia experiencia en la especialidad elegida.',
  'El CV no muestra proyectos ni portafolio.',
  'Postuló al área equivocada; se le sugirió volver a postular.',
];

const DATOS_RECHAZADAS: readonly PostulacionEnFlujo[] = [
  {
    nombre: 'Henry Chambi Apaza',
    esp: 'esp-sw-front',
    hace: [38, 2],
    area: 'SNNN',
    especialidad: 'SNNN',
  },
  {
    nombre: 'Karina Palomino Rojas',
    esp: 'esp-vj-dis',
    hace: [35, 5],
    area: 'NNSN',
    especialidad: 'NSNN',
  },
  {
    nombre: 'Jhon Ancco Yucra',
    esp: 'esp-da-ana',
    hace: [30, 1],
    area: 'SNSN',
    especialidad: 'NNNN',
  },
  {
    nombre: 'Rosa Huallpa Cutipa',
    esp: 'esp-ux-int',
    hace: [26, 6],
    area: 'NSSN',
    especialidad: 'SNNN',
  },
  {
    nombre: 'Wilmer Colque Huarca',
    esp: 'esp-sw-movil',
    hace: [21, 3],
    area: 'SNNN',
    especialidad: 'NNSN',
  },
  {
    nombre: 'Estefany Sulca Pari',
    esp: 'esp-sw-back',
    hace: [17, 2],
    area: 'NNNN',
    especialidad: 'SSNN',
  },
  {
    nombre: 'David Choque Mendoza',
    esp: 'esp-vj-prog',
    hace: [5, 4],
    area: 'NSNN',
    especialidad: 'NSNN',
  },
  {
    nombre: 'Brenda Tito Laura',
    esp: 'esp-da-ml',
    hace: [4, 1],
    area: 'SNNN',
    especialidad: 'NNNN',
  },
];

const RECHAZADAS: readonly PostulacionEnFlujo[] = DATOS_RECHAZADAS.map((p, i) => ({
  ...p,
  rechazada: { dias: 2 + (i % 2), motivo: MOTIVOS[i % MOTIVOS.length] },
}));

/** Juicios de las 24 aprobadas: ninguna falla un criterio obligatorio ni cae en la banda. */
const PATRONES_APROBADAS: readonly (readonly [string, string])[] = [
  ['SSSS', 'SSSS'],
  ['SSSN', 'SSSS'],
  ['SSNS', 'SSSN'],
  ['SSNS', 'SSNS'],
  ['SSSS', 'SSNS'],
  ['SSNN', 'SSSS'],
  ['SSSN', 'SSSN'],
  ['SSSS', 'SSSN'],
];

export interface DatosPostulaciones {
  postulantes: Postulante[];
  evaluaciones: PostulacionEvaluacion[];
  detalles: PostulacionEvaluacionDetalle[];
}

function valorRango(parametros: readonly ParametroConfiguracion[]) {
  const valor = parametros.find((p) => p.clave === 'EVALUACION_BANDA_AMBIGUA')?.valor;
  if (valor?.tipo !== 'rango') throw new Error('Falta EVALUACION_BANDA_AMBIGUA.');
  return { minimo: valor.minimo, maximo: valor.maximo };
}

function valorProporcion(parametros: readonly ParametroConfiguracion[]) {
  const valor = parametros.find((p) => p.clave === 'EVALUACION_PROPORCION')?.valor;
  if (valor?.tipo !== 'proporcion') throw new Error('Falta EVALUACION_PROPORCION.');
  return { area: valor.area, especialidad: valor.especialidad };
}

export function crearPostulaciones(
  reloj: Reloj,
  registro: Registro,
  datos: {
    usuarios: readonly Usuario[];
    practicantes: readonly Practicante[];
    aprobaciones: ReadonlyMap<Id, Aprobacion>;
    criterios: readonly CriterioEvaluacion[];
    parametros: readonly ParametroConfiguracion[];
  },
): DatosPostulaciones {
  const banda = valorRango(datos.parametros);
  const proporcion = valorProporcion(datos.parametros);
  const admin = { tipo: 'USUARIO', id_usuario: ID_ADMIN } as const;
  const sistema = { tipo: 'SISTEMA' } as const;
  const postulantes: Postulante[] = [];
  const evaluaciones: PostulacionEvaluacion[] = [];
  const detalles: PostulacionEvaluacionDetalle[] = [];

  /** Crea el postulante, evalúa con las reglas de `domain/` y registra «recibida» y «evaluada». */
  const registrar = (entrada: {
    id: Id;
    nombre: string;
    correo: string;
    celular: string;
    esp: Id;
    idArea: Id;
    recibida: FechaHora;
    area: string;
    especialidad: string;
    estado: EstadoPostulacion;
  }) => {
    const slug = entrada.correo.split('@')[0];
    postulantes.push({
      id: entrada.id,
      nombre: entrada.nombre,
      correo: entrada.correo,
      celular: entrada.celular,
      id_area_tecnica: entrada.idArea,
      id_especialidad: entrada.esp,
      fecha_postulacion: entrada.recibida,
      cv: { nombre: `cv-${slug}.pdf`, url: `/cv-ejemplo/${slug}.pdf` },
      estado: entrada.estado,
    });
    const resultado = calcularPuntaje({
      id_area_tecnica: entrada.idArea,
      id_especialidad: entrada.esp,
      criterios: datos.criterios,
      juicios: juicios(
        datos.criterios,
        entrada.idArea,
        entrada.esp,
        entrada.area,
        entrada.especialidad,
      ),
      banda,
      proporcion,
    });
    if (!resultado.ok) throw new Error(`Evaluación de ${entrada.id}: ${resultado.mensaje}`);

    const cumplidos = resultado.detalles.filter((d) => d.cumplido).length;
    let justificacion = `Cumple ${cumplidos} de ${resultado.detalles.length} criterios. Puntaje del área: ${resultado.puntaje_area}/100; de la especialidad: ${resultado.puntaje_especialidad}/100; nota final: ${resultado.puntaje_total}/100.`;
    if (resultado.motivos_revision.includes('CRITERIO_OBLIGATORIO')) {
      justificacion += ' Falta un criterio obligatorio: requiere revisión manual.';
    }
    if (resultado.motivos_revision.includes('BANDA_AMBIGUA')) {
      justificacion += ' La nota cae en la banda ambigua: requiere revisión manual.';
    }

    const fechaEvaluacion = masMinutos(entrada.recibida, 2);
    const idEvaluacion = `eva-${entrada.id.slice(4)}`;
    evaluaciones.push({
      id: idEvaluacion,
      id_postulante: entrada.id,
      puntaje_area: resultado.puntaje_area,
      puntaje_especialidad: resultado.puntaje_especialidad,
      puntaje_total: resultado.puntaje_total,
      justificacion,
      requiere_revision_manual: resultado.requiere_revision_manual,
      fecha_evaluacion: fechaEvaluacion,
    });
    resultado.detalles.forEach((detalle, i) => {
      detalles.push({
        id: `${idEvaluacion}-${String(i + 1).padStart(2, '0')}`,
        id_evaluacion: idEvaluacion,
        ...detalle,
      });
    });

    const elemento = { tipo: 'POSTULANTE', id: entrada.id, etiqueta: entrada.nombre } as const;
    registro.evento({
      fecha: entrada.recibida,
      autor: sistema,
      tipo_accion: 'POSTULACION_RECIBIDA',
      elemento,
      id_proyecto: null,
    });
    registro.evento({
      fecha: fechaEvaluacion,
      autor: sistema,
      tipo_accion: 'POSTULACION_EVALUADA',
      elemento,
      id_proyecto: null,
      cambios: [
        {
          campo: 'puntaje_total',
          valor_anterior: null,
          valor_nuevo: String(resultado.puntaje_total),
        },
      ],
    });
    return elemento;
  };

  const estado = (anterior: EstadoPostulacion, nuevo: EstadoPostulacion) => ({
    campo: 'estado',
    valor_anterior: anterior,
    valor_nuevo: nuevo,
  });

  // Aprobadas: una por practicante.
  datos.practicantes.forEach((practicante, i) => {
    const usuario = datos.usuarios.find((u) => u.id === practicante.id_usuario);
    const aprobacion = datos.aprobaciones.get(practicante.id_usuario);
    if (usuario === undefined || aprobacion === undefined) {
      throw new Error(`Falta la aprobación de ${practicante.id_usuario}.`);
    }
    const [area, especialidad] = PATRONES_APROBADAS[i % PATRONES_APROBADAS.length];
    const recibida = new Date(
      Date.parse(aprobacion.instante) - (4 + (i % 6)) * MS_POR_DIA - (1 + (i % 5)) * 3_600_000,
    ).toISOString();
    const elemento = registrar({
      id: aprobacion.id_postulante,
      nombre: usuario.nombre,
      correo: usuario.correo,
      celular: usuario.celular,
      esp: practicante.id_especialidad,
      idArea: practicante.id_area_tecnica,
      recibida,
      area,
      especialidad,
      estado: 'APROBADA',
    });
    registro.evento({
      fecha: aprobacion.instante,
      autor: admin,
      tipo_accion: 'POSTULACION_APROBADA',
      elemento,
      id_proyecto: null,
      cambios: [estado('PENDIENTE', 'APROBADA')],
    });
  });

  // En flujo: pendientes, reconsiderada y rechazadas (ordenes 25 a 42).
  const enFlujo = [...PENDIENTES, RECONSIDERADA, ...RECHAZADAS];
  const esp = (id: Id) => {
    // El área sale de la especialidad (`esp-sw-front` → `area-sw`).
    return `area-${id.split('-')[1]}`;
  };
  enFlujo.forEach((p, i) => {
    const orden = datos.practicantes.length + i + 1;
    const id = `pos-${String(orden).padStart(2, '0')}`;
    const recibida = reloj.hace(p.hace);
    const decidida = p.rechazada !== undefined;
    const elemento = registrar({
      id,
      nombre: p.nombre,
      correo: correoDe(p.nombre),
      celular: celularDe(orden),
      esp: p.esp,
      idArea: esp(p.esp),
      recibida,
      area: p.area,
      especialidad: p.especialidad,
      estado: decidida && p.reconsiderada === undefined ? 'RECHAZADA' : 'PENDIENTE',
    });
    if (p.rechazada !== undefined) {
      const rechazo = new Date(Date.parse(recibida) + p.rechazada.dias * MS_POR_DIA).toISOString();
      registro.evento({
        fecha: rechazo,
        autor: admin,
        tipo_accion: 'POSTULACION_RECHAZADA',
        elemento,
        id_proyecto: null,
        cambios: [estado('PENDIENTE', 'RECHAZADA')],
        nota: p.rechazada.motivo,
      });
    }
    if (p.reconsiderada !== undefined) {
      registro.evento({
        fecha: reloj.hace(p.reconsiderada.hace),
        autor: admin,
        tipo_accion: 'POSTULACION_RECONSIDERADA',
        elemento,
        id_proyecto: null,
        cambios: [estado('RECHAZADA', 'PENDIENTE')],
        nota: p.reconsiderada.nota,
      });
    }
  });

  return { postulantes, evaluaciones, detalles };
}
