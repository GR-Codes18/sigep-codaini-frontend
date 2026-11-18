/**
 * Decisiones del Administrador sobre una postulación (Fase 2, paso 7A; propuesta §5.1 y §8.1).
 *
 *   - aprobar: PENDIENTE → APROBADA y, en la misma operación, crea la cuenta del practicante con una
 *     contraseña temporal. La asignación a un proyecto es otra acción (módulos Practicantes y Proyectos).
 *   - rechazar: PENDIENTE → RECHAZADA, con motivo obligatorio.
 *   - reconsiderar: RECHAZADA → PENDIENTE, con nota obligatoria; la evaluación anterior se conserva.
 *
 * Ninguna decisión notifica a nadie (§8.1: el postulante no tiene cuenta): solo deja eventos del
 * historial. La contraseña temporal nunca se registra en el historial; vuelve una sola vez en el
 * resultado de `aprobarPostulacion`.
 */

import { z } from 'zod';
import {
  fechaFinPrevista,
  puede,
  puedeDecidirPostulacion,
  type AccionDecisionPostulacion,
  type AccionPermiso,
  type Fecha,
  type Id,
  type Postulante,
  type Practicante,
  type TipoAccionHistorial,
  type Usuario,
} from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { etiquetaPostulante, etiquetaUsuario } from '../etiquetas';
import { autorDe, cambio, crearEvento } from '../historial';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId, exigirTexto, textoGuardado } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import { cargarContextoPostulacion, esquemaDecision, leerDuracionMeses } from './comun';

const esquemaAprobar = z.object({ idActor: esquemaId, idPostulante: esquemaId });

export type EntradaAprobarPostulacion = z.input<typeof esquemaAprobar>;
export type EntradaRechazarPostulacion = {
  idActor: Id;
  idPostulante: Id;
  motivo?: string;
};
export type EntradaReconsiderarPostulacion = {
  idActor: Id;
  idPostulante: Id;
  nota?: string;
};

export interface PostulacionAprobada {
  id_usuario: Id;
  /** Se muestra una sola vez; el Administrador la entrega por fuera del sistema (§5.1, §8.3). */
  contrasena_temporal: string;
  fecha_ingreso: Fecha;
  fecha_fin_prevista: Fecha;
}

function reemplazarPostulante(postulantes: readonly Postulante[], nuevo: Postulante): Postulante[] {
  return postulantes.map((p) => (p.id === nuevo.id ? nuevo : p));
}

const normalizarCorreo = (correo: string) => correo.trim().toLowerCase();

// ── Aprobar ──────────────────────────────────────────────────────────────────────────────────

export function aprobarPostulacion(
  entrada: EntradaAprobarPostulacion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<PostulacionAprobada>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaAprobar, entrada);
    if (!valida.ok) return valida;

    const contexto = cargarContextoPostulacion(
      datos,
      valida.valor.idActor,
      valida.valor.idPostulante,
    );
    if (!contexto.ok) return contexto;
    const { actor, postulante } = contexto.valor;

    const permiso = puede(actor, 'APROBAR_POSTULACION', {});
    if (!permiso.permitido) return denegar(permiso);
    const decision = puedeDecidirPostulacion(postulante.estado, 'APROBAR');
    if (!decision.ok) return denegar(decision);

    const correo = postulante.correo.trim();
    if (datos.usuarios.some((u) => normalizarCorreo(u.correo) === normalizarCorreo(correo))) {
      return fallo('CORREO_YA_REGISTRADO');
    }

    // La fecha de ingreso es el día de la aprobación en hora de Perú; el fin sale de Configuración.
    const meses = leerDuracionMeses(datos);
    if (!meses.ok) return meses;
    const fecha_ingreso = marca.hoy;
    const fin = fechaFinPrevista(fecha_ingreso, meses.valor);
    if (!fin.ok) return denegar(fin);

    const contrasena_temporal = e.generarContrasena();
    const usuario: Usuario = {
      id: e.generarId('usr'),
      nombre: postulante.nombre,
      correo,
      celular: postulante.celular,
      contrasena: contrasena_temporal,
      rol: 'PRACTICANTE',
      estado: 'ACTIVO',
      debe_cambiar_contrasena: true,
      fecha_alta: marca.ahora,
    };
    const practicante: Practicante = {
      id_usuario: usuario.id,
      // Discord, GitHub y disponibilidad nacen vacíos: los completa la persona en Mi perfil.
      discord: null,
      cuenta_github: null,
      disponibilidad_horaria: null,
      id_area_tecnica: postulante.id_area_tecnica,
      id_especialidad: postulante.id_especialidad,
      fecha_ingreso,
      fecha_fin_prevista: fin.fecha,
      id_postulante: postulante.id,
    };
    const aprobada: Postulante = { ...postulante, estado: decision.estado_nuevo };

    const eventos = [
      crearEvento(
        {
          autor: autorDe(actor.id),
          tipo_accion: 'POSTULACION_APROBADA',
          elemento: {
            tipo: 'POSTULANTE',
            id: postulante.id,
            etiqueta: etiquetaPostulante(postulante),
          },
          id_proyecto: null,
          cambios: [cambio('estado', postulante.estado, aprobada.estado)],
        },
        marca,
        e.generarId,
      ),
      crearEvento(
        {
          autor: autorDe(actor.id),
          tipo_accion: 'PRACTICANTE_CREADO',
          elemento: { tipo: 'USUARIO', id: usuario.id, etiqueta: etiquetaUsuario(usuario) },
          id_proyecto: null,
          cambios: [
            cambio('fecha_ingreso', null, practicante.fecha_ingreso),
            cambio('fecha_fin_prevista', null, practicante.fecha_fin_prevista),
          ],
        },
        marca,
        e.generarId,
      ),
    ];

    return {
      ok: true,
      valor: {
        id_usuario: usuario.id,
        contrasena_temporal,
        fecha_ingreso,
        fecha_fin_prevista: fin.fecha,
      },
      cambios: conEfectos(
        datos,
        {
          postulantes: reemplazarPostulante(datos.postulantes, aprobada),
          usuarios: [...datos.usuarios, usuario],
          practicantes: [...datos.practicantes, practicante],
        },
        { eventos },
      ),
    };
  });
}

