/**
 * Consultas de proyectos (Fase 2, paso 11A; propuesta §5.4, §6.8, §9.1.1 y §9.2.1).
 *
 * Alcance (lo decide `puede()` con cada proyecto, no la pantalla):
 *   - Administrador: todos los proyectos.
 *   - Supervisor: los suyos.
 *   - Practicante: aquellos con asignación vigente y no FINALIZADOS; los demás en los que estuvo
 *     son «anteriores» y solo ofrecen un resumen mínimo.
 *
 * Ninguna consulta escribe en `data/`. Los textos de interfaz («Sin definir», «Ya no participas»)
 * los pone la pantalla; aquí llegan los datos y los códigos.
 */

import type { DatosAlmacen } from '@/data';
import {
  ESTADOS_PROYECTO,
  ESTADOS_TAREA,
  avanceProyecto,
  cargaDePracticante,
  finalizarProyecto as reglaFinalizarProyecto,
  hoyEn,
  ordenarTerminadas,
  proximaReunion,
  proyectosDeCarga,
  puede,
  puedeAsignarPracticante,
  puedeCambiarSupervisor,
  puedePausarProyecto,
  puedeQuitarPracticante,
  puedeReactivarProyecto,
  puedeReanudarProyecto,
  terminadasRecientes,
  ultimaActividadDeProyecto,
  type Asignacion,
  type EstadoProyecto,
  type EstadoTarea,
  type Fecha,
  type FechaHora,
  type DiaSemana,
  type Hora,
  type Id,
  type Proporcion,
  type Proyecto,
  type Usuario,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { validarEntrada, type Resultado } from '../resultado';
import { ejecutarConsulta } from '../transaccional';
import { practicantesConCuenta } from './practicantes';
import {
  aTareaDeTablero,
  cargarActorActivo,
  cargarProyectoConPermiso,
  conAutor,
  esquemaEntradaActor,
  esquemaEntradaProyecto,
  exigirRol,
  nombreDe,
  personaDe,
  proyectosVisibles,
  type EntradaConActor,
  type EntradaConProyecto,
  type EventoConAutor,
  type PersonaResumen,
  type TareaDeTablero,
} from './comun';

/** Cuántos eventos trae la «actividad reciente» del Resumen. */
export const ACTIVIDAD_RECIENTE_MAXIMA = 10;

// ── Piezas compartidas ───────────────────────────────────────────────────────────────────────

export interface ReunionDeProyecto {
  dia_reunion: DiaSemana | null;
  hora_reunion: Hora | null;
  /** Próxima ocurrencia (instante UTC); `null` = «Sin definir». */
  proxima: FechaHora | null;
}

export function reunionDe(proyecto: Proyecto, ahora: FechaHora): ReunionDeProyecto {
  return {
    dia_reunion: proyecto.dia_reunion,
    hora_reunion: proyecto.hora_reunion,
    proxima: proximaReunion(proyecto, ahora),
  };
}

const vigente = (a: Asignacion) => a.fecha_baja === null;

/** Asignaciones vigentes del proyecto cuyas personas siguen ACTIVAS. */
export function asignacionesActivas(
  datos: Pick<DatosAlmacen, 'asignaciones' | 'usuarios'>,
  idProyecto: Id,
): Asignacion[] {
  return datos.asignaciones.filter(
    (a) =>
      a.id_proyecto === idProyecto &&
      vigente(a) &&
      datos.usuarios.find((u) => u.id === a.id_practicante)?.estado === 'ACTIVO',
  );
}

function especialidadDe(
  datos: Pick<DatosAlmacen, 'practicantes' | 'especialidades'>,
  idPracticante: Id,
): string | null {
  const practicante = datos.practicantes.find((p) => p.id_usuario === idPracticante);
  return datos.especialidades.find((e) => e.id === practicante?.id_especialidad)?.nombre ?? null;
}

const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, 'es');

// ── Listado del Administrador y el Supervisor ────────────────────────────────────────────────

export interface ProyectoListado {
  id: Id;
  nombre: string;
  codigo: string;
  estado: EstadoProyecto;
  supervisor: PersonaResumen;
  practicantes_activos: number;
  /** Tareas terminadas sobre el total (sin las eliminadas); `null` si no hay tareas. */
  avance: Proporcion | null;
  tareas_esperando_supervision: number;
  reunion: ReunionDeProyecto;
  ultima_actividad: FechaHora | null;
}

