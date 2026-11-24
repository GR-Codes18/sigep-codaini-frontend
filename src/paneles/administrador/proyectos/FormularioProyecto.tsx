import { CLASE_CAMPO } from '@/compartido/estiloCampo';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import type { DatosProyectoParaVista } from '@/app/adaptadores';
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
import { DIAS_SEMANA, type DiaSemana, type Id } from '@/domain';
import {
  cambiarRamaBase,
  crearProyecto,
  definirReunion,
  editarDatosProyecto,
  ENTORNO,
  esquemaDescripcionProyecto,
  esquemaFechaProyecto,
  esquemaNombreProyecto,
  esquemaRamaBase,
  esquemaRepositorio,
  type AccionProyecto,
  type Entorno,
  type PersonaResumen,
  type Resultado,
} from '@/services';
import { normalizarCodigoDeProyecto } from './codigo';

const ETIQUETA_DIA: Record<DiaSemana, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

type Campo =
  | 'nombre'
  | 'codigo'
  | 'descripcion'
  | 'fechaInicio'
  | 'fechaFin'
  | 'idSupervisor'
  | 'repositorio'
  | 'ramaBase'
  | 'dia'
  | 'hora';

interface Valores {
  nombre: string;
  codigo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  idSupervisor: string;
  repositorio: string;
  ramaBase: string;
  dia: DiaSemana | '';
  hora: string;
}

type Errores = Partial<Record<Campo, string>>;

/** Qué campo de la pantalla es cada campo de los servicios (los errores de servicio llegan con su nombre). */
const CAMPO_DE_SERVICIO: Record<string, Campo> = {
  nombre: 'nombre',
  codigo: 'codigo',
  descripcion: 'descripcion',
  fecha_inicio: 'fechaInicio',
  fecha_fin_prevista: 'fechaFin',
  idSupervisor: 'idSupervisor',
  repositorio_url: 'repositorio',
  rama_base: 'ramaBase',
  dia_reunion: 'dia',
  hora_reunion: 'hora',
};

function erroresDeServicio(campos: Record<string, string> | undefined): Errores {
  const errores: Errores = {};
  for (const [clave, mensaje] of Object.entries(campos ?? {})) {
    const campo = CAMPO_DE_SERVICIO[clave];
    if (campo !== undefined) errores[campo] ??= mensaje;
  }
  return errores;
}

function validar(valores: Valores, incluir: { datos: boolean; rama: boolean }): Errores {
  const errores: Errores = {};
  const marcar = (campo: Campo, resultado: { success: boolean; error?: z.ZodError }) => {
    if (!resultado.success) errores[campo] ??= resultado.error?.issues[0]?.message;
  };
  if (incluir.datos) {
    marcar('nombre', esquemaNombreProyecto.safeParse(valores.nombre));
    marcar('descripcion', esquemaDescripcionProyecto.safeParse(valores.descripcion));
    marcar('fechaInicio', esquemaFechaProyecto.safeParse(valores.fechaInicio));
    marcar('fechaFin', esquemaFechaProyecto.safeParse(valores.fechaFin));
    marcar('repositorio', esquemaRepositorio.safeParse(valores.repositorio));
  }
  if (incluir.rama) marcar('ramaBase', esquemaRamaBase.safeParse(valores.ramaBase));
  return errores;
}

/** Un error de servicio llega como texto: el primero que falla detiene el guardado (lo anterior ya quedó guardado). */
type Paso = () => Promise<Resultado<unknown>>;

interface PropsComunes {
  idActor: Id;
  onCerrar: () => void;
  entorno?: Entorno;
}

type Props = PropsComunes &
  (
    | {
        modo: 'crear';
        /** A quién se puede asignar el proyecto nuevo; lo decide la consulta (supervisores activos). */
        supervisores: readonly PersonaResumen[];
        onCreado: (idProyecto: Id) => void;
      }
    | {
        modo: 'editar';
        proyecto: DatosProyectoParaVista;
        /** Qué grupos de campos se pueden cambiar: lo decide `puede()` y llega con la consulta. */
        acciones: readonly AccionProyecto[];
      }
  );

