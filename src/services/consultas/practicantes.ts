/**
 * Consultas de practicantes (Fase 2, paso 11C; propuesta §5.2 y §9.1.2).
 *
 * Dos vistas, **dos tipos distintos**: el Administrador ve toda la gestión de la práctica; el Supervisor ve
 * solo a las personas de sus proyectos y su tipo de retorno **no tiene** el área técnica ni la postulación
 * de origen (§9.1.2), así que no puede filtrarlos por descuido. El Practicante no tiene estas vistas: sus
 * compañeros llegan por `obtenerEquipoProyecto` con los campos que le corresponden.
 *
 * Ninguna consulta escribe en `data/`.
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  cargaDePracticante,
  hoyEn,
  ordenarTerminadas,
  proyectosDeCarga,
  puede,
  situacionFinPractica,
  situacionPracticante,
  ultimaActividadDeUsuario,
  type Fecha,
  type FechaHora,
  type Id,
  type Practicante,
  type Proyecto,
  type SituacionFinPractica,
  type SituacionPracticante,
  type Tarea,
  type Usuario,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { fallo, validarEntrada, type Resultado } from '../resultado';
import { asignacionesDe, esquemaId } from '../tareas/comun';
import { ejecutarConsulta } from '../transaccional';
import {
  aTareaConProyecto,
  cargarActorActivo,
  conAutor,
  esquemaEntradaActor,
  exigirPermisoDeModulo,
  exigirRol,
  nombreDeCatalogo,
  resumenDeProyecto,
  type EntradaConActor,
  type EventoConAutor,
  type ProyectoResumen,
  type TareaConProyecto,
} from './comun';

// ── Piezas compartidas ───────────────────────────────────────────────────────────────────────

export interface CatalogoNombre {
  id: Id;
  nombre: string;
}

/** Cuánto falta (o cuánto pasó) para la fecha de fin de la práctica, según el aviso de Configuración. */
export interface FinDePractica {
  situacion: SituacionFinPractica;
  /** Negativo si ya venció. */
  dias_restantes: number;
}

/** El aviso previo vigente (días); `null` si el parámetro falta o no es un número (dato roto). */
function avisoDias(datos: Pick<DatosAlmacen, 'parametros'>): number | null {
  const valor = datos.parametros.find((p) => p.clave === 'PRACTICA_AVISO_FIN_DIAS')?.valor;
  return valor?.tipo === 'numero' ? valor.valor : null;
}

function finDe(fechaFin: Fecha, ahora: FechaHora, aviso: number): FinDePractica | null {
  const r = situacionFinPractica(fechaFin, ahora, aviso);
  return r.ok ? { situacion: r.situacion, dias_restantes: r.dias_restantes } : null;
}

/** Los practicantes con su cuenta, en el orden del almacén. */
export function practicantesConCuenta(
  datos: Pick<DatosAlmacen, 'practicantes' | 'usuarios'>,
): Array<{ detalle: Practicante; usuario: Usuario }> {
  return datos.practicantes.flatMap((detalle) => {
    const usuario = datos.usuarios.find((u) => u.id === detalle.id_usuario);
    return usuario === undefined || usuario.rol !== 'PRACTICANTE' ? [] : [{ detalle, usuario }];
  });
}

const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, 'es');

// ── Administrador: listado ───────────────────────────────────────────────────────────────────

export interface PracticanteListado {
  id: Id;
  nombre: string;
  correo: string;
  area: CatalogoNombre | null;
  especialidad: CatalogoNombre | null;
  /** `estado` (Activo/Finalizado) y `sin_proyecto`: las pestañas de §5.2. */
  situacion: SituacionPracticante;
  /** Proyectos vigentes que no están finalizados (los que cuentan para la carga). */
  proyectos_activos: ProyectoResumen[];
  /** Tareas en progreso en esos proyectos. */
  carga: number;
  /** Su última acción registrada; `null` si nunca hizo una. */
  ultima_actividad: FechaHora | null;
  fecha_ingreso: Fecha;
  fecha_fin_prevista: Fecha;
  /** `null` para quien ya finalizó la práctica. */
  fin: FinDePractica | null;
}

