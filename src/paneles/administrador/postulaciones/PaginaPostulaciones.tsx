import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { aPostulaciones, type FilaPostulacion } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { usePestanaInicial } from '@/app/usePestanaInicial';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { BarraBusqueda } from '@/compartido/BarraBusqueda';
import { Insignia } from '@/compartido/Insignia';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { TablaCompacta, type Columna } from '@/compartido/TablaCompacta';
import { Input } from '@/compartido/ui/input';
import { Label } from '@/compartido/ui/label';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, listarPostulaciones, type Entorno } from '@/services';
import { BarraPuntaje } from './BarraPuntaje';
import {
  FILTROS_INICIALES,
  PESTANAS_DE_POSTULACIONES,
  filtrarPostulaciones,
  hayFiltros,
  opcionesDeArea,
  opcionesDeEspecialidad,
  type FiltrosPostulaciones,
  type OrdenPostulaciones,
  type PestanaPostulaciones,
} from './filtros';
import { RUTA_CRITERIOS, rutaDeDetalleDePostulacion } from './rutas';

const CLASE_SELECT =
  'h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus';

/** Mensaje de un listado vacío cuando no hay filtros: cada pestaña dice lo suyo. */
const VACIO_POR_PESTANA: Record<PestanaPostulaciones, string> = {
  PENDIENTES: 'No hay postulaciones pendientes',
  REQUIEREN_REVISION: 'No hay postulaciones que requieran revisión manual',
  APROBADAS: 'Aún no hay postulaciones aprobadas',
  RECHAZADAS: 'Aún no hay postulaciones rechazadas',
  TODAS: 'Aún no hay postulaciones',
};

