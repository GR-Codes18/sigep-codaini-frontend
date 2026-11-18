/**
 * Semilla de datos de demostración (plan §8).
 *
 * `crearSemilla(ahora)` genera todo a partir de un único «ahora»: las fechas son relativas a
 * hoy («hace 3 días») y se cortan en la hora de Perú, para que la demostración nunca se vea
 * vencida. Con el mismo `ahora` produce siempre los mismos datos (IDs fijos y legibles).
 *
 * Contraseñas de DEMOSTRACIÓN: todas las cuentas usan `CONTRASENA_DEMO` (`demo12345`); los
 * accesos rápidos son `admin@codaini.demo`, `supervisor@codaini.demo` y
 * `practicante@codaini.demo`. No son secretos reales.
 */

import type { Asignacion, Id, InsightRevision, Practicante, Proyecto } from '@/domain';
import { AREAS, crearCriterios, ESPECIALIDADES } from './semilla/catalogos';
import { crearParametros } from './parametros';
import { crearPersonas, ID_ADMIN } from './semilla/personas';
import { crearPostulaciones } from './semilla/postulaciones';
import { crearProyectos } from './semilla/proyectos';
import { crearRegistro } from './semilla/registro';
import { crearReloj, masMinutos, sumarDias, type Reloj } from './semilla/reloj';
import { crearTareas } from './semilla/tareas';
import type { Registro } from './semilla/registro';
import type { DatosAlmacen } from './tipos';

export { CONTRASENA_DEMO } from './semilla/personas';

/** Días de anticipación del aviso de fin de práctica (Configuración, §5.8). */
function avisoDias(parametros: DatosAlmacen['parametros']): number {
  const valor = parametros.find((p) => p.clave === 'PRACTICA_AVISO_FIN_DIAS')?.valor;
  if (valor?.tipo !== 'numero') throw new Error('Falta PRACTICA_AVISO_FIN_DIAS.');
  return valor.valor;
}

/**
 * «Práctica próxima a finalizar»: la emite el sistema una sola vez, el día en que faltan
 * `avisoDias` para la fecha de fin, a la persona, a los supervisores de los proyectos que
 * tenía ese día y al administrador. Solo se emiten los avisos que ya ocurrieron.
 */
function avisosFinDePractica(
  reloj: Reloj,
  registro: Registro,
  datos: {
    usuarios: DatosAlmacen['usuarios'];
    practicantes: readonly Practicante[];
    asignaciones: readonly Asignacion[];
    proyectos: readonly Proyecto[];
    aviso: number;
  },
) {
  for (const practicante of datos.practicantes) {
    const dia = sumarDias(practicante.fecha_fin_prevista, -datos.aviso);
    if (dia >= reloj.hoy) continue; // todavía no toca
    const supervisores = datos.asignaciones
      .filter(
        (a) =>
          a.id_practicante === practicante.id_usuario &&
          a.fecha_alta <= dia &&
          (a.fecha_baja === null || a.fecha_baja > dia),
      )
      .map((a) => datos.proyectos.find((p) => p.id === a.id_proyecto)?.id_supervisor)
      .filter((id): id is Id => id !== undefined);
    const nombre = datos.usuarios.find((u) => u.id === practicante.id_usuario)?.nombre ?? '';
    registro.notificar({
      // 08:00 en Perú.
      fecha: `${dia}T13:00:00.000Z`,
      autor: { tipo: 'SISTEMA' },
      destinatarios: [practicante.id_usuario, ...supervisores, ID_ADMIN],
      tipo: 'PRACTICA_PROXIMA_A_FINALIZAR',
      mensaje: `La práctica de ${nombre} finaliza el ${practicante.fecha_fin_prevista}.`,
      elemento: { tipo: 'USUARIO', id: practicante.id_usuario },
    });
  }
}

export function crearSemilla(ahora: Date = new Date()): DatosAlmacen {
  const reloj = crearReloj(ahora);
  const registro = crearRegistro();
  const parametros = crearParametros();
  const criterios = crearCriterios();

  const personas = crearPersonas(reloj, registro, parametros);
  const base = crearProyectos(reloj, registro, personas.usuarios);
  const tareas = crearTareas(reloj, registro, base.proyectos, personas.usuarios);
  const postulaciones = crearPostulaciones(reloj, registro, {
    usuarios: personas.usuarios,
    practicantes: personas.practicantes,
    aprobaciones: personas.aprobaciones,
    criterios,
    parametros,
  });

  avisosFinDePractica(reloj, registro, {
    usuarios: personas.usuarios,
    practicantes: personas.practicantes,
    asignaciones: base.asignaciones,
    proyectos: base.proyectos,
    aviso: avisoDias(parametros),
  });

  // El administrador avisa a un practicante inactivo desde Reportes (botón «Notificar»).
  registro.notificar({
    fecha: reloj.hace([1, 2]),
    autor: { tipo: 'USUARIO', id_usuario: ID_ADMIN },
    destinatarios: ['usr-pra-05'],
    tipo: 'NOTIFICACION_DESDE_INSIGHT',
    mensaje:
      'Hace más de dos semanas que no registras actividad. Si necesitas ayuda, avisa a tu supervisor.',
    elemento: { tipo: 'USUARIO', id: 'usr-pra-05' },
  });

  // Una revisión del administrador: «revisado» es independiente por persona, así que el
  // supervisor sigue viendo este insight.
  const revisiones: InsightRevision[] = [
    {
      id: 'rev-01',
      tipo_regla: 'CARGA_DESBALANCEADA',
      elemento: { tipo: 'USUARIO', id: 'usr-pra-04' },
      severidad_al_revisar: 'ATENCION',
      fecha: masMinutos(reloj.hace([1, 4]), 0),
      id_usuario: ID_ADMIN,
      nota: 'Mateo asumió más tareas por acuerdo con el supervisor.',
    },
  ];

  const { historial, notificaciones } = registro.cerrar(reloj.ahora);

  return {
    usuarios: personas.usuarios,
    practicantes: personas.practicantes,
    supervisores: personas.supervisores,
    proyectos: base.proyectos.map((p) => ({
      ...p,
      ultimo_numero_tarea: tareas.ultimoNumero.get(p.id) ?? 0,
    })),
    enlaces_proyecto: base.enlaces,
    asignaciones: base.asignaciones,
    tareas: tareas.tareas,
    postulantes: postulaciones.postulantes,
    areas_tecnicas: AREAS,
    especialidades: ESPECIALIDADES,
    criterios,
    evaluaciones: postulaciones.evaluaciones,
    detalles_evaluacion: postulaciones.detalles,
    historial,
    notificaciones,
    revisiones_insight: revisiones,
    parametros,
  };
}