export interface ListadoProyectos {
  proyectos: ProyectoListado[];
  /** Para las pestañas: Activos, En pausa, Finalizados y Todos. */
  contadores: Record<EstadoProyecto | 'TODOS', number>;
  /** ¿Quien consulta puede crear proyectos? Lo decide `puede('CREAR_PROYECTO')` (solo el Administrador). */
  puede_crear: boolean;
  /**
   * Los supervisores a quienes se puede asignar un proyecto nuevo («siempre con un supervisor activo», §5.4), por
   * nombre. Vacío si quien consulta no puede crear proyectos.
   */
  supervisores_disponibles: PersonaResumen[];
}

/**
 * Administrador: todos los proyectos. Supervisor: los suyos (sin ninguno, éxito con lista vacía). El
 * Practicante usa `listarMisProyectos`.
 */
export function listarProyectos(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ListadoProyectos>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const rol = exigirRol(actor.valor, ['ADMINISTRADOR', 'SUPERVISOR']);
    if (!rol.ok) return rol;

    const proyectos = proyectosVisibles(datos, actor.valor).map((p): ProyectoListado => ({
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo,
      estado: p.estado,
      supervisor: personaDe(datos.usuarios, p.id_supervisor),
      practicantes_activos: asignacionesActivas(datos, p.id).length,
      avance: avanceProyecto(p.id, datos.tareas),
      tareas_esperando_supervision: datos.tareas.filter(
        (t) => t.id_proyecto === p.id && t.estado === 'ESPERANDO_SUPERVISION',
      ).length,
      reunion: reunionDe(p, marca.ahora),
      ultima_actividad: ultimaActividadDeProyecto(p.id, datos.historial),
    }));

    const contadores = { TODOS: proyectos.length } as ListadoProyectos['contadores'];
    for (const estado of ESTADOS_PROYECTO) {
      contadores[estado] = proyectos.filter((p) => p.estado === estado).length;
    }
    const puedeCrear = puede(actor.valor, 'CREAR_PROYECTO', {}).permitido;
    const supervisoresDisponibles = puedeCrear
      ? datos.usuarios
          .filter((u) => u.rol === 'SUPERVISOR' && u.estado === 'ACTIVO')
          .map((u): PersonaResumen => ({ id: u.id, nombre: u.nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      : [];
    return {
      ok: true,
      valor: {
        proyectos,
        contadores,
        puede_crear: puedeCrear,
        supervisores_disponibles: supervisoresDisponibles,
      },
    };
  });
}

// ── Listado del Practicante ──────────────────────────────────────────────────────────────────

export interface ProyectoDePracticante {
  id: Id;
  nombre: string;
  codigo: string;
  estado: EstadoProyecto;
  supervisor: PersonaResumen;
  /** Mis tareas en progreso en este proyecto. */
  mi_carga: number;
  /** Tareas DISPONIBLES del proyecto (en un proyecto EN_PAUSA no se pueden tomar). */
  tareas_disponibles: number;
  avance: Proporcion | null;
  reunion: ReunionDeProyecto;
}

/** `YA_NO_PARTICIPAS` si la asignación tiene baja; si no, el proyecto está `FINALIZADO`. */
export type MotivoProyectoAnterior = 'FINALIZADO' | 'YA_NO_PARTICIPAS';

export interface ProyectoAnterior {
  id: Id;
  nombre: string;
  codigo: string;
  motivo: MotivoProyectoAnterior;
  supervisor: PersonaResumen;
  /** Periodo en que participó: alta y baja (o fecha de finalización del proyecto). */
  fecha_alta: Fecha;
  fecha_fin: Fecha | null;
}

export interface MisProyectos {
  vigentes: ProyectoDePracticante[];
  anteriores: ProyectoAnterior[];
}

/** La asignación más reciente de `idPracticante` en `idProyecto`, o `undefined`. */
function ultimaAsignacion(
  asignaciones: readonly Asignacion[],
  idPracticante: Id,
  idProyecto: Id,
): Asignacion | undefined {
  return asignaciones
    .filter((a) => a.id_practicante === idPracticante && a.id_proyecto === idProyecto)
    .sort((a, b) => (a.fecha_alta < b.fecha_alta ? 1 : a.fecha_alta > b.fecha_alta ? -1 : 0))[0];
}

/**
 * Solo Practicante. `vigentes`: asignación vigente en un proyecto no FINALIZADO (`VER_PROYECTO`).
 * `anteriores`: proyectos finalizados o de los que salió, con datos mínimos (sin avance, carga ni
 * reunión, §9.2.1). Un proyecto aparece una sola vez.
 */
export function listarMisProyectos(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<MisProyectos>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const rol = exigirRol(actor.valor, ['PRACTICANTE']);
    if (!rol.ok) return rol;

    const yo = actor.valor;
    const idsVigentes = new Set(proyectosVisibles(datos, yo).map((p) => p.id));

    const vigentes = datos.proyectos
      .filter((p) => idsVigentes.has(p.id))
      .map((p): ProyectoDePracticante => ({
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo,
        estado: p.estado,
        supervisor: personaDe(datos.usuarios, p.id_supervisor),
        mi_carga: cargaDePracticante(yo.id, datos.tareas, [p.id]),
        tareas_disponibles: datos.tareas.filter(
          (t) => t.id_proyecto === p.id && t.estado === 'DISPONIBLE',
        ).length,
        avance: avanceProyecto(p.id, datos.tareas),
        reunion: reunionDe(p, marca.ahora),
      }));

    const anteriores = datos.proyectos
      .filter((p) => !idsVigentes.has(p.id))
      .flatMap((p): ProyectoAnterior[] => {
        const asignacion = ultimaAsignacion(datos.asignaciones, yo.id, p.id);
        if (asignacion === undefined) return [];
        return [
          {
            id: p.id,
            nombre: p.nombre,
            codigo: p.codigo,
            motivo: asignacion.fecha_baja === null ? 'FINALIZADO' : 'YA_NO_PARTICIPAS',
            supervisor: personaDe(datos.usuarios, p.id_supervisor),
            fecha_alta: asignacion.fecha_alta,
            fecha_fin: asignacion.fecha_baja ?? p.fecha_fin_real,
          },
        ];
      });

    return { ok: true, valor: { vigentes, anteriores } };
  });
}

