import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  aIndicadores,
  type FilaIndicadorPracticante,
  type FilaIndicadorProyecto,
  type PracticantesPorAreaParaVista,
} from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { TablaCompacta, type Columna } from '@/compartido/TablaCompacta';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { GraficoPracticantesPorArea } from './GraficoPracticantesPorArea';
import { Label } from '@/compartido/ui/label';
import { Skeleton } from '@/compartido/ui/skeleton';
import type { Id } from '@/domain';
import { ENTORNO, listarProyectos, obtenerIndicadores, type Entorno } from '@/services';

const CLASE_SELECT =
  'h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus';

/** El periodo por defecto (§5.6) y los atajos que se ofrecen; el valor lo valida el servicio (de 1 a 365 días). */
const DIAS_PREDETERMINADOS = 30;
const ATAJOS_DE_PERIODO = [7, 30, 90, 365] as const;

function Enlace({ ruta, children }: { ruta: string | null; children: React.ReactNode }) {
  return ruta === null ? (
    <>{children}</>
  ) : (
    <Link to={ruta} className="font-medium text-link underline underline-offset-2">
      {children}
    </Link>
  );
}

const COLUMNAS_PROYECTO: Columna<FilaIndicadorProyecto>[] = [
  {
    clave: 'proyecto',
    encabezado: 'Proyecto',
    celda: (f) => (
      <div className="py-1">
        <Enlace ruta={f.rutaProyecto}>{f.proyecto.nombre}</Enlace>
        <p className="text-xs text-text-2">{f.proyecto.codigo}</p>
      </div>
    ),
  },
  { clave: 'avance', encabezado: 'Avance', className: 'whitespace-nowrap', celda: (f) => f.avance },
  {
    clave: 'terminadas',
    encabezado: 'Tareas terminadas',
    className: 'whitespace-nowrap',
    celda: (f) => f.tareasTerminadas,
  },
  {
    clave: 'ciclo',
    encabezado: 'Tiempo de ciclo',
    className: 'whitespace-nowrap',
    celda: (f) => f.tiempoCiclo,
  },
  {
    clave: 'espera',
    encabezado: 'Espera de supervisión',
    className: 'whitespace-nowrap',
    celda: (f) => f.esperaSupervision,
  },
  {
    clave: 'devolucion',
    encabezado: 'Tasa de devolución',
    className: 'whitespace-nowrap',
    celda: (f) => f.tasaDevolucion,
  },
  {
    clave: 'actividad',
    encabezado: 'Última actividad',
    className: 'whitespace-nowrap',
    celda: (f) => f.ultimaActividad,
  },
];

const COLUMNAS_PRACTICANTE: Columna<FilaIndicadorPracticante>[] = [
  {
    clave: 'practicante',
    encabezado: 'Practicante',
    celda: (f) => <Enlace ruta={f.rutaPracticante}>{f.nombre}</Enlace>,
  },
  {
    clave: 'terminadas',
    encabezado: 'Tareas terminadas',
    className: 'whitespace-nowrap',
    celda: (f) => f.tareasTerminadas,
  },
  {
    clave: 'ciclo',
    encabezado: 'Tiempo de ciclo',
    className: 'whitespace-nowrap',
    celda: (f) => f.tiempoCiclo,
  },
  {
    clave: 'devolucion',
    encabezado: 'Tasa de devolución',
    className: 'whitespace-nowrap',
    celda: (f) => f.tasaDevolucion,
  },
  { clave: 'carga', encabezado: 'Carga', className: 'whitespace-nowrap', celda: (f) => f.carga },
  {
    clave: 'actividad',
    encabezado: 'Última actividad',
    className: 'whitespace-nowrap',
    celda: (f) => f.ultimaActividad,
  },
];

const COLUMNAS_AREA: Columna<PracticantesPorAreaParaVista>[] = [
  { clave: 'area', encabezado: 'Área', celda: (f) => f.area },
  {
    clave: 'practicantes',
    encabezado: 'Practicantes',
    className: 'whitespace-nowrap tabular-nums',
    celda: (f) => f.practicantes,
  },
];

function Tarjeta({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <dt className="text-xs text-text-2">{etiqueta}</dt>
      <dd className="mt-1 text-xl font-semibold text-text tabular-nums">{valor}</dd>
    </div>
  );
}

/**
 * La pestaña «Indicadores» (§5.6): un periodo de 1 a 365 días en hora de Perú (30 por defecto) y un filtro por proyecto (todos por defecto);
 * tarjetas generales, una tabla por proyecto y una tabla por practicante. Lee con `obtenerIndicadores`: todos los números
 * (con «Sin datos» donde no hay muestras, nunca cero) los calcula `domain/`; la pantalla solo los presenta. Un periodo
 * inválido lo rechaza el servicio y su mensaje se muestra aquí.
 */
