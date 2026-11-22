import { useLocation, useNavigate, useParams } from 'react-router';
import { DetalleDeTarea } from '@/app/tareas/DetalleDeTarea';
import type { Entorno } from '@/services';
import { RUTA_MIS_PROYECTOS_PRACTICANTE } from './rutas';

/**
 * El detalle de una tarea del Practicante (`/practicante/proyectos/tareas/:idTarea`, §6.7): la abren el tablero y los
 * avisos, que solo conocen el id de la tarea. Es el `DetalleDeTarea` compartido: los botones los decide la consulta (en
 * una tarea ajena es de solo lectura). «Volver» regresa a donde estaba (el tablero o los avisos) y, si se abrió la
 * dirección directamente, a «Mis proyectos». `entorno` solo lo cambian las pruebas.
 */
export function PaginaDetalleTareaPracticante({ entorno }: { entorno?: Entorno } = {}) {
  const { idTarea } = useParams();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  return (
    <DetalleDeTarea
      idTarea={idTarea ?? ''}
      etiquetaVolver="Volver"
      // `default` es la primera entrada del historial: no hay a dónde volver con el botón del navegador.
      onVolver={() =>
        ubicacion.key === 'default' ? navegar(RUTA_MIS_PROYECTOS_PRACTICANTE) : navegar(-1)
      }
      entorno={entorno}
    />
  );
}