function valoresIniciales(props: Props): Valores {
  if (props.modo === 'editar') {
    const p = props.proyecto;
    return {
      nombre: p.nombre,
      codigo: p.codigo,
      descripcion: p.descripcion,
      fechaInicio: p.fechaInicio,
      fechaFin: p.fechaFinPrevista,
      idSupervisor: '',
      repositorio: p.repositorioUrl,
      ramaBase: p.ramaBase,
      dia: p.diaReunion ?? '',
      hora: p.horaReunion ?? '',
    };
  }
  return {
    nombre: '',
    codigo: '',
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    idSupervisor: '',
    repositorio: '',
    ramaBase: '',
    dia: '',
    hora: '',
  };
}

function CampoDeFormulario({
  id,
  etiqueta,
  error,
  ayuda,
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-text-2">
        {etiqueta}
      </Label>
      {children}
      {ayuda && !error && <p className="text-xs text-text-2">{ayuda}</p>}
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  );
}

/**
 * «Nuevo proyecto» y «Editar proyecto» (§5.4), como diálogo.
 *
 * - **Crear:** nombre, código, descripción, fechas, supervisor, repositorio, rama base y reunión (opcional). El código se
 *   pone en mayúsculas y sin espacios antes de enviarlo; que sea de 3 a 5 caracteres y único entre todos los proyectos lo
 *   decide el servicio y su mensaje sale en el campo. El supervisor se elige entre los que ofrece la consulta.
 * - **Editar:** el código **no se edita** (se muestra, sin campo). Cada grupo (datos, rama base y reunión) solo se ofrece si
 *   `puede()` lo permite y llega en `acciones`. Se envía solo lo que cambió, cada grupo con su servicio, y si uno falla se
 *   muestra su mensaje (lo que ya se guardó no se vuelve a enviar). La reunión se quita dejando el día y la hora vacíos.
 */
