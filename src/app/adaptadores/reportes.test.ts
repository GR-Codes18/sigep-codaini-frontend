import { beforeEach, describe, expect, it } from 'vitest';
import { SEVERIDADES, TIPOS_REGLA_INSIGHT } from '@/domain';
import { useAlmacen } from '@/data';
import { crearEntorno, listarInsights, obtenerIndicadores } from '@/services';
import {
  aIndicadores,
  aInsights,
  diaVisiblePeru,
  ETIQUETA_REGLA,
  ETIQUETA_SEVERIDAD,
  rutaDelElemento,
  SIN_DATOS,
  textoDias,
  textoProporcion,
  textoUltimaActividad,
} from './reportes';

const ADMIN = 'demo-admin';
const entorno = crearEntorno({ demoraMs: 0 });

async function listado() {
  const r = await listarInsights({ idActor: ADMIN }, entorno);
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor;
}

describe('adaptadores de reportes', () => {
  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  describe('etiquetas', () => {
    it('cada regla y cada severidad tienen su nombre en español', () => {
      for (const t of TIPOS_REGLA_INSIGHT) expect(ETIQUETA_REGLA[t].length).toBeGreaterThan(0);
      for (const s of SEVERIDADES) expect(ETIQUETA_SEVERIDAD[s].length).toBeGreaterThan(0);
      expect(ETIQUETA_REGLA.POSIBLE_ATRASO_PROYECTO).toBe('Posible atraso del proyecto');
      expect(ETIQUETA_SEVERIDAD.CRITICO).toBe('Crítico');
    });
  });

  describe('rutaDelElemento', () => {
    it('lleva al detalle del elemento afectado, con la misma tabla que los avisos', () => {
      expect(rutaDelElemento('USUARIO', 'usr-pra-03')).toBe(
        '/administrador/practicantes/usr-pra-03',
      );
      expect(rutaDelElemento('PROYECTO', 'pry-pl2d')).toBe('/administrador/proyectos/pry-pl2d');
      expect(rutaDelElemento('TAREA', 'tar-1')).toBe('/administrador/tareas/tar-1');
      expect(rutaDelElemento('POSTULANTE', 'pos-9')).toBe('/administrador/postulaciones/pos-9');
    });

    it('un elemento sin detalle no tiene enlace', () => {
      expect(rutaDelElemento('PARAMETRO_CONFIGURACION', 'X')).toBeNull();
    });
  });

  describe('diaVisiblePeru', () => {
    it('corta el día en hora de Perú (UTC−5)', () => {
      // 02:00 UTC del 8 de noviembre es todavía el 7 en Perú.
      expect(diaVisiblePeru('2026-11-08T02:00:00.000Z')).toBe('7 nov 2026');
      expect(diaVisiblePeru('2026-11-08T05:00:00.000Z')).toBe('8 nov 2026');
    });
  });

  describe('aInsights', () => {
    it('conserva el orden y los contadores de la consulta', async () => {
      const lista = await listado();
      expect(lista.insights.length).toBeGreaterThan(0);

      const vista = aInsights(lista);

      expect(vista.filas.map((f) => f.titulo)).toEqual(lista.insights.map((i) => i.titulo));
      expect(vista.contadores).toEqual(lista.contadores);
    });

    it('lleva la severidad, el motivo, los proyectos y los permisos tal como llegan de la consulta', async () => {
      const lista = await listado();
      const vista = aInsights(lista);

      for (const [i, insight] of lista.insights.entries()) {
        const fila = vista.filas[i]!;
        expect(fila.tipoRegla).toBe(insight.tipo_regla);
        expect(fila.severidad).toBe(insight.severidad);
        expect(fila.motivo).toBe(insight.motivo);
        expect(fila.proyectos).toEqual(insight.proyectos);
        expect(fila.revisado).toBe(insight.revisado);
        expect(fila.puedeMarcarRevisado).toBe(insight.puede_marcar_revisado);
        expect(fila.puedeNotificar).toBe(insight.puede_notificar);
        expect(fila.rutaElemento).toBe(rutaDelElemento(insight.elemento.tipo, insight.elemento.id));
      }
    });

    it('la clave identifica la regla y el elemento (los insights no se guardan)', async () => {
      const vista = aInsights(await listado());

      expect(new Set(vista.filas.map((f) => f.clave)).size).toBe(vista.filas.length);
      for (const f of vista.filas) {
        expect(f.clave).toBe(`${f.tipoRegla}:${f.elemento.tipo}:${f.elemento.id}`);
      }
    });

    it('la fecha de detección es un día legible', async () => {
      const vista = aInsights(await listado());

      for (const f of vista.filas) expect(f.fechaDeteccionTexto).toMatch(/^\d{1,2} \S+ \d{4}$/);
    });
  });

  describe('textos de indicadores', () => {
    it('sin muestras es «Sin datos», nunca cero', () => {
      expect(textoDias(null)).toBe(SIN_DATOS);
      expect(textoProporcion(null)).toBe(SIN_DATOS);
      expect(textoDias(0)).toBe('0,0 días');
    });

    it('los días llevan un decimal con coma y la proporción trae el entero y la muestra', () => {
      expect(textoDias(1.54)).toBe('1,5 días');
      expect(textoProporcion({ numerador: 12, denominador: 30, porcentaje: 40 })).toBe(
        '40 % (12 de 30)',
      );
    });

    it('la última actividad es un día de Perú o «Sin actividad»', () => {
      expect(textoUltimaActividad(null)).toBe('Sin actividad');
      expect(textoUltimaActividad('2026-11-08T02:00:00.000Z')).toBe('7 nov 2026');
    });
  });

  describe('aIndicadores', () => {
    async function vista(dias = 30) {
      const r = await obtenerIndicadores({ idActor: ADMIN, dias }, entorno);
      if (!r.ok) throw new Error(r.mensaje);
      if (r.valor.vista !== 'ADMINISTRADOR') throw new Error('vista inesperada');
      return r.valor;
    }

    it('lleva el periodo en hora de Perú y una fila por proyecto y por practicante', async () => {
      const origen = await vista(30);
      const v = aIndicadores(origen);

      expect(v.dias).toBe(30);
      expect(v.periodoTexto).toMatch(/^Del .+ al .+ · hora de Perú$/);
      expect(v.porProyecto).toHaveLength(origen.por_proyecto.length);
      expect(v.porPracticante).toHaveLength(origen.por_practicante.length);
      expect(v.tareasTerminadas).toBe(origen.resumen.tareas_terminadas);
      expect(v.vacio).toBe(origen.vacio);
    });

    it('enlaza cada proyecto y cada practicante a su detalle', async () => {
      const v = aIndicadores(await vista());

      for (const f of v.porProyecto) {
        expect(f.rutaProyecto).toBe('/administrador/proyectos/' + f.proyecto.id);
      }
      for (const f of v.porPracticante) {
        expect(f.rutaPracticante).toBe('/administrador/practicantes/' + f.id);
      }
    });

    it('el puntaje por área lleva coma o «Sin datos»', async () => {
      const v = aIndicadores(await vista(365));

      for (const a of v.puntajePorArea) expect(a.puntaje).toMatch(/^(\d+,\d|Sin datos)$/);
    });
  });
});
