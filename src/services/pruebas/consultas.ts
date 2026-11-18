/**
 * Ayudas de prueba para las consultas de `services/consultas/`. **Solo las importan los tests.**
 */

import type { Id } from '@/domain';
import type { Resultado } from '../resultado';
import type { PruebaPreparada } from './almacen';

export function valor<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(`${resultado.codigo}: ${resultado.mensaje}`);
  return resultado.valor;
}

export function codigo(resultado: Resultado<unknown>): string {
  if (resultado.ok) throw new Error('Se esperaba un error y la consulta tuvo éxito.');
  return resultado.codigo;
}

export const ids = (filas: readonly { id: Id }[]) => filas.map((f) => f.id);

export function desactivar(prueba: PruebaPreparada, idUsuario: Id) {
  prueba.modificar((d) => ({
    usuarios: d.usuarios.map((u) => (u.id === idUsuario ? { ...u, estado: 'INACTIVO' } : u)),
  }));
}

/** Un supervisor recién creado, sin proyectos. */
export function crearSupervisorSinProyectos(prueba: PruebaPreparada): Id {
  prueba.modificar((d) => ({
    usuarios: [
      ...d.usuarios,
      {
        id: 'sup-nuevo',
        nombre: 'Supervisor Nuevo',
        correo: 'nuevo@codaini.test',
        celular: '900000000',
        contrasena: 'temporal-123',
        rol: 'SUPERVISOR',
        estado: 'ACTIVO',
        debe_cambiar_contrasena: true,
        fecha_alta: '2026-11-16T15:00:00.000Z',
      },
    ],
    supervisores: [
      ...d.supervisores,
      { id_usuario: 'sup-nuevo', discord: null, cuenta_github: null },
    ],
  }));
  return 'sup-nuevo';
}