export function FormularioProyecto(props: Props) {
  const { idActor, onCerrar, entorno = ENTORNO } = props;
  const inicial = valoresIniciales(props);
  const [valores, setValores] = useState<Valores>(inicial);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo: keyof Valores, valor: string) =>
    setValores((actuales) => ({ ...actuales, [campo]: valor }));

  const editando = props.modo === 'editar';
  const permite = (accion: AccionProyecto) => !editando || props.acciones.includes(accion);
  const porDatos = permite('EDITAR_DATOS');
  const porRama = permite('CAMBIAR_RAMA_BASE');
  const porReunion = permite('DEFINIR_REUNION');

  // Lo que cambió respecto de lo guardado (en «Editar», el proyecto llega al día con cada consulta).
  const base = editando ? valoresIniciales(props) : null;
  const cambioDatos =
    base !== null &&
    porDatos &&
    (valores.nombre.trim() !== base.nombre ||
      valores.descripcion.trim() !== base.descripcion ||
      valores.fechaInicio !== base.fechaInicio ||
      valores.fechaFin !== base.fechaFin ||
      valores.repositorio.trim() !== base.repositorio);
  const cambioRama = base !== null && porRama && valores.ramaBase.trim() !== base.ramaBase;
  const cambioReunion =
    base !== null && porReunion && (valores.dia !== base.dia || valores.hora !== base.hora);
  const hayCambios = !editando || cambioDatos || cambioRama || cambioReunion;

  async function guardar(e: React.SyntheticEvent) {
    e.preventDefault();
    setErrorGeneral(null);

    const encontrados = validar(valores, {
      datos: !editando || cambioDatos,
      rama: !editando || cambioRama,
    });
    if (props.modo === 'crear' && valores.idSupervisor === '') {
      encontrados.idSupervisor = 'Elige un supervisor.';
    }
    if (Object.keys(encontrados).length > 0) {
      setErrores(encontrados);
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      if (props.modo === 'crear') {
        const resultado = await crearProyecto(
          {
            idActor,
            nombre: valores.nombre,
            codigo: normalizarCodigoDeProyecto(valores.codigo),
            descripcion: valores.descripcion,
            fecha_inicio: valores.fechaInicio,
            fecha_fin_prevista: valores.fechaFin,
            idSupervisor: valores.idSupervisor,
            repositorio_url: valores.repositorio,
            rama_base: valores.ramaBase,
            dia_reunion: valores.dia === '' ? null : valores.dia,
            hora_reunion: valores.hora === '' ? null : valores.hora,
          },
          entorno,
        );
        if (!resultado.ok) {
          setErrores(erroresDeServicio(resultado.campos));
          setErrorGeneral(resultado.mensaje);
          return;
        }
        toast.success('Proyecto creado');
        props.onCreado(resultado.valor.id);
        onCerrar();
        return;
      }

      const idProyecto = props.proyecto.id;
      const pasos: Paso[] = [
        ...(cambioDatos
          ? [
              () =>
                editarDatosProyecto(
                  {
                    idActor,
                    idProyecto,
                    ...(valores.nombre.trim() !== base!.nombre ? { nombre: valores.nombre } : {}),
                    ...(valores.descripcion.trim() !== base!.descripcion
                      ? { descripcion: valores.descripcion }
                      : {}),
                    ...(valores.fechaInicio !== base!.fechaInicio
                      ? { fecha_inicio: valores.fechaInicio }
                      : {}),
                    ...(valores.fechaFin !== base!.fechaFin
                      ? { fecha_fin_prevista: valores.fechaFin }
                      : {}),
                    ...(valores.repositorio.trim() !== base!.repositorio
                      ? { repositorio_url: valores.repositorio }
                      : {}),
                  },
                  entorno,
                ),
            ]
          : []),
        ...(cambioRama
          ? [() => cambiarRamaBase({ idActor, idProyecto, rama_base: valores.ramaBase }, entorno)]
          : []),
        ...(cambioReunion
          ? [
              () =>
                definirReunion(
                  {
                    idActor,
                    idProyecto,
                    dia_reunion: valores.dia === '' ? null : valores.dia,
                    hora_reunion: valores.hora === '' ? null : valores.hora,
                  },
                  entorno,
                ),
            ]
          : []),
      ];
      for (const paso of pasos) {
        const resultado = await paso();
        if (!resultado.ok) {
          setErrores(erroresDeServicio(resultado.campos));
          setErrorGeneral(resultado.mensaje);
          return;
        }
      }
      toast.success('Proyecto actualizado');
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  const hayErrorDeCampo = Object.values(errores).some(Boolean);

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !guardando && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
          <DialogDescription>
            {editando
              ? 'Cambia solo lo que necesites. El código no se puede cambiar.'
              : 'Todo proyecto tiene un supervisor activo desde el inicio; el equipo se asigna después. El código no se podrá cambiar.'}
          </DialogDescription>
        </DialogHeader>

        <form
          id="formulario-proyecto"
          onSubmit={guardar}
          noValidate
          aria-label={editando ? 'Editar proyecto' : 'Nuevo proyecto'}
          className="space-y-3"
        >
          {porDatos && (
            <>
              <CampoDeFormulario id="proyecto-nombre" etiqueta="Nombre" error={errores.nombre}>
                <Input
                  id="proyecto-nombre"
                  value={valores.nombre}
                  disabled={guardando}
                  aria-invalid={errores.nombre ? true : undefined}
                  onChange={(e) => cambiar('nombre', e.target.value)}
                />
              </CampoDeFormulario>

              {props.modo === 'crear' ? (
                <CampoDeFormulario
                  id="proyecto-codigo"
                  etiqueta="Código"
                  error={errores.codigo}
                  ayuda="De 3 a 5 caracteres: letras de la A a la Z sin tildes y números. Único y no se puede cambiar."
                >
                  <Input
                    id="proyecto-codigo"
                    value={valores.codigo}
                    disabled={guardando}
                    aria-invalid={errores.codigo ? true : undefined}
                    onChange={(e) => cambiar('codigo', e.target.value)}
                  />
                </CampoDeFormulario>
              ) : (
                <p className="text-sm text-text-2">
                  Código: <span className="font-medium text-text">{props.proyecto.codigo}</span> (no
                  se puede cambiar)
                </p>
              )}

              <CampoDeFormulario
                id="proyecto-descripcion"
                etiqueta="Descripción"
                error={errores.descripcion}
              >
                <Textarea
                  id="proyecto-descripcion"
                  rows={3}
                  value={valores.descripcion}
                  disabled={guardando}
                  aria-invalid={errores.descripcion ? true : undefined}
                  onChange={(e) => cambiar('descripcion', e.target.value)}
                />
              </CampoDeFormulario>

              <div className="grid gap-3 sm:grid-cols-2">
                <CampoDeFormulario
                  id="proyecto-inicio"
                  etiqueta="Fecha de inicio"
                  error={errores.fechaInicio}
                >
                  <Input
                    id="proyecto-inicio"
                    type="date"
                    value={valores.fechaInicio}
                    disabled={guardando}
                    aria-invalid={errores.fechaInicio ? true : undefined}
                    onChange={(e) => cambiar('fechaInicio', e.target.value)}
                  />
                </CampoDeFormulario>
                <CampoDeFormulario
                  id="proyecto-fin"
                  etiqueta="Fecha de fin prevista"
                  error={errores.fechaFin}
                >
                  <Input
                    id="proyecto-fin"
                    type="date"
                    value={valores.fechaFin}
                    disabled={guardando}
                    aria-invalid={errores.fechaFin ? true : undefined}
                    onChange={(e) => cambiar('fechaFin', e.target.value)}
                  />
                </CampoDeFormulario>
              </div>

              {props.modo === 'crear' && (
                <CampoDeFormulario
                  id="proyecto-supervisor"
                  etiqueta="Supervisor"
                  error={errores.idSupervisor}
                >
                  <select
                    id="proyecto-supervisor"
                    value={valores.idSupervisor}
                    disabled={guardando}
                    aria-invalid={errores.idSupervisor ? true : undefined}
                    className={CLASE_CAMPO}
                    onChange={(e) => cambiar('idSupervisor', e.target.value)}
                  >
                    <option value="">Elige un supervisor</option>
                    {props.supervisores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </CampoDeFormulario>
              )}

              <CampoDeFormulario
                id="proyecto-repositorio"
                etiqueta="Repositorio"
                error={errores.repositorio}
                ayuda="Con la forma https://github.com/organización/repositorio, sin «/» final ni «.git»."
              >
                <Input
                  id="proyecto-repositorio"
                  value={valores.repositorio}
                  disabled={guardando}
                  aria-invalid={errores.repositorio ? true : undefined}
                  onChange={(e) => cambiar('repositorio', e.target.value)}
                />
              </CampoDeFormulario>
            </>
          )}

          {porRama && (
            <CampoDeFormulario
              id="proyecto-rama"
              etiqueta="Rama base"
              error={errores.ramaBase}
              ayuda="Sin espacios."
            >
              <Input
                id="proyecto-rama"
                value={valores.ramaBase}
                disabled={guardando}
                aria-invalid={errores.ramaBase ? true : undefined}
                onChange={(e) => cambiar('ramaBase', e.target.value)}
              />
            </CampoDeFormulario>
          )}

          {porReunion && (
            <fieldset className="space-y-2 rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-medium text-text">
                Reunión semanal (opcional)
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <CampoDeFormulario
                  id="proyecto-dia"
                  etiqueta="Día de la reunión"
                  error={errores.dia}
                >
                  <select
                    id="proyecto-dia"
                    value={valores.dia}
                    disabled={guardando}
                    aria-invalid={errores.dia ? true : undefined}
                    className={CLASE_CAMPO}
                    onChange={(e) => cambiar('dia', e.target.value)}
                  >
                    <option value="">Sin definir</option>
                    {DIAS_SEMANA.map((d) => (
                      <option key={d} value={d}>
                        {ETIQUETA_DIA[d]}
                      </option>
                    ))}
                  </select>
                </CampoDeFormulario>
                <CampoDeFormulario
                  id="proyecto-hora"
                  etiqueta="Hora de la reunión"
                  error={errores.hora}
                >
                  <Input
                    id="proyecto-hora"
                    type="time"
                    value={valores.hora}
                    disabled={guardando}
                    aria-invalid={errores.hora ? true : undefined}
                    onChange={(e) => cambiar('hora', e.target.value)}
                  />
                </CampoDeFormulario>
              </div>
              <p className="text-xs text-text-2">
                Para quitar la reunión deja el día en «Sin definir» y la hora vacía. Si cambia, se
                avisa al equipo.
              </p>
            </fieldset>
          )}

          {errorGeneral && !hayErrorDeCampo && (
            <p role="alert" className="text-sm text-danger-text">
              {errorGeneral}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" form="formulario-proyecto" disabled={!hayCambios || guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar' : 'Crear proyecto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
