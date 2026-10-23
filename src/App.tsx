import { Button } from '@/compartido/ui/button';
import { PaginaAcceso } from '@/auth/PaginaAcceso';
import { useAlmacenSesion } from '@/auth/almacenSesion';

function SesionProvisional() {
  const usuario = useAlmacenSesion((s) => s.usuario);
  const cerrarSesion = useAlmacenSesion((s) => s.cerrarSesion);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-text">
      <p>
        Sesión: {usuario?.nombre} ({usuario?.rol})
      </p>
      <Button onClick={cerrarSesion}>Cerrar sesión</Button>
    </main>
  );
}

export default function App() {
  const usuario = useAlmacenSesion((s) => s.usuario);
  return usuario ? <SesionProvisional /> : <PaginaAcceso />;
}
