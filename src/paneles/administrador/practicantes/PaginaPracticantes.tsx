import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { aPracticantes, type FilaPracticante } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { usePestanaInicial } from '@/app/usePestanaInicial';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { BarraBusqueda } from '@/compartido/BarraBusqueda';
import { Insignia } from '@/compartido/Insignia';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { TablaCompacta, type Columna } from '@/compartido/TablaCompacta';
import { Button } from '@/compartido/ui/button';
import { Label } from '@/compartido/ui/label';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, listarPracticantes, type Entorno } from '@/services';
import {
  FILTROS_INICIALES,
  PESTANAS_DE_PRACTICANTES,
  filtrarPracticantes,
  hayFiltros,
  opcionesDeArea,
  opcionesDeProyecto,
  type FiltrosPracticantes,
  type PestanaPracticantes,
} from './filtros';
import { AsignarAProyecto } from './AsignarAProyecto';
import { rutaDeDetalleDePracticante } from './rutas';

const CLASE_SELECT =
  'h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus';

/** Mensaje de un listado vacío cuando no hay filtros: cada pestaña dice lo suyo. */
const VACIO_POR_PESTANA: Record<PestanaPracticantes, string> = {
  ACTIVOS: 'No hay practicantes activos',
  SIN_PROYECTO: 'Todos los practicantes activos tienen un proyecto',
  FINALIZADOS: 'Aún no hay practicantes con la práctica finalizada',
  TODOS: 'Aún no hay practicantes',
};

