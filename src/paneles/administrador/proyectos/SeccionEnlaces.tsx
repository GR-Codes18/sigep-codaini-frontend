import { CampoDeFormulario } from '@/compartido/CampoDeFormulario';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import type { EnlaceParaVista } from '@/app/adaptadores';
import { ModalConfirmacion } from '@/compartido/ModalConfirmacion';
import { FilaDeLista, ListaDeFilas } from '@/compartido/ListaDeFilas';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
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
import type { Id } from '@/domain';
import {
  agregarEnlace,
  editarEnlace,
  ENTORNO,
  esquemaNombreEnlace,
  esquemaUrlEnlace,
  quitarEnlace,
  type Entorno,
  type Resultado,
} from '@/services';

interface Props {
  idActor: Id;
  idProyecto: Id;
  enlaces: readonly EnlaceParaVista[];
  /** `GESTIONAR_ENLACES`: lo decide `puede()` y llega con la consulta; sin él la lista es de solo lectura. */
  puedeGestionar: boolean;
  entorno?: Entorno;
}

const esquema = z.object({ nombre: esquemaNombreEnlace, url: esquemaUrlEnlace });

/** Un error de servicio llega al modal como excepción: el modal se queda abierto y muestra el mensaje. */
function exigirExito<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(resultado.mensaje);
  return resultado.valor;
}

function FormularioEnlace({
  idActor,
  idProyecto,
  enlace,
  onCerrar,
  entorno,
}: {
  idActor: Id;
  idProyecto: Id;
  /** Sin enlace, se agrega uno nuevo. */
  enlace: EnlaceParaVista | null;
  onCerrar: () => void;
  entorno: Entorno;
}) {
  const [nombre, setNombre] = useState(enlace?.nombre ?? '');
  const [url, setUrl] = useState(enlace?.url ?? '');
  const [errores, setErrores] = useState<{ nombre?: string; url?: string }>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambioNombre = enlace === null || nombre.trim() !== enlace.nombre;
  const cambioUrl = enlace === null || url.trim() !== enlace.url;

  async function guardar(e: React.SyntheticEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    const valida = esquema.safeParse({ nombre, url });
    if (!valida.success) {
      const porCampo: { nombre?: string; url?: string } = {};
      for (const problema of valida.error.issues) {
        const campo = problema.path[0] as 'nombre' | 'url';
        porCampo[campo] ??= problema.message;
      }
      setErrores(porCampo);
      return;
    }
    setErrores({});
    setGuardando(true);
    try {
      const resultado =
        enlace === null
          ? await agregarEnlace({ idActor, idProyecto, ...valida.data }, entorno)
          : await editarEnlace(
              {
                idActor,
                idProyecto,
                idEnlace: enlace.id,
                ...(cambioNombre ? { nombre: valida.data.nombre } : {}),
                ...(cambioUrl ? { url: valida.data.url } : {}),
              },
              entorno,
            );
      if (!resultado.ok) {
        setErrorGeneral(resultado.mensaje);
        setErrores({
          ...(resultado.campos?.nombre ? { nombre: resultado.campos.nombre } : {}),
          ...(resultado.campos?.url ? { url: resultado.campos.url } : {}),
        });
        return;
      }
      toast.success(enlace === null ? 'Enlace agregado' : 'Enlace actualizado');
      onCerrar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && !guardando && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{enlace === null ? 'Agregar enlace' : 'Editar enlace'}</DialogTitle>
          <DialogDescription>
            Una carpeta de documentos, el canal de Discord u otro medio que use el equipo. Todo el
            equipo lo ve.
          </DialogDescription>
        </DialogHeader>

        <form
          id="formulario-enlace"
          onSubmit={guardar}
          noValidate
          aria-label={enlace === null ? 'Agregar enlace' : 'Editar enlace'}
          className="space-y-3"
        >
          <CampoDeFormulario htmlFor="enlace-nombre" etiqueta="Nombre">
            <Input
              id="enlace-nombre"
              value={nombre}
              disabled={guardando}
              aria-invalid={errores.nombre ? true : undefined}
              onChange={(e) => setNombre(e.target.value)}
            />
            {errores.nombre && <p className="text-xs text-danger-text">{errores.nombre}</p>}
          </CampoDeFormulario>
          <CampoDeFormulario htmlFor="enlace-url" etiqueta="Dirección">
            <Input
              id="enlace-url"
              value={url}
              disabled={guardando}
              aria-invalid={errores.url ? true : undefined}
              onChange={(e) => setUrl(e.target.value)}
            />
            {errores.url && <p className="text-xs text-danger-text">{errores.url}</p>}
          </CampoDeFormulario>
          {errorGeneral && !errores.nombre && !errores.url && (
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
            form="formulario-enlace"
            disabled={guardando || (enlace !== null && !cambioNombre && !cambioUrl)}
          >
            {guardando ? 'Guardando…' : enlace === null ? 'Agregar' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Enlaces útiles del proyecto (§5.4): una lista de nombre y dirección que todo el equipo ve. Quien puede gestionarlos
 * (`GESTIONAR_ENLACES`, que decide `puede()`) agrega, edita y quita; el resto ve la lista de solo lectura. Quitar un
 * enlace pide confirmación.
 */
export function SeccionEnlaces({
  idActor,
  idProyecto,
  enlaces,
  puedeGestionar,
  entorno = ENTORNO,
}: Props) {
  // `undefined`: cerrado; `null`: agregando; un enlace: editándolo.
  const [formulario, setFormulario] = useState<EnlaceParaVista | null | undefined>(undefined);
  const [quitando, setQuitando] = useState<EnlaceParaVista | null>(null);

  return (
    <PanelDeDatos
      titulo="Enlaces útiles"
      acciones={
        puedeGestionar ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setFormulario(null)}>
            Agregar enlace
          </Button>
        ) : undefined
      }
    >
      {enlaces.length === 0 ? (
        <p className="text-sm text-text-2">Aún no hay enlaces útiles.</p>
      ) : (
        <ListaDeFilas>
          {enlaces.map((e) => (
            <FilaDeLista key={e.id}>
              <div className="min-w-0">
                <p className="font-medium text-text">{e.nombre}</p>
                <a
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs text-link underline underline-offset-2"
                >
                  {e.url}
                </a>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {puedeGestionar && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar enlace ${e.nombre}`}
                      onClick={() => setFormulario(e)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Quitar enlace ${e.nombre}`}
                      onClick={() => setQuitando(e)}
                    >
                      Quitar
                    </Button>
                  </>
                )}
              </div>
            </FilaDeLista>
          ))}
        </ListaDeFilas>
      )}

      {formulario !== undefined && (
        <FormularioEnlace
          idActor={idActor}
          idProyecto={idProyecto}
          enlace={formulario}
          onCerrar={() => setFormulario(undefined)}
          entorno={entorno}
        />
      )}

      {quitando !== null && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setQuitando(null)}
          titulo="Quitar enlace"
          descripcion={`Se quitará «${quitando.nombre}» de los enlaces del proyecto. El historial conserva el rastro.`}
          etiquetaConfirmar="Quitar"
          destructivo
          onConfirmar={async () => {
            exigirExito(
              await quitarEnlace({ idActor, idProyecto, idEnlace: quitando.id }, entorno),
            );
            toast.success('Enlace quitado');
          }}
        />
      )}
    </PanelDeDatos>
  );
}
