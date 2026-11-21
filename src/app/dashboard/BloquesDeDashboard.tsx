import { Link } from 'react-router';
import type { FilaAvance, FilaPorRevisar, FilaReunion } from '@/app/adaptadores';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { cn } from '@/compartido/utils';

/**
 * Los bloques que comparten los dashboards del Administrador (§5.9) y del Supervisor (§9.1.5). Solo presentan lo que la
 * consulta entrega. Con `compacta` ocupan menos espacio (el del Supervisor): el del Administrador no la usa y se ve igual
 * que antes.
 */

export function Seccion({
  titulo,
  accion,
  children,
}: {
  titulo: string;
  /** Un enlace o botón a la derecha del título (por ejemplo, «Ver todas en Reportes»). */
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={titulo} className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-text">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

export function EnlaceDeTarjeta({ a, children }: { a: string; children: React.ReactNode }) {
  return (
    <Link to={a} className="font-medium text-link underline underline-offset-2">
      {children}
    </Link>
  );
}

/**
 * Un bloque sin nada que mostrar. Compacto es una sola línea baja, para que un bloque vacío no cambie mucho la altura del
 * conjunto.
 */
export function Vacio({
  titulo,
  descripcion,
  compacta = false,
}: {
  titulo: string;
  descripcion?: string;
  compacta?: boolean;
}) {
  if (!compacta) return <EstadoVacio titulo={titulo} descripcion={descripcion} />;
  return (
    <p className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-2">
      {titulo}
      {descripcion && <span className="block text-xs">{descripcion}</span>}
    </p>
  );
}

/** El tono de una tarjeta: ámbar o rojo solo cuando hay algo que atender; sin tono es la tarjeta de siempre. */
export type TonoDeTarjeta = 'ambar' | 'rojo';

const CLASES_DE_TONO: Record<TonoDeTarjeta, { caja: string; cifra: string; texto: string }> = {
  ambar: {
    caja: 'border-state-warning bg-state-warning-bg',
    cifra: 'text-state-warning-text',
    texto: 'text-state-warning-text',
  },
  rojo: {
    caja: 'border-state-danger bg-state-danger-bg',
    cifra: 'text-state-danger-text',
    texto: 'text-state-danger-text',
  },
};

/**
 * Una tarjeta de métrica: la cifra principal enlaza a su módulo con el filtro ya aplicado. La compacta pone la etiqueta, la
 * cifra y la cifra secundaria en tres líneas cortas, con poco relleno y sin crecer con el contenido.
 */
export function Tarjeta({
  titulo,
  valor,
  enlace,
  secundario,
  tono,
  compacta = false,
}: {
  titulo: string;
  valor: number;
  enlace: string;
  secundario: React.ReactNode;
  tono?: TonoDeTarjeta;
  compacta?: boolean;
}) {
  const clases = tono === undefined ? null : CLASES_DE_TONO[tono];
  return (
    <article
      aria-label={titulo}
      className={cn(
        'rounded-xl border bg-surface',
        clases?.caja ?? 'border-border',
        compacta ? 'px-3 py-2' : 'space-y-1 p-4',
      )}
    >
      <h2
        className={cn(
          'font-medium',
          compacta ? 'truncate text-xs' : 'text-sm',
          clases?.texto ?? 'text-text-2',
        )}
      >
        {titulo}
      </h2>
      <p
        className={cn(
          'font-semibold tabular-nums',
          compacta ? 'text-2xl leading-tight' : 'text-3xl',
          clases?.cifra ?? 'text-text',
        )}
      >
        <Link
          to={enlace}
          aria-label={`${titulo}: ${valor}`}
          className="underline-offset-4 hover:underline"
        >
          {valor}
        </Link>
      </p>
      <p className={cn(compacta ? 'truncate text-xs' : 'text-sm', clases?.texto ?? 'text-text-2')}>
        {secundario}
      </p>
    </article>
  );
}

function EnlaceODato({ ruta, children }: { ruta: string | null; children: React.ReactNode }) {
  return ruta === null ? (
    <span className="font-medium text-text">{children}</span>
  ) : (
    <Link to={ruta} className="font-medium text-link underline underline-offset-2">
      {children}
    </Link>
  );
}

/**
 * La cola de revisión: las tareas que más llevan esperando supervisión. Con `compacta`, cada tarea es una sola fila (ID,
 * título, proyecto, responsable y días esperando) con el título como enlace al detalle, donde se decide; sin tarjeta por
 * fila. Sin ella, la presentación de siempre del Administrador.
 */
export function PorRevisar({
  filas,
  vacio,
  compacta = false,
}: {
  filas: FilaPorRevisar[];
  vacio: string;
  compacta?: boolean;
}) {
  return (
    <Seccion titulo="Por revisar">
      {filas.length === 0 ? (
        <Vacio titulo={vacio} compacta={compacta} />
      ) : compacta ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {filas.map((t) => (
            <li
              key={t.id}
              className="grid gap-x-3 gap-y-0.5 px-3 py-1.5 text-sm md:grid-cols-[5.5rem_minmax(0,1fr)_12rem_10rem_6.5rem] md:items-center"
            >
              <span className="font-medium text-text tabular-nums">{t.idLegible}</span>
              <span className="min-w-0 truncate">
                <EnlaceODato ruta={t.rutaDetalle}>{t.titulo}</EnlaceODato>
              </span>
              <span className="truncate text-text-2">{t.proyecto.nombre}</span>
              <span className="truncate text-text-2">{t.responsable ?? 'Sin asignar'}</span>
              <span className="text-xs text-text-2 md:text-right">{t.esperaTexto}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {filas.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <div>
                <EnlaceODato ruta={t.rutaDetalle}>{t.titulo}</EnlaceODato>
                <p className="text-xs text-text-2">
                  {t.idLegible} · {t.proyecto.nombre}
                  {t.responsable !== null && <> · {t.responsable}</>}
                </p>
              </div>
              <span className="text-xs text-text-2">{t.esperaTexto}</span>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

/** La reunión semanal de cada proyecto sin finalizar. */
export function Reuniones({
  filas,
  compacta = false,
}: {
  filas: FilaReunion[];
  compacta?: boolean;
}) {
  return (
    <Seccion titulo="Próximas reuniones">
      {filas.length === 0 ? (
        <Vacio titulo="No hay proyectos sin finalizar" compacta={compacta} />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {filas.map((r) => (
            <li
              key={r.proyecto.id}
              className={cn(
                'flex flex-wrap items-center justify-between gap-x-2',
                compacta ? 'px-3 py-1.5' : 'gap-y-2 px-4 py-2',
              )}
            >
              <div className="min-w-0">
                <EnlaceODato ruta={r.rutaProyecto}>{r.proyecto.nombre}</EnlaceODato>
                <p className="text-xs text-text-2">Reunión semanal: {r.reunionTexto}</p>
              </div>
              <span className="text-xs text-text tabular-nums">{r.proximaTexto}</span>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

/** El avance de cada proyecto sin finalizar, con su barra. */
export function Avance({
  filas,
  titulo = 'Avance de los proyectos',
  compacta = false,
}: {
  filas: FilaAvance[];
  titulo?: string;
  compacta?: boolean;
}) {
  return (
    <Seccion titulo={titulo}>
      {filas.length === 0 ? (
        <Vacio titulo="No hay proyectos sin finalizar" compacta={compacta} />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {filas.map((a) => (
            <li
              key={a.proyecto.id}
              className={cn('space-y-1', compacta ? 'px-3 py-1.5' : 'px-4 py-2')}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <EnlaceODato ruta={a.rutaProyecto}>{a.proyecto.nombre}</EnlaceODato>
                <span className="text-xs text-text-2 tabular-nums">{a.avanceTexto}</span>
              </div>
              <div
                role="progressbar"
                aria-label={`Avance de ${a.proyecto.nombre}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={a.porcentaje}
                className="h-1.5 overflow-hidden rounded-full bg-surface-2"
              >
                <div className="h-full bg-primary" style={{ width: `${a.porcentaje}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}
