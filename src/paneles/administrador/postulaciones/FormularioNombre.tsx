import { useState } from 'react';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Label } from '@/compartido/ui/label';
import type { Resultado } from '@/services';

interface Props {
  /** Etiqueta del campo y nombre accesible del formulario, p. ej. «Nombre del área». */
  etiqueta: string;
  etiquetaGuardar: string;
  valorInicial?: string;
  /** Crea o edita; si falla, el mensaje del servicio se muestra aquí y el formulario sigue abierto. */
  onGuardar: (nombre: string) => Promise<Resultado<unknown>>;
  onCancelar: () => void;
}

/**
 * Un formulario de un solo campo (el nombre de un área técnica o de una especialidad). Que el nombre no esté vacío ni
 * repetido lo comprueba el servicio; aquí solo se muestra su error.
 */
export function FormularioNombre({
  etiqueta,
  etiquetaGuardar,
  valorInicial = '',
  onGuardar,
  onCancelar,
}: Props) {
  const [nombre, setNombre] = useState(valorInicial);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.SyntheticEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const resultado = await onGuardar(nombre);
      if (!resultado.ok) {
        setError(resultado.campos?.nombre ?? resultado.mensaje);
        return;
      }
      onCancelar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label={etiqueta}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="min-w-56 flex-1 space-y-1.5">
        <Label htmlFor={`nombre-${etiqueta}`}>{etiqueta}</Label>
        <Input
          id={`nombre-${etiqueta}`}
          value={nombre}
          disabled={guardando}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={guardando}>
        {guardando ? 'Guardando…' : etiquetaGuardar}
      </Button>
      <Button type="button" variant="outline" disabled={guardando} onClick={onCancelar}>
        Cancelar
      </Button>
      {error && (
        <p role="alert" className="basis-full text-sm text-danger-text">
          {error}
        </p>
      )}
    </form>
  );
}
