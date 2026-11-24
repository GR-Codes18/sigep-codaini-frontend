import { CampoDeFormulario } from '@/compartido/CampoDeFormulario';
import { CLASE_CAMPO } from '@/compartido/estiloCampo';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Textarea } from '@/compartido/ui/textarea';
import type { Tarea } from '@/domain';
import { crearTarea, editarTarea, type Entorno, type Fallo, type Resultado } from '@/services';
import { esquemaEdicionTarea, esquemaTarea, type DatosTarea } from './esquemaTarea';

interface PropsComunes {
  idActor: string;
  proyectos: { id: string; nombre: string }[];
  valoresIniciales?: Partial<DatosTarea>;
  onGuardada?: (tarea: Tarea) => void;
  onCancelar: () => void;
  /** Solo lo cambian las pruebas (para no esperar la demora simulada de los servicios). */
  entorno?: Entorno;
}

type Props = PropsComunes &
  ({ modo: 'crear'; idTarea?: never } | { modo: 'editar'; idTarea: string });

const MENSAJE_GENERICO = 'No se pudo guardar la tarea. Inténtalo de nuevo.';

function erroresDesdeServicio(fallo: Fallo): Partial<Record<keyof DatosTarea, string>> {
  const campos = fallo.campos;
  return {
    idProyecto: campos?.idProyecto,
    titulo: campos?.titulo,
    descripcion: campos?.descripcion,
    fechaLimite: campos?.fecha_limite ?? campos?.fechaLimite,
    requiereSupervision: campos?.requiere_supervision ?? campos?.requiereSupervision,
    requierePr: campos?.requiere_pr ?? campos?.requierePr,
  };
}

function erroresDesdeValidacion(error: z.ZodError): Partial<Record<keyof DatosTarea, string>> {
  const errores: Partial<Record<keyof DatosTarea, string>> = {};
  for (const issue of error.issues) {
    switch (issue.path[0]) {
      case 'idProyecto':
        errores.idProyecto ??= issue.message;
        break;
      case 'titulo':
        errores.titulo ??= issue.message;
        break;
      case 'descripcion':
        errores.descripcion ??= issue.message;
        break;
      case 'fechaLimite':
        errores.fechaLimite ??= issue.message;
        break;
      case 'requiereSupervision':
        errores.requiereSupervision ??= issue.message;
        break;
      case 'requierePr':
        errores.requierePr ??= issue.message;
        break;
    }
  }
  return errores;
}

export function FormularioTarea({
  modo,
  idActor,
  idTarea,
  proyectos,
  valoresIniciales,
  onGuardada,
  onCancelar,
  entorno,
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
    let resultado: Resultado<Tarea>;
    try {
      if (modo === 'crear') {
        const validacion = esquemaTarea.safeParse(datos);
        if (!validacion.success) {
          setErrores(erroresDesdeValidacion(validacion.error));
          return;
        }
        setErrores({});
        setGuardando(true);
        resultado = await crearTarea(
          {
            idActor,
            idProyecto: validacion.data.idProyecto,
            titulo: validacion.data.titulo,
            descripcion: validacion.data.descripcion,
            fecha_limite: validacion.data.fechaLimite,
            requiere_supervision: validacion.data.requiereSupervision,
            requiere_pr: validacion.data.requierePr,
          },
          entorno,
        );
      } else {
        const validacion = esquemaEdicionTarea.safeParse(datos);
        if (!validacion.success) {
          setErrores(erroresDesdeValidacion(validacion.error));
          return;
        }
        setErrores({});
        setGuardando(true);
        resultado = await editarTarea(
          {
            idActor,
            idTarea,
            titulo: validacion.data.titulo,
            descripcion: validacion.data.descripcion,
            fecha_limite: validacion.data.fechaLimite,
          },
          entorno,
        );
      }
      if (!resultado.ok) {
        const erroresCampos = erroresDesdeServicio(resultado);
        setErrores(erroresCampos);
        setErrorGeneral(
          resultado.campos?._general ??
            (Object.values(erroresCampos).some(Boolean) ? null : resultado.mensaje),
        );
        setGuardando(false);
        return;
      }
      onGuardada?.(resultado.valor);
      onCancelar();
    } catch (err) {
      setErrorGeneral(err instanceof Error && err.message ? err.message : MENSAJE_GENERICO);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <CampoDeFormulario htmlFor="tarea-proyecto" etiqueta="Proyecto">
        <select
          id="tarea-proyecto"
          value={datos.idProyecto}
          onChange={(e) => cambiar('idProyecto', e.target.value)}
          disabled={guardando || modo === 'editar'}
          className={CLASE_CAMPO}
        >
          <option value="">Elige un proyecto</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        {errores.idProyecto && <p className="text-xs text-danger-text">{errores.idProyecto}</p>}
      </CampoDeFormulario>

      <CampoDeFormulario htmlFor="tarea-titulo" etiqueta="Título">
        <Input
          id="tarea-titulo"
          value={datos.titulo}
          onChange={(e) => cambiar('titulo', e.target.value)}
          disabled={guardando}
          aria-invalid={errores.titulo ? true : undefined}
        />
        {errores.titulo && <p className="text-xs text-danger-text">{errores.titulo}</p>}
      </CampoDeFormulario>

      <CampoDeFormulario htmlFor="tarea-descripcion" etiqueta="Descripción">
        <Textarea
          id="tarea-descripcion"
          rows={4}
          value={datos.descripcion}
          onChange={(e) => cambiar('descripcion', e.target.value)}
          disabled={guardando}
          aria-invalid={errores.descripcion ? true : undefined}
        />
        {errores.descripcion && <p className="text-xs text-danger-text">{errores.descripcion}</p>}
      </CampoDeFormulario>

      <CampoDeFormulario htmlFor="tarea-fecha" etiqueta="Fecha límite">
        <Input
          id="tarea-fecha"
          type="date"
          value={datos.fechaLimite}
          onChange={(e) => cambiar('fechaLimite', e.target.value)}
          disabled={guardando}
          aria-invalid={errores.fechaLimite ? true : undefined}
        />
        {errores.fechaLimite && <p className="text-xs text-danger-text">{errores.fechaLimite}</p>}
      </CampoDeFormulario>

      {modo === 'crear' && (
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
      )}

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
