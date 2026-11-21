import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  aHistorial,
  CATEGORIAS_DE_HISTORIAL,
  ETIQUETA_CATEGORIA,
  ETIQUETA_TIPO_ELEMENTO,
  TIPOS_ELEMENTO_DE_HISTORIAL,
  type FilaHistorial,
} from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { BarraBusqueda } from '@/compartido/BarraBusqueda';
import { TablaCompacta, type Columna } from '@/compartido/TablaCompacta';
import { Input } from '@/compartido/ui/input';
import { Label } from '@/compartido/ui/label';
import { Skeleton } from '@/compartido/ui/skeleton';
import type { CategoriaEvento, TipoElemento } from '@/domain';
import {
  ENTORNO,
  FILTRO_AUTOR_SISTEMA,
  listarHistorial,
  listarProyectos,
  type Entorno,
  type FiltrosHistorial,
} from '@/services';
import { DetalleDeEvento } from './DetalleDeEvento';

const CLASE_SELECT =
  'h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus';

interface FiltrosEnPantalla {
  desde: string;
  hasta: string;
  idAutor: string;
  categoria: string;
  tipoElemento: string;
  idProyecto: string;
  texto: string;
}

const FILTROS_INICIALES: FiltrosEnPantalla = {
  desde: '',
  hasta: '',
  idAutor: '',
  categoria: '',
  tipoElemento: '',
  idProyecto: '',
  texto: '',
};

/** Los filtros de la pantalla al formato de la consulta: solo los que tienen valor. */
function aFiltrosDeConsulta(f: FiltrosEnPantalla): FiltrosHistorial {
  return {
    ...(f.desde === '' ? {} : { desde: f.desde }),
    ...(f.hasta === '' ? {} : { hasta: f.hasta }),
    ...(f.idAutor === '' ? {} : { id_autor: f.idAutor }),
    ...(f.categoria === '' ? {} : { categoria: f.categoria as CategoriaEvento }),
    ...(f.tipoElemento === '' ? {} : { tipo_elemento: f.tipoElemento as TipoElemento }),
    ...(f.idProyecto === '' ? {} : { id_proyecto: f.idProyecto }),
    ...(f.texto.trim() === '' ? {} : { texto: f.texto }),
  };
}

const hayFiltros = (f: FiltrosEnPantalla) =>
  (Object.keys(FILTROS_INICIALES) as (keyof FiltrosEnPantalla)[]).some(
    (k) => f[k] !== FILTROS_INICIALES[k],
  );

/**
 * Historial de actividad (§5.7): el registro de auditoría del sistema, solo para el Administrador. Es de **solo
 * lectura**: no hay botones de editar ni de borrar, porque los eventos son inmutables. Los filtros (fechas, autor,
 * categoría, tipo de elemento, proyecto y texto) los aplica `listarHistorial`; un clic en la fila abre el detalle con el
 * valor anterior y el nuevo de cada campo y la nota. `entorno` solo lo cambian las pruebas.
 */
