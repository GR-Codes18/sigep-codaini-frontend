import { beforeEach, describe, expect, it } from 'vitest';
import { useAlmacen } from '@/data';
import {
  crearEntorno,
  listarPracticantesACargo,
  obtenerPracticanteACargo,
  type ListadoPracticantesACargo,
} from '@/services';
import { aDetallePracticanteACargo, aPracticantesACargo } from './practicantesACargo';

const SUPERVISOR = 'demo-supervisor';
const entorno = crearEntorno({ demoraMs: 0 });

async function listado(): Promise<ListadoPracticantesACargo> {
  const r = await listarPracticantesACargo({ idActor: SUPERVISOR }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

describe('adaptador de Practicantes a cargo', () => {
  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('conserva el orden, los contadores y la situación de la consulta', async () => {
    const v = await listado();
    const vista = aPracticantesACargo(v);

    expect(vista.filas.map((f) => f.id)).toEqual(v.practicantes.map((p) => p.id));
    expect(vista.contadores).toEqual(v.contadores);
    expect(vista.filas.map((f) => f.situacion)).toEqual(v.practicantes.map((p) => p.situacion));
  });

  it('una fila por persona, con sus proyectos sin repetir', async () => {
    const vista = aPracticantesACargo(await listado());

    expect(new Set(vista.filas.map((f) => f.id)).size).toBe(vista.filas.length);
    for (const f of vista.filas) {
      expect(new Set(f.proyectos.map((p) => p.id)).size).toBe(f.proyectos.length);
    }
  });

  it('la especialidad sin catálogo se dice «Sin especialidad» y no lleva área técnica', async () => {
    const v = await listado();
    const sinEspecialidad = {
      ...v,
      practicantes: v.practicantes.map((p) => ({ ...p, especialidad: null })),
    };

    const vista = aPracticantesACargo(sinEspecialidad);

    for (const f of vista.filas) {
      expect(f.especialidad).toBe('Sin especialidad');
      expect(Object.keys(f)).not.toContain('area');
    }
  });

  it('un anterior lleva la fecha de su última baja y un activo no', async () => {
    const v = await listado();
    const base = v.practicantes[0]!;
    const proyecto = base.proyectos[0]!;
    const vista = aPracticantesACargo({
      practicantes: [
        {
          ...base,
          situacion: 'ANTERIOR',
          proyectos: [
            { ...proyecto, fecha_baja: '2026-10-01' },
            {
              ...proyecto,
              proyecto: { ...proyecto.proyecto, id: 'otro', nombre: 'Otro' },
              fecha_baja: '2026-11-10',
            },
          ],
        },
        {
          ...base,
          id: 'activo',
          situacion: 'ACTIVO',
          proyectos: [{ ...proyecto, fecha_baja: null }],
        },
      ],
      contadores: { ACTIVOS: 1, ANTERIORES: 1 },
    });

    expect(vista.filas[0]!.bajaTexto).toBe('10 nov 2026');
    expect(vista.filas[0]!.proyectos).toHaveLength(2);
    expect(vista.filas[1]!.bajaTexto).toBeNull();
  });

  it('la última actividad sin acciones es «Sin actividad»', async () => {
    const v = await listado();
    const vista = aPracticantesACargo({
      ...v,
      practicantes: v.practicantes.map((p) => ({ ...p, ultima_actividad: null })),
    });

    for (const f of vista.filas) expect(f.ultimaActividadTexto).toBe('Sin actividad');
  });

  it('el detalle trae el contacto, la disponibilidad, la fecha de fin y no el área ni la postulación', async () => {
    const v = await listado();
    const id = v.practicantes[0]!.id;
    const r = await obtenerPracticanteACargo({ idActor: SUPERVISOR, idPracticante: id }, entorno);
    if (!r.ok) throw new Error(r.mensaje);

    const d = aDetallePracticanteACargo(r.valor);

    expect(d.celular).toBe(r.valor.celular);
    expect(d.fechaFinTexto).toMatch(/^\d{1,2} \S+ \d{4}$/);
    expect(d.proyectos.length).toBeGreaterThan(0);
    for (const p of d.proyectos) expect(p.altaTexto).toMatch(/^\d{1,2} \S+ \d{4}$/);
    expect(Object.keys(d)).not.toContain('area');
    expect(Object.keys(d)).not.toContain('postulacionOrigen');
    if (r.valor.disponibilidad_horaria !== null) {
      expect(d.disponibilidadTexto).toBe(`${r.valor.disponibilidad_horaria} horas por semana`);
    }
  });

  it('la disponibilidad sin indicar es null', async () => {
    const v = await listado();
    const r = await obtenerPracticanteACargo(
      { idActor: SUPERVISOR, idPracticante: v.practicantes[0]!.id },
      entorno,
    );
    if (!r.ok) throw new Error(r.mensaje);

    expect(
      aDetallePracticanteACargo({ ...r.valor, disponibilidad_horaria: null }).disponibilidadTexto,
    ).toBeNull();
  });
});
