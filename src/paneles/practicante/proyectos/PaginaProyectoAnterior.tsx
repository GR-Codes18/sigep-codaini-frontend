import { useCallback } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { aResumenAnterior, claseDeProyecto } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { Insignia } from '@/compartido/Insignia';
import { FilasDeDatos, TarjetaDeDatos } from '@/compartido/TarjetaDeDatos';
import { Skeleton } from '@/compartido/ui/skeleton';
import {
  ENTORNO,
  listarMisProyectos,
  obtenerResumenProyectoAnterior,
  type Entorno,
} from '@/services';
import { VolverAMisProyectos } from './PaginaDetalleProyectoPracticante';
import { rutaDeHistorialDelProyecto, rutaDeMiProyecto } from './rutas';

function Cargando() {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando el resumen del proyecto">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

/**
 * El resumen mínimo, de solo lectura, de un proyecto en el que el Practicante estuvo (§9.2.1): los datos del proyecto, su
 * periodo de participación, las tareas que terminó ahí y un enlace a Mi historial filtrado por ese proyecto. No abre el
 * tablero ni el equipo. Si el proyecto sigue vigente redirige a su detalle, y si no es suyo no muestra nada. `entorno`
 * solo lo cambian las pruebas.
 */
export function PaginaProyectoAnterior({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { idProyecto = '' } = useParams();
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;

  const cargarMios = useCallback(
    () => listarMisProyectos({ idActor: idUsuario ?? '' }, entorno),
    [entorno, idUsuario],
  );
  const mios = useConsulta(idUsuario === null ? null : cargarMios);
  const clase = mios.valor === null ? null : claseDeProyecto(mios.valor, idProyecto);

  const cargarResumen = useCallback(
    () => obtenerResumenProyectoAnterior({ idActor: idUsuario ?? '', idProyecto }, entorno),
    [entorno, idUsuario, idProyecto],
  );
  const resumen = useConsulta(clase === 'ANTERIOR' ? cargarResumen : null);

  if (idUsuario === null) return null;

  if (mios.error || resumen.error) {
    return (
      <section className="space-y-4">
        <VolverAMisProyectos />
        <p role="alert" className="text-sm text-danger-text">
          {mios.error ?? resumen.error}
        </p>
      </section>
    );
  }
  if (clase === null) return <Cargando />;
  if (clase === 'VIGENTE') return <Navigate to={rutaDeMiProyecto(idProyecto)} replace />;
  if (clase === 'AJENO') {
    return (
      <section className="space-y-4">
        <VolverAMisProyectos />
        <p role="alert" className="text-sm text-danger-text">
          No se encontró el proyecto.
        </p>
      </section>
    );
  }
  if (resumen.valor === null) return <Cargando />;

  const r = aResumenAnterior(resumen.valor);
  const motivo = mios.valor?.anteriores.find((p) => p.id === idProyecto)?.motivo ?? 'FINALIZADO';
  return (
    <article className="space-y-4">
      <VolverAMisProyectos />
      <section
        aria-label="Encabezado del proyecto"
        className="space-y-2 rounded-xl border border-border bg-surface p-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-text">{r.nombre}</h1>
          <span className="text-sm text-text-2">{r.codigo}</span>
          <Insignia tipo="participacion" estado={motivo} />
        </div>
        <p role="note" className="text-sm text-text-2">
          Este proyecto ya no está vigente para ti: no puedes abrir su tablero ni su equipo.
        </p>
      </section>

      <div className="grid items-stretch gap-3 lg:grid-cols-2">
        <TarjetaDeDatos titulo="Descripción">
          <p className="text-sm whitespace-pre-line text-text">{r.descripcion}</p>
        </TarjetaDeDatos>

        <TarjetaDeDatos titulo="Datos del proyecto">
          <FilasDeDatos
            filas={[
              { etiqueta: 'Supervisor', valor: r.supervisor },
              { etiqueta: 'Fecha de inicio', valor: r.fechaInicioTexto },
              { etiqueta: 'Fecha de fin prevista', valor: r.fechaFinPrevistaTexto },
              ...(r.fechaFinRealTexto !== null
                ? [{ etiqueta: 'Fecha de finalización', valor: r.fechaFinRealTexto }]
                : []),
            ]}
          />
        </TarjetaDeDatos>

        {r.participacion !== null && (
          <TarjetaDeDatos titulo="Mi participación" className="lg:col-span-2">
            <FilasDeDatos
              filas={[
                { etiqueta: 'Periodo', valor: r.participacion.periodoTexto },
                { etiqueta: 'Tareas que terminé aquí', valor: r.participacion.tareasTerminadas },
              ]}
            />
            <Link
              to={rutaDeHistorialDelProyecto(idProyecto)}
              className="text-sm font-medium text-link underline underline-offset-2"
            >
              Ver mis tareas terminadas en Mi historial
            </Link>
          </TarjetaDeDatos>
        )}
      </div>
    </article>
  );
}
