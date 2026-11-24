import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { aDetallePostulacion } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { CabeceraDeDetalle } from '@/compartido/CabeceraDeDetalle';
import { Insignia } from '@/compartido/Insignia';
import { LineaTiempo } from '@/compartido/LineaTiempo';
import { ListaDeDefiniciones } from '@/compartido/ListaDeDefiniciones';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
import { Button } from '@/compartido/ui/button';
import { Skeleton } from '@/compartido/ui/skeleton';
import type { Id } from '@/domain';
import { ENTORNO, evaluarPostulacion, obtenerPostulacion, type Entorno } from '@/services';
import { AccionesDePostulacion } from './AccionesDePostulacion';
import { DesgloseEvaluacion } from './DesgloseEvaluacion';
import { RUTA_POSTULACIONES } from './rutas';

/** Aviso sobre el uso del CV (plan §9, módulo 5.1; §10.1). */
export const AVISO_USO_DEL_CV =
  'El CV se usa únicamente para evaluar esta postulación y no para otros fines.';

/** Nota fija de la evaluación (§5.1). */
export const NOTA_PUNTAJE_ES_AYUDA =
  'El puntaje es una ayuda para decidir: la decisión es siempre del Administrador.';

/** Cómo se llega a la nota final (la proporción vigente está en Configuración). */
const FORMULA_DE_LA_NOTA =
  'Nota final = proporción del área × puntaje del área + proporción de la especialidad × puntaje de la especialidad, redondeada.';

/** El estado del análisis de la IA de una postulación que no tenía evaluación. */
type EstadoAnalisis = { id: Id; fase: 'ANALIZANDO' } | { id: Id; fase: 'ERROR'; mensaje: string };

function VolverAlListado() {
  return (
    <Link
      to={RUTA_POSTULACIONES}
      className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline"
    >
      <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
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
      <section className="space-y-3">
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
  const hace = formatDistanceToNowStrict(detalle.fecha, { addSuffix: true, locale: es });

  return (
    <article className="space-y-3">
      <CabeceraDeDetalle
        volver={{ a: RUTA_POSTULACIONES, etiqueta: 'Volver a postulaciones' }}
        titulo={detalle.nombre}
        avatarDe={detalle.nombre}
        insignias={
          <>
            <Insignia tipo="postulacion" estado={detalle.estado} />
            {evaluacion?.requiereRevision && <Insignia tipo="marca" estado="REVISION_MANUAL" />}
          </>
        }
        metadatos={`${detalle.area} · ${detalle.especialidad} · ${detalle.fechaTexto} · ${hace}`}
        acciones={
          <AccionesDePostulacion
            idActor={idUsuario}
            postulacion={{ id: detalle.id, nombre: detalle.nombre, correo: detalle.correo }}
            decisiones={detalle.decisiones}
            entorno={entorno}
          />
        }
      />

      {detalle.practicante && (
        <p className="text-xs text-text-2">
          Se creó la cuenta de practicante de <strong>{detalle.practicante.nombre}</strong>.
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <PanelDeDatos titulo="Datos del postulante">
            <ListaDeDefiniciones
              disposicion="filas"
              items={[
                { etiqueta: 'Correo', valor: detalle.correo },
                { etiqueta: 'Celular', valor: detalle.celular },
                { etiqueta: 'Área técnica', valor: detalle.area },
                { etiqueta: 'Especialidad', valor: detalle.especialidad },
                {
                  etiqueta: 'Fecha de postulación',
                  valor: <span className="tabular-nums">{detalle.fechaTexto}</span>,
                },
              ]}
            />
          </PanelDeDatos>

          <PanelDeDatos titulo="Currículum">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileText
                  className="size-5 shrink-0 text-text-2"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{detalle.cv.nombre}</p>
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
          </PanelDeDatos>

          <PanelDeDatos titulo="Historial de la postulación">
            <LineaTiempo eventos={detalle.eventos} />
          </PanelDeDatos>
        </div>

        <PanelDeDatos titulo="Evaluación de la IA" className="lg:col-span-3">
          {evaluacion === null ? (
            analisis?.id === detalle.id && analisis.fase === 'ERROR' ? (
              <p role="alert" className="text-sm text-danger-text">
                No se pudo evaluar: {analisis.mensaje} Puedes decidir igualmente.
              </p>
            ) : analisis?.id === detalle.id ? (
              <p role="status" className="text-sm text-text-2">
                Analizando…
              </p>
            ) : (
              <p className="text-sm text-text-2">Esta postulación todavía no tiene evaluación.</p>
            )
          ) : (
            <>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-text-2">Puntaje final</p>
                  <p className="text-3xl font-semibold text-text tabular-nums">
                    {evaluacion.puntajeTotal}
                    <span className="text-sm font-normal text-text-2">/100</span>
                  </p>
                </div>
                <div
                  role="progressbar"
                  aria-label="Puntaje de la IA"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={evaluacion.puntajeTotal}
                  className="h-2 overflow-hidden rounded-full bg-surface-2"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, Math.max(0, evaluacion.puntajeTotal))}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-text">{evaluacion.justificacion}</p>
              <p className="text-xs text-text-2">
                {evaluacion.pesos?.formula ?? FORMULA_DE_LA_NOTA}
              </p>
              <div className="border-t border-border pt-3">
                <DesgloseEvaluacion
                  puntajeArea={evaluacion.puntajeArea}
                  puntajeEspecialidad={evaluacion.puntajeEspecialidad}
                  pesos={evaluacion.pesos}
                  bloques={evaluacion.bloques}
                />
              </div>
              <div className="space-y-1 border-t border-border pt-3">
                <p className="text-xs text-text-2">Evaluada el {evaluacion.fechaTexto}.</p>
                <p className="text-xs text-text-2">{NOTA_PUNTAJE_ES_AYUDA}</p>
              </div>
            </>
          )}
        </PanelDeDatos>
      </div>
    </article>
  );
}
