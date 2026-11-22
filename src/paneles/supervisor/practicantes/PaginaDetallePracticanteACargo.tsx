import { useCallback } from 'react';
import { Link, useParams } from 'react-router';
import { aDetallePracticanteACargo } from '@/app/adaptadores';
import { ListaDeTareasDePracticante } from '@/app/practicantes/ListaDeTareasDePracticante';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { Insignia } from '@/compartido/Insignia';
import { LineaTiempo } from '@/compartido/LineaTiempo';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, obtenerPracticanteACargo, type Entorno } from '@/services';
import { RUTA_PRACTICANTES_A_CARGO } from './rutas';

function VolverAlListado() {
  return (
    <Link
      to={RUTA_PRACTICANTES_A_CARGO}
      className="text-sm font-medium text-link underline underline-offset-2"
    >
      Volver a practicantes a cargo
    </Link>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-text-2">{etiqueta}</dt>
      <dd className="text-text">{children}</dd>
    </div>
  );
}

/**
 * Detalle de un practicante a cargo (§9.1.2), **de solo lectura**: contacto, especialidad, disponibilidad horaria, fecha
 * de fin de práctica, sus proyectos con alta y baja, sus tareas y su actividad, todo recortado a los proyectos del
 * Supervisor. Lee con `obtenerPracticanteACargo`, que no entrega el área técnica ni la postulación de origen y rechaza a
 * quien no es de sus proyectos. Sin acciones: no asigna, no finaliza, no reactiva ni restablece contraseñas.
 * `entorno` solo lo cambian las pruebas.
 */
export function PaginaDetallePracticanteACargo({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { idPracticante } = useParams();
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;

  const cargar = useCallback(
    () =>
      obtenerPracticanteACargo(
        { idActor: idUsuario ?? '', idPracticante: idPracticante ?? '' },
        entorno,
      ),
    [entorno, idUsuario, idPracticante],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);

  if (idUsuario === null) return null;

  if (consulta.error) {
    return (
      <section className="space-y-4">
        <VolverAlListado />
        <p role="alert" className="text-sm text-danger-text">
          {consulta.error}
        </p>
      </section>
    );
  }
  if (consulta.valor === null) {
    return (
      <div className="space-y-2" role="status" aria-label="Cargando el practicante">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const detalle = aDetallePracticanteACargo(consulta.valor);

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <VolverAlListado />
        <h1 className="text-text">{detalle.nombre}</h1>
        <Insignia
          tipo="practicante"
          estado={detalle.situacion === 'ACTIVO' ? 'ACTIVO' : 'ANTERIOR'}
        />
      </header>

      <section aria-label="Datos de contacto" className="space-y-2">
        <h2 className="text-text">Datos de contacto</h2>
        <dl className="grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
          <Dato etiqueta="Correo">{detalle.correo}</Dato>
          <Dato etiqueta="Celular">{detalle.celular}</Dato>
          <Dato etiqueta="Discord">{detalle.discord ?? '—'}</Dato>
          <Dato etiqueta="GitHub">{detalle.cuentaGithub ?? '—'}</Dato>
        </dl>
      </section>

      <section aria-label="Datos de la práctica" className="space-y-2">
        <h2 className="text-text">Datos de la práctica</h2>
        <dl className="grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
          <Dato etiqueta="Especialidad">{detalle.especialidad}</Dato>
          <Dato etiqueta="Disponibilidad horaria">{detalle.disponibilidadTexto ?? '—'}</Dato>
          <Dato etiqueta="Fecha de fin de práctica">{detalle.fechaFinTexto}</Dato>
        </dl>
      </section>

      <section aria-label="Proyectos" className="space-y-2">
        <h2 className="text-text">Proyectos</h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {detalle.proyectos.map((p, i) => (
            <li
              key={`${p.proyecto.id}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-text">{p.proyecto.nombre}</span>
                <span className="text-text-2">{p.proyecto.codigo}</span>
              </div>
              <p className="text-text-2 tabular-nums">
                Alta: {p.altaTexto} · Baja: {p.bajaTexto ?? 'vigente'}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <ListaDeTareasDePracticante
        titulo="Tareas actuales"
        vacio="No tiene tareas en curso en tus proyectos."
        tareas={detalle.tareasActuales}
      />
      <ListaDeTareasDePracticante
        titulo="Tareas completadas"
        vacio="Aún no tiene tareas completadas en tus proyectos."
        tareas={detalle.tareasCompletadas}
      />

      <section aria-label="Línea de tiempo" className="space-y-3">
        <h2 className="text-text">Línea de tiempo</h2>
        <LineaTiempo eventos={detalle.eventos} />
      </section>
    </article>
  );
}
