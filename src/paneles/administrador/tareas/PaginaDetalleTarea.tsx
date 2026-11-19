import { useNavigate, useParams } from 'react-router';
import { DetalleDeTarea } from '@/app/tareas/DetalleDeTarea';
import type { Entorno } from '@/services';
import { RUTA_TAREAS } from './rutas';

/**
 * El detalle de una tarea desde el módulo Tareas (`/administrador/tareas/:idTarea`, §6.7): aquí se ejecutan todas las
 * acciones de la tarea, con los botones que decide `domain/` según su estado y el rol. «Volver» regresa al listado. Es el
 * mismo `DetalleDeTarea` del detalle dentro de un proyecto. `entorno` solo lo cambian las pruebas.
 */
export function PaginaDetalleTarea({ entorno }: { entorno?: Entorno } = {}) {
  const { idTarea } = useParams();
  const navegar = useNavigate();

  return (
    <DetalleDeTarea
      idTarea={idTarea ?? ''}
      etiquetaVolver="Volver al listado"
      onVolver={() => navegar(RUTA_TAREAS)}
      entorno={entorno}
    />
  );
}
