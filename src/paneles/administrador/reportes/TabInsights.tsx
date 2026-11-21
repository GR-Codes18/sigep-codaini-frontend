import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { aInsights, ETIQUETA_REGLA, ETIQUETA_SEVERIDAD, type FilaInsight } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { Insignia } from '@/compartido/Insignia';
import { ModalConfirmacion } from '@/compartido/ModalConfirmacion';
import { Button } from '@/compartido/ui/button';
import { Label } from '@/compartido/ui/label';
import { Skeleton } from '@/compartido/ui/skeleton';
import { SEVERIDADES, TIPOS_REGLA_INSIGHT, type Id } from '@/domain';
import {
  ENTORNO,
  listarInsights,
  marcarInsightRevisado,
  notificarDesdeInsight,
  type Entorno,
  type Resultado,
} from '@/services';
import {
  FILTROS_INICIALES,
  filtrarInsights,
  hayFiltros,
  opcionesDeProyecto,
  type EstadoDeInsights,
  type FiltrosInsights,
} from './filtrosInsights';

const CLASE_SELECT =
  'h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus';

/** Un error de servicio llega al modal como excepción: el modal se queda abierto y muestra el mensaje. */
function exigirExito<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(resultado.mensaje);
  return resultado.valor;
}

type Accion = { tipo: 'REVISAR' | 'NOTIFICAR'; insight: FilaInsight };

function TarjetaDeInsight({
  insight,
  onAccion,
}: {
  insight: FilaInsight;
  onAccion: (accion: Accion) => void;
}) {
  return (
    <article
      aria-label={insight.titulo}
      className="space-y-2 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Insignia tipo="severidad" estado={insight.severidad} />
        <span className="text-xs text-text-2">{ETIQUETA_REGLA[insight.tipoRegla]}</span>
        {insight.revisado && <span className="text-xs font-medium text-text-2">Revisado</span>}
      </div>
      <h3 className="text-text">{insight.titulo}</h3>
      <p className="text-sm text-text">{insight.motivo}</p>
      <p className="text-xs text-text-2">
        Detectado el {insight.fechaDeteccionTexto}
        {insight.proyectos.length > 0 && (
          <> · {insight.proyectos.map((p) => p.nombre).join(', ')}</>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {insight.rutaElemento !== null && (
          <Button asChild variant="outline" size="sm">
            <Link to={insight.rutaElemento} aria-label={`Ver detalle: ${insight.titulo}`}>
              Ver detalle
            </Link>
          </Button>
        )}
        {insight.puedeMarcarRevisado && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Marcar como revisado: ${insight.titulo}`}
            onClick={() => onAccion({ tipo: 'REVISAR', insight })}
          >
            Marcar como revisado
          </Button>
        )}
        {insight.puedeNotificar && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Notificar: ${insight.titulo}`}
            onClick={() => onAccion({ tipo: 'NOTIFICAR', insight })}
          >
            Notificar
          </Button>
        )}
      </div>
    </article>
  );
}

/**
 * La pestaña «Insights» (§5.6): las alertas automáticas como tarjetas, por severidad y antigüedad, con filtros por
 * severidad, tipo, proyecto y estado. Los insights no se guardan: se calculan al consultar (`listarInsights`). Las
 * acciones son «Ver detalle» del elemento afectado, «Marcar como revisado» (con nota opcional; independiente por persona)
 * y «Notificar» (solo en inactividad y en supervisión demorada). Qué botones aparecen lo deciden `puede()` y la revisión
 * vigente, y llegan con cada insight; la pantalla no los deduce.
 */
