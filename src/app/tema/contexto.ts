import { createContext, useContext } from 'react';

import type { Tema } from './tema';

export type ValorContextoTema = {
  tema: Tema;
  alternarTema: () => void;
};

export const ContextoTema = createContext<ValorContextoTema | null>(null);

export function useTema(): ValorContextoTema {
  const contexto = useContext(ContextoTema);

  if (!contexto) {
    throw new Error('useTema debe usarse dentro de <ProveedorTema>');
  }

  return contexto;
}
