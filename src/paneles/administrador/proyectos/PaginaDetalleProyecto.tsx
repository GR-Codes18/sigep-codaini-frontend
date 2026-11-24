import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router';
import { aEquipoProyecto, aResumenProyecto, type ResumenParaVista } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { CabeceraDeDetalle } from '@/compartido/CabeceraDeDetalle';
import { Insignia } from '@/compartido/Insignia';
import { LineaTiempo } from '@/compartido/LineaTiempo';
import { ListaDeDefiniciones } from '@/compartido/ListaDeDefiniciones';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
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
      className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline"
    >
      <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
      Volver a proyectos
    </Link>
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
    <div className="space-y-3">
      <PanelDeDatos titulo="Datos del proyecto">
        <ListaDeDefiniciones
          items={[
            { etiqueta: 'Código', valor: proyecto.codigo },
            { etiqueta: 'Supervisor', valor: proyecto.supervisor.nombre },
            {
              etiqueta: 'Reunión semanal',
              valor: (
                <>
                  {proyecto.reunionTexto}
                  {proyecto.proximaReunionTexto !== 'Sin definir' && (
                    <span className="ml-2 text-text-2">
                      (próxima: {proyecto.proximaReunionTexto})
                    </span>
                  )}
                </>
              ),
            },
            { etiqueta: 'Fecha de inicio', valor: proyecto.fechaInicioTexto },
            { etiqueta: 'Fecha de fin prevista', valor: proyecto.fechaFinPrevistaTexto },
            ...(proyecto.fechaFinRealTexto !== null
              ? [{ etiqueta: 'Fecha de finalización', valor: proyecto.fechaFinRealTexto }]
              : []),
            { etiqueta: 'Rama base', valor: proyecto.ramaBase },
            {
              etiqueta: 'Repositorio',
              valor: (
                <a
                  href={proyecto.repositorioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-link underline underline-offset-2"
                >
                  {proyecto.repositorioUrl}
                </a>
              ),
            },
          ]}
        />
        <div className="border-t border-border pt-3">
          <p className="text-xs text-text-2">Descripción</p>
          <p className="text-sm text-text">{proyecto.descripcion}</p>
        </div>
      </PanelDeDatos>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <PanelDeDatos titulo="Avance">
            <p className="text-sm text-text">
              {resumen.avance === null
                ? 'Aún no hay tareas.'
                : `Tareas terminadas: ${resumen.avance.texto}`}
            </p>
            {resumen.avance !== null && (
              <div
                role="progressbar"
                aria-label="Avance del proyecto"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={resumen.avance.porcentaje}
                className="h-2 overflow-hidden rounded-full bg-surface-2"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, Math.max(0, resumen.avance.porcentaje))}%` }}
                />
              </div>
            )}
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Tareas por estado">
              {resumen.tareasPorEstado.map(({ estado, cantidad }) => (
                <li key={estado} className="flex items-center gap-2">
                  <Insignia tipo="tarea" estado={estado} />
                  <span className="text-text tabular-nums">{cantidad}</span>
                </li>
              ))}
            </ul>
            <p className="border-t border-border pt-3 text-sm text-text-2">
              Tareas vencidas:{' '}
              <span className={resumen.tareasVencidas > 0 ? 'text-danger-text' : undefined}>
                {resumen.tareasVencidas}
              </span>
            </p>
          </PanelDeDatos>

          <SeccionEnlaces
            idActor={idActor}
            idProyecto={proyecto.id}
            enlaces={resumen.enlaces}
            puedeGestionar={resumen.acciones.includes('GESTIONAR_ENLACES')}
            entorno={entorno}
          />
        </div>

        <PanelDeDatos titulo="Actividad reciente" className="lg:col-span-3">
          <LineaTiempo eventos={resumen.actividadReciente} />
        </PanelDeDatos>
      </div>
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
      <section className="space-y-3">
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
    <article className="space-y-3">
      <CabeceraDeDetalle
        volver={{ a: rutaDeProyectos(sesion?.rol), etiqueta: 'Volver a proyectos' }}
        titulo={vista.proyecto.nombre}
        insignias={
          <>
            <Insignia tipo="proyecto" estado={vista.proyecto.estado} />
            <span className="text-sm text-text-2">{vista.proyecto.codigo}</span>
          </>
        }
        acciones={
          <AccionesDeProyecto
            idActor={idUsuario}
            proyecto={vista.proyecto}
            acciones={vista.acciones}
            cicloDeVida={vista.cicloDeVida}
            supervisoresDestino={vista.supervisoresDestino}
            entorno={entorno}
          />
        }
      />

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
