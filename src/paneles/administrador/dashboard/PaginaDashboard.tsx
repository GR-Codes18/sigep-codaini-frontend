import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  aDashboard,
  type DashboardParaVista,
  type FilaPostulacionDashboard,
} from '@/app/adaptadores';
import {
  ModalesDeInsight,
  TarjetaDeInsight,
  type AccionDeInsight,
} from '@/app/insights/AccionesDeInsight';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { Insignia } from '@/compartido/Insignia';
import { TablaCompacta, type Columna } from '@/compartido/TablaCompacta';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, obtenerDashboardAdministrador, type Entorno } from '@/services';
import { GraficoPracticantesPorArea } from '../reportes/GraficoPracticantesPorArea';
import { ENLACES_DASHBOARD } from './enlaces';

// Nombre, área y especialidad, puntaje y detalle: con la marca bajo el nombre y el área junto a la especialidad la
// tabla cabe en media pantalla.
const COLUMNAS_POSTULACION: Columna<FilaPostulacionDashboard>[] = [
  {
    clave: 'nombre',
    encabezado: 'Nombre',
    celda: (f) => (
      <div className="space-y-0.5 py-1">
        <p className="text-text">{f.nombre}</p>
        {f.requiereRevision && <Insignia tipo="marca" estado="REVISION_MANUAL" />}
      </div>
    ),
  },
  {
    clave: 'area',
    encabezado: 'Área y especialidad',
    celda: (f) => (
      <div className="py-1">
        <p className="text-text">{f.area}</p>
        <p className="text-xs text-text-2">{f.especialidad}</p>
      </div>
    ),
  },
  {
    clave: 'puntaje',
    encabezado: 'Puntaje',
    className: 'whitespace-nowrap',
    celda: (f) => f.puntajeTexto,
  },
  {
    clave: 'detalle',
    encabezado: 'Detalle',
    className: 'whitespace-nowrap',
    celda: (f) =>
      f.rutaDetalle === null ? null : (
        <Link
          to={f.rutaDetalle}
          aria-label={`Ver detalle: ${f.nombre}`}
          className="font-medium text-link underline underline-offset-2"
        >
          Ver detalle
        </Link>
      ),
  },
];

function EnlaceDeTarjeta({ a, children }: { a: string; children: React.ReactNode }) {
  return (
    <Link to={a} className="font-medium text-link underline underline-offset-2">
      {children}
    </Link>
  );
}

/** Una tarjeta de métrica (§5.9): la cifra principal enlaza a su módulo con el filtro ya aplicado. */
function Tarjeta({
  titulo,
  valor,
  enlace,
  secundario,
}: {
  titulo: string;
  valor: number;
  enlace: string;
  secundario: React.ReactNode;
}) {
  return (
    <article
      aria-label={titulo}
      className="space-y-1 rounded-xl border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-medium text-text-2">{titulo}</h2>
      <p className="text-3xl font-semibold text-text tabular-nums">
        <Link
          to={enlace}
          aria-label={`${titulo}: ${valor}`}
          className="underline-offset-4 hover:underline"
        >
          {valor}
        </Link>
      </p>
      <p className="text-sm text-text-2">{secundario}</p>
    </article>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="space-y-2">
      <h2 className="text-text">{titulo}</h2>
      {children}
    </section>
  );
}

