import { useNavigate, useParams } from 'react-router';
import { DetalleDeTarea } from '@/app/tareas/DetalleDeTarea';
import type { Entorno } from '@/services';
import { rutaDeDetalleDeProyecto } from './rutas';

/**
 * El detalle de una tarea dentro de su proyecto (`/administrador/proyectos/:idProyecto/tareas/:idTarea`, §6.7): aquí se
 * ejecutan todas las acciones de la tarea. «Volver» regresa al tablero del proyecto. Una tarea de otro proyecto no se
 * muestra por esta dirección. `entorno` solo lo cambian las pruebas.
 */
export function PaginaDetalleTareaDeProyecto({ entorno }: { entorno?: Entorno } = {}) {
  const { idProyecto, idTarea } = useParams();
  const navegar = useNavigate();

  return (
    <DetalleDeTarea
      idTarea={idTarea ?? ''}
      idProyectoEsperado={idProyecto ?? ''}
      etiquetaVolver="Volver al tablero"
      onVolver={() => navegar(rutaDeDetalleDeProyecto(idProyecto ?? '', 'tablero'))}
      entorno={entorno}
    />
  );
}
