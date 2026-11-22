import { beforeEach, describe, expect, it } from 'vitest';
import { useAlmacen } from '@/data';
import {
  crearEntorno,
  listarSupervisores,
  obtenerSupervisor,
  type EventoConAutor,
} from '@/services';
import { aEventosLinea } from './eventos';
import { aDetalleSupervisor, aSupervisores } from './supervisores';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const entorno = crearEntorno({ demoraMs: 0 });

async function listado() {
  const r = await listarSupervisores({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

async function detalle(id: string) {
  const r = await obtenerSupervisor({ idActor: ADMIN, idSupervisor: id }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

describe('adaptadores de supervisores', () => {
  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  describe('aSupervisores', () => {
    it('conserva el orden y los contadores de la consulta', async () => {
      const lista = await listado();

      const vista = aSupervisores(lista);

      expect(vista.filas.map((f) => f.id)).toEqual(lista.supervisores.map((s) => s.id));
      expect(vista.contadores).toEqual(lista.contadores);
    });

    it('presenta los números y el estado tal como los entrega la consulta', async () => {
      const lista = await listado();
      const vista = aSupervisores(lista);

      for (const [i, s] of lista.supervisores.entries()) {
        const fila = vista.filas[i]!;
        expect(fila.estado).toBe(s.estado);
        expect(fila.proyectosACargo).toBe(s.proyectos_a_cargo);
        expect(fila.practicantesACargo).toBe(s.practicantes_a_cargo);
        expect(fila.tareasPorRevisar).toBe(s.tareas_por_revisar);
      }
    });

    it('«Sin actividad» si nunca hizo una acción y una fecha legible si la hizo', async () => {
      const lista = await listado();
      const vista = aSupervisores({
        ...lista,
        supervisores: [
          { ...lista.supervisores[0]!, ultima_actividad: null },
          { ...lista.supervisores[1]!, ultima_actividad: '2026-11-07T19:30:00.000Z' },
        ],
      });

      expect(vista.filas[0]!.ultimaActividad).toBeNull();
      expect(vista.filas[0]!.ultimaActividadTexto).toBe('Sin actividad');
      expect(vista.filas[1]!.ultimaActividad).toEqual(new Date('2026-11-07T19:30:00.000Z'));
      expect(vista.filas[1]!.ultimaActividadTexto).toBe('7 nov 2026');
    });
  });

  describe('aDetalleSupervisor', () => {
    it('lleva los datos de contacto y la fecha de alta legible', async () => {
      const origen = await detalle(SUPERVISOR);

      const vista = aDetalleSupervisor(origen);

      expect(vista.correo).toBe(origen.datos.correo);
      expect(vista.celular).toBe(origen.datos.celular);
      expect(vista.discord).toBe(origen.datos.discord);
      expect(vista.cuentaGithub).toBe(origen.datos.cuenta_github);
      expect(vista.altaTexto).toMatch(/^\d{1,2} \S+ \d{4}$/);
    });

    it('presenta la reunión como texto, o «Sin definir»', async () => {
      const origen = await detalle(SUPERVISOR);
      const [primero, ...resto] = origen.proyectos_a_cargo;
      expect(primero).toBeDefined();

      const vista = aDetalleSupervisor({
        ...origen,
        proyectos_a_cargo: [
          { ...primero!, reunion: { dia_reunion: 'LUNES', hora_reunion: '10:00', proxima: null } },
          ...resto.map((p) => ({
            ...p,
            reunion: { dia_reunion: null, hora_reunion: null, proxima: null },
          })),
        ],
      });

      expect(vista.proyectosACargo[0]!.reunionTexto).toMatch(/10:00/);
      for (const p of vista.proyectosACargo.slice(1)) expect(p.reunionTexto).toBe('Sin definir');
    });

    it('conserva los días de espera y el proyecto de cada tarea por revisar', async () => {
      const origen = await detalle(SUPERVISOR);

      const vista = aDetalleSupervisor(origen);

      expect(vista.tareasPorRevisar.map((t) => t.diasEsperando)).toEqual(
        origen.tareas_por_revisar.map((t) => t.dias_esperando),
      );
      expect(vista.tareasPorRevisar.map((t) => t.proyecto)).toEqual(
        origen.tareas_por_revisar.map((t) => t.proyecto),
      );
    });

    it('la fecha de fin real de un proyecto anterior es legible, o null si no consta', async () => {
      const origen = await detalle(SUPERVISOR);

      const vista = aDetalleSupervisor({
        ...origen,
        proyectos_anteriores: [
          { proyecto: { id: 'p1', codigo: 'A', nombre: 'Uno' }, fecha_fin_real: '2026-03-09' },
          { proyecto: { id: 'p2', codigo: 'B', nombre: 'Dos' }, fecha_fin_real: null },
        ],
      });

      expect(vista.proyectosAnteriores[0]!.finRealTexto).toBe('9 mar 2026');
      expect(vista.proyectosAnteriores[1]!.finRealTexto).toBeNull();
    });
  });

  describe('eventos de supervisor en la línea de tiempo', () => {
    const evento = (tipo_accion: string, cambios: unknown[] = []): EventoConAutor =>
      ({
        evento: {
          id: 'e1',
          fecha: '2026-11-10T15:00:00.000Z',
          autor: { tipo: 'USUARIO', id_usuario: ADMIN },
          tipo_accion,
          elemento: { tipo: 'USUARIO', id: SUPERVISOR, etiqueta: 'X' },
          id_proyecto: null,
          cambios,
          nota: null,
        },
        autor_nombre: 'Admin',
        autor_rol: 'ADMINISTRADOR',
      }) as unknown as EventoConAutor;

    it('desactivar y reactivar no muestran el resumen «ACTIVO → INACTIVO»', () => {
      const cambios = [{ campo: 'estado', valor_anterior: 'ACTIVO', valor_nuevo: 'INACTIVO' }];

      const [desactivado, reactivado] = aEventosLinea([
        evento('SUPERVISOR_DESACTIVADO', cambios),
        evento('SUPERVISOR_REACTIVADO', cambios),
      ]);

      expect(desactivado!.accion).toBe('Cuenta desactivada');
      expect(desactivado).not.toHaveProperty('resumen');
      expect(reactivado!.accion).toBe('Cuenta reactivada');
      expect(reactivado).not.toHaveProperty('resumen');
    });

    it('los demás eventos del supervisor tienen su texto', () => {
      const textos = aEventosLinea(
        [
          'SUPERVISOR_CREADO',
          'SUPERVISOR_EDITADO',
          'SUPERVISOR_CONTRASENA_RESTABLECIDA',
          'SUPERVISOR_PROYECTOS_REASIGNADOS',
          'PROYECTO_SUPERVISOR_CAMBIADO',
        ].map((t) => evento(t)),
      ).map((e) => e.accion);

      expect(textos).toEqual([
        'Cuenta de supervisor creada',
        'Datos del supervisor actualizados',
        'Contraseña restablecida',
        'Proyectos reasignados',
        'Supervisor del proyecto cambiado',
      ]);
    });
  });
});
