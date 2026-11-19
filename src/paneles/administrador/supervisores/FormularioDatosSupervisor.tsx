import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/compartido/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/compartido/ui/dialog';
import { Input } from '@/compartido/ui/input';
import { Label } from '@/compartido/ui/label';
import type { Id } from '@/domain';
import { editarSupervisor, ENTORNO, esquemaCorreo, type Entorno } from '@/services';

interface Props {
  idActor: Id;
  supervisor: { id: Id; nombre: string; correo: string };
  onCerrar: () => void;
  entorno?: Entorno;
}

/** El correo reutiliza el esquema del servicio (una sola regla); que no esté repetido lo comprueba el servicio. */
const esquema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre.'),
  correo: esquemaCorreo,
});

/**
 * Editar el nombre y el correo institucional de un supervisor (§5.3): son una credencial que entrega la empresa, así
 * que solo el Administrador los cambia. Si cambia el correo, cambia también su usuario de acceso. Se envía solo lo que
 * cambió. El celular, Discord y GitHub los edita el propio supervisor desde su perfil.
 */
export function FormularioDatosSupervisor({
  idActor,
  supervisor,
  onCerrar,
  entorno = ENTORNO,
}: Props) {
  const [nombre, setNombre] = useState(supervisor.nombre);
  const [correo, setCorreo] = useState(supervisor.correo);
  const [errores, setErrores] = useState<{ nombre?: string; correo?: string }>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambioNombre = nombre.trim() !== supervisor.nombre;
  const cambioCorreo = correo.trim() !== supervisor.correo;

  async function guardar(e: React.SyntheticEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    const valida = esquema.safeParse({ nombre, correo });
    if (!valida.success) {
      const porCampo: { nombre?: string; correo?: string } = {};
      for (const problema of valida.error.issues) {
        const campo = problema.path[0] as 'nombre' | 'correo';
        porCampo[campo] ??= problema.message;
      }
      setErrores(porCampo);
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      const resultado = await editarSupervisor(
        {
          idActor,
          idSupervisor: supervisor.id,
          ...(cambioNombre ? { nombre: valida.data.nombre } : {}),
          ...(cambioCorreo ? { correo: valida.data.correo } : {}),
        },
        entorno,
      );
      if (!resultado.ok) {
        setErrorGeneral(resultado.mensaje);
        setErrores({
          ...(resultado.campos?.nombre ? { nombre: resultado.campos.nombre } : {}),
          ...(resultado.campos?.correo ? { correo: resultado.campos.correo } : {}),
        });
        return;
      }
      toast.success('Datos del supervisor actualizados');
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !guardando && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar datos del supervisor</DialogTitle>
          <DialogDescription>
            El nombre y el correo institucional son una credencial que entrega la empresa. Si
            cambias el correo, cambia también su usuario de acceso.
          </DialogDescription>
        </DialogHeader>

        <form
          id="formulario-datos-supervisor"
          onSubmit={guardar}
          noValidate
          aria-label="Datos del supervisor"
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="supervisor-nombre">Nombre</Label>
            <Input
              id="supervisor-nombre"
              value={nombre}
              disabled={guardando}
              aria-invalid={errores.nombre ? true : undefined}
              onChange={(e) => setNombre(e.target.value)}
            />
            {errores.nombre && <p className="text-xs text-danger-text">{errores.nombre}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supervisor-correo">Correo institucional</Label>
            <Input
              id="supervisor-correo"
              value={correo}
              disabled={guardando}
              aria-invalid={errores.correo ? true : undefined}
              onChange={(e) => setCorreo(e.target.value)}
            />
            {errores.correo && <p className="text-xs text-danger-text">{errores.correo}</p>}
          </div>
          {/* Si el error ya salió junto a un campo, no se repite aquí. */}
          {errorGeneral && !errores.nombre && !errores.correo && (
            <p role="alert" className="text-sm text-danger-text">
              {errorGeneral}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="formulario-datos-supervisor"
            disabled={(!cambioNombre && !cambioCorreo) || guardando}
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
