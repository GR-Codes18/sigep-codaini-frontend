import { describe, expect, it } from 'vitest';
import { TAREAS_EJEMPLO } from './datos';
import { accionesProvisionales } from './accionesProvisionales';

const [disponible, enProgreso, esperando, terminada] = TAREAS_EJEMPLO;
const claves = (a: ReturnType<typeof accionesProvisionales>) => a.map((x) => x.clave);

describe('accionesProvisionales', () => {
  it('el practicante toma una tarea disponible, salvo proyecto en pausa', () => {
    const ctx = { rol: 'PRACTICANTE' as const, esResponsable: false };
    expect(claves(accionesProvisionales(disponible, { ...ctx, proyectoEnPausa: false }))).toContain(
      'tomar',
    );
    expect(
      claves(accionesProvisionales(disponible, { ...ctx, proyectoEnPausa: true })),
    ).not.toContain('tomar');
  });

  it('el responsable envía a supervisión si la tarea la requiere', () => {
    const a = accionesProvisionales(enProgreso, {
      rol: 'PRACTICANTE',
      esResponsable: true,
      proyectoEnPausa: false,
    });
    expect(claves(a)).toContain('enviar');
    expect(claves(a)).not.toContain('terminar');
  });

  it('solo el supervisor aprueba o devuelve', () => {
    const base = { esResponsable: false, proyectoEnPausa: false };
    expect(claves(accionesProvisionales(esperando, { ...base, rol: 'SUPERVISOR' }))).toEqual([
      'aprobar',
      'devolver',
    ]);
    expect(accionesProvisionales(esperando, { ...base, rol: 'PRACTICANTE' })).toEqual([]);
    expect(accionesProvisionales(esperando, { ...base, rol: 'ADMINISTRADOR' })).toEqual([]);
  });

  it('reabrir es de supervisor y administrador, no del practicante', () => {
    const base = { esResponsable: true, proyectoEnPausa: false };
    expect(claves(accionesProvisionales(terminada, { ...base, rol: 'ADMINISTRADOR' }))).toContain(
      'reabrir',
    );
    expect(claves(accionesProvisionales(terminada, { ...base, rol: 'PRACTICANTE' }))).not.toContain(
      'reabrir',
    );
  });

  it('el responsable crea el PR cuando está pendiente', () => {
    const a = accionesProvisionales(esperando, {
      rol: 'PRACTICANTE',
      esResponsable: true,
      proyectoEnPausa: false,
    });
    expect(claves(a)).toContain('crear_pr');
  });
});
