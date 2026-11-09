import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link, useParams } from 'react-router';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { Insignia } from '@/compartido/Insignia';
import {
  AREAS_EJEMPLO,
  ESPECIALIDADES_EJEMPLO,
  EVALUACIONES_EJEMPLO,
  POSTULANTES_EJEMPLO,
} from './datosEjemplo';
import { detallesDeEjemplo } from './detalleEjemplo';

const nombre = (lista: { id: string; nombre: string }[], id: string) =>
  lista.find((x) => x.id === id)?.nombre ?? '—';

export function DetallePostulacion() {
  const { id } = useParams();
  const postulante = POSTULANTES_EJEMPLO.find((p) => p.id === id);

  if (!postulante) {
    return (
      <section className="space-y-4">
        <Link to="/administrador/postulaciones" className="text-sm text-link underline">
          Volver al listado
        </Link>
        <EstadoVacio titulo="No se encontró la postulación" />
      </section>
    );
  }

  const evaluacion = EVALUACIONES_EJEMPLO.find((e) => e.id_postulante === postulante.id);
  const detalles = evaluacion ? detallesDeEjemplo(evaluacion.id) : [];

  const bloque = (clave: 'AREA' | 'ESPECIALIDAD', titulo: string, puntaje: number) => (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-text">{titulo}</h3>
        <span className="text-sm text-text-2 tabular-nums">{puntaje} / 100</span>
      </div>
      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr className="text-left text-text-2">
            <th className="py-1 font-semibold">Criterio</th>
            <th className="py-1 font-semibold">Peso</th>
            <th className="py-1 font-semibold">Cumple</th>
            <th className="py-1 font-semibold">Puntaje</th>
            <th className="py-1 font-semibold">Observación</th>
          </tr>
        </thead>
        <tbody>
          {detalles
            .filter((x) => x.bloque === clave)
            .map((x) => (
              <tr key={x.id} className="h-9 border-t border-border">
                <td className="text-text">{x.nombre_criterio}</td>
                <td>{x.peso}</td>
                <td>{x.cumplido ? 'Sí' : 'No'}</td>
                <td>{x.puntaje_obtenido}</td>
                <td className="text-text-2">{x.observacion ?? '—'}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  );

  return (
    <section className="space-y-6">
      <Link to="/administrador/postulaciones" className="text-sm text-link underline">
        Volver al listado
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-text">{postulante.nombre}</h1>
        <Insignia tipo="postulacion" estado={postulante.estado} />
        {evaluacion?.requiere_revision_manual && <Insignia tipo="marca" estado="REVISION_MANUAL" />}
      </div>

      <dl className="grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-text-2">Correo</dt>
          <dd className="text-text">{postulante.correo}</dd>
        </div>
        <div>
          <dt className="text-text-2">Celular</dt>
          <dd className="text-text">{postulante.celular}</dd>
        </div>
        <div>
          <dt className="text-text-2">Área técnica</dt>
          <dd className="text-text">{nombre(AREAS_EJEMPLO, postulante.id_area_tecnica)}</dd>
        </div>
        <div>
          <dt className="text-text-2">Especialidad</dt>
          <dd className="text-text">
            {nombre(ESPECIALIDADES_EJEMPLO, postulante.id_especialidad)}
          </dd>
        </div>
        <div>
          <dt className="text-text-2">Fecha de postulación</dt>
          <dd className="text-text">
            {format(parseISO(postulante.fecha_postulacion), 'd MMM yyyy', { locale: es })}
          </dd>
        </div>
        <div>
          <dt className="text-text-2">CV</dt>
          <dd>
            <a href={postulante.cv.url} download className="text-link underline">
              {postulante.cv.nombre} (descargar)
            </a>
          </dd>
        </div>
      </dl>

      <section className="space-y-3">
        <h2 className="text-text">Evaluación de la IA</h2>
        {evaluacion ? (
          <>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-2xl font-semibold text-text tabular-nums">
                {evaluacion.puntaje_total} / 100
              </p>
              <p className="mt-1 text-sm text-text-2">{evaluacion.justificacion}</p>
              <p className="mt-2 text-xs text-text-2 tabular-nums">
                0,4 × {evaluacion.puntaje_area} (área) + 0,6 × {evaluacion.puntaje_especialidad}{' '}
                (especialidad)
              </p>
            </div>
            {bloque('AREA', 'Criterios del área', evaluacion.puntaje_area)}
            {bloque(
              'ESPECIALIDAD',
              'Criterios de la especialidad',
              evaluacion.puntaje_especialidad,
            )}
          </>
        ) : (
          <EstadoVacio titulo="Esta postulación aún no fue evaluada" />
        )}
        <p className="text-sm text-text-2">
          El puntaje es una ayuda; la decisión es del Administrador.
        </p>
      </section>

      <p className="text-xs text-text-2">
        El CV contiene datos personales: se usa únicamente para evaluar esta postulación y no para
        otros fines.
      </p>
    </section>
  );
}
