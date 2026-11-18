/**
 * Servicios de supervisores (Fase 2, paso 8B; propuesta §5.3 y §8.3).
 *
 *   - crear: el supervisor no nace de una postulación, lo crea el Administrador con nombre, correo y celular.
 *     Recibe una contraseña temporal que se devuelve **una sola vez** y nunca va al historial.
 *   - editar: solo el nombre y el correo institucional (una credencial que entrega la empresa); el supervisor edita
 *     lo demás desde su perfil. Si cambia el correo, cambia también su usuario de acceso.
 *   - desactivar: se bloquea mientras tenga proyectos activos o en pausa (el error trae cuántos); primero se
 *     reasignan (paso 9). Reactivar lo devuelve a «Activo». Un supervisor nunca se elimina.
 *
 * El correo es único entre todas las cuentas, sin distinguir mayúsculas ni espacios. Ninguna de estas
 * acciones notifica a nadie (§8.1). Orden: Zod → actor → persona → regla de `domain/` → reglas propias →
 * una sola escritura.
 */

import { z } from 'zod';
import {
  desactivarSupervisor as reglaDesactivarSupervisor,
  puede,
  reactivarSupervisor as reglaReactivarSupervisor,
  type Id,
  type Supervisor,
  type Usuario,
} from '@/domain';
import { obtenerActor } from '../actor';
import { denegarCicloVida } from '../cicloVida';
import { esquemaCelular, esquemaCorreo, correoEnUso } from '../cuentas/validaciones';
import { ENTORNO, type Entorno } from '../entorno';
import { etiquetaUsuario } from '../etiquetas';
import { autorDe, cambio, crearEvento, diferencias } from '../historial';
import { cargarPersona } from '../practicantes/comun';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';

const esquemaNombre = z.string().trim().min(1, 'Escribe el nombre.');

const esquemaCrear = z.object({
  idActor: esquemaId,
  nombre: esquemaNombre,
  correo: esquemaCorreo,
  celular: esquemaCelular,
});

const esquemaEditar = z
  .object({
    idActor: esquemaId,
    idSupervisor: esquemaId,
    nombre: esquemaNombre.optional(),
    correo: esquemaCorreo.optional(),
  })
  .refine((v) => v.nombre !== undefined || v.correo !== undefined, {
    message: 'Indica el nombre o el correo que quieres cambiar.',
  });

const esquemaEstado = z.object({ idActor: esquemaId, idSupervisor: esquemaId });

export type EntradaCrearSupervisor = z.input<typeof esquemaCrear>;
export type EntradaEditarSupervisor = z.input<typeof esquemaEditar>;
export type EntradaCambiarEstadoSupervisor = z.input<typeof esquemaEstado>;

export interface SupervisorCreado {
  id_usuario: Id;
  /** Se muestra una sola vez; el Administrador la entrega por fuera del sistema (§5.3, §8.3). */
  contrasena_temporal: string;
}

const CORREO_REPETIDO = 'Ya existe una cuenta con ese correo.';

const elemento = (u: Pick<Usuario, 'id' | 'nombre'>) =>
  ({ tipo: 'USUARIO', id: u.id, etiqueta: etiquetaUsuario(u) }) as const;

// ── Crear ────────────────────────────────────────────────────────────────────────────────────

export function crearSupervisor(
  entrada: EntradaCrearSupervisor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<SupervisorCreado>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaCrear, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;
    const permiso = puede(actor.valor, 'CREAR_SUPERVISOR', {});
    if (!permiso.permitido) return denegar(permiso);

    if (correoEnUso(datos.usuarios, v.correo)) {
      return fallo('CORREO_YA_REGISTRADO', CORREO_REPETIDO, { correo: CORREO_REPETIDO });
    }

    const contrasena_temporal = e.generarContrasena();
    const usuario: Usuario = {
      id: e.generarId('usr'),
      nombre: v.nombre,
      correo: v.correo,
      celular: v.celular,
      contrasena: contrasena_temporal,
      rol: 'SUPERVISOR',
      estado: 'ACTIVO',
      debe_cambiar_contrasena: true,
      fecha_alta: marca.ahora,
    };
    // Discord y GitHub nacen vacíos: los completa el propio supervisor en Mi perfil.
    const detalle: Supervisor = { id_usuario: usuario.id, discord: null, cuenta_github: null };
    const evento = crearEvento(
      {
        autor: autorDe(actor.valor.id),
        tipo_accion: 'SUPERVISOR_CREADO',
        elemento: elemento(usuario),
        id_proyecto: null,
        cambios: [cambio('nombre', null, usuario.nombre), cambio('correo', null, usuario.correo)],
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: { id_usuario: usuario.id, contrasena_temporal },
      cambios: conEfectos(
        datos,
        {
          usuarios: [...datos.usuarios, usuario],
          supervisores: [...datos.supervisores, detalle],
        },
        { eventos: [evento] },
      ),
    };
  });
}

