import { describe, expect, it } from 'vitest';
import { asignarPracticantes } from '../practicantes';
import { prepararPrueba } from '../pruebas/almacen';
import { crearTarea, tomarTarea } from '../tareas';
import { desactivarSupervisor, reactivarSupervisor } from '../supervisores';
import { crearProyecto } from './datos';
import { finalizarProyecto, pausarProyecto, reactivarProyecto } from './estado';
import { reasignarProyectosDeSupervisor } from './supervisor';

const ADMIN = 'demo-admin';
const SUPERVISOR_02 = 'usr-sup-02'; // TIE (finalizado) y DAT (activo)
const SUPERVISOR_03 = 'usr-sup-03';
const PRACTICANTE = 'usr-pra-20'; // sin proyecto en la semilla

describe('flujo de un proyecto, de su creación a su reactivación', () => {
  it('crear → asignar → tareas → pausar → finalizar → reasignar al supervisor → desactivarlo → reactivar el proyecto', async () => {
    const prueba = prepararPrueba();
    const { entorno } = prueba;
    const datos = () => prueba.datos();
    const historialInicial = datos().historial.length;

    // 1. Se crea el proyecto con el supervisor usr-sup-02 y se asigna a un practicante.
    const creado = await crearProyecto(
      {
        idActor: ADMIN,
        nombre: 'Flujo de prueba',
        codigo: 'FLU',
        descripcion: 'Proyecto del flujo de punta a punta.',
        fecha_inicio: '2026-11-18',
        fecha_fin_prevista: '2027-02-18',
        idSupervisor: SUPERVISOR_02,
        repositorio_url: 'https://github.com/org-demo/flujo',
        rama_base: 'main',
      },
      entorno,
    );
    if (!creado.ok) throw new Error(creado.mensaje);
    const id = creado.valor.id;
    const asignada = await asignarPracticantes(
      { idActor: ADMIN, asignaciones: [{ idPracticante: PRACTICANTE, idProyecto: id }] },
      entorno,
    );
    expect(asignada.ok).toBe(true);

    // 2. Dos tareas; el practicante toma la primera.
    const tarea = async (titulo: string) => {
      const r = await crearTarea(
        {
          idActor: ADMIN,
          idProyecto: id,
          titulo,
          descripcion: 'Descripción de la tarea.',
          fecha_limite: '2026-12-15',
        },
        entorno,
      );
      if (!r.ok) throw new Error(r.mensaje);
      return r.valor;
    };
    const primera = await tarea('Primera tarea');
    const segunda = await tarea('Segunda tarea');
    expect((await tomarTarea({ idActor: PRACTICANTE, idTarea: primera.id }, entorno)).ok).toBe(
      true,
    );

    // 3. En pausa, nadie toma tareas nuevas.
    expect(
      (
        await pausarProyecto(
          { idActor: ADMIN, idProyecto: id, nota: 'Espera del cliente.' },
          entorno,
        )
      ).ok,
    ).toBe(true);
    expect(await tomarTarea({ idActor: PRACTICANTE, idTarea: segunda.id }, entorno)).toMatchObject({
      ok: false,
      codigo: 'PROYECTO_EN_PAUSA',
    });

    // 4. Se finaliza desde la pausa: la tarea en progreso se libera y las asignaciones se conservan.
    const finalizado = await finalizarProyecto(
      { idActor: ADMIN, idProyecto: id, nota: 'Entrega aceptada.' },
      entorno,
    );
    expect(finalizado.ok && finalizado.valor.tareas_liberadas).toEqual([primera.id]);
    expect(datos().tareas.find((t) => t.id === primera.id)).toMatchObject({
      estado: 'DISPONIBLE',
      id_practicante: null,
    });
    expect(
      datos().asignaciones.find((a) => a.id_practicante === PRACTICANTE && a.id_proyecto === id)!
        .fecha_baja,
    ).toBeNull();
    // Con el proyecto finalizado, ni siquiera quien sigue asignado puede tomar tareas.
    expect(await tomarTarea({ idActor: PRACTICANTE, idTarea: primera.id }, entorno)).toMatchObject({
      ok: false,
      codigo: 'PROYECTO_FINALIZADO',
    });

    // 5. El supervisor tiene aún un proyecto activo (DAT): primero se reasigna y después se desactiva.
    expect(
      await desactivarSupervisor({ idActor: ADMIN, idSupervisor: SUPERVISOR_02 }, entorno),
    ).toMatchObject({
      codigo: 'SUPERVISOR_CON_PROYECTOS',
    });
    const reasignado = await reasignarProyectosDeSupervisor(
      {
        idActor: ADMIN,
        idSupervisor: SUPERVISOR_02,
        reasignaciones: [{ idProyecto: 'pry-dat', idNuevoSupervisor: SUPERVISOR_03 }],
      },
      entorno,
    );
    expect(reasignado.ok).toBe(true);
    expect(
      (await desactivarSupervisor({ idActor: ADMIN, idSupervisor: SUPERVISOR_02 }, entorno)).ok,
    ).toBe(true);

    // 6. El proyecto finalizado quedó con un supervisor inactivo: no se reactiva hasta reactivar al supervisor.
    expect(
      await reactivarProyecto(
        { idActor: ADMIN, idProyecto: id, nota: 'Falta una entrega.' },
        entorno,
      ),
    ).toMatchObject({
      ok: false,
      codigo: 'SUPERVISOR_DEL_PROYECTO_INACTIVO',
    });
    expect(
      (await reactivarSupervisor({ idActor: ADMIN, idSupervisor: SUPERVISOR_02 }, entorno)).ok,
    ).toBe(true);
    const reactivado = await reactivarProyecto(
      { idActor: ADMIN, idProyecto: id, nota: 'Falta una entrega.' },
      entorno,
    );
    expect(reactivado.ok && reactivado.valor).toMatchObject({
      estado: 'ACTIVO',
      fecha_fin_real: null,
    });

    // 7. El equipo recupera su acceso: el practicante vuelve a tomar la tarea liberada.
    expect((await tomarTarea({ idActor: PRACTICANTE, idTarea: primera.id }, entorno)).ok).toBe(
      true,
    );

    // El historial cuenta la historia completa, en orden.
    const tipos = datos()
      .historial.slice(historialInicial)
      .map((e) => e.tipo_accion);
    expect(tipos).toEqual([
      'PROYECTO_CREADO',
      'PRACTICANTE_ASIGNADO_A_PROYECTO',
      'TAREA_CREADA',
      'TAREA_CREADA',
      'TAREA_TOMADA',
      'PROYECTO_PAUSADO',
      'PROYECTO_FINALIZADO',
      'TAREA_LIBERADA',
      'PROYECTO_SUPERVISOR_CAMBIADO',
      'SUPERVISOR_PROYECTOS_REASIGNADOS',
      'SUPERVISOR_DESACTIVADO',
      'SUPERVISOR_REACTIVADO',
      'PROYECTO_REACTIVADO',
      'TAREA_TOMADA',
    ]);
  });
});
