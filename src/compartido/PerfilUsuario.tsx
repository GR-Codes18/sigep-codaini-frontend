import { useState, type SetStateAction } from 'react';
import type { Resultado } from '@/services';
import { CampoDeFormulario } from '@/compartido/CampoDeFormulario';
import { ListaDeDefiniciones } from '@/compartido/ListaDeDefiniciones';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import {
  esquemaContrasena,
  validarCamposDelPerfil,
  type CampoPerfil,
  type DatosContrasena,
  type DatosPerfil,
} from './esquemasPerfil';

/** Un campo que existe para el rol y si se puede editar; lo decide `domain/` y llega por la consulta (propuesta §8.2). */
export interface CampoDelFormulario {
  campo: CampoPerfil;
  editable: boolean;
}

interface Props {
  /** Bloque 1, solo lectura: rol, estado, fecha de alta y, si aplica, datos de la práctica. */
  cuenta: { etiqueta: string; valor: string }[];
  valores: DatosPerfil;
  /** Los campos que existen para este rol, en orden. Los no editables se muestran en solo lectura; los demás no se muestran. */
  campos: CampoDelFormulario[];
  /** Al guardar bien, la pantalla vuelve a derivar `valores` de la consulta. */
  onGuardarPerfil: (datos: DatosPerfil) => Promise<Resultado<unknown>>;
  onCambiarContrasena: (datos: DatosContrasena) => Promise<Resultado<unknown>>;
}

const ETIQUETAS: Record<CampoPerfil, string> = {
  nombre: 'Nombre',
  correo: 'Correo',
  celular: 'Celular',
  discord: 'Usuario de Discord',
  cuenta_github: 'Cuenta de GitHub',
  disponibilidad_horaria: 'Disponibilidad (horas por semana)',
};

/** Los valores que llegan son los mismos si todos los campos coinciden (una consulta nueva trae un objeto nuevo). */
function mismosValores(a: DatosPerfil, b: DatosPerfil): boolean {
  return (Object.keys(ETIQUETAS) as CampoPerfil[]).every((campo) => a[campo] === b[campo]);
}

export function PerfilUsuario({
  cuenta,
  valores,
  campos,
  onGuardarPerfil,
  onCambiarContrasena,
}: Props) {
  const [formulario, setFormulario] = useState({ origen: valores, datos: valores });
  const [errores, setErrores] = useState<Partial<Record<string, string>>>({});
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [clave, setClave] = useState({ actual: '', nueva: '', confirmacion: '' });
  const [erroresClave, setErroresClave] = useState<Partial<Record<string, string>>>({});
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState(false);

  // Si los datos de la cuenta cambian de verdad (se guardó, o los cambió otra pantalla), el formulario se reinicia;
  // si solo llegó la misma información en un objeto nuevo, se conserva lo que la persona está escribiendo.
  if (!mismosValores(formulario.origen, valores)) {
    setFormulario({ origen: valores, datos: valores });
  }
  const datos = formulario.datos;
  const editables = campos.filter((c) => c.editable).map((c) => c.campo);

  function setDatos(actualizacion: SetStateAction<DatosPerfil>) {
    setFormulario((actual) => ({
      ...actual,
      datos: typeof actualizacion === 'function' ? actualizacion(actual.datos) : actualizacion,
    }));
  }

  async function guardar(e: React.SyntheticEvent) {
    e.preventDefault();
    setErrorPerfil(null);
    const validacion = validarCamposDelPerfil(datos, editables);
    if (!validacion.ok) {
      setErrores(validacion.errores);
      setErrorPerfil('Revisa los datos ingresados.');
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      const resultado = await onGuardarPerfil(validacion.datos);
      if (!resultado.ok) {
        setErrorPerfil(resultado.mensaje);
        setErrores(resultado.campos ?? {});
        return;
      }
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
      const resultado = await onCambiarContrasena(r.data);
      if (!resultado.ok) {
        setErrorClave(resultado.mensaje);
        setErroresClave({
          actual: resultado.campos?.actual,
          nueva: resultado.campos?.nueva,
          confirmacion: resultado.campos?.confirmacion,
        });
        return;
      }
      setClave({ actual: '', nueva: '', confirmacion: '' });
    } finally {
      setCambiando(false);
    }
  }

  return (
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-5">
      <div className="space-y-3 lg:col-span-2">
        <PanelDeDatos titulo="Datos de la cuenta">
          <ListaDeDefiniciones
            disposicion="filas"
            items={cuenta.map((c) => ({ etiqueta: c.etiqueta, valor: c.valor }))}
          />
        </PanelDeDatos>

        <PanelDeDatos titulo="Seguridad">
          <form onSubmit={cambiarClave} noValidate className="space-y-3">
            {(
              [
                ['actual', 'Contraseña actual'],
                ['nueva', 'Nueva contraseña'],
                ['confirmacion', 'Confirmar nueva contraseña'],
              ] as const
            ).map(([k, etiqueta]) => (
              <CampoDeFormulario key={k} htmlFor={`clave-${k}`} etiqueta={etiqueta}>
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
              </CampoDeFormulario>
            ))}
            {errorClave && (
              <p role="alert" className="text-sm text-danger-text">
                {errorClave}
              </p>
            )}
            <div className="flex justify-end border-t border-border pt-3">
              <Button type="submit" disabled={cambiando}>
                {cambiando ? 'Cambiando…' : 'Cambiar contraseña'}
              </Button>
            </div>
          </form>
        </PanelDeDatos>
      </div>

      <PanelDeDatos titulo="Datos personales" className="lg:col-span-3">
        <form onSubmit={guardar} noValidate className="space-y-3">
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {campos.map(({ campo, editable }) => (
              <CampoDeFormulario
                key={campo}
                htmlFor={`perfil-${campo}`}
                etiqueta={ETIQUETAS[campo]}
              >
                <Input
                  id={`perfil-${campo}`}
                  value={datos[campo]}
                  onChange={(e) => setDatos((d) => ({ ...d, [campo]: e.target.value }))}
                  disabled={guardando || !editable}
                  aria-invalid={errores[campo] ? true : undefined}
                />
                {errores[campo] && <p className="text-xs text-danger-text">{errores[campo]}</p>}
              </CampoDeFormulario>
            ))}
          </div>
          {errorPerfil && (
            <p role="alert" className="text-sm text-danger-text">
              {errorPerfil}
            </p>
          )}
          <div className="flex justify-end border-t border-border pt-3">
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </PanelDeDatos>
    </div>
  );
}
