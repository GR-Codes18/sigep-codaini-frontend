import { useSearchParams } from 'react-router';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { CabeceraDePagina } from '@/compartido/CabeceraDePagina';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { ENTORNO, type Entorno } from '@/services';
import { PESTANA_INICIAL, PESTANAS_DE_REPORTES, type PestanaDeReportes } from './rutas';
import { TabIndicadores } from './TabIndicadores';
import { TabInsights } from './TabInsights';

const ETIQUETA_PESTANA: Record<PestanaDeReportes, string> = {
  insights: 'Insights',
  indicadores: 'Indicadores',
};

/**
 * Reportes (§5.6): analiza lo que el Historial registró, en dos pestañas («Insights» e «Indicadores») que van en
 * `?pestana=` para poder enlazarlas. Una pestaña desconocida abre «Insights». `entorno` solo lo cambian las pruebas.
 */
export function PaginaReportes({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const [parametros, setParametros] = useSearchParams();

  const pedida = parametros.get('pestana');
  const pestana: PestanaDeReportes = (PESTANAS_DE_REPORTES as readonly string[]).includes(
    pedida ?? '',
  )
    ? (pedida as PestanaDeReportes)
    : PESTANA_INICIAL;

  if (idUsuario === null) return null;

  return (
    <section className="space-y-3">
      <CabeceraDePagina
        titulo="Reportes"
        subtitulo="Alertas automáticas e indicadores de rendimiento de los proyectos."
      />

      <PestanasConContador
        valor={pestana}
        onCambiar={(valor) =>
          setParametros(valor === PESTANA_INICIAL ? {} : { pestana: valor }, { replace: true })
        }
        pestanas={PESTANAS_DE_REPORTES.map((p) => ({ valor: p, etiqueta: ETIQUETA_PESTANA[p] }))}
      />

      {pestana === 'insights' && (
        <TabInsights idActor={idUsuario} rol={sesion?.rol} entorno={entorno} />
      )}
      {pestana === 'indicadores' && <TabIndicadores idActor={idUsuario} entorno={entorno} />}
    </section>
  );
}
