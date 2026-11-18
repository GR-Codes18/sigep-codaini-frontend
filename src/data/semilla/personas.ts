/**
 * Personas con cuenta: 1 administrador, 3 supervisores y 24 practicantes.
 *
 * Contraseñas de DEMOSTRACIÓN: todas las cuentas usan `CONTRASENA_DEMO` y el correo
 * `nombre.apellido@codaini.demo`. Las tres cuentas de acceso rápido tienen IDs estables. Los
 * nombres son inventados.
 *
 * La fecha de fin de cada práctica sale de `fechaFinPrevista` (Fase 1, paso 10): para los
 * casos «cerca de su fin» y «ya la superó» se retrocede la fecha de ingreso según la duración
 * vigente de Configuración, hasta que ingreso + duración dé la fecha deseada.
 */

import {
  fechaFinPrevista,
  type Fecha,
  type FechaHora,
  type Id,
  type ParametroConfiguracion,
  type Practicante,
  type Supervisor,
  type Usuario,
} from '@/domain';
import { areaDeEspecialidad } from './catalogos';
import { masMinutos, sumarDias, type Reloj } from './reloj';
import type { Registro } from './registro';

export const CONTRASENA_DEMO = 'demo12345';

export const ID_ADMIN = 'demo-admin';
export const ID_SUPERVISOR_DEMO = 'demo-supervisor';
export const ID_SUPERVISOR_2 = 'usr-sup-02';
export const ID_SUPERVISOR_3 = 'usr-sup-03';
export const ID_PRACTICANTE_DEMO = 'demo-practicante';

interface EspecificacionSupervisor {
  id: Id;
  nombre: string;
  correo: string;
  celular: string;
  creadoHace: number;
}

const SUPERVISORES: readonly EspecificacionSupervisor[] = [
  {
    id: ID_SUPERVISOR_DEMO,
    nombre: 'Supervisor Demo',
    correo: 'supervisor@codaini.demo',
    celular: '900100001',
    creadoHace: 150,
  },
  {
    id: ID_SUPERVISOR_2,
    nombre: 'Ricardo Salinas Vega',
    correo: 'ricardo.salinas@codaini.demo',
    celular: '900100002',
    creadoHace: 140,
  },
  {
    id: ID_SUPERVISOR_3,
    nombre: 'Patricia Lazo Núñez',
    correo: 'patricia.lazo@codaini.demo',
    celular: '900100003',
    creadoHace: 130,
  },
];

interface EspecificacionPracticante {
  id: Id;
  nombre: string;
  /** Especialidad; el área se deduce de ella. */
  esp: Id;
  /** Fecha de fin deseada, en días desde hoy (negativo = ya pasó). */
  fin?: number;
  /** Alternativa a `fin`: fecha de ingreso en días desde hoy. */
  ingreso?: number;
  /** Práctica cerrada: la cuenta queda INACTIVA (se presenta como Finalizado). */
  finalizado?: boolean;
  /** Cuenta recién creada: contraseña temporal y perfil sin completar. */
  nuevo?: boolean;
}

