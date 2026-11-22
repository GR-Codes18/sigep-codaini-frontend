import { beforeEach, describe, expect, it } from 'vitest';
import { useAlmacen } from '@/data';
import {
  crearEntorno,
  listarMisProyectos,
  obtenerEquipoProyecto,
  obtenerProyecto,
  obtenerResumenProyectoAnterior,
} from '@/services';
import {
  aEquipoPracticante,
  aMisProyectos,
  aResumenAnterior,
  aResumenProyectoPracticante,
  claseDeProyecto,
} from './misProyectos';

const entorno = crearEntorno({ demoraMs: 0 });

async function mis(idActor: string) {
  const r = await listarMisProyectos({ idActor }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

describe('adaptador de Mis proyectos del Practicante', () => {
  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('las tarjetas vigentes llevan supervisor, carga, disponibles y reunión, y la barra de avance', async () => {
    const v = await mis('demo-practicante');
    const vista = aMisProyectos(v);

    const t = vista.vigentes[0]!;
    const origen = v.vigentes[0]!;
    expect(t.detalles.map((d) => d.etiqueta)).toEqual([
      'Supervisor',
      'Mi carga',
      'Disponibles para tomar',
      'Próxima reunión',
    ]);
    expect(t.detalles[1]!.valor).toBe(String(origen.mi_carga));
    expect(t.detalles[2]!.valor).toBe(String(origen.tareas_disponibles));
    expect(t.avance).toBe(origen.avance?.porcentaje);
  });

  it('un proyecto sin tareas no dibuja una barra en cero', async () => {
    const v = await mis('demo-practicante');
    const vista = aMisProyectos({
      ...v,
      vigentes: v.vigentes.map((p) => ({ ...p, avance: null })),
    });

    expect(vista.vigentes[0]!.avance).toBeUndefined();
  });

  it('las tarjetas anteriores solo llevan supervisor y periodo, sin avance, carga ni reunión', async () => {
    const v = await mis('usr-pra-03');
    const vista = aMisProyectos(v);

    const a = vista.anteriores[0]!;
    expect(a.motivo).toBe('YA_NO_PARTICIPAS');
    expect(a.detalles.map((d) => d.etiqueta)).toEqual(['Supervisor', 'Participaste']);
    expect(a.detalles[1]!.valor).toMatch(/^\d{1,2} \S+ \d{4} – \d{1,2} \S+ \d{4}$/);
    expect(Object.keys(a)).not.toContain('avance');
  });

  it('el periodo sin fin registrado dice «Desde el …»', async () => {
    const v = await mis('usr-pra-15');
    const vista = aMisProyectos({
      ...v,
      anteriores: v.anteriores.map((p) => ({ ...p, fecha_fin: null })),
    });

    expect(vista.anteriores[0]!.detalles[1]!.valor).toMatch(/^Desde el /);
  });

  it('claseDeProyecto distingue lo vigente, lo anterior y lo ajeno', async () => {
    const v = await mis('usr-pra-03');

    expect(claseDeProyecto(v, 'pry-pl2d')).toBe('VIGENTE');
    expect(claseDeProyecto(v, 'pry-tie')).toBe('ANTERIOR');
    expect(claseDeProyecto(v, 'pry-rsv')).toBe('AJENO');
    expect(claseDeProyecto(v, 'no-existe')).toBe('AJENO');
  });

  it('el resumen del proyecto lleva la reunión, el repositorio, la rama base, mis tareas y mi actividad', async () => {
    const r = await obtenerProyecto(
      { idActor: 'demo-practicante', idProyecto: 'pry-pl2d' },
      entorno,
    );
    if (!r.ok || r.valor.vista !== 'PRACTICANTE') throw new Error('sin datos');

    const v = aResumenProyectoPracticante(r.valor);

    expect(v.repositorioUrl).toBe(r.valor.proyecto.repositorio_url);
    expect(v.ramaBase).toBe(r.valor.proyecto.rama_base);
    expect(v.misTareas.map((t) => t.id)).toEqual(r.valor.mis_tareas.map((t) => t.id));
    expect(v.miActividad).toHaveLength(r.valor.mi_actividad.length);
    expect(v.avanceTexto).toMatch(/^(\d+ de \d+ · \d+ %|Sin tareas)$/);
  });

  it('el equipo trae de los compañeros solo nombre, especialidad, carga, Discord y GitHub; del supervisor, Discord y GitHub', async () => {
    const r = await obtenerEquipoProyecto(
      { idActor: 'demo-practicante', idProyecto: 'pry-pl2d' },
      entorno,
    );
    if (!r.ok || r.valor.vista !== 'PRACTICANTE') throw new Error('sin datos');

    const v = aEquipoPracticante(r.valor);

    for (const c of v.companeros) {
      expect(Object.keys(c).sort()).toEqual([
        'carga',
        'discord',
        'especialidad',
        'github',
        'id',
        'nombre',
      ]);
    }
    expect(Object.keys(v.supervisor).sort()).toEqual(['discord', 'github', 'nombre']);
  });

  it('un Discord o un GitHub sin dato es «—»', async () => {
    const r = await obtenerEquipoProyecto(
      { idActor: 'demo-practicante', idProyecto: 'pry-pl2d' },
      entorno,
    );
    if (!r.ok || r.valor.vista !== 'PRACTICANTE') throw new Error('sin datos');

    const v = aEquipoPracticante({
      ...r.valor,
      companeros: r.valor.companeros.map((c) => ({
        ...c,
        discord: null,
        cuenta_github: null,
        especialidad: null,
      })),
      supervisor: { ...r.valor.supervisor, discord: null, cuenta_github: null },
    });

    for (const c of v.companeros) {
      expect([c.discord, c.github]).toEqual(['—', '—']);
      expect(c.especialidad).toBe('Sin especialidad');
    }
    expect([v.supervisor.discord, v.supervisor.github]).toEqual(['—', '—']);
  });

  it('el resumen anterior lleva el periodo y las tareas terminadas', async () => {
    const r = await obtenerResumenProyectoAnterior(
      { idActor: 'usr-pra-15', idProyecto: 'pry-tie' },
      entorno,
    );
    if (!r.ok) throw new Error(r.mensaje);

    const v = aResumenAnterior(r.valor);

    expect(v.participacion?.tareasTerminadas).toBe(r.valor.participacion!.tareas_terminadas);
    expect(v.participacion?.periodoTexto).toMatch(/\d{4}/);
    expect(v.estado).toBe('FINALIZADO');
  });
});
