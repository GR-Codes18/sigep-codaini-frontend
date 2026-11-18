import { describe, expect, it } from 'vitest';
import type { EstadoTarea } from './enumeraciones';
import { ESTADOS_TAREA } from './enumeraciones';
import { IDS, asignacion, tarea, usuario } from './pruebas/fabricas';
import { MOTIVOS_ATENCION_RESPONSABLE, motivosDeAtencionDelResponsable } from './responsableTarea';

const activo = usuario('PRACTICANTE');
const inactivo = usuario('PRACTICANTE', { estado: 'INACTIVO' });
const vigente = asignacion();
const conBaja = asignacion({ fecha_baja: '2026-03-01' });

describe('motivosDeAtencionDelResponsable', () => {
  it('un responsable activo con asignación vigente no necesita atención', () => {
    expect(motivosDeAtencionDelResponsable(tarea(), activo, [vigente])).toEqual([]);
  });

  it('cuenta inactiva: CUENTA_INACTIVA', () => {
    expect(motivosDeAtencionDelResponsable(tarea(), inactivo, [vigente])).toEqual([
      'CUENTA_INACTIVA',
    ]);
  });

  it('cuenta que no se encuentra (undefined): CUENTA_NO_ENCONTRADA, no CUENTA_INACTIVA', () => {
    expect(motivosDeAtencionDelResponsable(tarea(), undefined, [vigente])).toEqual([
      'CUENTA_NO_ENCONTRADA',
    ]);
  });

  it('asignación con baja: SIN_ASIGNACION_VIGENTE', () => {
    expect(motivosDeAtencionDelResponsable(tarea(), activo, [conBaja])).toEqual([
      'SIN_ASIGNACION_VIGENTE',
    ]);
  });

  it('sin ninguna asignación: SIN_ASIGNACION_VIGENTE', () => {
    expect(motivosDeAtencionDelResponsable(tarea(), activo, [])).toEqual([
      'SIN_ASIGNACION_VIGENTE',
    ]);
  });

  it('una asignación vigente en OTRO proyecto no sirve', () => {
    const otroProyecto = asignacion({ id_proyecto: IDS.proyectoAjeno });
    expect(motivosDeAtencionDelResponsable(tarea(), activo, [otroProyecto])).toEqual([
      'SIN_ASIGNACION_VIGENTE',
    ]);
  });

  it('una asignación vigente de OTRA persona no sirve', () => {
    const deOtro = asignacion({ id_practicante: IDS.practicanteAjeno });
    expect(motivosDeAtencionDelResponsable(tarea(), activo, [deOtro])).toEqual([
      'SIN_ASIGNACION_VIGENTE',
    ]);
  });

  it('con una baja y una asignación nueva (volvió al proyecto) no hay nada que señalar', () => {
    const nueva = asignacion({ id: 'a-nueva', fecha_alta: '2026-04-01' });
    expect(motivosDeAtencionDelResponsable(tarea(), activo, [conBaja, nueva])).toEqual([]);
  });

  it('cuenta inactiva y sin asignación a la vez: los dos motivos, en el orden de la lista', () => {
    expect(motivosDeAtencionDelResponsable(tarea(), inactivo, [conBaja])).toEqual([
      'CUENTA_INACTIVA',
      'SIN_ASIGNACION_VIGENTE',
    ]);
    expect(motivosDeAtencionDelResponsable(tarea(), undefined, [])).toEqual([
      'CUENTA_NO_ENCONTRADA',
      'SIN_ASIGNACION_VIGENTE',
    ]);
  });

  it.each(
    ESTADOS_TAREA.filter((e): e is Exclude<EstadoTarea, 'EN_PROGRESO'> => e !== 'EN_PROGRESO'),
  )('una tarea %s no se señala, aunque el responsable ya no pueda trabajar', (estado) => {
    expect(motivosDeAtencionDelResponsable(tarea({ estado }), inactivo, [conBaja])).toEqual([]);
  });

  it('EN_PROGRESO sin responsable no se señala', () => {
    expect(motivosDeAtencionDelResponsable(tarea({ id_practicante: null }), undefined, [])).toEqual(
      [],
    );
  });

  it('no modifica los datos de entrada', () => {
    const t = tarea();
    const asignaciones = [conBaja];
    const copiaTarea = structuredClone(t);
    const copiaAsignaciones = structuredClone(asignaciones);
    motivosDeAtencionDelResponsable(t, inactivo, asignaciones);
    expect(t).toEqual(copiaTarea);
    expect(asignaciones).toEqual(copiaAsignaciones);
  });

  it('la lista de motivos conocidos es la que usa la interfaz', () => {
    expect(MOTIVOS_ATENCION_RESPONSABLE).toEqual([
      'CUENTA_INACTIVA',
      'CUENTA_NO_ENCONTRADA',
      'SIN_ASIGNACION_VIGENTE',
    ]);
  });
});
