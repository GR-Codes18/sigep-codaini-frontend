import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { aDashboardSupervisor } from '@/app/adaptadores';
import {
  Avance,
  EnlaceDeTarjeta,
  PorRevisar,
  Reuniones,
  Seccion,
  Tarjeta,
  Vacio,
} from '@/app/dashboard/BloquesDeDashboard';
import {
  ModalesDeInsight,
  TarjetaDeInsight,
  type AccionDeInsight,
} from '@/app/insights/AccionesDeInsight';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { Skeleton } from '@/compartido/ui/skeleton';
import { rutaDeReportes } from '@/paneles/administrador/reportes/rutas';
import { ENTORNO, obtenerDashboardSupervisor, type Entorno } from '@/services';
import { ENLACES_DASHBOARD_SUPERVISOR as ENLACES } from './enlaces';

/**
 * Dashboard del Supervisor (§9.1.5): la primera pantalla. **No calcula nada propio**: resume lo que entrega
 * `obtenerDashboardSupervisor`, que solo trae lo de sus proyectos, y solo lo presenta. Cuatro tarjetas compactas con
 * enlace al módulo con el filtro ya aplicado (la de tareas por supervisar en ámbar y la de vencidas en rojo, solo si
 * hay alguna), «Por revisar» (su cola de trabajo, a todo el ancho y en filas de una línea), hasta cinco alertas con sus
 * acciones y un enlace a Reportes, las próximas reuniones y el avance de sus proyectos. Sin proyectos, un solo mensaje.
 * `entorno` solo lo cambian las pruebas.
 */
export function PaginaDashboardSupervisor({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idActor = sesion?.id ?? null;
  const [accion, setAccion] = useState<AccionDeInsight | null>(null);

  const cargar = useCallback(
    () => obtenerDashboardSupervisor({ idActor: idActor ?? '' }, entorno),
    [entorno, idActor],
  );
  const consulta = useConsulta(idActor === null ? null : cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aDashboardSupervisor(consulta.valor)),
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
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </section>
    );
  }
  if (datos.vacio) {
    return (
      <section className="space-y-4">
        <h1 className="text-text">Dashboard</h1>
        <EstadoVacio titulo="El Administrador aún no te ha asignado proyectos" />
      </section>
    );
  }

  const t = datos.tarjetas;
  return (
    <section className="space-y-5">
      <h1 className="text-text">Dashboard</h1>

      {/* 4 en pantalla ancha, 2 en tablet y 1 en móvil; compactas, con la misma altura con o sin ámbar o rojo. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          compacta
          titulo="Tareas esperando mi supervisión"
          valor={t.tareasEsperando.total}
          enlace={ENLACES.tareasEsperando}
          tono={t.tareasEsperando.total > 0 ? 'ambar' : undefined}
          secundario={`${t.tareasEsperando.demoradas} con ${datos.plazoDemoraDias} días o más de espera`}
        />
        <Tarjeta
          compacta
          titulo="Mis proyectos activos"
          valor={t.proyectos.activos}
          enlace={ENLACES.proyectosActivos}
          secundario={
            <>
              <EnlaceDeTarjeta a={ENLACES.proyectosEnPausa}>{t.proyectos.enPausa}</EnlaceDeTarjeta>{' '}
              en pausa
            </>
          }
        />
        <Tarjeta
          compacta
          titulo="Practicantes a cargo"
          valor={t.practicantes.activos}
          enlace={ENLACES.practicantes}
          secundario={`${t.practicantes.sinTareasEnProgreso} sin tareas en progreso`}
        />
        <Tarjeta
          compacta
          titulo="Tareas vencidas"
          valor={t.tareasVencidas.total}
          enlace={ENLACES.tareasVencidas}
          tono={t.tareasVencidas.total > 0 ? 'rojo' : undefined}
          secundario={
            <>
              <EnlaceDeTarjeta a={ENLACES.tareasVencidasSinAsignar}>
                {t.tareasVencidas.sinAsignar}
              </EnlaceDeTarjeta>{' '}
              sin asignar
            </>
          }
        />
      </div>

      {/* Su cola de trabajo: lo más visible, a todo el ancho y en filas de una línea. */}
      <PorRevisar
        compacta
        filas={datos.porRevisar}
        vacio="No tienes tareas esperando tu supervisión"
      />

      {/* Dos columnas del mismo ancho: las alertas a la izquierda y, a la derecha, reuniones y avance. */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Seccion
          titulo="Alertas"
          accion={
            <Link
              to={rutaDeReportes('SUPERVISOR')}
              className="text-sm font-medium text-link underline underline-offset-2"
            >
              Ver todas en Reportes
            </Link>
          }
        >
          {datos.alertas.length === 0 ? (
            <Vacio compacta titulo="No hay alertas en tus proyectos" />
          ) : (
            <div className="space-y-2">
              {datos.alertas.map((i) => (
                <TarjetaDeInsight key={i.clave} insight={i} onAccion={setAccion} compacta />
              ))}
            </div>
          )}
        </Seccion>

        <div className="space-y-5">
          <Reuniones compacta filas={datos.reuniones} />
          <Avance compacta titulo="Avance de mis proyectos" filas={datos.avances} />
        </div>
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
