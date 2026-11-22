import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import type { Id } from '@/domain';
import { crearEntorno } from '@/services';
import { PaginaCriterios } from './PaginaCriterios';

const entorno = crearEntorno({ demoraMs: 0 });
const datos = () => useAlmacen.getState().datos;

function iniciarSesion(idUsuario: Id) {
  const u = datos().usuarios.find((x) => x.id === idUsuario)!;
  useAlmacenSesion.getState().abrirSesion({
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    rol: u.rol,
    debe_cambiar_contrasena: u.debe_cambiar_contrasena,
  });
}

function mostrar() {
  render(
    <MemoryRouter initialEntries={['/administrador/postulaciones/criterios']}>
      <Routes>
        <Route
          path="/administrador/postulaciones/criterios"
          element={<PaginaCriterios entorno={entorno} />}
        />
        <Route path="/administrador/postulaciones" element={<p>Listado abierto</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function listo() {
  await waitFor(() =>
    expect(screen.queryByRole('status', { name: 'Cargando los criterios' })).toBeNull(),
  );
}

const area = (nombre: string) => screen.getByRole('region', { name: `Área ${nombre}` });
const especialidad = (nombre: string) =>
  screen.getByRole('region', { name: `Especialidad ${nombre}` });
/** El editor de los criterios generales del área (el primer `<details>`, antes de sus especialidades). */
const criteriosDelArea = (nombre: string) =>
  within(area(nombre).querySelector('details') as HTMLElement);
const criteriosDeEspecialidad = (nombre: string) =>
  within(especialidad(nombre).querySelector('details') as HTMLElement);

const criteriosDe = (idArea: Id, idEspecialidad: Id | null) =>
  datos().criterios.filter(
    (c) => c.id_area_tecnica === idArea && c.id_especialidad === idEspecialidad,
  );

async function escribir(
  user: ReturnType<typeof userEvent.setup>,
  campo: HTMLElement,
  texto: string,
) {
  await user.clear(campo);
  if (texto !== '') await user.type(campo, texto);
}

describe('PaginaCriterios', () => {
  afterEach(() => {
    useAlmacenSesion.getState().cerrarSesion();
  });

  beforeEach(() => {
    useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
    iniciarSesion('demo-admin');
  });

  describe('qué muestra', () => {
    it('mientras llega la consulta muestra un estado de carga', () => {
      mostrar();

      expect(screen.getByRole('status', { name: 'Cargando los criterios' })).toBeInTheDocument();
    });

    it('el título, la vuelta a postulaciones y las cuatro áreas', async () => {
      mostrar();
      await listo();

      expect(
        screen.getByRole('heading', { level: 1, name: 'Criterios de evaluación' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Volver a postulaciones' })).toHaveAttribute(
        'href',
        '/administrador/postulaciones',
      );
      for (const nombre of ['Software', 'Videojuegos', 'Diseño UX/UI', 'Datos e IA']) {
        expect(area(nombre)).toBeInTheDocument();
      }
    });

    it('cada área y especialidad dice si está activa, con su suma', async () => {
      mostrar();
      await listo();

      expect(within(area('Software')).getAllByText('Activa').length).toBeGreaterThan(1);
      expect(within(especialidad('Frontend')).getByText('Activa')).toBeInTheDocument();
      expect(
        within(area('Software')).getByText('Criterios generales del área · suma 100/100'),
      ).toBeInTheDocument();
      expect(
        within(especialidad('Frontend')).getByText('Criterios de la especialidad · suma 100/100'),
      ).toBeInTheDocument();
    });

    it('el editor del área muestra también el criterio desactivado', async () => {
      mostrar();
      await listo();

      const editor = criteriosDelArea('Software');
      expect(editor.getByDisplayValue('Carta de recomendación')).toBeInTheDocument();
      expect(editor.getByLabelText('Criterio 5 activo')).not.toBeChecked();
    });

    it('sin áreas muestra el estado vacío', async () => {
      useAlmacen.getState().restablecer(new Date('2026-11-17T17:00:00.000Z'));
      useAlmacen.setState((s) => ({
        datos: { ...s.datos, areas_tecnicas: [], especialidades: [], criterios: [] },
      }));
      mostrar();
      await listo();

      expect(screen.getByText('Aún no hay áreas técnicas')).toBeInTheDocument();
    });

    it('quien no es Administrador ve el error del servicio, no el catálogo', async () => {
      useAlmacenSesion.getState().cerrarSesion();
      iniciarSesion('demo-supervisor');
      mostrar();
      await listo();

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Área Software' })).toBeNull();
    });
  });

  describe('guardar los criterios de un bloque', () => {
    it('repartir 30/30/25/15 a 40/20/25/15 se guarda de una vez (nunca pasa por una suma distinta de 100)', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();
      const editor = criteriosDelArea('Software');

      await escribir(user, editor.getByLabelText('Peso del criterio 1'), '40');
      expect(editor.getByText('Suma actual: 110/100')).toBeInTheDocument();
      await escribir(user, editor.getByLabelText('Peso del criterio 2'), '20');
      expect(editor.getByText('Suma actual: 100/100')).toBeInTheDocument();
      await user.click(editor.getByRole('button', { name: 'Guardar criterios' }));

      await waitFor(() =>
        expect(datos().criterios.find((c) => c.id === 'cri-sw-a1')!.peso).toBe(40),
      );
      expect(datos().criterios.find((c) => c.id === 'cri-sw-a2')!.peso).toBe(20);
      // La suma del encabezado se actualiza con lo guardado.
      expect(
        await within(area('Software')).findByText('Criterios generales del área · suma 100/100'),
      ).toBeInTheDocument();
    });

    it('un bloque que no suma 100 en un área activa no se guarda: se muestra el error y nada cambia', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();
      const antes = JSON.stringify(datos().criterios);
      const editor = criteriosDelArea('Software');

      await escribir(user, editor.getByLabelText('Peso del criterio 1'), '40');
      await user.click(editor.getByRole('button', { name: 'Guardar criterios' }));

      expect(await editor.findByRole('alert')).toHaveTextContent(/sumar 100/);
      expect(JSON.stringify(datos().criterios)).toBe(antes);
      // El borrador se conserva para corregirlo.
      expect(editor.getByLabelText('Peso del criterio 1')).toHaveValue('40');
    });

    it('desactivar un criterio no lo borra: sigue en el catálogo, inactivo', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();
      const antes = criteriosDe('area-sw', null).length;
      const editor = criteriosDelArea('Software');

      await user.click(editor.getByLabelText('Criterio 4 activo')); // «Inglés técnico» (15)
      await escribir(user, editor.getByLabelText('Peso del criterio 3'), '40'); // 30+30+40
      await user.click(editor.getByRole('button', { name: 'Guardar criterios' }));

      await waitFor(() =>
        expect(datos().criterios.find((c) => c.id === 'cri-sw-a4')!.activo).toBe(false),
      );
      expect(criteriosDe('area-sw', null)).toHaveLength(antes);
      expect(datos().criterios.find((c) => c.id === 'cri-sw-a3')!.peso).toBe(40);
    });

    it('agregar un criterio nuevo lo crea en el bloque, sin tocar los demás', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();
      const antes = criteriosDe('area-sw', 'esp-sw-front').length;
      const editor = criteriosDeEspecialidad('Frontend');

      await user.click(editor.getByRole('button', { name: 'Agregar criterio' }));
      const n = antes + 1;
      await user.type(editor.getByLabelText(`Nombre del criterio ${n}`), 'Accesibilidad web');
      await user.click(editor.getByLabelText(`Criterio ${n} activo`)); // nace desactivado: suma sigue en 100
      await user.click(editor.getByRole('button', { name: 'Guardar criterios' }));

      await waitFor(() => expect(criteriosDe('area-sw', 'esp-sw-front')).toHaveLength(n));
      const nuevo = criteriosDe('area-sw', 'esp-sw-front').find(
        (c) => c.nombre === 'Accesibilidad web',
      )!;
      expect(nuevo.activo).toBe(false);
      expect(
        criteriosDe('area-sw', 'esp-sw-front').find((c) => c.id === 'cri-sw-front-1')!.peso,
      ).toBe(35);
    });

    it('cambiar los criterios no recalcula las evaluaciones ya hechas', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();
      const antes = JSON.stringify([datos().evaluaciones, datos().detalles_evaluacion]);
      const editor = criteriosDelArea('Software');

      await escribir(user, editor.getByLabelText('Peso del criterio 1'), '40');
      await escribir(user, editor.getByLabelText('Peso del criterio 2'), '20');
      await user.click(editor.getByRole('button', { name: 'Guardar criterios' }));
      await waitFor(() =>
        expect(datos().criterios.find((c) => c.id === 'cri-sw-a1')!.peso).toBe(40),
      );

      expect(JSON.stringify([datos().evaluaciones, datos().detalles_evaluacion])).toBe(antes);
    });
  });

  describe('activar y desactivar', () => {
    it('desactivar un área no arrastra a sus especialidades ni a sus criterios', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();
      const especialidadesAntes = datos().especialidades.filter(
        (e) => e.id_area_tecnica === 'area-sw',
      );
      const criteriosAntes = JSON.stringify(datos().criterios);

      await user.click(screen.getByRole('button', { name: 'Desactivar área Software' }));

      await waitFor(() =>
        expect(datos().areas_tecnicas.find((a) => a.id === 'area-sw')!.activo).toBe(false),
      );
      expect(datos().especialidades.filter((e) => e.id_area_tecnica === 'area-sw')).toEqual(
        especialidadesAntes,
      );
      expect(JSON.stringify(datos().criterios)).toBe(criteriosAntes);
      expect(await screen.findByRole('button', { name: 'Activar área Software' })).toBeEnabled(); // su bloque es válido
      expect(within(area('Software')).getAllByText('Inactiva').length).toBeGreaterThan(0);
    });

    it('desactivar una especialidad no desactiva su área', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();

      await user.click(screen.getByRole('button', { name: 'Desactivar especialidad Frontend' }));

      await waitFor(() =>
        expect(datos().especialidades.find((e) => e.id === 'esp-sw-front')!.activo).toBe(false),
      );
      expect(datos().areas_tecnicas.find((a) => a.id === 'area-sw')!.activo).toBe(true);
      expect(within(especialidad('Frontend')).getByText('Inactiva')).toBeInTheDocument();
    });

    it('un área inactiva con el bloque inválido no se puede activar y dice por qué', async () => {
      const user = userEvent.setup();
      // Se deja Videojuegos inactiva con pesos que no suman 100.
      // Sin mutar los objetos de la semilla (se comparten entre pruebas).
      useAlmacen.setState((s) => ({
        datos: {
          ...s.datos,
          areas_tecnicas: s.datos.areas_tecnicas.map((a) =>
            a.id === 'area-vj' ? { ...a, activo: false } : a,
          ),
          criterios: s.datos.criterios.map((c) => (c.id === 'cri-vj-a1' ? { ...c, peso: 50 } : c)),
        },
      }));
      mostrar();
      await listo();

      expect(screen.getByRole('button', { name: 'Activar área Videojuegos' })).toBeDisabled();
      expect(
        within(area('Videojuegos')).getAllByText(
          /Para activarla, los criterios activos de su bloque deben sumar 100/,
        )[0],
      ).toBeInTheDocument();

      // Al corregirlo y guardar, ya se puede activar.
      const editor = criteriosDelArea('Videojuegos');
      await escribir(user, editor.getByLabelText('Peso del criterio 1'), '30');
      await user.click(editor.getByRole('button', { name: 'Guardar criterios' }));
      const boton = await screen.findByRole('button', { name: 'Activar área Videojuegos' });
      await waitFor(() => expect(boton).toBeEnabled());
      await user.click(boton);

      await waitFor(() =>
        expect(datos().areas_tecnicas.find((a) => a.id === 'area-vj')!.activo).toBe(true),
      );
    });
  });

  describe('áreas nuevas', () => {
    it('una área nueva nace inactiva, sin criterios, y no se puede activar hasta tener un bloque válido', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();

      await user.click(screen.getByRole('button', { name: 'Nueva área técnica' }));
      await user.type(
        screen.getByRole('textbox', { name: 'Nombre de la nueva área técnica' }),
        'Ciberseguridad',
      );
      await user.click(screen.getByRole('button', { name: 'Crear área' }));

      const nueva = await screen.findByRole('region', { name: 'Área Ciberseguridad' });
      expect(datos().areas_tecnicas.find((a) => a.nombre === 'Ciberseguridad')!.activo).toBe(false);
      expect(within(nueva).getAllByText('Inactiva').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Activar área Ciberseguridad' })).toBeDisabled();
      expect(screen.queryByRole('form', { name: 'Nombre de la nueva área técnica' })).toBeNull();

      // Con un criterio de 100 el bloque es válido y se puede activar.
      const editor = within(nueva.querySelector('details') as HTMLElement);
      await user.click(editor.getByRole('button', { name: 'Agregar criterio' }));
      await user.type(editor.getByLabelText('Nombre del criterio 1'), 'Experiencia en redes');
      await user.type(editor.getByLabelText('Peso del criterio 1'), '100');
      await user.click(editor.getByRole('button', { name: 'Guardar criterios' }));
      const boton = screen.getByRole('button', { name: 'Activar área Ciberseguridad' });
      await waitFor(() => expect(boton).toBeEnabled());
      await user.click(boton);

      await waitFor(() =>
        expect(datos().areas_tecnicas.find((a) => a.nombre === 'Ciberseguridad')!.activo).toBe(
          true,
        ),
      );
    });

    it('un nombre repetido de área se rechaza con el mensaje y no crea nada', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();
      const antes = datos().areas_tecnicas.length;

      await user.click(screen.getByRole('button', { name: 'Nueva área técnica' }));
      await user.type(
        screen.getByRole('textbox', { name: 'Nombre de la nueva área técnica' }),
        'software',
      );
      await user.click(screen.getByRole('button', { name: 'Crear área' }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(datos().areas_tecnicas).toHaveLength(antes);
    });

    it('«Cancelar» cierra el formulario sin crear nada', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();

      await user.click(screen.getByRole('button', { name: 'Nueva área técnica' }));
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(screen.getByRole('button', { name: 'Nueva área técnica' })).toBeInTheDocument();
    });

    it('editar el nombre del área lo cambia y no toca nada más', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();
      const criteriosAntes = JSON.stringify(datos().criterios);

      await user.click(screen.getByRole('button', { name: 'Editar nombre del área Videojuegos' }));
      await escribir(
        user,
        screen.getByRole('textbox', { name: 'Nombre del área' }),
        'Juegos y simulación',
      );
      await user.click(screen.getByRole('button', { name: 'Guardar nombre' }));

      expect(
        await screen.findByRole('region', { name: 'Área Juegos y simulación' }),
      ).toBeInTheDocument();
      expect(datos().areas_tecnicas.find((a) => a.id === 'area-vj')!.activo).toBe(true);
      expect(JSON.stringify(datos().criterios)).toBe(criteriosAntes);
    });
  });

  describe('especialidades', () => {
    it('una especialidad nueva nace inactiva y sin criterios', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();

      await user.click(screen.getByRole('button', { name: 'Nueva especialidad en Software' }));
      await user.type(
        screen.getByRole('textbox', { name: 'Nombre de la nueva especialidad' }),
        'Embebidos',
      );
      await user.click(screen.getByRole('button', { name: 'Crear especialidad' }));

      const nueva = await screen.findByRole('region', { name: 'Especialidad Embebidos' });
      const creada = datos().especialidades.find((e) => e.nombre === 'Embebidos')!;
      expect(creada.activo).toBe(false);
      expect(creada.id_area_tecnica).toBe('area-sw');
      expect(criteriosDe('area-sw', creada.id)).toHaveLength(0);
      expect(within(nueva).getByText('Inactiva')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Activar especialidad Embebidos' })).toBeDisabled();
    });

    it('un nombre repetido dentro del área se rechaza', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();
      const antes = datos().especialidades.length;

      await user.click(screen.getByRole('button', { name: 'Nueva especialidad en Software' }));
      await user.type(
        screen.getByRole('textbox', { name: 'Nombre de la nueva especialidad' }),
        'frontend',
      );
      await user.click(screen.getByRole('button', { name: 'Crear especialidad' }));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(datos().especialidades).toHaveLength(antes);
    });

    it('editar el nombre de una especialidad lo cambia', async () => {
      const user = userEvent.setup();
      mostrar();
      await listo();

      await user.click(
        screen.getByRole('button', { name: 'Editar nombre de la especialidad Frontend' }),
      );
      await escribir(
        user,
        screen.getByRole('textbox', { name: 'Nombre de la especialidad' }),
        'Interfaces web',
      );
      await user.click(screen.getByRole('button', { name: 'Guardar nombre' }));

      expect(
        await screen.findByRole('region', { name: 'Especialidad Interfaces web' }),
      ).toBeInTheDocument();
      expect(datos().especialidades.find((e) => e.id === 'esp-sw-front')!.nombre).toBe(
        'Interfaces web',
      );
    });
  });
});