function PorRevisar({ datos }: { datos: DashboardParaVista }) {
  return (
    <Seccion titulo="Por revisar">
      {datos.porRevisar.length === 0 ? (
        <EstadoVacio titulo="No hay tareas esperando supervisión" />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {datos.porRevisar.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <div>
                {t.rutaDetalle === null ? (
                  <span className="font-medium text-text">{t.titulo}</span>
                ) : (
                  <Link
                    to={t.rutaDetalle}
                    className="font-medium text-link underline underline-offset-2"
                  >
                    {t.titulo}
                  </Link>
                )}
                <p className="text-xs text-text-2">
                  {t.idLegible} · {t.proyecto.nombre}
                  {t.responsable !== null && <> · {t.responsable}</>}
                </p>
              </div>
              <span className="text-xs text-text-2">{t.esperaTexto}</span>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

function Reuniones({ datos }: { datos: DashboardParaVista }) {
  return (
    <Seccion titulo="Próximas reuniones">
      {datos.reuniones.length === 0 ? (
        <EstadoVacio titulo="No hay proyectos sin finalizar" />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {datos.reuniones.map((r) => (
            <li
              key={r.proyecto.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
            >
              <div>
                {r.rutaProyecto === null ? (
                  <span className="font-medium text-text">{r.proyecto.nombre}</span>
                ) : (
                  <Link
                    to={r.rutaProyecto}
                    className="font-medium text-link underline underline-offset-2"
                  >
                    {r.proyecto.nombre}
                  </Link>
                )}
                <p className="text-xs text-text-2">Reunión semanal: {r.reunionTexto}</p>
              </div>
              <span className="text-xs text-text tabular-nums">{r.proximaTexto}</span>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

function Avance({ datos }: { datos: DashboardParaVista }) {
  return (
    <Seccion titulo="Avance de los proyectos">
      {datos.avances.length === 0 ? (
        <EstadoVacio titulo="No hay proyectos sin finalizar" />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {datos.avances.map((a) => (
            <li key={a.proyecto.id} className="space-y-1 px-4 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {a.rutaProyecto === null ? (
                  <span className="font-medium text-text">{a.proyecto.nombre}</span>
                ) : (
                  <Link
                    to={a.rutaProyecto}
                    className="font-medium text-link underline underline-offset-2"
                  >
                    {a.proyecto.nombre}
                  </Link>
                )}
                <span className="text-xs text-text-2 tabular-nums">{a.avanceTexto}</span>
              </div>
              <div
                role="progressbar"
                aria-label={`Avance de ${a.proyecto.nombre}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={a.porcentaje}
                className="h-1.5 overflow-hidden rounded-full bg-surface-2"
              >
                <div className="h-full bg-primary" style={{ width: `${a.porcentaje}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

/**
 * Dashboard del Administrador (§5.9): la primera pantalla. **No calcula nada propio**: resume lo que entrega
 * `obtenerDashboardAdministrador` (una sola fuente de alertas y de números) y solo lo presenta. Cuatro tarjetas con enlace
 * al módulo con el filtro ya aplicado, las cinco postulaciones pendientes de mayor puntaje, hasta cinco alertas con sus
 * acciones, practicantes por área y, juntos, las tareas por revisar, las próximas reuniones y el avance. `entorno` solo
 * lo cambian las pruebas.
 */
export function PaginaDashboard({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idActor = sesion?.id ?? null;
  const [accion, setAccion] = useState<AccionDeInsight | null>(null);

  const cargar = useCallback(
    () => obtenerDashboardAdministrador({ idActor: idActor ?? '' }, entorno),
    [entorno, idActor],
  );
  const consulta = useConsulta(idActor === null ? null : cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aDashboard(consulta.valor)),
    [consulta.valor],
  );

  if (idActor === null) return null;

  if (consulta.error) {
    return (
      <section className="space-y-4">
        <h1 className="text-text">Dashboard</h1>
        <p role="alert" className="text-sm text-danger-text">
          {consulta.error}
        </p>
      </section>
    );
  }
  if (datos === null) {
    return (
      <section className="space-y-4">
        <h1 className="text-text">Dashboard</h1>
        <div className="space-y-2" role="status" aria-label="Cargando el dashboard">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </section>
    );
  }

  const t = datos.tarjetas;
  return (
    <section className="space-y-6">
      <h1 className="text-text">Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          titulo="Postulaciones pendientes"
          valor={t.postulaciones.pendientes}
          enlace={ENLACES_DASHBOARD.postulacionesPendientes}
          secundario={
            <>
              <EnlaceDeTarjeta a={ENLACES_DASHBOARD.postulacionesRequierenRevision}>
                {t.postulaciones.requierenRevision}
              </EnlaceDeTarjeta>{' '}
              requieren revisión manual
            </>
          }
        />
        <Tarjeta
          titulo="Proyectos activos"
          valor={t.proyectos.activos}
          enlace={ENLACES_DASHBOARD.proyectosActivos}
          secundario={
            <>
              <EnlaceDeTarjeta a={ENLACES_DASHBOARD.proyectosEnPausa}>
                {t.proyectos.enPausa}
              </EnlaceDeTarjeta>{' '}
              en pausa
            </>
          }
        />
        <Tarjeta
          titulo="Practicantes activos"
          valor={t.practicantes.activos}
          enlace={ENLACES_DASHBOARD.practicantesActivos}
          secundario={
            <>
              <EnlaceDeTarjeta a={ENLACES_DASHBOARD.practicantesSinProyecto}>
                {t.practicantes.sinProyecto}
              </EnlaceDeTarjeta>{' '}
              sin proyecto
            </>
          }
        />
        <Tarjeta
          titulo="Esperando supervisión"
          valor={t.tareasEsperando.total}
          enlace={ENLACES_DASHBOARD.tareasEsperando}
          secundario={`${t.tareasEsperando.demoradas} con ${datos.plazoDemoraDias} días o más de espera`}
        />
      </div>

      {/* Dos columnas: a la izquierda lo que se revisa (postulaciones, tareas, reuniones) y a la derecha las alertas, que son
          lo más alto. En pantallas angostas todo va en una columna, con las alertas justo después de las postulaciones. */}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="xl:col-start-1">
          <Seccion titulo="Postulaciones pendientes">
            <TablaCompacta
              columnas={COLUMNAS_POSTULACION}
              filas={datos.postulaciones}
              claveFila={(f) => f.id}
              vacio={{ titulo: 'No hay postulaciones pendientes' }}
            />
          </Seccion>
        </div>

        <div className="xl:col-start-2 xl:row-span-3 xl:row-start-1">
          <Seccion titulo="Alertas">
            {datos.alertas.length === 0 ? (
              <EstadoVacio
                titulo="No hay alertas"
                descripcion="Las alertas aparecen solas cuando una regla se cumple."
              />
            ) : (
              <div className="space-y-2">
                {datos.alertas.map((i) => (
                  <TarjetaDeInsight key={i.clave} insight={i} onAccion={setAccion} compacta />
                ))}
              </div>
            )}
          </Seccion>
        </div>

        <div className="xl:col-start-1">
          <PorRevisar datos={datos} />
        </div>
        <div className="xl:col-start-1">
          <Reuniones datos={datos} />
        </div>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <Seccion titulo="Practicantes por área">
          <div className="space-y-3">
            <GraficoPracticantesPorArea datos={datos.practicantesPorArea} />
            <TablaCompacta
              columnas={[
                { clave: 'area', encabezado: 'Área', celda: (f) => f.area },
                {
                  clave: 'practicantes',
                  encabezado: 'Practicantes',
                  className: 'whitespace-nowrap tabular-nums',
                  celda: (f) => f.practicantes,
                },
              ]}
              filas={datos.practicantesPorArea}
              claveFila={(f) => f.area}
              vacio={{ titulo: 'No hay practicantes asignados a un área' }}
            />
          </div>
        </Seccion>
        <Avance datos={datos} />
      </div>

      <ModalesDeInsight
        accion={accion}
        onCerrar={() => setAccion(null)}
        idActor={idActor}
        entorno={entorno}
      />
    </section>
  );
}
