import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import {
  aDetalleSupervisor,
  type ProyectoACargoParaVista,
  type TareaPorRevisarParaVista,
} from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { CabeceraDeDetalle } from '@/compartido/CabeceraDeDetalle';
import { Insignia } from '@/compartido/Insignia';
import { LineaTiempo } from '@/compartido/LineaTiempo';
import { ListaDeDefiniciones } from '@/compartido/ListaDeDefiniciones';
import { FilaDeLista, ListaDeFilas } from '@/compartido/ListaDeFilas';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, obtenerSupervisor, type Entorno } from '@/services';
import { AccionesDeSupervisor } from './AccionesDeSupervisor';
import { RUTA_SUPERVISORES } from './rutas';

function VolverAlListado() {
  return (
    <Link
      to={RUTA_SUPERVISORES}
      className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline"
    >
      <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
      Volver a supervisores
    </Link>
  );
}

const plural = (n: number, singular: string, plurales: string) =>
  `${n} ${n === 1 ? singular : plurales}`;

function ProyectosACargo({ proyectos }: { proyectos: ProyectoACargoParaVista[] }) {
  return (
    <PanelDeDatos titulo="Proyectos a cargo">
      {proyectos.length === 0 ? (
        <p className="text-sm text-text-2">No tiene proyectos a cargo.</p>
      ) : (
        <ListaDeFilas>
          {proyectos.map((p) => (
            <FilaDeLista key={p.proyecto.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium text-text">{p.proyecto.nombre}</span>
                <span className="text-text-2">{p.proyecto.codigo}</span>
                <Insignia tipo="proyecto" estado={p.estado} />
              </div>
              <p className="text-xs text-text-2">
                Reunión semanal: {p.reunionTexto} ·{' '}
                {plural(p.practicantesActivos, 'practicante', 'practicantes')}
              </p>
            </FilaDeLista>
          ))}
        </ListaDeFilas>
      )}
    </PanelDeDatos>
  );
}

function TareasPorRevisar({ tareas }: { tareas: TareaPorRevisarParaVista[] }) {
  return (
    <PanelDeDatos titulo="Tareas por revisar">
      {tareas.length === 0 ? (
        <p className="text-sm text-text-2">No tiene tareas esperando su aprobación.</p>
      ) : (
        <ListaDeFilas>
          {tareas.map(({ tarea, proyecto, diasEsperando }) => (
            <FilaDeLista key={tarea.id}>
              <div className="min-w-0">
                <p className="text-text">
                  <span className="font-medium">{tarea.idLegible}</span> · {tarea.titulo}
                </p>
                <p className="text-xs text-text-2">{proyecto.nombre}</p>
              </div>
              <p className="text-xs text-text-2 tabular-nums">
                {diasEsperando === null
                  ? 'Esperando'
                  : diasEsperando === 0
                    ? 'Esperando desde hoy'
                    : `Esperando hace ${plural(diasEsperando, 'día', 'días')}`}
              </p>
            </FilaDeLista>
          ))}
        </ListaDeFilas>
      )}
    </PanelDeDatos>
  );
}

/**
 * Detalle de un supervisor (§5.3): datos de contacto de solo lectura, proyectos a cargo con su reunión semanal y cuántos
 * practicantes tienen, tareas que esperan su aprobación y desde hace cuántos días, proyectos anteriores y línea de tiempo.
 * Lee con `obtenerSupervisor`; no decide nada. `entorno` solo lo cambian las pruebas.
 */
export function PaginaDetalleSupervisor({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { idSupervisor } = useParams();
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;

  const cargar = useCallback(
    () =>
      obtenerSupervisor({ idActor: idUsuario ?? '', idSupervisor: idSupervisor ?? '' }, entorno),
    [entorno, idUsuario, idSupervisor],
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
      <div className="space-y-2" role="status" aria-label="Cargando el supervisor">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const detalle = aDetalleSupervisor(consulta.valor);

  return (
    <article className="space-y-3">
      <CabeceraDeDetalle
        volver={{ a: RUTA_SUPERVISORES, etiqueta: 'Volver a supervisores' }}
        titulo={detalle.nombre}
        avatarDe={detalle.nombre}
        insignias={<Insignia tipo="supervisor" estado={detalle.estado} />}
        metadatos={`${plural(detalle.proyectosACargo.length, 'proyecto a cargo', 'proyectos a cargo')} · Cuenta creada: ${detalle.altaTexto}`}
        acciones={
          <AccionesDeSupervisor
            idActor={idUsuario}
            supervisor={{ id: detalle.id, nombre: detalle.nombre, correo: detalle.correo }}
            acciones={detalle.acciones}
            proyectosPendientes={detalle.proyectosPendientes}
            proyectosACargo={detalle.proyectosACargo}
            supervisoresDestino={detalle.supervisoresDestino}
            entorno={entorno}
          />
        }
      />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-2">
          <PanelDeDatos titulo="Datos de contacto">
            <ListaDeDefiniciones
              disposicion="filas"
              items={[
                { etiqueta: 'Correo institucional', valor: detalle.correo },
                { etiqueta: 'Celular', valor: detalle.celular },
                { etiqueta: 'Discord', valor: detalle.discord ?? '—' },
                { etiqueta: 'GitHub', valor: detalle.cuentaGithub ?? '—' },
                { etiqueta: 'Cuenta creada', valor: detalle.altaTexto },
              ]}
            />
          </PanelDeDatos>

          <PanelDeDatos titulo="Línea de tiempo">
            <LineaTiempo eventos={detalle.eventos} />
          </PanelDeDatos>
        </div>

        <div className="space-y-3 lg:col-span-3">
          <ProyectosACargo proyectos={detalle.proyectosACargo} />
          <TareasPorRevisar tareas={detalle.tareasPorRevisar} />

          <PanelDeDatos titulo="Proyectos anteriores">
            {detalle.proyectosAnteriores.length === 0 ? (
              <p className="text-sm text-text-2">Aún no tiene proyectos anteriores.</p>
            ) : (
              <ListaDeFilas>
                {detalle.proyectosAnteriores.map((p) => (
                  <FilaDeLista key={p.proyecto.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">{p.proyecto.nombre}</span>
                      <span className="text-text-2">{p.proyecto.codigo}</span>
                    </div>
                    <p className="text-xs text-text-2 tabular-nums">
                      Finalizado: {p.finRealTexto ?? 'sin fecha registrada'}
                    </p>
                  </FilaDeLista>
                ))}
              </ListaDeFilas>
            )}
          </PanelDeDatos>
        </div>
      </div>
    </article>
  );
}