/** Los 24 practicantes. Las notas dicen qué caso de demostración cubre cada uno. */
const PRACTICANTES: readonly EspecificacionPracticante[] = [
  // Proyecto 1 (PL2D)
  { id: ID_PRACTICANTE_DEMO, nombre: 'Practicante Demo', esp: 'esp-sw-front', fin: 70 },
  { id: 'usr-pra-02', nombre: 'Diego Ramírez Soto', esp: 'esp-vj-prog', fin: 9 }, // cerca de su fin
  { id: 'usr-pra-03', nombre: 'Camila Torres Ávila', esp: 'esp-vj-dis', fin: -6 }, // ya la superó
  { id: 'usr-pra-04', nombre: 'Mateo Salazar Cruz', esp: 'esp-sw-back', fin: 60 }, // más de 3 en progreso
  { id: 'usr-pra-05', nombre: 'Andrés Cáceres Luna', esp: 'esp-vj-prog', fin: 50 }, // inactivo > 14 días
  { id: 'usr-pra-06', nombre: 'Lucía Paredes Díaz', esp: 'esp-sw-front', fin: 55 }, // en 2 proyectos
  // Proyecto 2 (RSV)
  { id: 'usr-pra-07', nombre: 'Hernán Gutiérrez Mori', esp: 'esp-sw-back', fin: 40 }, // inactivo > 7 días
  { id: 'usr-pra-08', nombre: 'Sofía Villanueva Ríos', esp: 'esp-da-ana', fin: 45 }, // sin tareas en curso
  // Proyecto 3 (INV, en pausa)
  { id: 'usr-pra-09', nombre: 'Bruno Ccori Mamani', esp: 'esp-sw-movil', fin: 55 },
  { id: 'usr-pra-10', nombre: 'Tomás Delgado Pinto', esp: 'esp-sw-movil', fin: 58 },
  { id: 'usr-pra-11', nombre: 'Inés Alvarado Quiroz', esp: 'esp-ux-int', fin: 62 },
  { id: 'usr-pra-12', nombre: 'Joaquín Mendieta Flores', esp: 'esp-sw-back', fin: 68 },
  { id: 'usr-pra-13', nombre: 'Renata Chávez Bravo', esp: 'esp-ux-inv', fin: 52 },
  { id: 'usr-pra-14', nombre: 'Gustavo Herrera Poma', esp: 'esp-da-ml', fin: 70 },
  // Proyecto 4 (TIE, finalizado)
  { id: 'usr-pra-15', nombre: 'Rodrigo Aguirre Sánchez', esp: 'esp-sw-front', fin: 15 },
  { id: 'usr-pra-16', nombre: 'Paola Medina Ochoa', esp: 'esp-ux-int', fin: 18 },
  { id: 'usr-pra-17', nombre: 'Kevin Huertas Lara', esp: 'esp-sw-back', fin: 20 },
  { id: 'usr-pra-18', nombre: 'Elena Vásquez Rojas', esp: 'esp-da-ana', fin: 22 },
  // Práctica finalizada (cuenta inactiva)
  {
    id: 'usr-pra-19',
    nombre: 'Marisol Cornejo Tapia',
    esp: 'esp-sw-front',
    fin: -3,
    finalizado: true,
  },
  // Sin proyecto
  { id: 'usr-pra-20', nombre: 'Nicolás Prado Vera', esp: 'esp-vj-prog', fin: 20 }, // con un proyecto anterior
  { id: 'usr-pra-21', nombre: 'Daniela Zegarra León', esp: 'esp-ux-inv', fin: 55 },
  { id: 'usr-pra-22', nombre: 'Sebastián Rueda Maita', esp: 'esp-da-ml', fin: 80 },
  { id: 'usr-pra-23', nombre: 'Alejandra Yupanqui Toro', esp: 'esp-vj-dis', fin: 100 },
  {
    id: 'usr-pra-24',
    nombre: 'Fabricio Lozano Ibarra',
    esp: 'esp-sw-movil',
    ingreso: -1,
    nuevo: true,
  },
];

export interface Aprobacion {
  id_postulante: Id;
  /** Instante en que el administrador aprobó la postulación y se creó la cuenta. */
  instante: FechaHora;
}

export interface DatosPersonas {
  usuarios: Usuario[];
  practicantes: Practicante[];
  supervisores: Supervisor[];
  /** Por ID de practicante. El ID de la postulación de origen es `pos-NN` (NN = su orden). */
  aprobaciones: Map<Id, Aprobacion>;
}

/** `correo` y `usuarios` de acceso: `nombre.apellido` sin tildes ni ñ. */
export function correoDe(nombre: string): string {
  const partes = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(' ');
  return `${partes[0]}.${partes[partes.length - 2]}@codaini.demo`;
}

/** Celular de ejemplo, determinista (9 dígitos, empieza con 9). */
export function celularDe(orden: number): string {
  return `9${String(10_000_000 + ((orden * 7_654_321) % 90_000_000))}`;
}

/** Nombre de usuario de Discord y de GitHub de ejemplo. */
function usuarioDe(nombre: string): string {
  const partes = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(' ');
  return `${partes[0]}-${partes[partes.length - 2]}`;
}

/** Duración vigente de las prácticas (parámetro de Configuración), en meses. */
export function duracionMeses(parametros: readonly ParametroConfiguracion[]): number {
  const parametro = parametros.find((p) => p.clave === 'PRACTICA_DURACION_MESES');
  if (parametro?.valor.tipo !== 'numero') throw new Error('Falta PRACTICA_DURACION_MESES.');
  return parametro.valor.valor;
}

/**
 * Ingreso que deja la fecha de fin prevista más cerca de `finDeseado`: se retrocede desde
 * esa fecha entre 28 y 31 días por mes y se queda con el ingreso cuyo ingreso + duración
 * (con `fechaFinPrevista`) acierta o se acerca más. Algunas fechas no se pueden alcanzar
 * exactas (por ejemplo, un 31 desde un mes de 30 días).
 */
export function ingresoParaFin(finDeseado: Fecha, meses: number): { ingreso: Fecha; fin: Fecha } {
  let mejor: { ingreso: Fecha; fin: Fecha; distancia: number } | null = null;
  for (let dias = meses * 28; dias <= meses * 31 + 3; dias += 1) {
    const ingreso = sumarDias(finDeseado, -dias);
    const resultado = fechaFinPrevista(ingreso, meses);
    if (!resultado.ok) continue;
    const distancia = Math.abs(Date.parse(resultado.fecha) - Date.parse(finDeseado));
    if (mejor === null || distancia < mejor.distancia) {
      mejor = { ingreso, fin: resultado.fecha, distancia };
    }
    if (distancia === 0) break;
  }
  if (mejor === null) throw new Error(`No se pudo calcular el ingreso para ${finDeseado}.`);
  return { ingreso: mejor.ingreso, fin: mejor.fin };
}