export function TabIndicadores({ idActor, entorno = ENTORNO }: { idActor: Id; entorno?: Entorno }) {
  const [dias, setDias] = useState<number>(DIAS_PREDETERMINADOS);
  const [texto, setTexto] = useState(String(DIAS_PREDETERMINADOS));
  const [idProyecto, setIdProyecto] = useState('');

  // Los proyectos que se ofrecen son los que entrega la consulta (el alcance no lo decide la pantalla).
  const cargarProyectos = useCallback(
    () => listarProyectos({ idActor }, entorno),
    [entorno, idActor],
  );
  const proyectos = useConsulta(cargarProyectos);

  const cargar = useCallback(
    () =>
      obtenerIndicadores(
        { idActor, dias, ...(idProyecto === '' ? {} : { id_proyecto: idProyecto }) },
        entorno,
      ),
    [entorno, idActor, dias, idProyecto],
  );
  const consulta = useConsulta(cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aIndicadores(consulta.valor)),
    [consulta.valor],
  );

  function aplicar(e: React.SyntheticEvent) {
    e.preventDefault();
    // El servicio valida el rango; un texto vacío o no numérico no es un periodo y no se envía.
    const numero = Number(texto);
    if (texto.trim() !== '' && Number.isFinite(numero)) setDias(numero);
  }

  function elegirAtajo(valor: number) {
    setTexto(String(valor));
    setDias(valor);
  }

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
        <div className="space-y-2" role="status" aria-label="Cargando los indicadores">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <p className="text-sm text-text-2" aria-label="Periodo">
          {datos.periodoTexto}
        </p>

        <section aria-label="Tarjetas generales" className="space-y-2">
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Tarjeta etiqueta="Tareas terminadas" valor={datos.tareasTerminadas} />
            <Tarjeta etiqueta="Tiempo promedio de ciclo" valor={datos.tiempoCiclo} />
            {/* El Supervisor ve tres tarjetas (§9.1.4): sin espera de supervisión, ni lo que viene de postulaciones. */}
            {datos.rol === 'ADMINISTRADOR' && (
              <Tarjeta etiqueta="Espera de supervisión" valor={datos.esperaSupervision} />
            )}
            <Tarjeta etiqueta="Tasa de devolución" valor={datos.tasaDevolucion} />
            {datos.postulacionesDecididas !== null && (
              <Tarjeta etiqueta="Postulaciones decididas" valor={datos.postulacionesDecididas} />
            )}
            {datos.puntajePorArea !== null && (
              <div className="rounded-xl border border-border bg-surface p-4">
                <dt className="text-xs text-text-2">Puntaje promedio por área</dt>
                <dd>
                  <ul
                    className="mt-1 space-y-0.5 text-sm text-text"
                    aria-label="Puntaje promedio por área"
                  >
                    {datos.puntajePorArea.map((a) => (
                      <li key={a.area} className="flex justify-between gap-3 tabular-nums">
                        <span>{a.area}</span>
                        <span className="font-medium">{a.puntaje}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Sin el área técnica no hay gráfico ni tabla de practicantes por área (§9.1.4). */}
        {datos.practicantesPorArea !== null && (
          <section aria-label="Practicantes por área" className="space-y-2">
            <h2 className="text-text">Practicantes por área</h2>
            <GraficoPracticantesPorArea datos={datos.practicantesPorArea} />
            <TablaCompacta
              columnas={COLUMNAS_AREA}
              filas={datos.practicantesPorArea}
              claveFila={(f) => f.area}
              vacio={{ titulo: 'No hay practicantes asignados a un área' }}
            />
          </section>
        )}

        <section aria-label="Indicadores por proyecto" className="space-y-2">
          <h2 className="text-text">Por proyecto</h2>
          <TablaCompacta
            columnas={COLUMNAS_PROYECTO}
            filas={datos.porProyecto}
            claveFila={(f) => f.proyecto.id}
            vacio={{ titulo: 'No hay proyectos en este reporte' }}
          />
        </section>

        <section aria-label="Indicadores por practicante" className="space-y-2">
          <h2 className="text-text">Por practicante</h2>
          <TablaCompacta
            columnas={COLUMNAS_PRACTICANTE}
            filas={datos.porPracticante}
            claveFila={(f) => f.id}
            vacio={{ titulo: 'No hay practicantes en este periodo' }}
          />
        </section>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <form onSubmit={aplicar} className="flex flex-wrap items-end gap-2" aria-label="Periodo">
          <div className="w-36 space-y-1">
            <Label htmlFor="periodo-dias">Periodo (días)</Label>
            <Input
              id="periodo-dias"
              type="number"
              inputMode="numeric"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">
            Aplicar
          </Button>
        </form>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Periodos frecuentes">
          {ATAJOS_DE_PERIODO.map((d) => (
            <Button
              key={d}
              type="button"
              size="sm"
              variant={dias === d ? 'default' : 'outline'}
              aria-pressed={dias === d}
              onClick={() => elegirAtajo(d)}
            >
              {d} días
            </Button>
          ))}
        </div>
        <div className="w-52 space-y-1">
          <Label htmlFor="indicadores-proyecto">Proyecto</Label>
          <select
            id="indicadores-proyecto"
            value={idProyecto}
            onChange={(e) => setIdProyecto(e.target.value)}
            className={CLASE_SELECT}
          >
            <option value="">Todos los proyectos</option>
            {(proyectos.valor?.proyectos ?? []).map((pr) => (
              <option key={pr.id} value={pr.id}>
                {pr.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {contenido()}
    </section>
  );
}
