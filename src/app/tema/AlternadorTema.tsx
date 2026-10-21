import { Moon, Sun } from 'lucide-react';

import { Button } from '@/compartido/ui/button';

import { useTema } from './contexto';

export function AlternadorTema() {
  const { tema, alternarTema } = useTema();
  const esOscuro = tema === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Tema oscuro"
      aria-pressed={esOscuro}
      title={esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      onClick={alternarTema}
    >
      {esOscuro ? <Sun strokeWidth={1.5} /> : <Moon strokeWidth={1.5} />}
    </Button>
  );
}
