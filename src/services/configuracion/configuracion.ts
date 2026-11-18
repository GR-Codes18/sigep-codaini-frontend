/**
 * Guardar y restaurar una sección de Configuración (Fase 2, paso 10C, parte 2; propuesta §5.8).
 *
 * Solo el Administrador (`GESTIONAR_CONFIGURACION`). Las tres secciones se guardan y se restauran **por separado**
 * (Evaluación, Prácticas y Seguimiento):
 *   - `guardarConfiguracionSeccion`: recibe los valores de algunos o de todos los parámetros de la sección; el resto se
 *     queda como está. La sección completa se valida con `domain/` antes de escribir nada.
 *   - `restaurarSeccionConfiguracion`: devuelve cada parámetro de la sección a su `valor_predeterminado`.
 *
 * Los dos dejan un `PARAMETRO_CONFIGURACION_CAMBIADO` por cada parámetro que cambió (valor anterior y nuevo) y
 * responden `SIN_CAMBIOS` si no cambió ninguno. No recalculan evaluaciones pasadas ni avisan a nadie.
 * Orden: Zod → actor → permiso → mezcla y validación de `domain/` → una sola escritura.
 */

import { z } from 'zod';
import {
  SECCIONES_CONFIGURACION,
  clavesDeSeccion,
  puede,
  type ClaveParametro,
  type ValoresConfiguracion,
} from '@/domain';
import { obtenerActor } from '../actor';
import { ENTORNO, type Entorno } from '../entorno';
import { denegar, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { ejecutarServicio } from '../transaccional';
import { aplicarSeccion, type SeccionGuardada } from './comun';

const MENSAJE_NUMERO = 'Escribe un número.';
const MENSAJE_FORMATO = 'El valor del parámetro no tiene el formato esperado.';

/** Un valor de parámetro con la forma del dominio; los límites de cada uno los pone `domain/`. */
const esquemaValor = z.discriminatedUnion(
  'tipo',
  [
    z.strictObject({ tipo: z.literal('numero'), valor: z.number(MENSAJE_NUMERO) }),
    z.strictObject({
      tipo: z.literal('rango'),
      minimo: z.number(MENSAJE_NUMERO),
      maximo: z.number(MENSAJE_NUMERO),
    }),
    z.strictObject({
      tipo: z.literal('proporcion'),
      area: z.number(MENSAJE_NUMERO),
      especialidad: z.number(MENSAJE_NUMERO),
    }),
  ],
  { error: MENSAJE_FORMATO },
);

const esquemaSeccion = z.enum(SECCIONES_CONFIGURACION, 'Elige una sección de Configuración.');

const esquemaGuardar = z
  .object({
    idActor: esquemaId,
    seccion: esquemaSeccion,
    valores: z.record(z.string(), esquemaValor),
  })
  .superRefine((entrada, ctx) => {
    // Un parámetro que no es de la sección no se ignora en silencio: se rechaza.
    const propias = new Set<string>(clavesDeSeccion(entrada.seccion));
    for (const clave of Object.keys(entrada.valores)) {
      if (!propias.has(clave)) {
        ctx.addIssue({
          code: 'custom',
          path: [clave],
          message: 'Este parámetro no pertenece a la sección.',
        });
      }
    }
  });

const esquemaRestaurar = z.object({ idActor: esquemaId, seccion: esquemaSeccion });

export type EntradaGuardarConfiguracionSeccion = z.input<typeof esquemaGuardar>;
export type EntradaRestaurarConfiguracionSeccion = z.input<typeof esquemaRestaurar>;

export function guardarConfiguracionSeccion(
  entrada: EntradaGuardarConfiguracionSeccion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<SeccionGuardada>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaGuardar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;
    const permiso = puede(actor.valor, 'GESTIONAR_CONFIGURACION', {});
    if (!permiso.permitido) return denegar(permiso);

    return aplicarSeccion({
      datos,
      marca,
      generarId: e.generarId,
      idActor: actor.valor.id,
      seccion: v.seccion,
      propuestos: v.valores as ValoresConfiguracion,
    });
  });
}

export function restaurarSeccionConfiguracion(
  entrada: EntradaRestaurarConfiguracionSeccion,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<SeccionGuardada>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaRestaurar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const actor = obtenerActor(datos, v.idActor);
    if (!actor.ok) return actor;
    const permiso = puede(actor.valor, 'GESTIONAR_CONFIGURACION', {});
    if (!permiso.permitido) return denegar(permiso);

    // Los valores predeterminados guardados de cada parámetro de la sección (si falta alguno, lo detecta el núcleo).
    const propuestos: ValoresConfiguracion = {};
    for (const clave of clavesDeSeccion(v.seccion) as ClaveParametro[]) {
      const parametro = datos.parametros.find((p) => p.clave === clave);
      if (parametro !== undefined) propuestos[clave] = parametro.valor_predeterminado;
    }
    return aplicarSeccion({
      datos,
      marca,
      generarId: e.generarId,
      idActor: actor.valor.id,
      seccion: v.seccion,
      propuestos,
    });
  });
}
