import { beforeEach, describe, expect, it } from 'vitest';
import { useAlmacen } from '@/data';
import {
  crearEntorno,
  listarProyectos,
  obtenerEquipoProyecto,
  obtenerProyecto,
  type EventoConAutor,
} from '@/services';
import { aEventosLinea } from './eventos';
import { aEquipoProyecto, aProyectos, aResumenProyecto } from './proyectos';

const ADMIN = 'demo-admin';
const entorno = crearEntorno({ demoraMs: 0 });

async function listado() {
  const r = await listarProyectos({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

async function resumen(id: string) {
  const r = await obtenerProyecto({ idActor: ADMIN, idProyecto: id }, entorno);
  if (!r.ok || r.valor.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');
  return r.valor;
}

async function equipo(id: string) {
  const r = await obtenerEquipoProyecto({ idActor: ADMIN, idProyecto: id }, entorno);
  if (!r.ok || r.valor.vista !== 'GESTION') throw new Error('Se esperaba la vista de gestión.');
  return r.valor;
}

describe('adaptadores de proyectos', () => {
  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  describe('aProyectos', () => {
    it('conserva el orden y los contadores de la consulta', async () => {
      const lista = await listado();

      const vista = aProyectos(lista);

      expect(vista.filas.map((f) => f.id)).toEqual(lista.proyectos.map((p) => p.id));
      expect(vista.contadores).toEqual(lista.contadores);
    });

    it('presenta el estado, el supervisor y los números tal como los entrega la consulta', async () => {
      const lista = await listado();
      const vista = aProyectos(lista);

      for (const [i, p] of lista.proyectos.entries()) {
        const fila = vista.filas[i]!;
        expect(fila.estado).toBe(p.estado);
        expect(fila.supervisor).toEqual(p.supervisor);
        expect(fila.practicantesActivos).toBe(p.practicantes_activos);
        expect(fila.tareasEsperandoSupervision).toBe(p.tareas_esperando_supervision);
      }
    });

    it('el avance es «N de M · P %», o null si no hay tareas', async () => {
      const lista = await listado();
      const base = lista.proyectos[0]!;

      const vista = aProyectos({
        ...lista,
        proyectos: [
          { ...base, avance: { numerador: 12, denominador: 30, porcentaje: 40 } },
          { ...base, avance: null },
        ],
      });

      expect(vista.filas[0]!.avance).toEqual({
        terminadas: 12,
        total: 30,
        porcentaje: 40,
        texto: '12 de 30 · 40 %',
      });
      expect(vista.filas[1]!.avance).toBeNull();
    });

    it('la próxima reunión es la fecha y la hora, o «Sin definir»', async () => {
      const lista = await listado();
      const base = lista.proyectos[0]!;

      const vista = aProyectos({
        ...lista,
        proyectos: [
          {
            ...base,
            reunion: {
              dia_reunion: 'LUNES',
              hora_reunion: '10:00',
              // 10:00 en Perú (UTC−5).
              proxima: '2026-11-23T15:00:00.000Z',
            },
          },
          { ...base, reunion: { dia_reunion: null, hora_reunion: null, proxima: null } },
        ],
      });

      expect(vista.filas[0]!.proximaReunionTexto).toBe('23 nov 2026, 10:00');
      expect(vista.filas[1]!.proximaReunionTexto).toBe('Sin definir');
    });
  });

  describe('aResumenProyecto', () => {
    it('presenta los datos con fechas legibles, el repositorio y la rama base', async () => {
      const origen = await resumen('pry-pl2d');

      const vista = aResumenProyecto(origen);

      expect(vista.proyecto.codigo).toBe(origen.proyecto.codigo);
      expect(vista.proyecto.repositorioUrl).toBe(origen.proyecto.repositorio_url);
      expect(vista.proyecto.ramaBase).toBe(origen.proyecto.rama_base);
      expect(vista.proyecto.fechaInicioTexto).toMatch(/^\d{1,2} \S+ \d{4}$/);
      expect(vista.proyecto.fechaFinPrevistaTexto).toMatch(/^\d{1,2} \S+ \d{4}$/);
      expect(vista.proyecto.fechaFinRealTexto).toBeNull();
    });

    it('un proyecto finalizado muestra su fecha de finalización', async () => {
      const origen = await resumen('pry-tie');

      const vista = aResumenProyecto(origen);

      expect(origen.proyecto.estado).toBe('FINALIZADO');
      expect(vista.proyecto.fechaFinRealTexto === null).toBe(
        origen.proyecto.fecha_fin_real === null,
      );
    });

    it('las tareas por estado salen en el orden del flujo, con la cantidad de la consulta', async () => {
      const origen = await resumen('pry-pl2d');

      const vista = aResumenProyecto(origen);

      expect(vista.tareasPorEstado.map((t) => t.estado)).toEqual([
        'DISPONIBLE',
        'EN_PROGRESO',
        'ESPERANDO_SUPERVISION',
        'TERMINADA',
      ]);
      for (const t of vista.tareasPorEstado) {
        expect(t.cantidad).toBe(origen.tareas_por_estado[t.estado]);
      }
      expect(vista.tareasVencidas).toBe(origen.tareas_vencidas);
    });

    it('presenta la reunión como texto, o «Sin definir»', async () => {
      const origen = await resumen('pry-pl2d');

      const con = aResumenProyecto({
        ...origen,
        proyecto: {
          ...origen.proyecto,
          reunion: { dia_reunion: 'MIERCOLES', hora_reunion: '16:30', proxima: null },
        },
      });
      const sin = aResumenProyecto({
        ...origen,
        proyecto: {
          ...origen.proyecto,
          reunion: { dia_reunion: null, hora_reunion: null, proxima: null },
        },
      });

      expect(con.proyecto.reunionTexto).toMatch(/16:30/);
      expect(sin.proyecto.reunionTexto).toBe('Sin definir');
    });

    it('lleva las acciones, el ciclo de vida y los supervisores destino tal como llegan de la consulta', async () => {
      const origen = await resumen('pry-pl2d');

      const vista = aResumenProyecto(origen);

      expect(vista.acciones).toEqual(origen.acciones);
      expect(vista.cicloDeVida).toEqual({
        tareasEsperandoSupervision: origen.ciclo_de_vida.tareas_esperando_supervision,
        tareasALiberar: origen.ciclo_de_vida.tareas_a_liberar,
        supervisorInactivo: origen.ciclo_de_vida.supervisor_inactivo,
      });
      expect(vista.supervisoresDestino).toEqual(origen.supervisores_destino);
      expect(vista.cicloDeVida.tareasEsperandoSupervision).toBeGreaterThan(0);
    });

    it('lleva los enlaces y la actividad reciente', async () => {
      const origen = await resumen('pry-pl2d');

      const vista = aResumenProyecto(origen);

      expect(vista.enlaces).toEqual(
        origen.enlaces.map((e) => ({ id: e.id, nombre: e.nombre, url: e.url })),
      );
      expect(vista.actividadReciente).toHaveLength(origen.actividad_reciente.length);
    });
  });

  describe('aEquipoProyecto', () => {
    it('presenta los activos con su carga y los anteriores con alta y baja', async () => {
      const origen = await equipo('pry-pl2d');

      const vista = aEquipoProyecto(origen);

      expect(vista.activos.map((m) => m.id)).toEqual(origen.activos.map((m) => m.id));
      expect(vista.activos.map((m) => m.carga)).toEqual(origen.activos.map((m) => m.carga));
      expect(vista.anteriores.map((m) => m.id)).toEqual(origen.anteriores.map((m) => m.id));
    });

    it('lleva el estado del proyecto, si se puede asignar y, por miembro, si se puede quitar', async () => {
      const origen = await equipo('pry-pl2d');

      const vista = aEquipoProyecto(origen);

      expect(vista.estadoProyecto).toBe('ACTIVO');
      expect(vista.puedeAsignar).toBe(origen.puede_asignar);
      expect(vista.activos.map((m) => m.puedeQuitar)).toEqual(
        origen.activos.map((m) => m.puede_quitar),
      );
      expect(vista.activos.map((m) => m.tareasALiberar)).toEqual(
        origen.activos.map((m) => m.tareas_a_liberar),
      );
    });

    it('un proyecto finalizado no deja quitar a nadie ni asignar', async () => {
      const vista = aEquipoProyecto(await equipo('pry-tie'));

      expect(vista.estadoProyecto).toBe('FINALIZADO');
      expect(vista.puedeAsignar).toBe(false);
      expect(vista.activos.every((m) => !m.puedeQuitar)).toBe(true);
    });

    it('«Sin especialidad» si el catálogo ya no la tiene', async () => {
      const origen = await equipo('pry-pl2d');

      const vista = aEquipoProyecto({
        ...origen,
        activos: [{ ...origen.activos[0]!, especialidad: null }],
      });

      expect(vista.activos[0]!.especialidad).toBe('Sin especialidad');
    });
  });

  describe('eventos de proyecto en la línea de tiempo', () => {
    const evento = (tipo_accion: string, cambios: unknown[] = []): EventoConAutor =>
      ({
        evento: {
          id: 'e1',
          fecha: '2026-11-10T15:00:00.000Z',
          autor: { tipo: 'USUARIO', id_usuario: ADMIN },
          tipo_accion,
          elemento: { tipo: 'PROYECTO', id: 'pry-pl2d', etiqueta: 'PL2D' },
          id_proyecto: 'pry-pl2d',
          cambios,
          nota: null,
        },
        autor_nombre: 'Admin',
        autor_rol: 'ADMINISTRADOR',
      }) as unknown as EventoConAutor;

    it('pausar, reanudar, finalizar y reactivar no muestran un resumen de estado crudo', () => {
      const cambios = [{ campo: 'estado', valor_anterior: 'ACTIVO', valor_nuevo: 'EN_PAUSA' }];

      const lineas = aEventosLinea(
        [
          'PROYECTO_PAUSADO',
          'PROYECTO_REANUDADO',
          'PROYECTO_FINALIZADO',
          'PROYECTO_REACTIVADO',
        ].map((t) => evento(t, cambios)),
      );

      expect(lineas.map((l) => l.accion)).toEqual([
        'Proyecto pausado',
        'Proyecto reanudado',
        'Proyecto finalizado',
        'Proyecto reactivado',
      ]);
      for (const l of lineas) expect(l).not.toHaveProperty('resumen');
    });

    it('los demás eventos del proyecto tienen su texto', () => {
      const textos = aEventosLinea(
        [
          'PROYECTO_CREADO',
          'PROYECTO_EDITADO',
          'PROYECTO_REUNION_CAMBIADA',
          'PROYECTO_REPOSITORIO_CAMBIADO',
          'PROYECTO_RAMA_BASE_CAMBIADA',
          'PROYECTO_ENLACE_AGREGADO',
          'PROYECTO_ENLACE_EDITADO',
          'PROYECTO_ENLACE_QUITADO',
        ].map((t) => evento(t)),
      ).map((e) => e.accion);

      expect(textos).toEqual([
        'Proyecto creado',
        'Datos del proyecto actualizados',
        'Reunión semanal cambiada',
        'Repositorio cambiado',
        'Rama base cambiada',
        'Enlace agregado',
        'Enlace editado',
        'Enlace quitado',
      ]);
    });
  });
});