export interface ListadoPracticantes {
  practicantes: PracticanteListado[];
  /** Activos incluye a los «Sin proyecto»; Finalizados son los de acceso bloqueado. */
  contadores: { TODOS: number; ACTIVOS: number; SIN_PROYECTO: number; FINALIZADOS: number };
}

/** El Administrador ve a todos los practicantes (`VER_DIRECTORIO_PRACTICANTES`). */
export function listarPracticantes(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ListadoPracticantes>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const modulo = exigirPermisoDeModulo(actor.valor, 'VER_DIRECTORIO_PRACTICANTES');
    if (!modulo.ok) return modulo;
    const aviso = avisoDias(datos);
    if (aviso === null) return fallo('CONFIGURACION_INVALIDA');

    const practicantes = practicantesConCuenta(datos)
      .map(({ detalle, usuario }): PracticanteListado => {
        const situacion = situacionPracticante(usuario, datos.asignaciones, datos.proyectos);
        const idsActivos = proyectosDeCarga(usuario.id, datos.asignaciones, datos.proyectos);
        return {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          area: nombreDeCatalogo(datos.areas_tecnicas, detalle.id_area_tecnica),
          especialidad: nombreDeCatalogo(datos.especialidades, detalle.id_especialidad),
          situacion,
          proyectos_activos: datos.proyectos
            .filter((p) => idsActivos.includes(p.id))
            .map(resumenDeProyecto),
          carga: cargaDePracticante(usuario.id, datos.tareas, idsActivos),
          ultima_actividad: ultimaActividadDeUsuario(usuario.id, datos.historial),
          fecha_ingreso: detalle.fecha_ingreso,
          fecha_fin_prevista: detalle.fecha_fin_prevista,
          fin:
            situacion.estado === 'FINALIZADO'
              ? null
              : finDe(detalle.fecha_fin_prevista, marca.ahora, aviso),
        };
      })
      .sort(porNombre);

    return {
      ok: true,
      valor: {
        practicantes,
        contadores: {
          TODOS: practicantes.length,
          ACTIVOS: practicantes.filter((p) => p.situacion.estado === 'ACTIVO').length,
          SIN_PROYECTO: practicantes.filter((p) => p.situacion.sin_proyecto).length,
          FINALIZADOS: practicantes.filter((p) => p.situacion.estado === 'FINALIZADO').length,
        },
      },
    };
  });
}

// ── Administrador: detalle ───────────────────────────────────────────────────────────────────

export interface ParticipacionEnProyectoDePracticante {
  proyecto: ProyectoResumen;
  estado_proyecto: Proyecto['estado'];
  fecha_alta: Fecha;
  /** `null` mientras la asignación sigue vigente. */
  fecha_baja: Fecha | null;
}

export interface PracticanteDetalle {
  /** Datos personales: el Administrador solo los lee, los edita cada persona (§5.2). */
  datos_personales: {
    id: Id;
    nombre: string;
    correo: string;
    celular: string;
    discord: string | null;
    cuenta_github: string | null;
    disponibilidad_horaria: number | null;
    fecha_alta: FechaHora;
  };
  practica: {
    area: CatalogoNombre | null;
    especialidad: CatalogoNombre | null;
    fecha_ingreso: Fecha;
    fecha_fin_prevista: Fecha;
    fin: FinDePractica | null;
    situacion: SituacionPracticante;
  };
  /** Asignación vigente en un proyecto que no está finalizado. */
  proyectos_actuales: ParticipacionEnProyectoDePracticante[];
  /** Con baja, o vigente en un proyecto finalizado. */
  proyectos_anteriores: ParticipacionEnProyectoDePracticante[];
  /** En progreso o esperando supervisión. */
  tareas_actuales: TareaConProyecto[];
  /** Terminadas, de la más reciente a la más antigua. */
  tareas_completadas: TareaConProyecto[];
  /** Su actividad y lo que se hizo sobre su cuenta, del más reciente al más antiguo. */
  eventos: EventoConAutor[];
  /** Postulación de origen (solo la ve el Administrador). */
  postulacion_origen: { id: Id; nombre: string } | null;
}

const esquemaEntradaPracticante = z.object({ idActor: esquemaId, idPracticante: esquemaId });
export type EntradaConPracticante = z.input<typeof esquemaEntradaPracticante>;