// ── Resumen (obtenerProyecto) ────────────────────────────────────────────────────────────────

export interface DatosDeProyecto {
  id: Id;
  nombre: string;
  codigo: string;
  descripcion: string;
  estado: EstadoProyecto;
  fecha_inicio: Fecha;
  fecha_fin_prevista: Fecha;
  fecha_fin_real: Fecha | null;
  supervisor: PersonaResumen;
  reunion: ReunionDeProyecto;
  repositorio_url: string;
  rama_base: string;
}

export interface EnlaceDeProyecto {
  id: Id;
  nombre: string;
  url: string;
}

function datosDeProyecto(
  datos: Pick<DatosAlmacen, 'usuarios'>,
  p: Proyecto,
  ahora: FechaHora,
): DatosDeProyecto {
  return {
    id: p.id,
    nombre: p.nombre,
    codigo: p.codigo,
    descripcion: p.descripcion,
    estado: p.estado,
    fecha_inicio: p.fecha_inicio,
    fecha_fin_prevista: p.fecha_fin_prevista,
    fecha_fin_real: p.fecha_fin_real,
    supervisor: personaDe(datos.usuarios, p.id_supervisor),
    reunion: reunionDe(p, ahora),
    repositorio_url: p.repositorio_url,
    rama_base: p.rama_base,
  };
}

/**
 * Lo que quien consulta puede hacer con un proyecto (§5.4). Cada una la decide `puede()` de `domain/` y, las de estado y
 * «cambiar supervisor», además las reglas de ciclo de vida. Los datos, la rama base, la reunión y los enlaces valen también
 * con el proyecto FINALIZADO, y el código **no** está entre ellas porque nunca se edita.
 */
export type AccionProyecto =
  | 'EDITAR_DATOS'
  | 'CAMBIAR_RAMA_BASE'
  | 'DEFINIR_REUNION'
  | 'GESTIONAR_ENLACES'
  | 'CAMBIAR_SUPERVISOR'
  | 'PAUSAR'
  | 'REANUDAR'
  | 'FINALIZAR'
  | 'REACTIVAR';

