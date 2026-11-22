import { useCallback } from 'react';
import { Link, useParams } from 'react-router';
import { aDetallePracticante, type ParticipacionParaVista } from '@/app/adaptadores';
import { ListaDeTareasDePracticante } from '@/app/practicantes/ListaDeTareasDePracticante';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { Insignia } from '@/compartido/Insignia';
import { LineaTiempo } from '@/compartido/LineaTiempo';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, obtenerPracticante, type Entorno } from '@/services';
import { rutaDeDetalleDePostulacion } from '../postulaciones/rutas';
import { AccionesDePracticante } from './AccionesDePracticante';
import { RUTA_PRACTICANTES } from './rutas';

function VolverAlListado() {
  return (
    <Link
      to={RUTA_PRACTICANTES}
      className="text-sm font-medium text-link underline underline-offset-2"
    >
      Volver a practicantes
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

function ListaDeProyectos({
  titulo,
  vacio,
  proyectos,
}: {
  titulo: string;
  vacio: string;
  proyectos: ParticipacionParaVista[];
}) {
  return (
    <section aria-label={titulo} className="space-y-2">
      <h2 className="text-text">{titulo}</h2>
      {proyectos.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-2">
          {vacio}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {proyectos.map((p, i) => (
            <li
              key={`${p.proyecto.id}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-text">{p.proyecto.nombre}</span>
                <span className="text-text-2">{p.proyecto.codigo}</span>
                <Insignia tipo="proyecto" estado={p.estadoProyecto} />
              </div>
              <p className="text-text-2 tabular-nums">
                Alta: {p.altaTexto} · Baja: {p.bajaTexto ?? 'vigente'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Detalle de un practicante (§5.2): datos personales de solo lectura, datos de la práctica, proyectos actuales y
 * anteriores, tareas, línea de tiempo y enlace a su postulación de origen. Lee con `obtenerPracticante`; no decide
 * nada. `entorno` solo lo cambian las pruebas.
 */
export function PaginaDetallePracticante({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { idPracticante } = useParams();
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;

  const cargar = useCallback(
    () =>
      obtenerPracticante({ idActor: idUsuario ?? '', idPracticante: idPracticante ?? '' }, entorno),
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

  const detalle = aDetallePracticante(consulta.valor);

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <VolverAlListado />
        <h1 className="text-text">{detalle.nombre}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Insignia tipo="practicante" estado={detalle.estado} />
          {detalle.sinProyecto && <Insignia tipo="practicante" estado="SIN_PROYECTO" />}
        </div>
        <AccionesDePracticante
          idActor={idUsuario}
          practicante={{
            id: detalle.id,
            nombre: detalle.nombre,
            correo: detalle.correo,
            idEspecialidad: detalle.idEspecialidad,
            especialidad: detalle.especialidad,
            fechaIngreso: detalle.fechaIngreso,
            fechaFinPrevista: detalle.fechaFinPrevista,
          }}
          acciones={detalle.acciones}
          tareasALiberar={detalle.tareasALiberar}
          entorno={entorno}
        />
        {detalle.postulacionOrigen && (
          <p className="text-sm text-text-2">
            Postulación de origen:{' '}
            <Link
              to={rutaDeDetalleDePostulacion(detalle.postulacionOrigen.id)}
              className="font-medium text-link underline underline-offset-2"
            >
              Ver la postulación de {detalle.postulacionOrigen.nombre}
            </Link>
          </p>
        )}
      </header>

      <section aria-label="Datos personales" className="space-y-2">
        <h2 className="text-text">Datos personales</h2>
        <dl className="grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
          <Dato etiqueta="Correo">{detalle.correo}</Dato>
          <Dato etiqueta="Celular">{detalle.celular}</Dato>
          <Dato etiqueta="Discord">{detalle.discord ?? '—'}</Dato>
          <Dato etiqueta="GitHub">{detalle.cuentaGithub ?? '—'}</Dato>
          <Dato etiqueta="Disponibilidad horaria">
            {detalle.disponibilidadHoraria === null
              ? '—'
              : `${detalle.disponibilidadHoraria} horas por semana`}
          </Dato>
          <Dato etiqueta="Cuenta creada">{detalle.altaTexto}</Dato>
        </dl>
        <p className="text-xs text-text-2">
          Los datos personales los edita cada practicante desde su perfil.
        </p>
      </section>

      <section aria-label="Datos de la práctica" className="space-y-2">
        <h2 className="text-text">Datos de la práctica</h2>
        <dl className="grid gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
          <Dato etiqueta="Área técnica">{detalle.area}</Dato>
          <Dato etiqueta="Especialidad">{detalle.especialidad}</Dato>
          <Dato etiqueta="Fecha de ingreso">{detalle.fechaIngresoTexto}</Dato>
          <Dato etiqueta="Fecha de fin prevista">
            {detalle.fechaFinPrevistaTexto}
            {detalle.fin !== null && detalle.fin.situacion !== 'EN_CURSO' && (
              <span className="ml-2 text-text-2">({detalle.fin.texto})</span>
            )}
          </Dato>
        </dl>
      </section>

      <ListaDeProyectos
        titulo="Proyectos actuales"
        vacio="No tiene un proyecto vigente."
        proyectos={detalle.proyectosActuales}
      />
      <ListaDeProyectos
        titulo="Proyectos anteriores"
        vacio="Aún no tiene proyectos anteriores."
        proyectos={detalle.proyectosAnteriores}
      />
      <ListaDeTareasDePracticante
        titulo="Tareas actuales"
        vacio="No tiene tareas en curso."
        tareas={detalle.tareasActuales}
      />
      <ListaDeTareasDePracticante
        titulo="Tareas completadas"
        vacio="Aún no tiene tareas completadas."
        tareas={detalle.tareasCompletadas}
      />

      <section aria-label="Línea de tiempo" className="space-y-3">
        <h2 className="text-text">Línea de tiempo</h2>
        <LineaTiempo eventos={detalle.eventos} />
      </section>
    </article>
  );
}
