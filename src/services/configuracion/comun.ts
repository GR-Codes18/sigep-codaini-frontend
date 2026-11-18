/**
 * Núcleo común de guardar y restaurar una sección de Configuración (Fase 2, paso 10C, parte 2; propuesta §5.8).
 *
 * Recibe los valores **propuestos** para algunos o todos los parámetros de una sección y hace siempre lo mismo:
 *   1. Mezcla lo propuesto con los valores vigentes de la sección (los que no se mencionan se quedan como están).
 *   2. Valida la sección **completa** con `validarSeccionConfiguracion` (de `domain/`): una sección nunca queda a
 *      medias ni en un estado que `domain/` rechazaría. Un error trae el mensaje de `domain/` y, en `campos`, la clave
 *      del parámetro (`CLAVE` o `CLAVE.campo` si falla solo una parte, como el mínimo de la banda).
 *   3. Escribe únicamente los parámetros que cambiaron y deja un `PARAMETRO_CONFIGURACION_CAMBIADO` por cada uno,
 *      con el valor anterior y el nuevo de cada campo que cambió. Si ninguno cambió, `SIN_CAMBIOS`.
 *
 * Los cambios valen hacia adelante: no se recalcula ninguna evaluación pasada y no se avisa a nadie (§5.8, §8.1).
 */

import type { DatosAlmacen } from '@/data';
import {
  clavesDeSeccion,
  type CambioRegistrado,
  type ClaveParametro,
  type EventoHistorial,
  type Id,
  type ParametroConfiguracion,
  type SeccionConfiguracion,
  validarSeccionConfiguracion,
  type ValoresConfiguracion,
  type ValorParametro,
} from '@/domain';
import { etiquetaParametro } from '../etiquetas';
import { autorDe, cambio, crearEvento } from '../historial';
import type { Marca } from '../marca';
import { fallo, type CamposConError } from '../resultado';
import { conEfectos, type SalidaOperacion } from '../transaccional';

export interface SeccionGuardada {
  seccion: SeccionConfiguracion;
  /** Los parámetros de la sección tal como quedan, en el orden del catálogo. */
  parametros: ParametroConfiguracion[];
  /** Las claves que cambiaron (vacío no ocurre: sin cambios es `SIN_CAMBIOS`). */
  cambiados: ClaveParametro[];
}

/** ¿Dos valores de parámetro son iguales? Mismo tipo y mismos números. */
export function igualValor(a: ValorParametro, b: ValorParametro): boolean {
  switch (a.tipo) {
    case 'numero':
      return b.tipo === 'numero' && a.valor === b.valor;
    case 'rango':
      return b.tipo === 'rango' && a.minimo === b.minimo && a.maximo === b.maximo;
    case 'proporcion':
      return b.tipo === 'proporcion' && a.area === b.area && a.especialidad === b.especialidad;
  }
}

/** Los campos que cambiaron entre dos valores del mismo tipo, como los guarda el historial. */
function cambiosDeValor(antes: ValorParametro, despues: ValorParametro): CambioRegistrado[] {
  if (antes.tipo === 'numero' && despues.tipo === 'numero') {
    return [cambio('valor', antes.valor, despues.valor)];
  }
  if (antes.tipo === 'rango' && despues.tipo === 'rango') {
    return [
      ...(antes.minimo === despues.minimo ? [] : [cambio('minimo', antes.minimo, despues.minimo)]),
      ...(antes.maximo === despues.maximo ? [] : [cambio('maximo', antes.maximo, despues.maximo)]),
    ];
  }
  if (antes.tipo === 'proporcion' && despues.tipo === 'proporcion') {
    return [
      ...(antes.area === despues.area ? [] : [cambio('area', antes.area, despues.area)]),
      ...(antes.especialidad === despues.especialidad
        ? []
        : [cambio('especialidad', antes.especialidad, despues.especialidad)]),
    ];
  }
  // Un cambio de tipo no pasa la validación de `domain/`; si llegara aquí, se registra entero.
  return [cambio('valor', JSON.stringify(antes), JSON.stringify(despues))];
}

export function aplicarSeccion(entrada: {
  datos: DatosAlmacen;
  marca: Marca;
  generarId: (prefijo: string) => Id;
  idActor: Id;
  seccion: SeccionConfiguracion;
  propuestos: ValoresConfiguracion;
}): SalidaOperacion<SeccionGuardada> {
  const { datos, marca, generarId, idActor, seccion, propuestos } = entrada;
  const claves = clavesDeSeccion(seccion);

  // Los parámetros vigentes de la sección: si falta alguno, la Configuración guardada está rota.
  const vigentes = new Map<ClaveParametro, ParametroConfiguracion>();
  for (const clave of claves) {
    const parametro = datos.parametros.find((p) => p.clave === clave);
    if (parametro === undefined) return fallo('CONFIGURACION_INVALIDA');
    vigentes.set(clave, parametro);
  }

  const mezclados: ValoresConfiguracion = {};
  for (const clave of claves) {
    mezclados[clave] = propuestos[clave] ?? vigentes.get(clave)!.valor;
  }

  const validacion = validarSeccionConfiguracion(seccion, mezclados);
  if (!validacion.ok) {
    const campo = 'campo' in validacion ? validacion.campo : null;
    const llave =
      campo === null || campo === 'valor' ? validacion.clave : `${validacion.clave}.${campo}`;
    const campos: CamposConError = { [llave]: validacion.mensaje };
    return fallo(validacion.codigo, validacion.mensaje, campos);
  }

  const cambiados = claves.filter(
    (clave) => !igualValor(vigentes.get(clave)!.valor, mezclados[clave]!),
  );
  if (cambiados.length === 0) return fallo('SIN_CAMBIOS');

  const eventos: EventoHistorial[] = cambiados.map((clave) =>
    crearEvento(
      {
        autor: autorDe(idActor),
        tipo_accion: 'PARAMETRO_CONFIGURACION_CAMBIADO',
        elemento: {
          tipo: 'PARAMETRO_CONFIGURACION',
          id: clave,
          etiqueta: etiquetaParametro(clave),
        },
        id_proyecto: null,
        cambios: cambiosDeValor(vigentes.get(clave)!.valor, mezclados[clave]!),
      },
      marca,
      generarId,
    ),
  );

  const parametros = datos.parametros.map((p) =>
    cambiados.includes(p.clave) ? { ...p, valor: structuredClone(mezclados[p.clave]!) } : p,
  );
  return {
    ok: true,
    valor: {
      seccion,
      parametros: claves.map((clave) => parametros.find((p) => p.clave === clave)!),
      cambiados,
    },
    cambios: conEfectos(datos, { parametros }, { eventos }),
  };
}
