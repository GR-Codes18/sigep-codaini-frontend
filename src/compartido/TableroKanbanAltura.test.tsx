import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import { crearEntorno } from '@/services';
import { TableroDelProyecto } from '@/paneles/administrador/proyectos/TableroDelProyecto';
import { TableroKanban, type TareaTablero } from './TableroKanban';

function tarea(cambios: Partial<TareaTablero> & { id: string }): TareaTablero {
  return {
    idLegible: `PL2D-${cambios.id}`,
    titulo: `Tarea ${cambios.id}`,
    estado: 'DISPONIBLE',
    fechaLimite: '2026-12-01',
    vencida: false,
    requiereSupervision: false,
    ...cambios,
  };
}

// «Esperando supervisión» queda vacía a propósito: es el caso de las columnas de alturas desiguales.
const TAREAS: TareaTablero[] = [
  ...Array.from({ length: 12 }, (_, i) => tarea({ id: `p${i}`, estado: 'EN_PROGRESO' })),
  tarea({ id: 'd1', estado: 'DISPONIBLE' }),
  ...Array.from({ length: 5 }, (_, i) => tarea({ id: `t${i}`, estado: 'TERMINADA' })),
];

function mostrar(total = 9) {
  render(
    <TableroKanban
      tareas={TAREAS}
      totalTerminadas={total}
      onAbrir={() => {}}
      onVerTerminadas={() => {}}
    />,
  );
}

const columna = (nombre: string) => screen.getByRole('region', { name: nombre });
/** El contenedor de las tarjetas de una columna: el que scrollea. */
const lista = (nombre: string) => columna(nombre).children[1] as HTMLElement;
const COLUMNAS = ['Disponible', 'En progreso', 'Esperando supervisión', 'Terminada'];

