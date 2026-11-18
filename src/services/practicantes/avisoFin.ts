/**
 * Aviso previo de fin de práctica (Fase 2, paso 8B; propuesta §5.2 y §8.1; decisión F6-A).
 *
 * Es un proceso del **sistema** (autor `SISTEMA`, sin actor): el día en que a una práctica activa le faltan
 * **exactamente** `PRACTICA_AVISO_FIN_DIAS` días (`situacionFinPractica`), avisa una sola vez
 * `PRACTICA_PROXIMA_A_FINALIZAR` al practicante, a los supervisores de sus proyectos vigentes y a los
 * administradores activos. Un aviso no se repite: si ya existe uno del mismo tipo para esa persona con el mismo
 * mensaje (que lleva la fecha de fin), no se vuelve a crear; si la fecha de fin cambia, el mensaje cambia y el
 * aviso puede darse de nuevo. Solo se avisa a cuentas activas.
 *
 * El prototipo no tiene un proceso programado: el paso 10 lo llamará al iniciar sesión. Si ese día exacto nadie lo
 * ejecuta, el aviso se pierde (riesgo aceptado en F6-A). Cuando no hay nada nuevo que avisar no escribe nada.
 */

import { situacionFinPractica, type Id, type Notificacion } from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { AUTOR_SISTEMA } from '../historial';
import { crearNotificaciones } from '../notificaciones';
import { denegar, fallo, type Resultado } from '../resultado';
import { conEfectos, ejecutarServicio } from '../transaccional';

export interface AvisosFinDePractica {
  /** Los practicantes a quienes se les dio el aviso en esta ejecución. */
  practicantes_avisados: Id[];
}

export function emitirAvisosFinDePractica(
  entorno: Entorno = ENTORNO,
): Promise<Resultado<AvisosFinDePractica>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const parametro = datos.parametros.find((p) => p.clave === 'PRACTICA_AVISO_FIN_DIAS')?.valor;
    if (parametro?.tipo !== 'numero') return fallo('CONFIGURACION_INVALIDA');
    const avisoDias = parametro.valor;

    const activos = new Set(datos.usuarios.filter((u) => u.estado === 'ACTIVO').map((u) => u.id));
    const administradores = datos.usuarios
      .filter((u) => u.rol === 'ADMINISTRADOR' && u.estado === 'ACTIVO')
      .map((u) => u.id);

    const avisos: Notificacion[] = [];
    const avisados: Id[] = [];

    for (const practicante of datos.practicantes) {
      const persona = datos.usuarios.find((u) => u.id === practicante.id_usuario);
      if (persona === undefined || persona.estado !== 'ACTIVO') continue;

      const situacion = situacionFinPractica(
        practicante.fecha_fin_prevista,
        marca.ahora,
        avisoDias,
      );
      if (!situacion.ok) return denegar(situacion);
      if (situacion.dias_restantes !== avisoDias) continue;

      const mensaje = `La práctica de ${persona.nombre} finaliza el ${practicante.fecha_fin_prevista}.`;
      const yaAvisado = datos.notificaciones.some(
        (n) =>
          n.tipo === 'PRACTICA_PROXIMA_A_FINALIZAR' &&
          n.elemento.tipo === 'USUARIO' &&
          n.elemento.id === persona.id &&
          n.mensaje === mensaje,
      );
      if (yaAvisado) continue;

      const supervisores = datos.asignaciones
        .filter((a) => a.id_practicante === persona.id && a.fecha_baja === null)
        .flatMap((a) => {
          const proyecto = datos.proyectos.find((p) => p.id === a.id_proyecto);
          return proyecto === undefined ? [] : [proyecto.id_supervisor];
        });
      const destinatarios = [persona.id, ...supervisores, ...administradores].filter((id) =>
        activos.has(id),
      );

      avisos.push(
        ...crearNotificaciones(
          {
            autor: AUTOR_SISTEMA,
            destinatarios,
            tipo: 'PRACTICA_PROXIMA_A_FINALIZAR',
            mensaje,
            elemento: { tipo: 'USUARIO', id: persona.id },
          },
          datos.usuarios,
          marca,
          e.generarId,
        ),
      );
      avisados.push(persona.id);
    }

    return {
      ok: true,
      valor: { practicantes_avisados: avisados },
      cambios: avisos.length === 0 ? null : conEfectos(datos, {}, { notificaciones: avisos }),
    };
  });
}
