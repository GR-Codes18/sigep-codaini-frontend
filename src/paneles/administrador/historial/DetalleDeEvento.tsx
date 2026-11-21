import { Link } from 'react-router';
import type { FilaHistorial } from '@/app/adaptadores';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/compartido/ui/dialog';

/**
 * El panel de detalle de un evento (§5.7): el valor anterior y el nuevo de cada campo modificado y el motivo o la nota.
 * Solo lectura: los eventos son inmutables, así que no ofrece ninguna acción sobre el evento.
 */
export function DetalleDeEvento({
  fila,
  onCerrar,
}: {
  fila: FilaHistorial | null;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={fila !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        {fila && (
          <>
            <DialogHeader>
              <DialogTitle>{fila.accion}</DialogTitle>
              <DialogDescription>
                {fila.categoriaTexto} · {fila.fechaTexto} · {fila.autor}
              </DialogDescription>
            </DialogHeader>

            <dl className="space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-text-2">{fila.elementoTipoTexto}:</dt>
                <dd className="text-text">
                  {fila.rutaElemento === null ? (
                    fila.elementoEtiqueta
                  ) : (
                    <Link
                      to={fila.rutaElemento}
                      className="font-medium text-link underline underline-offset-2"
                    >
                      {fila.elementoEtiqueta}
                    </Link>
                  )}
                </dd>
              </div>
            </dl>

            {fila.cambios.length === 0 ? (
              <p className="text-sm text-text-2">Este evento no modificó ningún campo.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-[13px]">
                  <thead className="bg-surface-2">
                    <tr>
                      <th scope="col" className="h-9 px-3 text-left font-semibold text-text-2">
                        Campo
                      </th>
                      <th scope="col" className="h-9 px-3 text-left font-semibold text-text-2">
                        Valor anterior
                      </th>
                      <th scope="col" className="h-9 px-3 text-left font-semibold text-text-2">
                        Valor nuevo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fila.cambios.map((c) => (
                      <tr key={c.campo} className="border-t border-border">
                        <th scope="row" className="px-3 py-2 text-left font-medium text-text">
                          {c.campo}
                        </th>
                        <td className="px-3 py-2 break-words text-text-2">{c.anterior}</td>
                        <td className="px-3 py-2 break-words text-text">{c.nuevo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {fila.nota !== null && fila.nota !== '' && (
              <div className="text-sm">
                <p className="text-text-2">Motivo o nota</p>
                <p className="text-text">“{fila.nota}”</p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