/** Lo que explica los botones de estado (§5.4); todo lo calcula `domain/`, la pantalla no cuenta tareas. */
export interface CicloDeVidaProyecto {
  /** Tareas «Esperando supervisión»: si hay alguna, finalizar está bloqueado. */
  tareas_esperando_supervision: number;
  /** Tareas «En progreso» que se liberarían al finalizar; 0 si finalizar está bloqueado. */
  tareas_a_liberar: number;
  /** El supervisor del proyecto está inactivo: reactivar pide reactivarlo antes. */
  supervisor_inactivo: boolean;
}

/** Resumen para el Administrador y el Supervisor (§5.4, §9.1.1). */
export interface ResumenProyectoGestion {
  vista: 'GESTION';
  /**
   * `EDITAR_DATOS` (nombre, descripción, fechas y repositorio: solo el Administrador), `CAMBIAR_RAMA_BASE`, `DEFINIR_REUNION`
   * y `GESTIONAR_ENLACES` (el Administrador y el Supervisor del proyecto). La pantalla solo ofrece lo que llega aquí.
   */
  acciones: AccionProyecto[];
  ciclo_de_vida: CicloDeVidaProyecto;
  /** A quién se puede cambiar el supervisor (activos y distintos del actual); vacío en un proyecto finalizado. */
  supervisores_destino: PersonaResumen[];
  proyecto: DatosDeProyecto;
  enlaces: EnlaceDeProyecto[];
  avance: Proporcion | null;
  tareas_por_estado: Record<EstadoTarea, number>;
  tareas_vencidas: number;
  /** Los eventos más recientes del proyecto (de todo el equipo). */
  actividad_reciente: EventoConAutor[];
}

/** Resumen para el Practicante (§9.2.1): solo lo suyo, sin actividad ni tareas ajenas. */
export interface ResumenProyectoPracticante {
  vista: 'PRACTICANTE';
  proyecto: DatosDeProyecto;
  enlaces: EnlaceDeProyecto[];
  avance: Proporcion | null;
  /** Mis tareas del proyecto que siguen abiertas (en progreso o esperando supervisión). */
  mis_tareas: TareaDeTablero[];
  /** Los eventos que yo hice en el proyecto. */
  mi_actividad: EventoConAutor[];
}

export type ResumenProyecto = ResumenProyectoGestion | ResumenProyectoPracticante;

/**
 * El Resumen del proyecto (`VER_PROYECTO`). Quien consulta recibe la variante de su rol: el Practicante
 * nunca recibe actividad ni conteos del resto del equipo.
 */