export function PaginaHistorial({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idActor = sesion?.id ?? null;
  const [filtros, setFiltros] = useState<FiltrosEnPantalla>(FILTROS_INICIALES);
  const [abierto, setAbierto] = useState<string | null>(null);

  const cargar = useCallback(
    () =>
      idActor === null
        ? Promise.resolve({ ok: true as const, valor: { eventos: [] } })
        : listarHistorial({ idActor, filtros: aFiltrosDeConsulta(filtros) }, entorno),
    [entorno, idActor, filtros],
  );
  const consulta = useConsulta(cargar);

  // Sin filtros, para ofrecer todas las personas autoras aunque la lista de abajo ya esté filtrada.
  const cargarTodos = useCallback(
    () =>
      idActor === null
        ? Promise.resolve({ ok: true as const, valor: { eventos: [] } })
        : listarHistorial({ idActor }, entorno),
    [entorno, idActor],
  );
  const todos = useConsulta(cargarTodos);

  const cargarProyectos = useCallback(
    () => listarProyectos({ idActor: idActor ?? '' }, entorno),
    [entorno, idActor],
  );
  const proyectos = useConsulta(idActor === null ? null : cargarProyectos);

  const vista = useMemo(
    () => (consulta.valor === null ? null : aHistorial(consulta.valor.eventos)),
    [consulta.valor],
  );
  const autores = useMemo(() => {
    const porId = new Map<string, string>();
    for (const f of todos.valor === null ? [] : aHistorial(todos.valor.eventos).filas) {
      if (f.idAutor !== null) porId.set(f.idAutor, f.autor);
    }
    return [...porId.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  }, [todos.valor]);

  const columnas = useMemo<Columna<FilaHistorial>[]>(
    () => [
      {
        clave: 'fecha',
        encabezado: 'Fecha y hora',
        className: 'whitespace-nowrap',
        celda: (f) => f.fechaTexto,
      },
      { clave: 'autor', encabezado: 'Autor', celda: (f) => f.autor },
      { clave: 'accion', encabezado: 'Acción', celda: (f) => f.accion },
      {
        clave: 'elemento',
        encabezado: 'Elemento',
        celda: (f) =>
          f.rutaElemento === null ? (
            f.elementoEtiqueta
          ) : (
            <Link
              to={f.rutaElemento}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-link underline underline-offset-2"
            >
              {f.elementoEtiqueta}
            </Link>
          ),
      },
      {
        clave: 'resumen',
        encabezado: 'Cambio',
        celda: (f) => f.resumen ?? <span className="text-text-2">—</span>,
      },
    ],
    [],
  );

  const poner = (cambios: Partial<FiltrosEnPantalla>) => setFiltros((f) => ({ ...f, ...cambios }));
  const elegida = vista?.filas.find((f) => f.id === abierto) ?? null;

  function contenido() {
    if (consulta.error) {
      return (
        <p role="alert" className="text-sm text-danger-text">
          {consulta.error}
        </p>
      );
    }
    if (vista === null) {
      return (
        <div className="space-y-2" role="status" aria-label="Cargando el historial">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      );
    }
    return (
      <TablaCompacta
        columnas={columnas}
        filas={vista.filas}
        claveFila={(f) => f.id}
        onAbrir={(f) => setAbierto(f.id)}
        vacio={
          hayFiltros(filtros)
            ? { titulo: 'Ningún evento coincide con los filtros' }
            : { titulo: 'Aún no hay actividad registrada' }
        }
      />
    );
  }

  if (idActor === null) return null;

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-text">Historial de actividad</h1>
        <p className="text-sm text-text-2">
          El registro de auditoría del sistema: los eventos no se editan ni se borran.
        </p>
      </div>

      <div
        className="flex flex-wrap items-end gap-3"
        role="search"
        aria-label="Filtros del historial"
      >
        <BarraBusqueda
          valor={filtros.texto}
          onCambiar={(texto) => poner({ texto })}
          placeholder="Buscar (por ejemplo, un ID de tarea)"
        />
        <div className="w-40 space-y-1">
          <Label htmlFor="historial-desde">Desde</Label>
          <Input
            id="historial-desde"
            type="date"
            value={filtros.desde}
            onChange={(e) => poner({ desde: e.target.value })}
          />
        </div>
        <div className="w-40 space-y-1">
          <Label htmlFor="historial-hasta">Hasta</Label>
          <Input
            id="historial-hasta"
            type="date"
            value={filtros.hasta}
            onChange={(e) => poner({ hasta: e.target.value })}
          />
        </div>
        <div className="w-44 space-y-1">
          <Label htmlFor="historial-autor">Autor</Label>
          <select
            id="historial-autor"
            value={filtros.idAutor}
            onChange={(e) => poner({ idAutor: e.target.value })}
            className={CLASE_SELECT}
          >
            <option value="">Todos</option>
            <option value={FILTRO_AUTOR_SISTEMA}>Sistema</option>
            {autores.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="w-40 space-y-1">
          <Label htmlFor="historial-categoria">Categoría</Label>
          <select
            id="historial-categoria"
            value={filtros.categoria}
            onChange={(e) => poner({ categoria: e.target.value })}
            className={CLASE_SELECT}
          >
            <option value="">Todas</option>
            {CATEGORIAS_DE_HISTORIAL.map((c) => (
              <option key={c} value={c}>
                {ETIQUETA_CATEGORIA[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="w-48 space-y-1">
          <Label htmlFor="historial-tipo">Tipo de elemento</Label>
          <select
            id="historial-tipo"
            value={filtros.tipoElemento}
            onChange={(e) => poner({ tipoElemento: e.target.value })}
            className={CLASE_SELECT}
          >
            <option value="">Todos</option>
            {TIPOS_ELEMENTO_DE_HISTORIAL.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO_ELEMENTO[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="w-48 space-y-1">
          <Label htmlFor="historial-proyecto">Proyecto</Label>
          <select
            id="historial-proyecto"
            value={filtros.idProyecto}
            onChange={(e) => poner({ idProyecto: e.target.value })}
            className={CLASE_SELECT}
          >
            <option value="">Todos</option>
            {(proyectos.valor?.proyectos ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        {hayFiltros(filtros) && (
          <button
            type="button"
            onClick={() => setFiltros(FILTROS_INICIALES)}
            className="h-8 text-sm text-link underline underline-offset-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {contenido()}

      <DetalleDeEvento fila={elegida} onCerrar={() => setAbierto(null)} />
    </section>
  );
}
