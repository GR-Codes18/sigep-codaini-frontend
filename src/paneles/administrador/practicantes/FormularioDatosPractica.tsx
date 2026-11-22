import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { aCatalogo, duracionDePracticaMeses } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
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
import { fechaFinPrevista, type Fecha, type Id } from '@/domain';
import {
  editarDatosPractica,
  ENTORNO,
  listarCatalogoEvaluacion,
  obtenerConfiguracion,
  type Entorno,
} from '@/services';

interface Props {
  idActor: Id;
  practicante: {
    id: Id;
    nombre: string;
    idEspecialidad: Id | null;
    especialidad: string;
    fechaIngreso: Fecha;
    fechaFinPrevista: Fecha;
  };
  onCerrar: () => void;
  entorno?: Entorno;
}

const CLASE_SELECT =
  'h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
/** Forma del formulario; que las fechas existan en el calendario y el orden de ambas lo comprueba el servicio. */
const esquema = z.object({
  idEspecialidad: z.string().min(1, 'Elige una especialidad.'),
  fechaIngreso: z.string().regex(FECHA, 'Escribe la fecha de ingreso.'),
  fechaFin: z.string().regex(FECHA, 'Escribe la fecha de fin prevista.'),
});

/**
 * Editar los datos de la práctica (§5.2): especialidad, fecha de ingreso y fecha de fin prevista. Al cambiar el ingreso se
 * propone el fin con `fechaFinPrevista` (ingreso + la duración de Configuración) y se envían **las dos fechas** (F5-A: el
 * servicio nunca recalcula por su cuenta); si la persona ya escribió un fin a mano, no se pisa. El área sigue a la
 * especialidad, y el servicio valida activa/inactiva y que el fin no sea anterior al ingreso.
 */
export function FormularioDatosPractica({
  idActor,
  practicante,
  onCerrar,
  entorno = ENTORNO,
}: Props) {
  const cargarCatalogo = useCallback(
    () => listarCatalogoEvaluacion({ idActor }, entorno),
    [entorno, idActor],
  );
  const cargarConfiguracion = useCallback(
    () => obtenerConfiguracion({ idActor }, entorno),
    [entorno, idActor],
  );
  const catalogo = useConsulta(cargarCatalogo);
  const configuracion = useConsulta(cargarConfiguracion);
  const duracion = useMemo(
    () => (configuracion.valor === null ? null : duracionDePracticaMeses(configuracion.valor)),
    [configuracion.valor],
  );

  const [idEspecialidad, setIdEspecialidad] = useState(practicante.idEspecialidad ?? '');
  const [fechaIngreso, setFechaIngreso] = useState(practicante.fechaIngreso);
  const [fechaFin, setFechaFin] = useState(practicante.fechaFinPrevista);
  const [finEscritoAMano, setFinEscritoAMano] = useState(false);
  const [propuesta, setPropuesta] = useState<Fecha | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Las especialidades activas por área, más la actual aunque ya esté inactiva (para no perderla del selector).
  const areas = useMemo(() => {
    if (catalogo.valor === null) return [];
    return aCatalogo(catalogo.valor)
      .areas.map((a) => ({
        ...a,
        especialidades: a.especialidades.filter(
          (e) => e.activo || e.id === practicante.idEspecialidad,
        ),
      }))
      .filter((a) => a.especialidades.length > 0);
  }, [catalogo.valor, practicante.idEspecialidad]);

  function cambiarIngreso(valor: string) {
    setFechaIngreso(valor);
    if (finEscritoAMano || duracion === null || !FECHA.test(valor)) return;
    const calculada = fechaFinPrevista(valor, duracion);
    if (calculada.ok) {
      setFechaFin(calculada.fecha);
      setPropuesta(calculada.fecha);
    }
  }

  const cambios =
    idEspecialidad !== (practicante.idEspecialidad ?? '') ||
    fechaIngreso !== practicante.fechaIngreso ||
    fechaFin !== practicante.fechaFinPrevista;

  async function guardar(e: React.SyntheticEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    const valida = esquema.safeParse({ idEspecialidad, fechaIngreso, fechaFin });
    if (!valida.success) {
      const porCampo: Record<string, string> = {};
      for (const problema of valida.error.issues) {
        porCampo[String(problema.path[0])] ??= problema.message;
      }
      setErrores(porCampo);
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      const resultado = await editarDatosPractica(
        {
          idActor,
          idPracticante: practicante.id,
          id_especialidad: valida.data.idEspecialidad,
          fecha_ingreso: valida.data.fechaIngreso,
          fecha_fin_prevista: valida.data.fechaFin,
        },
        entorno,
      );
      if (!resultado.ok) {
        setErrorGeneral(resultado.mensaje);
        setErrores({
          ...(resultado.campos?.id_especialidad
            ? { idEspecialidad: resultado.campos.id_especialidad }
            : {}),
          ...(resultado.campos?.fecha_ingreso
            ? { fechaIngreso: resultado.campos.fecha_ingreso }
            : {}),
          ...(resultado.campos?.fecha_fin_prevista
            ? { fechaFin: resultado.campos.fecha_fin_prevista }
            : {}),
        });
        return;
      }
      toast.success('Datos de la práctica actualizados');
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !guardando && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar datos de la práctica</DialogTitle>
          <DialogDescription>
            Cambia la especialidad y las fechas de {practicante.nombre}. Los datos personales los
            edita cada practicante.
          </DialogDescription>
        </DialogHeader>

        <form
          id="formulario-datos-practica"
          onSubmit={guardar}
          noValidate
          aria-label="Datos de la práctica"
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="practica-especialidad">Especialidad</Label>
            <select
              id="practica-especialidad"
              value={idEspecialidad}
              disabled={guardando}
              aria-invalid={errores.idEspecialidad ? true : undefined}
              className={CLASE_SELECT}
              onChange={(e) => setIdEspecialidad(e.target.value)}
            >
              {idEspecialidad === '' && <option value="">Elige una especialidad</option>}
              {areas.map((a) => (
                <optgroup key={a.id} label={a.nombre}>
                  {a.especialidades.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errores.idEspecialidad && (
              <p className="text-xs text-danger-text">{errores.idEspecialidad}</p>
            )}
            <p className="text-xs text-text-2">El área técnica sigue a la especialidad elegida.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="practica-ingreso">Fecha de ingreso</Label>
            <Input
              id="practica-ingreso"
              type="date"
              value={fechaIngreso}
              disabled={guardando}
              aria-invalid={errores.fechaIngreso ? true : undefined}
              onChange={(e) => cambiarIngreso(e.target.value)}
            />
            {errores.fechaIngreso && (
              <p className="text-xs text-danger-text">{errores.fechaIngreso}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="practica-fin">Fecha de fin prevista</Label>
            <Input
              id="practica-fin"
              type="date"
              value={fechaFin}
              disabled={guardando}
              aria-invalid={errores.fechaFin ? true : undefined}
              onChange={(e) => {
                setFinEscritoAMano(true);
                setFechaFin(e.target.value);
              }}
            />
            {errores.fechaFin && <p className="text-xs text-danger-text">{errores.fechaFin}</p>}
            {propuesta !== null && propuesta === fechaFin && duracion !== null && (
              <p role="status" className="text-xs text-text-2">
                Propuesta: ingreso más {duracion} {duracion === 1 ? 'mes' : 'meses'}. Puedes
                cambiarla.
              </p>
            )}
          </div>

          {errorGeneral && (
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
            form="formulario-datos-practica"
            disabled={!cambios || guardando || catalogo.valor === null}
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