function participaciones(
  datos: Pick<DatosAlmacen, 'asignaciones' | 'proyectos'>,
  idPracticante: Id,
  soloProyectos?: ReadonlySet<Id>,
) {
  return datos.asignaciones
    .filter(
      (a) =>
        a.id_practicante === idPracticante &&
        (soloProyectos === undefined || soloProyectos.has(a.id_proyecto)),
    )
    .flatMap((a) => {
      const proyecto = datos.proyectos.find((p) => p.id === a.id_proyecto);
      return proyecto === undefined ? [] : [{ asignacion: a, proyecto }];
    })
    .sort((x, y) => y.asignacion.fecha_alta.localeCompare(x.asignacion.fecha_alta));
}

const aParticipacion = ({
  asignacion,
  proyecto,
}: {
  asignacion: { fecha_alta: Fecha; fecha_baja: Fecha | null };
  proyecto: Proyecto;
}): ParticipacionEnProyectoDePracticante => ({
  proyecto: resumenDeProyecto(proyecto),
  estado_proyecto: proyecto.estado,
  fecha_alta: asignacion.fecha_alta,
  fecha_baja: asignacion.fecha_baja,
});

/** El Administrador abre a un practicante (`VER_DIRECTORIO_PRACTICANTES`); otra cuenta es `NO_ENCONTRADO`. */
export function obtenerPracticante(
  entrada: EntradaConPracticante,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<PracticanteDetalle>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaPracticante, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const modulo = exigirPermisoDeModulo(actor.valor, 'VER_DIRECTORIO_PRACTICANTES');
    if (!modulo.ok) return modulo;
    const aviso = avisoDias(datos);
    if (aviso === null) return fallo('CONFIGURACION_INVALIDA');

    const encontrado = practicantesConCuenta(datos).find(
      (p) => p.usuario.id === valida.valor.idPracticante,
    );
    if (encontrado === undefined) return fallo('NO_ENCONTRADO');
    const { detalle, usuario } = encontrado;

    const situacion = situacionPracticante(usuario, datos.asignaciones, datos.proyectos);
    const hoy = hoyEn(marca.ahora);
    const todas = participaciones(datos, usuario.id);
    const esActual = ({ asignacion, proyecto }: (typeof todas)[number]) =>
      asignacion.fecha_baja === null && proyecto.estado !== 'FINALIZADO';

    const suyas = datos.tareas.filter((t) => t.id_practicante === usuario.id);
    const conProyecto = (tarea: Tarea): TareaConProyecto[] => {
      const proyecto = datos.proyectos.find((p) => p.id === tarea.id_proyecto);
      return proyecto === undefined
        ? []
        : [aTareaConProyecto(datos, actor.valor, proyecto, tarea, hoy)];
    };

    const postulante = datos.postulantes.find((p) => p.id === detalle.id_postulante);
    return {
      ok: true,
      valor: {
        datos_personales: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          celular: usuario.celular,
          discord: detalle.discord,
          cuenta_github: detalle.cuenta_github,
          disponibilidad_horaria: detalle.disponibilidad_horaria,
          fecha_alta: usuario.fecha_alta,
        },
        practica: {
          area: nombreDeCatalogo(datos.areas_tecnicas, detalle.id_area_tecnica),
          especialidad: nombreDeCatalogo(datos.especialidades, detalle.id_especialidad),
          fecha_ingreso: detalle.fecha_ingreso,
          fecha_fin_prevista: detalle.fecha_fin_prevista,
          fin:
            situacion.estado === 'FINALIZADO'
              ? null
              : finDe(detalle.fecha_fin_prevista, marca.ahora, aviso),
          situacion,
        },
        proyectos_actuales: todas.filter(esActual).map(aParticipacion),
        proyectos_anteriores: todas.filter((p) => !esActual(p)).map(aParticipacion),
        tareas_actuales: suyas
          .filter((t) => t.estado === 'EN_PROGRESO' || t.estado === 'ESPERANDO_SUPERVISION')
          .sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite) || a.numero - b.numero)
          .flatMap(conProyecto),
        tareas_completadas: ordenarTerminadas(suyas).flatMap(conProyecto),
        eventos: conAutor(
          datos.usuarios,
          datos.historial.filter(
            (e) =>
              (e.autor.tipo === 'USUARIO' && e.autor.id_usuario === usuario.id) ||
              (e.elemento.tipo === 'USUARIO' && e.elemento.id === usuario.id),
          ),
        ),
        postulacion_origen:
          postulante === undefined ? null : { id: postulante.id, nombre: postulante.nombre },
      },
    };
  });
}

