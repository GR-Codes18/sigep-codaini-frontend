/**
 * Validación de lo que se lee del navegador. Cada esquema está tipado contra su
 * tipo de `domain/`: si el tipo cambia y el esquema no, el proyecto no compila.
 */

import { z } from 'zod';
import {
  ACCIONES_POR_CATEGORIA,
  BLOQUES_CRITERIO,
  CATALOGO_PARAMETROS,
  DIAS_SEMANA,
  ESTADOS_POSTULACION,
  ESTADOS_PR,
  ESTADOS_PROYECTO,
  ESTADOS_TAREA,
  ESTADOS_USUARIO,
  ROLES,
  SEVERIDADES,
  TIPOS_CRITERIO,
  TIPOS_ELEMENTO,
  TIPOS_NOTIFICACION,
  TIPOS_REGLA_INSIGHT,
  type AreaTecnica,
  type Asignacion,
  type ClaveParametro,
  type CriterioEvaluacion,
  type EnlaceProyecto,
  type Especialidad,
  type EventoHistorial,
  type InsightRevision,
  type Notificacion,
  type ParametroConfiguracion,
  type PostulacionEvaluacion,
  type PostulacionEvaluacionDetalle,
  type Postulante,
  type Practicante,
  type Proyecto,
  type ReferenciaElemento,
  type Supervisor,
  type Tarea,
  type TipoAccionHistorial,
  type Usuario,
  type ValorParametro,
} from '@/domain';
import type { DatosAlmacen } from './tipos';

const id = z.string().min(1);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const fechaHora = z.iso.datetime();
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const ACCIONES_VALIDAS = new Set<string>(Object.values(ACCIONES_POR_CATEGORIA).flat());
const tipoAccion = z.custom<TipoAccionHistorial>(
  (valor) => typeof valor === 'string' && ACCIONES_VALIDAS.has(valor),
);

const CLAVES_VALIDAS = new Set<string>(CATALOGO_PARAMETROS.map((p) => p.clave));
const claveParametro = z.custom<ClaveParametro>(
  (valor) => typeof valor === 'string' && CLAVES_VALIDAS.has(valor),
);

const referencia: z.ZodType<ReferenciaElemento> = z.object({
  tipo: z.enum(TIPOS_ELEMENTO),
  id,
});

const esquemaUsuario: z.ZodType<Usuario> = z.object({
  id,
  nombre: z.string(),
  correo: z.string(),
  celular: z.string(),
  contrasena: z.string(),
  rol: z.enum(ROLES),
  estado: z.enum(ESTADOS_USUARIO),
  debe_cambiar_contrasena: z.boolean(),
  fecha_alta: fechaHora,
});

const esquemaPracticante: z.ZodType<Practicante> = z.object({
  id_usuario: id,
  discord: z.string().nullable(),
  cuenta_github: z.string().nullable(),
  disponibilidad_horaria: z.number().nullable(),
  id_area_tecnica: id,
  id_especialidad: id,
  fecha_ingreso: fecha,
  fecha_fin_prevista: fecha,
  id_postulante: id,
});

const esquemaSupervisor: z.ZodType<Supervisor> = z.object({
  id_usuario: id,
  discord: z.string().nullable(),
  cuenta_github: z.string().nullable(),
});

const esquemaProyecto: z.ZodType<Proyecto> = z.object({
  id,
  nombre: z.string(),
  codigo: z.string(),
  descripcion: z.string(),
  fecha_inicio: fecha,
  fecha_fin_prevista: fecha,
  fecha_fin_real: fecha.nullable(),
  estado: z.enum(ESTADOS_PROYECTO),
  dia_reunion: z.enum(DIAS_SEMANA).nullable(),
  hora_reunion: hora.nullable(),
  repositorio_url: z.string(),
  rama_base: z.string(),
  id_supervisor: id,
  // Contador de IDs legibles: entero >= 0 (no se reutilizan números).
  ultimo_numero_tarea: z.number().int().min(0),
});

const esquemaEnlace: z.ZodType<EnlaceProyecto> = z.object({
  id,
  id_proyecto: id,
  nombre: z.string(),
  url: z.string(),
});

const esquemaAsignacion: z.ZodType<Asignacion> = z.object({
  id,
  id_practicante: id,
  id_proyecto: id,
  fecha_alta: fecha,
  fecha_baja: fecha.nullable(),
});

const esquemaTarea: z.ZodType<Tarea> = z.object({
  id,
  numero: z.number().int().min(1),
  titulo: z.string(),
  descripcion: z.string(),
  fecha_limite: fecha,
  id_proyecto: id,
  id_practicante: id.nullable(),
  estado: z.enum(ESTADOS_TAREA),
  requiere_supervision: z.boolean(),
  requiere_pr: z.boolean(),
  estado_pr: z.enum(ESTADOS_PR).nullable(),
  rama_origen: z.string().nullable(),
  rama_base: z.string().nullable(),
  url_pull_request: z.string().nullable(),
  fecha_termino: fechaHora.nullable(),
});

