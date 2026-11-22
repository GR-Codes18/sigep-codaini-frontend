import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { aDetallePostulacion } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { Insignia } from '@/compartido/Insignia';
import { LineaTiempo } from '@/compartido/LineaTiempo';
import { Button } from '@/compartido/ui/button';
import { Skeleton } from '@/compartido/ui/skeleton';
import type { Id } from '@/domain';
import { ENTORNO, evaluarPostulacion, obtenerPostulacion, type Entorno } from '@/services';
import { AccionesDePostulacion } from './AccionesDePostulacion';
import { BarraPuntaje } from './BarraPuntaje';
import { DesgloseEvaluacion } from './DesgloseEvaluacion';
import { RUTA_POSTULACIONES } from './rutas';

/** Aviso sobre el uso del CV (plan §9, módulo 5.1; §10.1). */
export const AVISO_USO_DEL_CV =
  'El CV se usa únicamente para evaluar esta postulación y no para otros fines.';

/** Nota fija de la evaluación (§5.1). */
export const NOTA_PUNTAJE_ES_AYUDA =
  'El puntaje es una ayuda para decidir: la decisión es siempre del Administrador.';

/** El estado del análisis de la IA de una postulación que no tenía evaluación. */
type EstadoAnalisis = { id: Id; fase: 'ANALIZANDO' } | { id: Id; fase: 'ERROR'; mensaje: string };

function VolverAlListado() {
  return (
    <Link
      to={RUTA_POSTULACIONES}
      className="text-sm font-medium text-link underline underline-offset-2"
    >
      Volver a postulaciones
    </Link>
  );
}

/**
 * Detalle de una postulación (§5.1): datos del postulante, evaluación de la IA con su desglose en dos bloques, el
 * CV y su historial. Lee con `obtenerPostulacion`; no decide nada. `entorno` solo lo cambian las pruebas.
 */
