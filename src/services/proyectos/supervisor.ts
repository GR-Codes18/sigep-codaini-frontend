/**
 * Cambiar el supervisor de un proyecto y reasignar los proyectos de un supervisor (Fase 2, paso 9B; propuesta §5.3,
 * §5.4 y §8.1; decisiones F1-A y G4-A).
 *
 * `cambiarSupervisor`: solo el Administrador, con `puedeCambiarSupervisor` (el proyecto no puede estar finalizado y el
 * nuevo debe ser un supervisor ACTIVO y distinto del actual). El supervisor es un dato del proyecto, así que las
 * tareas que esperan supervisión pasan al nuevo supervisor sin tocarlas. Deja `PROYECTO_SUPERVISOR_CAMBIADO` (por
 * nombre) y avisa `ASIGNADO_A_PROYECTO` al nuevo y `QUITADO_DE_PROYECTO` al anterior (§8.1).
 *
 * `reasignarProyectosDeSupervisor`: el atajo del módulo Supervisores, para poder desactivar a alguien con proyectos.
 * Recibe una lista de pares `{ idProyecto, idNuevoSupervisor }` que se aplica **entera o ninguna**; cada proyecto debe
 * ser del supervisor indicado y no estar finalizado. Deja, por cada proyecto, lo mismo que `cambiarSupervisor`, y un
 * `SUPERVISOR_PROYECTOS_REASIGNADOS` sobre el supervisor saliente. El servicio no exige reasignar todos sus proyectos:
 * la pantalla propone todos los activos y en pausa, y `desactivarSupervisor` sigue avisando si queda alguno.
 */

import { z } from 'zod';
import type { DatosAlmacen } from '@/data';
import {
  puedeCambiarSupervisor,
  type EventoHistorial,
  type Id,
  type Notificacion,
  type Proyecto,
  type Usuario,
} from '@/domain';
import { obtenerActor } from '../actor';
import { denegarCicloVida } from '../cicloVida';
import { ENTORNO, type Entorno } from '../entorno';
import { etiquetaUsuario } from '../etiquetas';
import { autorDe, cambio, crearEvento } from '../historial';
import type { Marca } from '../marca';
import { crearNotificaciones } from '../notificaciones';
import { fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import { cargarContextoProyecto, eventoDeProyecto, reemplazarProyecto } from './comun';

const esquemaCambiar = z.object({
  idActor: esquemaId,
  idProyecto: esquemaId,
  idNuevoSupervisor: esquemaId,
});

const esquemaReasignar = z.object({
  idActor: esquemaId,
  idSupervisor: esquemaId,
  reasignaciones: z
    .array(z.object({ idProyecto: esquemaId, idNuevoSupervisor: esquemaId }))
    .min(1, 'Elige al menos un proyecto para reasignar.')
    .superRefine((pares, contexto) => {
      const vistos = new Set<string>();
      for (const [i, par] of pares.entries()) {
        if (vistos.has(par.idProyecto)) {
          contexto.addIssue({
            code: 'custom',
            path: [i, 'idProyecto'],
            message: 'Proyecto repetido.',
          });
        }
        vistos.add(par.idProyecto);
      }
    }),
});

export type EntradaCambiarSupervisor = z.input<typeof esquemaCambiar>;
export type EntradaReasignarProyectosDeSupervisor = z.input<typeof esquemaReasignar>;

interface CambioAplicado {
  nuevo: Proyecto;
  evento: EventoHistorial;
  avisos: Notificacion[];
}

/** El cambio de un proyecto (evento y avisos), que comparten los dos servicios. */
function aplicarCambio(
  datos: Pick<DatosAlmacen, 'usuarios'>,
  actor: Usuario,
  proyecto: Proyecto,
  nuevoSupervisor: Usuario,
  marca: Marca,
  generarId: (prefijo: string) => Id,
): CambioAplicado {
  const anterior = datos.usuarios.find((u) => u.id === proyecto.id_supervisor);
  if (anterior === undefined) throw new Error(`El proyecto ${proyecto.id} no tiene supervisor.`);
  const nuevo: Proyecto = { ...proyecto, id_supervisor: nuevoSupervisor.id };
  const autor = autorDe(actor.id);
  const elemento = { tipo: 'PROYECTO', id: nuevo.id } as const;

  const evento = eventoDeProyecto(
    {
      actor,
      proyecto: nuevo,
      tipo_accion: 'PROYECTO_SUPERVISOR_CAMBIADO',
      cambios: [cambio('supervisor', anterior.nombre, nuevoSupervisor.nombre)],
    },
    marca,
    generarId,
  );
  const avisos = [
    ...crearNotificaciones(
      {
        autor,
        destinatarios: [nuevoSupervisor.id],
        tipo: 'ASIGNADO_A_PROYECTO',
        mensaje: `Te asignaron como supervisor del proyecto ${nuevo.nombre}.`,
        elemento,
      },
      datos.usuarios,
      marca,
      generarId,
    ),
    ...crearNotificaciones(
      {
        autor,
        destinatarios: [anterior.id],
        tipo: 'QUITADO_DE_PROYECTO',
        mensaje: `Ya no eres el supervisor del proyecto ${nuevo.nombre}.`,
        elemento,
      },
      datos.usuarios,
      marca,
      generarId,
    ),
  ];
  return { nuevo, evento, avisos };
}

// ── Cambiar el supervisor de un proyecto ─────────────────────────────────────────────────────

export function cambiarSupervisor(
  entrada: EntradaCambiarSupervisor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Proyecto>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaCambiar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const contexto = cargarContextoProyecto(datos, v.idActor, v.idProyecto);
    if (!contexto.ok) return contexto;
    const { actor, proyecto } = contexto.valor;

    const nuevoSupervisor = datos.usuarios.find((u) => u.id === v.idNuevoSupervisor);
    if (nuevoSupervisor === undefined) {
      return fallo('NO_ENCONTRADO', undefined, {
        idNuevoSupervisor: 'No se encontró al nuevo supervisor.',
      });
    }

    // Quién, proyecto finalizado, supervisor activo y distinto: todo en `domain/`.
    const regla = puedeCambiarSupervisor(actor, proyecto, nuevoSupervisor);
    if (!regla.ok) return denegarCicloVida(regla);

    const cambioAplicado = aplicarCambio(
      datos,
      actor,
      proyecto,
      nuevoSupervisor,
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: cambioAplicado.nuevo,
      cambios: conEfectos(
        datos,
        { proyectos: reemplazarProyecto(datos.proyectos, cambioAplicado.nuevo) },
        { eventos: [cambioAplicado.evento], notificaciones: cambioAplicado.avisos },
      ),
    };
  });
}

