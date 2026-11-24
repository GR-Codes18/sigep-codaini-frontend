import { BarraDeFiltros } from '@/compartido/BarraDeFiltros';
import { PieDeTabla } from '@/compartido/PieDeTabla';
import { CabeceraDePagina } from '@/compartido/CabeceraDePagina';
import { CampoDeFormulario } from '@/compartido/CampoDeFormulario';
import { CLASE_CAMPO } from '@/compartido/estiloCampo';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  aMiHistorial,
  filtrarMiHistorial,
  idProyectoValido,
  type FilaMiHistorial,
} from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { BarraBusqueda } from '@/compartido/BarraBusqueda';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { Insignia } from '@/compartido/Insignia';
import { TablaCompacta, type Columna } from '@/compartido/TablaCompacta';
import { Button } from '@/compartido/ui/button';
import { Skeleton } from '@/compartido/ui/skeleton';
import { rutaDeDetalleDeTarea } from '@/paneles/administrador/proyectos/rutas';
import { ENTORNO, listarMiHistorial, type Entorno } from '@/services';
import { PARAMETRO_PROYECTO } from './rutas';

const rutaDeLaTarea = (f: FilaMiHistorial) =>
  rutaDeDetalleDeTarea(f.proyecto.id, f.id, 'PRACTICANTE');

/** Sin botones de acción en las filas (§9.2.2): un clic abre el detalle de la tarea, en solo lectura. */
const COLUMNAS: Columna<FilaMiHistorial>[] = [
  {
    clave: 'id',
    encabezado: 'ID',
    className: 'whitespace-nowrap',
    celda: (f) => <span className="font-medium text-text tabular-nums">{f.idLegible}</span>,
  },
  { clave: 'titulo', encabezado: 'Título', celda: (f) => f.titulo },
  { clave: 'proyecto', encabezado: 'Proyecto', celda: (f) => f.proyecto.nombre },
  {
    clave: 'termino',
    encabezado: 'Fecha de término',
    className: 'whitespace-nowrap tabular-nums',
    celda: (f) => f.fechaTerminoTexto,
  },
  {
    clave: 'devuelta',
    encabezado: 'Veces devuelta',
    className: 'whitespace-nowrap tabular-nums',
    celda: (f) => f.vecesDevuelta,
  },
  {
    clave: 'pr',
    encabezado: 'Pull Request',
    className: 'whitespace-nowrap',
    celda: (f) => (f.estadoPr === null ? null : <Insignia tipo="pr" estado={f.estadoPr} />),
  },
  {
    clave: 'detalle',
    encabezado: 'Detalle',
    className: 'whitespace-nowrap',
    celda: (f) => (
      <Link
        to={rutaDeLaTarea(f)}
        // El clic de la fila ya abre el detalle: evita navegar dos veces.
        onClick={(e) => e.stopPropagation()}
        aria-label={`Ver detalle de ${f.idLegible}`}
        className="font-medium text-link underline underline-offset-2"
      >
        Ver detalle
      </Link>
    ),
  },
];

/**
 * Mi historial (§9.2.2), del Practicante: las tareas que terminó, de todos sus proyectos (también los anteriores), de la
 * más reciente a la más antigua, con filtro por proyecto y búsqueda por título o ID. Solo lectura: un clic abre el detalle
 * de la tarea. Lee con `listarMiHistorial`, que solo entrega lo suyo, y filtra en memoria.
 *
 * El filtro por proyecto vive en la dirección (`?proyecto=<id>`, la que usa el resumen de un proyecto anterior): elegirlo o
 * quitarlo cambia la dirección con `replace`, y así «Volver» desde el detalle de una tarea regresa con el filtro puesto.
 * Un valor que no sea un proyecto suyo (inválido, inexistente o ajeno) se ignora sin mensaje y se quita de la dirección.
 * `entorno` solo lo cambian las pruebas.
 */
