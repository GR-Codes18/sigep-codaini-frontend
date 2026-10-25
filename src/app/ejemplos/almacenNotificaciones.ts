import { create } from 'zustand';
import type { NotificacionItem } from '@/compartido/CampanaNotificaciones';

// PROVISIONAL: se reemplaza por data/ y services/ de Persona A.
const hace = (horas: number) => new Date(Date.now() - horas * 3_600_000);

const SEMILLA: NotificacionItem[] = [
  {
    id: 'n1',
    texto: 'PL2D-003 fue enviada a supervisión',
    fecha: hace(2),
    leida: false,
    ruta: '/supervisor/desarrollo',
    existe: true,
  },
  {
    id: 'n2',
    texto: 'PL2D-002 fue devuelta con observaciones',
    fecha: hace(5),
    leida: false,
    ruta: '/practicante/desarrollo',
    existe: true,
  },
  {
    id: 'n3',
    texto: 'Reunión semanal de Plataforma 2D cambiada',
    fecha: hace(26),
    leida: true,
    ruta: '/practicante/proyectos',
    existe: true,
  },
  {
    id: 'n4',
    texto: 'PL2D-009 fue liberada por un supervisor',
    fecha: hace(50),
    leida: true,
    existe: false,
  },
];

interface Estado {
  notificaciones: NotificacionItem[];
  marcarLeida: (id: string) => void;
  marcarTodas: () => void;
}

export const useAlmacenNotificaciones = create<Estado>((set) => ({
  notificaciones: SEMILLA,
  marcarLeida: (id) =>
    set((s) => ({
      notificaciones: s.notificaciones.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    })),
  marcarTodas: () =>
    set((s) => ({ notificaciones: s.notificaciones.map((n) => ({ ...n, leida: true })) })),
}));