export function obtenerProyecto(
  entrada: EntradaConProyecto,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ResumenProyecto>> {
  return ejecutarConsulta<ResumenProyecto>(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaProyecto, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const encontrado = cargarProyectoConPermiso(
      datos,
      actor.valor,
      valida.valor.idProyecto,
      'VER_PROYECTO',
    );
    if (!encontrado.ok) return encontrado;
    const proyecto = encontrado.valor;
    const yo = actor.valor;

    const hoy = hoyEn(marca.ahora);
    const tareas = datos.tareas.filter((t) => t.id_proyecto === proyecto.id);
    const enlaces = datos.enlaces_proyecto
      .filter((e) => e.id_proyecto === proyecto.id)
      .map((e): EnlaceDeProyecto => ({ id: e.id, nombre: e.nombre, url: e.url }));
    const eventos = datos.historial.filter((e) => e.id_proyecto === proyecto.id);
    const base = {
      proyecto: datosDeProyecto(datos, proyecto, marca.ahora),
      enlaces,
      avance: avanceProyecto(proyecto.id, datos.tareas),
    };

    if (yo.rol === 'PRACTICANTE') {
      const mias = tareas
        .filter((t) => t.id_practicante === yo.id && t.estado !== 'TERMINADA')
        .sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite) || a.numero - b.numero)
        .map((t) => aTareaDeTablero(datos, yo, proyecto, t, hoy));
      const mios = eventos.filter(
        (e) => e.autor.tipo === 'USUARIO' && e.autor.id_usuario === yo.id,
      );
      return {
        ok: true,
        valor: {
          vista: 'PRACTICANTE',
          ...base,
          mis_tareas: mias,
          mi_actividad: conAutor(datos.usuarios, mios).slice(0, ACTIVIDAD_RECIENTE_MAXIMA),
        },
      };
    }

    const tareas_por_estado = Object.fromEntries(
      ESTADOS_TAREA.map((estado) => [estado, tareas.filter((t) => t.estado === estado).length]),
    ) as Record<EstadoTarea, number>;
    // Las reglas de ciclo de vida dicen si se puede y, si no, por qué: finalizar con tareas esperando supervisión y
    // reactivar con el supervisor inactivo se ofrecen igual, para que la pantalla explique el bloqueo.
    const finalizar = reglaFinalizarProyecto(yo, proyecto, datos.tareas, marca.ahora);
    const bloqueoFinalizar = !finalizar.ok && finalizar.codigo === 'TAREAS_ESPERANDO_SUPERVISION';
    const reactivar = puedeReactivarProyecto(
      yo,
      proyecto,
      datos.usuarios.find((u) => u.id === proyecto.id_supervisor),
    );
    const bloqueoReactivar =
      !reactivar.ok && reactivar.codigo === 'SUPERVISOR_DEL_PROYECTO_INACTIVO';
    const destinos = datos.usuarios
      .filter((u) => u.rol === 'SUPERVISOR' && puedeCambiarSupervisor(yo, proyecto, u).ok)
      .map((u): PersonaResumen => ({ id: u.id, nombre: u.nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const acciones: AccionProyecto[] = [
      ...(puede(yo, 'EDITAR_DATOS_PROYECTO', { proyecto }).permitido
        ? (['EDITAR_DATOS'] as const)
        : []),
      ...(puede(yo, 'CAMBIAR_RAMA_BASE', { proyecto }).permitido
        ? (['CAMBIAR_RAMA_BASE'] as const)
        : []),
      ...(puede(yo, 'DEFINIR_REUNION', { proyecto }).permitido
        ? (['DEFINIR_REUNION'] as const)
        : []),
      ...(puede(yo, 'GESTIONAR_ENLACES', { proyecto }).permitido
        ? (['GESTIONAR_ENLACES'] as const)
        : []),
      ...(destinos.length > 0 ? (['CAMBIAR_SUPERVISOR'] as const) : []),
      ...(puedePausarProyecto(yo, proyecto).ok ? (['PAUSAR'] as const) : []),
      ...(puedeReanudarProyecto(yo, proyecto).ok ? (['REANUDAR'] as const) : []),
      ...(finalizar.ok || bloqueoFinalizar ? (['FINALIZAR'] as const) : []),
      ...(reactivar.ok || bloqueoReactivar ? (['REACTIVAR'] as const) : []),
    ];
    return {
      ok: true,
      valor: {
        vista: 'GESTION',
        acciones,
        ciclo_de_vida: {
          tareas_esperando_supervision:
            !finalizar.ok && finalizar.codigo === 'TAREAS_ESPERANDO_SUPERVISION'
              ? (finalizar.cantidad ?? 0)
              : 0,
          tareas_a_liberar: finalizar.ok ? finalizar.efectos.tareas_a_liberar.length : 0,
          supervisor_inactivo: bloqueoReactivar,
        },
        supervisores_destino: destinos,
        ...base,
        tareas_por_estado,
        tareas_vencidas: tareas.filter((t) => aTareaDeTablero(datos, yo, proyecto, t, hoy).vencida)
          .length,
        actividad_reciente: conAutor(datos.usuarios, eventos).slice(0, ACTIVIDAD_RECIENTE_MAXIMA),
      },
    };
  });
}

// ── Equipo ───────────────────────────────────────────────────────────────────────────────────

export interface MiembroDelEquipo {
  id: Id;
  nombre: string;
  correo: string;
  especialidad: string | null;
  /** Tareas en progreso **en este proyecto**. */
  carga: number;
  fecha_alta: Fecha;
  /** Tareas en progreso que se liberarían al quitarlo; lo calcula `puedeQuitarPracticante`. */
  tareas_a_liberar: number;
  /** ¿Se lo puede quitar ahora? Lo decide `puedeQuitarPracticante` (no, si el proyecto está finalizado). */
  puede_quitar: boolean;
}

export interface ExMiembroDelEquipo {
  id: Id;
  nombre: string;
  fecha_alta: Fecha;
  fecha_baja: Fecha;
}

/** Equipo para el Administrador y el Supervisor: sin área técnica ni postulación de origen. */
export interface EquipoProyectoGestion {
  vista: 'GESTION';
  id_proyecto: Id;
  /** Para explicar por qué no se puede asignar ni quitar en un proyecto finalizado. */
  estado_proyecto: EstadoProyecto;
  /** ¿Hay alguien a quien se pueda asignar ahora? Lo decide `puedeAsignarPracticante` por cada practicante. */
  puede_asignar: boolean;
  activos: MiembroDelEquipo[];
  anteriores: ExMiembroDelEquipo[];
}

export interface CompaneroDeEquipo {
  id: Id;
  nombre: string;
  especialidad: string | null;
  carga: number;
  discord: string | null;
  cuenta_github: string | null;
}

export interface SupervisorDeEquipo extends PersonaResumen {
  discord: string | null;
  cuenta_github: string | null;
}

/** Equipo para el Practicante (§9.2.1): sin correo ni celular de nadie, ni compañeros anteriores. */
export interface EquipoProyectoPracticante {
  vista: 'PRACTICANTE';
  id_proyecto: Id;
  companeros: CompaneroDeEquipo[];
  supervisor: SupervisorDeEquipo;
}

export type EquipoProyecto = EquipoProyectoGestion | EquipoProyectoPracticante;

export function obtenerEquipoProyecto(
  entrada: EntradaConProyecto,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<EquipoProyecto>> {
  return ejecutarConsulta<EquipoProyecto>(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntradaProyecto, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const encontrado = cargarProyectoConPermiso(
      datos,
      actor.valor,
      valida.valor.idProyecto,
      'VER_PRACTICANTES',
    );
    if (!encontrado.ok) return encontrado;
    const proyecto = encontrado.valor;
    const yo = actor.valor;

    const activas = asignacionesActivas(datos, proyecto.id);
    const cargaEnProyecto = (idPracticante: Id) =>
      cargaDePracticante(idPracticante, datos.tareas, [proyecto.id]);
    const usuario = (id: Id): Usuario | undefined => datos.usuarios.find((u) => u.id === id);

    if (yo.rol === 'PRACTICANTE') {
      const companeros = activas
        .filter((a) => a.id_practicante !== yo.id)
        .map((a): CompaneroDeEquipo => {
          const detalle = datos.practicantes.find((p) => p.id_usuario === a.id_practicante);
          return {
            id: a.id_practicante,
            nombre: nombreDe(datos.usuarios, a.id_practicante),
            especialidad: especialidadDe(datos, a.id_practicante),
            carga: cargaEnProyecto(a.id_practicante),
            discord: detalle?.discord ?? null,
            cuenta_github: detalle?.cuenta_github ?? null,
          };
        })
        .sort(porNombre);
      const detalleSupervisor = datos.supervisores.find(
        (s) => s.id_usuario === proyecto.id_supervisor,
      );
      return {
        ok: true,
        valor: {
          vista: 'PRACTICANTE',
          id_proyecto: proyecto.id,
          companeros,
          supervisor: {
            ...personaDe(datos.usuarios, proyecto.id_supervisor),
            discord: detalleSupervisor?.discord ?? null,
            cuenta_github: detalleSupervisor?.cuenta_github ?? null,
          },
        },
      };
    }

    const activos = activas
      .map((a): MiembroDelEquipo => {
        const quitar = puedeQuitarPracticante(
          yo,
          proyecto,
          a.id_practicante,
          datos.asignaciones,
          datos.tareas,
        );
        return {
          id: a.id_practicante,
          nombre: nombreDe(datos.usuarios, a.id_practicante),
          correo: usuario(a.id_practicante)?.correo ?? '',
          especialidad: especialidadDe(datos, a.id_practicante),
          carga: cargaEnProyecto(a.id_practicante),
          fecha_alta: a.fecha_alta,
          tareas_a_liberar: quitar.ok ? quitar.efectos.tareas_a_liberar.length : 0,
          puede_quitar: quitar.ok,
        };
      })
      .sort(porNombre);
    const anteriores = datos.asignaciones
      .filter((a) => a.id_proyecto === proyecto.id && a.fecha_baja !== null)
      .map((a): ExMiembroDelEquipo => ({
        id: a.id_practicante,
        nombre: nombreDe(datos.usuarios, a.id_practicante),
        fecha_alta: a.fecha_alta,
        fecha_baja: a.fecha_baja as Fecha,
      }))
      .sort((a, b) => b.fecha_baja.localeCompare(a.fecha_baja) || porNombre(a, b));
    return {
      ok: true,
      valor: {
        vista: 'GESTION',
        id_proyecto: proyecto.id,
        estado_proyecto: proyecto.estado,
        puede_asignar: practicantesAsignables(datos, yo, proyecto).length > 0,
        activos,
        anteriores,
      },
    };
  });
}

// ── Practicantes asignables ──────────────────────────────────────────────────────────────────

export interface PracticanteAsignable {
  id: Id;
  nombre: string;
  correo: string;
  especialidad: string | null;
  /** Tareas en progreso **en todos sus proyectos**: ayuda a elegir a quién asignar (§5.4). */
  carga: number;
}

export interface PracticantesAsignables {
  id_proyecto: Id;
  practicantes: PracticanteAsignable[];
}

/** Los practicantes a quienes `puedeAsignarPracticante` deja asignar a este proyecto, por nombre. */
function practicantesAsignables(
  datos: DatosAlmacen,
  actor: Usuario,
  proyecto: Proyecto,
): PracticanteAsignable[] {
  return practicantesConCuenta(datos)
    .filter(
      ({ usuario }) => puedeAsignarPracticante(actor, proyecto, usuario, datos.asignaciones).ok,
    )
    .map(({ usuario }): PracticanteAsignable => ({
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      especialidad: especialidadDe(datos, usuario.id),
      carga: cargaDePracticante(
        usuario.id,
        datos.tareas,
        proyectosDeCarga(usuario.id, datos.asignaciones, datos.proyectos),
      ),
    }))
    .sort(porNombre);
}

/**
 * «Asignar practicantes» (§5.4): la lista de practicantes activos con su carga actual, para elegir uno o varios. Solo
 * entran los que la regla de `domain/` deja asignar (activos, sin una asignación vigente en este proyecto); con el
 * proyecto finalizado la lista viene vacía. Solo el Administrador asigna (`ASIGNAR_PRACTICANTE`).
 */
export function listarPracticantesAsignables(
  entrada: EntradaConProyecto,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<PracticantesAsignables>> {
  return ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntradaProyecto, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const encontrado = cargarProyectoConPermiso(
      datos,
      actor.valor,
      valida.valor.idProyecto,
      'VER_PRACTICANTES',
    );
    if (!encontrado.ok) return encontrado;
    return {
      ok: true,
      valor: {
        id_proyecto: encontrado.valor.id,
        practicantes: practicantesAsignables(datos, actor.valor, encontrado.valor),
      },
    };
  });
}

