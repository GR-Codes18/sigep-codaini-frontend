import { useState } from 'react';
import { toast } from 'sonner';
import type { AreaParaVista, BloqueParaVista, EspecialidadParaVista } from '@/app/adaptadores';
import { Insignia } from '@/compartido/Insignia';
import { Button } from '@/compartido/ui/button';
import type { Resultado } from '@/services';
import { EditorBloqueCriterios, type CriterioParaGuardar } from './EditorBloqueCriterios';
import { FormularioNombre } from './FormularioNombre';

/** Lo que la página sabe hacer sobre el catálogo; cada función llama al servicio que corresponde. */
export interface AccionesDelCatalogo {
  editarArea: (idArea: string, nombre: string) => Promise<Resultado<unknown>>;
  cambiarActivoArea: (idArea: string, activo: boolean) => Promise<Resultado<unknown>>;
  crearEspecialidad: (idArea: string, nombre: string) => Promise<Resultado<unknown>>;
  editarEspecialidad: (idEspecialidad: string, nombre: string) => Promise<Resultado<unknown>>;
  cambiarActivoEspecialidad: (
    idEspecialidad: string,
    activo: boolean,
  ) => Promise<Resultado<unknown>>;
  guardarBloque: (
    idArea: string,
    idEspecialidad: string | null,
    criterios: CriterioParaGuardar[],
  ) => Promise<Resultado<unknown>>;
}

