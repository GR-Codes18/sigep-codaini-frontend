import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { aDetallePracticanteACargo } from '@/app/adaptadores';
import { ListaDeTareasDePracticante } from '@/app/practicantes/ListaDeTareasDePracticante';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { CabeceraDeDetalle } from '@/compartido/CabeceraDeDetalle';
import { Insignia } from '@/compartido/Insignia';
import { LineaTiempo } from '@/compartido/LineaTiempo';
import { ListaDeDefiniciones } from '@/compartido/ListaDeDefiniciones';
import { FilaDeLista, ListaDeFilas } from '@/compartido/ListaDeFilas';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, obtenerPracticanteACargo, type Entorno } from '@/services';
import { RUTA_PRACTICANTES_A_CARGO } from './rutas';

function VolverAlListado() {
  return (
    <Link
      to={RUTA_PRACTICANTES_A_CARGO}
      className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline"
    >
      <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
      Volver a practicantes a cargo
    </Link>
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
      <section className="space-y-3">
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
    <article className="space-y-3">
      <CabeceraDeDetalle
        volver={{ a: RUTA_PRACTICANTES_A_CARGO, etiqueta: 'Volver a practicantes a cargo' }}
        titulo={detalle.nombre}
        avatarDe={detalle.nombre}
        insignias={
          <Insignia
            tipo="practicante"
            estado={detalle.situacion === 'ACTIVO' ? 'ACTIVO' : 'ANTERIOR'}
          />
        }
        metadatos={`${detalle.especialidad} · Fin de práctica: ${detalle.fechaFinTexto}`}
      />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <PanelDeDatos titulo="Datos de contacto">
            <ListaDeDefiniciones
              disposicion="filas"
              items={[
                { etiqueta: 'Correo', valor: detalle.correo },
                { etiqueta: 'Celular', valor: detalle.celular },
                { etiqueta: 'Discord', valor: detalle.discord ?? '—' },
                { etiqueta: 'GitHub', valor: detalle.cuentaGithub ?? '—' },
              ]}
            />
          </PanelDeDatos>

          <PanelDeDatos titulo="Datos de la práctica">
            <ListaDeDefiniciones
              disposicion="filas"
              items={[
                { etiqueta: 'Especialidad', valor: detalle.especialidad },
                { etiqueta: 'Disponibilidad horaria', valor: detalle.disponibilidadTexto ?? '—' },
                { etiqueta: 'Fecha de fin de práctica', valor: detalle.fechaFinTexto },
              ]}
            />
          </PanelDeDatos>

          <PanelDeDatos titulo="Línea de tiempo">
            <LineaTiempo eventos={detalle.eventos} />
          </PanelDeDatos>
        </div>

        <div className="space-y-3 lg:col-span-3">
          <PanelDeDatos titulo="Proyectos">
            <ListaDeFilas>
              {detalle.proyectos.map((p, i) => (
                <FilaDeLista key={`${p.proyecto.id}-${i}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text">{p.proyecto.nombre}</span>
                    <span className="text-text-2">{p.proyecto.codigo}</span>
                  </div>
                  <p className="text-xs text-text-2 tabular-nums">
                    Alta: {p.altaTexto} · Baja: {p.bajaTexto ?? 'vigente'}
                  </p>
                </FilaDeLista>
              ))}
            </ListaDeFilas>
          </PanelDeDatos>

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
        </div>
      </div>
    </article>
  );
}
