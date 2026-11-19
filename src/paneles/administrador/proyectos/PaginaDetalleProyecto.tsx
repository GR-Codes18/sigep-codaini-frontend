import { useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  aEquipoProyecto,
  aResumenProyecto,
  type EquipoParaVista,
  type ResumenParaVista,
} from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { Insignia } from '@/compartido/Insignia';
import { LineaTiempo } from '@/compartido/LineaTiempo';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, obtenerEquipoProyecto, obtenerProyecto, type Entorno } from '@/services';
import {
  PESTANA_INICIAL,
  PESTANAS_DEL_PROYECTO,
  RUTA_PROYECTOS,
  type PestanaDelProyecto,
} from './rutas';

function VolverAlListado() {
  return (
    <Link
      to={RUTA_PROYECTOS}
      className="text-sm font-medium text-link underline underline-offset-2"
    >
      Volver a proyectos
    </Link>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-text-2">{etiqueta}</dt>
      <dd className="text-text">{children}</dd>
    </div>
  );
}

const plural = (n: number, singular: string, plurales: string) =>
  `${n} ${n === 1 ? singular : plurales}`;

function Resumen({ resumen }: { resumen: ResumenParaVista }) {
  const { proyecto } = resumen;
  return (
    <div className="space-y-6">
      <section aria-label="Datos del proyecto" className="space-y-2">
        <h2 className="text-text">Datos del proyecto</h2>
        <dl className="grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
          <Dato etiqueta="Código">{proyecto.codigo}</Dato>
          <Dato etiqueta="Supervisor">{proyecto.supervisor.nombre}</Dato>
          <Dato etiqueta="Fecha de inicio">{proyecto.fechaInicioTexto}</Dato>
          <Dato etiqueta="Fecha de fin prevista">{proyecto.fechaFinPrevistaTexto}</Dato>
          {proyecto.fechaFinRealTexto !== null && (
            <Dato etiqueta="Fecha de finalización">{proyecto.fechaFinRealTexto}</Dato>
          )}
          <Dato etiqueta="Reunión semanal">
            {proyecto.reunionTexto}
            {proyecto.proximaReunionTexto !== 'Sin definir' && (
              <span className="ml-2 text-text-2">(próxima: {proyecto.proximaReunionTexto})</span>
            )}
          </Dato>
          <Dato etiqueta="Repositorio">
            <a
              href={proyecto.repositorioUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-link underline underline-offset-2"
            >
              {proyecto.repositorioUrl}
            </a>
          </Dato>
          <Dato etiqueta="Rama base">{proyecto.ramaBase}</Dato>
          <div className="sm:col-span-2">
            <dt className="text-text-2">Descripción</dt>
            <dd className="text-text">{proyecto.descripcion}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Avance" className="space-y-2">
        <h2 className="text-text">Avance</h2>
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="text-text">
            {resumen.avance === null
              ? 'Aún no hay tareas.'
              : `Tareas terminadas: ${resumen.avance.texto}`}
          </p>
          <ul className="flex flex-wrap gap-4" aria-label="Tareas por estado">
            {resumen.tareasPorEstado.map(({ estado, cantidad }) => (
              <li key={estado} className="flex items-center gap-2">
                <Insignia tipo="tarea" estado={estado} />
                <span className="text-text tabular-nums">{cantidad}</span>
              </li>
            ))}
          </ul>
          <p className="text-text-2">
            Tareas vencidas:{' '}
            <span className={resumen.tareasVencidas > 0 ? 'text-danger-text' : undefined}>
              {resumen.tareasVencidas}
            </span>
          </p>
        </div>
      </section>

      <section aria-label="Enlaces útiles" className="space-y-2">
        <h2 className="text-text">Enlaces útiles</h2>
        {resumen.enlaces.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-2">
            Aún no hay enlaces útiles.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {resumen.enlaces.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <span className="font-medium text-text">{e.nombre}</span>
                <a
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link underline underline-offset-2"
                >
                  {e.url}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Actividad reciente" className="space-y-3">
        <h2 className="text-text">Actividad reciente</h2>
        <LineaTiempo eventos={resumen.actividadReciente} />
      </section>
    </div>
  );
}

function Equipo({ equipo }: { equipo: EquipoParaVista }) {
  return (
    <div className="space-y-6">
      <section aria-label="Practicantes activos" className="space-y-2">
        <h2 className="text-text">Practicantes activos</h2>
        {equipo.activos.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-2">
            Este proyecto aún no tiene practicantes.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {equipo.activos.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-text">{m.nombre}</p>
                  <p className="text-xs text-text-2">
                    {m.correo} · {m.especialidad}
                  </p>
                </div>
                <p className="text-text-2 tabular-nums">
                  {plural(m.carga, 'tarea en progreso', 'tareas en progreso')} · Desde {m.altaTexto}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Practicantes anteriores" className="space-y-2">
        <h2 className="text-text">Practicantes anteriores</h2>
        {equipo.anteriores.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-2">
            Aún no hay practicantes anteriores.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {equipo.anteriores.map((m, i) => (
              <li
                key={`${m.id}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <span className="font-medium text-text">{m.nombre}</span>
                <p className="text-text-2 tabular-nums">
                  Alta: {m.altaTexto} · Baja: {m.bajaTexto}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const ETIQUETA_PESTANA: Record<PestanaDelProyecto, string> = {
  resumen: 'Resumen',
  equipo: 'Equipo',
};

/**
 * Detalle de un proyecto (§5.4) con pestañas en `?pestana=` (resumen o equipo): datos, avance, tareas por estado,
 * enlaces y actividad reciente; y el equipo, activo y anterior. Lee con `obtenerProyecto` y `obtenerEquipoProyecto`; no
 * decide nada. Una pestaña desconocida abre «Resumen». `entorno` solo lo cambian las pruebas.
 */
export function PaginaDetalleProyecto({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { idProyecto } = useParams();
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const [parametros, setParametros] = useSearchParams();

  const pedida = parametros.get('pestana');
  const pestana: PestanaDelProyecto = (PESTANAS_DEL_PROYECTO as readonly string[]).includes(
    pedida ?? '',
  )
    ? (pedida as PestanaDelProyecto)
    : PESTANA_INICIAL;

  const cargarResumen = useCallback(
    () => obtenerProyecto({ idActor: idUsuario ?? '', idProyecto: idProyecto ?? '' }, entorno),
    [entorno, idUsuario, idProyecto],
  );
  const cargarEquipo = useCallback(
    () =>
      obtenerEquipoProyecto({ idActor: idUsuario ?? '', idProyecto: idProyecto ?? '' }, entorno),
    [entorno, idUsuario, idProyecto],
  );
  const resumen = useConsulta(idUsuario === null ? null : cargarResumen);
  const equipo = useConsulta(idUsuario === null || pestana !== 'equipo' ? null : cargarEquipo);

  if (idUsuario === null) return null;

  if (resumen.error) {
    return (
      <section className="space-y-4">
        <VolverAlListado />
        <p role="alert" className="text-sm text-danger-text">
          {resumen.error}
        </p>
      </section>
    );
  }
  if (resumen.valor === null || resumen.valor.vista !== 'GESTION') {
    return (
      <div className="space-y-2" role="status" aria-label="Cargando el proyecto">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const vista = aResumenProyecto(resumen.valor);

  function contenido() {
    if (pestana === 'resumen') return <Resumen resumen={vista} />;
    if (equipo.error) {
      return (
        <p role="alert" className="text-sm text-danger-text">
          {equipo.error}
        </p>
      );
    }
    if (equipo.valor === null || equipo.valor.vista !== 'GESTION') {
      return (
        <div className="space-y-2" role="status" aria-label="Cargando el equipo">
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }
    return <Equipo equipo={aEquipoProyecto(equipo.valor)} />;
  }

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <VolverAlListado />
        <h1 className="text-text">{vista.proyecto.nombre}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Insignia tipo="proyecto" estado={vista.proyecto.estado} />
          <span className="text-sm text-text-2">{vista.proyecto.codigo}</span>
        </div>
      </header>

      <PestanasConContador
        valor={pestana}
        onCambiar={(valor) =>
          setParametros(valor === PESTANA_INICIAL ? {} : { pestana: valor }, { replace: true })
        }
        pestanas={PESTANAS_DEL_PROYECTO.map((p) => ({ valor: p, etiqueta: ETIQUETA_PESTANA[p] }))}
      />

      {contenido()}
    </article>
  );
}