export function PaginaMiHistorial({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(
    () => listarMiHistorial({ idActor: idUsuario ?? '' }, entorno),
    [entorno, idUsuario],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aMiHistorial(consulta.valor)),
    [consulta.valor],
  );

  const pedido = parametros.get(PARAMETRO_PROYECTO);
  // Mientras no llega la consulta no se sabe qué proyectos son suyos: nada se filtra ni se quita todavía.
  const idProyecto = datos === null ? null : idProyectoValido(pedido, datos.proyectos);

  // Un valor que no vale se quita de la dirección, conservando lo demás.
  useEffect(() => {
    if (datos === null || pedido === null || idProyecto !== null) return;
    setParametros(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales);
        siguientes.delete(PARAMETRO_PROYECTO);
        return siguientes;
      },
      { replace: true },
    );
  }, [datos, pedido, idProyecto, setParametros]);

  const visibles = useMemo(
    () => (datos === null ? [] : filtrarMiHistorial(datos.filas, { idProyecto, busqueda })),
    [datos, idProyecto, busqueda],
  );

  if (idUsuario === null) return null;

  function elegirProyecto(id: string) {
    setParametros(
      (actuales) => {
        const siguientes = new URLSearchParams(actuales);
        if (id === '') siguientes.delete(PARAMETRO_PROYECTO);
        else siguientes.set(PARAMETRO_PROYECTO, id);
        return siguientes;
      },
      { replace: true },
    );
  }

  const proyectoFiltrado = datos?.proyectos.find((p) => p.id === idProyecto) ?? null;

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
        <div className="space-y-2" role="status" aria-label="Cargando mi historial">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      );
    }
    if (datos.filas.length === 0) {
      return <EstadoVacio titulo="Aún no has terminado tareas" />;
    }
    if (visibles.length === 0) {
      return proyectoFiltrado !== null && busqueda.trim() === '' ? (
        <EstadoVacio
          titulo="No has terminado tareas en este proyecto"
          accion={
            <Button type="button" variant="outline" onClick={() => elegirProyecto('')}>
              Quitar filtro
            </Button>
          }
        />
      ) : (
        <EstadoVacio
          titulo="Ninguna tarea coincide con la búsqueda"
          descripcion="Prueba con otra búsqueda o quita el filtro de proyecto."
        />
      );
    }
    return (
      <TablaCompacta
        columnas={COLUMNAS}
        filas={visibles}
        claveFila={(f) => f.id}
        onAbrir={(f) => navegar(rutaDeLaTarea(f))}
        vacio={{ titulo: 'Aún no has terminado tareas' }}
      />
    );
  }

  const total = datos?.filas.length ?? 0;
  const hayFiltros = idProyecto !== null || busqueda.trim() !== '';
  const conteo =
    datos === null
      ? undefined
      : hayFiltros
        ? `${visibles.length} de ${total} ${total === 1 ? 'tarea terminada' : 'tareas terminadas'}`
        : `${total} ${total === 1 ? 'tarea terminada' : 'tareas terminadas'}`;

  return (
    <section className="space-y-3">
      <CabeceraDePagina
        titulo="Mi historial"
        subtitulo="Las tareas que has terminado, con su proyecto y su fecha."
      />

      {datos !== null && datos.filas.length > 0 && (
        <BarraDeFiltros>
          <CampoDeFormulario
            htmlFor="filtro-busqueda"
            etiqueta="Buscar"
            className="min-w-48 flex-[2]"
          >
            <BarraBusqueda
              id="filtro-busqueda"
              className="max-w-none"
              valor={busqueda}
              onCambiar={setBusqueda}
              placeholder="Buscar por título o ID"
            />
          </CampoDeFormulario>
          <CampoDeFormulario
            htmlFor="filtro-proyecto"
            etiqueta="Proyecto"
            className="w-full sm:w-56"
          >
            <select
              id="filtro-proyecto"
              value={idProyecto ?? ''}
              onChange={(e) => elegirProyecto(e.target.value)}
              className={CLASE_CAMPO}
            >
              <option value="">Todos</option>
              {datos.proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </CampoDeFormulario>
          {proyectoFiltrado !== null && (
            <span className="inline-flex h-8 items-center gap-1 rounded-md bg-surface-2 pr-1 pl-2.5 text-xs text-text">
              Proyecto: {proyectoFiltrado.codigo}
              <button
                type="button"
                onClick={() => elegirProyecto('')}
                aria-label={`Quitar el filtro de proyecto ${proyectoFiltrado.codigo}`}
                className="rounded px-1.5 py-0.5 text-text-2 hover:text-text focus-visible:ring-2 focus-visible:ring-focus"
              >
                ✕
              </button>
            </span>
          )}
        </BarraDeFiltros>
      )}

      {contenido()}

      {datos !== null && datos.filas.length > 0 && <PieDeTabla>{conteo}</PieDeTabla>}
    </section>
  );
}
