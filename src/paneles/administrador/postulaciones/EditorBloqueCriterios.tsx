import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  TIPOS_CRITERIO,
  sumaPesosActivos,
  validarBloqueCriterios,
  type BloqueCriterio,
  type TipoCriterio,
} from '@/domain';
import type { CriterioDeBloque } from '@/app/adaptadores';
import { Button } from '@/compartido/ui/button';
import { Input } from '@/compartido/ui/input';
import type { Resultado } from '@/services';

/** Un criterio tal como se envía a `guardarCriteriosDeBloque`: sin `id` es nuevo. */
export interface CriterioParaGuardar {
  id?: string;
  nombre: string;
  tipo: TipoCriterio;
  peso: number;
  obligatorio: boolean;
  activo: boolean;
}

interface Props {
  /** Qué bloque es: sirve para el texto de la regla («del área» o «de la especialidad»). */
  bloque: BloqueCriterio;
  /** Los criterios guardados, todos (también los desactivados). */
  criterios: readonly CriterioDeBloque[];
  /** Guarda el bloque completo en una sola operación (`guardarCriteriosDeBloque`). */
  onGuardar: (criterios: CriterioParaGuardar[]) => Promise<Resultado<unknown>>;
}

const ETIQUETA_TIPO: Record<TipoCriterio, string> = {
  TECNOLOGIA: 'Tecnología',
  ACADEMICO: 'Académico',
  DISPONIBILIDAD: 'Disponibilidad',
  PALABRA_CLAVE: 'Palabra clave',
};

interface Fila {
  /** Estable mientras se edita: el `id` si ya existe, o una clave temporal si es nuevo. */
  clave: string;
  id?: string;
  nombre: string;
  tipo: TipoCriterio;
  /** Lo que se escribió; se convierte a número al calcular la suma y al guardar. */
  peso: string;
  obligatorio: boolean;
  activo: boolean;
}

const aFilas = (criterios: readonly CriterioDeBloque[]): Fila[] =>
  criterios.map((c) => ({
    clave: c.id,
    id: c.id,
    nombre: c.nombre,
    tipo: c.tipo,
    peso: String(c.peso),
    obligatorio: c.obligatorio,
    activo: c.activo,
  }));

/** El peso escrito como número; vacío es `NaN` (todavía no se escribió). */
const pesoNumerico = (texto: string): number => (texto.trim() === '' ? Number.NaN : Number(texto));

/** Lo que identifica el estado de un borrador, para saber si cambió respecto de lo guardado. */
const huella = (filas: readonly Fila[]): string =>
  JSON.stringify(
    filas.map((f) => [
      f.id ?? null,
      f.nombre.trim(),
      f.tipo,
      f.peso.trim(),
      f.obligatorio,
      f.activo,
    ]),
  );

const CLASE_SELECT =
  'h-8 w-full rounded-md border border-input bg-surface px-2.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-focus';

/**
 * El editor de un bloque de criterios (§5.1): crear, editar y activar o desactivar criterios, con «Suma actual: N/100» en
 * vivo. Los criterios **no se borran**: los guardados solo se desactivan (los nuevos, aún sin guardar, se pueden quitar).
 * Guarda el bloque completo de una vez, así repartir 30/70 a 40/60 no pasa por una suma distinta de 100. La suma y el
 * mensaje de validez usan las mismas funciones de `domain/` que el servicio; el servicio decide siempre (por ejemplo, un
 * bloque vacío solo vale si su área o especialidad está inactiva), y su error se muestra aquí.
 */
