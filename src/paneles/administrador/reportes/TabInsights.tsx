import { useCallback, useMemo, useState } from 'react';
import { aInsights, ETIQUETA_REGLA, ETIQUETA_SEVERIDAD } from '@/app/adaptadores';
import {
  ModalesDeInsight,
  TarjetaDeInsight,
  type AccionDeInsight,
} from '@/app/insights/AccionesDeInsight';
import { useConsulta } from '@/app/useConsulta';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { BarraDeFiltros } from '@/compartido/BarraDeFiltros';
import { CampoDeFormulario } from '@/compartido/CampoDeFormulario';
import { CLASE_CAMPO } from '@/compartido/estiloCampo';
import { Skeleton } from '@/compartido/ui/skeleton';
import {
  REGLAS_INSIGHT_VISIBLES,
  SEVERIDADES,
  TIPOS_REGLA_INSIGHT,
  type Id,
  type Rol,
} from '@/domain';
import { ENTORNO, listarInsights, type Entorno } from '@/services';
import {
  FILTROS_INICIALES,
  filtrarInsights,
  hayFiltros,
  opcionesDeProyecto,
  type EstadoDeInsights,
  type FiltrosInsights,
} from './filtrosInsights';

/**
 * La pestaña «Insights» (§5.6): las alertas automáticas como tarjetas, por severidad y antigüedad, con filtros por
 * severidad, tipo, proyecto y estado. Los insights no se guardan: se calculan al consultar (`listarInsights`). Las
 * acciones son «Ver detalle» del elemento afectado, «Marcar como revisado» (con nota opcional; independiente por persona)
 * y «Notificar» (solo en inactividad y en supervisión demorada). Qué botones aparecen lo deciden `puede()` y la revisión
 * vigente, y llegan con cada insight; la pantalla no los deduce.
 */
export function TabInsights({
  idActor,
  rol = 'ADMINISTRADOR',
  entorno = ENTORNO,
}: {
  idActor: Id;
  /** El rol de quien mira: decide a qué panel llevan los enlaces y qué reglas ofrece el filtro de tipo (§9.1.4). */
  rol?: Rol;
  entorno?: Entorno;
}) {
  const [filtros, setFiltros] = useState<FiltrosInsights>(FILTROS_INICIALES);
  const [accion, setAccion] = useState<AccionDeInsight | null>(null);

  const cargar = useCallback(() => listarInsights({ idActor }, entorno), [entorno, idActor]);
  const consulta = useConsulta(cargar);
  const datos = useMemo(
    () => (consulta.valor === null ? null : aInsights(consulta.valor, rol)),
    [consulta.valor, rol],
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
          titulo={rol === 'SUPERVISOR' ? 'No hay alertas en tus proyectos' : 'No hay alertas'}
          descripcion="Las alertas aparecen solas cuando una regla se cumple."
        />
      );
    }
    return (
      <div className="space-y-2">
        {visibles.map((i) => (
          <TarjetaDeInsight key={i.clave} insight={i} onAccion={setAccion} />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <BarraDeFiltros>
        <CampoDeFormulario
          htmlFor="filtro-severidad"
          etiqueta="Severidad"
          className="min-w-36 flex-1"
        >
          <select
            id="filtro-severidad"
            value={filtros.severidad}
            onChange={(e) => cambiar({ severidad: e.target.value as FiltrosInsights['severidad'] })}
            className={CLASE_CAMPO}
          >
            <option value="">Todas</option>
            {SEVERIDADES.map((s) => (
              <option key={s} value={s}>
                {ETIQUETA_SEVERIDAD[s]}
              </option>
            ))}
          </select>
        </CampoDeFormulario>
        <CampoDeFormulario htmlFor="filtro-tipo" etiqueta="Tipo" className="min-w-36 flex-1">
          <select
            id="filtro-tipo"
            value={filtros.tipo}
            onChange={(e) => cambiar({ tipo: e.target.value as FiltrosInsights['tipo'] })}
            className={CLASE_CAMPO}
          >
            <option value="">Todos</option>
            {/* Solo las reglas que le aplican a este rol: el Supervisor tiene 5 de las 7 (§9.1.4). */}
            {TIPOS_REGLA_INSIGHT.filter((t) => REGLAS_INSIGHT_VISIBLES[rol].includes(t)).map(
              (t) => (
                <option key={t} value={t}>
                  {ETIQUETA_REGLA[t]}
                </option>
              ),
            )}
          </select>
        </CampoDeFormulario>
        <CampoDeFormulario
          htmlFor="filtro-proyecto-insights"
          etiqueta="Proyecto"
          className="min-w-36 flex-1"
        >
          <select
            id="filtro-proyecto-insights"
            value={filtros.idProyecto}
            onChange={(e) => cambiar({ idProyecto: e.target.value })}
            className={CLASE_CAMPO}
          >
            <option value="">Todos</option>
            {opcionesDeProyecto(datos?.filas ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </CampoDeFormulario>
        <CampoDeFormulario
          htmlFor="filtro-estado-insights"
          etiqueta="Estado"
          className="min-w-36 flex-1"
        >
          <select
            id="filtro-estado-insights"
            value={filtros.estado}
            onChange={(e) => cambiar({ estado: e.target.value as EstadoDeInsights })}
            className={CLASE_CAMPO}
          >
            <option value="ACTIVOS">Activos{datos ? ` (${datos.contadores.ACTIVOS})` : ''}</option>
            <option value="REVISADOS">
              Revisados{datos ? ` (${datos.contadores.REVISADOS})` : ''}
            </option>
            <option value="TODOS">Todos{datos ? ` (${datos.contadores.TODOS})` : ''}</option>
          </select>
        </CampoDeFormulario>
      </BarraDeFiltros>

      {lista()}

      <ModalesDeInsight
        accion={accion}
        onCerrar={() => setAccion(null)}
        idActor={idActor}
        entorno={entorno}
      />
    </section>
  );
}
