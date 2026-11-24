import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import {
  aEquipoPracticante,
  aResumenProyectoPracticante,
  claseDeProyecto,
  diaVisible,
  type EquipoPracticanteParaVista,
  type FilaCompanero,
  type ResumenPracticanteParaVista,
} from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { AvatarIniciales } from '@/compartido/AvatarIniciales';
import { CabeceraDeDetalle } from '@/compartido/CabeceraDeDetalle';
import { Insignia } from '@/compartido/Insignia';
import { ListaDeDefiniciones } from '@/compartido/ListaDeDefiniciones';
import { FilaDeLista, ListaDeFilas } from '@/compartido/ListaDeFilas';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
import { LineaTiempo } from '@/compartido/LineaTiempo';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { FilasDeDatos } from '@/compartido/TarjetaDeDatos';
import { Skeleton } from '@/compartido/ui/skeleton';
import { cn } from '@/compartido/utils';
import {
  ENTORNO,
  listarMisProyectos,
  obtenerEquipoProyecto,
  obtenerProyecto,
  type Entorno,
} from '@/services';
import { TableroDelProyecto } from '@/paneles/administrador/proyectos/TableroDelProyecto';
import {
  PESTANA_INICIAL,
  PESTANAS_DEL_PROYECTO,
  type PestanaDelProyecto,
} from '@/paneles/administrador/proyectos/rutas';
import { RUTA_MIS_PROYECTOS_PRACTICANTE, rutaDeProyectoAnterior } from './rutas';

const ETIQUETA_PESTANA: Record<PestanaDelProyecto, string> = {
  resumen: 'Resumen',
  tablero: 'Tablero',
  equipo: 'Equipo',
};

export function VolverAMisProyectos() {
  return (
    <Link
      to={RUTA_MIS_PROYECTOS_PRACTICANTE}
      className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline"
    >
      <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
      Volver a mis proyectos
    </Link>
  );
}

function EnlaceExterno({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="font-medium break-all text-link underline underline-offset-2"
    >
      {url}
    </a>
  );
}

/** La barra de avance del proyecto, igual que la del Resumen del Administrador y del Supervisor. */
function BarraDeAvance({ porcentaje, etiqueta }: { porcentaje: number; etiqueta: string }) {
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
      className="h-2 overflow-hidden rounded-full bg-surface-2"
    >
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }}
      />
    </div>
  );
}

const MENSAJE_VACIO = 'text-sm text-text-2';

/**
 * Resumen (solo lectura, sin ningún botón de edición), con el mismo aspecto que el del Administrador y el Supervisor:
 * datos en rejilla, y debajo, en dos columnas independientes, Avance, Enlaces útiles y Mis tareas a la izquierda y Mi
 * actividad a la derecha. Sin valores repetidos: el código y el estado van en la cabecera de la página.
 */
