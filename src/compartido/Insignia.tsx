import { cn } from '@/compartido/utils';

type Familia = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

const FAMILIA: Record<Familia, { caja: string; punto: string }> = {
  neutral: { caja: 'bg-state-neutral-bg text-state-neutral-text', punto: 'bg-state-neutral' },
  info: { caja: 'bg-state-info-bg text-state-info-text', punto: 'bg-state-info' },
  warning: { caja: 'bg-state-warning-bg text-state-warning-text', punto: 'bg-state-warning' },
  success: { caja: 'bg-state-success-bg text-state-success-text', punto: 'bg-state-success' },
  danger: { caja: 'bg-state-danger-bg text-state-danger-text', punto: 'bg-state-danger' },
};

export type TipoEstado = 'tarea' | 'postulacion' | 'proyecto' | 'pr' | 'marca';

const ESTADOS: Record<TipoEstado, Record<string, { etiqueta: string; familia: Familia }>> = {
  tarea: {
    DISPONIBLE: { etiqueta: 'Disponible', familia: 'neutral' },
    EN_PROGRESO: { etiqueta: 'En progreso', familia: 'info' },
    ESPERANDO_SUPERVISION: { etiqueta: 'Esperando supervisión', familia: 'warning' },
    TERMINADA: { etiqueta: 'Terminada', familia: 'success' },
  },
  postulacion: {
    PENDIENTE: { etiqueta: 'Pendiente', familia: 'info' },
    APROBADA: { etiqueta: 'Aprobada', familia: 'success' },
    RECHAZADA: { etiqueta: 'Rechazada', familia: 'danger' },
  },
  proyecto: {
    ACTIVO: { etiqueta: 'Activo', familia: 'success' },
    EN_PAUSA: { etiqueta: 'En pausa', familia: 'warning' },
    FINALIZADO: { etiqueta: 'Finalizado', familia: 'neutral' },
  },
  pr: {
    PENDIENTE: { etiqueta: 'Pendiente', familia: 'warning' },
    CREADO: { etiqueta: 'Creado', familia: 'info' },
    CON_CONFLICTOS: { etiqueta: 'Con conflictos', familia: 'danger' },
    FUSIONADO: { etiqueta: 'Fusionado', familia: 'success' },
    CERRADO: { etiqueta: 'Cerrado', familia: 'neutral' },
  },
  marca: {
    DEVUELTA: { etiqueta: 'Devuelta con observaciones', familia: 'danger' },
    REVISION_MANUAL: { etiqueta: 'Requiere revisión manual', familia: 'warning' },
  },
};

interface Props {
  tipo: TipoEstado;
  estado: string;
  className?: string;
}

export function Insignia({ tipo, estado, className }: Props) {
  const def = ESTADOS[tipo][estado];
  if (!def) return null;
  const f = FAMILIA[def.familia];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        f.caja,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', f.punto)} aria-hidden="true" />
      {def.etiqueta}
    </span>
  );
}
