import { useMemo } from 'react';
import { toast } from 'sonner';
import { fechaHoraPeru } from '@/app/adaptadores';
import { ListaDeDefiniciones } from '@/compartido/ListaDeDefiniciones';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
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
    <PanelDeDatos
      titulo="Integraciones"
      acciones={<Insignia tipo="marca" estado="SOLO_PROTOTIPO" />}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-text">GitHub</h3>
        <Insignia tipo="integracion" estado={CONEXION_DE_EJEMPLO.estado} />
      </div>
      <ListaDeDefiniciones
        disposicion="filas"
        items={[
          { etiqueta: 'Organización o cuenta conectada', valor: CONEXION_DE_EJEMPLO.cuenta },
          { etiqueta: 'Última verificación', valor: ultimaVerificacion },
        ]}
      />
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
        <Button type="button" variant="outline" onClick={() => toast.info(AVISO_SIMULADO)}>
          Probar conexión
        </Button>
        <Button type="button" variant="outline" onClick={() => toast.info(AVISO_SIMULADO)}>
          Reconectar
        </Button>
      </div>
    </PanelDeDatos>
  );
}
