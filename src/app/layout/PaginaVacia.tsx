export function PaginaVacia({ titulo }: { titulo: string }) {
  return (
    <section>
      <h1 className="text-text">{titulo}</h1>
      <div className="bg-surface border-border mt-6 rounded-xl border p-8 text-center">
        <p className="text-text-2 text-sm">Esta sección se construirá en una fase posterior.</p>
      </div>
    </section>
  );
}