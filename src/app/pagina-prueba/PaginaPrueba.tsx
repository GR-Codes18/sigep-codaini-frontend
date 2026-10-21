/**
 * TEMPORAL — Fase 0, pasos 8 y 9.
 * Página de prueba de los tokens en ambos temas.
 * Se elimina al final de la Fase 3: borrar esta carpeta y el uso en App.tsx.
 */
import { AlternadorTema } from '@/app/tema/AlternadorTema';
import { Button } from '@/compartido/ui/button';
import { cn } from '@/compartido/utils';

type EstadoTarea = {
  id: string;
  etiqueta: string;
  badge: string;
  punto: string;
};

const ESTADOS_TAREA: EstadoTarea[] = [
  {
    id: 'neutral',
    etiqueta: 'Disponible',
    badge: 'bg-state-neutral-bg text-state-neutral-text',
    punto: 'bg-state-neutral',
  },
  {
    id: 'info',
    etiqueta: 'En progreso',
    badge: 'bg-state-info-bg text-state-info-text',
    punto: 'bg-state-info',
  },
  {
    id: 'warning',
    etiqueta: 'Esperando supervisión',
    badge: 'bg-state-warning-bg text-state-warning-text',
    punto: 'bg-state-warning',
  },
  {
    id: 'success',
    etiqueta: 'Terminada',
    badge: 'bg-state-success-bg text-state-success-text',
    punto: 'bg-state-success',
  },
  {
    id: 'danger',
    etiqueta: 'Devuelta con observaciones',
    badge: 'bg-state-danger-bg text-state-danger-text',
    punto: 'bg-state-danger',
  },
];

const FILAS_TABLA = [
  { practicante: 'Ana Torres', proyecto: 'Gestión de inventario', puntaje: 86 },
  { practicante: 'Luis Pérez', proyecto: 'Portal de trámites', puntaje: 74 },
  { practicante: 'María Gómez', proyecto: 'Tablero de indicadores', puntaje: 92 },
];

function BadgeEstado({ estado }: { estado: EstadoTarea }) {
  return (
    <span
      data-estado={estado.id}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
        estado.badge,
      )}
    >
      <span className={cn('size-1.5 rounded-full', estado.punto)} aria-hidden="true" />
      {estado.etiqueta}
    </span>
  );
}

export function PaginaPrueba() {
  return (
    <main className="min-h-screen bg-bg p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1>SIGEP CODAINI</h1>
            <p className="mt-1 text-sm text-text-2">
              Página temporal de la Fase 0 para revisar los tokens en tema claro y oscuro. Se
              elimina al final de la Fase 3.
            </p>
          </div>
          <AlternadorTema />
        </header>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2>Tarjeta de prueba</h2>
          <p className="mt-2 text-sm">
            Contenedor en <span className="font-medium">surface</span>, borde de 1 px y esquinas de
            10 px. El texto usa el token <span className="font-medium">text</span>.
          </p>
          <p className="mt-1 text-sm text-text-2">
            Texto secundario con el token text-2, legible en ambos temas.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button>Botón primario</Button>
            <a className="text-sm text-link underline-offset-4 hover:underline" href="#enlace">
              Enlace de prueba
            </a>
            <span className="rounded-md border border-border bg-surface-2 px-3 py-1 text-sm">
              Superficie 2
            </span>
          </div>
        </section>

        <section className="mt-6">
          <h2>Estados de tarea</h2>
          <p className="mt-1 text-sm text-text-2">
            Fondo suave y texto oscuro en tema claro; texto claro sobre el color base al 16 % en
            tema oscuro.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ESTADOS_TAREA.map((estado) => (
              <BadgeEstado key={estado.id} estado={estado} />
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2>Tabla de prueba</h2>
          <p className="mt-1 text-sm text-text-2">
            Cabecera en surface-2, filas de unos 44 px y texto de 13 px con números tabulares.
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full border-collapse text-tabla">
              <thead>
                <tr>
                  <th className="border-b border-border bg-surface-2 px-3 py-2.5 text-left font-medium text-text-2">
                    Practicante
                  </th>
                  <th className="border-b border-border bg-surface-2 px-3 py-2.5 text-left font-medium text-text-2">
                    Proyecto
                  </th>
                  <th className="border-b border-border bg-surface-2 px-3 py-2.5 text-right font-medium text-text-2">
                    Puntaje
                  </th>
                </tr>
              </thead>
              <tbody>
                {FILAS_TABLA.map((fila) => (
                  <tr key={fila.practicante} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-3">{fila.practicante}</td>
                    <td className="px-3 py-3">{fila.proyecto}</td>
                    <td className="px-3 py-3 text-right">{fila.puntaje}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 text-xs text-text-2">
          Página temporal de la Fase 0. No forma parte de la interfaz definitiva.
        </p>
      </div>
    </main>
  );
}