// ── Supervisor: practicantes a cargo ─────────────────────────────────────────────────────────

/** `ACTIVO`: tiene alguna asignación vigente en un proyecto del Supervisor. `ANTERIOR`: ya salió de todos. */
export type SituacionACargo = 'ACTIVO' | 'ANTERIOR';

export interface ParticipacionACargo {
  proyecto: ProyectoResumen;
  fecha_alta: Fecha;
  fecha_baja: Fecha | null;
}

export interface PracticanteACargoListado {
  id: Id;
  nombre: string;
  correo: string;
  /** Solo el nombre de la especialidad: el Supervisor no ve el área técnica. */
  especialidad: string | null;
  situacion: SituacionACargo;
  /** Solo sus proyectos, uno por cada asignación en ellos. */
  proyectos: ParticipacionACargo[];
  /** Tareas en progreso **en los proyectos de este Supervisor**. */
  carga: number;
  /** Tareas suyas esperando la revisión de este Supervisor. */
  esperando_mi_revision: number;
  /** Su última acción en los proyectos de este Supervisor. */
  ultima_actividad: FechaHora | null;
}

export interface ListadoPracticantesACargo {
  /** Una fila por persona, aunque esté en dos proyectos del Supervisor. */
  practicantes: PracticanteACargoListado[];
  contadores: { ACTIVOS: number; ANTERIORES: number };
}

/** Los proyectos del Supervisor (`VER_PRACTICANTES`), en el orden del almacén. */
export function proyectosDelSupervisor(
  datos: Pick<DatosAlmacen, 'proyectos' | 'asignaciones'>,
  actor: Usuario,
): Proyecto[] {
  return datos.proyectos.filter(
    (proyecto) =>
      puede(actor, 'VER_PRACTICANTES', { proyecto, asignaciones: asignacionesDe(datos, actor.id) })
        .permitido,
  );
}

function filaACargo(
  datos: DatosAlmacen,
  proyectos: readonly Proyecto[],
  usuario: Usuario,
  detalle: Practicante,
): PracticanteACargoListado | null {
  const ids = new Set(proyectos.map((p) => p.id));
  const propias = participaciones(datos, usuario.id, ids);
  if (propias.length === 0) return null;

  const eventos = datos.historial.filter((e) => e.id_proyecto !== null && ids.has(e.id_proyecto));
  const activa = propias.some(({ asignacion }) => asignacion.fecha_baja === null);
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    especialidad: nombreDeCatalogo(datos.especialidades, detalle.id_especialidad)?.nombre ?? null,
    situacion: usuario.estado === 'ACTIVO' && activa ? 'ACTIVO' : 'ANTERIOR',
    proyectos: propias.map(({ asignacion, proyecto }) => ({
      proyecto: resumenDeProyecto(proyecto),
      fecha_alta: asignacion.fecha_alta,
      fecha_baja: asignacion.fecha_baja,
    })),
    carga: cargaDePracticante(
      usuario.id,
      datos.tareas,
      proyectosDeCarga(usuario.id, datos.asignaciones, proyectos),
    ),
    esperando_mi_revision: datos.tareas.filter(
      (t) =>
        t.id_practicante === usuario.id &&
        t.estado === 'ESPERANDO_SUPERVISION' &&
        ids.has(t.id_proyecto),
    ).length,
    ultima_actividad: ultimaActividadDeUsuario(usuario.id, eventos),
  };
}

/** Las personas de los proyectos de `actor` (Supervisor), una fila por persona y por nombre. */
export function practicantesACargoDe(
  datos: DatosAlmacen,
  actor: Usuario,
): PracticanteACargoListado[] {
  const proyectos = proyectosDelSupervisor(datos, actor);
  return practicantesConCuenta(datos)
    .flatMap(({ detalle, usuario }) => filaACargo(datos, proyectos, usuario, detalle) ?? [])
    .sort(porNombre);
}

