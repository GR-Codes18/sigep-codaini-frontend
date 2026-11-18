import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useTema } from '@/app/tema/contexto';

const Toaster = ({ ...props }: ToasterProps) => {
  // Una sola fuente de verdad del tema: nuestro ProveedorTema (data-theme).
  const { tema } = useTema();

  return (
    <Sonner
      theme={tema}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" strokeWidth={1.5} />,
        info: <InfoIcon className="size-4" strokeWidth={1.5} />,
        warning: <TriangleAlertIcon className="size-4" strokeWidth={1.5} />,
        error: <OctagonXIcon className="size-4" strokeWidth={1.5} />,
        loading: <Loader2Icon className="size-4 animate-spin" strokeWidth={1.5} />,
      }}
      style={
        {
          '--normal-bg': 'var(--surface)',
          '--normal-text': 'var(--text)',
          '--normal-border': 'var(--border)',
          '--border-radius': '10px',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