function Resumen({ resumen }: { resumen: ResumenPracticanteParaVista }) {
  return (
    <div className="space-y-3">
      <PanelDeDatos titulo="Datos del proyecto">
        <ListaDeDefiniciones
          items={[
            { etiqueta: 'Supervisor', valor: resumen.supervisor },
            {
              etiqueta: 'Reunión semanal',
              valor: (
                <>
                  {resumen.reunionTexto}
                  {resumen.proximaReunionTexto !== 'Sin definir' && (
                    <span className="ml-2 text-text-2">
                      (próxima: {resumen.proximaReunionTexto})
                    </span>
                  )}
                </>
              ),
            },
            { etiqueta: 'Rama base', valor: resumen.ramaBase },
            { etiqueta: 'Fecha de inicio', valor: resumen.fechaInicioTexto },
            { etiqueta: 'Fecha de fin prevista', valor: resumen.fechaFinPrevistaTexto },
            { etiqueta: 'Repositorio', valor: <EnlaceExterno url={resumen.repositorioUrl} /> },
          ]}
        />
        <div className="border-t border-border pt-3">
          <p className="text-xs text-text-2">Descripción</p>
          <p className="text-sm whitespace-pre-line text-text">{resumen.descripcion}</p>
        </div>
      </PanelDeDatos>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <PanelDeDatos titulo="Avance">
            <p className="text-sm text-text">Tareas terminadas: {resumen.avanceTexto}</p>
            <BarraDeAvance porcentaje={resumen.avance} etiqueta="Avance del proyecto" />
          </PanelDeDatos>

          <PanelDeDatos titulo="Enlaces útiles">
            {resumen.enlaces.length === 0 ? (
              <p className="text-sm text-text-2">Aún no hay enlaces útiles.</p>
            ) : (
              <ListaDeFilas>
                {resumen.enlaces.map((e) => (
                  <FilaDeLista key={e.url}>
                    <div className="min-w-0">
                      <p className="font-medium text-text">{e.nombre}</p>
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-xs text-link underline underline-offset-2"
                      >
                        {e.url}
                      </a>
                    </div>
                  </FilaDeLista>
                ))}
              </ListaDeFilas>
            )}
          </PanelDeDatos>

          <PanelDeDatos titulo="Mis tareas">
            {resumen.misTareas.length === 0 ? (
              <p className={MENSAJE_VACIO}>No tienes tareas abiertas en este proyecto.</p>
            ) : (
              <ListaDeFilas>
                {resumen.misTareas.map((t) => (
                  <FilaDeLista key={t.id}>
                    <span className="min-w-0 text-text">
                      <span className="font-medium tabular-nums">{t.idLegible}</span> · {t.titulo}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-xs tabular-nums',
                          t.vencida ? 'font-medium text-danger-text' : 'text-text-2',
                        )}
                      >
                        Límite: {diaVisible(t.fechaLimite)}
                        {t.vencida && ' (vencida)'}
                      </span>
                      <Insignia tipo="tarea" estado={t.estado} />
                    </span>
                  </FilaDeLista>
                ))}
              </ListaDeFilas>
            )}
          </PanelDeDatos>
        </div>

        <PanelDeDatos titulo="Mi actividad" className="lg:col-span-3">
          <LineaTiempo
            eventos={resumen.miActividad}
            vacio="Aún no tienes actividad en este proyecto."
          />
        </PanelDeDatos>
      </div>
    </div>
  );
}

/** La carga, en una insignia neutra con los colores del tema. */
function InsigniaDeCarga({ carga }: { carga: number }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-state-neutral-bg px-2 py-0.5 text-xs font-medium whitespace-nowrap text-state-neutral-text tabular-nums">
      Carga {carga}
    </span>
  );
}

/** Una tarjeta pequeña por compañero: avatar, nombre, especialidad, carga y, en dos filas cortas, Discord y GitHub. */
function TarjetaDeCompanero({ c }: { c: FilaCompanero }) {
  return (
    <li className="space-y-2 rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        <AvatarIniciales nombre={c.nombre} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">{c.nombre}</p>
          <p className="truncate text-xs text-text-2">{c.especialidad}</p>
        </div>
        <InsigniaDeCarga carga={c.carga} />
      </div>
      <FilasDeDatos
        filas={[
          { etiqueta: 'Discord', valor: c.discord },
          { etiqueta: 'GitHub', valor: c.github },
        ]}
      />
    </li>
  );
}

/**
 * Equipo: el supervisor en su propia tarjeta, destacada y a todo el ancho, y debajo una cuadrícula de tarjetas pequeñas, una
 * por compañero (2 columnas en pantalla ancha y 1 en móvil). Solo lo que el Practicante puede ver de los demás: sin correo
 * ni celular y sin compañeros anteriores (§9.2).
 */