// ── Tablero ──────────────────────────────────────────────────────────────────────────────────

export interface TableroProyecto {
  id_proyecto: Id;
  estado_proyecto: EstadoProyecto;
  /**
   * ¿Quien consulta puede crear una tarea en este proyecto? Lo decide `puede('CREAR_TAREA')` de `domain/` (Administrador
   * o Supervisor del proyecto, y el proyecto no finalizado): la pantalla solo ofrece o no «Nueva tarea».
   */
  puede_crear_tarea: boolean;
  disponibles: TareaDeTablero[];
  en_progreso: TareaDeTablero[];
  esperando_supervision: TareaDeTablero[];
  /** Las 5 terminadas más recientes (§6.8). */
  terminadas: TareaDeTablero[];
  /** Todas las terminadas, para «Ver todas las terminadas». */
  total_terminadas: number;
}

const porNumero = (a: { numero: number }, b: { numero: number }) => a.numero - b.numero;

/** El tablero Kanban del proyecto (`VER_PROYECTO`). El Practicante ve todas las columnas, pero la marca «Devuelta» solo en sus tareas. */
export function obtenerTableroProyecto(
  entrada: EntradaConProyecto,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<TableroProyecto>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaProyecto, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const encontrado = cargarProyectoConPermiso(
      datos,
      actor.valor,
      valida.valor.idProyecto,
      'VER_PROYECTO',
    );
    if (!encontrado.ok) return encontrado;
    const proyecto = encontrado.valor;

    const hoy = hoyEn(marca.ahora);
    const tareas = datos.tareas.filter((t) => t.id_proyecto === proyecto.id);
    const columna = (estado: EstadoTarea) =>
      tareas
        .filter((t) => t.estado === estado)
        .sort(porNumero)
        .map((t) => aTareaDeTablero(datos, actor.valor, proyecto, t, hoy));
    const { recientes, total } = terminadasRecientes(tareas);

    return {
      ok: true,
      valor: {
        id_proyecto: proyecto.id,
        estado_proyecto: proyecto.estado,
        puede_crear_tarea: puede(actor.valor, 'CREAR_TAREA', { proyecto }).permitido,
        disponibles: columna('DISPONIBLE'),
        en_progreso: columna('EN_PROGRESO'),
        esperando_supervision: columna('ESPERANDO_SUPERVISION'),
        terminadas: recientes.map((t) => aTareaDeTablero(datos, actor.valor, proyecto, t, hoy)),
        total_terminadas: total,
      },
    };
  });
}