// ── Reasignar los proyectos de un supervisor ─────────────────────────────────────────────────

export function reasignarProyectosDeSupervisor(
  entrada: EntradaReasignarProyectosDeSupervisor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Proyecto[]>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaReasignar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;
    const saliente = datos.usuarios.find((u) => u.id === v.idSupervisor);
    if (saliente === undefined) return fallo('NO_ENCONTRADO');

    const nuevos: Proyecto[] = [];
    const eventos: EventoHistorial[] = [];
    const avisos: Notificacion[] = [];

    for (const [i, par] of v.reasignaciones.entries()) {
      const campo = `reasignaciones.${i}`;
      const proyecto = datos.proyectos.find((p) => p.id === par.idProyecto);
      const nuevoSupervisor = datos.usuarios.find((u) => u.id === par.idNuevoSupervisor);
      if (proyecto === undefined || nuevoSupervisor === undefined) {
        const f = fallo('NO_ENCONTRADO');
        return { ...f, campos: { [campo]: f.mensaje } };
      }

      // Quién, proyecto finalizado, supervisor activo y distinto: todo en `domain/`.
      const regla = puedeCambiarSupervisor(actor.valor, proyecto, nuevoSupervisor);
      if (!regla.ok) {
        const f = denegarCicloVida(regla);
        return { ...f, campos: { [campo]: f.mensaje } };
      }
      if (proyecto.id_supervisor !== saliente.id) {
        const f = fallo('PROYECTO_NO_ES_DEL_SUPERVISOR');
        return { ...f, campos: { [campo]: f.mensaje } };
      }

      const aplicado = aplicarCambio(
        datos,
        actor.valor,
        proyecto,
        nuevoSupervisor,
        marca,
        e.generarId,
      );
      nuevos.push(aplicado.nuevo);
      eventos.push(aplicado.evento);
      avisos.push(...aplicado.avisos);
    }

    eventos.push(
      crearEvento(
        {
          autor: autorDe(actor.valor.id),
          tipo_accion: 'SUPERVISOR_PROYECTOS_REASIGNADOS',
          elemento: { tipo: 'USUARIO', id: saliente.id, etiqueta: etiquetaUsuario(saliente) },
          id_proyecto: null,
          cambios: [cambio('proyectos', null, nuevos.map((p) => p.codigo).join(', '))],
        },
        marca,
        e.generarId,
      ),
    );

    const porId = new Map(nuevos.map((p) => [p.id, p]));
    return {
      ok: true,
      valor: nuevos,
      cambios: conEfectos(
        datos,
        { proyectos: datos.proyectos.map((p) => porId.get(p.id) ?? p) },
        { eventos, notificaciones: avisos },
      ),
    };
  });
}
