/**
 * Resultado estándar de los servicios (plan §4.5).
 *
 * Toda función de `services/` devuelve un `Resultado`: nunca lanza errores crudos a la pantalla.
 * La forma es plana, igual que las de `domain/`: `{ ok: true, valor }` o
 * `{ ok: false, codigo, mensaje, campos? }`. El `codigo` sirve al código y a las pruebas; el
 * `mensaje` está en español, sin jerga técnica, listo para mostrarse; `campos` lleva un mensaje por
 * campo del formulario cuando el error viene de la validación.
 */

import type { ZodType } from 'zod';

export type CamposConError = Record<string, string>;

export interface ErrorServicio {
  codigo: string;
  mensaje: string;
  campos?: CamposConError;
}

export type Fallo = { ok: false } & ErrorServicio;

export type Resultado<T> = { ok: true; valor: T } | Fallo;

export const MENSAJE_GENERICO = 'No se pudo completar la acción.';

/**
 * Mensajes de los códigos de `domain/` que no traen texto (permisos, transiciones, edición y PR)
 * y de los propios de `services/`. Los códigos de puntaje, ID, indicadores y reactivación ya traen su
 * `mensaje` y pasan tal cual por `denegar`; los de ciclo de vida solo traen el código (y a veces una
 * cantidad), así que su mensaje está aquí. Cada servicio nuevo suma aquí los códigos que
 * necesite; una prueba exige que ningún código conocido se quede sin mensaje.
 */
export const MENSAJES: Readonly<Record<string, string>> = {
  // Permisos (`puede`). Ninguno revela si el elemento existe.
  USUARIO_INACTIVO: 'Tu cuenta está inactiva. Consulta con el administrador.',
  ROL_NO_PERMITIDO: 'Tu rol no permite realizar esta acción.',
  FUERA_DE_ALCANCE: 'No tienes acceso a este elemento.',
  NO_ES_EL_RESPONSABLE: 'Solo la persona responsable de la tarea puede realizar esta acción.',
  NO_ES_TU_CUENTA: 'Solo puedes modificar los datos de tu propia cuenta.',
  PROYECTO_FINALIZADO: 'El proyecto está finalizado. Reactívalo para modificar sus tareas.',
  // Transiciones de tarea
  TRANSICION_NO_APLICA: 'Esa acción no se puede realizar con la tarea en su estado actual.',
  TAREA_NO_REQUIERE_SUPERVISION:
    'Esta tarea no requiere supervisión: márcala como terminada directamente.',
  TAREA_REQUIERE_SUPERVISION:
    'Esta tarea requiere supervisión: envíala a supervisión en lugar de terminarla.',
  PROYECTO_EN_PAUSA: 'El proyecto está en pausa: no se pueden tomar tareas.',
  TEXTO_OBLIGATORIO: 'Escribe el motivo o la nota para continuar.',
  // Edición de tareas
  TAREA_NO_EDITABLE: 'Solo se pueden editar las tareas disponibles o en progreso.',
  TAREA_YA_TIENE_PR: 'La tarea ya tiene o tuvo un Pull Request: no se puede hacer este cambio.',
  TAREA_NO_ELIMINABLE: 'Solo se pueden eliminar las tareas disponibles.',
  // Pull Request
  TAREA_SIN_ETIQUETA_PR:
    'El Pull Request solo existe en tareas esperando supervisión o terminadas.',
  TAREA_NO_REQUIERE_PR: 'Esta tarea no requiere Pull Request.',
  ESTADO_PR_NO_APLICA: 'El Pull Request no está en un estado que permita esta acción.',
  FALTA_CONSULTA_GITHUB: 'No se pudo consultar el estado del Pull Request. Intenta de nuevo.',
  RAMA_INEXISTENTE: 'La rama elegida ya no existe en GitHub. Elige otra rama.',
  // Postulaciones (los de la decisión traen su mensaje desde `domain/`)
  POSTULACION_YA_EVALUADA: 'Esta postulación ya tiene una evaluación y no se vuelve a calcular.',
  CORREO_YA_REGISTRADO: 'Ya existe una cuenta con ese correo.',
  USUARIO_OBJETIVO_INACTIVO:
    'Esta cuenta está inactiva: reactívala antes de restablecer su contraseña.',
  CONFIGURACION_INVALIDA:
    'Falta un parámetro de Configuración o no tiene el formato esperado. Restaura sus valores.',
  // Cuenta propia: acceso, perfil y contraseña
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos',
  CONTRASENA_ACTUAL_INCORRECTA: 'La contraseña actual no es correcta.',
  CONTRASENA_IGUAL_A_LA_ACTUAL: 'La contraseña nueva debe ser distinta de la actual.',
  // Seguimiento
  INSIGHT_YA_REVISADO: 'Ya marcaste esta alerta como revisada.',
  // Ciclo de vida (`domain/cicloVida.ts` devuelve solo el código y, a veces, una cantidad: el mensaje
  // lo pone `denegarCicloVida`, que agrega la cantidad donde corresponde)
  AHORA_INVALIDO: 'La hora del sistema no es válida. Recarga la página e intenta de nuevo.',
  PRACTICANTE_YA_FINALIZADO: 'La práctica de esta persona ya está finalizada.',
  PROYECTO_YA_FINALIZADO: 'El proyecto ya está finalizado.',
  TAREAS_ESPERANDO_SUPERVISION:
    'El proyecto tiene tareas esperando supervisión: resuélvelas antes de finalizarlo.',
  SUPERVISOR_CON_PROYECTOS:
    'El supervisor tiene proyectos activos o en pausa: reasígnalos antes de desactivarlo.',
  SUPERVISOR_YA_INACTIVO: 'El supervisor ya está inactivo.',
  PRACTICANTE_NO_ACTIVO: 'Solo se puede asignar a un practicante activo.',
  ASIGNACION_VIGENTE_EXISTENTE: 'El practicante ya está asignado a ese proyecto.',
  ASIGNACION_NO_VIGENTE: 'El practicante no está asignado a ese proyecto.',
  SUPERVISOR_NO_VALIDO: 'Elige un supervisor activo.',
  MISMO_SUPERVISOR: 'Esa persona ya es el supervisor del proyecto.',
  // Datos de la práctica
  ESPECIALIDAD_INACTIVA: 'La especialidad elegida está inactiva. Elige una especialidad activa.',
  FIN_ANTES_DE_INGRESO: 'La fecha de fin prevista no puede ser anterior a la fecha de ingreso.',
  // Proyectos (los de `validarCodigoProyecto` traen su mensaje desde `domain/`)
  PROYECTO_NO_ES_DEL_SUPERVISOR: 'Ese proyecto no está a cargo del supervisor indicado.',
  CODIGO_INMUTABLE: 'El código del proyecto no se puede cambiar.',
  FIN_ANTES_DE_INICIO: 'La fecha de fin prevista no puede ser anterior a la fecha de inicio.',
  // Catálogo de evaluación (áreas, especialidades y criterios)
  NOMBRE_DUPLICADO: 'Ya existe un elemento con ese nombre.',
  CRITERIOS_INCOMPLETOS:
    'Faltan criterios del bloque. Los criterios no se borran: desactívalos para dejarlos fuera.',
  CRITERIO_DE_OTRO_BLOQUE: 'Un criterio no pertenece a este bloque.',
  ESPECIALIDAD_DE_OTRA_AREA: 'La especialidad no pertenece a esa área técnica.',
  // Propios de `services/`
  NO_ENCONTRADO: 'No se encontró el elemento. Puede que ya no exista.',
  DATOS_INVALIDOS: 'Revisa los datos ingresados.',
  ERROR_INESPERADO: 'Ocurrió un error inesperado. Intenta de nuevo.',

  CONTRASENA_ACTUAL_INVALIDA: 'La contraseña actual no es correcta.',

  SIN_CAMBIOS: 'No hay cambios para guardar.',
};