// ── Rechazar y reconsiderar (comparten forma: un texto obligatorio) ──────────────────────────

function decidirConTexto(
  accion: Extract<AccionDecisionPostulacion, 'RECHAZAR' | 'RECONSIDERAR'>,
  permisoAccion: Extract<AccionPermiso, 'RECHAZAR_POSTULACION' | 'RECONSIDERAR_POSTULACION'>,
  tipo_accion: Extract<TipoAccionHistorial, 'POSTULACION_RECHAZADA' | 'POSTULACION_RECONSIDERADA'>,
  entrada: { idActor: Id; idPostulante: Id; texto?: string },
  entorno: Entorno,
): Promise<Resultado<Postulante>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaDecision, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;

    const contexto = cargarContextoPostulacion(datos, v.idActor, v.idPostulante);
    if (!contexto.ok) return contexto;
    const { actor, postulante } = contexto.valor;

    const permiso = puede(actor, permisoAccion, {});
    if (!permiso.permitido) return denegar(permiso);
    const decision = puedeDecidirPostulacion(postulante.estado, accion);
    if (!decision.ok) return denegar(decision);
    const sinTexto = exigirTexto(permiso.exige_texto, v.texto);
    if (sinTexto !== null) return sinTexto;

    const nueva: Postulante = { ...postulante, estado: decision.estado_nuevo };
    const evento = crearEvento(
      {
        autor: autorDe(actor.id),
        tipo_accion,
        elemento: {
          tipo: 'POSTULANTE',
          id: postulante.id,
          etiqueta: etiquetaPostulante(postulante),
        },
        id_proyecto: null,
        cambios: [cambio('estado', postulante.estado, nueva.estado)],
        nota: textoGuardado(v.texto),
      },
      marca,
      e.generarId,
    );

    return {
      ok: true,
      valor: nueva,
      cambios: conEfectos(
        datos,
        { postulantes: reemplazarPostulante(datos.postulantes, nueva) },
        { eventos: [evento] },
      ),
    };
  });
}

export function rechazarPostulacion(
  entrada: EntradaRechazarPostulacion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Postulante>> {
  return decidirConTexto(
    'RECHAZAR',
    'RECHAZAR_POSTULACION',
    'POSTULACION_RECHAZADA',
    { idActor: entrada.idActor, idPostulante: entrada.idPostulante, texto: entrada.motivo },
    entorno,
  );
}

export function reconsiderarPostulacion(
  entrada: EntradaReconsiderarPostulacion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Postulante>> {
  return decidirConTexto(
    'RECONSIDERAR',
    'RECONSIDERAR_POSTULACION',
    'POSTULACION_RECONSIDERADA',
    { idActor: entrada.idActor, idPostulante: entrada.idPostulante, texto: entrada.nota },
    entorno,
  );
}
