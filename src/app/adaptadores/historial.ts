import {
  ACCIONES_POR_CATEGORIA,
  TIPOS_ELEMENTO,
  type CategoriaEvento,
  type Id,
  type TipoAccionHistorial,
  type TipoElemento,
} from '@/domain';
import type { EventoDeHistorial } from '@/services';
import { etiquetaAutor, etiquetaEstado } from './eventos';
import { rutaDelElemento } from './reportes';

/** Las 8 categorías de §5.7, en el orden de la tabla de la propuesta. */
export const CATEGORIAS_DE_HISTORIAL = Object.keys(ACCIONES_POR_CATEGORIA) as CategoriaEvento[];

export const ETIQUETA_CATEGORIA: Record<CategoriaEvento, string> = {
  POSTULACIONES: 'Postulaciones',
  EVALUACION: 'Evaluación',
  PRACTICANTES: 'Practicantes',
  SUPERVISORES: 'Supervisores',
  PROYECTOS: 'Proyectos',
  TAREAS: 'Tareas',
  PULL_REQUEST: 'Pull Request',
  CUENTA_PROPIA: 'Cuenta propia',
};

export const ETIQUETA_TIPO_ELEMENTO: Record<TipoElemento, string> = {
  USUARIO: 'Persona',
  PROYECTO: 'Proyecto',
  TAREA: 'Tarea',
  POSTULANTE: 'Postulación',
  AREA_TECNICA: 'Área técnica',
  ESPECIALIDAD: 'Especialidad',
  CRITERIO_EVALUACION: 'Criterio de evaluación',
  PARAMETRO_CONFIGURACION: 'Parámetro de configuración',
};

export const TIPOS_ELEMENTO_DE_HISTORIAL: readonly TipoElemento[] = TIPOS_ELEMENTO;