/** Mensaje en español de un código; uno genérico si el código no se conoce. */
export function mensajeDe(codigo: string): string {
  return MENSAJES[codigo] ?? MENSAJE_GENERICO;
}

export function exito<T>(valor: T): Resultado<T> {
  return { ok: true, valor };
}

/** Un error controlado. Sin `mensaje`, se usa el de la tabla; `campos` solo si hay errores por campo. */
export function fallo(codigo: string, mensaje?: string, campos?: CamposConError): Fallo {
  const error: Fallo = { ok: false, codigo, mensaje: mensaje ?? mensajeDe(codigo) };
  if (campos !== undefined) error.campos = campos;
  return error;
}

/**
 * Convierte la respuesta negativa de `domain/` en un fallo: sirve tanto para
 * `{ permitido: false, codigo }` (sin texto) como para `{ codigo, mensaje }` (con texto).
 */
export function denegar(resultado: { codigo: string; mensaje?: string }): Fallo {
  return fallo(resultado.codigo, resultado.mensaje);
}

/**
 * Valida la entrada con un esquema de Zod (los formularios se validan siempre en `services/`).
 * Si falla, devuelve `DATOS_INVALIDOS` con un mensaje por campo (el primero de cada uno).
 */
export function validarEntrada<T>(esquema: ZodType<T>, entrada: unknown): Resultado<T> {
  const analisis = esquema.safeParse(entrada);
  if (analisis.success) return exito(analisis.data);

  const campos: CamposConError = {};
  for (const problema of analisis.error.issues) {
    const campo = problema.path.length === 0 ? '_general' : problema.path.map(String).join('.');
    if (!(campo in campos)) campos[campo] = problema.message;
  }
  return fallo('DATOS_INVALIDOS', undefined, campos);
}
