import { useState } from 'react';
import { toast } from 'sonner';
import {
  aValorParametro,
  erroresPorParametro,
  type NombreCampo,
  type SeccionParaVista,
} from '@/app/adaptadores';
import { ModalConfirmacion } from '@/compartido/ModalConfirmacion';
import { PanelDeDatos } from '@/compartido/PanelDeDatos';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import { Label } from '@/compartido/ui/label';
import type { ClaveParametro, Id } from '@/domain';
import {
  guardarConfiguracionSeccion,
  restaurarSeccionConfiguracion,
  type Entorno,
  type Fallo,
} from '@/services';

type Textos = Record<string, Partial<Record<NombreCampo, string>>>;

function textosIniciales(seccion: SeccionParaVista): Textos {
  return Object.fromEntries(
    seccion.parametros.map((p) => [
      p.clave,
      Object.fromEntries(p.campos.map((c) => [c.nombre, c.valor])),
    ]),
  );
}

/**
 * Una sección de Configuración (§5.8): cada parámetro con su valor actual y su valor predeterminado, «Guardar» y
 * «Restaurar valores originales». La validación (rango, entero, relaciones) la decide el servicio y su mensaje se
 * muestra junto a la casilla; la pantalla solo convierte el texto a número. Los cambios valen hacia adelante.
 */
export function FormularioDeSeccion({
  seccion,
  idActor,
  entorno,
}: {
  seccion: SeccionParaVista;
  idActor: Id;
  entorno: Entorno;
}) {
  const [textos, setTextos] = useState<Textos>(() => textosIniciales(seccion));
  const [fallo, setFallo] = useState<Fallo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  const claves = seccion.parametros.map((p) => p.clave);
  const errores = erroresPorParametro(fallo?.campos, claves);
  const sinErroresPorCampo = fallo !== null && Object.keys(fallo.campos ?? {}).length === 0;

  function cambiar(clave: ClaveParametro, campo: NombreCampo, valor: string) {
    setTextos((t) => ({ ...t, [clave]: { ...t[clave], [campo]: valor } }));
    setFallo(null);
  }

  async function guardar(e: React.SyntheticEvent) {
    e.preventDefault();
    setGuardando(true);
    setFallo(null);
    const resultado = await guardarConfiguracionSeccion(
      {
        idActor,
        seccion: seccion.seccion,
        valores: Object.fromEntries(
          seccion.parametros.map((p) => [p.clave, aValorParametro(p, textos[p.clave] ?? {})]),
        ),
      },
      entorno,
    );
    setGuardando(false);
    if (resultado.ok) {
      toast.success(`Se guardó «${seccion.titulo}»`);
    } else if (resultado.codigo === 'SIN_CAMBIOS') {
      toast.info('No hay cambios que guardar');
    } else {
      setFallo(resultado);
    }
  }

  return (
    <PanelDeDatos titulo={seccion.titulo}>
      <p className="-mt-2 text-xs text-text-2">{seccion.descripcion}</p>

      <form onSubmit={guardar} className="space-y-3" aria-label={seccion.titulo}>
        <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
          {seccion.parametros.map((p) => {
            const err = errores.porClave[p.clave];
            return (
              <fieldset key={p.clave} className="space-y-1.5">
                <legend className="text-sm font-medium text-text">{p.etiqueta}</legend>
                <div className="flex flex-wrap items-start gap-2">
                  {p.campos.map((c) => {
                    const id = `${p.clave}-${c.nombre}`;
                    const mensaje = err?.porCampo[c.nombre];
                    return (
                      <div key={c.nombre} className="w-28 space-y-1">
                        {p.campos.length > 1 && (
                          <Label htmlFor={id} className="text-xs text-text-2">
                            {c.etiqueta}
                          </Label>
                        )}
                        <Input
                          id={id}
                          inputMode="decimal"
                          aria-label={p.campos.length > 1 ? undefined : p.etiqueta}
                          aria-invalid={mensaje !== undefined || err?.general != null}
                          aria-describedby={`${p.clave}-ayuda`}
                          value={textos[p.clave]?.[c.nombre] ?? ''}
                          onChange={(e) => cambiar(p.clave, c.nombre, e.target.value)}
                        />
                        {mensaje && (
                          <p role="alert" className="text-xs text-danger-text">
                            {mensaje}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {p.unidad && (
                    <span
                      className={
                        p.campos.length > 1
                          ? 'pt-7 text-sm text-text-2'
                          : 'pt-1.5 text-sm text-text-2'
                      }
                    >
                      {p.unidad}
                    </span>
                  )}
                </div>
                {err?.general && (
                  <p role="alert" className="text-xs text-danger-text">
                    {err.general}
                  </p>
                )}
                <p id={`${p.clave}-ayuda`} className="text-xs text-text-2">
                  Predeterminado: {p.predeterminadoTexto}
                </p>
              </fieldset>
            );
          })}
        </div>

        {(errores.sueltos.length > 0 || sinErroresPorCampo) && (
          <p role="alert" className="text-sm text-danger-text">
            {errores.sueltos[0] ?? fallo?.mensaje}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            disabled={seccion.todoPredeterminado}
            onClick={() => setRestaurando(true)}
          >
            Restaurar valores originales
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>

      {restaurando && (
        <ModalConfirmacion
          abierto
          onCerrar={() => setRestaurando(false)}
          titulo={`Restaurar «${seccion.titulo}»`}
          descripcion="Cada parámetro de la sección vuelve a su valor predeterminado. El cambio vale hacia adelante y queda en el Historial."
          etiquetaConfirmar="Restaurar"
          onConfirmar={async () => {
            const r = await restaurarSeccionConfiguracion(
              { idActor, seccion: seccion.seccion },
              entorno,
            );
            if (!r.ok) throw new Error(r.mensaje);
            toast.success(`Se restauró «${seccion.titulo}»`);
          }}
        />
      )}
    </PanelDeDatos>
  );
}
