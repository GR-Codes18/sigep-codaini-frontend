import { describe, expect, it } from 'vitest';
import {
  CATALOGO_PARAMETROS,
  ESTADOS_PR,
  ESTADOS_TAREA,
  calcularPuntaje,
  devolucionVigente,
  estaVencida,
  etiquetaPRVisible,
  fechaFinPrevista,
  formatearIdLegible,
  insightsParaUsuario,
  calcularInsights,
  siguienteNumeroTarea,
  tiempoCicloMs,
  validarCodigoProyecto,
  vecesDevuelta,
  type EventoHistorial,
  type Id,
  type Insight,
  type Tarea,
  type TipoReglaInsight,
  type UmbralesInsight,
} from '@/domain';
import { crearCriterios } from './semilla/catalogos';
import { CONTRASENA_DEMO } from './semilla/personas';
import { validarDatos } from './esquemas';
import { crearSemilla } from './semilla';
import type { DatosAlmacen } from './tipos';

/**
 * Cuatro «ahora» con la hora del día en lugares distintos (incluido un 29 de febrero y las
 * primeras horas del día en Perú): la semilla debe cumplir lo mismo con todos.
 */
const AHORAS = [
  new Date('2026-11-17T18:30:00.000Z'),
  new Date('2027-03-01T05:10:00.000Z'),
  new Date('2028-02-29T03:00:00.000Z'),
  new Date('2026-07-01T23:50:00.000Z'),
];

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const DEMO_ADMIN = 'demo-admin';
const DEMO_SUPERVISOR = 'demo-supervisor';
const DEMO_PRACTICANTE = 'demo-practicante';

function umbralesDe(datos: DatosAlmacen): UmbralesInsight {
  const umbrales: Record<string, number> = {};
  for (const p of datos.parametros) {
    if (p.clave.startsWith('INSIGHT_') && p.valor.tipo === 'numero')
      umbrales[p.clave] = p.valor.valor;
  }
  return umbrales as UmbralesInsight;
}

function insightsDe(datos: DatosAlmacen, ahora: string, idUsuario: Id = DEMO_ADMIN): Insight[] {
  const usuario = datos.usuarios.find((u) => u.id === idUsuario);
  if (usuario === undefined) throw new Error(`No existe ${idUsuario}`);
  const resultado = insightsParaUsuario(
    usuario,
    datos,
    umbralesDe(datos),
    datos.revisiones_insight,
    ahora,
  );
  if (!resultado.ok) throw new Error(resultado.mensaje);
  return resultado.insights;
}

const elementosDe = (insights: Insight[], regla: TipoReglaInsight) =>
  insights.filter((i) => i.tipo_regla === regla);

const eventosDeTarea = (datos: DatosAlmacen, id: Id): EventoHistorial[] =>
  datos.historial.filter((e) => e.elemento.tipo === 'TAREA' && e.elemento.id === id);

const idLegible = (datos: DatosAlmacen, tarea: Tarea) => {
  const proyecto = datos.proyectos.find((p) => p.id === tarea.id_proyecto);
  const resultado = formatearIdLegible(proyecto?.codigo ?? '', tarea.numero);
  return resultado.ok ? resultado.id : '?';
};

describe('semilla: es determinista y exige un «ahora» válido', () => {
  it('con el mismo «ahora» produce exactamente los mismos datos', () => {
    const a = JSON.stringify(crearSemilla(AHORAS[0]));
    const b = JSON.stringify(crearSemilla(AHORAS[0]));
    expect(a).toBe(b);
  });

  it('un «ahora» inválido se rechaza', () => {
    expect(() => crearSemilla(new Date('no es una fecha'))).toThrow(RangeError);
  });
});

describe('semilla: catálogos de evaluación', () => {
  const criterios = crearCriterios();

  it('los pesos de los criterios activos de cada bloque suman 100', () => {
    const bloques = new Map<string, number>();
    for (const c of criterios.filter((x) => x.activo)) {
      const clave = `${c.id_area_tecnica}|${c.id_especialidad ?? 'AREA'}`;
      bloques.set(clave, (bloques.get(clave) ?? 0) + c.peso);
    }
    expect(bloques.size).toBe(4 + 9);
    for (const [bloque, suma] of bloques) expect(suma, bloque).toBe(100);
  });

  it('hay un criterio desactivado (no se borra, se desactiva) y los pesos son enteros > 0', () => {
    expect(criterios.filter((c) => !c.activo)).toHaveLength(1);
    for (const c of criterios) {
      expect(Number.isInteger(c.peso) && c.peso > 0, c.id).toBe(true);
    }
  });
});