// ── Editar ───────────────────────────────────────────────────────────────────────────────────

export function editarSupervisor(
  entrada: EntradaEditarSupervisor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Usuario>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEditar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;
    const objetivo = cargarPersona(datos, v.idSupervisor);
    if (!objetivo.ok) return objetivo;

    const permiso = puede(actor.valor, 'EDITAR_CREDENCIAL_SUPERVISOR', {
      usuario_objetivo: objetivo.valor,
    });
    if (!permiso.permitido) return denegar(permiso);

    if (v.correo !== undefined && correoEnUso(datos.usuarios, v.correo, objetivo.valor.id)) {
      return fallo('CORREO_YA_REGISTRADO', CORREO_REPETIDO, { correo: CORREO_REPETIDO });
    }

    const nuevo: Usuario = {
      ...objetivo.valor,
      nombre: v.nombre ?? objetivo.valor.nombre,
      correo: v.correo ?? objetivo.valor.correo,
    };
    const cambios = diferencias(objetivo.valor, nuevo, ['nombre', 'correo']);
    if (cambios.length === 0) return fallo('SIN_CAMBIOS');

    const evento = crearEvento(
      {
        autor: autorDe(actor.valor.id),
        tipo_accion: 'SUPERVISOR_EDITADO',
        elemento: elemento(nuevo),
        id_proyecto: null,
        cambios,
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nuevo,
      cambios: conEfectos(
        datos,
        { usuarios: datos.usuarios.map((u) => (u.id === nuevo.id ? nuevo : u)) },
        { eventos: [evento] },
      ),
    };
  });
}

// ── Desactivar y reactivar ───────────────────────────────────────────────────────────────────

export function desactivarSupervisor(
  entrada: EntradaCambiarEstadoSupervisor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Usuario>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEstado, entrada);
    if (!valida.ok) return valida;
    const actor = obtenerActor(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const objetivo = cargarPersona(datos, valida.valor.idSupervisor);
    if (!objetivo.ok) return objetivo;

    // Quién, estado y proyectos pendientes (con la cantidad): todo en `domain/`.
    const regla = reglaDesactivarSupervisor(actor.valor, objetivo.valor, datos.proyectos);
    if (!regla.ok) return denegarCicloVida(regla);

    const nuevo: Usuario = { ...objetivo.valor, estado: 'INACTIVO' };
    const evento = crearEvento(
      {
        autor: autorDe(actor.valor.id),
        tipo_accion: 'SUPERVISOR_DESACTIVADO',
        elemento: elemento(nuevo),
        id_proyecto: null,
        cambios: [cambio('estado', objetivo.valor.estado, nuevo.estado)],
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nuevo,
      cambios: conEfectos(
        datos,
        { usuarios: datos.usuarios.map((u) => (u.id === nuevo.id ? nuevo : u)) },
        { eventos: [evento] },
      ),
    };
  });
}

export function reactivarSupervisor(
  entrada: EntradaCambiarEstadoSupervisor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Usuario>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEstado, entrada);
    if (!valida.ok) return valida;
    const actor = obtenerActor(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const objetivo = cargarPersona(datos, valida.valor.idSupervisor);
    if (!objetivo.ok) return objetivo;

    const regla = reglaReactivarSupervisor(actor.valor, objetivo.valor);
    if (!regla.ok) return denegarCicloVida(regla);

    const nuevo: Usuario = { ...objetivo.valor, estado: 'ACTIVO' };
    const evento = crearEvento(
      {
        autor: autorDe(actor.valor.id),
        tipo_accion: 'SUPERVISOR_REACTIVADO',
        elemento: elemento(nuevo),
        id_proyecto: null,
        cambios: [cambio('estado', objetivo.valor.estado, nuevo.estado)],
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nuevo,
      cambios: conEfectos(
        datos,
        { usuarios: datos.usuarios.map((u) => (u.id === nuevo.id ? nuevo : u)) },
        { eventos: [evento] },
      ),
    };
  });
}
