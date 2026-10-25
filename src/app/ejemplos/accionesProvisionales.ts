import type { AccionTarea, TareaDetalle } from '@/compartido/DetalleTarea';
import type { Rol } from '@/auth/tipos';

// PROVISIONAL: replica propuesta §6.2 y la matriz de §4.
// Se reemplaza por domain/ (transicionesDisponibles) cuando Persona A lo entregue.

interface Contexto {
  rol: Rol;
  esResponsable: boolean;
  proyectoEnPausa: boolean;
}

const MOTIVO_OBLIGATORIO = { etiqueta: 'Motivo', obligatorio: true, minimo: 5 };
const NOTA_OBLIGATORIA = { etiqueta: 'Nota', obligatorio: true, minimo: 5 };

export function accionesProvisionales(t: TareaDetalle, c: Contexto): AccionTarea[] {
  const acciones: AccionTarea[] = [];
  const gestor = c.rol === 'SUPERVISOR' || c.rol === 'ADMINISTRADOR';

  if (t.estado === 'DISPONIBLE') {
    if (c.rol === 'PRACTICANTE' && !c.proyectoEnPausa) {
      acciones.push({ clave: 'tomar', etiqueta: 'Tomar tarea' });
    }
    if (gestor && !t.estadoPr) {
      acciones.push({
        clave: 'eliminar',
        etiqueta: 'Eliminar',
        destructivo: true,
        pedirMotivo: MOTIVO_OBLIGATORIO,
      });
    }
  }

  if (t.estado === 'EN_PROGRESO') {
    if (c.rol === 'PRACTICANTE' && c.esResponsable) {
      acciones.push({ clave: 'liberar', etiqueta: 'Liberar' });
      acciones.push(
        t.requiereSupervision
          ? { clave: 'enviar', etiqueta: 'Enviar a supervisión' }
          : { clave: 'terminar', etiqueta: 'Marcar como terminada' },
      );
    }
    if (gestor) {
      acciones.push({ clave: 'liberar', etiqueta: 'Liberar', pedirMotivo: MOTIVO_OBLIGATORIO });
    }
  }

  if (t.estado === 'ESPERANDO_SUPERVISION' && c.rol === 'SUPERVISOR') {
    acciones.push({ clave: 'aprobar', etiqueta: 'Aprobar' });
    acciones.push({ clave: 'devolver', etiqueta: 'Devolver', pedirMotivo: NOTA_OBLIGATORIA });
  }

  if (t.estado === 'TERMINADA' && gestor) {
    acciones.push({ clave: 'reabrir', etiqueta: 'Reabrir', pedirMotivo: NOTA_OBLIGATORIA });
  }

  const enFaseDePr = t.estado === 'ESPERANDO_SUPERVISION' || t.estado === 'TERMINADA';
  if (
    enFaseDePr &&
    t.requierePr &&
    t.estadoPr === 'PENDIENTE' &&
    c.rol === 'PRACTICANTE' &&
    c.esResponsable
  ) {
    acciones.push({ clave: 'crear_pr', etiqueta: 'Crear Pull Request' });
  }

  return acciones;
}