export interface TerminadasDeProyecto {
  id_proyecto: Id;
  tareas: TareaDeTablero[];
}

/** «Ver todas las terminadas»: el listado completo, de la más reciente a la más antigua. */
export function listarTerminadasDeProyecto(
  entrada: EntradaConProyecto,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<TerminadasDeProyecto>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaProyecto, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const encontrado = cargarProyectoConPermiso(
      datos,
      actor.valor,
      valida.valor.idProyecto,
      'VER_PROYECTO',
    );
    if (!encontrado.ok) return encontrado;
    const proyecto = encontrado.valor;

    const hoy = hoyEn(marca.ahora);
    const tareas = ordenarTerminadas(datos.tareas.filter((t) => t.id_proyecto === proyecto.id)).map(
      (t) => aTareaDeTablero(datos, actor.valor, proyecto, t, hoy),
    );
    return { ok: true, valor: { id_proyecto: proyecto.id, tareas } };
  });
}

// ── Resumen de un proyecto anterior ──────────────────────────────────────────────────────────

export interface ParticipacionEnProyecto {
  fecha_alta: Fecha;
  /** `null` si la asignación sigue vigente (el proyecto está finalizado). */
  fecha_baja: Fecha | null;
  /** Tareas terminadas con esa persona como responsable. */
  tareas_terminadas: number;
}

