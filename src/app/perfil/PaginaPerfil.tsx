import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { aPerfil } from '@/app/adaptadores/perfil';
import { useConsulta } from '@/app/useConsulta';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { PerfilUsuario } from '@/compartido/PerfilUsuario';
import type { DatosContrasena, DatosPerfil } from '@/compartido/esquemasPerfil';
import { CabeceraDePagina } from '@/compartido/CabeceraDePagina';
import { Skeleton } from '@/compartido/ui/skeleton';
import {
  cambiarMiContrasena,
  ENTORNO,
  editarMiPerfil,
  fallo,
  obtenerMiPerfil,
  type Entorno,
  type EntradaEditarMiPerfil,
  type Resultado,
} from '@/services';

/** Los errores de la contraseña vienen con los nombres del servicio; el formulario usa los suyos. */
function renombrarCampos<T>(
  resultado: Resultado<T>,
  nombres: Record<string, string>,
): Resultado<T> {
  if (resultado.ok || !resultado.campos) return resultado;
  const campos: Record<string, string> = {};
  for (const [campo, mensaje] of Object.entries(resultado.campos)) {
    campos[nombres[campo] ?? campo] = mensaje;
  }
  return { ...resultado, campos };
}

/** La disponibilidad se escribe como texto: vacío la quita y lo demás lo valida el servicio. */
function disponibilidadComoNumero(texto: string): number | null {
  const limpio = texto.trim();
  return limpio === '' ? null : Number(limpio);
}

/**
 * Mi perfil (§8.2): los tres bloques, con las diferencias por rol. Lee con `obtenerMiPerfil` (que ya trae qué campos
 * existen y cuáles se editan) y guarda con los servicios de cuentas; no lee el almacén ni decide permisos. `entorno` solo
 * lo cambian las pruebas.
 */
export function PaginaPerfil({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const abrirSesion = useAlmacenSesion((estado) => estado.abrirSesion);
  const idUsuario = sesion?.id ?? null;

  const cargar = useCallback(
    () => obtenerMiPerfil({ idActor: idUsuario ?? '' }, entorno),
    [entorno, idUsuario],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);
  const perfil = useMemo(
    () => (consulta.valor === null ? null : aPerfil(consulta.valor)),
    [consulta.valor],
  );

  if (idUsuario === null) return null;

  async function guardarPerfil(datos: DatosPerfil) {
    if (perfil === null) return fallo('NO_ENCONTRADO');
    // El servicio rechaza un campo que el rol no puede editar: solo se envía lo editable que cambió.
    const cambia = (campo: keyof DatosPerfil) =>
      perfil.campos.some((c) => c.campo === campo && c.editable) &&
      datos[campo] !== perfil.valores[campo];
    const cambios: Omit<EntradaEditarMiPerfil, 'idActor'> = {};
    if (cambia('nombre')) cambios.nombre = datos.nombre;
    if (cambia('correo')) cambios.correo = datos.correo;
    if (cambia('celular')) cambios.celular = datos.celular;
    if (cambia('discord')) cambios.discord = datos.discord;
    if (cambia('cuenta_github')) cambios.cuenta_github = datos.cuenta_github;
    if (cambia('disponibilidad_horaria')) {
      cambios.disponibilidad_horaria = disponibilidadComoNumero(datos.disponibilidad_horaria);
    }
    if (Object.keys(cambios).length === 0) return fallo('SIN_CAMBIOS');

    const resultado = await editarMiPerfil({ idActor: idUsuario ?? '', ...cambios }, entorno);
    if (resultado.ok) {
      abrirSesion(resultado.valor);
      toast.success('Perfil actualizado');
    }
    return resultado;
  }

  async function cambiarContrasena(datos: DatosContrasena) {
    const resultado = await cambiarMiContrasena(
      {
        idActor: idUsuario ?? '',
        contrasenaActual: datos.actual,
        contrasenaNueva: datos.nueva,
        confirmacion: datos.confirmacion,
      },
      entorno,
    );
    if (resultado.ok) {
      abrirSesion(resultado.valor);
      toast.success('Contraseña actualizada');
    }
    return renombrarCampos(resultado, { contrasenaActual: 'actual', contrasenaNueva: 'nueva' });
  }

  return (
    <section className="space-y-3">
      <CabeceraDePagina
        titulo="Mi perfil"
        subtitulo="Tus datos de la cuenta, tus datos personales y tu contraseña."
      />
      {consulta.error ? (
        <p role="alert" className="text-sm text-danger-text">
          {consulta.error}
        </p>
      ) : perfil === null ? (
        <div className="space-y-2" role="status" aria-label="Cargando tu perfil">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <PerfilUsuario
          cuenta={perfil.cuenta}
          valores={perfil.valores}
          campos={perfil.campos}
          onGuardarPerfil={guardarPerfil}
          onCambiarContrasena={cambiarContrasena}
        />
      )}
    </section>
  );
}
