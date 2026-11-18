/**
 * Enlaces útiles de un proyecto (Fase 2, paso 9A; propuesta §5.4 y §9.1.1): agregar, editar y quitar.
 *
 * Los gestiona el Administrador o el Supervisor del proyecto (también con el proyecto FINALIZADO). Cada enlace es un
 * nombre y una dirección http(s); el enlace tiene que ser del proyecto indicado (`NO_ENCONTRADO` si no). Quitar borra
 * el enlace: es configuración y el evento `PROYECTO_ENLACE_QUITADO` deja el rastro. No avisa a nadie (§8.1).
 */

import { z } from 'zod';
import { puede, type EnlaceProyecto, type Id } from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { cambio, diferencias } from '../historial';
import { denegar, fallo, validarEntrada, type Resultado } from '../resultado';
import { esquemaId } from '../tareas/comun';
import { conEfectos, ejecutarServicio } from '../transaccional';
import { cargarContextoProyecto, eventoDeProyecto } from './comun';
import { esquemaNombreEnlace, esquemaUrlEnlace } from './esquemas';

const esquemaAgregar = z.object({
  idActor: esquemaId,
  idProyecto: esquemaId,
  nombre: esquemaNombreEnlace,
  url: esquemaUrlEnlace,
});

const esquemaEditar = z
  .object({
    idActor: esquemaId,
    idProyecto: esquemaId,
    idEnlace: esquemaId,
    nombre: esquemaNombreEnlace.optional(),
    url: esquemaUrlEnlace.optional(),
  })
  .refine((v) => v.nombre !== undefined || v.url !== undefined, {
    message: 'Indica el nombre o la dirección que quieres cambiar.',
  });

const esquemaQuitar = z.object({
  idActor: esquemaId,
  idProyecto: esquemaId,
  idEnlace: esquemaId,
});

export type EntradaAgregarEnlace = z.input<typeof esquemaAgregar>;
export type EntradaEditarEnlace = z.input<typeof esquemaEditar>;
export type EntradaQuitarEnlace = z.input<typeof esquemaQuitar>;

export function agregarEnlace(
  entrada: EntradaAgregarEnlace,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<EnlaceProyecto>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaAgregar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const contexto = cargarContextoProyecto(datos, v.idActor, v.idProyecto);
    if (!contexto.ok) return contexto;
    const { actor, proyecto } = contexto.valor;

    const permiso = puede(actor, 'GESTIONAR_ENLACES', { proyecto });
    if (!permiso.permitido) return denegar(permiso);

    const enlace: EnlaceProyecto = {
      id: e.generarId('enl'),
      id_proyecto: proyecto.id,
      nombre: v.nombre,
      url: v.url,
    };
    const evento = eventoDeProyecto(
      {
        actor,
        proyecto,
        tipo_accion: 'PROYECTO_ENLACE_AGREGADO',
        cambios: [cambio('enlace', null, enlace.nombre)],
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: enlace,
      cambios: conEfectos(
        datos,
        { enlaces_proyecto: [...datos.enlaces_proyecto, enlace] },
        { eventos: [evento] },
      ),
    };
  });
}

export function editarEnlace(
  entrada: EntradaEditarEnlace,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<EnlaceProyecto>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaEditar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const contexto = cargarContextoProyecto(datos, v.idActor, v.idProyecto);
    if (!contexto.ok) return contexto;
    const { actor, proyecto } = contexto.valor;

    const permiso = puede(actor, 'GESTIONAR_ENLACES', { proyecto });
    if (!permiso.permitido) return denegar(permiso);

    const antes = datos.enlaces_proyecto.find(
      (x) => x.id === v.idEnlace && x.id_proyecto === proyecto.id,
    );
    if (antes === undefined) return fallo('NO_ENCONTRADO');

    const nuevo: EnlaceProyecto = {
      ...antes,
      nombre: v.nombre ?? antes.nombre,
      url: v.url ?? antes.url,
    };
    const cambios = diferencias(antes, nuevo, ['nombre', 'url']);
    if (cambios.length === 0) return fallo('SIN_CAMBIOS');

    const evento = eventoDeProyecto(
      { actor, proyecto, tipo_accion: 'PROYECTO_ENLACE_EDITADO', cambios },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: nuevo,
      cambios: conEfectos(
        datos,
        { enlaces_proyecto: datos.enlaces_proyecto.map((x) => (x.id === nuevo.id ? nuevo : x)) },
        { eventos: [evento] },
      ),
    };
  });
}

export function quitarEnlace(
  entrada: EntradaQuitarEnlace,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<{ id: Id }>> {
  return ejecutarServicio(entorno, ({ datos, marca, entorno: e }) => {
    const valida = validarEntrada(esquemaQuitar, entrada);
    if (!valida.ok) return valida;
    const v = valida.valor;
    const contexto = cargarContextoProyecto(datos, v.idActor, v.idProyecto);
    if (!contexto.ok) return contexto;
    const { actor, proyecto } = contexto.valor;

    const permiso = puede(actor, 'GESTIONAR_ENLACES', { proyecto });
    if (!permiso.permitido) return denegar(permiso);

    const enlace = datos.enlaces_proyecto.find(
      (x) => x.id === v.idEnlace && x.id_proyecto === proyecto.id,
    );
    if (enlace === undefined) return fallo('NO_ENCONTRADO');

    const evento = eventoDeProyecto(
      {
        actor,
        proyecto,
        tipo_accion: 'PROYECTO_ENLACE_QUITADO',
        cambios: [cambio('enlace', enlace.nombre, null)],
      },
      marca,
      e.generarId,
    );
    return {
      ok: true,
      valor: { id: enlace.id },
      cambios: conEfectos(
        datos,
        { enlaces_proyecto: datos.enlaces_proyecto.filter((x) => x.id !== enlace.id) },
        { eventos: [evento] },
      ),
    };
  });
}
