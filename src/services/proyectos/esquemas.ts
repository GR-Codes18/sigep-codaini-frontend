/**
 * Esquemas Zod de los datos de un proyecto (Fase 2, paso 9A; propuesta §5.4).
 *
 * Los usan los servicios y, más adelante, los formularios de la Fase 5.4, para que el mismo dato se valide igual
 * en la pantalla y en el servicio. Reglas de los autores (G1-A y supuestos del paso 9):
 *   - el repositorio es `https://github.com/{organización}/{repositorio}`, sin «/» final ni «.git» (la URL de cada
 *     Pull Request se arma con él: `${repositorio_url}/pull/N`);
 *   - la rama base no lleva espacios;
 *   - la reunión semanal es **día y hora juntos**, o ninguno de los dos (opcional); la hora es `HH:mm`;
 *   - las fechas son de calendario (`AAAA-MM-DD` reales).
 */

import { z } from 'zod';
import { DIAS_SEMANA } from '@/domain';
import { esFechaDeCalendario } from '../tareas/comun';

export const esquemaNombreProyecto = z.string().trim().min(1, 'Escribe el nombre del proyecto.');

export const esquemaDescripcionProyecto = z
  .string()
  .trim()
  .min(1, 'Escribe la descripción del proyecto.');

export const esquemaFechaProyecto = z
  .string()
  .refine(esFechaDeCalendario, 'La fecha no es válida (AAAA-MM-DD).');

const MENSAJE_REPOSITORIO =
  'Escribe la dirección del repositorio como https://github.com/organización/repositorio, sin «/» final ni «.git».';

export const esquemaRepositorio = z
  .string()
  .trim()
  .regex(/^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9._-]+$/, MENSAJE_REPOSITORIO)
  .refine((url) => !url.endsWith('.git') && !/\/\.{1,2}$/.test(url), MENSAJE_REPOSITORIO);

export const esquemaRamaBase = z
  .string()
  .trim()
  .min(1, 'Escribe la rama base.')
  .regex(/^\S+$/, 'La rama base no puede llevar espacios.');

export const esquemaDiaReunion = z.enum(DIAS_SEMANA, { error: 'Elige el día de la reunión.' });

export const esquemaHoraReunion = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener el formato HH:mm (de 00:00 a 23:59).');

/** Solo los dos campos juntos o ninguno; el mensaje cae en el campo que falta. */
export function exigirReunionCompleta(
  valor: { dia_reunion?: unknown; hora_reunion?: unknown },
  contexto: z.RefinementCtx,
): void {
  const hayDia = valor.dia_reunion !== undefined && valor.dia_reunion !== null;
  const hayHora = valor.hora_reunion !== undefined && valor.hora_reunion !== null;
  if (hayDia && !hayHora) {
    contexto.addIssue({
      code: 'custom',
      path: ['hora_reunion'],
      message: 'Indica también la hora de la reunión, o quita el día.',
    });
  }
  if (hayHora && !hayDia) {
    contexto.addIssue({
      code: 'custom',
      path: ['dia_reunion'],
      message: 'Indica también el día de la reunión, o quita la hora.',
    });
  }
}

export const esquemaNombreEnlace = z.string().trim().min(1, 'Escribe el nombre del enlace.');

export const esquemaUrlEnlace = z
  .string()
  .trim()
  .pipe(z.url('Escribe una dirección válida, por ejemplo https://ejemplo.com.'))
  .refine((url) => /^https?:\/\//i.test(url), 'La dirección debe empezar con http:// o https://.');
