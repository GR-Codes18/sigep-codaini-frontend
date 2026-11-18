import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { PerfilUsuario } from '@/compartido/PerfilUsuario';
import type { CampoPerfil, DatosContrasena, DatosPerfil } from '@/compartido/esquemasPerfil';
import { useAlmacen } from '@/data';
import type { Rol } from '@/domain';
import {
  cambiarMiContrasena,
  editarMiPerfil,
  fallo,
  type EntradaEditarMiPerfil,
  type Resultado,
} from '@/services';
import { responsabilidadesPendientes } from './responsabilidadesPerfil';

const EDITABLES: Record<Rol, CampoPerfil[]> = {
  PRACTICANTE: ['nombre', 'correo', 'celular', 'discord', 'github', 'disponibilidad'],
  SUPERVISOR: ['celular', 'discord', 'github'],
  ADMINISTRADOR: ['nombre', 'correo', 'celular'],
};

const ROL_TEXTO: Record<Rol, string> = {
  PRACTICANTE: 'Practicante',
  SUPERVISOR: 'Supervisor',
  ADMINISTRADOR: 'Administrador',
};

const ESTADO_TAREA = {
  DISPONIBLE: 'Disponible',
  EN_PROGRESO: 'En progreso',
  ESPERANDO_SUPERVISION: 'Esperando supervisión',
  TERMINADA: 'Terminada',
} as const;

/** Los errores del servicio vienen con sus nombres (`cuenta_github`); el formulario usa los suyos. */
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

function fechaVisible(fecha: string): string {
  return format(parseISO(fecha), 'd MMM yyyy', { locale: es });
}

export function PaginaPerfil() {
  const { usuario } = useSesionActiva();
  const abrirSesion = useAlmacenSesion((estado) => estado.abrirSesion);
  const datos = useAlmacen((estado) => estado.datos);
  const practicante =
    usuario?.rol === 'PRACTICANTE'
      ? datos.practicantes.find((item) => item.id_usuario === usuario.id)
      : undefined;
  const supervisor =
    usuario?.rol === 'SUPERVISOR'
      ? datos.supervisores.find((item) => item.id_usuario === usuario.id)
      : undefined;
  const valores = useMemo<DatosPerfil | null>(() => {
    if (!usuario) return null;
    return {
      nombre: usuario.nombre,
      correo: usuario.correo,
      celular: usuario.celular,
      discord: practicante?.discord ?? supervisor?.discord ?? '',
      github: practicante?.cuenta_github ?? supervisor?.cuenta_github ?? '',
      disponibilidad: practicante?.disponibilidad_horaria ?? null,
    };
  }, [practicante, supervisor, usuario]);
  const responsabilidades = useMemo(
    () => (usuario ? responsabilidadesPendientes(usuario, datos) : []),
    [datos, usuario],
  );

  if (!usuario || !valores) return null;
  if (usuario.rol === 'PRACTICANTE' && !practicante) {
    return <p role="alert">No se encontraron los datos de tu práctica.</p>;
  }
  if (usuario.rol === 'SUPERVISOR' && !supervisor) {
    return <p role="alert">No se encontraron los datos de tu cuenta de supervisor.</p>;
  }

  const idUsuario = usuario.id;
  const cuenta = [
    { etiqueta: 'Rol', valor: ROL_TEXTO[usuario.rol] },
    { etiqueta: 'Estado', valor: usuario.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' },
    { etiqueta: 'Fecha de alta', valor: fechaVisible(usuario.fecha_alta) },
  ];

  if (practicante) {
    const area = datos.areas_tecnicas.find((item) => item.id === practicante.id_area_tecnica);
    const especialidad = datos.especialidades.find(
      (item) => item.id === practicante.id_especialidad,
    );
    if (!area || !especialidad) {
      return <p role="alert">No se encontraron el área o la especialidad de tu práctica.</p>;
    }
    cuenta.push(
      { etiqueta: 'Área', valor: area.nombre },
      { etiqueta: 'Especialidad', valor: especialidad.nombre },
      { etiqueta: 'Inicio de práctica', valor: fechaVisible(practicante.fecha_ingreso) },
      { etiqueta: 'Fin previsto', valor: fechaVisible(practicante.fecha_fin_prevista) },
    );
  }

  const editables = new Set(EDITABLES[usuario.rol]);

  async function guardarPerfil(datosPerfil: DatosPerfil) {
    // El servicio rechaza un campo que el rol no puede editar: solo se envía lo editable que cambió.
    const cambia = (campo: CampoPerfil) =>
      editables.has(campo) && datosPerfil[campo] !== valores?.[campo];
    const cambios: Omit<EntradaEditarMiPerfil, 'idActor'> = {};
    if (cambia('nombre')) cambios.nombre = datosPerfil.nombre;
    if (cambia('correo')) cambios.correo = datosPerfil.correo;
    if (cambia('celular')) cambios.celular = datosPerfil.celular;
    if (cambia('discord')) cambios.discord = datosPerfil.discord;
    if (cambia('github')) cambios.cuenta_github = datosPerfil.github;
    if (cambia('disponibilidad')) cambios.disponibilidad_horaria = datosPerfil.disponibilidad;
    if (Object.keys(cambios).length === 0) return fallo('SIN_CAMBIOS');

    const resultado = await editarMiPerfil({ idActor: idUsuario, ...cambios });
    if (resultado.ok) {
      abrirSesion(resultado.valor);
      toast.success('Perfil actualizado');
    }
    return renombrarCampos(resultado, {
      cuenta_github: 'github',
      disponibilidad_horaria: 'disponibilidad',
    });
  }

  async function cambiarContrasena(datosContrasena: DatosContrasena) {
    const resultado = await cambiarMiContrasena({
      idActor: idUsuario,
      contrasenaActual: datosContrasena.actual,
      contrasenaNueva: datosContrasena.nueva,
      confirmacion: datosContrasena.confirmacion,
    });
    if (resultado.ok) {
      abrirSesion(resultado.valor);
      toast.success('Contraseña actualizada');
    }
    return renombrarCampos(resultado, { contrasenaActual: 'actual', contrasenaNueva: 'nueva' });
  }

  return (
    <section className="space-y-4">
      <h1 className="text-text">Mi perfil</h1>
      <PerfilUsuario
        cuenta={cuenta}
        valores={valores}
        editables={EDITABLES[usuario.rol]}
        onGuardarPerfil={guardarPerfil}
        onCambiarContrasena={cambiarContrasena}
      />
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-1 text-text">Asignaciones y responsabilidades</h2>
        <p className="mb-3 text-sm text-text-2">Tareas pendientes dentro de tu alcance vigente.</p>
        {responsabilidades.length === 0 ? (
          <p className="text-sm text-text-2">No tienes responsabilidades pendientes.</p>
        ) : (
          <ul className="divide-y divide-border">
            {responsabilidades.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium text-text">{item.titulo}</p>
                  <p className="text-xs text-text-2">
                    {item.codigoProyecto} · {item.nombreProyecto}
                  </p>
                </div>
                <div className="text-right text-xs text-text-2">
                  <p>{ESTADO_TAREA[item.estado]}</p>
                  <p>Fecha límite: {fechaVisible(item.fechaLimite)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
