import { CabeceraDePagina } from '@/compartido/CabeceraDePagina';
import { useCallback, useMemo } from 'react';
import { aMisProyectos } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { TarjetaProyecto } from '@/compartido/TarjetaProyecto';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, listarMisProyectos, type Entorno } from '@/services';
import { rutaDeMiProyecto, rutaDeProyectoAnterior } from './rutas';

/**
 * Mis proyectos (§9.2.1), del Practicante: sus proyectos en tarjetas, sin pestañas ni búsqueda (tiene uno o dos). Arriba
 * los vigentes (activos y en pausa) con el supervisor, mi carga, las tareas disponibles, el avance y la próxima reunión; y
 * debajo, si existen, «Anteriores» (finalizados o de los que salí), atenuados y con el periodo, sin barra, carga ni reunión.
 * Lee con `listarMisProyectos`, que solo entrega lo suyo. `entorno` solo lo cambian las pruebas.
 */
export function PaginaMisProyectosPracticante({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;

  const cargar = useCallback(
    () => listarMisProyectos({ idActor: idUsuario ?? '' }, entorno),
    [entorno, idUsuario],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aMisProyectos(consulta.valor)),
    [consulta.valor],
  );

  if (idUsuario === null) return null;

  function contenido() {
    if (consulta.error) {
      return (
        <p role="alert" className="text-sm text-danger-text">
          {consulta.error}
        </p>
      );
    }
    if (datos === null) {
      return (
        <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="Cargando proyectos">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      );
    }
    if (datos.vigentes.length === 0 && datos.anteriores.length === 0) {
      return (
        <EstadoVacio
          titulo="Aún no tienes proyectos asignados"
          descripcion="El Administrador te asignará uno."
        />
      );
    }
    return (
      <div className="space-y-3">
        {datos.vigentes.length === 0 ? (
          <EstadoVacio titulo="No tienes proyectos activos." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {datos.vigentes.map((p) => (
              <li key={p.id}>
                <TarjetaProyecto
                  compacta
                  nombre={p.nombre}
                  codigo={p.codigo}
                  estado={p.estado}
                  avance={p.avance}
                  detalles={p.detalles}
                  enlace={rutaDeMiProyecto(p.id)}
                />
              </li>
            ))}
          </ul>
        )}

        {datos.anteriores.length > 0 && (
          <section aria-label="Anteriores" className="space-y-2">
            <h2 className="text-base font-semibold text-text">Anteriores</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {datos.anteriores.map((p) => (
                <li key={p.id}>
                  <TarjetaProyecto
                    compacta
                    atenuada
                    tipoEstado="participacion"
                    nombre={p.nombre}
                    codigo={p.codigo}
                    estado={p.motivo}
                    detalles={p.detalles}
                    enlace={rutaDeProyectoAnterior(p.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <CabeceraDePagina
        titulo="Mis proyectos"
        subtitulo="Los proyectos en los que participas ahora y los anteriores."
      />
      {contenido()}
    </section>
  );
}