describe('Tablero Kanban: altura y scroll por columna', () => {
  it('en pantalla ancha las cuatro columnas miden lo mismo, tomado de la altura de la ventana', () => {
    mostrar();

    const rejilla = columna('Disponible').parentElement!;
    expect(rejilla.className).toContain('xl:grid-cols-4');
    expect(rejilla.className).toContain('xl:grid-rows-1');
    expect(rejilla.className).toMatch(/xl:h-\[max\(22rem,calc\(100dvh-\d+rem\)\)\]/);
    for (const nombre of COLUMNAS) {
      expect(columna(nombre).className).toContain('flex-col');
      expect(columna(nombre).className).toContain('min-h-0');
    }
  });

  it('el encabezado de cada columna (nombre y contador) queda fijo y fuera de lo que scrollea', () => {
    mostrar();

    for (const nombre of COLUMNAS) {
      const encabezado = within(columna(nombre)).getByRole('heading', { name: new RegExp(nombre) });
      expect(encabezado.className).toContain('shrink-0');
      expect(lista(nombre).contains(encabezado)).toBe(false);
      expect(encabezado.querySelector('span')).not.toBeNull(); // el contador
    }
  });

  it('solo la lista de tarjetas scrollea, con su propio overflow-y-auto desde tablet', () => {
    mostrar();

    for (const nombre of COLUMNAS) {
      const clases = lista(nombre).className;
      expect(clases).toContain('md:overflow-y-auto');
      expect(clases).toContain('min-h-0');
      expect(clases).toContain('flex-1');
      // En pantalla ancha la altura la manda la columna; en tablet, un máximo razonable.
      expect(clases).toContain('xl:max-h-none');
      expect(clases).toContain('md:max-h-[26rem]');
    }
  });

  it('en móvil no hay scroll propio: las columnas fluyen y la página es la que se desplaza', () => {
    mostrar();

    for (const nombre of COLUMNAS) {
      const sinPrefijo = lista(nombre)
        .className.split(' ')
        .filter((c) => !c.includes(':'));
      expect(sinPrefijo).not.toContain('overflow-y-auto');
      expect(sinPrefijo.some((c) => c.startsWith('max-h-'))).toBe(false);
    }
    expect(columna('Disponible').parentElement!.className).not.toMatch(/(^| )h-\[/);
  });

  it('las columnas vacías o con pocas tarjetas tienen la misma estructura que las demás', () => {
    mostrar();

    expect(within(lista('Esperando supervisión')).queryAllByRole('button')).toHaveLength(0);
    expect(within(lista('Disponible')).getAllByRole('button')).toHaveLength(1);
    expect(within(lista('En progreso')).getAllByRole('button')).toHaveLength(12);
    const claseLista = (n: string) => lista(n).className;
    expect(claseLista('Esperando supervisión')).toBe(claseLista('En progreso'));
    expect(columna('Esperando supervisión').className).toBe(
      columna('En progreso').className.replace(/border-t-state-\w+/, 'border-t-state-warning'),
    );
  });

  it('«Terminada» sigue mostrando lo recibido (5) con «Ver todas las terminadas» fijo fuera de la lista', () => {
    mostrar(9);

    expect(within(lista('Terminada')).getAllByRole('button')).toHaveLength(5);
    const ver = screen.getByRole('button', { name: 'Ver todas las terminadas' });
    expect(columna('Terminada').contains(ver)).toBe(true);
    expect(lista('Terminada').contains(ver)).toBe(false);
    expect(within(columna('Terminada')).getByRole('heading')).toHaveTextContent('9');
  });

  it('«Ver todas» solo existe en «Terminada» y solo si hay más terminadas que las mostradas', () => {
    mostrar(5);

    expect(screen.queryByRole('button', { name: 'Ver todas las terminadas' })).toBeNull();
  });

  it('la barra de scroll es fina y con el color del borde del tema', () => {
    mostrar();

    const clases = lista('En progreso').className;
    expect(clases).toContain('[scrollbar-width:thin]');
    expect(clases).toContain('[scrollbar-color:var(--border)_transparent]');
  });

  it('el relleno de la lista deja sitio al anillo de foco de las tarjetas, que el scroll recortaría', () => {
    mostrar();

    expect(lista('Disponible').className).toMatch(/px-3/);
    expect(lista('Disponible').className).toMatch(/pt-1/);
    expect(lista('Disponible').className).toMatch(/pb-3/);
  });
});

describe('TableroDelProyecto: la misma estructura en los tres paneles', () => {
  const entorno = crearEntorno({ demoraMs: 0 });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
  });

  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  async function estructura(idUsuario: string) {
    const u = useAlmacen.getState().datos.usuarios.find((x) => x.id === idUsuario)!;
    useAlmacenSesion.getState().abrirSesion({
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      rol: u.rol,
      debe_cambiar_contrasena: u.debe_cambiar_contrasena,
    });
    const { unmount } = render(
      <MemoryRouter>
        <TableroDelProyecto
          idActor={idUsuario}
          proyecto={{ id: 'pry-pl2d', nombre: 'Plataformas 2D' }}
          entorno={entorno}
        />
      </MemoryRouter>,
    );
    const region = await screen.findByRole('region', { name: 'Disponible' });
    const resultado = {
      rejilla: region.parentElement!.className,
      columnas: COLUMNAS.map((n) => screen.getByRole('region', { name: n }).className),
      listas: COLUMNAS.map(
        (n) => (screen.getByRole('region', { name: n }).children[1] as HTMLElement).className,
      ),
    };
    unmount();
    useAlmacenSesion.getState().cerrarSesion();
    return resultado;
  }

  it('Administrador, Supervisor y Practicante ven la misma rejilla, columnas y listas', async () => {
    const admin = await estructura('demo-admin');
    const supervisor = await estructura('demo-supervisor');
    const practicante = await estructura('demo-practicante');

    expect(supervisor).toEqual(admin);
    expect(practicante).toEqual(admin);
    expect(admin.rejilla).toContain('xl:grid-rows-1');
  });
});
