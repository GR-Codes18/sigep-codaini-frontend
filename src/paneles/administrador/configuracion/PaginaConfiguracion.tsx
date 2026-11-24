import { useCallback, useMemo } from 'react';
import { aConfiguracion } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { CabeceraDePagina } from '@/compartido/CabeceraDePagina';
import { Skeleton } from '@/compartido/ui/skeleton';
import { ENTORNO, obtenerConfiguracion, type Entorno } from '@/services';
import { FormularioDeSeccion } from './FormularioDeSeccion';
import { RestablecerDatos } from './RestablecerDatos';
import { TarjetaGitHub } from './TarjetaGitHub';

/**
 * Configuración (§5.8): los parámetros ajustables en tres secciones (Evaluación, Prácticas y Seguimiento), cada una con
 * su «Restaurar»; la tarjeta de ejemplo de GitHub y «Restablecer datos». Solo para el Administrador. `entorno` solo lo
 * cambian las pruebas.
 */
export function PaginaConfiguracion({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idActor = sesion?.id ?? null;

  const cargar = useCallback(
    () => obtenerConfiguracion({ idActor: idActor ?? '' }, entorno),
    [entorno, idActor],
  );
  const consulta = useConsulta(idActor === null ? null : cargar);
  const secciones = useMemo(
    () => (consulta.valor === null ? null : aConfiguracion(consulta.valor)),
    [consulta.valor],
  );

  if (idActor === null) return null;

  return (
    <section className="space-y-3">
      <CabeceraDePagina
        titulo="Configuración"
        subtitulo="Los cambios valen hacia adelante y quedan en el Historial con su valor anterior y el nuevo."
      />

      {consulta.error ? (
        <p role="alert" className="text-sm text-danger-text">
          {consulta.error}
        </p>
      ) : secciones === null ? (
        <div className="space-y-2" role="status" aria-label="Cargando la configuración">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        secciones.map((s) => (
          <FormularioDeSeccion
            // Al guardar o restaurar cambian los valores vigentes y el formulario parte de ellos.
            key={`${s.seccion}:${s.parametros.map((p) => p.campos.map((c) => c.valor).join('/')).join('|')}`}
            seccion={s}
            idActor={idActor}
            entorno={entorno}
          />
        ))
      )}

      <TarjetaGitHub entorno={entorno} />
      <RestablecerDatos idActor={idActor} entorno={entorno} />
    </section>
  );
}
