import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { aPracticantesACargo, type FilaPracticanteACargo } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { BarraBusqueda } from '@/compartido/BarraBusqueda';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { TablaCompacta, type Columna } from '@/compartido/TablaCompacta';
import { Label } from '@/compartido/ui/label';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, listarPracticantesACargo, type Entorno } from '@/services';
import {
  FILTROS_INICIALES,
  filtrarACargo,
  hayFiltros,
  opcionesDeProyecto,
  type FiltrosACargo,
  type PestanaACargo,
} from './filtros';
import { rutaDeDetalleDePracticanteACargo } from './rutas';

const CLASE_SELECT =
  'h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus';

const VACIO_POR_PESTANA: Record<PestanaACargo, string> = {
  ACTIVOS: 'No tienes practicantes activos',
  ANTERIORES: 'Aún no tienes practicantes anteriores',
};

// Sin botones de gestión: el Supervisor solo consulta (§9.1.2). Un clic en la fila abre el detalle.
const COLUMNAS: Columna<FilaPracticanteACargo>[] = [
  {
    clave: 'practicante',
    encabezado: 'Practicante',
    celda: (f) => (
      <div className="py-1">
        <p className="font-medium text-text">{f.nombre}</p>
        <p className="text-xs text-text-2">{f.correo}</p>
      </div>
    ),
  },
  { clave: 'especialidad', encabezado: 'Especialidad', celda: (f) => f.especialidad },
  {
    clave: 'proyectos',
    encabezado: 'Proyectos',
    celda: (f) => f.proyectos.map((p) => p.nombre).join(', '),
  },
  {
    clave: 'carga',
    encabezado: 'Carga',
    className: 'whitespace-nowrap tabular-nums',
    celda: (f) => f.carga,
  },
  {
    clave: 'revision',
    encabezado: 'Esperando mi revisión',
    className: 'whitespace-nowrap tabular-nums',
    celda: (f) => f.esperandoMiRevision,
  },
  {
    clave: 'actividad',
    encabezado: 'Última actividad',
    className: 'whitespace-nowrap',
    celda: (f) => f.ultimaActividadTexto,
  },
];

const COLUMNA_BAJA: Columna<FilaPracticanteACargo> = {
  clave: 'baja',
  encabezado: 'Fecha de baja',
  className: 'whitespace-nowrap',
  celda: (f) => f.bajaTexto ?? '—',
};

const COLUMNA_DETALLE: Columna<FilaPracticanteACargo> = {
  clave: 'detalle',
  encabezado: 'Detalle',
  className: 'whitespace-nowrap',
  celda: (f) => (
    <Link
      to={rutaDeDetalleDePracticanteACargo(f.id)}
      // El clic de la fila ya abre el detalle: evita navegar dos veces.
      onClick={(e) => e.stopPropagation()}
      aria-label={`Ver detalle de ${f.nombre}`}
      className="font-medium text-link underline underline-offset-2"
    >
      Ver detalle
    </Link>
  ),
};

/**
 * Practicantes a cargo (§9.1.2), del Supervisor: las personas de sus proyectos en una tabla, con pestañas Activos y
 * Anteriores (abre en «Activos»), filtro por proyecto (solo los suyos) y búsqueda por nombre o correo. Lee con
 * `listarPracticantesACargo`, que entrega una fila por persona y solo lo de sus proyectos: no hay área técnica, ni
 * postulación de origen, ni nada de proyectos ajenos. Sin acciones. `entorno` solo lo cambian las pruebas.
 */
export function PaginaPracticantesACargo({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const navegar = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosACargo>(FILTROS_INICIALES);

  const cargar = useCallback(
    () => listarPracticantesACargo({ idActor: idUsuario ?? '' }, entorno),
    [entorno, idUsuario],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aPracticantesACargo(consulta.valor)),
    [consulta.valor],
  );
  const visibles = useMemo(
    () => (datos === null ? [] : filtrarACargo(datos.filas, filtros)),
    [datos, filtros],
  );

  if (idUsuario === null) return null;

  const cambiar = (cambios: Partial<FiltrosACargo>) =>
    setFiltros((actuales) => ({ ...actuales, ...cambios }));

  // En «Anteriores» se agrega la fecha de baja (§9.1.2: «con fecha de baja»).
  const columnas =
    filtros.pestana === 'ANTERIORES'
      ? [...COLUMNAS, COLUMNA_BAJA, COLUMNA_DETALLE]
      : [...COLUMNAS, COLUMNA_DETALLE];

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
        <div className="space-y-2" role="status" aria-label="Cargando practicantes">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      );
    }
    const sinNinguno = datos.contadores.ACTIVOS + datos.contadores.ANTERIORES === 0;
    const vacio = sinNinguno
      ? { titulo: 'Aún no tienes practicantes asignados en tus proyectos' }
      : hayFiltros(filtros)
        ? {
            titulo: 'Ningún practicante coincide con los filtros',
            descripcion: 'Prueba con otra búsqueda o quita el filtro de proyecto.',
          }
        : { titulo: VACIO_POR_PESTANA[filtros.pestana] };
    return (
      <TablaCompacta
        columnas={columnas}
        filas={visibles}
        claveFila={(f) => f.id}
        onAbrir={(f) => navegar(rutaDeDetalleDePracticanteACargo(f.id))}
        vacio={vacio}
      />
    );
  }

  const contadores = datos?.contadores;
  return (
    <section className="space-y-4">
      <h1 className="text-text">Practicantes a cargo</h1>

      <PestanasConContador
        valor={filtros.pestana}
        onCambiar={(valor) => cambiar({ pestana: valor as PestanaACargo })}
        pestanas={[
          { valor: 'ACTIVOS', etiqueta: 'Activos', contador: contadores?.ACTIVOS },
          { valor: 'ANTERIORES', etiqueta: 'Anteriores', contador: contadores?.ANTERIORES },
        ]}
      />

      <div className="flex flex-wrap items-end gap-3">
        <BarraBusqueda
          valor={filtros.busqueda}
          onCambiar={(busqueda) => cambiar({ busqueda })}
          placeholder="Buscar por nombre o correo"
        />
        <div className="w-52 space-y-1">
          <Label htmlFor="filtro-proyecto-a-cargo">Proyecto</Label>
          <select
            id="filtro-proyecto-a-cargo"
            value={filtros.idProyecto}
            onChange={(e) => cambiar({ idProyecto: e.target.value })}
            className={CLASE_SELECT}
          >
            <option value="">Todos</option>
            {opcionesDeProyecto(datos?.filas ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {contenido()}
    </section>
  );
}
