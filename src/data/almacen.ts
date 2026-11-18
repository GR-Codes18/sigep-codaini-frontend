/**
 * Almacén de datos del prototipo (la «base de datos» falsa).
 *
 * - Una sola fuente con todas las colecciones: así una operación puede cambiar
 *   varias a la vez y guardarse completa o no guardarse.
 * - Persiste en `localStorage`. Si lo guardado falta, está dañado o es de otra
 *   versión, se regenera la semilla y la app sigue funcionando.
 * - Solo `services/` escribe aquí (con `transaccion`); las pantallas leen con
 *   selectores: `useAlmacen((estado) => estado.datos.tareas)`.
 */

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { crearSemilla } from './semilla';
import { validarDatos } from './esquemas';
import type { DatosAlmacen } from './tipos';

export const CLAVE_ALMACEN = 'sigep-datos';
/** Súbela cuando cambie la forma de los datos: se regenera la semilla, sin migrar. */
export const VERSION_ALMACEN = 1;

export type CambiosAlmacen = Partial<DatosAlmacen>;

export interface EstadoAlmacen {
  datos: DatosAlmacen;
  /**
   * Operación atómica: lee los datos actuales y devuelve las colecciones nuevas
   * (completas, no parches). Todo se escribe en un solo `set` y, por tanto, en
   * una sola escritura al navegador. Si `operacion` lanza un error, no se
   * escribe nada y el error se propaga. Devolver `null` significa «sin cambios».
   *
   * `operacion` es síncrona a propósito: entre leer y escribir no puede entrar
   * otra escritura. La demora simulada va antes o después, nunca dentro.
   * No se deben mutar los datos recibidos: se devuelven colecciones nuevas.
   */
  transaccion: (operacion: (datos: DatosAlmacen) => CambiosAlmacen | null) => void;
  /**
   * Restablece los datos de demostración (solo prototipo): descarta todo lo guardado y vuelve a
   * una semilla nueva, con las fechas relativas a `ahora` (por defecto, hoy). Es un único `set`:
   * una sola escritura al navegador y un solo aviso a los suscriptores, así que nunca se ve una
   * base vacía a medias. Cambia todas las colecciones (también historial y notificaciones) y no
   * toca otras claves del navegador (sesión, tema). La autorización (`puede`) y la sesión activa
   * son de `services/`, no de aquí.
   */
  restablecer: (ahora?: Date) => void;
}

export interface OpcionesAlmacen {
  nombre?: string;
  version?: number;
  crearSemilla?: (ahora?: Date) => DatosAlmacen;
  /** Devuelve el almacenamiento, o `undefined` si el navegador lo bloquea. */
  almacenamiento?: () => StateStorage | undefined;
}

function almacenamientoDelNavegador(): StateStorage | undefined {
  try {
    return localStorage;
  } catch {
    // Acceso bloqueado (modo privado, política del navegador): se trabaja en memoria.
    return undefined;
  }
}

/**
 * Un navegador con el disco lleno o en modo privado puede dejar leer y fallar al guardar. `persist`
 * lanzaría el error después de cambiar la memoria; aquí se atrapa y se avisa, y la app sigue en
 * memoria (lo escrito se pierde al recargar).
 */
function protegerEscritura(almacenamiento: StateStorage): StateStorage {
  return {
    getItem: (clave) => almacenamiento.getItem(clave),
    removeItem: (clave) => almacenamiento.removeItem(clave),
    setItem: (clave, valor) => {
      try {
        return almacenamiento.setItem(clave, valor);
      } catch (error) {
        console.warn('SIGEP: no se pudo guardar; los cambios siguen solo en memoria.', error);
        return undefined;
      }
    },
  };
}

export function crearAlmacen(opciones: OpcionesAlmacen = {}) {
  const {
    nombre = CLAVE_ALMACEN,
    version = VERSION_ALMACEN,
    crearSemilla: semilla = (ahora?: Date) => crearSemilla(ahora),
    almacenamiento = almacenamientoDelNavegador,
  } = opciones;

  return create<EstadoAlmacen>()(
    persist(
      (set, get) => ({
        datos: semilla(),
        transaccion: (operacion) => {
          const cambios = operacion(get().datos);
          if (cambios === null) return;
          set({ datos: { ...get().datos, ...cambios } });
        },
        restablecer: (ahora) => {
          set({ datos: semilla(ahora) });
        },
      }),
      {
        name: nombre,
        version,
        // Si no hay almacenamiento, `createJSONStorage` atrapa el error y persist trabaja
        // sin guardar (la app sigue en memoria).
        storage: createJSONStorage(() => {
          const disponible = almacenamiento();
          if (disponible === undefined) throw new Error('Almacenamiento no disponible');
          return protegerEscritura(disponible);
        }),
        partialize: (estado) => ({ datos: estado.datos }),
        // Otra versión guardada: no se migra, se parte de una semilla nueva.
        migrate: () => {
          console.warn('SIGEP: los datos guardados son de otra versión; se regenera la semilla.');
          return { datos: semilla() };
        },
        // Lo guardado en el navegador no es de fiar: se valida antes de usarlo.
        merge: (persistido, actual) => {
          // Sin nada guardado (primera visita): se queda la semilla.
          if (persistido === undefined || persistido === null) return actual;
          const guardado = (persistido as { datos?: unknown }).datos;
          const datos = validarDatos(guardado);
          if (datos === null) {
            console.warn('SIGEP: los datos guardados están dañados; se regenera la semilla.');
            return actual;
          }
          return { ...actual, datos };
        },
        onRehydrateStorage: () => (_estado, error) => {
          // JSON ilegible: persist deja el estado inicial (la semilla) y avisa aquí.
          if (error) {
            console.warn('SIGEP: no se pudo leer lo guardado; se regenera la semilla.', error);
          }
        },
      },
    ),
  );
}

/** Almacén de la aplicación. Servicios: `useAlmacen.getState()`; pantallas: selectores. */
export const useAlmacen = crearAlmacen();