/**
 * Solo Supervisor (§9.1.2): las personas con una asignación, vigente o con baja, en alguno de sus proyectos.
 * Sin ninguna, éxito con la lista vacía. No trae el área técnica ni la postulación de origen.
 */
export function listarPracticantesACargo(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ListadoPracticantesACargo>> {
  return ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const rol = exigirRol(actor.valor, ['SUPERVISOR']);
    if (!rol.ok) return rol;

    const practicantes = practicantesACargoDe(datos, actor.valor);

    return {
      ok: true,
      valor: {
        practicantes,
        contadores: {
          ACTIVOS: practicantes.filter((p) => p.situacion === 'ACTIVO').length,
          ANTERIORES: practicantes.filter((p) => p.situacion === 'ANTERIOR').length,
        },
      },
    };
  });
}

export interface PracticanteACargoDetalle {
  id: Id;
  nombre: string;
  correo: string;
  celular: string;
  discord: string | null;
  cuenta_github: string | null;
  disponibilidad_horaria: number | null;
  especialidad: string | null;
  situacion: SituacionACargo;
  /** La fecha de fin de la práctica es el único dato de gestión que ve el Supervisor (§9.1.2). */
  fecha_fin_prevista: Fecha;
  proyectos: ParticipacionACargo[];
  /** En progreso o esperando supervisión, solo en sus proyectos. */
  tareas_actuales: TareaConProyecto[];
  tareas_completadas: TareaConProyecto[];
  /** Lo que esa persona hizo en los proyectos del Supervisor, del más reciente al más antiguo. */
  eventos: EventoConAutor[];
}

/**
 * Solo Supervisor: el detalle de una persona de sus proyectos, de solo lectura. Una cuenta que no es de un
 * practicante es `NO_ENCONTRADO`; un practicante sin asignación en sus proyectos, `FUERA_DE_ALCANCE`.
 */
export function obtenerPracticanteACargo(
  entrada: EntradaConPracticante,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<PracticanteACargoDetalle>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaPracticante, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const rol = exigirRol(actor.valor, ['SUPERVISOR']);
    if (!rol.ok) return rol;

    const encontrado = practicantesConCuenta(datos).find(
      (p) => p.usuario.id === valida.valor.idPracticante,
    );
    if (encontrado === undefined) return fallo('NO_ENCONTRADO');
    const { detalle, usuario } = encontrado;

    const proyectos = proyectosDelSupervisor(datos, actor.valor);
    const fila = filaACargo(datos, proyectos, usuario, detalle);
    if (fila === null) return fallo('FUERA_DE_ALCANCE');

    const ids = new Set(proyectos.map((p) => p.id));
    const hoy = hoyEn(marca.ahora);
    // Solo cuentan las tareas de sus proyectos: `conProyecto` descarta las de cualquier otro.
    const suyas = datos.tareas.filter((t) => t.id_practicante === usuario.id);
    const conProyecto = (tarea: Tarea): TareaConProyecto[] => {
      const proyecto = proyectos.find((p) => p.id === tarea.id_proyecto);
      return proyecto === undefined
        ? []
        : [aTareaConProyecto(datos, actor.valor, proyecto, tarea, hoy)];
    };

    return {
      ok: true,
      valor: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        celular: usuario.celular,
        discord: detalle.discord,
        cuenta_github: detalle.cuenta_github,
        disponibilidad_horaria: detalle.disponibilidad_horaria,
        especialidad: fila.especialidad,
        situacion: fila.situacion,
        fecha_fin_prevista: detalle.fecha_fin_prevista,
        proyectos: fila.proyectos,
        tareas_actuales: suyas
          .filter((t) => t.estado === 'EN_PROGRESO' || t.estado === 'ESPERANDO_SUPERVISION')
          .sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite) || a.numero - b.numero)
          .flatMap(conProyecto),
        tareas_completadas: ordenarTerminadas(suyas).flatMap(conProyecto),
        eventos: conAutor(
          datos.usuarios,
          datos.historial.filter(
            (e) =>
              e.id_proyecto !== null &&
              ids.has(e.id_proyecto) &&
              e.autor.tipo === 'USUARIO' &&
              e.autor.id_usuario === usuario.id,
          ),
        ),
      },
    };
  });
}
