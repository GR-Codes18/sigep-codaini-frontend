/**
 * Evaluación simulada de una postulación (Fase 2, paso 7A; propuesta §5.1 y §10.1).
 *
 * Es un proceso del **sistema** (autor `SISTEMA`, sin actor): el modelo —simulado por
 * `entorno.evaluador`— solo juzga criterio por criterio, y `calcularPuntaje` (`domain/`) hace la suma
 * con la banda y la proporción **vigentes** de Configuración. Si el cálculo falla (catálogo mal
 * configurado) el servicio devuelve el mismo código y mensaje de `domain/` y no escribe nada: la
 * postulación queda sin evaluación y el Administrador puede decidirla igual (decisión E3-A).
 * Una postulación ya evaluada no se vuelve a calcular (no existe «Recalcular», plan §6).
 */

import { z } from 'zod';
import {
  calcularPuntaje,
  type PostulacionEvaluacion,
  type PostulacionEvaluacionDetalle,
  type ResultadoPuntaje,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { etiquetaPostulante } from '../etiquetas';
import { AUTOR_SISTEMA, cambio, crearEvento } from '../historial';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { conEfectos, ejecutarServicio } from '../transaccional';
import { esquemaId } from '../tareas/comun';
import { leerBanda, leerProporcion } from './comun';

const esquemaEvaluar = z.object({ idPostulante: esquemaId });

export type EntradaEvaluarPostulacion = z.input<typeof esquemaEvaluar>;

export interface EvaluacionCreada {
  evaluacion: PostulacionEvaluacion;
  detalles: PostulacionEvaluacionDetalle[];
}

/** Justificación breve que ve el Administrador (mismo texto que usa la semilla). */
export function redactarJustificacion(resultado: Extract<ResultadoPuntaje, { ok: true }>): string {
  const cumplidos = resultado.detalles.filter((d) => d.cumplido).length;
  let texto = `Cumple ${cumplidos} de ${resultado.detalles.length} criterios. Puntaje del área: ${resultado.puntaje_area}/100; de la especialidad: ${resultado.puntaje_especialidad}/100; nota final: ${resultado.puntaje_total}/100.`;
  if (resultado.motivos_revision.includes('CRITERIO_OBLIGATORIO')) {
    texto += ' Falta un criterio obligatorio: requiere revisión manual.';
  }
  if (resultado.motivos_revision.includes('BANDA_AMBIGUA')) {
    texto += ' La nota cae en la banda ambigua: requiere revisión manual.';
  }
  return texto;
}

export function evaluarPostulacion(
  entrada: EntradaEvaluarPostulacion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<EvaluacionCreada>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEvaluar, entrada);
    if (!valida.ok) return valida;

    const postulante = datos.postulantes.find((p) => p.id === valida.valor.idPostulante);
    if (postulante === undefined) return fallo('NO_ENCONTRADO');
    if (datos.evaluaciones.some((ev) => ev.id_postulante === postulante.id)) {
      return fallo('POSTULACION_YA_EVALUADA');
    }

    const banda = leerBanda(datos);
    if (!banda.ok) return banda;
    const proporcion = leerProporcion(datos);
    if (!proporcion.ok) return proporcion;

    // El modelo solo ve los criterios activos del área (generales) y de la especialidad.
    const criteriosActivos = datos.criterios.filter(
      (c) =>
        c.activo &&
        ((c.id_area_tecnica === postulante.id_area_tecnica && c.id_especialidad === null) ||
          c.id_especialidad === postulante.id_especialidad),
    );
    const juicios = e.evaluador.juzgar(postulante, criteriosActivos);

    const resultado = calcularPuntaje({
      id_area_tecnica: postulante.id_area_tecnica,
      id_especialidad: postulante.id_especialidad,
      criterios: datos.criterios,
      juicios,
      banda: banda.valor,
      proporcion: proporcion.valor,
    });
    if (!resultado.ok) return denegar(resultado);

    const evaluacion: PostulacionEvaluacion = {
      id: e.generarId('eva'),
      id_postulante: postulante.id,
      puntaje_area: resultado.puntaje_area,
      puntaje_especialidad: resultado.puntaje_especialidad,
      puntaje_total: resultado.puntaje_total,
      justificacion: redactarJustificacion(resultado),
      requiere_revision_manual: resultado.requiere_revision_manual,
      fecha_evaluacion: marca.ahora,
    };
    const detalles: PostulacionEvaluacionDetalle[] = resultado.detalles.map((detalle, i) => ({
      id: `${evaluacion.id}-${String(i + 1).padStart(2, '0')}`,
      id_evaluacion: evaluacion.id,
      ...detalle,
    }));

    const evento = crearEvento(
      {
        autor: AUTOR_SISTEMA,
        tipo_accion: 'POSTULACION_EVALUADA',
        elemento: {
          tipo: 'POSTULANTE',
          id: postulante.id,
          etiqueta: etiquetaPostulante(postulante),
        },
        id_proyecto: null,
        cambios: [cambio('puntaje_total', null, evaluacion.puntaje_total)],
      },
      marca,
      e.generarId,
    );

    return {
      ok: true,
      valor: { evaluacion, detalles },
      cambios: conEfectos(
        datos,
        {
          evaluaciones: [...datos.evaluaciones, evaluacion],
          detalles_evaluacion: [...datos.detalles_evaluacion, ...detalles],
        },
        { eventos: [evento] },
      ),
    };
  });
}
