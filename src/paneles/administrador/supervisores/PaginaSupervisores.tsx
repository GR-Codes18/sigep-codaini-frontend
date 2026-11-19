import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { aSupervisores, type FilaSupervisor } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { BarraBusqueda } from '@/compartido/BarraBusqueda';
import { Insignia } from '@/compartido/Insignia';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { TablaCompacta, type Columna } from '@/compartido/TablaCompacta';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, listarSupervisores, type Entorno } from '@/services';
import {
  FILTROS_INICIALES,
  filtrarSupervisores,
  hayFiltros,
  type FiltrosSupervisores,
  type PestanaSupervisores,
} from './filtros';
import { rutaDeDetalleDeSupervisor } from './rutas';

/** Mensaje de un listado vacío cuando no hay búsqueda: cada pestaña dice lo suyo. */
const VACIO_POR_PESTANA: Record<PestanaSupervisores, string> = {
  ACTIVOS: 'No hay supervisores activos',
  INACTIVOS: 'Aún no hay supervisores inactivos',
  TODOS: 'Aún no hay supervisores',
};

const COLUMNAS: Columna<FilaSupervisor>[] = [
  {
    clave: 'supervisor',
    encabezado: 'Supervisor',
    celda: (f) => (
      <div className="py-1">
        <p className="font-medium text-text">{f.nombre}</p>
        <p className="text-xs text-text-2">{f.correo}</p>
      </div>
    ),
  },
  {
    clave: 'proyectos',
    encabezado: 'Proyectos a cargo',
    className: 'whitespace-nowrap',
    celda: (f) => f.proyectosACargo,
  },
  {
    clave: 'practicantes',
    encabezado: 'Practicantes a cargo',
    className: 'whitespace-nowrap',
    celda: (f) => f.practicantesACargo,
  },
  {
    clave: 'revisar',
    encabezado: 'Tareas por revisar',
    className: 'whitespace-nowrap',
    // Sin umbral propio (§5.3 no lo define): solo se resalta en ámbar cuando hay alguna esperando.
    celda: (f) =>
      f.tareasPorRevisar > 0 ? (
        <span className="rounded-md bg-state-warning-bg px-1.5 text-state-warning-text">
          {f.tareasPorRevisar}
        </span>
      ) : (
        f.tareasPorRevisar
      ),
  },
  {
    clave: 'actividad',
    encabezado: 'Última actividad',
    className: 'whitespace-nowrap',
    celda: (f) => f.ultimaActividadTexto,
  },
  {
    clave: 'estado',
    encabezado: 'Estado',
    className: 'whitespace-nowrap',
    celda: (f) => <Insignia tipo="supervisor" estado={f.estado} />,
  },
  {
    clave: 'detalle',
    encabezado: 'Detalle',
    className: 'whitespace-nowrap',
    celda: (f) => (
      <Link
        to={rutaDeDetalleDeSupervisor(f.id)}
        // El clic de la fila ya abre el detalle: evita navegar dos veces.
        onClick={(e) => e.stopPropagation()}
        aria-label={`Ver detalle de ${f.nombre}`}
        className="font-medium text-link underline underline-offset-2"
      >
        Ver detalle
      </Link>
    ),
  },
];

/**
 * Listado de Supervisores (§5.3): abre en «Activos». Lee con `listarSupervisores`; las pestañas y la búsqueda se aplican
 * en memoria sobre lo que entrega la consulta. «Tareas por revisar» se resalta en ámbar cuando es mayor que 0 (la
 * propuesta no define un umbral de sobrecarga). `entorno` solo lo cambian las pruebas.
 */
export function PaginaSupervisores({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const navegar = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosSupervisores>(FILTROS_INICIALES);

  const cargar = useCallback(
    () => listarSupervisores({ idActor: idUsuario ?? '' }, entorno),
    [entorno, idUsuario],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aSupervisores(consulta.valor)),
    [consulta.valor],
  );
  const visibles = useMemo(
    () => (datos === null ? [] : filtrarSupervisores(datos.filas, filtros)),
    [datos, filtros],
  );

  if (idUsuario === null) return null;

  const cambiar = (cambios: Partial<FiltrosSupervisores>) =>
    setFiltros((actuales) => ({ ...actuales, ...cambios }));

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
        <div className="space-y-2" role="status" aria-label="Cargando supervisores">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      );
    }
    const vacio =
      datos.contadores.TODOS === 0
        ? {
            titulo: 'Aún no hay supervisores',
            descripcion: 'Crea el primero con «Nuevo supervisor».',
          }
        : hayFiltros(filtros)
          ? {
              titulo: 'Ningún supervisor coincide con la búsqueda',
              descripcion: 'Prueba con otro nombre o correo.',
            }
          : { titulo: VACIO_POR_PESTANA[filtros.pestana] };
    return (
      <TablaCompacta
        columnas={COLUMNAS}
        filas={visibles}
        claveFila={(f) => f.id}
        onAbrir={(f) => navegar(rutaDeDetalleDeSupervisor(f.id))}
        vacio={vacio}
      />
    );
  }

  const contadores = datos?.contadores;

  return (
    <section className="space-y-4">
      <h1 className="text-text">Supervisores</h1>

      <PestanasConContador
        valor={filtros.pestana}
        onCambiar={(valor) => cambiar({ pestana: valor as PestanaSupervisores })}
        pestanas={[
          { valor: 'ACTIVOS', etiqueta: 'Activos', contador: contadores?.ACTIVOS },
          { valor: 'INACTIVOS', etiqueta: 'Inactivos', contador: contadores?.INACTIVOS },
          { valor: 'TODOS', etiqueta: 'Todos', contador: contadores?.TODOS },
        ]}
      />

      <BarraBusqueda
        valor={filtros.busqueda}
        onCambiar={(busqueda) => cambiar({ busqueda })}
        placeholder="Buscar por nombre o correo"
      />

      {contenido()}
    </section>
  );
}
