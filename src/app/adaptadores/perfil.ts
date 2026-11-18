import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EstadoUsuario, Rol } from '@/domain';
import type { CampoDelFormulario } from '@/compartido/PerfilUsuario';
import type { DatosPerfil } from '@/compartido/esquemasPerfil';
import type { MiPerfil } from '@/services';

const ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  SUPERVISOR: 'Supervisor',
  PRACTICANTE: 'Practicante',
};

const ESTADO: Record<EstadoUsuario, string> = { ACTIVO: 'Activo', INACTIVO: 'Inactivo' };

/** Fecha o fecha y hora ISO a «17 nov 2026», con `parseISO` en el borde. */
function fechaVisible(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy', { locale: es });
}

export interface PerfilParaVista {
  /** Bloque 1 de §8.2, solo lectura. */
  cuenta: { etiqueta: string; valor: string }[];
  /** Los datos personales como texto, que es lo que se escribe en el formulario. */
  valores: DatosPerfil;
  campos: CampoDelFormulario[];
}

/**
 * Mi perfil de `obtenerMiPerfil` a las filas de la ficha y los valores del formulario. Solo presenta: un dato que
 * no existe (`null`) queda como texto vacío, y los campos y su edición los decidió `domain/`.
 */
export function aPerfil(perfil: MiPerfil): PerfilParaVista {
  const cuenta = [
    { etiqueta: 'Rol', valor: ROL[perfil.rol] },
    { etiqueta: 'Estado', valor: ESTADO[perfil.estado] },
    { etiqueta: 'Fecha de alta', valor: fechaVisible(perfil.fecha_alta) },
  ];
  if (perfil.practica !== null) {
    cuenta.push(
      { etiqueta: 'Área', valor: perfil.practica.area },
      { etiqueta: 'Especialidad', valor: perfil.practica.especialidad },
      { etiqueta: 'Inicio de práctica', valor: fechaVisible(perfil.practica.fecha_ingreso) },
      { etiqueta: 'Fin previsto', valor: fechaVisible(perfil.practica.fecha_fin_prevista) },
    );
  }
  const { datos } = perfil;
  return {
    cuenta,
    valores: {
      nombre: datos.nombre,
      correo: datos.correo,
      celular: datos.celular,
      discord: datos.discord ?? '',
      cuenta_github: datos.cuenta_github ?? '',
      disponibilidad_horaria:
        datos.disponibilidad_horaria === null ? '' : String(datos.disponibilidad_horaria),
    },
    campos: perfil.campos,
  };
}
