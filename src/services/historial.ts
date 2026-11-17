/**
 * Registro de eventos del historial (inmutables, solo se agregan).
 *
 * `crearEvento` arma un `EventoHistorial` con la fecha de la marca; `agregarEventos` lo suma al
 * historial sin tocar lo anterior. No hay ninguna función para editar o borrar eventos.
 * Contratos de `domain/` que se hacen cumplir aquí:
 *   - `id_proyecto` es obligatorio en los eventos de proyecto, tarea, Pull Request y asignación;
 *   - nunca se registra una contraseña;
 *   - el autor es un usuario o `SISTEMA` (lo automático).
 */

import {
  ACCIONES_POR_CATEGORIA,
  type AutorEvento,
  type CambioRegistrado,
  type ElementoAfectado,
  type EventoHistorial,
  type Id,
  type TipoAccionHistorial,
} from '@/domain';
import type { Marca } from './marca';

export const AUTOR_SISTEMA: AutorEvento = { tipo: 'SISTEMA' };

export function autorDe(idUsuario: Id): AutorEvento {
  return { tipo: 'USUARIO', id_usuario: idUsuario };
}

export interface EntradaEvento {
  autor: AutorEvento;
  tipo_accion: TipoAccionHistorial;
  elemento: ElementoAfectado;
  id_proyecto?: Id | null;
  cambios?: readonly CambioRegistrado[];
  nota?: string | null;
}

/** Acciones cuyo evento debe llevar `id_proyecto` (paso 1 de la Fase 1). */
const ACCIONES_CON_PROYECTO = new Set<string>([
  ...ACCIONES_POR_CATEGORIA.TAREAS,
  ...ACCIONES_POR_CATEGORIA.PULL_REQUEST,
  ...ACCIONES_POR_CATEGORIA.PROYECTOS,
  'PRACTICANTE_ASIGNADO_A_PROYECTO',
  'PRACTICANTE_QUITADO_DE_PROYECTO',
]);

const CAMPO_SECRETO = /contrase(ñ|n)a|password/i;

export function crearEvento(
  entrada: EntradaEvento,
  marca: Marca,
  generarId: (prefijo: string) => Id,
): EventoHistorial {
  const idProyecto = entrada.id_proyecto ?? null;
  if (idProyecto === null && ACCIONES_CON_PROYECTO.has(entrada.tipo_accion)) {
    throw new Error(`El evento ${entrada.tipo_accion} necesita el ID del proyecto.`);
  }
  const cambios = [...(entrada.cambios ?? [])];
  const secreto = cambios.find((c) => CAMPO_SECRETO.test(c.campo));
  if (secreto !== undefined) {
    throw new Error(`El historial nunca guarda contraseñas (campo «${secreto.campo}»).`);
  }
  return {
    id: generarId('evt'),
    fecha: marca.ahora,
    autor: entrada.autor,
    tipo_accion: entrada.tipo_accion,
    elemento: entrada.elemento,
    id_proyecto: idProyecto,
    cambios,
    nota: entrada.nota ?? null,
  };
}

/** Historial con los eventos nuevos al final. Devuelve una lista nueva; no cambia la original. */
export function agregarEventos(
  historial: readonly EventoHistorial[],
  ...nuevos: readonly EventoHistorial[]
): EventoHistorial[] {
  return [...historial, ...nuevos];
}

/** Un valor como texto para el historial: `null` se queda, y los booleanos van como «Sí» o «No». */
function comoTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'bigint') return String(valor);
  return JSON.stringify(valor);
}

export function cambio(campo: string, antes: unknown, despues: unknown): CambioRegistrado {
  return { campo, valor_anterior: comoTexto(antes), valor_nuevo: comoTexto(despues) };
}

/**
 * Los campos que cambiaron entre `antes` y `despues`, en el orden de `campos`. Omite siempre
 * cualquier campo de contraseña.
 */
export function diferencias<T extends object>(
  antes: T,
  despues: T,
  campos: readonly (keyof T & string)[],
): CambioRegistrado[] {
  const cambios: CambioRegistrado[] = [];
  for (const campo of campos) {
    if (CAMPO_SECRETO.test(campo)) continue;
    if (antes[campo] !== despues[campo]) cambios.push(cambio(campo, antes[campo], despues[campo]));
  }
  return cambios;
}
