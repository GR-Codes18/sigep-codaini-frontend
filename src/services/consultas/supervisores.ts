/**
 * Consultas de supervisores (Fase 2, paso 11C; propuesta §5.3). Solo el Administrador (`VER_SUPERVISORES`).
 *
 * «A cargo» son los proyectos que no están finalizados (activos o en pausa), la misma regla que bloquea
 * desactivar a un supervisor. Los finalizados son sus «proyectos anteriores». Ninguna consulta escribe.
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  diasEsperando,
  desactivarSupervisor as reglaDesactivarSupervisor,
  hoyEn,
  puede,
  puedeCambiarSupervisor,
  reactivarSupervisor as reglaReactivarSupervisor,
  ultimaActividadDeUsuario,
  type EstadoUsuario,
  type Fecha,
  type FechaHora,
  type Id,
  type Proyecto,
  type Supervisor,
  type Usuario,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { ejecutarConsulta } from '../transaccional';
import {
  aTareaConProyecto,
  cargarActorActivo,
  conAutor,
  esquemaEntradaActor,
  exigirPermisoDeModulo,
  resumenDeProyecto,
  type EntradaConActor,
  type EventoConAutor,
  type PersonaResumen,
  type ProyectoResumen,
} from './comun';
import { asignacionesActivas, reunionDe, type ReunionDeProyecto } from './proyectos';
import type { TareaListado } from './tareas';

function supervisoresConCuenta(
  datos: Pick<DatosAlmacen, 'supervisores' | 'usuarios'>,
): Array<{ detalle: Supervisor; usuario: Usuario }> {
  return datos.supervisores.flatMap((detalle) => {
    const usuario = datos.usuarios.find((u) => u.id === detalle.id_usuario);
    return usuario === undefined || usuario.rol !== 'SUPERVISOR' ? [] : [{ detalle, usuario }];
  });
}

const aCargo = (p: Proyecto) => p.estado !== 'FINALIZADO';

/** Personas distintas con una asignación vigente (y ACTIVAS) en alguno de los proyectos. */
function practicantesDe(
  datos: Pick<DatosAlmacen, 'asignaciones' | 'usuarios'>,
  proyectos: Proyecto[],
) {
  return new Set(
    proyectos.flatMap((p) => asignacionesActivas(datos, p.id).map((a) => a.id_practicante)),
  );
}

// ── Listado ──────────────────────────────────────────────────────────────────────────────────

export interface SupervisorListado {
  id: Id;
  nombre: string;
  correo: string;
  estado: EstadoUsuario;
  /** Proyectos activos o en pausa. */
  proyectos_a_cargo: number;
  /** Personas distintas con una asignación vigente en esos proyectos. */
  practicantes_a_cargo: number;
  /** Tareas esperando su supervisión en esos proyectos. */
  tareas_por_revisar: number;
  /** Su última acción registrada; `null` si nunca hizo una. */
  ultima_actividad: FechaHora | null;
}

export interface ListadoSupervisores {
  supervisores: SupervisorListado[];
  contadores: { TODOS: number; ACTIVOS: number; INACTIVOS: number };
}

