import { useEffect } from 'react';
import { useAlmacen } from '@/data';
import { useAlmacenSesion } from './almacenSesion';

export function useSesionActiva() {
  const sesion = useAlmacenSesion((estado) => estado.usuario);
  const abrirSesion = useAlmacenSesion((estado) => estado.abrirSesion);
  const cerrarSesion = useAlmacenSesion((estado) => estado.cerrarSesion);
  const usuario = useAlmacen((estado) =>
    sesion ? estado.datos.usuarios.find((item) => item.id === sesion.id) : undefined,
  );
  const esValida = sesion !== null && usuario?.estado === 'ACTIVO' && usuario.rol === sesion.rol;

  useEffect(() => {
    if (!sesion) return;
    if (!esValida || !usuario) {
      cerrarSesion();
      return;
    }
    if (
      sesion.nombre !== usuario.nombre ||
      sesion.correo !== usuario.correo ||
      sesion.debe_cambiar_contrasena !== usuario.debe_cambiar_contrasena
    ) {
      abrirSesion({
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        debe_cambiar_contrasena: usuario.debe_cambiar_contrasena,
      });
    }
  }, [abrirSesion, cerrarSesion, esValida, sesion, usuario]);

  return {
    sesion: esValida ? sesion : null,
    usuario: esValida && usuario ? usuario : null,
  };
}
