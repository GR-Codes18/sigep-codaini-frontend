import { useCallback, useMemo, useState } from 'react';
import { aProyectos, aTarjetaDeProyecto } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { usePestanaInicial } from '@/app/usePestanaInicial';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { BarraBusqueda } from '@/compartido/BarraBusqueda';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { TarjetaProyecto } from '@/compartido/TarjetaProyecto';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, listarProyectos, type Entorno } from '@/services';
import { rutaDeDetalleDeProyecto } from '@/paneles/administrador/proyectos/rutas';
import {
  FILTROS_INICIALES,
  PESTANAS_DE_PROYECTOS,
  filtrarProyectos,
  type FiltrosProyectos,
  type PestanaProyectos,
} from '@/paneles/administrador/proyectos/filtros';

const VACIO_POR_PESTANA: Record<PestanaProyectos, string> = {
  ACTIVO: 'No tienes proyectos activos',
  EN_PAUSA: 'No tienes proyectos en pausa',
  FINALIZADO: 'Aún no tienes proyectos finalizados',
  TODOS: 'Aún no tienes proyectos asignados',
};

/**
 * Mis proyectos (§9.1.1), del Supervisor: sus proyectos como **tarjetas** (no tabla: tiene pocos y la tarjeta muestra mejor
 * el estado de cada uno), con pestañas Activos, En pausa, Finalizados y Todos (abre en «Activos») y búsqueda por nombre.
 * Lee con `listarProyectos`, que solo entrega los proyectos que tiene a cargo: ningún dato de otros llega a la pantalla.
 * Sin columna ni filtro de supervisor y sin «Nuevo proyecto». Todo el clic de la tarjeta lleva al detalle, que es el del
 * Administrador con los botones que decide `puede()`. `entorno` solo lo cambian las pruebas.
 */
export function PaginaMisProyectos({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  // `?pestana=` (los enlaces del Dashboard, §9.1.5): una pestaña desconocida abre «Activos», como siempre.
  const pestanaInicial = usePestanaInicial(PESTANAS_DE_PROYECTOS, FILTROS_INICIALES.pestana);
  const [filtros, setFiltros] = useState<FiltrosProyectos>(() => ({
    ...FILTROS_INICIALES,
    pestana: pestanaInicial,
  }));

  const cargar = useCallback(
    () => listarProyectos({ idActor: idUsuario ?? '' }, entorno),
    [entorno, idUsuario],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aProyectos(consulta.valor)),
    [consulta.valor],
  );
  const visibles = useMemo(
    () => (datos === null ? [] : filtrarProyectos(datos.filas, filtros)),
    [datos, filtros],
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
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          role="status"
          aria-label="Cargando proyectos"
        >
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      );
    }
    if (visibles.length === 0) {
      return datos.contadores.TODOS === 0 ? (
        <EstadoVacio
          titulo="Aún no tienes proyectos asignados"
          descripcion="Los proyectos te los asigna el Administrador."
        />
      ) : filtros.busqueda.trim() !== '' ? (
        <EstadoVacio
          titulo="Ningún proyecto coincide con la búsqueda"
          descripcion="Prueba con otro nombre."
        />
      ) : (
        <EstadoVacio titulo={VACIO_POR_PESTANA[filtros.pestana]} />
      );
    }
    return (
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibles.map((fila) => {
          const t = aTarjetaDeProyecto(fila);
          return (
            <li key={t.id}>
              <TarjetaProyecto
                nombre={t.nombre}
                codigo={t.codigo}
                estado={t.estado}
                avance={t.avance}
                detalles={t.detalles}
                enlace={rutaDeDetalleDeProyecto(t.id, undefined, 'SUPERVISOR')}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  const contadores = datos?.contadores;
  return (
    <section className="space-y-4">
      <h1 className="text-text">Mis proyectos</h1>

      <PestanasConContador
        valor={filtros.pestana}
        onCambiar={(valor) => setFiltros((f) => ({ ...f, pestana: valor as PestanaProyectos }))}
        pestanas={[
          { valor: 'ACTIVO', etiqueta: 'Activos', contador: contadores?.ACTIVO },
          { valor: 'EN_PAUSA', etiqueta: 'En pausa', contador: contadores?.EN_PAUSA },
          { valor: 'FINALIZADO', etiqueta: 'Finalizados', contador: contadores?.FINALIZADO },
          { valor: 'TODOS', etiqueta: 'Todos', contador: contadores?.TODOS },
        ]}
      />

      <BarraBusqueda
        valor={filtros.busqueda}
        onCambiar={(busqueda) => setFiltros((f) => ({ ...f, busqueda }))}
        placeholder="Buscar por nombre"
      />

      {contenido()}
    </section>
  );
}
