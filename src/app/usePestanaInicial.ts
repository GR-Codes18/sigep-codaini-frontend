import { useSearchParams } from 'react-router';

/**
 * La pestaña que pide la dirección (`?pestana=`), o la predeterminada si falta o no es una de las `validas`. Es lo que
 * permite que un enlace (las tarjetas del Dashboard, §5.9) abra un listado con su filtro ya aplicado.
 */
export function pestanaDeLaDireccion<T extends string>(
  pedida: string | null,
  validas: readonly T[],
  predeterminada: T,
): T {
  return validas.find((v) => v === pedida) ?? predeterminada;
}

/**
 * Solo **lee** la dirección, y solo al abrir la página: después la página guarda su filtro en su propio estado, como
 * siempre (a diferencia de Reportes, que además escribe `?pestana=`).
 */
export function usePestanaInicial<T extends string>(validas: readonly T[], predeterminada: T): T {
  const [parametros] = useSearchParams();
  return pestanaDeLaDireccion(parametros.get('pestana'), validas, predeterminada);
}
