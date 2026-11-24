import { BarraDeFiltros } from '@/compartido/BarraDeFiltros';
import { CabeceraDePagina } from '@/compartido/CabeceraDePagina';
import { CampoDeFormulario } from '@/compartido/CampoDeFormulario';
import { CLASE_CAMPO } from '@/compartido/estiloCampo';
import { PieDeTabla } from '@/compartido/PieDeTabla';
import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { aProyectos, type FilaProyecto } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { usePestanaInicial } from '@/app/usePestanaInicial';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { BarraBusqueda } from '@/compartido/BarraBusqueda';
import { Insignia } from '@/compartido/Insignia';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { TablaCompacta, type Columna } from '@/compartido/TablaCompacta';
import { Button } from '@/compartido/ui/button';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, listarProyectos, type Entorno } from '@/services';
import {
  FILTROS_INICIALES,
  PESTANAS_DE_PROYECTOS,
  filtrarProyectos,
  hayFiltros,
  opcionesDeSupervisor,
  type FiltrosProyectos,
  type PestanaProyectos,
} from './filtros';
import { FormularioProyecto } from './FormularioProyecto';
import { rutaDeDetalleDeProyecto } from './rutas';

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
  const pestanaInicial = usePestanaInicial(PESTANAS_DE_PROYECTOS, FILTROS_INICIALES.pestana);
  const [filtros, setFiltros] = useState<FiltrosProyectos>(() => ({
    ...FILTROS_INICIALES,
    pestana: pestanaInicial,
  }));
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
    <section className="space-y-3">
      <CabeceraDePagina
        titulo="Proyectos"
        subtitulo="Estado, avance y supervisor de cada proyecto."
        acciones={
          datos?.puedeCrear ? (
            <Button type="button" onClick={() => setCreando(true)}>
              Nuevo proyecto
            </Button>
          ) : undefined
        }
      />

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

      <BarraDeFiltros>
        <CampoDeFormulario
          htmlFor="filtro-busqueda"
          etiqueta="Buscar"
          className="min-w-48 flex-[2]"
        >
          <BarraBusqueda
            id="filtro-busqueda"
            className="max-w-none"
            valor={filtros.busqueda}
            onCambiar={(busqueda) => cambiar({ busqueda })}
            placeholder="Buscar por nombre"
          />
        </CampoDeFormulario>
        <CampoDeFormulario
          htmlFor="filtro-supervisor"
          etiqueta="Supervisor"
          className="min-w-36 flex-1"
        >
          <select
            id="filtro-supervisor"
            value={filtros.idSupervisor}
            onChange={(e) => cambiar({ idSupervisor: e.target.value })}
            className={CLASE_CAMPO}
          >
            <option value="">Todos</option>
            {opcionesDeSupervisor(filas).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </CampoDeFormulario>
      </BarraDeFiltros>

      {contenido()}

      {datos !== null && !consulta.error && visibles.length > 0 && (
        <PieDeTabla>
          Mostrando {visibles.length} de {datos.contadores.TODOS} proyectos. Un clic en una fila
          abre su detalle.
        </PieDeTabla>
      )}

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