export function TabInsights({ idActor, entorno = ENTORNO }: { idActor: Id; entorno?: Entorno }) {
  const [filtros, setFiltros] = useState<FiltrosInsights>(FILTROS_INICIALES);
  const [accion, setAccion] = useState<Accion | null>(null);

  const cargar = useCallback(() => listarInsights({ idActor }, entorno), [entorno, idActor]);
  const consulta = useConsulta(cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aInsights(consulta.valor)),
    [consulta.valor],
  );
  const visibles = useMemo(
    () => (datos === null ? [] : filtrarInsights(datos.filas, filtros)),
    [datos, filtros],
  );

  const cambiar = (cambios: Partial<FiltrosInsights>) =>
    setFiltros((actuales) => ({ ...actuales, ...cambios }));

  function lista() {
    if (consulta.error) {
      return (
        <p role="alert" className="text-sm text-danger-text">
          {consulta.error}
        </p>
      );
    }
    if (datos === null) {
      return (
        <div className="space-y-2" role="status" aria-label="Cargando los insights">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }
    if (visibles.length === 0) {
      return hayFiltros(filtros) ? (
        <EstadoVacio
          titulo="Ninguna alerta coincide con los filtros"
          descripcion="Prueba con otra severidad, tipo o proyecto."
        />
      ) : filtros.estado === 'REVISADOS' ? (
        <EstadoVacio titulo="Aún no hay alertas revisadas" />
      ) : (
        <EstadoVacio
          titulo="No hay alertas"
          descripcion="Las alertas aparecen solas cuando una regla se cumple."
        />
      );
    }
    return (
      <div className="space-y-3">
        {visibles.map((i) => (
          <TarjetaDeInsight key={i.clave} insight={i} onAccion={setAccion} />
        ))}
      </div>
    );
  }

  const entrada = (i: FilaInsight) => ({
    idActor,
    tipo_regla: i.tipoRegla,
    elemento: i.elemento,
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40 space-y-1">
          <Label htmlFor="filtro-severidad">Severidad</Label>
          <select
            id="filtro-severidad"
            value={filtros.severidad}
            onChange={(e) => cambiar({ severidad: e.target.value as FiltrosInsights['severidad'] })}
            className={CLASE_SELECT}
          >
            <option value="">Todas</option>
            {SEVERIDADES.map((s) => (
              <option key={s} value={s}>
                {ETIQUETA_SEVERIDAD[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="w-56 space-y-1">
          <Label htmlFor="filtro-tipo">Tipo</Label>
          <select
            id="filtro-tipo"
            value={filtros.tipo}
            onChange={(e) => cambiar({ tipo: e.target.value as FiltrosInsights['tipo'] })}
            className={CLASE_SELECT}
          >
            <option value="">Todos</option>
            {TIPOS_REGLA_INSIGHT.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_REGLA[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="w-52 space-y-1">
          <Label htmlFor="filtro-proyecto-insights">Proyecto</Label>
          <select
            id="filtro-proyecto-insights"
            value={filtros.idProyecto}
            onChange={(e) => cambiar({ idProyecto: e.target.value })}
            className={CLASE_SELECT}
          >
            <option value="">Todos</option>
            {opcionesDeProyecto(datos?.filas ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="w-44 space-y-1">
          <Label htmlFor="filtro-estado-insights">Estado</Label>
          <select
            id="filtro-estado-insights"
            value={filtros.estado}
            onChange={(e) => cambiar({ estado: e.target.value as EstadoDeInsights })}
            className={CLASE_SELECT}
          >
            <option value="ACTIVOS">Activos{datos ? ` (${datos.contadores.ACTIVOS})` : ''}</option>
            <option value="REVISADOS">
              Revisados{datos ? ` (${datos.contadores.REVISADOS})` : ''}
            </option>
            <option value="TODOS">Todos{datos ? ` (${datos.contadores.TODOS})` : ''}</option>
          </select>
        </div>
      </div>

      {lista()}

      {accion?.tipo === 'REVISAR' && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setAccion(null)}
          titulo="Marcar como revisado"
          descripcion={`«${accion.insight.titulo}» sale de tu lista activa. Reaparece si la situación empeora o a los 7 días si sigue igual. Es solo para ti: las demás personas lo siguen viendo.`}
          etiquetaConfirmar="Marcar como revisado"
          pedirMotivo={{ etiqueta: 'Nota', obligatorio: false }}
          onConfirmar={async (nota) => {
            exigirExito(
              await marcarInsightRevisado(
                { ...entrada(accion.insight), nota: nota === '' ? null : nota },
                entorno,
              ),
            );
            toast.success('Alerta marcada como revisada');
          }}
        />
      )}

      {accion?.tipo === 'NOTIFICAR' && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setAccion(null)}
          titulo="Notificar"
          descripcion={`Se enviará un aviso a la persona afectada con el título y el motivo de la alerta: «${accion.insight.titulo}».`}
          etiquetaConfirmar="Notificar"
          onConfirmar={async () => {
            exigirExito(await notificarDesdeInsight(entrada(accion.insight), entorno));
            toast.success('Aviso enviado');
          }}
        />
      )}
    </section>
  );
}
