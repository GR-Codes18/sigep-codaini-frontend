/**
 * Flujo completo de una tarea por código (plan §9, Fase 2, «Listo cuando», en su parte de tareas): solo
 * servicios reales sobre la semilla real, con el historial y las notificaciones coherentes. El reloj
 * avanza un minuto entre pasos, como en un uso real.
 */

import { describe, expect, it } from 'vitest';
import {
  devolucionVigente,
  etiquetaPRVisible,
  tiempoCicloMs,
  vecesDevuelta,
  type Id,
  type Tarea,
} from '@/domain';
import { AHORA_DE_PRUEBA, crearEntornoDePrueba } from '../pruebas/entorno';
import type { Resultado } from '../resultado';
import { crearTarea } from './datosTarea';
import { cambiarRequierePR } from './opciones';
import { aprobarTarea, devolverTarea, enviarTareaASupervision, tomarTarea } from './transiciones';

const SUPERVISOR = 'demo-supervisor';
const DEMO = 'demo-practicante';
const PL2D = 'pry-pl2d';
const MINUTO = 60_000;

function preparar() {
  const prueba = crearEntornoDePrueba();
  const datos = () => prueba.almacen.getState().datos;
  let minuto = 0;
  /** Adelanta el reloj un minuto y devuelve el instante nuevo en ISO. */
  const avanzar = () => {
    minuto += 1;
    const ahora = new Date(AHORA_DE_PRUEBA.getTime() + minuto * MINUTO);
    prueba.fijarAhora(ahora);
    return ahora.toISOString();
  };
  return { ...prueba, datos, avanzar };
}

/** Exige un éxito y devuelve la tarea; si falla, la prueba muestra el código. */
function valor(resultado: Resultado<Tarea>): Tarea {
  if (!resultado.ok) throw new Error(`${resultado.codigo}: ${resultado.mensaje}`);
  return resultado.valor;
}

async function crearConSupervision(prueba: ReturnType<typeof preparar>): Promise<Tarea> {
  return valor(
    await crearTarea(
      {
        idActor: SUPERVISOR,
        idProyecto: PL2D,
        titulo: 'Jefe final',
        descripcion: 'Comportamiento y barra de vida del jefe final.',
        fecha_limite: '2026-12-20',
        requiere_supervision: true,
      },
      prueba.entorno,
    ),
  );
}

/** Eventos de una tarea como `[tipo, autor]`, en el orden del historial. */
function eventosDe(prueba: ReturnType<typeof preparar>, idTarea: Id) {
  return prueba
    .datos()
    .historial.filter((e) => e.elemento.tipo === 'TAREA' && e.elemento.id === idTarea)
    .map((e) => [e.tipo_accion, e.autor.tipo === 'USUARIO' ? e.autor.id_usuario : 'SISTEMA']);
}

/** Avisos nuevos sobre la tarea como `[tipo, destinatario]`. */
function avisosDe(prueba: ReturnType<typeof preparar>, idTarea: Id, desde: number) {
  return prueba
    .datos()
    .notificaciones.slice(desde)
    .filter((n) => n.elemento.tipo === 'TAREA' && n.elemento.id === idTarea)
    .map((n) => [n.tipo, n.id_destinatario]);
}

