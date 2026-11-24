import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { aDetallePracticante, type ParticipacionParaVista } from '@/app/adaptadores';
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
import { ENTORNO, obtenerPracticante, type Entorno } from '@/services';
import { rutaDeDetalleDePostulacion } from '../postulaciones/rutas';
import { AccionesDePracticante } from './AccionesDePracticante';
import { RUTA_PRACTICANTES } from './rutas';

function VolverAlListado() {
  return (
    <Link
      to={RUTA_PRACTICANTES}
      className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline"
    >
      <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
      Volver a practicantes
    </Link>
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
    <PanelDeDatos titulo={titulo}>
      {proyectos.length === 0 ? (
        <p className="text-sm text-text-2">{vacio}</p>
      ) : (
        <ListaDeFilas>
          {proyectos.map((p, i) => (
            <FilaDeLista key={`${p.proyecto.id}-${i}`}>
              <div className="flex items-center gap-2">
                <span className="font-medium text-text">{p.proyecto.nombre}</span>
                <span className="text-text-2">{p.proyecto.codigo}</span>
                <Insignia tipo="proyecto" estado={p.estadoProyecto} />
              </div>
              <p className="text-xs text-text-2 tabular-nums">
                Alta: {p.altaTexto} · Baja: {p.bajaTexto ?? 'vigente'}
              </p>
            </FilaDeLista>
          ))}
        </ListaDeFilas>
      )}
    </PanelDeDatos>
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

  const detalle = aDetallePracticante(consulta.valor);

  return (
    <article className="space-y-3">
      <CabeceraDeDetalle
        volver={{ a: RUTA_PRACTICANTES, etiqueta: 'Volver a practicantes' }}
        titulo={detalle.nombre}
        avatarDe={detalle.nombre}
        insignias={
          <>
            <Insignia tipo="practicante" estado={detalle.estado} />
            {detalle.sinProyecto && <Insignia tipo="practicante" estado="SIN_PROYECTO" />}
          </>
        }
        metadatos={`${detalle.area} · ${detalle.especialidad} · Ingreso: ${detalle.fechaIngresoTexto}`}
        acciones={
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
        }
      />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <PanelDeDatos titulo="Datos personales">
            <ListaDeDefiniciones
              disposicion="filas"
              items={[
                { etiqueta: 'Correo', valor: detalle.correo },
                { etiqueta: 'Celular', valor: detalle.celular },
                { etiqueta: 'Discord', valor: detalle.discord ?? '—' },
                { etiqueta: 'GitHub', valor: detalle.cuentaGithub ?? '—' },
                {
                  etiqueta: 'Disponibilidad horaria',
                  valor:
                    detalle.disponibilidadHoraria === null
                      ? '—'
                      : `${detalle.disponibilidadHoraria} horas por semana`,
                },
                { etiqueta: 'Cuenta creada', valor: detalle.altaTexto },
              ]}
            />
            <p className="text-xs text-text-2">
              Los datos personales los edita cada practicante desde su perfil.
            </p>
          </PanelDeDatos>

          <PanelDeDatos titulo="Datos de la práctica">
            <ListaDeDefiniciones
              disposicion="filas"
              items={[
                { etiqueta: 'Área técnica', valor: detalle.area },
                { etiqueta: 'Especialidad', valor: detalle.especialidad },
                { etiqueta: 'Fecha de ingreso', valor: detalle.fechaIngresoTexto },
                {
                  etiqueta: 'Fecha de fin prevista',
                  valor: (
                    <>
                      {detalle.fechaFinPrevistaTexto}
                      {detalle.fin !== null && detalle.fin.situacion !== 'EN_CURSO' && (
                        <span className="ml-2 text-text-2">({detalle.fin.texto})</span>
                      )}
                    </>
                  ),
                },
                ...(detalle.postulacionOrigen
                  ? [
                      {
                        etiqueta: 'Postulación de origen',
                        valor: (
                          <Link
                            to={rutaDeDetalleDePostulacion(detalle.postulacionOrigen.id)}
                            className="font-medium text-link underline underline-offset-2"
                          >
                            Ver la postulación de {detalle.postulacionOrigen.nombre}
                          </Link>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </PanelDeDatos>

          <PanelDeDatos titulo="Línea de tiempo">
            <LineaTiempo eventos={detalle.eventos} />
          </PanelDeDatos>
        </div>

        <div className="space-y-3 lg:col-span-3">
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
        </div>
      </div>
    </article>
  );
}
