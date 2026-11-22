import { useCallback } from 'react';
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
import { Insignia } from '@/compartido/Insignia';
import { LineaTiempo } from '@/compartido/LineaTiempo';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { FilasDeDatos, TarjetaDeDatos } from '@/compartido/TarjetaDeDatos';
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
      className="text-sm font-medium text-link underline underline-offset-2"
    >
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

/** La barra de avance del proyecto, con el porcentaje bien visible. */
function BarraDeAvance({ porcentaje, etiqueta }: { porcentaje: number; etiqueta: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full bg-primary" style={{ width: `${porcentaje}%` }} />
      </div>
      <span className="w-12 text-right text-lg font-semibold text-text tabular-nums">
        {porcentaje} %
      </span>
    </div>
  );
}

/**
 * El encabezado del proyecto, en una tarjeta propia y visible en las tres pestañas: código, nombre y estado, el avance bien
 * visible y los datos secundarios en filas (supervisor, reunión, rama base y repositorio).
 */
function EncabezadoDelProyecto({
  nombre,
  codigo,
  estado,
  resumen,
}: {
  nombre: string;
  codigo: string;
  estado: ResumenPracticanteParaVista['estado'];
  resumen: ResumenPracticanteParaVista | null;
}) {
  return (
    <section
      aria-label="Encabezado del proyecto"
      className="space-y-3 rounded-xl border border-border bg-surface p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-text">{nombre}</h1>
        <span className="text-sm text-text-2">{codigo}</span>
        <Insignia tipo="proyecto" estado={estado} />
      </div>
      {resumen === null ? (
        <div role="status" aria-label="Cargando los datos del proyecto" className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          <BarraDeAvance porcentaje={resumen.avance} etiqueta="Avance del proyecto" />
          <FilasDeDatos
            filas={[
              { etiqueta: 'Supervisor', valor: resumen.supervisor },
              {
                etiqueta: 'Reunión semanal',
                valor:
                  resumen.proximaReunionTexto === 'Sin definir'
                    ? resumen.reunionTexto
                    : `${resumen.reunionTexto} · próxima ${resumen.proximaReunionTexto}`,
              },
              { etiqueta: 'Rama base', valor: resumen.ramaBase },
              { etiqueta: 'Repositorio', valor: <EnlaceExterno url={resumen.repositorioUrl} /> },
            ]}
          />
        </>
      )}
    </section>
  );
}

const MENSAJE_VACIO = 'rounded-lg bg-surface-2 px-3 py-2 text-sm text-text-2';

/**
 * Resumen (solo lectura, sin ningún botón de edición): una tarjeta con título por tema. En pantalla ancha va en dos
 * columnas independientes, cada tarjeta con la altura de su contenido y repartidas para que las dos columnas midan
 * parecido; en móvil, en una sola.
 */
function Resumen({ resumen }: { resumen: ResumenPracticanteParaVista }) {
  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-3">
        <TarjetaDeDatos titulo="Descripción">
          <p className="text-sm whitespace-pre-line text-text">{resumen.descripcion}</p>
        </TarjetaDeDatos>
        <TarjetaDeDatos titulo="Enlaces y repositorio">
          <FilasDeDatos
            filas={[
              { etiqueta: 'Repositorio', valor: <EnlaceExterno url={resumen.repositorioUrl} /> },
              { etiqueta: 'Rama base', valor: resumen.ramaBase },
              ...resumen.enlaces.map((e) => ({
                etiqueta: e.nombre,
                valor: <EnlaceExterno url={e.url} />,
              })),
            ]}
          />
          {resumen.enlaces.length === 0 && (
            <p className="text-xs text-text-2">Aún no hay enlaces útiles.</p>
          )}
        </TarjetaDeDatos>
        <TarjetaDeDatos titulo="Mis tareas">
          {resumen.misTareas.length === 0 ? (
            <p className={MENSAJE_VACIO}>No tienes tareas abiertas en este proyecto.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {resumen.misTareas.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5 first:pt-0 last:pb-0"
                >
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
                </li>
              ))}
            </ul>
          )}
        </TarjetaDeDatos>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <TarjetaDeDatos titulo="Fechas y datos del proyecto">
          <FilasDeDatos
            filas={[
              { etiqueta: 'Código', valor: resumen.codigo },
              { etiqueta: 'Fecha de inicio', valor: resumen.fechaInicioTexto },
              { etiqueta: 'Fecha de fin prevista', valor: resumen.fechaFinPrevistaTexto },
              { etiqueta: 'Reunión semanal', valor: resumen.reunionTexto },
              { etiqueta: 'Próxima reunión', valor: resumen.proximaReunionTexto },
            ]}
          />
        </TarjetaDeDatos>
        <TarjetaDeDatos titulo="Avance">
          <BarraDeAvance porcentaje={resumen.avance} etiqueta="Avance del proyecto en el resumen" />
          <p className="text-xs text-text-2 tabular-nums">{resumen.avanceTexto}</p>
        </TarjetaDeDatos>
        <TarjetaDeDatos titulo="Mi actividad">
          <LineaTiempo
            eventos={resumen.miActividad}
            vacio="Aún no tienes actividad en este proyecto."
          />
        </TarjetaDeDatos>
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
    <div className="space-y-4">
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
        <h2 className="text-sm font-semibold text-text">Compañeros</h2>
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
      <section className="space-y-4">
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
      <section className="space-y-4">
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
    <article className="space-y-4">
      <VolverAMisProyectos />
      <EncabezadoDelProyecto
        nombre={cabecera.nombre}
        codigo={cabecera.codigo}
        estado={cabecera.estado}
        resumen={vistaResumen}
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
