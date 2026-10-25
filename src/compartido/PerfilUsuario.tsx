import { useState } from 'react';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Label } from '@/compartido/ui/label';
import {
  esquemaContrasena,
  esquemaPerfil,
  type CampoPerfil,
  type DatosContrasena,
  type DatosPerfil,
} from './esquemasPerfil';

interface Props {
  /** Bloque 1, solo lectura: rol, estado, fecha de alta y, si aplica, datos de la práctica. */
  cuenta: { etiqueta: string; valor: string }[];
  valores: DatosPerfil;
  /** Qué campos puede editar este rol (propuesta §8.2). */
  editables: CampoPerfil[];
  onGuardarPerfil: (datos: DatosPerfil) => Promise<void>;
  onCambiarContrasena: (datos: DatosContrasena) => Promise<void>;
}

const ETIQUETAS: Record<CampoPerfil, string> = {
  nombre: 'Nombre',
  correo: 'Correo',
  celular: 'Celular',
  discord: 'Usuario de Discord',
  github: 'Cuenta de GitHub',
  disponibilidad: 'Disponibilidad (horas por semana)',
};

const GENERICO = 'No se pudo guardar. Inténtalo de nuevo.';

export function PerfilUsuario({
  cuenta,
  valores,
  editables,
  onGuardarPerfil,
  onCambiarContrasena,
}: Props) {
  const [datos, setDatos] = useState<DatosPerfil>(valores);
  const [errores, setErrores] = useState<Partial<Record<string, string>>>({});
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [clave, setClave] = useState({ actual: '', nueva: '', confirmacion: '' });
  const [erroresClave, setErroresClave] = useState<Partial<Record<string, string>>>({});
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState(false);

  // Campos de solo lectura para este rol (se muestran, pero no se editan).
  const campos = (Object.keys(ETIQUETAS) as CampoPerfil[]).filter(
    (c) => c !== 'disponibilidad' || editables.includes('disponibilidad'),
  );

  async function guardar(e: React.SyntheticEvent) {
    e.preventDefault();
    setErrorPerfil(null);
    const r = esquemaPerfil.safeParse(datos);
    if (!r.success) {
      const c = r.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      const conError: Record<string, string> = {};
      for (const k of editables) if (c[k]?.[0]) conError[k] = c[k]![0];
      if (Object.keys(conError).length > 0) {
        setErrores(conError);
        return;
      }
    }
    setErrores({});
    setGuardando(true);
    try {
      await onGuardarPerfil(datos);
    } catch (err) {
      setErrorPerfil(err instanceof Error && err.message ? err.message : GENERICO);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarClave(e: React.SyntheticEvent) {
    e.preventDefault();
    setErrorClave(null);
    const r = esquemaContrasena.safeParse(clave);
    if (!r.success) {
      const c = r.error.flatten().fieldErrors;
      setErroresClave({
        actual: c.actual?.[0],
        nueva: c.nueva?.[0],
        confirmacion: c.confirmacion?.[0],
      });
      return;
    }
    setErroresClave({});
    setCambiando(true);
    try {
      await onCambiarContrasena(r.data);
      setClave({ actual: '', nueva: '', confirmacion: '' });
    } catch (err) {
      setErrorClave(err instanceof Error && err.message ? err.message : GENERICO);
    } finally {
      setCambiando(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-text">Datos de la cuenta</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {cuenta.map((c) => (
            <div key={c.etiqueta}>
              <dt className="text-text-2">{c.etiqueta}</dt>
              <dd className="text-text">{c.valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-text">Datos personales</h2>
        <form onSubmit={guardar} noValidate className="space-y-4">
          {campos.map((c) => (
            <div key={c} className="space-y-1.5">
              <Label htmlFor={`perfil-${c}`}>{ETIQUETAS[c]}</Label>
              <Input
                id={`perfil-${c}`}
                value={String(datos[c])}
                onChange={(e) => setDatos((d) => ({ ...d, [c]: e.target.value }))}
                disabled={guardando || !editables.includes(c)}
                aria-invalid={errores[c] ? true : undefined}
              />
              {errores[c] && <p className="text-xs text-danger-text">{errores[c]}</p>}
            </div>
          ))}
          {errorPerfil && (
            <p role="alert" className="text-sm text-danger-text">
              {errorPerfil}
            </p>
          )}
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-text">Seguridad</h2>
        <form onSubmit={cambiarClave} noValidate className="space-y-4">
          {(
            [
              ['actual', 'Contraseña actual'],
              ['nueva', 'Nueva contraseña'],
              ['confirmacion', 'Confirmar nueva contraseña'],
            ] as const
          ).map(([k, etiqueta]) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`clave-${k}`}>{etiqueta}</Label>
              <Input
                id={`clave-${k}`}
                type="password"
                autoComplete={k === 'actual' ? 'current-password' : 'new-password'}
                value={clave[k]}
                onChange={(e) => setClave((c) => ({ ...c, [k]: e.target.value }))}
                disabled={cambiando}
                aria-invalid={erroresClave[k] ? true : undefined}
              />
              {erroresClave[k] && <p className="text-xs text-danger-text">{erroresClave[k]}</p>}
            </div>
          ))}
          {errorClave && (
            <p role="alert" className="text-sm text-danger-text">
              {errorClave}
            </p>
          )}
          <Button type="submit" disabled={cambiando}>
            {cambiando ? 'Cambiando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </section>
    </div>
  );
}