describe('flujo completo de una tarea', () => {
  it('crear → tomar → enviar → aprobar, con historial, avisos e indicadores coherentes', async () => {
    const prueba = preparar();
    const contador = prueba.datos().proyectos.find((p) => p.id === PL2D)!.ultimo_numero_tarea;
    const avisosAntes = prueba.datos().notificaciones.length;

    const creada = await crearConSupervision(prueba);
    const tomadaEn = prueba.avanzar();
    valor(await tomarTarea({ idActor: DEMO, idTarea: creada.id }, prueba.entorno));
    prueba.avanzar();
    const enviada = valor(
      await enviarTareaASupervision({ idActor: DEMO, idTarea: creada.id }, prueba.entorno),
    );
    expect(enviada.estado_pr).toBe('PENDIENTE');
    const aprobadaEn = prueba.avanzar();
    const final = valor(
      await aprobarTarea({ idActor: SUPERVISOR, idTarea: creada.id }, prueba.entorno),
    );

    // La tarea final.
    expect(final).toMatchObject({
      estado: 'TERMINADA',
      id_practicante: DEMO,
      estado_pr: 'PENDIENTE',
      fecha_termino: aprobadaEn,
      numero: contador + 1,
    });
    expect(prueba.datos().tareas.find((t) => t.id === creada.id)).toEqual(final);
    expect(prueba.datos().proyectos.find((p) => p.id === PL2D)?.ultimo_numero_tarea).toBe(
      contador + 1,
    );

    // El historial, en orden y con la misma etiqueta y proyecto.
    expect(eventosDe(prueba, creada.id)).toEqual([
      ['TAREA_CREADA', SUPERVISOR],
      ['TAREA_TOMADA', DEMO],
      ['TAREA_ENVIADA_A_SUPERVISION', DEMO],
      ['TAREA_APROBADA', SUPERVISOR],
    ]);
    const eventos = prueba.datos().historial.filter((e) => e.elemento.id === creada.id);
    expect(new Set(eventos.map((e) => e.elemento.etiqueta)).size).toBe(1);
    expect(eventos.every((e) => e.id_proyecto === PL2D)).toBe(true);
    expect(eventos.at(-1)?.fecha).toBe(final.fecha_termino);

    // Exactamente dos avisos nuevos en todo el sistema, ninguno a su propio autor.
    expect(prueba.datos().notificaciones.length - avisosAntes).toBe(2);
    expect(avisosDe(prueba, creada.id, avisosAntes)).toEqual([
      ['TAREA_ENVIADA_A_SUPERVISION', SUPERVISOR],
      ['TAREA_APROBADA', DEMO],
    ]);

    // Los indicadores de domain/ leen bien lo que escribieron los servicios.
    const historial = prueba.datos().historial;
    expect(tiempoCicloMs(final, historial)).toBe(Date.parse(aprobadaEn) - Date.parse(tomadaEn));
    expect(vecesDevuelta(creada.id, historial)).toBe(0);
    expect(devolucionVigente(creada.id, historial)).toBe(false);
    expect(etiquetaPRVisible(final)).toBe('PENDIENTE');
  });

  it('variante con devolución: crear → tomar → enviar → devolver → enviar → aprobar', async () => {
    const prueba = preparar();
    const avisosAntes = prueba.datos().notificaciones.length;

    const creada = await crearConSupervision(prueba);
    prueba.avanzar();
    valor(await tomarTarea({ idActor: DEMO, idTarea: creada.id }, prueba.entorno));
    prueba.avanzar();
    valor(await enviarTareaASupervision({ idActor: DEMO, idTarea: creada.id }, prueba.entorno));
    prueba.avanzar();
    const devuelta = valor(
      await devolverTarea(
        { idActor: SUPERVISOR, idTarea: creada.id, nota: 'Falta la animación de derrota.' },
        prueba.entorno,
      ),
    );
    expect(devuelta).toMatchObject({ estado: 'EN_PROGRESO', id_practicante: DEMO });
    expect(devolucionVigente(creada.id, prueba.datos().historial)).toBe(true);

    prueba.avanzar();
    valor(await enviarTareaASupervision({ idActor: DEMO, idTarea: creada.id }, prueba.entorno));
    expect(devolucionVigente(creada.id, prueba.datos().historial)).toBe(false);
    prueba.avanzar();
    const final = valor(
      await aprobarTarea({ idActor: SUPERVISOR, idTarea: creada.id }, prueba.entorno),
    );

    expect(final.estado).toBe('TERMINADA');
    expect(eventosDe(prueba, creada.id).map(([tipo]) => tipo)).toEqual([
      'TAREA_CREADA',
      'TAREA_TOMADA',
      'TAREA_ENVIADA_A_SUPERVISION',
      'TAREA_DEVUELTA',
      'TAREA_ENVIADA_A_SUPERVISION',
      'TAREA_APROBADA',
    ]);
    const historial = prueba.datos().historial;
    expect(vecesDevuelta(creada.id, historial)).toBe(1);
    expect(
      historial.find((e) => e.elemento.id === creada.id && e.tipo_accion === 'TAREA_DEVUELTA')
        ?.nota,
    ).toBe('Falta la animación de derrota.');
    expect(avisosDe(prueba, creada.id, avisosAntes)).toEqual([
      ['TAREA_ENVIADA_A_SUPERVISION', SUPERVISOR],
      ['TAREA_DEVUELTA', DEMO],
      ['TAREA_ENVIADA_A_SUPERVISION', SUPERVISOR],
      ['TAREA_APROBADA', DEMO],
    ]);
  });

  it('variante «No requiere PR»: el practicante lo marca mientras espera supervisión y la etiqueta desaparece', async () => {
    const prueba = preparar();
    const avisosAntes = prueba.datos().notificaciones.length;

    const creada = await crearConSupervision(prueba);
    prueba.avanzar();
    valor(await tomarTarea({ idActor: DEMO, idTarea: creada.id }, prueba.entorno));
    prueba.avanzar();
    const enviada = valor(
      await enviarTareaASupervision({ idActor: DEMO, idTarea: creada.id }, prueba.entorno),
    );
    expect(etiquetaPRVisible(enviada)).toBe('PENDIENTE');

    prueba.avanzar();
    const sinPR = valor(
      await cambiarRequierePR(
        { idActor: DEMO, idTarea: creada.id, valor: false, motivo: 'Solo es ajuste de diseño.' },
        prueba.entorno,
      ),
    );
    expect(etiquetaPRVisible(sinPR)).toBeNull();
    prueba.avanzar();
    const final = valor(
      await aprobarTarea({ idActor: SUPERVISOR, idTarea: creada.id }, prueba.entorno),
    );

    expect(final).toMatchObject({
      estado: 'TERMINADA',
      requiere_pr: false,
      estado_pr: 'PENDIENTE',
    });
    expect(etiquetaPRVisible(final)).toBeNull();
    expect(eventosDe(prueba, creada.id).map(([tipo]) => tipo)).toEqual([
      'TAREA_CREADA',
      'TAREA_TOMADA',
      'TAREA_ENVIADA_A_SUPERVISION',
      'PULL_REQUEST_NO_REQUERIDO',
      'TAREA_APROBADA',
    ]);
    expect(avisosDe(prueba, creada.id, avisosAntes)).toEqual([
      ['TAREA_ENVIADA_A_SUPERVISION', SUPERVISOR],
      ['PULL_REQUEST_NO_REQUERIDO_POR_PRACTICANTE', SUPERVISOR],
      ['TAREA_APROBADA', DEMO],
    ]);
  });
});
