import { useCallback } from 'react';
import { Link, useParams } from 'react-router';
import {
  aDetalleSupervisor,
  type ProyectoACargoParaVista,
  type TareaPorRevisarParaVista,
} from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { Insignia } from '@/compartido/Insignia';
import { LineaTiempo } from '@/compartido/LineaTiempo';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, obtenerSupervisor, type Entorno } from '@/services';
import { RUTA_SUPERVISORES } from './rutas';

function VolverAlListado() {
  return (
    <Link
      to={RUTA_SUPERVISORES}
      className="text-sm font-medium text-link underline underline-offset-2"
    >
      Volver a supervisores
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

function ProyectosACargo({ proyectos }: { proyectos: ProyectoACargoParaVista[] }) {
  return (
    <section aria-label="Proyectos a cargo" className="space-y-2">
      <h2 className="text-text">Proyectos a cargo</h2>
      {proyectos.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-2">
          No tiene proyectos a cargo.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {proyectos.map((p) => (
            <li
              key={p.proyecto.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-text">{p.proyecto.nombre}</span>
                <span className="text-text-2">{p.proyecto.codigo}</span>
                <Insignia tipo="proyecto" estado={p.estado} />
              </div>
              <p className="text-text-2">
                Reunión semanal: {p.reunionTexto} ·{' '}
                {plural(p.practicantesActivos, 'practicante', 'practicantes')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TareasPorRevisar({ tareas }: { tareas: TareaPorRevisarParaVista[] }) {
  return (
    <section aria-label="Tareas por revisar" className="space-y-2">
      <h2 className="text-text">Tareas por revisar</h2>
      {tareas.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-2">
          No tiene tareas esperando su aprobación.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {tareas.map(({ tarea, proyecto, diasEsperando }) => (
            <li
              key={tarea.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <div>
                <p className="text-text">
                  <span className="font-medium">{tarea.idLegible}</span> · {tarea.titulo}
                </p>
                <p className="text-xs text-text-2">{proyecto.nombre}</p>
              </div>
              <p className="text-text-2 tabular-nums">
                {diasEsperando === null
                  ? 'Esperando'
                  : diasEsperando === 0
                    ? 'Esperando desde hoy'
                    : `Esperando hace ${plural(diasEsperando, 'día', 'días')}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Detalle de un supervisor (§5.3): datos de contacto de solo lectura, proyectos a cargo con su reunión semanal y cuántos
 * practicantes tienen, tareas que esperan su aprobación y desde hace cuántos días, proyectos anteriores y línea de tiempo.
 * Lee con `obtenerSupervisor`; no decide nada. `entorno` solo lo cambian las pruebas.
 */
export function PaginaDetalleSupervisor({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { idSupervisor } = useParams();
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;

  const cargar = useCallback(
    () =>
      obtenerSupervisor({ idActor: idUsuario ?? '', idSupervisor: idSupervisor ?? '' }, entorno),
    [entorno, idUsuario, idSupervisor],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);

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
      <div className="space-y-2" role="status" aria-label="Cargando el supervisor">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const detalle = aDetalleSupervisor(consulta.valor);

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <VolverAlListado />
        <h1 className="text-text">{detalle.nombre}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Insignia tipo="supervisor" estado={detalle.estado} />
        </div>
      </header>

      <section aria-label="Datos de contacto" className="space-y-2">
        <h2 className="text-text">Datos de contacto</h2>
        <dl className="grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
          <Dato etiqueta="Correo institucional">{detalle.correo}</Dato>
          <Dato etiqueta="Celular">{detalle.celular}</Dato>
          <Dato etiqueta="Discord">{detalle.discord ?? '—'}</Dato>
          <Dato etiqueta="GitHub">{detalle.cuentaGithub ?? '—'}</Dato>
          <Dato etiqueta="Cuenta creada">{detalle.altaTexto}</Dato>
        </dl>
      </section>

      <ProyectosACargo proyectos={detalle.proyectosACargo} />
      <TareasPorRevisar tareas={detalle.tareasPorRevisar} />

      <section aria-label="Proyectos anteriores" className="space-y-2">
        <h2 className="text-text">Proyectos anteriores</h2>
        {detalle.proyectosAnteriores.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-2">
            Aún no tiene proyectos anteriores.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {detalle.proyectosAnteriores.map((p) => (
              <li
                key={p.proyecto.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text">{p.proyecto.nombre}</span>
                  <span className="text-text-2">{p.proyecto.codigo}</span>
                </div>
                <p className="text-text-2 tabular-nums">
                  Finalizado: {p.finRealTexto ?? 'sin fecha registrada'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Línea de tiempo" className="space-y-3">
        <h2 className="text-text">Línea de tiempo</h2>
        <LineaTiempo eventos={detalle.eventos} />
      </section>
    </article>
  );
}