/** El nombre de cada acción registrada (§5.7); `Record` completo: una acción nueva obliga a nombrarla. */
export const ETIQUETA_ACCION: Record<TipoAccionHistorial, string> = {
  POSTULACION_RECIBIDA: 'Postulación recibida',
  POSTULACION_EVALUADA: 'Postulación evaluada por la IA',
  POSTULACION_APROBADA: 'Postulación aprobada',
  POSTULACION_RECHAZADA: 'Postulación rechazada',
  POSTULACION_RECONSIDERADA: 'Postulación reconsiderada',
  AREA_TECNICA_CREADA: 'Área técnica creada',
  AREA_TECNICA_EDITADA: 'Área técnica editada',
  AREA_TECNICA_ACTIVADA: 'Área técnica activada',
  AREA_TECNICA_DESACTIVADA: 'Área técnica desactivada',
  ESPECIALIDAD_CREADA: 'Especialidad creada',
  ESPECIALIDAD_EDITADA: 'Especialidad editada',
  ESPECIALIDAD_ACTIVADA: 'Especialidad activada',
  ESPECIALIDAD_DESACTIVADA: 'Especialidad desactivada',
  CRITERIO_CREADO: 'Criterio creado',
  CRITERIO_EDITADO: 'Criterio editado',
  CRITERIO_ACTIVADO: 'Criterio activado',
  CRITERIO_DESACTIVADO: 'Criterio desactivado',
  PARAMETRO_CONFIGURACION_CAMBIADO: 'Parámetro de configuración cambiado',
  PRACTICANTE_CREADO: 'Cuenta de practicante creada',
  PRACTICANTE_DATOS_PRACTICA_EDITADOS: 'Datos de la práctica editados',
  PRACTICANTE_CONTRASENA_RESTABLECIDA: 'Contraseña de practicante restablecida',
  PRACTICANTE_ASIGNADO_A_PROYECTO: 'Practicante asignado a un proyecto',
  PRACTICANTE_QUITADO_DE_PROYECTO: 'Practicante quitado de un proyecto',
  PRACTICANTE_FINALIZADO: 'Práctica finalizada',
  PRACTICANTE_REACTIVADO: 'Práctica reactivada',
  SUPERVISOR_CREADO: 'Cuenta de supervisor creada',
  SUPERVISOR_EDITADO: 'Datos del supervisor editados',
  SUPERVISOR_CONTRASENA_RESTABLECIDA: 'Contraseña de supervisor restablecida',
  SUPERVISOR_PROYECTOS_REASIGNADOS: 'Proyectos reasignados',
  SUPERVISOR_DESACTIVADO: 'Supervisor desactivado',
  SUPERVISOR_REACTIVADO: 'Supervisor reactivado',
  PROYECTO_CREADO: 'Proyecto creado',
  PROYECTO_EDITADO: 'Proyecto editado',
  PROYECTO_SUPERVISOR_CAMBIADO: 'Supervisor del proyecto cambiado',
  PROYECTO_REUNION_CAMBIADA: 'Reunión semanal cambiada',
  PROYECTO_REPOSITORIO_CAMBIADO: 'Repositorio cambiado',
  PROYECTO_RAMA_BASE_CAMBIADA: 'Rama base cambiada',
  PROYECTO_ENLACE_AGREGADO: 'Enlace agregado',
  PROYECTO_ENLACE_QUITADO: 'Enlace quitado',
  PROYECTO_ENLACE_EDITADO: 'Enlace editado',
  PROYECTO_PAUSADO: 'Proyecto pausado',
  PROYECTO_REANUDADO: 'Proyecto reanudado',
  PROYECTO_FINALIZADO: 'Proyecto finalizado',
  PROYECTO_REACTIVADO: 'Proyecto reactivado',
  TAREA_CREADA: 'Tarea creada',
  TAREA_EDITADA: 'Tarea editada',
  TAREA_OPCIONES_CAMBIADAS: 'Opciones de la tarea cambiadas',
  TAREA_TOMADA: 'Tarea tomada',
  TAREA_LIBERADA: 'Tarea liberada',
  TAREA_ENVIADA_A_SUPERVISION: 'Tarea enviada a supervisión',
  TAREA_TERMINADA: 'Tarea terminada',
  TAREA_APROBADA: 'Tarea aprobada',
  TAREA_DEVUELTA: 'Tarea devuelta',
  TAREA_REABIERTA: 'Tarea reabierta',
  TAREA_ELIMINADA: 'Tarea eliminada',
  PULL_REQUEST_CREADO: 'Pull Request creado',
  PULL_REQUEST_ESTADO_ACTUALIZADO: 'Estado del Pull Request actualizado',
  PULL_REQUEST_CERRADO_DESDE_EL_SISTEMA: 'Pull Request cerrado desde el sistema',
  PULL_REQUEST_NO_REQUERIDO: 'Pull Request marcado como «No requiere PR»',
  CUENTA_NOMBRE_CAMBIADO: 'Nombre cambiado',
  CUENTA_CORREO_CAMBIADO: 'Correo cambiado',
  CUENTA_CONTRASENA_CAMBIADA: 'Contraseña cambiada',
};

/** Los campos que se registran, con su nombre legible; uno que no esté aquí se muestra con su nombre «humanizado». */
const ETIQUETA_CAMPO: Record<string, string> = {
  estado: 'Estado',
  estado_pr: 'Estado del Pull Request',
  nombre: 'Nombre',
  correo: 'Correo',
  activo: 'Activo',
  responsable: 'Responsable',
  valor: 'Valor',
  minimo: 'Mínimo',
  maximo: 'Máximo',
  reunion: 'Reunión semanal',
  proyecto: 'Proyecto',
  especialidad: 'Especialidad',
  area: 'Área',
  url_pull_request: 'Enlace del Pull Request',
  titulo: 'Título',
  requiere_pr: 'Requiere Pull Request',
  peso: 'Peso',
  fecha_fin_real: 'Fecha de fin real',
  enlace: 'Enlace',
  tipo: 'Tipo',
  supervisor: 'Supervisor',
  requiere_supervision: 'Requiere supervisión',
  rama_base: 'Rama base',
  puntaje_total: 'Puntaje total',
  obligatorio: 'Obligatorio',
  fecha_limite: 'Fecha límite',
  url: 'Enlace',
  repositorio_url: 'Repositorio',
  rama_origen: 'Rama de origen',
  proyectos: 'Proyectos',
  limite: 'Límite',
  fecha_ingreso: 'Fecha de ingreso',
  fecha_fin_prevista: 'Fecha de fin prevista',
};

