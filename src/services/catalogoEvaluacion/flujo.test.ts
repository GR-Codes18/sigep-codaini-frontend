import { describe, expect, it } from 'vitest';
import type { CriterioEvaluacion, Postulante } from '@/domain';
import { evaluarPostulacion } from '../postulaciones';
import { prepararPrueba } from '../pruebas/almacen';
import { cambiarActivoAreaTecnica, crearAreaTecnica } from './areas';
import { guardarCriteriosDeBloque } from './criterios';
import { cambiarActivoEspecialidad, crearEspecialidad } from './especialidades';

const ADMIN = 'demo-admin';

const criterio = (nombre: string, peso: number, obligatorio = false) => ({
  nombre,
  tipo: 'TECNOLOGIA' as const,
  peso,
  obligatorio,
  activo: true,
});

describe('flujo del catálogo de evaluación', () => {
  it('crear área y especialidad → configurar sus bloques → activarlas → evaluar a un postulante', async () => {
    // El evaluador simulado da por cumplidos los criterios que se le indiquen.
    const cumple = new Set<string>();
    const prueba = prepararPrueba({
      evaluador: {
        juzgar: (_p, criterios: readonly CriterioEvaluacion[]) =>
          criterios.map((c) => ({
            id_criterio: c.id,
            cumplido: cumple.has(c.nombre),
            observacion: null,
          })),
      },
    });
    const historialInicial = prueba.datos().historial.length;

    const area = await crearAreaTecnica(
      { idActor: ADMIN, nombre: 'Ciberseguridad' },
      prueba.entorno,
    );
    if (!area.ok) throw new Error(area.mensaje);
    const especialidad = await crearEspecialidad(
      { idActor: ADMIN, idAreaTecnica: area.valor.id, nombre: 'Pentesting' },
      prueba.entorno,
    );
    if (!especialidad.ok) throw new Error(especialidad.mensaje);

    // Nacen inactivas y, sin criterios, no se pueden activar.
    expect(area.valor.activo).toBe(false);
    expect(especialidad.valor.activo).toBe(false);
    expect(
      await cambiarActivoAreaTecnica(
        { idActor: ADMIN, idAreaTecnica: area.valor.id, activo: true },
        prueba.entorno,
      ),
    ).toMatchObject({ ok: false, codigo: 'BLOQUE_SIN_CRITERIOS' });

    const bloqueArea = await guardarCriteriosDeBloque(
      {
        idActor: ADMIN,
        idAreaTecnica: area.valor.id,
        idEspecialidad: null,
        criterios: [criterio('Nivel académico', 60, true), criterio('Disponibilidad', 40)],
      },
      prueba.entorno,
    );
    const bloqueEspecialidad = await guardarCriteriosDeBloque(
      {
        idActor: ADMIN,
        idAreaTecnica: area.valor.id,
        idEspecialidad: especialidad.valor.id,
        criterios: [
          criterio('Herramientas de auditoría', 70, true),
          criterio('Informes técnicos', 30),
        ],
      },
      prueba.entorno,
    );
    expect(bloqueArea.ok && bloqueEspecialidad.ok).toBe(true);

    expect(
      (
        await cambiarActivoAreaTecnica(
          { idActor: ADMIN, idAreaTecnica: area.valor.id, activo: true },
          prueba.entorno,
        )
      ).ok,
    ).toBe(true);
    expect(
      (
        await cambiarActivoEspecialidad(
          { idActor: ADMIN, idEspecialidad: especialidad.valor.id, activo: true },
          prueba.entorno,
        )
      ).ok,
    ).toBe(true);

    // Llega una postulación a la especialidad nueva (el formulario web es externo al sistema).
    const postulante: Postulante = {
      id: 'pos-nuevo',
      nombre: 'Rocío Ibáñez Cruz',
      correo: 'rocio.ibanez@codaini.demo',
      celular: '912345678',
      id_area_tecnica: area.valor.id,
      id_especialidad: especialidad.valor.id,
      fecha_postulacion: '2026-11-17T12:00:00.000Z',
      cv: { nombre: 'cv-rocio.pdf', url: '/cv-ejemplo/rocio.pdf' },
      estado: 'PENDIENTE',
    };
    prueba.modificar((d) => ({ postulantes: [...d.postulantes, postulante] }));
    for (const nombre of ['Nivel académico', 'Herramientas de auditoría', 'Informes técnicos']) {
      cumple.add(nombre);
    }

    const evaluada = await evaluarPostulacion({ idPostulante: postulante.id }, prueba.entorno);
    expect(evaluada.ok).toBe(true);
    if (!evaluada.ok) return;
    // Área: 60 de 100; especialidad: 100. Nota: (40 × 60 + 60 × 100) / 100 = 84.
    expect(evaluada.valor.evaluacion).toMatchObject({
      puntaje_area: 60,
      puntaje_especialidad: 100,
      puntaje_total: 84,
      requiere_revision_manual: false,
    });
    expect(evaluada.valor.detalles.map((d) => d.nombre_criterio)).toEqual([
      'Nivel académico',
      'Disponibilidad',
      'Herramientas de auditoría',
      'Informes técnicos',
    ]);

    // Historial en orden y sin avisos.
    const eventos = prueba.datos().historial.slice(historialInicial);
    expect(eventos.map((e) => e.tipo_accion)).toEqual([
      'AREA_TECNICA_CREADA',
      'ESPECIALIDAD_CREADA',
      'CRITERIO_CREADO',
      'CRITERIO_CREADO',
      'CRITERIO_CREADO',
      'CRITERIO_CREADO',
      'AREA_TECNICA_ACTIVADA',
      'ESPECIALIDAD_ACTIVADA',
      'POSTULACION_EVALUADA',
    ]);
    expect(eventos.every((e) => e.id_proyecto === null)).toBe(true);
  });
});