const esquemaPostulante: z.ZodType<Postulante> = z.object({
  id,
  nombre: z.string(),
  correo: z.string(),
  celular: z.string(),
  id_area_tecnica: id,
  id_especialidad: id,
  fecha_postulacion: fechaHora,
  cv: z.object({ nombre: z.string(), url: z.string() }),
  estado: z.enum(ESTADOS_POSTULACION),
});

const esquemaArea: z.ZodType<AreaTecnica> = z.object({
  id,
  nombre: z.string(),
  activo: z.boolean(),
});

const esquemaEspecialidad: z.ZodType<Especialidad> = z.object({
  id,
  id_area_tecnica: id,
  nombre: z.string(),
  activo: z.boolean(),
});

const esquemaCriterio: z.ZodType<CriterioEvaluacion> = z.object({
  id,
  id_area_tecnica: id,
  id_especialidad: id.nullable(),
  nombre: z.string(),
  tipo: z.enum(TIPOS_CRITERIO),
  peso: z.number(),
  obligatorio: z.boolean(),
  activo: z.boolean(),
});

const esquemaEvaluacion: z.ZodType<PostulacionEvaluacion> = z.object({
  id,
  id_postulante: id,
  puntaje_area: z.number(),
  puntaje_especialidad: z.number(),
  puntaje_total: z.number(),
  justificacion: z.string(),
  requiere_revision_manual: z.boolean(),
  fecha_evaluacion: fechaHora,
});

const esquemaDetalle: z.ZodType<PostulacionEvaluacionDetalle> = z.object({
  id,
  id_evaluacion: id,
  id_criterio: id,
  bloque: z.enum(BLOQUES_CRITERIO),
  nombre_criterio: z.string(),
  peso: z.number(),
  cumplido: z.boolean(),
  puntaje_obtenido: z.number(),
  observacion: z.string().nullable(),
});

const esquemaEvento: z.ZodType<EventoHistorial> = z.object({
  id,
  fecha: fechaHora,
  autor: z.discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('USUARIO'), id_usuario: id }),
    z.object({ tipo: z.literal('SISTEMA') }),
  ]),
  tipo_accion: tipoAccion,
  elemento: z.object({ tipo: z.enum(TIPOS_ELEMENTO), id, etiqueta: z.string() }),
  id_proyecto: id.nullable(),
  cambios: z.array(
    z.object({
      campo: z.string(),
      valor_anterior: z.string().nullable(),
      valor_nuevo: z.string().nullable(),
    }),
  ),
  nota: z.string().nullable(),
});

const esquemaNotificacion: z.ZodType<Notificacion> = z.object({
  id,
  id_destinatario: id,
  tipo: z.enum(TIPOS_NOTIFICACION),
  mensaje: z.string(),
  elemento: referencia,
  fecha: fechaHora,
  leida: z.boolean(),
});

const esquemaRevision: z.ZodType<InsightRevision> = z.object({
  id,
  tipo_regla: z.enum(TIPOS_REGLA_INSIGHT),
  elemento: referencia,
  severidad_al_revisar: z.enum(SEVERIDADES),
  fecha: fechaHora,
  id_usuario: id,
  nota: z.string().nullable(),
});

const esquemaValor: z.ZodType<ValorParametro> = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('numero'), valor: z.number() }),
  z.object({ tipo: z.literal('rango'), minimo: z.number(), maximo: z.number() }),
  z.object({ tipo: z.literal('proporcion'), area: z.number(), especialidad: z.number() }),
]);

const esquemaParametro: z.ZodType<ParametroConfiguracion> = z
  .object({
    id,
    clave: claveParametro,
    valor: esquemaValor,
    valor_predeterminado: esquemaValor,
  })
  // La PK de un parámetro es su clave.
  .refine((parametro) => parametro.id === parametro.clave, {
    message: 'id debe ser igual a clave',
  });

const esquemaDatos: z.ZodType<DatosAlmacen> = z.object({
  usuarios: z.array(esquemaUsuario),
  practicantes: z.array(esquemaPracticante),
  supervisores: z.array(esquemaSupervisor),
  proyectos: z.array(esquemaProyecto),
  enlaces_proyecto: z.array(esquemaEnlace),
  asignaciones: z.array(esquemaAsignacion),
  tareas: z.array(esquemaTarea),
  postulantes: z.array(esquemaPostulante),
  areas_tecnicas: z.array(esquemaArea),
  especialidades: z.array(esquemaEspecialidad),
  criterios: z.array(esquemaCriterio),
  evaluaciones: z.array(esquemaEvaluacion),
  detalles_evaluacion: z.array(esquemaDetalle),
  historial: z.array(esquemaEvento),
  notificaciones: z.array(esquemaNotificacion),
  revisiones_insight: z.array(esquemaRevision),
  parametros: z.array(esquemaParametro),
});

/**
 * Devuelve los datos si cumplen la forma completa, o `null` si algo está dañado.
 * Además exige que estén todas las claves del catálogo de parámetros, porque los
 * servicios las leen sin comprobar que existan.
 */
export function validarDatos(valor: unknown): DatosAlmacen | null {
  const resultado = esquemaDatos.safeParse(valor);
  if (!resultado.success) return null;
  const claves = new Set(resultado.data.parametros.map((parametro) => parametro.clave));
  if (claves.size !== CATALOGO_PARAMETROS.length) return null;
  return resultado.data;
}
