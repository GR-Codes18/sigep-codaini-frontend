import { describe, expect, it } from 'vitest';
import { aprobarPostulacion } from '../postulaciones';
import { prepararPrueba } from '../pruebas/almacen';
import { crearTarea, tomarTarea } from '../tareas';
import { asignarPracticantes, quitarPracticante } from './asignaciones';
import { finalizarPractica, reactivarPractica } from './ciclo';

const ADMIN = 'demo-admin';
const POSTULANTE = 'pos-25'; // Mariana Condori Apaza, pendiente
const PL2D = 'pry-pl2d';

describe('flujo de un practicante, de la postulación a la reactivación', () => {
  it('aprobar → asignar → crear tarea → tomar → quitar → asignar de nuevo → tomar → finalizar → reactivar', async () => {
    const prueba = prepararPrueba();
    const { entorno } = prueba;
    const historialInicial = prueba.datos().historial.length;
    const avisosIniciales = prueba.datos().notificaciones.length;

    // 1. Se aprueba la postulación: nace la cuenta, «Sin proyecto».
    const aprobada = await aprobarPostulacion(
      { idActor: ADMIN, idPostulante: POSTULANTE },
      entorno,
    );
    if (!aprobada.ok) throw new Error(aprobada.mensaje);
    const id = aprobada.valor.id_usuario;
    expect(prueba.datos().asignaciones.some((a) => a.id_practicante === id)).toBe(false);

    // 2. Se asigna a PL2D.
    const asignada = await asignarPracticantes(
      { idActor: ADMIN, asignaciones: [{ idPracticante: id, idProyecto: PL2D }] },
      entorno,
    );
    if (!asignada.ok) throw new Error(asignada.mensaje);
    const primera = asignada.valor[0];
    expect(primera).toMatchObject({ id_practicante: id, id_proyecto: PL2D, fecha_baja: null });

    // 3. Se crea una tarea y la toma.
    const creada = await crearTarea(
      {
        idActor: ADMIN,
        idProyecto: PL2D,
        titulo: 'Pantalla de créditos',
        descripcion: 'Lista del equipo al terminar el juego.',
        fecha_limite: '2026-12-15',
      },
      entorno,
    );
    if (!creada.ok) throw new Error(creada.mensaje);
    const tomada = await tomarTarea({ idActor: id, idTarea: creada.valor.id }, entorno);
    expect(tomada.ok && tomada.valor).toMatchObject({ estado: 'EN_PROGRESO', id_practicante: id });

    // 4. Se le quita del proyecto: la tarea vuelve a estar disponible.
    const quitada = await quitarPracticante(
      { idActor: ADMIN, idProyecto: PL2D, idPracticante: id, motivo: 'Reorganización.' },
      entorno,
    );
    expect(quitada.ok && quitada.valor.tareas_liberadas).toEqual([creada.valor.id]);
    expect(prueba.datos().tareas.find((t) => t.id === creada.valor.id)).toMatchObject({
      estado: 'DISPONIBLE',
      id_practicante: null,
    });

    // 5. Vuelve al proyecto: una asignación nueva; la anterior conserva su baja.
    const otra = await asignarPracticantes(
      { idActor: ADMIN, asignaciones: [{ idPracticante: id, idProyecto: PL2D }] },
      entorno,
    );
    if (!otra.ok) throw new Error(otra.mensaje);
    expect(otra.valor[0].id).not.toBe(primera.id);
    const suyas = prueba.datos().asignaciones.filter((a) => a.id_practicante === id);
    expect(suyas.map((a) => a.fecha_baja !== null)).toEqual([true, false]);

    // 6. Toma la tarea otra vez y, al terminar el ciclo, se finaliza su práctica.
    await tomarTarea({ idActor: id, idTarea: creada.valor.id }, entorno);
    const finalizada = await finalizarPractica(
      { idActor: ADMIN, idPracticante: id, motivo: 'Término de ciclo.' },
      entorno,
    );
    expect(finalizada.ok && finalizada.valor.tareas_liberadas).toEqual([creada.valor.id]);
    const trasFinalizar = prueba.datos();
    expect(trasFinalizar.usuarios.find((u) => u.id === id)!.estado).toBe('INACTIVO');
    expect(
      trasFinalizar.asignaciones
        .filter((a) => a.id_practicante === id)
        .every((a) => a.fecha_baja !== null),
    ).toBe(true);
    expect(trasFinalizar.tareas.find((t) => t.id === creada.valor.id)).toMatchObject({
      estado: 'DISPONIBLE',
      id_practicante: null,
    });
    // Con la cuenta bloqueada ya no puede tomar tareas.
    expect(await tomarTarea({ idActor: id, idTarea: creada.valor.id }, entorno)).toMatchObject({
      ok: false,
      codigo: 'USUARIO_INACTIVO',
    });

    // 7. Se reactiva: activa de nuevo y sin proyecto.
    const reactivada = await reactivarPractica(
      { idActor: ADMIN, idPracticante: id, nota: 'Retoma la práctica.' },
      entorno,
    );
    expect(reactivada.ok && reactivada.valor.estado).toBe('ACTIVO');
    const final = prueba.datos();
    expect(
      final.asignaciones.filter((a) => a.id_practicante === id && a.fecha_baja === null),
    ).toEqual([]);

    // Historial, en orden y con los autores correctos.
    const eventos = final.historial.slice(historialInicial);
    expect(
      eventos.map((e) => [
        e.autor.tipo === 'USUARIO' ? e.autor.id_usuario : 'SISTEMA',
        e.tipo_accion,
      ]),
    ).toEqual([
      [ADMIN, 'POSTULACION_APROBADA'],
      [ADMIN, 'PRACTICANTE_CREADO'],
      [ADMIN, 'PRACTICANTE_ASIGNADO_A_PROYECTO'],
      [ADMIN, 'TAREA_CREADA'],
      [id, 'TAREA_TOMADA'],
      [ADMIN, 'PRACTICANTE_QUITADO_DE_PROYECTO'],
      [ADMIN, 'TAREA_LIBERADA'],
      [ADMIN, 'PRACTICANTE_ASIGNADO_A_PROYECTO'],
      [id, 'TAREA_TOMADA'],
      [ADMIN, 'PRACTICANTE_FINALIZADO'],
      [ADMIN, 'TAREA_LIBERADA'],
      [ADMIN, 'PRACTICANTE_REACTIVADO'],
    ]);

    // Avisos: asignado, quitado y tarea liberada, asignado de nuevo; y al finalizar, solo el aviso al
    // supervisor de PL2D (la persona ya no recibe nada: su acceso queda bloqueado).
    const avisos = final.notificaciones.slice(avisosIniciales);
    expect(avisos.map((n) => [n.id_destinatario, n.tipo])).toEqual([
      [id, 'ASIGNADO_A_PROYECTO'],
      [id, 'QUITADO_DE_PROYECTO'],
      [id, 'TAREA_LIBERADA'],
      [id, 'ASIGNADO_A_PROYECTO'],
      ['demo-supervisor', 'PRACTICA_FINALIZADA_CON_TAREAS_LIBERADAS'],
    ]);
  });
});