const ETIQUETA_ESTADO_PR: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CREADO: 'Creado',
  CON_CONFLICTOS: 'Con conflictos',
  FUSIONADO: 'Fusionado',
  CERRADO: 'Cerrado',
};

function humanizar(campo: string): string {
  const texto = campo.replaceAll('_', ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const SIN_VALOR = '—';

function textoDeValor(campo: string, valor: string | null): string {
  if (valor === null || valor === '') return SIN_VALOR;
  if (campo === 'estado_pr') return ETIQUETA_ESTADO_PR[valor] ?? valor;
  if (campo === 'estado') return etiquetaEstado(valor);
  if (valor === 'true') return 'Sí';
  if (valor === 'false') return 'No';
  return valor;
}

/** «7 nov 2026, 14:30» en hora de Perú (UTC−5, sin horario de verano). */
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function fechaHoraPeru(instante: string): string {
  return FORMATO_FECHA_HORA.format(new Date(instante)).replace(/\./g, '').replace(' de ', ' ');
}

export interface CambioParaVista {
  campo: string;
  anterior: string;
  nuevo: string;
}

export interface FilaHistorial {
  id: Id;
  fechaTexto: string;
  /** «Nombre (Rol)», «Sistema» o «Usuario desconocido». */
  autor: string;
  /** Para el filtro y la prueba: la persona autora, o `null` si es el Sistema. */
  idAutor: Id | null;
  categoria: CategoriaEvento;
  categoriaTexto: string;
  accion: string;
  /** La etiqueta del elemento que se guardó con el evento: sigue legible aunque el elemento ya no exista. */
  elementoEtiqueta: string;
  elementoTipoTexto: string;
  elemento: { tipo: TipoElemento; id: Id };
  /** El enlace al detalle; `null` si ese tipo no tiene detalle o el elemento ya no existe. */
  rutaElemento: string | null;
  idProyecto: Id | null;
  /** «En progreso → Esperando supervisión», o «N campos modificados»; `null` si no cambió ningún campo. */
  resumen: string | null;
  cambios: CambioParaVista[];
  nota: string | null;
}

export interface HistorialParaVista {
  filas: FilaHistorial[];
}

/** El resumen del cambio que ve la tabla: el del primer campo, y cuántos más si hay varios. */
function resumenDeCambios(cambios: CambioParaVista[]): string | null {
  const primero = cambios[0];
  if (primero === undefined) return null;
  const base = `${primero.anterior} → ${primero.nuevo}`;
  if (cambios.length === 1) return primero.campo === 'Estado' ? base : `${primero.campo}: ${base}`;
  return `${cambios.length} campos modificados`;
}

/**
 * Los eventos de `listarHistorial` a las filas de la tabla y al panel de detalle. Solo presenta: conserva el orden
 * (del más reciente al más antiguo), no filtra y no guarda nada. El historial es de solo lectura.
 */
export function aHistorial(eventos: readonly EventoDeHistorial[]): HistorialParaVista {
  return {
    filas: eventos.map((item) => {
      const { evento } = item;
      const cambios = evento.cambios.map((c) => ({
        campo: ETIQUETA_CAMPO[c.campo] ?? humanizar(c.campo),
        anterior: textoDeValor(c.campo, c.valor_anterior),
        nuevo: textoDeValor(c.campo, c.valor_nuevo),
      }));
      return {
        id: evento.id,
        fechaTexto: fechaHoraPeru(evento.fecha),
        autor: etiquetaAutor(item),
        idAutor: evento.autor.tipo === 'USUARIO' ? evento.autor.id_usuario : null,
        categoria: item.categoria,
        categoriaTexto: ETIQUETA_CATEGORIA[item.categoria],
        accion: ETIQUETA_ACCION[evento.tipo_accion],
        elementoEtiqueta: evento.elemento.etiqueta,
        elementoTipoTexto: ETIQUETA_TIPO_ELEMENTO[evento.elemento.tipo],
        elemento: { tipo: evento.elemento.tipo, id: evento.elemento.id },
        rutaElemento: rutaDelElemento(evento.elemento.tipo, evento.elemento.id),
        idProyecto: evento.id_proyecto,
        resumen: resumenDeCambios(cambios),
        cambios,
        nota: evento.nota,
      };
    }),
  };
}
