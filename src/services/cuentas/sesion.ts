/**
 * Acceso al sistema (Fase 2, paso 10A; propuesta §4, §8.3 y plan §9, Fase 3).
 *
 * `iniciarSesion` y `accesoRapido` leen las cuentas de `data/` (ya no hay cuentas de demostración aparte):
 *   - El correo se compara sin distinguir mayúsculas ni espacios, igual que al crear y editar cuentas.
 *   - Primero se comprueban las credenciales y **después** el estado: una cuenta `INACTIVO` (práctica finalizada o
 *     supervisor desactivado) no entra, pero solo se le dice que está inactiva si la contraseña era la correcta; con
 *     una contraseña falsa el mensaje es el mismo de siempre y no revela que la cuenta existe.
 *   - Con un acceso correcto se llama a `emitirAvisosFinDePractica` (F6-A: el prototipo no tiene un proceso
 *     programado). Va aparte, con demora 0 para no sumar otra espera, y si falla el acceso sigue adelante.
 *   - No se registra el inicio de sesión (§5.7) y el resultado nunca lleva la contraseña.
 */

import { z } from 'zod';
import { ID_ADMIN, ID_PRACTICANTE_DEMO, ID_SUPERVISOR_DEMO } from '@/data';
import { ROLES, type Id, type Rol, type Usuario } from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { emitirAvisosFinDePractica } from '../practicantes/avisoFin';
import { exito, fallo, validarEntrada, type Resultado } from '../resultado';
import { ejecutarConsulta } from '../transaccional';
import { normalizarCorreo } from './validaciones';

/** Lo que la sesión guarda de una persona: sin contraseña, estado ni celular. */
export interface SesionUsuario {
  id: Id;
  nombre: string;
  correo: string;
  rol: Rol;
  debe_cambiar_contrasena: boolean;
}

export function aSesionUsuario(usuario: Usuario): SesionUsuario {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    debe_cambiar_contrasena: usuario.debe_cambiar_contrasena,
  };
}

const esquemaCredenciales = z.object({ correo: z.string(), contrasena: z.string() });
const esquemaAccesoRapido = z.object({ rol: z.enum(ROLES) });

export type EntradaIniciarSesion = z.input<typeof esquemaCredenciales>;
export type EntradaAccesoRapido = z.input<typeof esquemaAccesoRapido>;

/** Las cuentas de demostración de la semilla (plan §8: «Entrar como…»). */
const CUENTA_RAPIDA: Readonly<Record<Rol, Id>> = {
  ADMINISTRADOR: ID_ADMIN,
  SUPERVISOR: ID_SUPERVISOR_DEMO,
  PRACTICANTE: ID_PRACTICANTE_DEMO,
};

/** Tras un acceso correcto: el aviso previo de fin de práctica. Nunca hace fallar el acceso. */
async function avisarFinDePractica(entorno: Entorno): Promise<void> {
  const avisos = await emitirAvisosFinDePractica({ ...entorno, demoraMs: 0 });
  if (!avisos.ok)
    console.warn('SIGEP: no se pudieron emitir los avisos de fin de práctica.', avisos);
}

export async function iniciarSesion(
  entrada: EntradaIniciarSesion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<SesionUsuario>> {
  const resultado = await ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaCredenciales, entrada);
    if (!valida.ok) return valida;
    const correo = normalizarCorreo(valida.valor.correo);
    const { contrasena } = valida.valor;

    const cuenta =
      correo === '' || contrasena === ''
        ? undefined
        : datos.usuarios.find((u) => normalizarCorreo(u.correo) === correo);
    if (cuenta === undefined || cuenta.contrasena !== contrasena) {
      return fallo('CREDENCIALES_INVALIDAS');
    }
    if (cuenta.estado !== 'ACTIVO') return fallo('USUARIO_INACTIVO');
    return exito(aSesionUsuario(cuenta));
  });
  if (resultado.ok) await avisarFinDePractica(entorno);
  return resultado;
}

export async function accesoRapido(
  entrada: EntradaAccesoRapido,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<SesionUsuario>> {
  const resultado = await ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaAccesoRapido, entrada);
    if (!valida.ok) return valida;
    const idCuenta = CUENTA_RAPIDA[valida.valor.rol];
    const cuenta = datos.usuarios.find((u) => u.id === idCuenta);
    if (cuenta === undefined) return fallo('NO_ENCONTRADO');
    if (cuenta.estado !== 'ACTIVO') return fallo('USUARIO_INACTIVO');
    return exito(aSesionUsuario(cuenta));
  });
  if (resultado.ok) await avisarFinDePractica(entorno);
  return resultado;
}
