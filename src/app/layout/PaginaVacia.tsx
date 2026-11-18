export function PaginaVacia({ titulo }: { titulo: string }) {
  return (
    <section>
      <h1 className="text-text">{titulo}</h1>
      <div className="mt-6 rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-text-2">Esta sección se construirá en una fase posterior.</p>
      </div>
    </section>
  );
}
