import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';

import { ContextoTema } from './contexto';
import { aplicarTema, guardarPreferencia, leerTemaAplicado } from './tema';
import type { Tema } from './tema';

type Props = {
  children: ReactNode;
};

export function ProveedorTema({ children }: Props) {
  const [tema, setTema] = useState<Tema>(leerTemaAplicado);

  const alternarTema = useCallback(() => {
    const siguiente: Tema = tema === 'dark' ? 'light' : 'dark';

    setTema(siguiente);
    aplicarTema(siguiente);
    guardarPreferencia(siguiente);
  }, [tema]);

  return <ContextoTema.Provider value={{ tema, alternarTema }}>{children}</ContextoTema.Provider>;
}