export interface ResumenProyectoAnterior {
  proyecto: Pick<
    DatosDeProyecto,
    | 'id'
    | 'nombre'
    | 'codigo'
    | 'descripcion'
    | 'estado'
    | 'fecha_inicio'
    | 'fecha_fin_prevista'
    | 'fecha_fin_real'
    | 'supervisor'
  >;
  /** Mi paso por el proyecto; `null` si quien consulta nunca estuvo asignado (Administrador o Supervisor). */
  participacion: ParticipacionEnProyecto | null;
}

/**
 * Datos mínimos de un proyecto en el que estuve (`VER_RESUMEN_PROYECTO_ANTERIOR`): sin tablero,
 * equipo, repositorio, enlaces ni reunión (§9.2.1).
 */
export function obtenerResumenProyectoAnterior(
  entrada: EntradaConProyecto,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ResumenProyectoAnterior>> {
  return ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntradaProyecto, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const encontrado = cargarProyectoConPermiso(
      datos,
      actor.valor,
      valida.valor.idProyecto,
      'VER_RESUMEN_PROYECTO_ANTERIOR',
    );
    if (!encontrado.ok) return encontrado;
    const p = encontrado.valor;

    const asignacion = ultimaAsignacion(datos.asignaciones, actor.valor.id, p.id);
    return {
      ok: true,
      valor: {
        proyecto: {
          id: p.id,
          nombre: p.nombre,
          codigo: p.codigo,
          descripcion: p.descripcion,
          estado: p.estado,
          fecha_inicio: p.fecha_inicio,
          fecha_fin_prevista: p.fecha_fin_prevista,
          fecha_fin_real: p.fecha_fin_real,
          supervisor: personaDe(datos.usuarios, p.id_supervisor),
        },
        participacion:
          asignacion === undefined
            ? null
            : {
                fecha_alta: asignacion.fecha_alta,
                fecha_baja: asignacion.fecha_baja,
                tareas_terminadas: datos.tareas.filter(
                  (t) =>
                    t.id_proyecto === p.id &&
                    t.estado === 'TERMINADA' &&
                    t.id_practicante === actor.valor.id,
                ).length,
              },
      },
    };
  });
}
