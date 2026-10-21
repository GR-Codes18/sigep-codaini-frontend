import { AlternadorTema } from '@/app/tema/AlternadorTema';
import { Button } from '@/compartido/ui/button';

export default function App() {
  return (
    <main className="min-h-screen bg-bg p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1>SIGEP CODAINI</h1>
          <p className="mt-1 text-sm text-text-2">
            Vista temporal de la Fase 0. La página de prueba completa llega en el paso 8.
          </p>
        </div>
        <AlternadorTema />
      </div>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2>Escala tipográfica</h2>
        <h3 className="mt-3">Subtítulo de tarjeta</h3>
        <p className="mt-1 text-sm">
          Cuerpo de 14 px en Inter, con tildes y ñ: gestión, aplicación, diseñó.
        </p>
        <p className="mt-1 text-xs text-text-2">
          Texto auxiliar de 12 px. Las tablas usan 13 px y números tabulares.
        </p>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button>Botón primario</Button>
        <span className="rounded-md border border-border bg-surface-2 px-3 py-1 text-sm">
          Superficie 2
        </span>
        <a className="text-sm text-link underline-offset-4 hover:underline" href="#enlace">
          Enlace de prueba
        </a>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <p className="font-semibold">Tarjeta de prueba</p>
        <p className="mt-1 text-sm text-text-2">
          Debe tener borde de 1 px y esquinas de 10 px en ambos temas.
        </p>
      </div>

      <table className="mt-6 w-full border-collapse text-tabla">
        <thead>
          <tr>
            <th className="border-b border-border bg-surface-2 p-2 text-left font-medium">
              Practicante
            </th>
            <th className="border-b border-border bg-surface-2 p-2 text-right font-medium">
              Puntaje
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-b border-border p-2">Ana Torres</td>
            <td className="border-b border-border p-2 text-right">7</td>
          </tr>
          <tr>
            <td className="border-b border-border p-2">Luis Pérez</td>
            <td className="border-b border-border p-2 text-right">86</td>
          </tr>
          <tr>
            <td className="border-b border-border p-2">María Gómez</td>
            <td className="border-b border-border p-2 text-right">100</td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
