import { AlternadorTema } from '@/app/tema/AlternadorTema';
import { Button } from '@/compartido/ui/button';

export default function App() {
  return (
    <main className="min-h-screen bg-bg p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1>SIGEP CODAINI</h1>
        <AlternadorTema />
      </div>

      <p className="max-w-prose text-sm text-text-2">
        Vista temporal de la Fase 0. Aquí se comprueban los tokens del tema; la página de prueba
        completa llega en el paso 8.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button>Botón primario</Button>
        <span className="rounded-md border border-border bg-surface-2 px-3 py-1 text-sm">
          Superficie 2
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <p className="font-semibold">Tarjeta de prueba</p>
        <p className="mt-1 text-sm text-text-2">
          Debe tener borde de 1 px y esquinas de 10 px en ambos temas.
        </p>
      </div>
    </main>
  );
}
