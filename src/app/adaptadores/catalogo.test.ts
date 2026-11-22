import { beforeEach, describe, expect, it } from 'vitest';
import { useAlmacen } from '@/data';
import { crearEntorno, listarCatalogoEvaluacion } from '@/services';
import { aCatalogo } from './catalogo';

const entorno = crearEntorno({ demoraMs: 0 });

async function catalogo() {
  const r = await listarCatalogoEvaluacion({ idActor: 'demo-admin' }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return aCatalogo(r.valor);
}

describe('aCatalogo', () => {
  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('trae todas las áreas con sus especialidades', async () => {
    const { areas } = await catalogo();

    expect(areas.map((a) => a.nombre)).toEqual([
      'Software',
      'Videojuegos',
      'Diseño UX/UI',
      'Datos e IA',
    ]);
    const software = areas.find((a) => a.id === 'area-sw')!;
    expect(software.especialidades.map((e) => e.nombre)).toEqual(
      expect.arrayContaining(['Frontend', 'Backend', 'Móvil']),
    );
    expect(software.activo).toBe(true);
  });

  it('el bloque trae todos los criterios, también el desactivado, y la suma solo cuenta los activos', async () => {
    const software = (await catalogo()).areas.find((a) => a.id === 'area-sw')!;

    expect(software.bloque.criterios.some((c) => !c.activo)).toBe(true);
    expect(software.bloque.criterios.find((c) => c.id === 'cri-sw-a5')).toMatchObject({
      nombre: 'Carta de recomendación',
      peso: 10,
      activo: false,
    });
    expect(software.bloque.suma).toBe(100);
    expect(software.bloque.valido).toBe(true);
    expect(software.bloque.mensajeInvalido).toBeNull();
  });

  it('un bloque que no suma 100 sale inválido con su mensaje', async () => {
    // Sin mutar los objetos de la semilla (se comparten entre pruebas).
    useAlmacen.setState((s) => ({
      datos: {
        ...s.datos,
        criterios: s.datos.criterios.map((c) => (c.id === 'cri-sw-a1' ? { ...c, peso: 50 } : c)),
      },
    }));

    const software = (await catalogo()).areas.find((a) => a.id === 'area-sw')!;

    expect(software.bloque.suma).toBe(120);
    expect(software.bloque.valido).toBe(false);
    expect(software.bloque.mensajeInvalido).toMatch(/sumar 100/);
  });
});
