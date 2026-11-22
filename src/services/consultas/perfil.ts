/**
 * Consulta de Mi perfil (propuesta §8.2).
 *
 * Cada persona ve **solo su propia cuenta**, sea cual sea su rol: no hay un parámetro para pedir la de otra. Trae los tres
 * bloques de §8.2 que son de lectura: los datos de la cuenta (rol, estado, fecha de alta y, para el Practicante, su área,
 * especialidad y fechas de práctica) y los datos personales. Los campos que existen para el rol y cuáles son editables
 * los decide `camposDelPerfil` de `domain/`; la pantalla no los calcula. Nunca devuelve la contraseña. Un usuario
 * INACTIVO recibe `USUARIO_INACTIVO`, como en el resto de las consultas. Ninguna consulta escribe en `data/`.
 */

import type { CampoPerfilDisponible, EstadoUsuario, Fecha, FechaHora, Id, Rol } from '@/domain';
import { camposDelPerfil } from '@/domain';
import { ENTORNO, type Entorno } from '../entorno';
import { fallo, validarEntrada, type Resultado } from '../resultado';
import { ejecutarConsulta } from '../transaccional';
import { cargarActorActivo, esquemaEntradaActor, type EntradaConActor } from './comun';

export interface PracticaDelPerfil {
  area: string;
  especialidad: string;
  fecha_ingreso: Fecha;
  fecha_fin_prevista: Fecha;
}

export interface MiPerfil {
  id: Id;
  rol: Rol;
  estado: EstadoUsuario;
  fecha_alta: FechaHora;
  datos: {
    nombre: string;
    correo: string;
    celular: string;
    /** `null` si no lo tiene o si el rol no tiene ese dato (Administrador). */
    discord: string | null;
    cuenta_github: string | null;
    disponibilidad_horaria: number | null;
  };
  /** Solo el Practicante: su área, especialidad y fechas de práctica. */
  practica: PracticaDelPerfil | null;
  /** Los campos que existen para su rol y cuáles puede editar. */
  campos: CampoPerfilDisponible[];
}

export function obtenerMiPerfil(
  entrada: EntradaConActor,
  entorno: Entorno = ENTORNO,
): Promise<Resultado<MiPerfil>> {
  return ejecutarConsulta(entorno, ({ datos }) => {
    const valida = validarEntrada(esquemaEntradaActor, entrada);
    if (!valida.ok) return valida;
    const actor = cargarActorActivo(datos, valida.valor.idActor);
    if (!actor.ok) return actor;
    const yo = actor.valor;

    const practicante =
      yo.rol === 'PRACTICANTE' ? datos.practicantes.find((p) => p.id_usuario === yo.id) : undefined;
    const supervisor =
      yo.rol === 'SUPERVISOR' ? datos.supervisores.find((s) => s.id_usuario === yo.id) : undefined;
    // Un Practicante o un Supervisor sin su detalle es un dato incoherente: no se inventa un perfil a medias.
    if (yo.rol === 'PRACTICANTE' && practicante === undefined) return fallo('NO_ENCONTRADO');
    if (yo.rol === 'SUPERVISOR' && supervisor === undefined) return fallo('NO_ENCONTRADO');

    let practica: PracticaDelPerfil | null = null;
    if (practicante !== undefined) {
      const area = datos.areas_tecnicas.find((a) => a.id === practicante.id_area_tecnica);
      const especialidad = datos.especialidades.find((e) => e.id === practicante.id_especialidad);
      if (area === undefined || especialidad === undefined) return fallo('NO_ENCONTRADO');
      practica = {
        area: area.nombre,
        especialidad: especialidad.nombre,
        fecha_ingreso: practicante.fecha_ingreso,
        fecha_fin_prevista: practicante.fecha_fin_prevista,
      };
    }

    const detalle = practicante ?? supervisor;
    return {
      ok: true,
      valor: {
        id: yo.id,
        rol: yo.rol,
        estado: yo.estado,
        fecha_alta: yo.fecha_alta,
        datos: {
          nombre: yo.nombre,
          correo: yo.correo,
          celular: yo.celular,
          discord: detalle?.discord ?? null,
          cuenta_github: detalle?.cuenta_github ?? null,
          disponibilidad_horaria: practicante?.disponibilidad_horaria ?? null,
        },
        practica,
        campos: camposDelPerfil(yo),
      },
    };
  });
}
