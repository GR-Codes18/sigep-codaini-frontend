export type Tema = 'light' | 'dark';

/** Debe coincidir con la clave usada por el script de index.html. */
export const CLAVE_TEMA = 'sigep-tema';

/** El script de index.html ya aplicó el tema antes de montar React. */
export function leerTemaAplicado(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema;
  document.documentElement.style.colorScheme = tema;
}

export function guardarPreferencia(tema: Tema): void {
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    // El tema sigue funcionando en esta sesión aunque el navegador no permita persistirlo.
  }
}