const COLUMNAS: Columna<FilaPracticante>[] = [
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
  {
    clave: 'area',
    encabezado: 'Área y especialidad',
    celda: (f) => (
      <div className="py-1">
        <p className="text-text">{f.area?.nombre ?? '—'}</p>
        <p className="text-xs text-text-2">{f.especialidad?.nombre ?? '—'}</p>
      </div>
    ),
  },
  {
    clave: 'proyectos',
    encabezado: 'Proyectos activos',
    celda: (f) => (f.proyectos.length === 0 ? '—' : f.proyectos.map((p) => p.codigo).join(', ')),
  },
  {
    clave: 'carga',
    encabezado: 'Carga',
    className: 'whitespace-nowrap',
    celda: (f) => f.carga,
  },
  {
    clave: 'actividad',
    encabezado: 'Última actividad',
    className: 'whitespace-nowrap',
    celda: (f) => f.ultimaActividadTexto,
  },
  {
    clave: 'fin',
    encabezado: 'Fin previsto',
    className: 'whitespace-nowrap',
    celda: (f) => (
      <div className="py-1">
        <p className="text-text">{f.finPrevistaTexto}</p>
        {f.fin !== null && f.fin.situacion !== 'EN_CURSO' && (
          <p className="text-xs text-text-2">{f.fin.texto}</p>
        )}
      </div>
    ),
  },
  {
    clave: 'estado',
    encabezado: 'Estado',
    className: 'whitespace-nowrap',
    celda: (f) => (
      <div className="flex flex-wrap items-center gap-1">
        <Insignia tipo="practicante" estado={f.estado} />
        {f.sinProyecto && <Insignia tipo="practicante" estado="SIN_PROYECTO" />}
      </div>
    ),
  },
  {
    clave: 'detalle',
    encabezado: 'Detalle',
    className: 'whitespace-nowrap',
    celda: (f) => (
      <Link
        to={rutaDeDetalleDePracticante(f.id)}
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
 * Listado de Practicantes (§5.2): abre en «Activos». Lee con `listarPracticantes`; las pestañas, los filtros y la
 * búsqueda se aplican en memoria sobre lo que entrega la consulta. No hay «Nuevo practicante»: un practicante solo nace
 * al aprobar una postulación. `entorno` solo lo cambian las pruebas.
 */
export function PaginaPracticantes({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const navegar = useNavigate();
  const pestanaInicial = usePestanaInicial(PESTANAS_DE_PRACTICANTES, FILTROS_INICIALES.pestana);
  const [filtros, setFiltros] = useState<FiltrosPracticantes>(() => ({
    ...FILTROS_INICIALES,
    pestana: pestanaInicial,
  }));
  // El diálogo vive aquí y no en la fila: al asignar, la persona sale de «Sin proyecto» y su fila desaparece.
  const [asignando, setAsignando] = useState<FilaPracticante | null>(null);

  const cargar = useCallback(
    () => listarPracticantes({ idActor: idUsuario ?? '' }, entorno),
    [entorno, idUsuario],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aPracticantes(consulta.valor)),
    [consulta.valor],
  );
  const visibles = useMemo(
    () => (datos === null ? [] : filtrarPracticantes(datos.filas, filtros)),
    [datos, filtros],
  );

  if (idUsuario === null) return null;

  const cambiar = (cambios: Partial<FiltrosPracticantes>) =>
    setFiltros((actuales) => ({ ...actuales, ...cambios }));

  // En «Sin proyecto» cada fila trae el atajo «Asignar a proyecto» (§5.2), antes del enlace al detalle.
  const columnas: Columna<FilaPracticante>[] =
    filtros.pestana === 'SIN_PROYECTO'
      ? [
          ...COLUMNAS.slice(0, -1),
          {
            clave: 'asignar',
            encabezado: 'Asignar',
            className: 'whitespace-nowrap',
            celda: (f) => (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Asignar a proyecto a ${f.nombre}`}
                // El clic de la fila ya abre el detalle: el atajo no debe abrirlo también.
                onClick={(e) => {
                  e.stopPropagation();
                  setAsignando(f);
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                Asignar a proyecto
              </Button>
            ),
          },
          COLUMNAS[COLUMNAS.length - 1]!,
        ]
      : COLUMNAS;

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
    const vacio =
      datos.contadores.TODOS === 0
        ? {
            titulo: 'Aún no hay practicantes',
            descripcion: 'Un practicante nace al aprobar una postulación.',
          }
        : hayFiltros(filtros)
          ? {
              titulo: 'Ningún practicante coincide con los filtros',
              descripcion: 'Prueba con otra búsqueda o quita algún filtro.',
            }
          : { titulo: VACIO_POR_PESTANA[filtros.pestana] };
    return (
      <TablaCompacta
        columnas={columnas}
        filas={visibles}
        claveFila={(f) => f.id}
        onAbrir={(f) => navegar(rutaDeDetalleDePracticante(f.id))}
        vacio={vacio}
      />
    );
  }

  const filas = datos?.filas ?? [];
  const contadores = datos?.contadores;

  return (
    <section className="space-y-4">
      <h1 className="text-text">Practicantes</h1>

      <PestanasConContador
        valor={filtros.pestana}
        onCambiar={(valor) => cambiar({ pestana: valor as PestanaPracticantes })}
        pestanas={[
          { valor: 'ACTIVOS', etiqueta: 'Activos', contador: contadores?.ACTIVOS },
          { valor: 'SIN_PROYECTO', etiqueta: 'Sin proyecto', contador: contadores?.SIN_PROYECTO },
          { valor: 'FINALIZADOS', etiqueta: 'Finalizados', contador: contadores?.FINALIZADOS },
          { valor: 'TODOS', etiqueta: 'Todos', contador: contadores?.TODOS },
        ]}
      />

      <div className="flex flex-wrap items-end gap-3">
        <BarraBusqueda
          valor={filtros.busqueda}
          onCambiar={(busqueda) => cambiar({ busqueda })}
          placeholder="Buscar por nombre o correo"
        />
        <div className="w-44 space-y-1">
          <Label htmlFor="filtro-area">Área técnica</Label>
          <select
            id="filtro-area"
            value={filtros.idArea}
            onChange={(e) => cambiar({ idArea: e.target.value })}
            className={CLASE_SELECT}
          >
            <option value="">Todas</option>
            {opcionesDeArea(filas).map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="w-52 space-y-1">
          <Label htmlFor="filtro-proyecto">Proyecto</Label>
          <select
            id="filtro-proyecto"
            value={filtros.idProyecto}
            onChange={(e) => cambiar({ idProyecto: e.target.value })}
            className={CLASE_SELECT}
          >
            <option value="">Todos</option>
            {opcionesDeProyecto(filas).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {contenido()}

      {asignando !== null && (
        <AsignarAProyecto
          idActor={idUsuario}
          practicante={{ id: asignando.id, nombre: asignando.nombre }}
          onCerrar={() => setAsignando(null)}
          entorno={entorno}
        />
      )}
    </section>
  );
}
