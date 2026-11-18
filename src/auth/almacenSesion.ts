import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { z } from 'zod';
import { esquemaUsuarioSesion, type UsuarioSesion } from './tipos';

interface EstadoSesion {
  usuario: UsuarioSesion | null;
  abrirSesion: (usuario: UsuarioSesion) => void;
  cerrarSesion: () => void;
}

const esquemaPersistido = z.object({ usuario: esquemaUsuarioSesion.nullable() });

export const useAlmacenSesion = create<EstadoSesion>()(
  persist(
    (set) => ({
      usuario: null,
      abrirSesion: (usuario) => set({ usuario }),
      cerrarSesion: () => set({ usuario: null }),
    }),
    {
      name: 'sigep-sesion',
      storage: createJSONStorage(() => localStorage),
      partialize: (estado) => ({ usuario: estado.usuario }),
      // Lo guardado en el navegador no es de fiar: se valida antes de usarlo.
      merge: (persistido, actual) => {
        const resultado = esquemaPersistido.safeParse(persistido);
        return resultado.success ? { ...actual, usuario: resultado.data.usuario } : actual;
      },
    },
  ),
);
