import { beforeEach, describe, expect, it } from 'vitest';
import { useAlmacen } from '@/data';
import {
  crearEntorno,
  obtenerDashboardAdministrador,
  obtenerDashboardSupervisor,
  type DashboardSupervisor,
} from '@/services';
import { aAvances, aDashboard, aDashboardSupervisor, aPorRevisar, aReuniones } from './dashboard';

const entorno = crearEntorno({ demoraMs: 0 });

async function origen(): Promise<DashboardSupervisor> {
  const r = await obtenerDashboardSupervisor({ idActor: 'demo-supervisor' }, entorno);
  if (!r.ok || r.valor.vacio) throw new Error('sin datos');
  return r.valor;
}

describe('adaptador del Dashboard del Supervisor', () => {
  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('lleva las cuatro tarjetas tal como las entrega la consulta', async () => {
    const v = await origen();
    const vista = aDashboardSupervisor(v);
    if (vista.vacio) throw new Error('vacío');
    const t = v.tarjetas;

    expect(vista.tarjetas).toEqual({
      tareasEsperando: {
        total: t.tareas_esperando_supervision.total,
        demoradas: t.tareas_esperando_supervision.demoradas,
      },
      proyectos: { activos: t.proyectos.activos, enPausa: t.proyectos.en_pausa },
      practicantes: {
        activos: t.practicantes.activos,
        sinTareasEnProgreso: t.practicantes.sin_tareas_en_progreso,
      },
      tareasVencidas: { total: t.tareas_vencidas.total, sinAsignar: t.tareas_vencidas.sin_asignar },
    });
    expect(vista.plazoDemoraDias).toBe(v.plazo_demora_dias);
  });

  it('conserva el orden y los topes de cada bloque (los decide la consulta)', async () => {
    const v = await origen();
    const vista = aDashboardSupervisor(v);
    if (vista.vacio) throw new Error('vacío');

    expect(vista.porRevisar.map((t) => t.id)).toEqual(v.por_revisar.map((t) => t.id));
    expect(vista.alertas.map((a) => a.titulo)).toEqual(v.alertas.map((a) => a.titulo));
    expect(vista.totalAlertas).toBe(v.total_alertas);
    expect(vista.reuniones.map((r) => r.proyecto.id)).toEqual(
      v.proximas_reuniones.map((r) => r.proyecto.id),
    );
    expect(vista.avances.map((a) => a.proyecto.id)).toEqual(
      v.avance_proyectos.map((a) => a.proyecto.id),
    );
  });

  it('todos los enlaces van al panel del Supervisor', async () => {
    const vista = aDashboardSupervisor(await origen());
    if (vista.vacio) throw new Error('vacío');

    for (const t of vista.porRevisar) expect(t.rutaDetalle).toBe(`/supervisor/tareas/${t.id}`);
    for (const r of vista.reuniones)
      expect(r.rutaProyecto).toBe(`/supervisor/proyectos/${r.proyecto.id}`);
    for (const a of vista.avances)
      expect(a.rutaProyecto).toBe(`/supervisor/proyectos/${a.proyecto.id}`);
    for (const a of vista.alertas) {
      expect(a.rutaElemento === null || a.rutaElemento.startsWith('/supervisor/')).toBe(true);
    }
  });

  it('un supervisor sin proyectos es el estado vacío total', () => {
    expect(aDashboardSupervisor({ vacio: true })).toEqual({ vacio: true });
  });

  it('las funciones compartidas usan el rol para armar los enlaces y el Administrador por defecto', async () => {
    const v = await origen();

    expect(aPorRevisar(v.por_revisar)[0]!.rutaDetalle).toBe(
      `/administrador/tareas/${v.por_revisar[0]!.id}`,
    );
    expect(aPorRevisar(v.por_revisar, 'SUPERVISOR')[0]!.rutaDetalle).toBe(
      `/supervisor/tareas/${v.por_revisar[0]!.id}`,
    );
    expect(aReuniones(v.proximas_reuniones)[0]!.rutaProyecto).toMatch(
      /^\/administrador\/proyectos\//,
    );
    expect(aAvances(v.avance_proyectos, 'SUPERVISOR')[0]!.rutaProyecto).toMatch(
      /^\/supervisor\/proyectos\//,
    );
  });

  it('el adaptador del Administrador sigue igual: sus enlaces son los del Administrador', async () => {
    const r = await obtenerDashboardAdministrador({ idActor: 'demo-admin' }, entorno);
    if (!r.ok) throw new Error(r.mensaje);

    const vista = aDashboard(r.valor);

    for (const t of vista.porRevisar) expect(t.rutaDetalle).toBe(`/administrador/tareas/${t.id}`);
    for (const a of vista.avances)
      expect(a.rutaProyecto).toBe(`/administrador/proyectos/${a.proyecto.id}`);
  });

  it('un avance sin tareas dice «Sin tareas» y no un cero', async () => {
    const v = await origen();

    const filas = aAvances(
      v.avance_proyectos.map((a) => ({ ...a, avance: null })),
      'SUPERVISOR',
    );

    for (const f of filas) {
      expect(f.avanceTexto).toBe('Sin tareas');
      expect(f.porcentaje).toBe(0);
    }
  });
});
