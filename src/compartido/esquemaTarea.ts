import { z } from 'zod';

export const esquemaEdicionTarea = z.object({
  titulo: z.string().trim().min(1, 'Ingresa un título'),
  descripcion: z.string().trim().min(1, 'Describe qué se espera y cuándo se considera terminada'),
  fechaLimite: z.string().min(1, 'Elige una fecha límite'),
});

export const esquemaTarea = esquemaEdicionTarea.extend({
  idProyecto: z.string().min(1, 'Elige un proyecto'),
  requiereSupervision: z.boolean(),
  requierePr: z.boolean(),
});

export type DatosTarea = z.infer<typeof esquemaTarea>;
export type DatosEdicionTarea = z.infer<typeof esquemaEdicionTarea>;
