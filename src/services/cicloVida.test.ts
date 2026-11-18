import { describe, expect, it } from 'vitest';
import { CODIGOS_CICLO_VIDA, type CodigoCicloVida } from '@/domain';
import { denegarCicloVida } from './cicloVida';
import { MENSAJE_GENERICO } from './resultado';

describe('denegarCicloVida', () => {
  it.each(CODIGOS_CICLO_VIDA)('el código %s tiene un mensaje propio en español', (codigo) => {
    const f = denegarCicloVida({ ok: false, codigo });
    expect(f).toMatchObject({ ok: false, codigo });
    expect(f.mensaje).not.toBe(MENSAJE_GENERICO);
    expect(f.mensaje.length).toBeGreaterThan(15);
    expect(f.mensaje).not.toBe(codigo);
  });

  it.each([
    [1, '1 proyecto activo o en pausa'],
    [2, '2 proyectos activos o en pausa'],
    [5, '5 proyectos activos o en pausa'],
  ])('SUPERVISOR_CON_PROYECTOS con cantidad %s dice «%s»', (cantidad, texto) => {
    const f = denegarCicloVida({ ok: false, codigo: 'SUPERVISOR_CON_PROYECTOS', cantidad });
    expect(f.mensaje).toContain(texto);
    expect(f.mensaje).toContain('reasígnalos');
  });

  it.each([
    [1, '1 tarea esperando supervisión'],
    [3, '3 tareas esperando supervisión'],
  ])('TAREAS_ESPERANDO_SUPERVISION con cantidad %s dice «%s»', (cantidad, texto) => {
    const f = denegarCicloVida({ ok: false, codigo: 'TAREAS_ESPERANDO_SUPERVISION', cantidad });
    expect(f.mensaje).toContain(texto);
  });

  it('un código sin cantidad usa el mensaje de la tabla aunque la cantidad no venga', () => {
    const f = denegarCicloVida({ ok: false, codigo: 'SUPERVISOR_CON_PROYECTOS' });
    expect(f.mensaje).toContain('proyectos activos o en pausa');
  });

  it.each([
    ['USUARIO_INACTIVO', 'inactiva'],
    ['ROL_NO_PERMITIDO', 'rol'],
    ['FUERA_DE_ALCANCE', 'acceso'],
    ['PROYECTO_FINALIZADO', 'finalizado'],
    ['TEXTO_OBLIGATORIO', 'motivo'],
  ] as [CodigoCicloVida, string][])(
    'el código de permisos o texto %s también tiene mensaje',
    (codigo, parte) => {
      expect(denegarCicloVida({ ok: false, codigo }).mensaje.toLowerCase()).toContain(parte);
    },
  );

  it('un código de reactivación pasa con el mensaje que trae del dominio', () => {
    const f = denegarCicloVida({
      ok: false,
      codigo: 'PRACTICANTE_NO_FINALIZADO',
      mensaje: 'Solo se puede reactivar a un practicante con la práctica finalizada.',
    });
    expect(f).toEqual({
      ok: false,
      codigo: 'PRACTICANTE_NO_FINALIZADO',
      mensaje: 'Solo se puede reactivar a un practicante con la práctica finalizada.',
    });
  });

  it('agrega los campos del formulario solo si se pasan', () => {
    expect(denegarCicloVida({ ok: false, codigo: 'MISMO_SUPERVISOR' })).not.toHaveProperty(
      'campos',
    );
    expect(
      denegarCicloVida(
        { ok: false, codigo: 'MISMO_SUPERVISOR' },
        { supervisor: 'Elige a otra persona.' },
      ),
    ).toMatchObject({ campos: { supervisor: 'Elige a otra persona.' } });
  });
});
