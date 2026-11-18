/**
 * Editar los datos de la práctica de un practicante (Fase 2, paso 8A; propuesta §5.2).
 *
 * El Administrador cambia la especialidad, la fecha de ingreso y la fecha de fin prevista (los datos
 * personales los edita la propia persona). Decisión F5-A:
 *   - la especialidad puede ser **cualquiera que esté activa** y el área del practicante pasa a ser la de la
 *     especialidad elegida;
 *   - las fechas son de calendario (`AAAA-MM-DD` reales) y la de fin no puede ser anterior a la de ingreso
 *     (se comprueba con los valores que quedarían, también si solo se cambia una);
 *   - el servicio **nunca recalcula** la fecha de fin por su cuenta: si cambia el ingreso, la pantalla puede
 *     proponer una con `fechaFinPrevista` y mandar las dos.
 *
 * Se puede editar también a un practicante finalizado (corregir el historial). No avisa a nadie (§8.1).
 */

import { z } from 'zod';
import { puede, type Practicante } from '@/domain';
import { obtenerActor } from '../actor';
import { ENTORNO, type Entorno } from '../entorno';
import { etiquetaUsuario } from '../etiquetas';
import { autorDe, cambio, crearEvento } from '../historial';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esFechaDeCalendario, esquemaId } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import { cargarPersona } from './comun';

const esquemaFecha = z.string().refine(esFechaDeCalendario, 'La fecha no es válida (AAAA-MM-DD).');

const esquemaDatosPractica = z
  .object({
    idActor: esquemaId,
    idPracticante: esquemaId,
    id_especialidad: esquemaId.optional(),
    fecha_ingreso: esquemaFecha.optional(),
    fecha_fin_prevista: esquemaFecha.optional(),
  })
  .refine(
    (v) =>
      v.id_especialidad !== undefined ||
      v.fecha_ingreso !== undefined ||
      v.fecha_fin_prevista !== undefined,
    { message: 'Indica al menos un dato de la práctica para cambiar.' },
  );

export type EntradaEditarDatosPractica = z.input<typeof esquemaDatosPractica>;

export function editarDatosPractica(
  entrada: EntradaEditarDatosPractica,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<Practicante>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaDatosPractica, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;
    const persona = cargarPersona(datos, v.idPracticante);
    if (!persona.ok) return persona;

    const permiso = puede(actor.valor, 'EDITAR_DATOS_PRACTICA', {
      usuario_objetivo: persona.valor,
    });
    if (!permiso.permitido) return denegar(permiso);

    const antes = datos.practicantes.find((p) => p.id_usuario === persona.valor.id);
    if (antes === undefined) return fallo('NO_ENCONTRADO');

    // La especialidad: debe existir y estar activa; el área sigue a la especialidad.
    let especialidad = datos.especialidades.find((x) => x.id === antes.id_especialidad);
    if (v.id_especialidad !== undefined && v.id_especialidad !== antes.id_especialidad) {
      const nueva = datos.especialidades.find((x) => x.id === v.id_especialidad);
      if (nueva === undefined) {
        return fallo('NO_ENCONTRADO', undefined, {
          id_especialidad: 'No se encontró la especialidad.',
        });
      }
      if (!nueva.activo) {
        return fallo('ESPECIALIDAD_INACTIVA', undefined, {
          id_especialidad: 'La especialidad está inactiva.',
        });
      }
      especialidad = nueva;
    }

    const despues: Practicante = {
      ...antes,
      id_especialidad: especialidad?.id ?? antes.id_especialidad,
      id_area_tecnica: especialidad?.id_area_tecnica ?? antes.id_area_tecnica,
      fecha_ingreso: v.fecha_ingreso ?? antes.fecha_ingreso,
      fecha_fin_prevista: v.fecha_fin_prevista ?? antes.fecha_fin_prevista,
    };
    // Las fechas `AAAA-MM-DD` se ordenan como texto.
    if (despues.fecha_fin_prevista < despues.fecha_ingreso) {
      return fallo('FIN_ANTES_DE_INGRESO', undefined, {
        fecha_fin_prevista: 'No puede ser anterior a la fecha de ingreso.',
      });
    }

    const nombreEspecialidad = (id: string) =>
      datos.especialidades.find((x) => x.id === id)?.nombre;
    const nombreArea = (id: string) => datos.areas_tecnicas.find((a) => a.id === id)?.nombre;
    const cambios = [
      ...(despues.id_especialidad !== antes.id_especialidad
        ? [
            cambio(
              'especialidad',
              nombreEspecialidad(antes.id_especialidad),
              nombreEspecialidad(despues.id_especialidad),
            ),
          ]
        : []),
      ...(despues.id_area_tecnica !== antes.id_area_tecnica
        ? [cambio('area', nombreArea(antes.id_area_tecnica), nombreArea(despues.id_area_tecnica))]
        : []),
      ...(despues.fecha_ingreso !== antes.fecha_ingreso
        ? [cambio('fecha_ingreso', antes.fecha_ingreso, despues.fecha_ingreso)]
        : []),
      ...(despues.fecha_fin_prevista !== antes.fecha_fin_prevista
        ? [cambio('fecha_fin_prevista', antes.fecha_fin_prevista, despues.fecha_fin_prevista)]
        : []),
    ];
    if (cambios.length === 0) return fallo('SIN_CAMBIOS');

    const evento = crearEvento(
      {
        autor: autorDe(actor.valor.id),
        tipo_accion: 'PRACTICANTE_DATOS_PRACTICA_EDITADOS',
        elemento: {
          tipo: 'USUARIO',
          id: persona.valor.id,
          etiqueta: etiquetaUsuario(persona.valor),
        },
        id_proyecto: null,
        cambios,
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: despues,
      cambios: conEfectos(
        datos,
        {
          practicantes: datos.practicantes.map((p) =>
            p.id_usuario === despues.id_usuario ? despues : p,
          ),
        },
        { eventos: [evento] },
      ),
    };
  });
}
