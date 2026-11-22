import { useMemo } from 'react';
import { toast } from 'sonner';
import { fechaHoraPeru } from '@/app/adaptadores';
import { Insignia } from '@/compartido/Insignia';
import { Button } from '@/compartido/ui/button';
import { ENTORNO, type Entorno } from '@/services';

/**
 * Los datos de la tarjeta de ejemplo de la conexión con GitHub (§5.8: «en el prototipo, una tarjeta de ejemplo»). Son
 * datos de muestra: no hay ninguna conexión real ni se guarda nada. La clave de la conexión nunca se muestra. La
 * última verificación es relativa a hoy (el plan §6 no admite fechas fijas del pasado): siempre hace unas horas.
 */
const CONEXION_DE_EJEMPLO = { estado: 'CONECTADO', cuenta: 'codaini-demo' } as const;
const HORAS_DESDE_LA_ULTIMA_VERIFICACION = 2;

const AVISO_SIMULADO = 'Acción simulada: en el prototipo no hay conexión real con GitHub.';

export function TarjetaGitHub({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const ultimaVerificacion = useMemo(
    () =>
      fechaHoraPeru(
        new Date(
          entorno.ahora().getTime() - HORAS_DESDE_LA_ULTIMA_VERIFICACION * 3_600_000,
        ).toISOString(),
      ),
    [entorno],
  );

  return (
    <section
      aria-labelledby="seccion-integraciones"
      className="space-y-4 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="seccion-integraciones" className="text-text">
          Integraciones
        </h2>
        <Insignia tipo="marca" estado="SOLO_PROTOTIPO" />
      </div>

      <div className="space-y-3 rounded-lg border border-border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-text">GitHub</h3>
          <Insignia tipo="integracion" estado={CONEXION_DE_EJEMPLO.estado} />
        </div>
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-2">Organización o cuenta conectada</dt>
            <dd className="text-text">{CONEXION_DE_EJEMPLO.cuenta}</dd>
          </div>
          <div>
            <dt className="text-text-2">Última verificación</dt>
            <dd className="text-text">{ultimaVerificacion}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => toast.info(AVISO_SIMULADO)}>
            Probar conexión
          </Button>
          <Button type="button" variant="outline" onClick={() => toast.info(AVISO_SIMULADO)}>
            Reconectar
          </Button>
        </div>
      </div>
    </section>
  );
}
