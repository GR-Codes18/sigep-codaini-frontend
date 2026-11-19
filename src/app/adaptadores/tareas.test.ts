import { beforeEach, describe, expect, it } from 'vitest';
import { useAlmacen } from '@/data';
import { crearEntorno, listarTareas } from '@/services';
import { aTareas } from './tareas';

const ADMIN = 'demo-admin';
const entorno = crearEntorno({ demoraMs: 0 });

async function listado() {
  const r = await listarTareas({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

describe('aTareas', () => {
  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  it('conserva el orden y los contadores de la consulta', async () => {
    const lista = await listado();

    const vista = aTareas(lista);

    expect(vista.filas.map((f) => f.id)).toEqual(lista.tareas.map((t) => t.id));
    expect(vista.contadores).toEqual(lista.contadores);
  });

  it('presenta el ID legible, el proyecto, el estado y el responsable tal como los entrega la consulta', async () => {
    const lista = await listado();
    const vista = aTareas(lista);

    for (const [i, t] of lista.tareas.entries()) {
      const fila = vista.filas[i]!;
      expect(fila.idLegible).toBe(t.id_legible);
      expect(fila.proyecto).toEqual(t.proyecto);
      expect(fila.estado).toBe(t.estado);
      expect(fila.responsable).toBe(t.responsable);
      expect(fila.idResponsable).toBe(t.id_practicante);
      expect(fila.vencida).toBe(t.vencida);
      expect(fila.requiereSupervision).toBe(t.requiere_supervision);
    }
  });

  it('la etiqueta del Pull Request es la que la consulta ya filtró (§7.3), no la que guarda la tarea', async () => {
    const lista = await listado();

    const vista = aTareas(lista);

    expect(vista.filas.map((f) => f.estadoPr)).toEqual(
      lista.tareas.map((t) => t.etiqueta_pr_visible),
    );
  });

  it('la fecha límite se muestra como «dd/MM/yyyy»', async () => {
    const lista = await listado();
    const base = lista.tareas[0]!;

    const vista = aTareas({ ...lista, tareas: [{ ...base, fecha_limite: '2026-12-05' }] });

    expect(vista.filas[0]!.fechaLimite).toBe('2026-12-05');
    expect(vista.filas[0]!.fechaLimiteTexto).toBe('05/12/2026');
  });

  it('lleva los proyectos donde se puede crear una tarea tal como llegan de la consulta', async () => {
    const lista = await listado();

    const vista = aTareas(lista);

    expect(vista.proyectosParaCrear).toEqual(lista.proyectos_para_crear);
    expect(vista.proyectosParaCrear.length).toBeGreaterThan(0);
  });

  it('lleva los días de espera de las que esperan supervisión', async () => {
    const lista = await listado();

    const vista = aTareas(lista);

    expect(vista.filas.map((f) => f.diasEsperando)).toEqual(
      lista.tareas.map((t) => t.dias_esperando),
    );
    expect(vista.filas.some((f) => f.diasEsperando !== null)).toBe(true);
  });
});