function Equipo({ equipo }: { equipo: EquipoPracticanteParaVista }) {
  const s = equipo.supervisor;
  return (
    <div className="space-y-3">
      <section
        aria-label="Supervisor"
        className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-l-4 border-border border-l-primary bg-surface p-3"
      >
        <div className="flex min-w-0 items-center gap-3">
          <AvatarIniciales nombre={s.nombre} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{s.nombre}</p>
            <p className="text-xs text-text-2">Supervisor</p>
          </div>
        </div>
        <FilasDeDatos
          className="min-w-56 flex-1"
          filas={[
            { etiqueta: 'Discord', valor: s.discord },
            { etiqueta: 'GitHub', valor: s.github },
          ]}
        />
      </section>

      <section aria-label="Compañeros" className="space-y-2">
        <h2 className="text-base font-semibold text-text">Compañeros</h2>
        {equipo.companeros.length === 0 ? (
          <p className={MENSAJE_VACIO}>No tienes compañeros activos en este proyecto.</p>
        ) : (
          <ul className="grid items-start gap-3 md:grid-cols-2">
            {equipo.companeros.map((c) => (
              <TarjetaDeCompanero key={c.id} c={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Cargando({ etiqueta }: { etiqueta: string }) {
  return (
    <div className="space-y-2" role="status" aria-label={etiqueta}>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

/**
 * El detalle de un proyecto vigente (§9.2.1), con tres pestañas en `?pestana=` (una desconocida abre «Resumen»). Primero
 * averigua con `listarMisProyectos` qué es el proyecto para quien mira: si ya no es vigente (finalizado o «Ya no
 * participas») redirige a su resumen mínimo, y si no es suyo no muestra nada. Solo lectura: las acciones sobre las tareas
 * se hacen en el detalle de cada tarea. `entorno` solo lo cambian las pruebas.
 */
export function PaginaDetalleProyectoPracticante({
  entorno = ENTORNO,
}: { entorno?: Entorno } = {}) {
  const { idProyecto = '' } = useParams();
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const [parametros, setParametros] = useSearchParams();

  const pedida = parametros.get('pestana');
  const pestana: PestanaDelProyecto = (PESTANAS_DEL_PROYECTO as readonly string[]).includes(
    pedida ?? '',
  )
    ? (pedida as PestanaDelProyecto)
    : PESTANA_INICIAL;

  const cargarMios = useCallback(
    () => listarMisProyectos({ idActor: idUsuario ?? '' }, entorno),
    [entorno, idUsuario],
  );
  const mios = useConsulta(idUsuario === null ? null : cargarMios);
  const clase = mios.valor === null ? null : claseDeProyecto(mios.valor, idProyecto);
  const vigente = clase === 'VIGENTE';

  const cargarResumen = useCallback(
    () => obtenerProyecto({ idActor: idUsuario ?? '', idProyecto }, entorno),
    [entorno, idUsuario, idProyecto],
  );
  const cargarEquipo = useCallback(
    () => obtenerEquipoProyecto({ idActor: idUsuario ?? '', idProyecto }, entorno),
    [entorno, idUsuario, idProyecto],
  );
  // El encabezado necesita el resumen en las tres pestañas (avance, supervisor, repositorio y rama base).
  const resumen = useConsulta(vigente ? cargarResumen : null);
  const equipo = useConsulta(vigente && pestana === 'equipo' ? cargarEquipo : null);
  const cabecera = mios.valor?.vigentes.find((p) => p.id === idProyecto) ?? null;

  if (idUsuario === null) return null;

  if (mios.error) {
    return (
      <section className="space-y-3">
        <VolverAMisProyectos />
        <p role="alert" className="text-sm text-danger-text">
          {mios.error}
        </p>
      </section>
    );
  }
  if (clase === null) return <Cargando etiqueta="Cargando el proyecto" />;
  if (clase === 'ANTERIOR') return <Navigate to={rutaDeProyectoAnterior(idProyecto)} replace />;
  if (clase === 'AJENO' || cabecera === null) {
    return (
      <section className="space-y-3">
        <VolverAMisProyectos />
        <p role="alert" className="text-sm text-danger-text">
          No se encontró el proyecto.
        </p>
      </section>
    );
  }

  const vistaResumen =
    resumen.valor !== null && resumen.valor.vista === 'PRACTICANTE'
      ? aResumenProyectoPracticante(resumen.valor)
      : null;

  function contenido() {
    if (pestana === 'resumen') {
      if (resumen.error) {
        return (
          <p role="alert" className="text-sm text-danger-text">
            {resumen.error}
          </p>
        );
      }
      if (vistaResumen === null) return <Cargando etiqueta="Cargando el resumen" />;
      return <Resumen resumen={vistaResumen} />;
    }
    if (pestana === 'tablero') {
      return (
        <TableroDelProyecto
          idActor={idUsuario!}
          proyecto={{ id: cabecera!.id, nombre: cabecera!.nombre }}
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
    if (equipo.valor === null || equipo.valor.vista !== 'PRACTICANTE') {
      return <Cargando etiqueta="Cargando el equipo" />;
    }
    return <Equipo equipo={aEquipoPracticante(equipo.valor)} />;
  }

  return (
    <article className="space-y-3">
      <CabeceraDeDetalle
        volver={{ a: RUTA_MIS_PROYECTOS_PRACTICANTE, etiqueta: 'Volver a mis proyectos' }}
        titulo={cabecera.nombre}
        insignias={
          <>
            <Insignia tipo="proyecto" estado={cabecera.estado} />
            <span className="text-sm text-text-2">{cabecera.codigo}</span>
          </>
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