/** Activar o desactivar un área o una especialidad: solo se puede activar con su bloque válido. */
function BotonActivar({
  tipo,
  nombre,
  activo,
  bloque,
  onCambiar,
}: {
  tipo: 'área' | 'especialidad';
  nombre: string;
  activo: boolean;
  bloque: BloqueParaVista;
  onCambiar: (activo: boolean) => Promise<Resultado<unknown>>;
}) {
  const [procesando, setProcesando] = useState(false);
  const noSePuedeActivar = !activo && !bloque.valido;

  async function cambiar() {
    setProcesando(true);
    try {
      const resultado = await onCambiar(!activo);
      if (!resultado.ok) toast.error(resultado.mensaje);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={procesando || noSePuedeActivar}
      aria-label={`${activo ? 'Desactivar' : 'Activar'} ${tipo} ${nombre}`}
      onClick={cambiar}
    >
      {activo ? 'Desactivar' : 'Activar'}
    </Button>
  );
}

/** El aviso de por qué un área o una especialidad inactiva todavía no se puede activar. */
function AvisoParaActivar({ activo, bloque }: { activo: boolean; bloque: BloqueParaVista }) {
  if (activo || bloque.valido) return null;
  return (
    <p className="text-sm text-text-2">
      Para activarla, los criterios activos de su bloque deben sumar 100. {bloque.mensajeInvalido}
    </p>
  );
}

function Criterios({
  titulo,
  bloque,
  tipoBloque,
  onGuardar,
}: {
  titulo: string;
  bloque: BloqueParaVista;
  tipoBloque: 'AREA' | 'ESPECIALIDAD';
  onGuardar: (criterios: CriterioParaGuardar[]) => Promise<Resultado<unknown>>;
}) {
  return (
    <details className="group">
      <summary className="cursor-pointer rounded-md py-1 text-sm font-medium text-text hover:text-link focus-visible:ring-2 focus-visible:ring-focus">
        {titulo} · suma {bloque.suma}/100
      </summary>
      <div className="mt-2">
        <EditorBloqueCriterios
          bloque={tipoBloque}
          criterios={bloque.criterios}
          onGuardar={onGuardar}
        />
      </div>
    </details>
  );
}

function FilaDeEspecialidad({
  idArea,
  especialidad,
  acciones,
}: {
  idArea: string;
  especialidad: EspecialidadParaVista;
  acciones: AccionesDelCatalogo;
}) {
  const [editando, setEditando] = useState(false);
  return (
    <section aria-label={`Especialidad ${especialidad.nombre}`} className="space-y-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text">{especialidad.nombre}</h3>
          <Insignia tipo="catalogo" estado={especialidad.activo ? 'ACTIVO' : 'INACTIVO'} />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Editar nombre de la especialidad ${especialidad.nombre}`}
            onClick={() => setEditando(true)}
          >
            Editar nombre
          </Button>
          <BotonActivar
            tipo="especialidad"
            nombre={especialidad.nombre}
            activo={especialidad.activo}
            bloque={especialidad.bloque}
            onCambiar={(activo) => acciones.cambiarActivoEspecialidad(especialidad.id, activo)}
          />
        </div>
      </div>
      {editando && (
        <FormularioNombre
          etiqueta="Nombre de la especialidad"
          etiquetaGuardar="Guardar nombre"
          valorInicial={especialidad.nombre}
          onGuardar={(nombre) => acciones.editarEspecialidad(especialidad.id, nombre)}
          onCancelar={() => setEditando(false)}
        />
      )}
      <AvisoParaActivar activo={especialidad.activo} bloque={especialidad.bloque} />
      <Criterios
        titulo="Criterios de la especialidad"
        bloque={especialidad.bloque}
        tipoBloque="ESPECIALIDAD"
        onGuardar={(criterios) => acciones.guardarBloque(idArea, especialidad.id, criterios)}
      />
    </section>
  );
}

/**
 * Un área técnica con sus criterios generales y sus especialidades (§5.1). Las áreas y las especialidades **nacen
 * inactivas** y solo se activan cuando los criterios activos de su bloque suman 100; nada se borra y desactivar no
 * arrastra a las demás. La activación la vuelve a comprobar el servicio.
 */
export function SeccionDeArea({
  area,
  acciones,
}: {
  area: AreaParaVista;
  acciones: AccionesDelCatalogo;
}) {
  const [editando, setEditando] = useState(false);
  const [agregando, setAgregando] = useState(false);

  return (
    <section
      aria-label={`Área ${area.nombre}`}
      className="rounded-xl border border-border bg-surface p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-text">{area.nombre}</h2>
          <Insignia tipo="catalogo" estado={area.activo ? 'ACTIVO' : 'INACTIVO'} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Editar nombre del área ${area.nombre}`}
            onClick={() => setEditando(true)}
          >
            Editar nombre
          </Button>
          <BotonActivar
            tipo="área"
            nombre={area.nombre}
            activo={area.activo}
            bloque={area.bloque}
            onCambiar={(activo) => acciones.cambiarActivoArea(area.id, activo)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Nueva especialidad en ${area.nombre}`}
            onClick={() => setAgregando(true)}
          >
            Nueva especialidad
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {editando && (
          <FormularioNombre
            etiqueta="Nombre del área"
            etiquetaGuardar="Guardar nombre"
            valorInicial={area.nombre}
            onGuardar={(nombre) => acciones.editarArea(area.id, nombre)}
            onCancelar={() => setEditando(false)}
          />
        )}
        <AvisoParaActivar activo={area.activo} bloque={area.bloque} />
      </div>

      <div className="mt-3 divide-y divide-border border-t border-border">
        <div className="py-2">
          <Criterios
            titulo="Criterios generales del área"
            bloque={area.bloque}
            tipoBloque="AREA"
            onGuardar={(criterios) => acciones.guardarBloque(area.id, null, criterios)}
          />
        </div>

        {agregando && (
          <div className="py-3">
            <FormularioNombre
              etiqueta="Nombre de la nueva especialidad"
              etiquetaGuardar="Crear especialidad"
              onGuardar={(nombre) => acciones.crearEspecialidad(area.id, nombre)}
              onCancelar={() => setAgregando(false)}
            />
          </div>
        )}
        {area.especialidades.length === 0 ? (
          <p className="py-3 text-sm text-text-2">Esta área todavía no tiene especialidades.</p>
        ) : (
          area.especialidades.map((e) => (
            <FilaDeEspecialidad key={e.id} idArea={area.id} especialidad={e} acciones={acciones} />
          ))
        )}
      </div>
    </section>
  );
}
