import { toast } from 'sonner';
import { FormularioTarea } from '@/compartido/FormularioTarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/compartido/ui/dialog';
import type { Id } from '@/domain';
import type { Entorno } from '@/services';

interface Props {
  idActor: Id;
  /** Los proyectos entre los que se puede crear: los decide `puede('CREAR_TAREA')` y llegan con la consulta. */
  proyectos: readonly { id: Id; nombre: string }[];
  /** El proyecto que ya viene elegido (por ejemplo, el del tablero desde el que se crea). */
  idProyectoInicial?: Id;
  descripcion: string;
  onCerrar: () => void;
  /** Solo lo cambian las pruebas. */
  entorno?: Entorno;
}

/**
 * «Nueva tarea» (§5.5 y §6.4): el formulario de `FormularioTarea` en modo «crear» dentro de un diálogo. Lo usan el
 * tablero de un proyecto (con el proyecto ya elegido) y el módulo Tareas (que deja elegirlo). Qué proyectos se ofrecen lo
 * decide la consulta; el servicio vuelve a comprobarlo y su mensaje queda en el formulario.
 */
export function DialogoNuevaTarea({
  idActor,
  proyectos,
  idProyectoInicial,
  descripcion,
  onCerrar,
  entorno,
}: Props) {
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <FormularioTarea
          modo="crear"
          idActor={idActor}
          proyectos={[...proyectos]}
          valoresIniciales={
            idProyectoInicial === undefined ? undefined : { idProyecto: idProyectoInicial }
          }
          onGuardada={() => toast.success('Tarea creada')}
          onCancelar={onCerrar}
          entorno={entorno}
        />
      </DialogContent>
    </Dialog>
  );
}
