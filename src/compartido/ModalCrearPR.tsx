import { useState } from 'react';
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
import { Textarea } from '@/compartido/ui/textarea';

export interface DatosPR {
  titulo: string;
  descripcion: string;
  ramaOrigen: string;
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  tituloPropuesto: string;
  plantillaDescripcion: string;
  ramas: string[];
  ramaBase: string;
  onCrear: (datos: DatosPR) => Promise<void>;
}

const esquema = z.object({
  titulo: z.string().trim().min(1, 'Ingresa un título'),
  descripcion: z.string().trim().min(1, 'Ingresa una descripción'),
  ramaOrigen: z.string().min(1, 'Elige una rama de trabajo'),
});

const MENSAJE_GENERICO = 'No se pudo crear el Pull Request. Inténtalo de nuevo.';

function Contenido({
  onCerrar,
  tituloPropuesto,
  plantillaDescripcion,
  ramas,
  ramaBase,
  onCrear,
}: Omit<Props, 'abierto'>) {
  const [titulo, setTitulo] = useState(tituloPropuesto);
  const [descripcion, setDescripcion] = useState(plantillaDescripcion);
  const [ramaOrigen, setRamaOrigen] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [errores, setErrores] = useState<Partial<Record<keyof DatosPR, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const filtradas = ramas.filter((r) => r.toLowerCase().includes(busqueda.trim().toLowerCase()));

  async function crear() {
    setErrorGeneral(null);
    const resultado = esquema.safeParse({ titulo, descripcion, ramaOrigen });
    if (!resultado.success) {
      const campos = resultado.error.flatten().fieldErrors;
      setErrores({
        titulo: campos.titulo?.[0],
        descripcion: campos.descripcion?.[0],
        ramaOrigen: campos.ramaOrigen?.[0],
      });
      return;
    }
    setErrores({});
    setCreando(true);
    try {
      await onCrear(resultado.data);
      onCerrar();
    } catch (e) {
      // La ventana no se cierra: se muestra el motivo y se puede reintentar.
      setErrorGeneral(e instanceof Error && e.message ? e.message : MENSAJE_GENERICO);
      setCreando(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Crear Pull Request</DialogTitle>
        <DialogDescription>La revisión y la fusión se realizan en GitHub.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pr-titulo">Título</Label>
          <Input
            id="pr-titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            disabled={creando}
            aria-invalid={errores.titulo ? true : undefined}
          />
          {errores.titulo && <p className="text-xs text-danger-text">{errores.titulo}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pr-descripcion">Descripción</Label>
          <Textarea
            id="pr-descripcion"
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={creando}
            aria-invalid={errores.descripcion ? true : undefined}
          />
          {errores.descripcion && <p className="text-xs text-danger-text">{errores.descripcion}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pr-buscar-rama">Rama de trabajo</Label>
          <Input
            id="pr-buscar-rama"
            type="search"
            placeholder="Buscar rama…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            disabled={creando}
          />
          <ul
            role="listbox"
            aria-label="Ramas disponibles"
            className="max-h-32 overflow-y-auto rounded-md border border-border"
          >
            {filtradas.length === 0 && (
              <li className="px-3 py-2 text-sm text-text-2">Sin resultados</li>
            )}
            {filtradas.map((r) => (
              <li key={r} role="option" aria-selected={r === ramaOrigen}>
                <button
                  type="button"
                  disabled={creando}
                  onClick={() => setRamaOrigen(r)}
                  className={
                    r === ramaOrigen
                      ? 'w-full bg-sidebar-accent px-3 py-2 text-left text-sm font-medium text-sidebar-accent-foreground'
                      : 'w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-2'
                  }
                >
                  {r}
                </button>
              </li>
            ))}
          </ul>
          {errores.ramaOrigen && <p className="text-xs text-danger-text">{errores.ramaOrigen}</p>}
          <p className="text-xs text-text-2">¿No ves tu rama? Asegúrate de haberla subido.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pr-rama-base">Rama base</Label>
          <Input id="pr-rama-base" value={ramaBase} readOnly disabled />
        </div>
      </div>

      {errorGeneral && (
        <p role="alert" className="text-sm text-danger-text">
          {errorGeneral}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCerrar} disabled={creando}>
          Cancelar
        </Button>
        <Button type="button" onClick={crear} disabled={creando}>
          {creando ? 'Creando…' : 'Crear PR'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function ModalCrearPR({ abierto, onCerrar, ...resto }: Props) {
  return (
    <Dialog open={abierto} onOpenChange={(valor) => !valor && onCerrar()}>
      <Contenido onCerrar={onCerrar} {...resto} />
    </Dialog>
  );
}