export function EditorBloqueCriterios({ bloque, criterios, onGuardar }: Props) {
  const guardados = huella(aFilas(criterios));
  const [borrador, setBorrador] = useState({ origen: guardados, filas: aFilas(criterios) });
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [erroresFila, setErroresFila] = useState<Record<number, string>>({});
  const [guardando, setGuardando] = useState(false);
  const nuevos = useRef(0);

  // Si lo guardado cambia de verdad (se guardó, o cambió en otra parte), el borrador se reinicia; si llega lo mismo en un
  // objeto nuevo, se conserva lo que la persona está escribiendo.
  if (borrador.origen !== guardados) {
    setBorrador({ origen: guardados, filas: aFilas(criterios) });
  }
  const filas = borrador.filas;

  const cambiarFila = (clave: string, cambios: Partial<Fila>) =>
    setBorrador((actual) => ({
      ...actual,
      filas: actual.filas.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)),
    }));

  const numericos = filas.map((f) => ({ peso: pesoNumerico(f.peso), activo: f.activo }));
  const validacion = validarBloqueCriterios(numericos, bloque);
  // Un peso sin escribir no suma (en la validación cuenta como inválido).
  const suma = sumaPesosActivos(
    numericos.map((n) => ({ ...n, peso: Number.isFinite(n.peso) ? n.peso : 0 })),
  );
  const hayCambios = huella(filas) !== guardados;

  function agregar() {
    nuevos.current += 1;
    setBorrador((actual) => ({
      ...actual,
      filas: [
        ...actual.filas,
        {
          clave: `nuevo-${nuevos.current}`,
          nombre: '',
          tipo: 'TECNOLOGIA',
          peso: '',
          obligatorio: false,
          activo: true,
        },
      ],
    }));
  }

  function quitar(clave: string) {
    setBorrador((actual) => ({ ...actual, filas: actual.filas.filter((f) => f.clave !== clave) }));
  }

  function descartar() {
    setBorrador({ origen: guardados, filas: aFilas(criterios) });
    setErrorGeneral(null);
    setErroresFila({});
  }

  async function guardar() {
    setErrorGeneral(null);
    // Un criterio activo sin peso no se puede ni enviar; uno desactivado puede conservar cualquier número.
    const sinPeso: Record<number, string> = {};
    filas.forEach((f, i) => {
      if (f.activo && Number.isNaN(pesoNumerico(f.peso))) {
        sinPeso[i] = 'Escribe el peso: un número entero mayor que 0.';
      }
    });
    setErroresFila(sinPeso);
    if (Object.keys(sinPeso).length > 0) return;

    setGuardando(true);
    try {
      const resultado = await onGuardar(
        filas.map((f) => {
          const peso = pesoNumerico(f.peso);
          return {
            ...(f.id === undefined ? {} : { id: f.id }),
            nombre: f.nombre,
            tipo: f.tipo,
            peso: Number.isNaN(peso) ? 0 : peso,
            obligatorio: f.obligatorio,
            activo: f.activo,
          };
        }),
      );
      if (!resultado.ok) {
        setErrorGeneral(resultado.mensaje);
        // Los errores por campo llegan como `criterios.<posición>.<campo>`.
        const porFila: Record<number, string> = {};
        for (const [campo, mensaje] of Object.entries(resultado.campos ?? {})) {
          const coincidencia = /^criterios\.(\d+)\./.exec(campo);
          if (coincidencia) porFila[Number(coincidencia[1])] ??= mensaje;
        }
        setErroresFila(porFila);
        return;
      }
      toast.success('Criterios guardados');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-3">
      {filas.length === 0 ? (
        <p className="text-sm text-text-2">
          Este bloque no tiene criterios. Agrega al menos uno para poder activar su área o
          especialidad.
        </p>
      ) : (
        <ul className="space-y-3">
          {filas.map((f, i) => (
            <li
              key={f.clave}
              className="space-y-1 rounded-md border border-border bg-surface p-3"
              aria-label={`Criterio ${i + 1}`}
            >
              <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_5rem_auto_auto_auto]">
                <Input
                  aria-label={`Nombre del criterio ${i + 1}`}
                  value={f.nombre}
                  placeholder="Nombre del criterio"
                  disabled={guardando}
                  aria-invalid={erroresFila[i] ? true : undefined}
                  onChange={(e) => cambiarFila(f.clave, { nombre: e.target.value })}
                />
                <select
                  aria-label={`Tipo del criterio ${i + 1}`}
                  value={f.tipo}
                  disabled={guardando}
                  className={CLASE_SELECT}
                  onChange={(e) => cambiarFila(f.clave, { tipo: e.target.value as TipoCriterio })}
                >
                  {TIPOS_CRITERIO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {ETIQUETA_TIPO[tipo]}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label={`Peso del criterio ${i + 1}`}
                  inputMode="numeric"
                  value={f.peso}
                  placeholder="Peso"
                  disabled={guardando}
                  className="tabular-nums"
                  aria-invalid={erroresFila[i] ? true : undefined}
                  onChange={(e) => cambiarFila(f.clave, { peso: e.target.value })}
                />
                <label className="flex items-center gap-1.5 text-sm text-text">
                  <input
                    type="checkbox"
                    aria-label={`Criterio ${i + 1} obligatorio`}
                    checked={f.obligatorio}
                    disabled={guardando}
                    onChange={(e) => cambiarFila(f.clave, { obligatorio: e.target.checked })}
                  />
                  Obligatorio
                </label>
                <label className="flex items-center gap-1.5 text-sm text-text">
                  <input
                    type="checkbox"
                    aria-label={`Criterio ${i + 1} activo`}
                    checked={f.activo}
                    disabled={guardando}
                    onChange={(e) => cambiarFila(f.clave, { activo: e.target.checked })}
                  />
                  Activo
                </label>
                {f.id === undefined ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={guardando}
                    onClick={() => quitar(f.clave)}
                  >
                    Quitar
                  </Button>
                ) : (
                  <span aria-hidden="true" />
                )}
              </div>
              {erroresFila[i] && <p className="text-xs text-danger-text">{erroresFila[i]}</p>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite" role="status" className="text-sm">
          <p className="font-medium text-text tabular-nums">Suma actual: {suma}/100</p>
          {!validacion.ok && <p className="text-text-2">{validacion.mensaje}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={guardando} onClick={agregar}>
            Agregar criterio
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!hayCambios || guardando}
            onClick={descartar}
          >
            Descartar cambios
          </Button>
          <Button type="button" disabled={!hayCambios || guardando} onClick={guardar}>
            {guardando ? 'Guardando…' : 'Guardar criterios'}
          </Button>
        </div>
      </div>

      {errorGeneral && (
        <p role="alert" className="text-sm text-danger-text">
          {errorGeneral}
        </p>
      )}
    </div>
  );
}
