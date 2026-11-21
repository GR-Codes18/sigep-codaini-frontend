import { useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { aEquipoProyecto, aResumenProyecto, type ResumenParaVista } from '@/app/adaptadores';
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
  rutaDeProyectos,
  type PestanaDelProyecto,
} from './rutas';
import { AccionesDeProyecto } from './AccionesDeProyecto';
import { EquipoDelProyecto } from './EquipoDelProyecto';
import { SeccionEnlaces } from './SeccionEnlaces';
import { TableroDelProyecto } from './TableroDelProyecto';

function VolverAlListado() {
  const { sesion } = useSesionActiva();
  return (
    <Link
      to={rutaDeProyectos(sesion?.rol)}
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

function Resumen({
  resumen,
  idActor,
  entorno,
}: {
  resumen: ResumenParaVista;
  idActor: string;
  entorno: Entorno;
}) {
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

      <SeccionEnlaces
        idActor={idActor}
        idProyecto={proyecto.id}
        enlaces={resumen.enlaces}
        puedeGestionar={resumen.acciones.includes('GESTIONAR_ENLACES')}
        entorno={entorno}
      />

      <section aria-label="Actividad reciente" className="space-y-3">
        <h2 className="text-text">Actividad reciente</h2>
        <LineaTiempo eventos={resumen.actividadReciente} />
      </section>
    </div>
  );
}

const ETIQUETA_PESTANA: Record<PestanaDelProyecto, string> = {
  resumen: 'Resumen',
  tablero: 'Tablero',
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
    if (pestana === 'resumen')
      return <Resumen resumen={vista} idActor={idUsuario!} entorno={entorno} />;
    if (pestana === 'tablero') {
      return (
        <TableroDelProyecto
          idActor={idUsuario!}
          proyecto={{ id: vista.proyecto.id, nombre: vista.proyecto.nombre }}
          entorno={entorno}
        />
      );
    }
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
    return (
      <EquipoDelProyecto
        idActor={idUsuario!}
        proyecto={{ id: vista.proyecto.id, nombre: vista.proyecto.nombre }}
        equipo={aEquipoProyecto(equipo.valor)}
        entorno={entorno}
      />
    );
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
        <AccionesDeProyecto
          idActor={idUsuario}
          proyecto={vista.proyecto}
          acciones={vista.acciones}
          cicloDeVida={vista.cicloDeVida}
          supervisoresDestino={vista.supervisoresDestino}
          entorno={entorno}
        />
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
