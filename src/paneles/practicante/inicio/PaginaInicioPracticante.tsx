import { useCallback, useMemo } from 'react';
import { aInicioPracticante } from '@/app/adaptadores';
import { Reuniones, Tarjeta } from '@/app/dashboard/BloquesDeDashboard';
import { MisTareasEnCurso, PullRequestsPorAtender } from '@/app/dashboard/BloquesDelPracticante';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { CabeceraDePagina } from '@/compartido/CabeceraDePagina';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, obtenerInicioPracticante, type Entorno } from '@/services';
import { RUTA_MIS_PROYECTOS_PRACTICANTE } from '../proyectos/rutas';
import { ENLACES_INICIO_PRACTICANTE as ENLACES } from './enlaces';

/**
 * Inicio del Practicante (§9.2.3): su primera pantalla. **No calcula nada propio**: resume lo que entrega
 * `obtenerInicioPracticante`, que solo trae lo suyo, y solo lo presenta. Cuatro tarjetas compactas (solo «Devueltas» se
 * pinta, en rojo, y solo si hay alguna), sus tareas en curso, los Pull Requests por atender y las próximas reuniones. Sin
 * botones de acción: todo clic lleva al detalle de la tarea o al proyecto. Sin ningún proyecto vigente, un solo mensaje.
 * `entorno` solo lo cambian las pruebas.
 */
export function PaginaInicioPracticante({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idActor = sesion?.id ?? null;

  const cargar = useCallback(
    () => obtenerInicioPracticante({ idActor: idActor ?? '' }, entorno),
    [entorno, idActor],
  );
  const consulta = useConsulta(idActor === null ? null : cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aInicioPracticante(consulta.valor)),
    [consulta.valor],
  );

  if (idActor === null) return null;

  if (consulta.error) {
    return (
      <section className="space-y-3">
        <CabeceraDePagina titulo="Inicio" />
        <p role="alert" className="text-sm text-danger-text">
          {consulta.error}
        </p>
      </section>
    );
  }
  if (datos === null) {
    return (
      <section className="space-y-3">
        <CabeceraDePagina titulo="Inicio" />
        <div className="space-y-2" role="status" aria-label="Cargando el inicio">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </section>
    );
  }
  if (datos.vacio) {
    return (
      <section className="space-y-3">
        <CabeceraDePagina titulo="Inicio" />
        <EstadoVacio
          titulo="Aún no tienes proyectos asignados"
          descripcion="El Administrador te asignará uno."
        />
      </section>
    );
  }

  const t = datos.tarjetas;
  return (
    <section className="space-y-3">
      <CabeceraDePagina
        titulo="Inicio"
        subtitulo="Tus tareas en curso, los Pull Requests por atender y las próximas reuniones."
      />

      {/* 4 en pantalla ancha, 2 en tablet y 1 en móvil; compactas, con la misma altura con o sin rojo. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          compacta
          titulo="Mis tareas en progreso"
          valor={t.enProgreso}
          enlace={ENLACES.enProgreso}
          secundario="Tu carga actual"
        />
        <Tarjeta
          compacta
          titulo="Devueltas con observaciones"
          valor={t.devueltas}
          enlace={ENLACES.devueltas}
          tono={t.devueltas > 0 ? 'rojo' : undefined}
          secundario="Con observaciones del supervisor"
        />
        <Tarjeta
          compacta
          titulo="Esperando supervisión"
          valor={t.esperandoSupervision}
          enlace={ENLACES.esperandoSupervision}
          secundario="En revisión del supervisor"
        />
        <Tarjeta
          compacta
          titulo="Disponibles para tomar"
          valor={t.disponibles}
          enlace={ENLACES.disponibles}
          secundario="En tus proyectos activos"
        />
      </div>

      <MisTareasEnCurso
        filas={datos.enCurso}
        hayDisponibles={t.disponibles > 0}
        rutaDisponibles={RUTA_MIS_PROYECTOS_PRACTICANTE}
      />

      {/* Cada bloque con la altura de su contenido; una columna en móvil. */}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <PullRequestsPorAtender filas={datos.pullRequests} />
        <Reuniones compacta filas={datos.reuniones} />
      </div>
    </section>
  );
}
