import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { aProyectos, type FilaProyecto } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { BarraBusqueda } from '@/compartido/BarraBusqueda';
import { Insignia } from '@/compartido/Insignia';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { TablaCompacta, type Columna } from '@/compartido/TablaCompacta';
import { Button } from '@/compartido/ui/button';
import { Label } from '@/compartido/ui/label';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, listarProyectos, type Entorno } from '@/services';
import {
  FILTROS_INICIALES,
  filtrarProyectos,
  hayFiltros,
  opcionesDeSupervisor,
  type FiltrosProyectos,
  type PestanaProyectos,
} from './filtros';
import { FormularioProyecto } from './FormularioProyecto';
import { rutaDeDetalleDeProyecto } from './rutas';

const CLASE_SELECT =
  'h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus';

/** Mensaje de un listado vacío cuando no hay filtros: cada pestaña dice lo suyo. */
const VACIO_POR_PESTANA: Record<PestanaProyectos, string> = {
  ACTIVO: 'No hay proyectos activos',
  EN_PAUSA: 'No hay proyectos en pausa',
  FINALIZADO: 'Aún no hay proyectos finalizados',
  TODOS: 'Aún no hay proyectos',
};

const COLUMNAS: Columna<FilaProyecto>[] = [
  {
    clave: 'proyecto',
    encabezado: 'Proyecto',
    celda: (f) => (
      <div className="py-1">
        <p className="font-medium text-text">{f.nombre}</p>
        <p className="text-xs text-text-2">{f.codigo}</p>
      </div>
    ),
  },
  { clave: 'supervisor', encabezado: 'Supervisor', celda: (f) => f.supervisor.nombre },
  {
    clave: 'practicantes',
    encabezado: 'Practicantes activos',
    className: 'whitespace-nowrap',
    celda: (f) => f.practicantesActivos,
  },
  {
    clave: 'avance',
    encabezado: 'Avance',
    className: 'whitespace-nowrap',
    celda: (f) => f.avance?.texto ?? 'Sin tareas',
  },
  {
    clave: 'esperando',
    encabezado: 'Esperando supervisión',
    className: 'whitespace-nowrap',
    // Se resalta en ámbar cuando hay alguna (decisiones pendientes del supervisor).
    celda: (f) =>
      f.tareasEsperandoSupervision > 0 ? (
        <span className="rounded-md bg-state-warning-bg px-1.5 text-state-warning-text">
          {f.tareasEsperandoSupervision}
        </span>
      ) : (
        f.tareasEsperandoSupervision
      ),
  },
  {
    clave: 'reunion',
    encabezado: 'Próxima reunión',
    className: 'whitespace-nowrap',
    celda: (f) => f.proximaReunionTexto,
  },
  {
    clave: 'estado',
    encabezado: 'Estado',
    className: 'whitespace-nowrap',
    celda: (f) => <Insignia tipo="proyecto" estado={f.estado} />,
  },
  {
    clave: 'detalle',
    encabezado: 'Detalle',
    className: 'whitespace-nowrap',
    celda: (f) => (
      <Link
        to={rutaDeDetalleDeProyecto(f.id)}
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
 * Listado de Proyectos (§5.4): abre en «Activos». Lee con `listarProyectos`; las pestañas, el filtro por supervisor y
 * la búsqueda por nombre se aplican en memoria sobre lo que entrega la consulta. `entorno` solo lo cambian las pruebas.
 */
export function PaginaProyectos({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const navegar = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosProyectos>(FILTROS_INICIALES);
  const [creando, setCreando] = useState(false);

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

  const cambiar = (cambios: Partial<FiltrosProyectos>) =>
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
        <div className="space-y-2" role="status" aria-label="Cargando proyectos">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      );
    }
    const vacio =
      datos.contadores.TODOS === 0
        ? {
            titulo: 'Aún no hay proyectos',
            descripcion: 'Los proyectos los crea el Administrador.',
          }
        : hayFiltros(filtros)
          ? {
              titulo: 'Ningún proyecto coincide con los filtros',
              descripcion: 'Prueba con otra búsqueda o quita algún filtro.',
            }
          : { titulo: VACIO_POR_PESTANA[filtros.pestana] };
    return (
      <TablaCompacta
        columnas={COLUMNAS}
        filas={visibles}
        claveFila={(f) => f.id}
        onAbrir={(f) => navegar(rutaDeDetalleDeProyecto(f.id))}
        vacio={vacio}
      />
    );
  }

  const filas = datos?.filas ?? [];
  const contadores = datos?.contadores;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-text">Proyectos</h1>
        {datos?.puedeCrear && (
          <Button type="button" onClick={() => setCreando(true)}>
            Nuevo proyecto
          </Button>
        )}
      </div>

      <PestanasConContador
        valor={filtros.pestana}
        onCambiar={(valor) => cambiar({ pestana: valor as PestanaProyectos })}
        pestanas={[
          { valor: 'ACTIVO', etiqueta: 'Activos', contador: contadores?.ACTIVO },
          { valor: 'EN_PAUSA', etiqueta: 'En pausa', contador: contadores?.EN_PAUSA },
          { valor: 'FINALIZADO', etiqueta: 'Finalizados', contador: contadores?.FINALIZADO },
          { valor: 'TODOS', etiqueta: 'Todos', contador: contadores?.TODOS },
        ]}
      />

      <div className="flex flex-wrap items-end gap-3">
        <BarraBusqueda
          valor={filtros.busqueda}
          onCambiar={(busqueda) => cambiar({ busqueda })}
          placeholder="Buscar por nombre"
        />
        <div className="w-52 space-y-1">
          <Label htmlFor="filtro-supervisor">Supervisor</Label>
          <select
            id="filtro-supervisor"
            value={filtros.idSupervisor}
            onChange={(e) => cambiar({ idSupervisor: e.target.value })}
            className={CLASE_SELECT}
          >
            <option value="">Todos</option>
            {opcionesDeSupervisor(filas).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {contenido()}

      {creando && datos !== null && (
        <FormularioProyecto
          modo="crear"
          idActor={idUsuario}
          supervisores={datos.supervisoresDisponibles}
          onCreado={(id) => navegar(rutaDeDetalleDeProyecto(id))}
          onCerrar={() => setCreando(false)}
          entorno={entorno}
        />
      )}
    </section>
  );
}
