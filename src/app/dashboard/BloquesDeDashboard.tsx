import { Link } from 'react-router';
import type { FilaAvance, FilaPorRevisar, FilaReunion } from '@/app/adaptadores';
import { FilaDeLista, ListaDeFilas } from '@/compartido/ListaDeFilas';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
import { cn } from '@/compartido/utils';

/**
 * Los bloques que comparten los dashboards del Administrador (§5.9), del Supervisor (§9.1.5) y el Inicio del Practicante
 * (§9.2.3). Solo presentan lo que la consulta entrega. Cada bloque es una sola caja con su título dentro (Fase 8,
 * módulo 8.3); las listas van separadas por línea fina, sin cajas anidadas.
 */

export function Seccion({
  titulo,
  accion,
  sinRelleno,
  children,
}: {
  titulo: string;
  /** Un enlace o botón a la derecha del título (por ejemplo, «Ver todas en Reportes»). */
  accion?: React.ReactNode;
  /** Para una tabla que llega a los bordes de la caja. */
  sinRelleno?: boolean;
  children: React.ReactNode;
}) {
  return (
    <PanelDeDatos titulo={titulo} nombre={titulo} acciones={accion} sinRelleno={sinRelleno}>
      {children}
    </PanelDeDatos>
  );
}

export function EnlaceDeTarjeta({ a, children }: { a: string; children: React.ReactNode }) {
  return (
    <Link to={a} className="font-medium text-link underline underline-offset-2">
      {children}
    </Link>
  );
}

/** Un bloque sin nada que mostrar: una línea de texto dentro de su caja, sin otra caja encima. */
export function Vacio({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion?: string;
  /** Se conserva por compatibilidad: todos los vacíos son una línea. */
  compacta?: boolean;
}) {
  return (
    <p className="text-sm text-text-2">
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
 * Una tarjeta de métrica: la cifra principal enlaza a su módulo con el filtro ya aplicado. Pone la etiqueta, la cifra y la
 * cifra secundaria en tres líneas cortas, con `p-3` y sin crecer con el contenido.
 */
export function Tarjeta({
  titulo,
  valor,
  enlace,
  secundario,
  tono,
}: {
  titulo: string;
  valor: number;
  enlace: string;
  secundario: React.ReactNode;
  tono?: TonoDeTarjeta;
  /** Se conserva por compatibilidad: todas las tarjetas son compactas. */
  compacta?: boolean;
}) {
  const clases = tono === undefined ? null : CLASES_DE_TONO[tono];
  return (
    <article
      aria-label={titulo}
      className={cn('rounded-xl border bg-surface px-3 py-2', clases?.caja ?? 'border-border')}
    >
      <h2 className={cn('truncate text-xs font-medium', clases?.texto ?? 'text-text-2')}>
        {titulo}
      </h2>
      <p
        className={cn(
          'text-2xl leading-tight font-semibold tabular-nums',
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
      <p className={cn('truncate text-xs', clases?.texto ?? 'text-text-2')}>{secundario}</p>
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
 * título, proyecto, responsable y días esperando) con el título como enlace al detalle, donde se decide. Sin ella, dos
 * líneas por tarea.
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
        <Vacio titulo={vacio} />
      ) : compacta ? (
        <ul className="divide-y divide-border">
          {filas.map((t) => (
            <li
              key={t.id}
              className="grid gap-x-3 gap-y-0.5 py-2 text-sm first:pt-0 last:pb-0 lg:grid-cols-[5.5rem_minmax(0,1fr)_12rem_10rem_6.5rem] lg:items-center"
            >
              <span className="font-medium text-text tabular-nums">{t.idLegible}</span>
              <span className="min-w-0 truncate">
                <EnlaceODato ruta={t.rutaDetalle}>{t.titulo}</EnlaceODato>
              </span>
              <span className="truncate text-text-2">{t.proyecto.nombre}</span>
              <span className="truncate text-text-2">{t.responsable ?? 'Sin asignar'}</span>
              <span className="text-xs text-text-2 lg:text-right">{t.esperaTexto}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ListaDeFilas>
          {filas.map((t) => (
            <FilaDeLista key={t.id}>
              <div className="min-w-0">
                <EnlaceODato ruta={t.rutaDetalle}>{t.titulo}</EnlaceODato>
                <p className="text-xs text-text-2">
                  {t.idLegible} · {t.proyecto.nombre}
                  {t.responsable !== null && <> · {t.responsable}</>}
                </p>
              </div>
              <span className="text-xs text-text-2">{t.esperaTexto}</span>
            </FilaDeLista>
          ))}
        </ListaDeFilas>
      )}
    </Seccion>
  );
}

/** La reunión semanal de cada proyecto sin finalizar. */
export function Reuniones({ filas }: { filas: FilaReunion[]; compacta?: boolean }) {
  return (
    <Seccion titulo="Próximas reuniones">
      {filas.length === 0 ? (
        <Vacio titulo="No hay proyectos sin finalizar" />
      ) : (
        <ListaDeFilas>
          {filas.map((r) => (
            <FilaDeLista key={r.proyecto.id}>
              <div className="min-w-0">
                <EnlaceODato ruta={r.rutaProyecto}>{r.proyecto.nombre}</EnlaceODato>
                <p className="text-xs text-text-2">Reunión semanal: {r.reunionTexto}</p>
              </div>
              <span className="text-xs text-text tabular-nums">{r.proximaTexto}</span>
            </FilaDeLista>
          ))}
        </ListaDeFilas>
      )}
    </Seccion>
  );
}

/** El avance de cada proyecto sin finalizar, con su barra. */
export function Avance({
  filas,
  titulo = 'Avance de los proyectos',
}: {
  filas: FilaAvance[];
  titulo?: string;
  compacta?: boolean;
}) {
  return (
    <Seccion titulo={titulo}>
      {filas.length === 0 ? (
        <Vacio titulo="No hay proyectos sin finalizar" />
      ) : (
        <ul className="divide-y divide-border">
          {filas.map((a) => (
            <li key={a.proyecto.id} className="space-y-1 py-2 text-sm first:pt-0 last:pb-0">
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