export function listarSupervisores(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<ListadoSupervisores>> {
  return ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const modulo = exigirPermisoDeModulo(actor.valor, 'VER_SUPERVISORES');
    if (!modulo.ok) return modulo;

    const supervisores = supervisoresConCuenta(datos)
      .map(({ usuario }): SupervisorListado => {
        const proyectos = datos.proyectos.filter(
          (p) => p.id_supervisor === usuario.id && aCargo(p),
        );
        const ids = new Set(proyectos.map((p) => p.id));
        return {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          estado: usuario.estado,
          proyectos_a_cargo: proyectos.length,
          practicantes_a_cargo: practicantesDe(datos, proyectos).size,
          tareas_por_revisar: datos.tareas.filter(
            (t) => t.estado === 'ESPERANDO_SUPERVISION' && ids.has(t.id_proyecto),
          ).length,
          ultima_actividad: ultimaActividadDeUsuario(usuario.id, datos.historial),
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    return {
      ok: true,
      valor: {
        supervisores,
        contadores: {
          TODOS: supervisores.length,
          ACTIVOS: supervisores.filter((s) => s.estado === 'ACTIVO').length,
          INACTIVOS: supervisores.filter((s) => s.estado === 'INACTIVO').length,
        },
      },
    };
  });
}

// ── Detalle ──────────────────────────────────────────────────────────────────────────────────

export interface ProyectoACargo {
  proyecto: ProyectoResumen;
  estado: Proyecto['estado'];
  reunion: ReunionDeProyecto;
  practicantes_activos: number;
}

export interface ProyectoAnteriorDeSupervisor {
  proyecto: ProyectoResumen;
  fecha_fin_real: Fecha | null;
}

/** Lo que el Administrador puede hacer ahora con un supervisor (§5.3). */
export type AccionSupervisor =
  'EDITAR_DATOS' | 'RESTABLECER_CONTRASENA' | 'REASIGNAR_PROYECTOS' | 'DESACTIVAR' | 'REACTIVAR';

export interface SupervisorDetalle {
  /**
   * Las acciones disponibles, decididas por `puede()` y las reglas de ciclo de vida de `domain/`: la pantalla solo las
   * ofrece. «Restablecer la contraseña» solo con la cuenta activa (el servicio pide reactivarla primero); «Desactivar»
   * solo con la cuenta activa, aunque tenga proyectos (en ese caso `proyectos_pendientes` dice cuántos); «Reactivar»
   * solo con la cuenta inactiva.
   */
  acciones: AccionSupervisor[];
  /** Cuántos proyectos activos o en pausa bloquean desactivarlo (§5.3); 0 si nada lo bloquea. Lo cuenta `domain/`. */
  proyectos_pendientes: number;
  /** A quién se pueden reasignar sus proyectos (supervisores activos y distintos); vacío si no tiene proyectos a cargo. */
  supervisores_destino: PersonaResumen[];
  datos: {
    id: Id;
    nombre: string;
    correo: string;
    celular: string;
    discord: string | null;
    cuenta_github: string | null;
    estado: EstadoUsuario;
    fecha_alta: FechaHora;
  };
  proyectos_a_cargo: ProyectoACargo[];
  /** Esperando su aprobación, la que lleva más tiempo primero. */
  tareas_por_revisar: TareaListado[];
  /** Sus proyectos finalizados. */
  proyectos_anteriores: ProyectoAnteriorDeSupervisor[];
  /** Su actividad registrada, del más reciente al más antiguo. */
  eventos: EventoConAutor[];
}

const esquemaEntradaSupervisor = z.object({ idActor: esquemaId, idSupervisor: esquemaId });
export type EntradaConSupervisor = z.input<typeof esquemaEntradaSupervisor>;

export function obtenerSupervisor(
  entrada: EntradaConSupervisor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<SupervisorDetalle>> {
  return ejecutarConsulta(entorno, ({ datos, marca }) => {
    const valida = validarEntrada(esquemaEntradaSupervisor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const modulo = exigirPermisoDeModulo(actor.valor, 'VER_SUPERVISORES');
    if (!modulo.ok) return modulo;

    const encontrado = supervisoresConCuenta(datos).find(
      (s) => s.usuario.id === valida.valor.idSupervisor,
    );
    if (encontrado === undefined) return fallo('NO_ENCONTRADO');
    const { detalle, usuario } = encontrado;

    const hoy = hoyEn(marca.ahora);
    const suyos = datos.proyectos.filter((p) => p.id_supervisor === usuario.id);
    const enCurso = suyos.filter(aCargo);
    const porRevisar = enCurso
      .flatMap((proyecto) =>
        datos.tareas
          .filter((t) => t.id_proyecto === proyecto.id && t.estado === 'ESPERANDO_SUPERVISION')
          .map((tarea): TareaListado => ({
            ...aTareaConProyecto(datos, actor.valor, proyecto, tarea, hoy),
            dias_esperando: diasEsperando(tarea, datos.historial, marca.ahora),
          })),
      )
      .sort(
        (a, b) =>
          (b.dias_esperando ?? -1) - (a.dias_esperando ?? -1) ||
          a.proyecto.codigo.localeCompare(b.proyecto.codigo) ||
          a.numero - b.numero,
      );

    const editar = puede(actor.valor, 'EDITAR_CREDENCIAL_SUPERVISOR', {
      usuario_objetivo: usuario,
    });
    const restablecer = puede(actor.valor, 'RESTABLECER_CONTRASENA', { usuario_objetivo: usuario });
    // Las reglas de ciclo de vida de `domain/` dicen si se puede y, si no, por qué: con proyectos a cargo, desactivar se
    // ofrece igual (la pantalla explica el bloqueo con `proyectos_pendientes`); con la cuenta ya inactiva, no.
    const desactivar = reglaDesactivarSupervisor(actor.valor, usuario, datos.proyectos);
    const bloqueadoPorProyectos =
      !desactivar.ok && desactivar.codigo === 'SUPERVISOR_CON_PROYECTOS';
    const reactivar = reglaReactivarSupervisor(actor.valor, usuario);
    // Quién puede recibir sus proyectos: lo decide `puedeCambiarSupervisor` (activo, distinto y proyecto no finalizado).
    const destinos =
      enCurso.length === 0
        ? []
        : supervisoresConCuenta(datos)
            .filter(({ usuario: u }) =>
              enCurso.some((p) => puedeCambiarSupervisor(actor.valor, p, u).ok),
            )
            .map(({ usuario: u }): PersonaResumen => ({ id: u.id, nombre: u.nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const acciones: AccionSupervisor[] = [
      ...(editar.permitido ? (['EDITAR_DATOS'] as const) : []),
      ...(restablecer.permitido && usuario.estado === 'ACTIVO'
        ? (['RESTABLECER_CONTRASENA'] as const)
        : []),
      ...(destinos.length > 0 ? (['REASIGNAR_PROYECTOS'] as const) : []),
      ...(desactivar.ok || bloqueadoPorProyectos ? (['DESACTIVAR'] as const) : []),
      ...(reactivar.ok ? (['REACTIVAR'] as const) : []),
    ];

    return {
      ok: true,
      valor: {
        acciones,
        proyectos_pendientes:
          !desactivar.ok && desactivar.codigo === 'SUPERVISOR_CON_PROYECTOS'
            ? (desactivar.cantidad ?? 0)
            : 0,
        supervisores_destino: destinos,
        datos: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          celular: usuario.celular,
          discord: detalle.discord,
          cuenta_github: detalle.cuenta_github,
          estado: usuario.estado,
          fecha_alta: usuario.fecha_alta,
        },
        proyectos_a_cargo: enCurso.map((p) => ({
          proyecto: resumenDeProyecto(p),
          estado: p.estado,
          reunion: reunionDe(p, marca.ahora),
          practicantes_activos: asignacionesActivas(datos, p.id).length,
        })),
        tareas_por_revisar: porRevisar,
        proyectos_anteriores: suyos
          .filter((p) => !aCargo(p))
          .map((p) => ({ proyecto: resumenDeProyecto(p), fecha_fin_real: p.fecha_fin_real })),
        eventos: conAutor(
          datos.usuarios,
          datos.historial.filter(
            (e) => e.autor.tipo === 'USUARIO' && e.autor.id_usuario === usuario.id,
          ),
        ),
      },
    };
  });
}
