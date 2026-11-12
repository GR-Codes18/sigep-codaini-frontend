import { toast } from 'sonner';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import type { Rol } from '@/auth/tipos';
import { PerfilUsuario } from '@/compartido/PerfilUsuario';
import type { CampoPerfil } from '@/compartido/esquemasPerfil';

// PROVISIONAL: datos y guardado simulados; se reemplazan por services/ de Persona A.
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

export function PaginaPerfil() {
  const usuario = useAlmacenSesion((s) => s.usuario);
  if (!usuario) return null;

  return (
    <section className="space-y-4">
      <h1 className="text-text">Mi perfil</h1>
      <PerfilUsuario
        cuenta={[
          { etiqueta: 'Rol', valor: ROL_TEXTO[usuario.rol] },
          { etiqueta: 'Estado', valor: 'Activo' },
        ]}
        valores={{
          nombre: usuario.nombre,
          correo: usuario.correo,
          celular: '999888777',
          discord: '',
          github: '',
          disponibilidad: 20,
        }}
        editables={EDITABLES[usuario.rol]}
        onGuardarPerfil={async () => {
          toast.success('Perfil actualizado');
        }}
        onCambiarContrasena={async () => {
          toast.success('Contraseña actualizada');
        }}
      />
    </section>
  );
}
