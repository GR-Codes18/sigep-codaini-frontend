import { beforeEach, describe, expect, it } from 'vitest';
import { useAlmacen } from '@/data';
import { crearEntorno, obtenerDashboardAdministrador } from '@/services';
import { aDashboard } from './dashboard';

const entorno = crearEntorno({ demoraMs: 0 });

async function vista() {
  const r = await obtenerDashboardAdministrador({ idActor: 'demo-admin' }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return { origen: r.valor, filas: aDashboard(r.valor) };
}

describe('adaptador del Dashboard', () => {
  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('lleva las cuatro tarjetas tal como las entrega la consulta', async () => {
    const { origen, filas } = await vista();
    const t = origen.tarjetas;

    expect(filas.tarjetas).toEqual({
      postulaciones: {
        pendientes: t.postulaciones.pendientes,
        requierenRevision: t.postulaciones.requieren_revision,
      },
      proyectos: { activos: t.proyectos.activos, enPausa: t.proyectos.en_pausa },
      practicantes: { activos: t.practicantes.activos, sinProyecto: t.practicantes.sin_proyecto },
      tareasEsperando: {
        total: t.tareas_esperando_supervision.total,
        demoradas: t.tareas_esperando_supervision.demoradas,
      },
    });
    expect(filas.plazoDemoraDias).toBe(origen.plazo_demora_dias);
  });

  it('conserva el orden y los topes de cada bloque (la consulta los decide)', async () => {
    const { origen, filas } = await vista();

    expect(filas.postulaciones.map((p) => p.id)).toEqual(
      origen.postulaciones_pendientes.map((p) => p.id),
    );
    expect(filas.alertas.map((a) => a.titulo)).toEqual(origen.alertas.map((a) => a.titulo));
    expect(filas.porRevisar.map((t) => t.id)).toEqual(origen.por_revisar.map((t) => t.id));
    expect(filas.reuniones.map((r) => r.proyecto.id)).toEqual(
      origen.proximas_reuniones.map((r) => r.proyecto.id),
    );
    expect(filas.avances.map((a) => a.proyecto.id)).toEqual(
      origen.avance_proyectos.map((a) => a.proyecto.id),
    );
    expect(filas.totalAlertas).toBe(origen.total_alertas);
  });

  it('las postulaciones llevan el puntaje, la marca y el enlace a su detalle', async () => {
    const { origen, filas } = await vista();

    for (const [i, p] of origen.postulaciones_pendientes.entries()) {
      const fila = filas.postulaciones[i]!;
      expect(fila.puntajeTexto).toBe(p.puntaje === null ? 'Sin evaluar' : String(p.puntaje));
      expect(fila.requiereRevision).toBe(p.requiere_revision_manual);
      expect(fila.rutaDetalle).toBe(`/administrador/postulaciones/${p.id}`);
    }
  });

  it('las tareas por revisar dicen cuánto llevan esperando y enlazan a su detalle', async () => {
    const { origen, filas } = await vista();

    for (const [i, t] of origen.por_revisar.entries()) {
      const fila = filas.porRevisar[i]!;
      expect(fila.idLegible).toBe(t.id_legible);
      expect(fila.rutaDetalle).toBe(`/administrador/tareas/${t.id}`);
      expect(fila.esperaTexto).toMatch(/^(Desde hoy|Lleva \d+ días?)$/);
    }
  });

  it('el avance sin tareas es «Sin tareas» y no un cero', async () => {
    const { origen } = await vista();
    const sinTareas = aDashboard({
      ...origen,
      avance_proyectos: origen.avance_proyectos.map((a) => ({ ...a, avance: null })),
    });

    for (const a of sinTareas.avances) {
      expect(a.avanceTexto).toBe('Sin tareas');
      expect(a.porcentaje).toBe(0);
    }
  });

  it('una reunión sin definir se dice así', async () => {
    const { origen } = await vista();
    const r = aDashboard({
      ...origen,
      proximas_reuniones: origen.proximas_reuniones.map((x) => ({
        ...x,
        dia_reunion: null,
        hora_reunion: null,
        proxima: null,
      })),
    });

    for (const fila of r.reuniones) {
      expect(fila.reunionTexto).toBe('Sin definir');
      expect(fila.proximaTexto).toBe('Sin definir');
    }
  });
});
