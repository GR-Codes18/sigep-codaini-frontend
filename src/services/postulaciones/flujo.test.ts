import { describe, expect, it } from 'vitest';
import { crearEntornoDePrueba } from '../pruebas/entorno';
import { aprobarPostulacion, rechazarPostulacion, reconsiderarPostulacion } from './decisiones';
import { evaluarPostulacion } from './evaluacion';

const ADMIN = 'demo-admin';
const POSTULANTE = 'pos-26'; // Luis Quispe Ayala, Programación de videojuegos, pendiente

describe('flujo de una postulación', () => {
  it('evaluar → rechazar → reconsiderar → aprobar deja historial coherente y un practicante sin proyecto', async () => {
    const prueba = crearEntornoDePrueba();
    const datos = () => prueba.almacen.getState().datos;

    // La semilla ya evalúa a todos: se quita la evaluación para que el sistema la haga.
    const vieja = datos().evaluaciones.find((e) => e.id_postulante === POSTULANTE)!;
    prueba.almacen.getState().transaccion((d) => ({
      evaluaciones: d.evaluaciones.filter((e) => e.id !== vieja.id),
      detalles_evaluacion: d.detalles_evaluacion.filter((x) => x.id_evaluacion !== vieja.id),
    }));
    const historialInicial = datos().historial.length;
    const avisosIniciales = datos().notificaciones;

    const evaluada = await evaluarPostulacion({ idPostulante: POSTULANTE }, prueba.entorno);
    expect(evaluada.ok).toBe(true);
    if (!evaluada.ok) return;
    const evaluacion = evaluada.valor.evaluacion;

    const rechazada = await rechazarPostulacion(
      { idActor: ADMIN, idPostulante: POSTULANTE, motivo: 'Falta el portafolio.' },
      prueba.entorno,
    );
    expect(rechazada.ok && rechazada.valor.estado).toBe('RECHAZADA');

    // Una rechazada no se puede aprobar: primero se reconsidera.
    expect(
      await aprobarPostulacion({ idActor: ADMIN, idPostulante: POSTULANTE }, prueba.entorno),
    ).toMatchObject({ ok: false, codigo: 'POSTULACION_NO_PENDIENTE' });

    const reconsiderada = await reconsiderarPostulacion(
      { idActor: ADMIN, idPostulante: POSTULANTE, nota: 'Envió su portafolio.' },
      prueba.entorno,
    );
    expect(reconsiderada.ok && reconsiderada.valor.estado).toBe('PENDIENTE');
    // La reconsideración no recalcula: sigue la misma evaluación.
    expect(datos().evaluaciones.filter((e) => e.id_postulante === POSTULANTE)).toEqual([
      evaluacion,
    ]);

    const aprobada = await aprobarPostulacion(
      { idActor: ADMIN, idPostulante: POSTULANTE },
      prueba.entorno,
    );
    expect(aprobada.ok).toBe(true);
    if (!aprobada.ok) return;

    const final = datos();
    const postulante = final.postulantes.find((p) => p.id === POSTULANTE)!;
    const usuario = final.usuarios.find((u) => u.id === aprobada.valor.id_usuario)!;
    expect(postulante.estado).toBe('APROBADA');
    // Puede entrar con su correo y la contraseña temporal, y debe cambiarla.
    expect(usuario).toMatchObject({
      correo: postulante.correo,
      contrasena: aprobada.valor.contrasena_temporal,
      rol: 'PRACTICANTE',
      estado: 'ACTIVO',
      debe_cambiar_contrasena: true,
    });
    // Nace «Sin proyecto»: ninguna asignación (la asignación es otra acción).
    expect(final.asignaciones.some((a) => a.id_practicante === usuario.id)).toBe(false);

    // Historial en orden y con el autor correcto.
    const eventos = final.historial.slice(historialInicial);
    expect(eventos.map((e) => [e.autor.tipo, e.tipo_accion])).toEqual([
      ['SISTEMA', 'POSTULACION_EVALUADA'],
      ['USUARIO', 'POSTULACION_RECHAZADA'],
      ['USUARIO', 'POSTULACION_RECONSIDERADA'],
      ['USUARIO', 'POSTULACION_APROBADA'],
      ['USUARIO', 'PRACTICANTE_CREADO'],
    ]);
    // Ninguna decisión avisó a nadie.
    expect(final.notificaciones).toBe(avisosIniciales);
  });
});
