import { beforeEach, describe, expect, it } from 'vitest';
import { useAlmacen } from '@/data';
import {
  crearEntorno,
  listarPracticantes,
  obtenerConfiguracion,
  obtenerPracticante,
} from '@/services';
import { aDetallePracticante, aPracticantes, duracionDePracticaMeses } from './practicantes';

const ADMIN = 'demo-admin';
const entorno = crearEntorno({ demoraMs: 0 });

async function listado() {
  const r = await listarPracticantes({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

describe('adaptadores de practicantes', () => {
  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  describe('aPracticantes', () => {
    it('conserva el orden y los contadores de la consulta', async () => {
      const lista = await listado();

      const vista = aPracticantes(lista);

      expect(vista.filas.map((f) => f.id)).toEqual(lista.practicantes.map((p) => p.id));
      expect(vista.contadores).toEqual(lista.contadores);
    });

    it('presenta el estado, el «sin proyecto» y los proyectos tal como los entrega la consulta', async () => {
      const lista = await listado();
      const vista = aPracticantes(lista);

      for (const [i, p] of lista.practicantes.entries()) {
        const fila = vista.filas[i]!;
        expect(fila.estado).toBe(p.situacion.estado);
        expect(fila.sinProyecto).toBe(p.situacion.sin_proyecto);
        expect(fila.proyectos).toEqual(p.proyectos_activos);
        expect(fila.carga).toBe(p.carga);
      }
    });

    it('«Sin actividad» si nunca hizo una acción y una fecha legible si la hizo', async () => {
      const lista = await listado();
      const vista = aPracticantes({
        ...lista,
        practicantes: [
          { ...lista.practicantes[0]!, ultima_actividad: null },
          { ...lista.practicantes[1]!, ultima_actividad: '2026-11-07T19:30:00.000Z' },
        ],
      });

      expect(vista.filas[0]!.ultimaActividad).toBeNull();
      expect(vista.filas[0]!.ultimaActividadTexto).toBe('Sin actividad');
      expect(vista.filas[1]!.ultimaActividad).toEqual(new Date('2026-11-07T19:30:00.000Z'));
      expect(vista.filas[1]!.ultimaActividadTexto).toBe('7 nov 2026');
    });

    it('el texto del fin de la práctica sale de la situación que calculó la consulta', async () => {
      const lista = await listado();
      const base = lista.practicantes[0]!;
      const con = (fin: (typeof base)['fin']) =>
        aPracticantes({ ...lista, practicantes: [{ ...base, fin }] }).filas[0]!.fin;

      expect(con({ situacion: 'EN_CURSO', dias_restantes: 40 })?.texto).toBe('Faltan 40 días');
      expect(con({ situacion: 'AVISO', dias_restantes: 1 })?.texto).toBe('Faltan 1 día');
      expect(con({ situacion: 'FIN_HOY', dias_restantes: 0 })?.texto).toBe('Termina hoy');
      expect(con({ situacion: 'VENCIDA', dias_restantes: -3 })?.texto).toBe('Vencida hace 3 días');
      expect(con({ situacion: 'VENCIDA', dias_restantes: -1 })?.texto).toBe('Vencida hace 1 día');
      expect(con(null)).toBeNull();
    });

    it('la fecha de fin prevista se muestra como «d MMM yyyy»', async () => {
      const lista = await listado();
      const base = lista.practicantes[0]!;

      const vista = aPracticantes({
        ...lista,
        practicantes: [{ ...base, fecha_fin_prevista: '2027-03-09' }],
      });

      expect(vista.filas[0]!.finPrevistaTexto).toBe('9 mar 2027');
    });
  });

  describe('aDetallePracticante', () => {
    async function detalle(id: string) {
      const r = await obtenerPracticante({ idActor: ADMIN, idPracticante: id }, entorno);
      if (!r.ok) throw new Error(r.mensaje);
      return r.valor;
    }

    it('lleva las acciones y las tareas a liberar tal como llegan de la consulta', async () => {
      const origen = await detalle('usr-pra-03');

      const vista = aDetallePracticante(origen);

      expect(vista.acciones).toEqual(origen.acciones);
      expect(vista.tareasALiberar).toBe(origen.tareas_a_liberar);
      expect(vista.idEspecialidad).toBe(origen.practica.especialidad?.id ?? null);
    });

    it('separa proyectos actuales y anteriores con alta y baja legibles', async () => {
      const origen = await detalle('usr-pra-03');

      const vista = aDetallePracticante(origen);

      expect(vista.proyectosActuales).toHaveLength(origen.proyectos_actuales.length);
      expect(vista.proyectosActuales.every((p) => p.bajaTexto === null)).toBe(true);
      expect(vista.proyectosAnteriores.length).toBeGreaterThan(0);
      expect(vista.proyectosAnteriores.some((p) => p.bajaTexto !== null)).toBe(true);
    });

    it('«Sin área» y «Sin especialidad» si el catálogo ya no las tiene', async () => {
      const origen = await detalle('usr-pra-03');

      const vista = aDetallePracticante({
        ...origen,
        practica: { ...origen.practica, area: null, especialidad: null },
      });

      expect(vista.area).toBe('Sin área');
      expect(vista.especialidad).toBe('Sin especialidad');
      expect(vista.idEspecialidad).toBeNull();
    });
  });

  describe('duracionDePracticaMeses', () => {
    it('lee PRACTICA_DURACION_MESES de la configuración', async () => {
      const r = await obtenerConfiguracion({ idActor: ADMIN }, entorno);
      if (!r.ok) throw new Error(r.mensaje);

      expect(duracionDePracticaMeses(r.valor)).toBe(4);
    });

    it('es null si el parámetro no está', () => {
      expect(duracionDePracticaMeses({ secciones: [] })).toBeNull();
    });
  });
});
