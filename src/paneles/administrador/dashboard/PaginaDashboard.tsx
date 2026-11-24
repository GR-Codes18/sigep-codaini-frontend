import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { aDashboard, type FilaPostulacionDashboard } from '@/app/adaptadores';
import {
  Vacio,
  Avance,
  EnlaceDeTarjeta,
  PorRevisar,
  Reuniones,
  Seccion,
  Tarjeta,
} from '@/app/dashboard/BloquesDeDashboard';
import {
  ModalesDeInsight,
  TarjetaDeInsight,
  type AccionDeInsight,
} from '@/app/insights/AccionesDeInsight';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { Insignia } from '@/compartido/Insignia';
import { CabeceraDePagina } from '@/compartido/CabeceraDePagina';
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
      <section className="space-y-3">
        <CabeceraDePagina titulo="Dashboard" />
        <p role="alert" className="text-sm text-danger-text">
          {consulta.error}
        </p>
      </section>
    );
  }
  if (datos === null) {
    return (
      <section className="space-y-3">
        <CabeceraDePagina titulo="Dashboard" />
        <div className="space-y-2" role="status" aria-label="Cargando el dashboard">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </section>
    );
  }

  const t = datos.tarjetas;
  return (
    <section className="space-y-3">
      <CabeceraDePagina
        titulo="Dashboard"
        subtitulo="Lo que necesita tu atención hoy: postulaciones, tareas por revisar y alertas."
      />

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

      {/* Dos columnas independientes: a la izquierda lo que se revisa (postulaciones, tareas, reuniones) y a la derecha las
          alertas. En pantallas angostas todo va en una columna. */}
      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
        <div className="space-y-3">
          <Seccion titulo="Postulaciones pendientes" sinRelleno>
            <TablaCompacta
              sinCaja
              columnas={COLUMNAS_POSTULACION}
              filas={datos.postulaciones}
              claveFila={(f) => f.id}
              vacio={{ titulo: 'No hay postulaciones pendientes' }}
            />
          </Seccion>
          <PorRevisar filas={datos.porRevisar} vacio="No hay tareas esperando supervisión" />
          <Reuniones filas={datos.reuniones} />
        </div>

        <div className="space-y-3">
          <Seccion titulo="Alertas">
            {datos.alertas.length === 0 ? (
              <Vacio
                titulo="No hay alertas"
                descripcion="Las alertas aparecen solas cuando una regla se cumple."
              />
            ) : (
              <div className="divide-y divide-border">
                {datos.alertas.map((i) => (
                  <TarjetaDeInsight key={i.clave} insight={i} onAccion={setAccion} compacta />
                ))}
              </div>
            )}
          </Seccion>
          <Avance filas={datos.avances} />
        </div>
      </div>

      <Seccion titulo="Practicantes por área">
        <GraficoPracticantesPorArea datos={datos.practicantesPorArea} />
        <div className="-mx-3 -mb-3">
          <TablaCompacta
            sinCaja
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

      <ModalesDeInsight
        accion={accion}
        onCerrar={() => setAccion(null)}
        idActor={idActor}
        entorno={entorno}
      />
    </section>
  );
}
