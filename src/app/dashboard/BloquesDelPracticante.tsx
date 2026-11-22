import { Link, useNavigate } from 'react-router';
import type { FilaPullRequestPorAtender, FilaTareaEnCurso } from '@/app/adaptadores';
import { Insignia } from '@/compartido/Insignia';
import { TablaCompacta, type Columna } from '@/compartido/TablaCompacta';
import { cn } from '@/compartido/utils';
import { Seccion, Vacio } from './BloquesDeDashboard';

/**
 * Los bloques del Inicio del Practicante (§9.2.3). Solo presentan lo que entrega la consulta y no tienen botones de
 * acción: todo clic navega al detalle de la tarea o al proyecto.
 */

const enlace = 'font-medium text-link underline underline-offset-2';

function TituloConEnlace({ ruta, children }: { ruta: string | null; children: React.ReactNode }) {
  return ruta === null ? (
    <span className="font-medium text-text">{children}</span>
  ) : (
    <Link to={ruta} className={enlace}>
      {children}
    </Link>
  );
}

function columnasDeEnCurso(): Columna<FilaTareaEnCurso>[] {
  return [
    {
      clave: 'id',
      encabezado: 'ID',
      className: 'whitespace-nowrap',
      celda: (f) => <span className="font-medium text-text tabular-nums">{f.idLegible}</span>,
    },
    { clave: 'titulo', encabezado: 'Título', celda: (f) => f.titulo },
    { clave: 'proyecto', encabezado: 'Proyecto', celda: (f) => f.proyecto.nombre },
    {
      clave: 'limite',
      encabezado: 'Fecha límite',
      className: 'whitespace-nowrap',
      celda: (f) => (
        <span
          className={cn('tabular-nums', f.vencida ? 'font-medium text-danger-text' : undefined)}
        >
          {f.fechaLimiteTexto}
          {f.vencida && ' (vencida)'}
        </span>
      ),
    },
    {
      clave: 'devuelta',
      encabezado: 'Devuelta',
      className: 'whitespace-nowrap',
      celda: (f) =>
        f.devuelta ? (
          <span className="text-xs text-danger-text">Devuelta con observaciones</span>
        ) : null,
    },
    {
      clave: 'detalle',
      encabezado: 'Detalle',
      className: 'whitespace-nowrap',
      celda: (f) =>
        f.rutaDetalle === null ? null : (
          <Link
            to={f.rutaDetalle}
            // El clic de la fila ya abre el detalle: evita navegar dos veces.
            onClick={(e) => e.stopPropagation()}
            aria-label={`Ver detalle de ${f.idLegible}`}
            className={enlace}
          >
            Ver detalle
          </Link>
        ),
    },
  ];
}

/**
 * Todas sus tareas En progreso, de todos sus proyectos, en el orden que entrega la consulta (primero las devueltas,
 * luego las vencidas y luego por fecha límite). Sin ninguna dice «No tienes tareas en progreso» y, si hay Disponibles,
 * ofrece `rutaDisponibles` (Mis proyectos).
 */
export function MisTareasEnCurso({
  filas,
  hayDisponibles,
  rutaDisponibles,
}: {
  filas: FilaTareaEnCurso[];
  hayDisponibles: boolean;
  rutaDisponibles: string;
}) {
  const navegar = useNavigate();
  return (
    <Seccion titulo="Mis tareas en curso">
      {filas.length === 0 ? (
        <div className="space-y-1">
          <Vacio compacta titulo="No tienes tareas en progreso" />
          {hayDisponibles && (
            <Link to={rutaDisponibles} className={cn('inline-block text-sm', enlace)}>
              Ver tareas disponibles
            </Link>
          )}
        </div>
      ) : (
        <TablaCompacta
          columnas={columnasDeEnCurso()}
          filas={filas}
          claveFila={(f) => f.id}
          onAbrir={(f) => {
            if (f.rutaDetalle !== null) navegar(f.rutaDetalle);
          }}
          vacio={{ titulo: 'No tienes tareas en progreso' }}
        />
      )}
    </Seccion>
  );
}

/**
 * Sus tareas con el Pull Request Pendiente (falta crearlo) o Con conflictos (hay que resolverlos). Cada fila lleva al
 * detalle, donde se crea o se ve el conflicto; la tarea puede estar en cualquier columna del Kanban.
 */
export function PullRequestsPorAtender({ filas }: { filas: FilaPullRequestPorAtender[] }) {
  return (
    <Seccion titulo="Pull Requests por atender">
      {filas.length === 0 ? (
        <Vacio compacta titulo="No tienes Pull Requests pendientes" />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {filas.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5"
            >
              <div className="min-w-0">
                <TituloConEnlace ruta={t.rutaDetalle}>{t.titulo}</TituloConEnlace>
                <p className="text-xs text-text-2">
                  {t.idLegible} · {t.proyecto.nombre}
                </p>
              </div>
              <span className="flex items-center gap-2">
                <Insignia tipo="tarea" estado={t.estado} />
                <Insignia tipo="pr" estado={t.estadoPr} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}
