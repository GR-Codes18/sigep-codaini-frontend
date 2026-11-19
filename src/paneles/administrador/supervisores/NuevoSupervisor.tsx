import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  ModalContrasenaTemporal,
  type ContrasenaTemporal,
} from '@/compartido/ModalContrasenaTemporal';
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
import { crearSupervisor, ENTORNO, esquemaCelular, esquemaCorreo, type Entorno } from '@/services';

interface Props {
  idActor: Id;
  entorno?: Entorno;
}

type Campo = 'nombre' | 'correo' | 'celular';

/** El correo y el celular reutilizan los esquemas del servicio (una sola regla); el servicio vuelve a validar todo. */
const esquema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre.'),
  correo: esquemaCorreo,
  celular: esquemaCelular,
});

const VACIO: Record<Campo, string> = { nombre: '', correo: '', celular: '' };

function CampoDeTexto({
  campo,
  etiqueta,
  valor,
  error,
  deshabilitado,
  onCambiar,
}: {
  campo: Campo;
  etiqueta: string;
  valor: string;
  error: string | undefined;
  deshabilitado: boolean;
  onCambiar: (valor: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`nuevo-supervisor-${campo}`}>{etiqueta}</Label>
      <Input
        id={`nuevo-supervisor-${campo}`}
        value={valor}
        disabled={deshabilitado}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onCambiar(e.target.value)}
      />
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  );
}

function Formulario({
  idActor,
  entorno,
  onCerrar,
  onCreado,
}: {
  idActor: Id;
  entorno: Entorno;
  onCerrar: () => void;
  onCreado: (cuenta: ContrasenaTemporal) => void;
}) {
  const [valores, setValores] = useState(VACIO);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo: Campo) => (valor: string) =>
    setValores((actuales) => ({ ...actuales, [campo]: valor }));

  async function crear(e: React.SyntheticEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    const valida = esquema.safeParse(valores);
    if (!valida.success) {
      const porCampo: Partial<Record<Campo, string>> = {};
      for (const problema of valida.error.issues) {
        const campo = problema.path[0] as Campo;
        porCampo[campo] ??= problema.message;
      }
      setErrores(porCampo);
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      const resultado = await crearSupervisor({ idActor, ...valida.data }, entorno);
      if (!resultado.ok) {
        setErrorGeneral(resultado.mensaje);
        setErrores({
          ...(resultado.campos?.nombre ? { nombre: resultado.campos.nombre } : {}),
          ...(resultado.campos?.correo ? { correo: resultado.campos.correo } : {}),
          ...(resultado.campos?.celular ? { celular: resultado.campos.celular } : {}),
        });
        return;
      }
      toast.success('Supervisor creado');
      onCreado({
        titulo: 'Cuenta de supervisor creada',
        nombre: valida.data.nombre,
        correo: valida.data.correo,
        contrasena: resultado.valor.contrasena_temporal,
      });
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nuevo supervisor</DialogTitle>
        <DialogDescription>
          Escribe su nombre, su correo institucional y su celular. Recibirá una contraseña temporal
          que verás una sola vez.
        </DialogDescription>
      </DialogHeader>

      <form
        id="formulario-nuevo-supervisor"
        onSubmit={crear}
        noValidate
        aria-label="Nuevo supervisor"
        className="space-y-3"
      >
        <CampoDeTexto
          campo="nombre"
          etiqueta="Nombre"
          valor={valores.nombre}
          error={errores.nombre}
          deshabilitado={guardando}
          onCambiar={cambiar('nombre')}
        />
        <CampoDeTexto
          campo="correo"
          etiqueta="Correo institucional"
          valor={valores.correo}
          error={errores.correo}
          deshabilitado={guardando}
          onCambiar={cambiar('correo')}
        />
        <CampoDeTexto
          campo="celular"
          etiqueta="Celular"
          valor={valores.celular}
          error={errores.celular}
          deshabilitado={guardando}
          onCambiar={cambiar('celular')}
        />
        {/* Si el error ya salió junto a un campo, no se repite aquí. */}
        {errorGeneral && !errores.nombre && !errores.correo && !errores.celular && (
          <p role="alert" className="text-sm text-danger-text">
            {errorGeneral}
          </p>
        )}
      </form>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" form="formulario-nuevo-supervisor" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear supervisor'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/**
 * «Nuevo supervisor» (§5.3): nombre, correo y celular. Al crearlo muestra su contraseña temporal **una sola vez**, que el
 * Administrador entrega por fuera del sistema. Que el correo no esté repetido lo comprueba el servicio y su mensaje sale
 * en el campo. La contraseña vive solo en el estado de este componente: no se persiste.
 */
export function NuevoSupervisor({ idActor, entorno = ENTORNO }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [cuenta, setCuenta] = useState<ContrasenaTemporal | null>(null);

  return (
    <>
      <Button type="button" onClick={() => setAbierto(true)}>
        Nuevo supervisor
      </Button>

      <Dialog open={abierto} onOpenChange={(valor) => !valor && setAbierto(false)}>
        {/* El contenido se desmonta al cerrar: los campos y los errores se reinician solos. */}
        {abierto && (
          <Formulario
            idActor={idActor}
            entorno={entorno}
            onCerrar={() => setAbierto(false)}
            onCreado={setCuenta}
          />
        )}
      </Dialog>

      <ModalContrasenaTemporal datos={cuenta} onCerrar={() => setCuenta(null)} />
    </>
  );
}