describe.each(AHORAS)('semilla con ahora = %s', (fecha) => {
  const ahora = fecha.toISOString();
  const datos = crearSemilla(fecha);
  const hoy = (() => {
    const d = new Date(fecha.getTime() - 5 * 3_600_000);
    return d.toISOString().slice(0, 10);
  })();
  const proyectoDe = (codigo: string) => datos.proyectos.find((p) => p.codigo === codigo)!;
  const usuarioDe = (id: Id) => datos.usuarios.find((u) => u.id === id)!;

  describe('forma y cantidades', () => {
    it('cumple la forma completa de las 17 colecciones (validarDatos)', () => {
      expect(validarDatos(datos)).not.toBeNull();
      for (const [coleccion, filas] of Object.entries(datos)) {
        expect(filas.length, coleccion).toBeGreaterThan(0);
      }
    });

    it('trae 1 administrador, 3 supervisores, 24 practicantes y 5 proyectos', () => {
      const porRol = (rol: string) => datos.usuarios.filter((u) => u.rol === rol).length;
      expect(porRol('ADMINISTRADOR')).toBe(1);
      expect(porRol('SUPERVISOR')).toBe(3);
      expect(porRol('PRACTICANTE')).toBe(24);
      expect(datos.supervisores).toHaveLength(3);
      expect(datos.practicantes).toHaveLength(24);
      expect(datos.proyectos).toHaveLength(5);
      expect(datos.areas_tecnicas).toHaveLength(4);
    });

    it('trae unas 40 tareas repartidas en los cuatro estados', () => {
      expect(datos.tareas.length).toBeGreaterThanOrEqual(38);
      expect(datos.tareas.length).toBeLessThanOrEqual(46);
      for (const estado of ESTADOS_TAREA) {
        expect(
          datos.tareas.filter((t) => t.estado === estado).length,
          estado,
        ).toBeGreaterThanOrEqual(4);
      }
    });

    it('trae 24 aprobadas y 18 postulaciones en flujo (pendientes, reconsiderada y rechazadas)', () => {
      const cuenta = (estado: string) =>
        datos.postulantes.filter((p) => p.estado === estado).length;
      expect(cuenta('APROBADA')).toBe(24);
      expect(cuenta('PENDIENTE')).toBe(10);
      expect(cuenta('RECHAZADA')).toBe(8);
      expect(cuenta('PENDIENTE') + cuenta('RECHAZADA')).toBe(18);
      expect(datos.evaluaciones).toHaveLength(datos.postulantes.length);
    });

    it('los parámetros de configuración cubren el catálogo con id === clave', () => {
      expect(datos.parametros).toHaveLength(CATALOGO_PARAMETROS.length);
      for (const p of datos.parametros) {
        expect(p.id, p.clave).toBe(p.clave);
        expect(p.valor_predeterminado).toEqual(p.valor);
      }
    });

    it('incluye las tres cuentas activas definidas para los accesos rápidos', () => {
      const cuentas = [
        {
          id: 'demo-admin',
          nombre: 'Administrador Demo',
          correo: 'admin@codaini.demo',
          rol: 'ADMINISTRADOR',
        },
        {
          id: 'demo-supervisor',
          nombre: 'Supervisor Demo',
          correo: 'supervisor@codaini.demo',
          rol: 'SUPERVISOR',
        },
        {
          id: 'demo-practicante',
          nombre: 'Practicante Demo',
          correo: 'practicante@codaini.demo',
          rol: 'PRACTICANTE',
        },
      ] as const;

      for (const cuenta of cuentas) {
        const usuario = usuarioDe(cuenta.id);
        expect(usuario).toMatchObject({
          nombre: cuenta.nombre,
          correo: cuenta.correo,
          rol: cuenta.rol,
          estado: 'ACTIVO',
          debe_cambiar_contrasena: false,
        });
        expect(usuario.contrasena).toBe(CONTRASENA_DEMO);
      }
    });
  });

  describe('integridad referencial', () => {
    const idsDe = (filas: readonly { id: Id }[]) => new Set(filas.map((f) => f.id));
    const eliminadas = new Set(
      datos.historial.filter((e) => e.tipo_accion === 'TAREA_ELIMINADA').map((e) => e.elemento.id),
    );
    const existentes = {
      USUARIO: idsDe(datos.usuarios),
      PROYECTO: idsDe(datos.proyectos),
      TAREA: new Set([...datos.tareas.map((t) => t.id), ...eliminadas]),
      POSTULANTE: idsDe(datos.postulantes),
      AREA_TECNICA: idsDe(datos.areas_tecnicas),
      ESPECIALIDAD: idsDe(datos.especialidades),
      CRITERIO_EVALUACION: idsDe(datos.criterios),
      PARAMETRO_CONFIGURACION: idsDe(datos.parametros),
    };

    it('los IDs son únicos dentro de cada colección', () => {
      const colecciones: [string, string[]][] = [
        ['usuarios', datos.usuarios.map((x) => x.id)],
        ['proyectos', datos.proyectos.map((x) => x.id)],
        ['enlaces', datos.enlaces_proyecto.map((x) => x.id)],
        ['asignaciones', datos.asignaciones.map((x) => x.id)],
        ['tareas', datos.tareas.map((x) => x.id)],
        ['postulantes', datos.postulantes.map((x) => x.id)],
        ['areas', datos.areas_tecnicas.map((x) => x.id)],
        ['especialidades', datos.especialidades.map((x) => x.id)],
        ['criterios', datos.criterios.map((x) => x.id)],
        ['evaluaciones', datos.evaluaciones.map((x) => x.id)],
        ['detalles', datos.detalles_evaluacion.map((x) => x.id)],
        ['historial', datos.historial.map((x) => x.id)],
        ['notificaciones', datos.notificaciones.map((x) => x.id)],
        ['revisiones', datos.revisiones_insight.map((x) => x.id)],
        ['parametros', datos.parametros.map((x) => x.id)],
        ['practicantes', datos.practicantes.map((x) => x.id_usuario)],
        ['supervisores', datos.supervisores.map((x) => x.id_usuario)],
      ];
      for (const [nombre, ids] of colecciones) {
        expect(new Set(ids).size, nombre).toBe(ids.length);
      }
    });

    it('cada detalle de persona apunta a un usuario del rol correcto y a su postulación de origen', () => {
      for (const p of datos.practicantes) {
        expect(usuarioDe(p.id_usuario).rol, p.id_usuario).toBe('PRACTICANTE');
        const origen = datos.postulantes.find((x) => x.id === p.id_postulante);
        expect(origen?.estado, p.id_usuario).toBe('APROBADA');
        expect(origen?.correo, p.id_usuario).toBe(usuarioDe(p.id_usuario).correo);
        const especialidad = datos.especialidades.find((e) => e.id === p.id_especialidad);
        expect(especialidad?.id_area_tecnica, p.id_usuario).toBe(p.id_area_tecnica);
      }
      for (const s of datos.supervisores) expect(usuarioDe(s.id_usuario).rol).toBe('SUPERVISOR');
      const origenes = datos.practicantes.map((p) => p.id_postulante);
      expect(new Set(origenes).size).toBe(origenes.length);
    });

    it('proyectos, enlaces, asignaciones y tareas apuntan a registros que existen', () => {
      for (const p of datos.proyectos) {
        expect(usuarioDe(p.id_supervisor)?.rol, p.id).toBe('SUPERVISOR');
      }
      for (const e of datos.enlaces_proyecto)
        expect(existentes.PROYECTO.has(e.id_proyecto)).toBe(true);
      for (const a of datos.asignaciones) {
        expect(usuarioDe(a.id_practicante)?.rol, a.id).toBe('PRACTICANTE');
        expect(existentes.PROYECTO.has(a.id_proyecto), a.id).toBe(true);
      }
      for (const t of datos.tareas) {
        expect(existentes.PROYECTO.has(t.id_proyecto), t.id).toBe(true);
        if (t.id_practicante !== null) {
          expect(usuarioDe(t.id_practicante)?.rol, t.id).toBe('PRACTICANTE');
        }
      }
    });

    it('postulantes, evaluaciones, detalles y criterios apuntan a registros que existen', () => {
      for (const p of datos.postulantes) {
        const especialidad = datos.especialidades.find((e) => e.id === p.id_especialidad);
        expect(especialidad?.id_area_tecnica, p.id).toBe(p.id_area_tecnica);
      }
      for (const c of datos.criterios) {
        expect(existentes.AREA_TECNICA.has(c.id_area_tecnica), c.id).toBe(true);
        if (c.id_especialidad !== null) {
          const especialidad = datos.especialidades.find((e) => e.id === c.id_especialidad);
          expect(especialidad?.id_area_tecnica, c.id).toBe(c.id_area_tecnica);
        }
      }
      for (const e of datos.evaluaciones)
        expect(existentes.POSTULANTE.has(e.id_postulante)).toBe(true);
      for (const d of datos.detalles_evaluacion) {
        expect(
          datos.evaluaciones.some((e) => e.id === d.id_evaluacion),
          d.id,
        ).toBe(true);
        expect(existentes.CRITERIO_EVALUACION.has(d.id_criterio), d.id).toBe(true);
      }
    });

    it('historial, notificaciones y revisiones apuntan a registros que existen', () => {
      for (const e of datos.historial) {
        if (e.autor.tipo === 'USUARIO')
          expect(existentes.USUARIO.has(e.autor.id_usuario), e.id).toBe(true);
        expect(existentes[e.elemento.tipo].has(e.elemento.id), e.id).toBe(true);
        if (e.id_proyecto !== null) expect(existentes.PROYECTO.has(e.id_proyecto), e.id).toBe(true);
      }
      for (const n of datos.notificaciones) {
        expect(existentes.USUARIO.has(n.id_destinatario), n.id).toBe(true);
        expect(existentes[n.elemento.tipo].has(n.elemento.id), n.id).toBe(true);
      }
      for (const r of datos.revisiones_insight) {
        expect(existentes.USUARIO.has(r.id_usuario)).toBe(true);
        expect(existentes[r.elemento.tipo].has(r.elemento.id)).toBe(true);
      }
    });

    it('los códigos de proyecto son únicos y válidos', () => {
      for (const p of datos.proyectos) {
        const otros = datos.proyectos.filter((x) => x.id !== p.id).map((x) => x.codigo);
        expect(validarCodigoProyecto(p.codigo, otros).valido, p.codigo).toBe(true);
      }
    });

    it('correos y celulares son únicos', () => {
      const correos = [
        ...datos.usuarios.map((u) => u.correo),
        ...datos.postulantes.map((p) => p.correo),
      ];
      const compartidos = datos.postulantes
        .filter((p) => p.estado === 'APROBADA')
        .map((p) => p.correo);
      expect(new Set(correos).size).toBe(correos.length - compartidos.length);
      const celulares = datos.postulantes.map((p) => p.celular);
      expect(new Set(celulares).size).toBe(celulares.length);
    });

    it('las asignaciones no se repiten vigentes, no preceden al ingreso y las bajas no preceden al alta', () => {
      const vigentes = datos.asignaciones
        .filter((a) => a.fecha_baja === null)
        .map((a) => `${a.id_practicante}|${a.id_proyecto}`);
      expect(new Set(vigentes).size).toBe(vigentes.length);
      for (const a of datos.asignaciones) {
        const detalle = datos.practicantes.find((p) => p.id_usuario === a.id_practicante)!;
        expect(a.fecha_alta >= detalle.fecha_ingreso, a.id).toBe(true);
        if (a.fecha_baja !== null) expect(a.fecha_baja >= a.fecha_alta, a.id).toBe(true);
      }
      for (const u of datos.usuarios.filter(
        (x) => x.rol === 'PRACTICANTE' && x.estado === 'INACTIVO',
      )) {
        expect(
          datos.asignaciones.some((a) => a.id_practicante === u.id && a.fecha_baja === null),
          u.id,
        ).toBe(false);
      }
    });
  });

  describe('contratos de la Fase 1', () => {
    it('ultimo_numero_tarea de cada proyecto es el mayor numero de sus tareas', () => {
      for (const p of datos.proyectos) {
        const numeros = datos.tareas.filter((t) => t.id_proyecto === p.id).map((t) => t.numero);
        expect(p.ultimo_numero_tarea, p.codigo).toBe(
          numeros.length === 0 ? 0 : Math.max(...numeros),
        );
        expect(new Set(numeros).size, p.codigo).toBe(numeros.length);
      }
    });

    it('un número eliminado no se reutiliza: queda un hueco y el siguiente número es nuevo', () => {
      const principal = proyectoDe('PL2D');
      const usados = new Set(
        datos.tareas.filter((t) => t.id_proyecto === principal.id).map((t) => t.numero),
      );
      const eliminados = datos.historial.filter(
        (e) => e.tipo_accion === 'TAREA_ELIMINADA' && e.id_proyecto === principal.id,
      );
      expect(eliminados).toHaveLength(1);
      const hueco = Number(eliminados[0].elemento.etiqueta.match(/-(\d+)/)?.[1]);
      expect(usados.has(hueco)).toBe(false);
      expect(hueco).toBeLessThan(principal.ultimo_numero_tarea);
      const siguiente = siguienteNumeroTarea(principal);
      expect(siguiente.ok && siguiente.numero).toBe(principal.ultimo_numero_tarea + 1);
    });

    it('las fechas tienen el formato de domain/ (YYYY-MM-DD y ISO UTC con Z)', () => {
      const fechas = (valores: (string | null)[]) => valores.filter((v): v is string => v !== null);
      for (const f of fechas([
        ...datos.proyectos.flatMap((p) => [p.fecha_inicio, p.fecha_fin_prevista, p.fecha_fin_real]),
        ...datos.tareas.map((t) => t.fecha_limite),
        ...datos.practicantes.flatMap((p) => [p.fecha_ingreso, p.fecha_fin_prevista]),
        ...datos.asignaciones.flatMap((a) => [a.fecha_alta, a.fecha_baja]),
      ])) {
        expect(f).toMatch(FECHA);
      }
      for (const f of fechas([
        ...datos.usuarios.map((u) => u.fecha_alta),
        ...datos.tareas.map((t) => t.fecha_termino),
        ...datos.postulantes.map((p) => p.fecha_postulacion),
        ...datos.evaluaciones.map((e) => e.fecha_evaluacion),
        ...datos.historial.map((e) => e.fecha),
        ...datos.notificaciones.map((n) => n.fecha),
        ...datos.revisiones_insight.map((r) => r.fecha),
      ])) {
        expect(f).toMatch(FECHA_HORA);
      }
    });

    it('la fecha de fin de cada práctica es ingreso + la duración vigente (fechaFinPrevista)', () => {
      const duracion = datos.parametros.find((p) => p.clave === 'PRACTICA_DURACION_MESES')!.valor;
      expect(duracion.tipo).toBe('numero');
      const meses = duracion.tipo === 'numero' ? duracion.valor : 0;
      for (const p of datos.practicantes) {
        const fin = fechaFinPrevista(p.fecha_ingreso, meses);
        expect(fin.ok && fin.fecha, p.id_usuario).toBe(p.fecha_fin_prevista);
      }
    });

    it('nada queda en el futuro y la fecha de hoy se corta en la hora de Perú', () => {
      const instantes = [
        ...datos.usuarios.map((u) => u.fecha_alta),
        ...datos.postulantes.map((p) => p.fecha_postulacion),
        ...datos.evaluaciones.map((e) => e.fecha_evaluacion),
        ...datos.historial.map((e) => e.fecha),
        ...datos.notificaciones.map((n) => n.fecha),
        ...datos.revisiones_insight.map((r) => r.fecha),
        ...datos.tareas.flatMap((t) => (t.fecha_termino === null ? [] : [t.fecha_termino])),
      ];
      for (const instante of instantes) expect(instante <= ahora, instante).toBe(true);
      expect(datos.proyectos.some((p) => p.fecha_inicio <= hoy)).toBe(true);
      expect(datos.proyectos.every((p) => p.fecha_inicio <= hoy)).toBe(true);
    });

    it('el historial está en orden cronológico y con IDs únicos', () => {
      for (let i = 1; i < datos.historial.length; i += 1) {
        expect(
          datos.historial[i].fecha >= datos.historial[i - 1].fecha,
          datos.historial[i].id,
        ).toBe(true);
      }
    });

    it('fecha_termino es el mismo instante que el evento que cierra la tarea', () => {
      for (const t of datos.tareas) {
        const cierres = eventosDeTarea(datos, t.id).filter(
          (e) => e.tipo_accion === 'TAREA_TERMINADA' || e.tipo_accion === 'TAREA_APROBADA',
        );
        if (t.estado === 'TERMINADA') {
          expect(t.fecha_termino, t.id).not.toBeNull();
          expect(cierres.at(-1)?.fecha, t.id).toBe(t.fecha_termino);
          expect(tiempoCicloMs(t, datos.historial), `tiempo de ciclo de ${t.id}`).not.toBeNull();
        } else {
          expect(t.fecha_termino, t.id).toBeNull();
        }
      }
    });

    it('el estado y el responsable de cada tarea salen de reproducir su historial', () => {
      for (const t of datos.tareas) {
        let estado: string = 'DISPONIBLE';
        let responsable: Id | null = null;
        for (const e of eventosDeTarea(datos, t.id)) {
          switch (e.tipo_accion) {
            case 'TAREA_TOMADA':
              estado = 'EN_PROGRESO';
              responsable = e.autor.tipo === 'USUARIO' ? e.autor.id_usuario : null;
              break;
            case 'TAREA_LIBERADA':
              estado = 'DISPONIBLE';
              responsable = null;
              break;
            case 'TAREA_ENVIADA_A_SUPERVISION':
              estado = 'ESPERANDO_SUPERVISION';
              break;
            case 'TAREA_TERMINADA':
            case 'TAREA_APROBADA':
              estado = 'TERMINADA';
              break;
            case 'TAREA_DEVUELTA':
            case 'TAREA_REABIERTA':
              estado = 'EN_PROGRESO';
              break;
            default:
              break;
          }
        }
        expect(t.estado, t.id).toBe(estado);
        expect(t.id_practicante, t.id).toBe(responsable);
        expect(
          eventosDeTarea(datos, t.id).some((e) => e.tipo_accion === 'TAREA_CREADA'),
          t.id,
        ).toBe(true);
      }
    });

    it('requiere_supervision solo llega a ESPERANDO_SUPERVISION y las devoluciones y reaperturas llevan nota', () => {
      for (const t of datos.tareas) {
        if (t.estado === 'ESPERANDO_SUPERVISION') expect(t.requiere_supervision, t.id).toBe(true);
        if (!t.requiere_supervision) {
          expect(
            eventosDeTarea(datos, t.id).some(
              (e) => e.tipo_accion === 'TAREA_ENVIADA_A_SUPERVISION',
            ),
            t.id,
          ).toBe(false);
        }
      }
      const conNota = datos.historial.filter(
        (e) => e.tipo_accion === 'TAREA_DEVUELTA' || e.tipo_accion === 'TAREA_REABIERTA',
      );
      expect(conNota.length).toBeGreaterThanOrEqual(2);
      for (const e of conNota) expect((e.nota ?? '').trim().length, e.id).toBeGreaterThan(0);
    });

    it('estado_pr es coherente con §7.4: nulo si nunca llegó con requiere_pr, y con la URL del PR', () => {
      for (const t of datos.tareas) {
        const llego = eventosDeTarea(datos, t.id).some(
          (e) =>
            e.tipo_accion === 'TAREA_ENVIADA_A_SUPERVISION' || e.tipo_accion === 'TAREA_TERMINADA',
        );
        if (!llego || !t.requiere_pr) expect(t.estado_pr, t.id).toBeNull();
        else expect(t.estado_pr, t.id).not.toBeNull();

        // El estado guardado es el último que registró el historial.
        const cambios = eventosDeTarea(datos, t.id)
          .flatMap((e) => e.cambios)
          .filter((c) => c.campo === 'estado_pr');
        expect(t.estado_pr, t.id).toBe(cambios.at(-1)?.valor_nuevo ?? null);

        // Un PR abierto, con conflictos o fusionado tiene URL y ramas; sin PR no hay URL.
        if (
          t.estado_pr === 'CREADO' ||
          t.estado_pr === 'CON_CONFLICTOS' ||
          t.estado_pr === 'FUSIONADO'
        ) {
          expect(t.url_pull_request, `URL de ${t.id}`).not.toBeNull();
          expect(t.rama_origen, `rama de ${t.id}`).not.toBeNull();
          expect(t.rama_base, `rama base de ${t.id}`).not.toBeNull();
        }
        if (t.estado_pr === 'PENDIENTE' || t.estado_pr === null) {
          expect(t.url_pull_request, t.id).toBeNull();
        }
      }
    });

    it('las etiquetas del PR cubren los cinco estados', () => {
      const visibles = new Set(datos.tareas.map((t) => etiquetaPRVisible(t)));
      for (const estado of ESTADOS_PR) expect(visibles.has(estado), estado).toBe(true);
    });

    it('los eventos de proyecto, tarea y asignación llevan su proyecto; el autor Sistema solo en lo automático', () => {
      const conProyecto = (a: string) =>
        a.startsWith('TAREA_') ||
        a.startsWith('PULL_REQUEST_') ||
        a.startsWith('PROYECTO_') ||
        a === 'PRACTICANTE_ASIGNADO_A_PROYECTO' ||
        a === 'PRACTICANTE_QUITADO_DE_PROYECTO';
      for (const e of datos.historial) {
        if (conProyecto(e.tipo_accion)) expect(e.id_proyecto, e.id).not.toBeNull();
      }
      const automaticos = new Set([
        'POSTULACION_RECIBIDA',
        'POSTULACION_EVALUADA',
        'PULL_REQUEST_ESTADO_ACTUALIZADO',
      ]);
      for (const e of datos.historial.filter((x) => x.autor.tipo === 'SISTEMA')) {
        expect(automaticos.has(e.tipo_accion), e.id).toBe(true);
      }
    });

    it('el historial nunca guarda contraseñas', () => {
      expect(JSON.stringify(datos.historial)).not.toContain(CONTRASENA_DEMO);
    });
  });

  describe('postulaciones y evaluaciones', () => {
    it('cada evaluación coincide con volver a calcular el puntaje con sus criterios y valores vigentes', () => {
      const banda = datos.parametros.find((p) => p.clave === 'EVALUACION_BANDA_AMBIGUA')!.valor;
      const proporcion = datos.parametros.find((p) => p.clave === 'EVALUACION_PROPORCION')!.valor;
      if (banda.tipo !== 'rango' || proporcion.tipo !== 'proporcion') throw new Error('Parámetros');
      for (const evaluacion of datos.evaluaciones) {
        const postulante = datos.postulantes.find((p) => p.id === evaluacion.id_postulante)!;
        const detalles = datos.detalles_evaluacion.filter((d) => d.id_evaluacion === evaluacion.id);
        const resultado = calcularPuntaje({
          id_area_tecnica: postulante.id_area_tecnica,
          id_especialidad: postulante.id_especialidad,
          criterios: datos.criterios,
          juicios: detalles.map((d) => ({
            id_criterio: d.id_criterio,
            cumplido: d.cumplido,
            observacion: d.observacion,
          })),
          banda: { minimo: banda.minimo, maximo: banda.maximo },
          proporcion: { area: proporcion.area, especialidad: proporcion.especialidad },
        });
        expect(resultado.ok, evaluacion.id).toBe(true);
        if (!resultado.ok) continue;
        expect(evaluacion.puntaje_total, evaluacion.id).toBe(resultado.puntaje_total);
        expect(evaluacion.puntaje_area, evaluacion.id).toBe(resultado.puntaje_area);
        expect(evaluacion.puntaje_especialidad, evaluacion.id).toBe(resultado.puntaje_especialidad);
        expect(evaluacion.requiere_revision_manual, evaluacion.id).toBe(
          resultado.requiere_revision_manual,
        );
        // El detalle conserva una copia del criterio con el que se evaluó.
        for (const d of detalles) {
          const criterio = datos.criterios.find((c) => c.id === d.id_criterio)!;
          expect(d.nombre_criterio, d.id).toBe(criterio.nombre);
          expect(d.peso, d.id).toBe(criterio.peso);
          expect(d.bloque, d.id).toBe(criterio.id_especialidad === null ? 'AREA' : 'ESPECIALIDAD');
        }
      }
    });

    it('hay una pendiente con revisión manual por criterio obligatorio y otra por banda ambigua', () => {
      const pendientes = datos.postulantes.filter((p) => p.estado === 'PENDIENTE');
      const marcadas = pendientes.filter(
        (p) => datos.evaluaciones.find((e) => e.id_postulante === p.id)!.requiere_revision_manual,
      );
      const porObligatorio = marcadas.filter((p) => {
        const detalles = datos.detalles_evaluacion.filter(
          (d) => d.id_evaluacion === `eva-${p.id.slice(4)}`,
        );
        return detalles.some(
          (d) => !d.cumplido && datos.criterios.find((c) => c.id === d.id_criterio)!.obligatorio,
        );
      });
      const porBanda = marcadas.filter((p) => {
        const total = datos.evaluaciones.find((e) => e.id_postulante === p.id)!.puntaje_total;
        return total >= 50 && total <= 69;
      });
      expect(porObligatorio.length).toBeGreaterThanOrEqual(1);
      expect(porBanda.length).toBeGreaterThanOrEqual(2);
      // Las pendientes tienen puntajes variados.
      const puntajes = new Set(
        pendientes.map(
          (p) => datos.evaluaciones.find((e) => e.id_postulante === p.id)!.puntaje_total,
        ),
      );
      expect(puntajes.size).toBeGreaterThanOrEqual(6);
    });

    it('la reconsiderada vuelve a Pendiente con una nota; las rechazadas llevan motivo', () => {
      const reconsideraciones = datos.historial.filter(
        (e) => e.tipo_accion === 'POSTULACION_RECONSIDERADA',
      );
      expect(reconsideraciones).toHaveLength(1);
      expect((reconsideraciones[0].nota ?? '').trim()).not.toBe('');
      expect(datos.postulantes.find((p) => p.id === reconsideraciones[0].elemento.id)?.estado).toBe(
        'PENDIENTE',
      );
      for (const e of datos.historial.filter((x) => x.tipo_accion === 'POSTULACION_RECHAZADA')) {
        expect((e.nota ?? '').trim().length, e.id).toBeGreaterThan(0);
      }
    });

    it('aprobar o rechazar una postulación no notifica a nadie', () => {
      expect(datos.notificaciones.filter((n) => n.elemento.tipo === 'POSTULANTE')).toEqual([]);
    });
  });

  describe('notificaciones', () => {
    it('ninguna notificación va dirigida a quien realizó la acción', () => {
      for (const n of datos.notificaciones) {
        const origen = datos.historial.filter(
          (e) =>
            e.fecha === n.fecha && e.elemento.id === n.elemento.id && e.id_proyecto !== undefined,
        );
        for (const e of origen) {
          if (e.autor.tipo === 'USUARIO')
            expect(e.autor.id_usuario, n.id).not.toBe(n.id_destinatario);
        }
      }
      // La acción propia también se comprueba por tipo: quien envía no recibe el aviso de envío.
      for (const n of datos.notificaciones.filter(
        (x) => x.tipo === 'TAREA_ENVIADA_A_SUPERVISION',
      )) {
        const envio = datos.historial.find(
          (e) =>
            e.tipo_accion === 'TAREA_ENVIADA_A_SUPERVISION' &&
            e.fecha === n.fecha &&
            e.elemento.id === n.elemento.id,
        );
        expect(envio, n.id).toBeDefined();
        expect(envio!.autor, n.id).not.toEqual({ tipo: 'USUARIO', id_usuario: n.id_destinatario });
      }
    });

    it('cada aviso de tarea llega a quien indica §8.1 (supervisor del proyecto o responsable)', () => {
      for (const n of datos.notificaciones.filter((x) => x.elemento.tipo === 'TAREA')) {
        const tarea = datos.tareas.find((t) => t.id === n.elemento.id)!;
        const proyecto = datos.proyectos.find((p) => p.id === tarea.id_proyecto)!;
        const esperado =
          n.tipo === 'TAREA_ENVIADA_A_SUPERVISION' ? proyecto.id_supervisor : tarea.id_practicante;
        expect(n.id_destinatario, `${n.tipo} de ${idLegible(datos, tarea)}`).toBe(esperado);
      }
    });

    it('hay avisos sin leer para el supervisor y el practicante de demostración, y leídos antiguos', () => {
      const de = (id: Id) => datos.notificaciones.filter((n) => n.id_destinatario === id);
      expect(de(DEMO_SUPERVISOR).some((n) => !n.leida)).toBe(true);
      expect(de(DEMO_PRACTICANTE).some((n) => !n.leida)).toBe(true);
      expect(datos.notificaciones.some((n) => n.leida)).toBe(true);
      expect(datos.notificaciones.length).toBeGreaterThanOrEqual(30);
    });

    it('el aviso de fin de práctica se emite una vez, a la persona, su supervisor y el administrador', () => {
      const avisos = datos.notificaciones.filter((n) => n.tipo === 'PRACTICA_PROXIMA_A_FINALIZAR');
      const diego = avisos
        .filter((n) => n.elemento.id === 'usr-pra-02')
        .map((n) => n.id_destinatario);
      expect(new Set(diego)).toEqual(new Set(['usr-pra-02', DEMO_SUPERVISOR, DEMO_ADMIN]));
      expect(diego).toHaveLength(3);
    });
  });

  describe('escenarios de demostración', () => {
    const hace = datos.proyectos;
    void hace;

    it('proyectos en cada estado, un proyecto sin practicantes y el reparto de supervisores', () => {
      const estados = new Set(datos.proyectos.map((p) => p.estado));
      expect(estados).toEqual(new Set(['ACTIVO', 'EN_PAUSA', 'FINALIZADO']));
      const sinEquipo = datos.proyectos.filter(
        (p) => !datos.asignaciones.some((a) => a.id_proyecto === p.id && a.fecha_baja === null),
      );
      expect(sinEquipo.map((p) => p.codigo)).toEqual(['DAT']);
      const porSupervisor = (id: Id) =>
        datos.proyectos.filter((p) => p.id_supervisor === id).length;
      expect(porSupervisor(DEMO_SUPERVISOR)).toBe(2);
      expect(datos.supervisores.map((s) => porSupervisor(s.id_usuario)).sort()).toEqual([1, 2, 2]);
      for (const p of datos.proyectos) {
        expect(p.fecha_fin_real === null, p.codigo).toBe(p.estado !== 'FINALIZADO');
      }
    });

    it('el proyecto FINALIZADO no tiene tareas esperando supervisión ni en curso', () => {
      const finalizado = datos.proyectos.find((p) => p.estado === 'FINALIZADO')!;
      for (const t of datos.tareas.filter((x) => x.id_proyecto === finalizado.id)) {
        expect(['EN_PROGRESO', 'ESPERANDO_SUPERVISION'], t.id).not.toContain(t.estado);
      }
    });

    it('un proyecto tiene más de 5 tareas terminadas (regla de «las 5 más recientes»)', () => {
      const terminadas = datos.tareas.filter(
        (t) => t.id_proyecto === proyectoDe('PL2D').id && t.estado === 'TERMINADA',
      );
      expect(terminadas.length).toBeGreaterThan(5);
    });

    it('casos de tareas: vencidas, por vencer, sin asignar, devuelta, reabierta y esperando más de 3 días', () => {
      expect(datos.tareas.filter((t) => estaVencida(t, hoy)).length).toBeGreaterThanOrEqual(5);
      expect(
        datos.tareas.some(
          (t) =>
            t.estado !== 'TERMINADA' &&
            (t.fecha_limite === hoy || t.fecha_limite === sumar(hoy, 1)),
        ),
      ).toBe(true);
      expect(datos.tareas.some((t) => t.estado === 'DISPONIBLE' && t.id_practicante === null)).toBe(
        true,
      );
      const devueltas = datos.tareas.filter((t) => devolucionVigente(t.id, datos.historial));
      expect(devueltas.length).toBeGreaterThanOrEqual(1);
      expect(devueltas.every((t) => t.estado === 'EN_PROGRESO')).toBe(true);
      expect(vecesDevuelta(devueltas[0].id, datos.historial)).toBeGreaterThanOrEqual(1);
      expect(
        datos.tareas.some(
          (t) =>
            t.estado === 'EN_PROGRESO' &&
            eventosDeTarea(datos, t.id).some((e) => e.tipo_accion === 'TAREA_REABIERTA'),
        ),
      ).toBe(true);
      const demoradas = elementosDe(insightsDe(datos, ahora), 'SUPERVISION_DEMORADA');
      expect(demoradas.length).toBeGreaterThanOrEqual(1);
      expect(demoradas.every((i) => i.severidad === 'ATENCION')).toBe(true);
    });

    it('casos de practicantes: sin proyecto, finalizado, en 2 proyectos, con proyecto anterior y carga extrema', () => {
      const practicantes = datos.usuarios.filter((u) => u.rol === 'PRACTICANTE');
      const vigentes = (id: Id) =>
        datos.asignaciones.filter((a) => a.id_practicante === id && a.fecha_baja === null);
      expect(
        practicantes.filter((u) => u.estado === 'ACTIVO' && vigentes(u.id).length === 0).length,
      ).toBeGreaterThanOrEqual(4);
      expect(practicantes.filter((u) => u.estado === 'INACTIVO')).toHaveLength(1);
      expect(practicantes.filter((u) => vigentes(u.id).length >= 2).map((u) => u.id)).toEqual([
        'usr-pra-06',
      ]);
      expect(
        practicantes.some(
          (u) =>
            vigentes(u.id).length > 0 &&
            datos.asignaciones.some((a) => a.id_practicante === u.id && a.fecha_baja !== null),
        ),
      ).toBe(true);
      const enCurso = (id: Id) =>
        datos.tareas.filter((t) => t.id_practicante === id && t.estado === 'EN_PROGRESO').length;
      expect(practicantes.filter((u) => enCurso(u.id) > 3).map((u) => u.id)).toEqual([
        'usr-pra-04',
      ]);
      expect(practicantes.some((u) => u.debe_cambiar_contrasena)).toBe(true);
    });

    it('el practicante de demostración tiene tareas en curso devuelta, esperando y terminadas', () => {
      const suyas = datos.tareas.filter((t) => t.id_practicante === DEMO_PRACTICANTE);
      expect(
        suyas.some((t) => t.estado === 'EN_PROGRESO' && devolucionVigente(t.id, datos.historial)),
      ).toBe(true);
      expect(suyas.some((t) => t.estado === 'ESPERANDO_SUPERVISION')).toBe(true);
      expect(suyas.filter((t) => t.estado === 'TERMINADA').length).toBeGreaterThanOrEqual(2);
    });

    it('las 7 reglas de insights disparan con casos concretos', () => {
      const insights = insightsDe(datos, ahora);
      const ids = (regla: TipoReglaInsight) =>
        elementosDe(insights, regla)
          .map((i) => i.elemento.id)
          .sort();
      for (const regla of [
        'PRACTICANTE_INACTIVO',
        'CARGA_DESBALANCEADA',
        'POSIBLE_ATRASO_PROYECTO',
        'PROYECTO_SIN_ACTIVIDAD',
        'SUPERVISION_DEMORADA',
        'POSTULACIONES_SIN_DECIDIR',
        'FIN_PRACTICA',
      ] as const) {
        expect(ids(regla).length, regla).toBeGreaterThan(0);
      }
      const inactivos = elementosDe(insights, 'PRACTICANTE_INACTIVO');
      expect(inactivos.map((i) => [i.elemento.id, i.severidad]).sort()).toEqual([
        ['usr-pra-05', 'CRITICO'],
        ['usr-pra-07', 'ATENCION'],
        ['usr-pra-08', 'ATENCION'],
      ]);
      expect(ids('CARGA_DESBALANCEADA')).toEqual(['usr-pra-04', 'usr-pra-08']);
      expect(ids('POSIBLE_ATRASO_PROYECTO')).toEqual([proyectoDe('RSV').id]);
      expect(ids('PROYECTO_SIN_ACTIVIDAD')).toEqual([proyectoDe('RSV').id]);
      expect(ids('POSTULACIONES_SIN_DECIDIR')).toHaveLength(2);
      expect(
        elementosDe(insights, 'FIN_PRACTICA')
          .map((i) => [i.elemento.id, i.severidad])
          .sort(),
      ).toEqual([
        ['usr-pra-02', 'INFORMATIVO'],
        ['usr-pra-03', 'CRITICO'],
      ]);
      expect(insights.some((i) => i.severidad === 'CRITICO')).toBe(true);
      expect(insights.some((i) => i.severidad === 'ATENCION')).toBe(true);
    });

    it('el supervisor ve solo 5 de las 7 reglas y solo de sus proyectos; «revisado» es por persona', () => {
      const delSupervisor = insightsDe(datos, ahora, DEMO_SUPERVISOR);
      const reglas = new Set(delSupervisor.map((i) => i.tipo_regla));
      expect(reglas.has('POSTULACIONES_SIN_DECIDIR')).toBe(false);
      expect(reglas.has('FIN_PRACTICA')).toBe(false);
      expect(reglas.size).toBeGreaterThanOrEqual(4);
      const suyos = new Set(
        datos.proyectos.filter((p) => p.id_supervisor === DEMO_SUPERVISOR).map((p) => p.id),
      );
      for (const i of delSupervisor) {
        expect(
          i.ids_proyecto.some((id) => suyos.has(id)),
          i.titulo,
        ).toBe(true);
      }
      const carga = (insights: Insight[]) =>
        insights.find(
          (i) => i.tipo_regla === 'CARGA_DESBALANCEADA' && i.elemento.id === 'usr-pra-04',
        )!;
      expect(carga(insightsDe(datos, ahora, DEMO_ADMIN)).revisado).toBe(true);
      expect(carga(delSupervisor).revisado).toBe(false);
    });

    it('calcularInsights coincide con insightsParaUsuario sin filtrar (no se guardan insights)', () => {
      const todos = calcularInsights(datos, umbralesDe(datos), ahora);
      expect(todos.ok && todos.insights.length).toBe(insightsDe(datos, ahora, DEMO_ADMIN).length);
    });
  });
});

/** Suma días a una fecha `YYYY-MM-DD` (solo para las pruebas). */
function sumar(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
