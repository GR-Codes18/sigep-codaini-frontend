import { describe, expect, it } from 'vitest';
import type { MiPerfil } from '@/services';
import { aPerfil } from './perfil';

function perfil(cambios: Partial<MiPerfil> = {}): MiPerfil {
  return {
    id: 'usr-1',
    rol: 'PRACTICANTE',
    estado: 'ACTIVO',
    fecha_alta: '2026-03-02T14:00:00.000Z',
    datos: {
      nombre: 'Ana Quispe',
      correo: 'ana@codaini.demo',
      celular: '987654321',
      discord: 'ana.dev',
      cuenta_github: 'ana-dev',
      disponibilidad_horaria: 20,
    },
    practica: {
      area: 'Desarrollo de software',
      especialidad: 'Frontend',
      fecha_ingreso: '2026-03-02',
      fecha_fin_prevista: '2026-09-02',
    },
    campos: [
      { campo: 'nombre', editable: true },
      { campo: 'correo', editable: true },
    ],
    ...cambios,
  };
}

describe('aPerfil', () => {
  it('arma la ficha del Practicante con rol, estado, alta y datos de la práctica', () => {
    expect(aPerfil(perfil()).cuenta).toEqual([
      { etiqueta: 'Rol', valor: 'Practicante' },
      { etiqueta: 'Estado', valor: 'Activo' },
      { etiqueta: 'Fecha de alta', valor: '2 mar 2026' },
      { etiqueta: 'Área', valor: 'Desarrollo de software' },
      { etiqueta: 'Especialidad', valor: 'Frontend' },
      { etiqueta: 'Inicio de práctica', valor: '2 mar 2026' },
      { etiqueta: 'Fin previsto', valor: '2 sep 2026' },
    ]);
  });

  it('sin datos de práctica (Supervisor y Administrador) la ficha solo trae rol, estado y alta', () => {
    const resultado = aPerfil(perfil({ rol: 'SUPERVISOR', practica: null }));

    expect(resultado.cuenta.map((f) => f.etiqueta)).toEqual(['Rol', 'Estado', 'Fecha de alta']);
    expect(resultado.cuenta[0].valor).toBe('Supervisor');
    expect(aPerfil(perfil({ rol: 'ADMINISTRADOR', practica: null })).cuenta[0].valor).toBe(
      'Administrador',
    );
  });

  it('dice «Inactivo» para una cuenta inactiva', () => {
    expect(aPerfil(perfil({ estado: 'INACTIVO' })).cuenta[1].valor).toBe('Inactivo');
  });

  it('los valores del formulario son texto, con los nombres de los datos', () => {
    expect(aPerfil(perfil()).valores).toEqual({
      nombre: 'Ana Quispe',
      correo: 'ana@codaini.demo',
      celular: '987654321',
      discord: 'ana.dev',
      cuenta_github: 'ana-dev',
      disponibilidad_horaria: '20',
    });
  });

  it('un dato que no existe (null) queda como texto vacío, nunca como «null»', () => {
    const { valores } = aPerfil(
      perfil({
        datos: {
          nombre: 'Ana',
          correo: 'ana@codaini.demo',
          celular: '987654321',
          discord: null,
          cuenta_github: null,
          disponibilidad_horaria: null,
        },
      }),
    );

    expect(valores.discord).toBe('');
    expect(valores.cuenta_github).toBe('');
    expect(valores.disponibilidad_horaria).toBe('');
  });

  it('pasa los campos tal como los decidió el dominio, sin tocarlos', () => {
    const campos = [
      { campo: 'nombre' as const, editable: false },
      { campo: 'celular' as const, editable: true },
    ];

    expect(aPerfil(perfil({ campos })).campos).toEqual(campos);
  });
});
