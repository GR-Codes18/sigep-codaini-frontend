import { useState } from 'react';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Label } from '@/compartido/ui/label';
import { Textarea } from '@/compartido/ui/textarea';
import { esquemaTarea, type DatosTarea } from './esquemaTarea';

interface Props {
  modo: 'crear' | 'editar';
  proyectos: { id: string; nombre: string }[];
  valoresIniciales?: Partial<DatosTarea>;
  onGuardar: (datos: DatosTarea) => Promise<void>;
  onCancelar: () => void;
}

const MENSAJE_GENERICO = 'No se pudo guardar la tarea. Inténtalo de nuevo.';

export function FormularioTarea({
  modo,
  proyectos,
  valoresIniciales,
  onGuardar,
  onCancelar,
}: Props) {
  const [datos, setDatos] = useState<DatosTarea>({
    idProyecto: valoresIniciales?.idProyecto ?? (proyectos.length === 1 ? proyectos[0].id : ''),
    titulo: valoresIniciales?.titulo ?? '',
    descripcion: valoresIniciales?.descripcion ?? '',
    fechaLimite: valoresIniciales?.fechaLimite ?? '',
    requiereSupervision: valoresIniciales?.requiereSupervision ?? false,
    requierePr: valoresIniciales?.requierePr ?? true,
  });
  const [errores, setErrores] = useState<Partial<Record<keyof DatosTarea, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = <K extends keyof DatosTarea>(clave: K, valor: DatosTarea[K]) =>
    setDatos((d) => ({ ...d, [clave]: valor }));

  async function enviar(e: React.SyntheticEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    const resultado = esquemaTarea.safeParse(datos);
    if (!resultado.success) {
      const c = resultado.error.flatten().fieldErrors;
      setErrores({
        idProyecto: c.idProyecto?.[0],
        titulo: c.titulo?.[0],
        descripcion: c.descripcion?.[0],
        fechaLimite: c.fechaLimite?.[0],
      });
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      await onGuardar(resultado.data);
    } catch (err) {
      setErrorGeneral(err instanceof Error && err.message ? err.message : MENSAJE_GENERICO);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="tarea-proyecto">Proyecto</Label>
        <select
          id="tarea-proyecto"
          value={datos.idProyecto}
          onChange={(e) => cambiar('idProyecto', e.target.value)}
          disabled={guardando || modo === 'editar'}
          className="h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text disabled:opacity-50"
        >
          <option value="">Elige un proyecto</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        {errores.idProyecto && <p className="text-xs text-danger-text">{errores.idProyecto}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tarea-titulo">Título</Label>
        <Input
          id="tarea-titulo"
          value={datos.titulo}
          onChange={(e) => cambiar('titulo', e.target.value)}
          disabled={guardando}
          aria-invalid={errores.titulo ? true : undefined}
        />
        {errores.titulo && <p className="text-xs text-danger-text">{errores.titulo}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tarea-descripcion">Descripción</Label>
        <Textarea
          id="tarea-descripcion"
          rows={4}
          value={datos.descripcion}
          onChange={(e) => cambiar('descripcion', e.target.value)}
          disabled={guardando}
          aria-invalid={errores.descripcion ? true : undefined}
        />
        {errores.descripcion && <p className="text-xs text-danger-text">{errores.descripcion}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tarea-fecha">Fecha límite</Label>
        <Input
          id="tarea-fecha"
          type="date"
          value={datos.fechaLimite}
          onChange={(e) => cambiar('fechaLimite', e.target.value)}
          disabled={guardando}
          aria-invalid={errores.fechaLimite ? true : undefined}
        />
        {errores.fechaLimite && <p className="text-xs text-danger-text">{errores.fechaLimite}</p>}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={datos.requiereSupervision}
            onChange={(e) => cambiar('requiereSupervision', e.target.checked)}
            disabled={guardando}
          />
          Requiere supervisión
        </label>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={datos.requierePr}
            onChange={(e) => cambiar('requierePr', e.target.checked)}
            disabled={guardando}
          />
          Requiere PR
        </label>
      </div>

      {errorGeneral && (
        <p role="alert" className="text-sm text-danger-text">
          {errorGeneral}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : modo === 'crear' ? 'Crear tarea' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
