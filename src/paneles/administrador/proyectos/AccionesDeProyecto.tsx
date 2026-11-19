import { useState } from 'react';
import type { DatosProyectoParaVista } from '@/app/adaptadores';
import { Button } from '@/compartido/ui/button';
import type { Id } from '@/domain';
import { ENTORNO, type AccionProyecto, type Entorno } from '@/services';
import { FormularioProyecto } from './FormularioProyecto';

interface Props {
  idActor: Id;
  proyecto: DatosProyectoParaVista;
  /** Lo que se puede cambiar: lo decide `puede()` y llega con la consulta; aquí solo se ofrece. */
  acciones: readonly AccionProyecto[];
  entorno?: Entorno;
}

/**
 * Las acciones del Administrador sobre los datos de un proyecto (§5.4): «Editar proyecto», que abre el formulario con los
 * grupos de campos que `puede()` permite (datos, rama base y reunión). Los enlaces tienen sus propios botones en su
 * sección. El ciclo de vida del proyecto llega con el bloque 4.
 */
export function AccionesDeProyecto({ idActor, proyecto, acciones, entorno = ENTORNO }: Props) {
  const [editando, setEditando] = useState(false);
  const puedeEditar =
    acciones.includes('EDITAR_DATOS') ||
    acciones.includes('CAMBIAR_RAMA_BASE') ||
    acciones.includes('DEFINIR_REUNION');

  return (
    <>
      {puedeEditar && (
        <div role="group" aria-label="Acciones" className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setEditando(true)}>
            Editar proyecto
          </Button>
        </div>
      )}
      {editando && (
        <FormularioProyecto
          modo="editar"
          idActor={idActor}
          proyecto={proyecto}
          acciones={acciones}
          onCerrar={() => setEditando(false)}
          entorno={entorno}
        />
      )}
    </>
  );
}
