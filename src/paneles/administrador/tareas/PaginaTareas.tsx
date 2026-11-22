import { useCallback, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { aTareas, textoDiasEsperando, type FilaTarea } from '@/app/adaptadores';
import { DialogoNuevaTarea } from '@/app/tareas/DialogoNuevaTarea';
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
import { cn } from '@/compartido/utils';
import type { Rol } from '@/domain';
import { ENTORNO, listarTareas, type Entorno } from '@/services';
import {
  ETIQUETA_ESTADO_PR,
  FILTROS_INICIALES,
  PESTANAS_DE_TAREAS,
  OPCIONES_ESTADO_PR,
  filtrarTareas,
  filtrosDeLaDireccion,
  pestanaInicialDeTareas,
  hayFiltros,
  opcionesDeProyecto,
  opcionesDeResponsable,
  type FiltrosTareas,
  type PestanaTareas,
} from './filtros';
import { rutaDeDetalleDeTareaGlobal } from './rutas';

const CLASE_SELECT =
  'h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus';

/** Mensaje de un listado vacío cuando no hay filtros: cada pestaña dice lo suyo. */
const VACIO_POR_PESTANA: Record<PestanaTareas, string> = {
  TODAS: 'Aún no hay tareas',
  DISPONIBLE: 'No hay tareas disponibles',
  EN_PROGRESO: 'No hay tareas en progreso',
  ESPERANDO_SUPERVISION: 'No hay tareas esperando supervisión',
  TERMINADA: 'Aún no hay tareas terminadas',
};

/**
 * Sin botones de acción en las filas (§6.7): un clic abre el detalle, donde se ejecuta todo. En la pestaña «Esperando
 * supervisión» del Supervisor se agrega «Días esperando» (§9.1.3), porque la regla de supervisión demorada trata de eso.
 */
function columnasDe(rol: Rol, conDiasEsperando: boolean): Columna<FilaTarea>[] {
  return [
    {
      clave: 'id',
      encabezado: 'ID',
      className: 'whitespace-nowrap',
      celda: (f) => <span className="font-medium text-text tabular-nums">{f.idLegible}</span>,
    },
    { clave: 'titulo', encabezado: 'Título', celda: (f) => f.titulo },
    { clave: 'proyecto', encabezado: 'Proyecto', celda: (f) => f.proyecto.nombre },
    {
      clave: 'responsable',
      encabezado: 'Responsable',
      celda: (f) => f.responsable ?? <span className="text-text-2">Sin asignar</span>,
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      className: 'whitespace-nowrap',
      celda: (f) => <Insignia tipo="tarea" estado={f.estado} />,
    },
    {
      clave: 'supervision',
      encabezado: 'Supervisión',
      className: 'whitespace-nowrap',
      celda: (f) =>
        f.requiereSupervision ? (
          <ShieldCheck
            className="size-4 text-text-2"
            strokeWidth={1.5}
            aria-label="Requiere supervisión"
          />
        ) : null,
    },
    {
      clave: 'pr',
      encabezado: 'Pull Request',
      className: 'whitespace-nowrap',
      celda: (f) => (f.estadoPr === null ? null : <Insignia tipo="pr" estado={f.estadoPr} />),
    },
    {
      clave: 'limite',
      encabezado: 'Fecha límite',
      className: 'whitespace-nowrap',
      celda: (f) => (
        <span className={cn('tabular-nums', f.vencida ? 'text-danger-text' : undefined)}>
          {f.fechaLimiteTexto}
        </span>
      ),
    },
    ...(conDiasEsperando
      ? [
          {
            clave: 'dias-esperando',
            encabezado: 'Días esperando',
            className: 'whitespace-nowrap tabular-nums',
            celda: (f: FilaTarea) => textoDiasEsperando(f.diasEsperando),
          },
        ]
      : []),
    {
      clave: 'detalle',
      encabezado: 'Detalle',
      className: 'whitespace-nowrap',
      celda: (f) => (
        <Link
          to={rutaDeDetalleDeTareaGlobal(f.id, rol)}
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
}

function Casilla({
  etiqueta,
  marcada,
  onCambiar,
}: {
  etiqueta: string;
  marcada: boolean;
  onCambiar: (marcada: boolean) => void;
}) {
  return (
    <label className="flex h-8 items-center gap-2 text-sm text-text">
      <input type="checkbox" checked={marcada} onChange={(e) => onCambiar(e.target.checked)} />
      {etiqueta}
    </label>
  );
}

/**
 * Vista transversal de las Tareas (§5.5): las de todos los proyectos juntas, con pestañas por estado y filtros por
 * proyecto, responsable, vencidas, sin asignar, «Requiere supervisión», estado del Pull Request y búsqueda por título o
 * ID. Lee con `listarTareas` y todo se aplica en memoria. Las filas no tienen botones de acción: un clic abre el detalle
 * de la tarea (§6.7). `entorno` solo lo cambian las pruebas.
 */
export function PaginaTareas({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const navegar = useNavigate();
  const rol = sesion?.rol ?? 'ADMINISTRADOR';
  // `null`: nadie eligió pestaña; abre la que corresponde al rol (§5.5, §9.1.3) en cuanto llegan los contadores.
  const pestanaPedida = usePestanaInicial(PESTANAS_DE_TAREAS, null);
  const [pestanaElegida, setPestanaElegida] = useState<PestanaTareas | null>(pestanaPedida);
  // Un enlace (el Dashboard, §9.1.5) puede abrir la vista con «Vencidas» o «Sin asignar» ya marcadas.
  const [parametros] = useSearchParams();
  const [filtros, setFiltros] = useState<FiltrosTareas>(() => ({
    ...FILTROS_INICIALES,
    ...filtrosDeLaDireccion(parametros),
  }));
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(
    () => listarTareas({ idActor: idUsuario ?? '' }, entorno),
    [entorno, idUsuario],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aTareas(consulta.valor)),
    [consulta.valor],
  );
  const pestana: PestanaTareas =
    pestanaElegida ?? (datos === null ? 'TODAS' : pestanaInicialDeTareas(rol, datos.contadores));
  // Mientras llegan los contadores y nadie eligió pestaña, no se dibujan las pestañas ni los filtros: solo el esqueleto
  // de carga; así no se ve «Todas» un instante antes de pasar a la pestaña que corresponde al rol (§9.1.3).
  const eligiendoPestanaInicial = pestanaElegida === null && datos === null && !consulta.error;
  const filtrosActivos = useMemo(() => ({ ...filtros, pestana }), [filtros, pestana]);
  const visibles = useMemo(
    () => (datos === null ? [] : filtrarTareas(datos.filas, filtrosActivos)),
    [datos, filtrosActivos],
  );
  const columnas = useMemo(
    () => columnasDe(rol, rol === 'SUPERVISOR' && pestana === 'ESPERANDO_SUPERVISION'),
    [rol, pestana],
  );

  if (idUsuario === null) return null;

  const cambiar = (cambios: Partial<FiltrosTareas>) =>
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
        <div className="space-y-2" role="status" aria-label="Cargando tareas">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      );
    }
    const vacio =
      datos.contadores.TODAS === 0
        ? { titulo: 'Aún no hay tareas', descripcion: 'Se crean desde el tablero de un proyecto.' }
        : hayFiltros(filtros)
          ? {
              titulo: 'Ninguna tarea coincide con los filtros',
              descripcion: 'Prueba con otra búsqueda o quita algún filtro.',
            }
          : rol === 'SUPERVISOR' && pestana === 'ESPERANDO_SUPERVISION'
            ? { titulo: 'No tienes tareas esperando tu supervisión' }
            : { titulo: VACIO_POR_PESTANA[pestana] };
    return (
      <TablaCompacta
        columnas={columnas}
        filas={visibles}
        claveFila={(f) => f.id}
        onAbrir={(f) => navegar(rutaDeDetalleDeTareaGlobal(f.id, rol))}
        vacio={vacio}
      />
    );
  }

  const filas = datos?.filas ?? [];
  const contadores = datos?.contadores;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-text">Tareas</h1>
        {datos !== null && datos.proyectosParaCrear.length > 0 && (
          <Button type="button" onClick={() => setCreando(true)}>
            Nueva tarea
          </Button>
        )}
      </div>

      {!eligiendoPestanaInicial && (
        <>
          <PestanasConContador
            valor={pestana}
            onCambiar={(valor) => setPestanaElegida(valor as PestanaTareas)}
            pestanas={[
              { valor: 'TODAS', etiqueta: 'Todas', contador: contadores?.TODAS },
              { valor: 'DISPONIBLE', etiqueta: 'Disponibles', contador: contadores?.DISPONIBLE },
              { valor: 'EN_PROGRESO', etiqueta: 'En progreso', contador: contadores?.EN_PROGRESO },
              {
                valor: 'ESPERANDO_SUPERVISION',
                etiqueta: 'Esperando supervisión',
                contador: contadores?.ESPERANDO_SUPERVISION,
                resaltar: true,
              },
              { valor: 'TERMINADA', etiqueta: 'Terminadas', contador: contadores?.TERMINADA },
            ]}
          />

          <div className="flex flex-wrap items-end gap-3">
            <BarraBusqueda
              valor={filtros.busqueda}
              onCambiar={(busqueda) => cambiar({ busqueda })}
              placeholder="Buscar por título o ID"
            />
            <div className="w-48 space-y-1">
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
            <div className="w-48 space-y-1">
              <Label htmlFor="filtro-responsable">Responsable</Label>
              <select
                id="filtro-responsable"
                value={filtros.idResponsable}
                onChange={(e) => cambiar({ idResponsable: e.target.value })}
                className={CLASE_SELECT}
              >
                <option value="">Todos</option>
                {opcionesDeResponsable(filas).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-44 space-y-1">
              <Label htmlFor="filtro-pr">Pull Request</Label>
              <select
                id="filtro-pr"
                value={filtros.estadoPr}
                onChange={(e) => cambiar({ estadoPr: e.target.value as FiltrosTareas['estadoPr'] })}
                className={CLASE_SELECT}
              >
                <option value="">Todos</option>
                {OPCIONES_ESTADO_PR.map((e) => (
                  <option key={e} value={e}>
                    {ETIQUETA_ESTADO_PR[e]}
                  </option>
                ))}
              </select>
            </div>
            <Casilla
              etiqueta="Vencidas"
              marcada={filtros.soloVencidas}
              onCambiar={(soloVencidas) => cambiar({ soloVencidas })}
            />
            <Casilla
              etiqueta="Sin asignar"
              marcada={filtros.soloSinAsignar}
              onCambiar={(soloSinAsignar) => cambiar({ soloSinAsignar })}
            />
            <Casilla
              etiqueta="Requiere supervisión"
              marcada={filtros.soloRequierenSupervision}
              onCambiar={(soloRequierenSupervision) => cambiar({ soloRequierenSupervision })}
            />
          </div>
        </>
      )}

      {contenido()}

      {creando && datos !== null && (
        <DialogoNuevaTarea
          idActor={idUsuario}
          proyectos={datos.proyectosParaCrear}
          descripcion="Elige el proyecto: la tarea nace «Disponible» y sin responsable. Una tarea no puede cambiarse de proyecto después."
          onCerrar={() => setCreando(false)}
          entorno={entorno}
        />
      )}
    </section>
  );
}
