import { Outlet } from 'react-router';
import { BarraLateral } from './BarraLateral';
import { BarraSuperior } from './BarraSuperior';
import { FranjaContrasenaTemporal } from './FranjaContrasenaTemporal';

export function LayoutPanel() {
  return (
    <div className="bg-bg text-text flex min-h-screen flex-col">
      <FranjaContrasenaTemporal />
      <div className="flex flex-1">
        <BarraLateral />
        <div className="flex min-w-0 flex-1 flex-col">
          <BarraSuperior />
          <main className="flex-1 px-6 pt-8 pb-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}