export function crearPersonas(
  reloj: Reloj,
  registro: Registro,
  parametros: readonly ParametroConfiguracion[],
): DatosPersonas {
  const meses = duracionMeses(parametros);
  const usuarios: Usuario[] = [];
  const practicantes: Practicante[] = [];
  const supervisores: Supervisor[] = [];
  const aprobaciones = new Map<Id, Aprobacion>();

  const admin: Usuario = {
    id: ID_ADMIN,
    nombre: 'Administrador Demo',
    correo: 'admin@codaini.demo',
    celular: '900100000',
    contrasena: CONTRASENA_DEMO,
    rol: 'ADMINISTRADOR',
    estado: 'ACTIVO',
    debe_cambiar_contrasena: false,
    fecha_alta: reloj.hace([160]),
  };
  usuarios.push(admin);

  for (const spec of SUPERVISORES) {
    const fecha_alta = reloj.hace([spec.creadoHace, 3]);
    usuarios.push({
      id: spec.id,
      nombre: spec.nombre,
      correo: spec.correo,
      celular: spec.celular,
      contrasena: CONTRASENA_DEMO,
      rol: 'SUPERVISOR',
      estado: 'ACTIVO',
      debe_cambiar_contrasena: false,
      fecha_alta,
    });
    supervisores.push({
      id_usuario: spec.id,
      discord: usuarioDe(spec.nombre),
      cuenta_github: usuarioDe(spec.nombre),
    });
    registro.evento({
      fecha: fecha_alta,
      autor: { tipo: 'USUARIO', id_usuario: ID_ADMIN },
      tipo_accion: 'SUPERVISOR_CREADO',
      elemento: { tipo: 'USUARIO', id: spec.id, etiqueta: spec.nombre },
      id_proyecto: null,
    });
  }

  PRACTICANTES.forEach((spec, indice) => {
    const orden = indice + 1;
    const { ingreso, fin } =
      spec.fin !== undefined
        ? ingresoParaFin(reloj.dia(spec.fin), meses)
        : (() => {
            const ingresoFecha = reloj.dia(spec.ingreso ?? 0);
            const resultado = fechaFinPrevista(ingresoFecha, meses);
            if (!resultado.ok) throw new Error(resultado.mensaje);
            return { ingreso: ingresoFecha, fin: resultado.fecha };
          })();

    // Se aprueba el día de ingreso a las 10:00 (hora de Perú); la cuenta nace un minuto después.
    const instante = `${ingreso}T15:00:00.000Z`;
    const fecha_alta = masMinutos(instante, 1);
    const idPostulante = `pos-${String(orden).padStart(2, '0')}`;
    aprobaciones.set(spec.id, { id_postulante: idPostulante, instante });

    const demo = spec.id === ID_PRACTICANTE_DEMO;
    usuarios.push({
      id: spec.id,
      nombre: spec.nombre,
      correo: demo ? 'practicante@codaini.demo' : correoDe(spec.nombre),
      celular: celularDe(orden),
      contrasena: CONTRASENA_DEMO,
      rol: 'PRACTICANTE',
      estado: spec.finalizado === true ? 'INACTIVO' : 'ACTIVO',
      debe_cambiar_contrasena: spec.nuevo === true,
      fecha_alta,
    });
    practicantes.push({
      id_usuario: spec.id,
      // Discord, GitHub y disponibilidad nacen vacíos y los completa la persona en Mi perfil.
      discord: spec.nuevo === true ? null : usuarioDe(spec.nombre),
      cuenta_github: spec.nuevo === true ? null : usuarioDe(spec.nombre),
      disponibilidad_horaria: spec.nuevo === true ? null : 20 + 5 * (orden % 3),
      id_area_tecnica: areaDeEspecialidad(spec.esp),
      id_especialidad: spec.esp,
      fecha_ingreso: ingreso,
      fecha_fin_prevista: fin,
      id_postulante: idPostulante,
    });
    registro.evento({
      fecha: fecha_alta,
      autor: { tipo: 'USUARIO', id_usuario: ID_ADMIN },
      tipo_accion: 'PRACTICANTE_CREADO',
      elemento: { tipo: 'USUARIO', id: spec.id, etiqueta: spec.nombre },
      id_proyecto: null,
    });
  });

  return { usuarios, practicantes, supervisores, aprobaciones };
}
