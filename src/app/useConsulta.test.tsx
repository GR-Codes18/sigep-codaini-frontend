import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { crearSemilla } from '@/data/semilla';
import { useAlmacen } from '@/data';
import { exito, fallo, type Resultado } from '@/services';
import { useConsulta } from './useConsulta';

const datosIniciales = crearSemilla(new Date('2026-11-17T18:30:00.000Z'));

function pausa(ms: number) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

describe('useConsulta', () => {
  beforeEach(() => {
    useAlmacen.setState({ datos: datosIniciales });
  });

  it('empieza cargando y después entrega el valor', async () => {
    const ejecutar = vi.fn(async () => exito('valor'));
    const { result } = renderHook(() => useConsulta(ejecutar));

    expect(result.current).toEqual({ valor: null, error: null, cargando: true });
    await waitFor(() => expect(result.current.valor).toBe('valor'));
    expect(result.current).toEqual({ valor: 'valor', error: null, cargando: false });
  });

  it('si la consulta falla entrega el mensaje del servicio y ningún valor', async () => {
    const ejecutar = async (): Promise<Resultado<string>> => fallo('NO_ENCONTRADO');
    const { result } = renderHook(() => useConsulta(ejecutar));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.valor).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('con null no consulta nada y no queda «cargando»', async () => {
    const { result } = renderHook(() => useConsulta<string>(null));

    await pausa(30);
    expect(result.current).toEqual({ valor: null, error: null, cargando: false });
  });

  it('vuelve a consultar cuando cambia el almacén y conserva el valor anterior mientras llega el nuevo', async () => {
    let n = 0;
    const ejecutar = vi.fn(async () => {
      n += 1;
      const llamada = n;
      if (llamada > 1) await pausa(60);
      return exito(`respuesta ${llamada}`);
    });
    const { result } = renderHook(() => useConsulta(ejecutar));
    await waitFor(() => expect(result.current.valor).toBe('respuesta 1'));

    act(() => {
      useAlmacen.getState().transaccion(() => ({ notificaciones: [] }));
    });

    // Mientras llega la segunda no se vacía ni vuelve a «cargando».
    expect(result.current).toMatchObject({ valor: 'respuesta 1', cargando: false });
    await waitFor(() => expect(result.current.valor).toBe('respuesta 2'));
    expect(ejecutar).toHaveBeenCalledTimes(2);
  });

  it('al cambiar de consulta no muestra el valor de la anterior', async () => {
    const primera = async () => exito('primera');
    const segunda = async () => {
      await pausa(60);
      return exito('segunda');
    };
    const { result, rerender } = renderHook(({ ejecutar }) => useConsulta(ejecutar), {
      initialProps: { ejecutar: primera },
    });
    await waitFor(() => expect(result.current.valor).toBe('primera'));

    rerender({ ejecutar: segunda });

    expect(result.current).toEqual({ valor: null, error: null, cargando: true });
    await waitFor(() => expect(result.current.valor).toBe('segunda'));
  });

  it('una respuesta lenta que llega tarde no pisa a la más reciente', async () => {
    const lenta = async () => {
      await pausa(150);
      return exito('lenta');
    };
    const rapida = async () => exito('rápida');
    const { result, rerender } = renderHook(({ ejecutar }) => useConsulta(ejecutar), {
      initialProps: { ejecutar: lenta },
    });

    rerender({ ejecutar: rapida });
    await waitFor(() => expect(result.current.valor).toBe('rápida'));
    await pausa(250);

    expect(result.current.valor).toBe('rápida');
  });
});
