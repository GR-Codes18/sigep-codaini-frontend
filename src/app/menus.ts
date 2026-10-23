import {
  ChartColumn,
  FileText,
  FolderKanban,
  History,
  House,
  LayoutDashboard,
  ListChecks,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Rol } from '@/auth/tipos';

export interface ItemMenu {
  etiqueta: string;
  ruta: string;
  icono: LucideIcon;
}
export interface GrupoMenu {
  etiqueta?: string;
  items: ItemMenu[];
}

const A = '/administrador';
const S = '/supervisor';
const P = '/practicante';

export const MENU_POR_ROL: Record<Rol, GrupoMenu[]> = {
  ADMINISTRADOR: [
    { items: [{ etiqueta: 'Dashboard', ruta: `${A}/dashboard`, icono: LayoutDashboard }] },
    {
      etiqueta: 'Gestión',
      items: [
        { etiqueta: 'Postulaciones', ruta: `${A}/postulaciones`, icono: FileText },
        { etiqueta: 'Practicantes', ruta: `${A}/practicantes`, icono: Users },
        { etiqueta: 'Supervisores', ruta: `${A}/supervisores`, icono: UserCog },
      ],
    },
    {
      etiqueta: 'Proyectos',
      items: [
        { etiqueta: 'Proyectos', ruta: `${A}/proyectos`, icono: FolderKanban },
        { etiqueta: 'Tareas', ruta: `${A}/tareas`, icono: ListChecks },
      ],
    },
    {
      etiqueta: 'Análisis',
      items: [
        { etiqueta: 'Reportes', ruta: `${A}/reportes`, icono: ChartColumn },
        { etiqueta: 'Historial de actividad', ruta: `${A}/historial`, icono: History },
      ],
    },
    {
      etiqueta: 'Sistema',
      items: [{ etiqueta: 'Configuración', ruta: `${A}/configuracion`, icono: Settings }],
    },
  ],
  SUPERVISOR: [
    { items: [{ etiqueta: 'Dashboard', ruta: `${S}/dashboard`, icono: LayoutDashboard }] },
    {
      etiqueta: 'Proyectos',
      items: [
        { etiqueta: 'Mis proyectos', ruta: `${S}/proyectos`, icono: FolderKanban },
        { etiqueta: 'Practicantes a cargo', ruta: `${S}/practicantes`, icono: Users },
        { etiqueta: 'Tareas', ruta: `${S}/tareas`, icono: ListChecks },
      ],
    },
    {
      etiqueta: 'Análisis',
      items: [{ etiqueta: 'Reportes', ruta: `${S}/reportes`, icono: ChartColumn }],
    },
  ],
  PRACTICANTE: [
    {
      items: [
        { etiqueta: 'Inicio', ruta: `${P}/inicio`, icono: House },
        { etiqueta: 'Mis proyectos', ruta: `${P}/proyectos`, icono: FolderKanban },
        { etiqueta: 'Mi historial', ruta: `${P}/historial`, icono: History },
      ],
    },
  ],
};

export function etiquetaDeRuta(rol: Rol, ruta: string): string {
  const item = MENU_POR_ROL[rol].flatMap((g) => g.items).find((i) => i.ruta === ruta);
  if (item) return item.etiqueta;
  return ruta.endsWith('/perfil') ? 'Mi perfil' : '';
}