export function PaginaDetallePostulacion({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { idPostulante } = useParams();
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;

  const cargar = useCallback(
    () =>
      obtenerPostulacion({ idActor: idUsuario ?? '', idPostulante: idPostulante ?? '' }, entorno),
    [entorno, idUsuario, idPostulante],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);

  // «Analizando…» (E5-A): una postulación sin evaluación se evalúa al abrirla, una sola vez por postulación. Si el
  // catálogo está mal configurado y no se puede calcular el puntaje, se dice y las decisiones siguen disponibles (E3-A).
  const intentadas = useRef(new Set<Id>());
  const [analisis, setAnalisis] = useState<EstadoAnalisis | null>(null);
  const idSinEvaluar =
    consulta.valor !== null && consulta.valor.evaluacion === null
      ? consulta.valor.postulante.id
      : null;
  useEffect(() => {
    if (idSinEvaluar === null || intentadas.current.has(idSinEvaluar)) return;
    intentadas.current.add(idSinEvaluar);
    setAnalisis({ id: idSinEvaluar, fase: 'ANALIZANDO' });
    void evaluarPostulacion({ idPostulante: idSinEvaluar }, entorno).then((resultado) => {
      // Si ya la había evaluado otra pestaña, la consulta traerá la evaluación y no hay nada que decir.
      if (!resultado.ok && resultado.codigo !== 'POSTULACION_YA_EVALUADA') {
        setAnalisis({ id: idSinEvaluar, fase: 'ERROR', mensaje: resultado.mensaje });
      }
    });
  }, [idSinEvaluar, entorno]);

  if (idUsuario === null) return null;

  if (consulta.error) {
    return (
      <section className="space-y-4">
        <VolverAlListado />
        <p role="alert" className="text-sm text-danger-text">
          {consulta.error}
        </p>
      </section>
    );
  }
  if (consulta.valor === null) {
    return (
      <div className="space-y-2" role="status" aria-label="Cargando la postulación">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const detalle = aDetallePostulacion(consulta.valor);
  const { evaluacion } = detalle;

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <VolverAlListado />
        <h1 className="text-text">{detalle.nombre}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Insignia tipo="postulacion" estado={detalle.estado} />
          {evaluacion?.requiereRevision && <Insignia tipo="marca" estado="REVISION_MANUAL" />}
        </div>
        {detalle.practicante && (
          <p className="text-sm text-text-2">
            Se creó la cuenta de practicante de <strong>{detalle.practicante.nombre}</strong>.
          </p>
        )}
        <AccionesDePostulacion
          idActor={idUsuario}
          postulacion={{ id: detalle.id, nombre: detalle.nombre, correo: detalle.correo }}
          decisiones={detalle.decisiones}
          entorno={entorno}
        />
      </header>

      <section aria-label="Datos del postulante" className="space-y-2">
        <h2 className="text-text">Datos del postulante</h2>
        <dl className="grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-2">Correo</dt>
            <dd className="text-text">{detalle.correo}</dd>
          </div>
          <div>
            <dt className="text-text-2">Celular</dt>
            <dd className="text-text">{detalle.celular}</dd>
          </div>
          <div>
            <dt className="text-text-2">Área técnica</dt>
            <dd className="text-text">{detalle.area}</dd>
          </div>
          <div>
            <dt className="text-text-2">Especialidad</dt>
            <dd className="text-text">{detalle.especialidad}</dd>
          </div>
          <div>
            <dt className="text-text-2">Fecha de postulación</dt>
            <dd className="text-text tabular-nums">{detalle.fechaTexto}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Currículum" className="space-y-2">
        <h2 className="text-text">Currículum</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-text-2" strokeWidth={1.5} aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-text">{detalle.cv.nombre}</p>
              <p className="text-xs text-text-2">
                El prototipo no incluye el documento: aquí iría la vista previa del CV.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" disabled>
            Descargar
          </Button>
        </div>
        <p className="text-xs text-text-2">{AVISO_USO_DEL_CV}</p>
      </section>

      <section aria-label="Evaluación de la IA" className="space-y-3">
        <h2 className="text-text">Evaluación de la IA</h2>
        {evaluacion === null ? (
          analisis?.id === detalle.id && analisis.fase === 'ERROR' ? (
            <p
              role="alert"
              className="rounded-xl border border-border bg-surface p-4 text-sm text-danger-text"
            >
              No se pudo evaluar: {analisis.mensaje} Puedes decidir igualmente.
            </p>
          ) : analisis?.id === detalle.id ? (
            <p
              role="status"
              className="rounded-xl border border-border bg-surface p-4 text-sm text-text-2"
            >
              Analizando…
            </p>
          ) : (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-2">
              Esta postulación todavía no tiene evaluación.
            </p>
          )
        ) : (
          <>
            <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs text-text-2">Puntaje final</p>
                  <p className="text-2xl font-semibold text-text tabular-nums">
                    {evaluacion.puntajeTotal}
                    <span className="text-sm font-normal text-text-2">/100</span>
                  </p>
                </div>
                <BarraPuntaje puntaje={evaluacion.puntajeTotal} />
              </div>
              <p className="text-sm text-text">{evaluacion.justificacion}</p>
              <p className="text-xs text-text-2">Evaluada el {evaluacion.fechaTexto}.</p>
              <p className="text-xs text-text-2">{NOTA_PUNTAJE_ES_AYUDA}</p>
            </div>
            <DesgloseEvaluacion
              puntajeArea={evaluacion.puntajeArea}
              puntajeEspecialidad={evaluacion.puntajeEspecialidad}
              bloques={evaluacion.bloques}
            />
          </>
        )}
      </section>

      <section aria-label="Historial de la postulación" className="space-y-3">
        <h2 className="text-text">Historial de la postulación</h2>
        <LineaTiempo eventos={detalle.eventos} />
      </section>
    </article>
  );
}
