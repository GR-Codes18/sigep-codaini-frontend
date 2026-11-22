import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAlmacenSesion } from '@/auth/almacenSesion';
import { useAlmacen } from '@/data';
import { crearSemilla } from '@/data/semilla';
import type { Notificacion } from '@/domain';
import { crearEntorno, ENTORNO } from '@/services';
import { useNotificaciones } from './useNotificaciones';

const datosIniciales = crearSemilla(new Date('2026-11-17T18:30:00.000Z'));
const practicante = datosIniciales.usuarios.find((item) => item.rol === 'PRACTICANTE');
const administrador = datosIniciales.usuarios.find((item) => item.rol === 'ADMINISTRADOR');
if (!practicante || !administrador)
  throw new Error('La semilla debe incluir las cuentas de prueba.');

/** Sin demora, para no esperar la red simulada en cada consulta. */
const rapido = crearEntorno({ demoraMs: 0 });

function aviso(numero: number, cambios: Partial<Notificacion> = {}): Notificacion {
  return {
    id: `ntf-hook-${String(numero).padStart(2, '0')}`,
    id_destinatario: practicante!.id,
    tipo: 'TAREA_APROBADA',
    mensaje: `Aviso ${numero}`,
    elemento: { tipo: 'TAREA', id: datosIniciales.tareas[0].id },
    fecha: `2026-11-17T10:${String(numero).padStart(2, '0')}:00.000Z`,
    leida: false,
    ...cambios,
  };
}

function ponerAvisos(avisos: Notificacion[]) {
  useAlmacen.setState({ datos: { ...datosIniciales, notificaciones: avisos } });
}

function abrirSesion(usuario = practicante!) {
  useAlmacenSesion.setState({
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      debe_cambiar_contrasena: usuario.debe_cambiar_contrasena,
    },
  });
}

describe('useNotificaciones', () => {
  beforeEach(() => {
    localStorage.clear();
    ponerAvisos([]);
    abrirSesion();
  });

  it('carga solo las propias, las más recientes primero y con sus contadores', async () => {
    ponerAvisos([
      aviso(1),
      aviso(2, { leida: true }),
      aviso(3, { id_destinatario: administrador!.id, mensaje: 'De otra persona' }),
    ]);
    const { result } = renderHook(() => useNotificaciones({}, rapido));

    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.items.map((n) => n.texto)).toEqual(['Aviso 2', 'Aviso 1']);
    expect(result.current.noLeidas).toBe(1);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('con límite recorta la lista, pero «no leídas» cuenta todas las suyas', async () => {
    ponerAvisos(Array.from({ length: 10 }, (_, i) => aviso(i + 1)));
    const { result } = renderHook(() => useNotificaciones({ limite: 8 }, rapido));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.items).toHaveLength(8);
    expect(result.current.items[0].texto).toBe('Aviso 10');
    expect(result.current.noLeidas).toBe(10);
    expect(result.current.total).toBe(10);
  });

  it('con «solo no leídas» trae únicamente esas y el total las cuenta', async () => {
    ponerAvisos([aviso(1), aviso(2, { leida: true }), aviso(3)]);
    const { result } = renderHook(() => useNotificaciones({ soloNoLeidas: true }, rapido));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.items.map((n) => n.texto)).toEqual(['Aviso 3', 'Aviso 1']);
    expect(result.current.total).toBe(2);
    expect(result.current.noLeidas).toBe(2);
  });

  it('adapta el enlace: ruta si está activo y sin ruta si el elemento ya no existe', async () => {
    ponerAvisos([aviso(1), aviso(2, { elemento: { tipo: 'TAREA', id: 'tarea-que-no-existe' } })]);
    const { result } = renderHook(() => useNotificaciones({}, rapido));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    const [eliminada, existente] = result.current.items;
    expect(eliminada.existe).toBe(false);
    expect(eliminada.ruta).toBeUndefined();
    expect(existente.existe).toBe(true);
    expect(existente.ruta).toBe(`/practicante/proyectos/tareas/${datosIniciales.tareas[0].id}`);
  });

  it('vuelve a consultar cuando cambia la lista de notificaciones del almacén', async () => {
    ponerAvisos([aviso(1)]);
    const { result } = renderHook(() => useNotificaciones({}, rapido));
    await waitFor(() => expect(result.current.total).toBe(1));

    act(() => {
      useAlmacen.getState().transaccion((datos) => ({
        notificaciones: [...datos.notificaciones, aviso(2)],
      }));
    });

    await waitFor(() => expect(result.current.total).toBe(2));
    expect(result.current.items[0].texto).toBe('Aviso 2');
  });

  it('al marcar una como leída baja el contador sin quitar la lista', async () => {
    ponerAvisos([aviso(1), aviso(2)]);
    const { result } = renderHook(() => useNotificaciones({}, rapido));
    await waitFor(() => expect(result.current.noLeidas).toBe(2));

    act(() => {
      useAlmacen.getState().transaccion((datos) => ({
        notificaciones: datos.notificaciones.map((n) =>
          n.id === aviso(1).id ? { ...n, leida: true } : n,
        ),
      }));
    });

    await waitFor(() => expect(result.current.noLeidas).toBe(1));
    expect(result.current.items).toHaveLength(2);
  });

  it('sin sesión no consulta y se queda cargando', async () => {
    useAlmacenSesion.setState({ usuario: null });
    ponerAvisos([aviso(1)]);
    const { result } = renderHook(() => useNotificaciones({}, rapido));

    await new Promise((resolver) => setTimeout(resolver, 50));
    expect(result.current.cargando).toBe(true);
    expect(result.current.items).toEqual([]);
  });

  it('una respuesta lenta que llega tarde no pisa a la más reciente', async () => {
    ponerAvisos(Array.from({ length: 5 }, (_, i) => aviso(i + 1)));
    const lento = crearEntorno({ demoraMs: 250 });
    const { result, rerender } = renderHook(
      ({ limite, entorno }) => useNotificaciones({ limite }, entorno),
      { initialProps: { limite: 1, entorno: lento } },
    );

    rerender({ limite: 4, entorno: rapido });
    await waitFor(() => expect(result.current.items).toHaveLength(4));
    await new Promise((resolver) => setTimeout(resolver, 400));
    expect(result.current.items).toHaveLength(4);
  });

  it('si la consulta falla, devuelve el mensaje del servicio y la lista vacía', async () => {
    const sinUsuarios = crearEntorno({
      demoraMs: 0,
      almacen: {
        // Las consultas leen los datos que les pasa `transaccion`: aquí sin ninguna cuenta.
        getState: () => ({
          ...ENTORNO.almacen.getState(),
          transaccion: (operacion) => {
            operacion({ ...ENTORNO.almacen.getState().datos, usuarios: [] });
          },
        }),
      },
    });
    const { result } = renderHook(() => useNotificaciones({}, sinUsuarios));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.items).toEqual([]);
    expect(result.current.cargando).toBe(false);
  });
});
