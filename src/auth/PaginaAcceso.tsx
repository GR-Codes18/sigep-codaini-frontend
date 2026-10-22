import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Label } from '@/compartido/ui/label';
import { useAlmacenSesion } from './almacenSesion';
import { esquemaAcceso, type DatosAcceso } from './esquemaAcceso';
import { accesoRapido, iniciarSesion } from './iniciarSesion';
import type { Rol } from './tipos';

const DEMORA_MS = 300;
const esperar = () => new Promise<void>((resolver) => setTimeout(resolver, DEMORA_MS));

const ACCESOS_RAPIDOS: { rol: Rol; etiqueta: string }[] = [
  { rol: 'ADMINISTRADOR', etiqueta: 'Entrar como Administrador' },
  { rol: 'SUPERVISOR', etiqueta: 'Entrar como Supervisor' },
  { rol: 'PRACTICANTE', etiqueta: 'Entrar como Practicante' },
];

export function PaginaAcceso() {
  const abrirSesion = useAlmacenSesion((s) => s.abrirSesion);
  const [cargando, setCargando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosAcceso>({ resolver: zodResolver(esquemaAcceso) });

  const enviar = handleSubmit(async (datos) => {
    setErrorGeneral(null);
    setCargando(true);
    await esperar();
    const resultado = iniciarSesion(datos.correo, datos.contrasena);
    if (!resultado.ok) {
      setCargando(false);
      setErrorGeneral(resultado.mensaje);
      return;
    }
    abrirSesion(resultado.usuario);
  });

  async function entrarComo(rol: Rol) {
    setErrorGeneral(null);
    setCargando(true);
    await esperar();
    abrirSesion(accesoRapido(rol));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <h1 className="text-text">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-text-2">Accede al sistema de gestión de practicantes.</p>

        <form onSubmit={enviar} noValidate className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="correo">Correo</Label>
            <Input
              id="correo"
              type="email"
              autoComplete="username"
              aria-invalid={errors.correo ? true : undefined}
              aria-describedby={errors.correo ? 'error-correo' : undefined}
              disabled={cargando}
              {...register('correo')}
            />
            {errors.correo && (
              <p id="error-correo" className="text-xs text-danger-text">
                {errors.correo.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contrasena">Contraseña</Label>
            <Input
              id="contrasena"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.contrasena ? true : undefined}
              aria-describedby={errors.contrasena ? 'error-contrasena' : undefined}
              disabled={cargando}
              {...register('contrasena')}
            />
            {errors.contrasena && (
              <p id="error-contrasena" className="text-xs text-danger-text">
                {errors.contrasena.message}
              </p>
            )}
          </div>

          {errorGeneral && (
            <p role="alert" className="text-sm text-danger-text">
              {errorGeneral}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
        </form>

        <div className="mt-6 space-y-2 border-t border-border pt-6">
          <p className="text-xs text-text-2">Acceso rápido para la demostración</p>
          {ACCESOS_RAPIDOS.map(({ rol, etiqueta }) => (
            <Button
              key={rol}
              type="button"
              variant="outline"
              className="w-full"
              disabled={cargando}
              onClick={() => entrarComo(rol)}
            >
              {etiqueta}
            </Button>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-text-2">Prototipo: autenticación simulada</p>
      </div>
    </main>
  );
}