const COLUMNAS: Columna<FilaPostulacion>[] = [
  {
    clave: 'postulante',
    encabezado: 'Postulante',
    celda: (f) => (
      <div className="py-1">
        <p className="font-medium text-text">{f.nombre}</p>
        <p className="text-xs text-text-2">{f.correo}</p>
      </div>
    ),
  },
  { clave: 'area', encabezado: 'Área técnica', celda: (f) => f.area?.nombre ?? '—' },
  {
    clave: 'especialidad',
    encabezado: 'Especialidad',
    celda: (f) => f.especialidad?.nombre ?? '—',
  },
  {
    clave: 'fecha',
    encabezado: 'Fecha',
    className: 'whitespace-nowrap',
    celda: (f) => f.fechaTexto,
  },
  {
    clave: 'puntaje',
    encabezado: 'Puntaje de la IA',
    className: 'whitespace-nowrap',
    celda: (f) => <BarraPuntaje puntaje={f.puntaje} />,
  },
  {
    clave: 'revision',
    encabezado: 'Revisión',
    className: 'whitespace-nowrap',
    celda: (f) => (f.requiereRevision ? <Insignia tipo="marca" estado="REVISION_MANUAL" /> : null),
  },
  {
    clave: 'estado',
    encabezado: 'Estado',
    className: 'whitespace-nowrap',
    celda: (f) => <Insignia tipo="postulacion" estado={f.estado} />,
  },
  {
    clave: 'detalle',
    encabezado: 'Detalle',
    className: 'whitespace-nowrap',
    celda: (f) => (
      <Link
        to={rutaDeDetalleDePostulacion(f.id)}
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
 * Listado de Postulaciones (§5.1): abre en «Pendientes» y por puntaje (el ranking). Lee con `listarPostulaciones`; las
 * pestañas, los filtros, la búsqueda y el orden se aplican en memoria sobre lo que entrega la consulta. No hay acciones
 * en las filas: un clic abre el detalle. `entorno` solo lo cambian las pruebas.
 */
export function PaginaPostulaciones({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const navegar = useNavigate();
  const pestanaInicial = usePestanaInicial(PESTANAS_DE_POSTULACIONES, FILTROS_INICIALES.pestana);
  const [filtros, setFiltros] = useState<FiltrosPostulaciones>(() => ({
    ...FILTROS_INICIALES,
    pestana: pestanaInicial,
  }));

  const cargar = useCallback(
    () => listarPostulaciones({ idActor: idUsuario ?? '' }, entorno),
    [entorno, idUsuario],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aPostulaciones(consulta.valor)),
    [consulta.valor],
  );
  const visibles = useMemo(
    () => (datos === null ? [] : filtrarPostulaciones(datos.filas, filtros)),
    [datos, filtros],
  );

  if (idUsuario === null) return null;

  const cambiar = (cambios: Partial<FiltrosPostulaciones>) =>
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
        <div className="space-y-2" role="status" aria-label="Cargando postulaciones">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      );
    }
    const vacio =
      datos.contadores.TODAS === 0
        ? {
            titulo: 'Aún no hay postulaciones',
            descripcion: 'Llegan desde el formulario del sitio web de CODAINI.',
          }
        : hayFiltros(filtros)
          ? {
              titulo: 'Ninguna postulación coincide con los filtros',
              descripcion: 'Prueba con otra búsqueda o quita algún filtro.',
            }
          : { titulo: VACIO_POR_PESTANA[filtros.pestana] };
    return (
      <TablaCompacta
        columnas={COLUMNAS}
        filas={visibles}
        claveFila={(f) => f.id}
        onAbrir={(f) => navegar(rutaDeDetalleDePostulacion(f.id))}
        vacio={vacio}
      />
    );
  }

  const filas = datos?.filas ?? [];
  const contadores = datos?.contadores;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-text">Postulaciones</h1>
        <Link
          to={RUTA_CRITERIOS}
          className="text-sm font-medium text-link underline underline-offset-2"
        >
          Criterios de evaluación
        </Link>
      </div>

      <PestanasConContador
        valor={filtros.pestana}
        onCambiar={(valor) => cambiar({ pestana: valor as PestanaPostulaciones })}
        pestanas={[
          { valor: 'PENDIENTES', etiqueta: 'Pendientes', contador: contadores?.PENDIENTES },
          {
            valor: 'REQUIEREN_REVISION',
            etiqueta: 'Requieren revisión',
            contador: contadores?.REQUIEREN_REVISION,
            resaltar: true,
          },
          { valor: 'APROBADAS', etiqueta: 'Aprobadas', contador: contadores?.APROBADAS },
          { valor: 'RECHAZADAS', etiqueta: 'Rechazadas', contador: contadores?.RECHAZADAS },
          { valor: 'TODAS', etiqueta: 'Todas', contador: contadores?.TODAS },
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
            onChange={(e) => cambiar({ idArea: e.target.value, idEspecialidad: '' })}
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
        <div className="w-44 space-y-1">
          <Label htmlFor="filtro-especialidad">Especialidad</Label>
          <select
            id="filtro-especialidad"
            value={filtros.idEspecialidad}
            onChange={(e) => cambiar({ idEspecialidad: e.target.value })}
            className={CLASE_SELECT}
          >
            <option value="">Todas</option>
            {opcionesDeEspecialidad(filas, filtros.idArea).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="w-36 space-y-1">
          <Label htmlFor="filtro-desde">Desde</Label>
          <Input
            id="filtro-desde"
            type="date"
            value={filtros.desde}
            max={filtros.hasta || undefined}
            onChange={(e) => cambiar({ desde: e.target.value })}
          />
        </div>
        <div className="w-36 space-y-1">
          <Label htmlFor="filtro-hasta">Hasta</Label>
          <Input
            id="filtro-hasta"
            type="date"
            value={filtros.hasta}
            min={filtros.desde || undefined}
            onChange={(e) => cambiar({ hasta: e.target.value })}
          />
        </div>
        <div className="w-40 space-y-1">
          <Label htmlFor="orden-postulaciones">Ordenar por</Label>
          <select
            id="orden-postulaciones"
            value={filtros.orden}
            onChange={(e) => cambiar({ orden: e.target.value as OrdenPostulaciones })}
            className={CLASE_SELECT}
          >
            <option value="PUNTAJE">Mayor puntaje</option>
            <option value="FECHA">Más recientes</option>
          </select>
        </div>
      </div>

      {contenido()}
    </section>
  );
}
