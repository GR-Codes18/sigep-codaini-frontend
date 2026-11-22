import { beforeEach, describe, expect, it } from 'vitest';
import { ACCIONES_POR_CATEGORIA, TIPOS_ELEMENTO } from '@/domain';
import { useAlmacen } from '@/data';
import { crearEntorno, listarHistorial } from '@/services';
import {
  aHistorial,
  CATEGORIAS_DE_HISTORIAL,
  ETIQUETA_ACCION,
  ETIQUETA_CATEGORIA,
  ETIQUETA_TIPO_ELEMENTO,
  fechaHoraPeru,
} from './historial';

const ADMIN = 'demo-admin';
const entorno = crearEntorno({ demoraMs: 0 });

async function eventos() {
  const r = await listarHistorial({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor.eventos;
}

describe('adaptador del historial', () => {
  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  describe('etiquetas', () => {
    it('cada acción registrada de §5.7 tiene su nombre en español', () => {
      const acciones = Object.values(ACCIONES_POR_CATEGORIA).flat();
      expect(acciones.length).toBeGreaterThan(0);
      for (const accion of acciones) expect(ETIQUETA_ACCION[accion].length).toBeGreaterThan(0);
    });

    it('las ocho categorías de §5.7 y cada tipo de elemento tienen nombre', () => {
      expect(CATEGORIAS_DE_HISTORIAL).toHaveLength(8);
      for (const c of CATEGORIAS_DE_HISTORIAL)
        expect(ETIQUETA_CATEGORIA[c].length).toBeGreaterThan(0);
      for (const t of TIPOS_ELEMENTO) expect(ETIQUETA_TIPO_ELEMENTO[t].length).toBeGreaterThan(0);
      expect(ETIQUETA_CATEGORIA.PULL_REQUEST).toBe('Pull Request');
      expect(ETIQUETA_CATEGORIA.CUENTA_PROPIA).toBe('Cuenta propia');
    });
  });

  describe('fechaHoraPeru', () => {
    it('muestra la fecha y la hora en hora de Perú (UTC−5)', () => {
      // 02:00 UTC del 8 de noviembre es todavía el 7, a las 21:00, en Perú.
      expect(fechaHoraPeru('2026-11-08T02:00:00.000Z')).toMatch(/^7 nov 2026,? 21:00$/);
    });
  });

  describe('aHistorial', () => {
    it('conserva el orden de la consulta, del más reciente al más antiguo', async () => {
      const lista = await eventos();
      expect(lista.length).toBeGreaterThan(0);

      const { filas } = aHistorial(lista);

      expect(filas.map((f) => f.id)).toEqual(lista.map((e) => e.evento.id));
    });

    it('lleva autor, acción, categoría, elemento y nota tal como están guardados', async () => {
      const lista = await eventos();
      const { filas } = aHistorial(lista);

      for (const [i, item] of lista.entries()) {
        const fila = filas[i]!;
        expect(fila.accion).toBe(ETIQUETA_ACCION[item.evento.tipo_accion]);
        expect(fila.categoria).toBe(item.categoria);
        expect(fila.elementoEtiqueta).toBe(item.evento.elemento.etiqueta);
        expect(fila.nota).toBe(item.evento.nota);
        expect(fila.idProyecto).toBe(item.evento.id_proyecto);
        if (item.evento.autor.tipo === 'SISTEMA') {
          expect(fila.autor).toBe('Sistema');
          expect(fila.idAutor).toBeNull();
        } else {
          expect(fila.idAutor).toBe(item.evento.autor.id_usuario);
        }
      }
    });

    it('cada campo modificado trae su valor anterior y el nuevo, y «—» donde no había', async () => {
      const lista = await eventos();
      const { filas } = aHistorial(lista);
      const conCambios = filas.filter((f) => f.cambios.length > 0);
      expect(conCambios.length).toBeGreaterThan(0);

      for (const [i, item] of lista.entries()) {
        const fila = filas[i]!;
        expect(fila.cambios).toHaveLength(item.evento.cambios.length);
        for (const c of fila.cambios) {
          expect(c.anterior.length).toBeGreaterThan(0);
          expect(c.nuevo.length).toBeGreaterThan(0);
        }
      }
    });

    it('un cambio de estado se resume como «anterior → nuevo» con los nombres legibles', async () => {
      const { filas } = aHistorial(await eventos());
      const conEstado = filas.find(
        (f) => f.cambios.length === 1 && f.cambios[0]!.campo === 'Estado',
      );

      expect(conEstado).toBeDefined();
      expect(conEstado!.resumen).toBe(
        `${conEstado!.cambios[0]!.anterior} → ${conEstado!.cambios[0]!.nuevo}`,
      );
      expect(conEstado!.resumen).not.toMatch(/[A-Z]+_[A-Z]+/);
    });

    it('nunca muestra contraseñas: ningún campo ni valor del historial las menciona', async () => {
      const { filas } = aHistorial(await eventos());

      for (const f of filas) {
        for (const c of f.cambios) {
          expect(c.campo.toLowerCase()).not.toContain('contrase');
          expect(c.anterior).not.toContain('demo12345');
          expect(c.nuevo).not.toContain('demo12345');
        }
      }
    });

    it('un evento sin campos modificados no tiene resumen', () => {
      const { filas } = aHistorial([
        {
          categoria: 'TAREAS',
          autor_nombre: 'Ana',
          autor_rol: 'ADMINISTRADOR',
          evento: {
            id: 'ev-1',
            fecha: '2026-11-10T15:00:00.000Z',
            autor: { tipo: 'USUARIO', id_usuario: 'u1' },
            tipo_accion: 'TAREA_CREADA',
            elemento: { tipo: 'TAREA', id: 'tar-9', etiqueta: 'T-9 Título' },
            id_proyecto: null,
            cambios: [],
            nota: null,
          },
        },
      ]);

      expect(filas[0]!.resumen).toBeNull();
      expect(filas[0]!.cambios).toEqual([]);
    });

    it('varios campos modificados se resumen por su cantidad', () => {
      const { filas } = aHistorial([
        {
          categoria: 'PROYECTOS',
          autor_nombre: 'Ana',
          autor_rol: 'ADMINISTRADOR',
          evento: {
            id: 'ev-2',
            fecha: '2026-11-10T15:00:00.000Z',
            autor: { tipo: 'SISTEMA' },
            tipo_accion: 'PROYECTO_EDITADO',
            elemento: { tipo: 'PROYECTO', id: 'pry-1', etiqueta: 'Proyecto uno' },
            id_proyecto: 'pry-1',
            cambios: [
              { campo: 'nombre', valor_anterior: 'A', valor_nuevo: 'B' },
              { campo: 'rama_base', valor_anterior: null, valor_nuevo: 'main' },
            ],
            nota: 'Motivo',
          },
        },
      ]);

      expect(filas[0]!.resumen).toBe('2 campos modificados');
      expect(filas[0]!.cambios).toEqual([
        { campo: 'Nombre', anterior: 'A', nuevo: 'B' },
        { campo: 'Rama base', anterior: '—', nuevo: 'main' },
      ]);
      expect(filas[0]!.autor).toBe('Sistema');
    });
  });
});
