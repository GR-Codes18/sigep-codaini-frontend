import { describe, expect, it } from 'vitest';
import { aplicarRevisiones, type Id, type TipoReglaInsight } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { calcularInsightsVigentes } from './comun';
import { marcarInsightRevisado, notificarDesdeInsight } from './insights';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // pry-pl2d y pry-rsv
const OTRO_SUPERVISOR = 'usr-sup-02'; // pry-dat (y el finalizado pry-tie)
const PRACTICANTE = 'demo-practicante';
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

// Insights de la semilla en AHORA_DE_PRUEBA.
const INACTIVO_PL2D = {
  tipo_regla: 'PRACTICANTE_INACTIVO',
  elemento: { tipo: 'USUARIO', id: 'usr-pra-05' },
} as const; // CRITICO
const INACTIVO_RSV = {
  tipo_regla: 'PRACTICANTE_INACTIVO',
  elemento: { tipo: 'USUARIO', id: 'usr-pra-07' },
} as const;
const DEMORADA_RSV = {
  tipo_regla: 'SUPERVISION_DEMORADA',
  elemento: { tipo: 'TAREA', id: 'tar-rsv-006' },
} as const;
const DEMORADA_INV = {
  tipo_regla: 'SUPERVISION_DEMORADA',
  elemento: { tipo: 'TAREA', id: 'tar-inv-003' },
} as const; // pry-inv, de usr-sup-03
const CARGA_PL2D = {
  tipo_regla: 'CARGA_DESBALANCEADA',
  elemento: { tipo: 'USUARIO', id: 'usr-pra-04' },
} as const; // ya revisado por el admin (rev-01)
const POSTULACION = {
  tipo_regla: 'POSTULACIONES_SIN_DECIDIR',
  elemento: { tipo: 'POSTULANTE', id: 'pos-31' },
} as const;
const FIN_PRACTICA = {
  tipo_regla: 'FIN_PRACTICA',
  elemento: { tipo: 'USUARIO', id: 'usr-pra-03' },
} as const;

type Objetivo = { tipo_regla: TipoReglaInsight; elemento: { tipo: string; id: string } };

const revisar = (p: PruebaPreparada, idActor: Id, o: Objetivo, nota?: string | null) =>
  marcarInsightRevisado(
    { idActor, ...o, nota } as Parameters<typeof marcarInsightRevisado>[0],
    p.entorno,
  );
const notificar = (p: PruebaPreparada, idActor: Id, o: Objetivo) =>
  notificarDesdeInsight(
    { idActor, ...o } as Parameters<typeof notificarDesdeInsight>[0],
    p.entorno,
  );

const insightDe = (p: PruebaPreparada, o: Objetivo) => {
  const r = calcularInsightsVigentes(p.datos(), p.entorno.ahora().toISOString());
  if (!r.ok) throw new Error(r.mensaje);
  return r.valor.find((i) => i.tipo_regla === o.tipo_regla && i.elemento.id === o.elemento.id)!;
};
const revisadoPor = (p: PruebaPreparada, idUsuario: Id, o: Objetivo) =>
  aplicarRevisiones([insightDe(p, o)], p.datos().revisiones_insight, idUsuario, AHORA_ISO)[0]!
    .revisado;

describe('marcarInsightRevisado', () => {
  it('el Administrador marca un insight: guarda su revisión y nada más', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    expect(insightDe(prueba, INACTIVO_PL2D).severidad).toBe('CRITICO');

    const r = await revisar(prueba, ADMIN, INACTIVO_PL2D, 'Hablé con él.');

    expect(r).toEqual({
      ok: true,
      valor: {
        id: 'rev-t001',
        tipo_regla: 'PRACTICANTE_INACTIVO',
        elemento: { tipo: 'USUARIO', id: 'usr-pra-05' },
        severidad_al_revisar: 'CRITICO',
        fecha: AHORA_ISO,
        id_usuario: ADMIN,
        nota: 'Hablé con él.',
      },
    });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    expect(despues.revisiones_insight).toEqual([...antes.revisiones_insight, r.ok && r.valor]);
    // Sin evento de historial ni avisos (§5.7 y §8.1).
    expect(despues.historial).toBe(antes.historial);
    expect(despues.notificaciones).toBe(antes.notificaciones);
    expect(despues.usuarios).toBe(antes.usuarios);
  });

  it('guarda la severidad que el insight tiene ahora', async () => {
    const prueba = prepararPrueba();
    const r = await revisar(prueba, ADMIN, INACTIVO_RSV); // ATENCION
    expect(r.ok && r.valor.severidad_al_revisar).toBe('ATENCION');
  });

  it.each([
    ['sin nota', undefined],
    ['nota null', null],
    ['nota vacía', ''],
    ['nota de espacios', '   \n '],
  ])('%s se guarda como null', async (_caso, nota) => {
    const prueba = prepararPrueba();
    const r = await revisar(prueba, ADMIN, INACTIVO_PL2D, nota);
    expect(r.ok && r.valor.nota).toBeNull();
  });

  it('la nota se recorta', async () => {
    const prueba = prepararPrueba();
    const r = await revisar(prueba, ADMIN, INACTIVO_PL2D, '  Ya hablé  ');
    expect(r.ok && r.valor.nota).toBe('Ya hablé');
  });

  it('el insight queda revisado para quien lo marcó', async () => {
    const prueba = prepararPrueba();
    expect(revisadoPor(prueba, ADMIN, INACTIVO_PL2D)).toBe(false);
    await revisar(prueba, ADMIN, INACTIVO_PL2D);
    expect(revisadoPor(prueba, ADMIN, INACTIVO_PL2D)).toBe(true);
  });

  it('«revisado» es independiente por persona: el Supervisor no cambia lo del Administrador', async () => {
    const prueba = prepararPrueba();
    await revisar(prueba, SUPERVISOR, INACTIVO_PL2D);
    expect(revisadoPor(prueba, SUPERVISOR, INACTIVO_PL2D)).toBe(true);
    expect(revisadoPor(prueba, ADMIN, INACTIVO_PL2D)).toBe(false);
  });

  it('el Supervisor puede marcar un insight que el Administrador ya revisó (rev-01)', async () => {
    const prueba = prepararPrueba();
    expect(revisadoPor(prueba, ADMIN, CARGA_PL2D)).toBe(true);
    const r = await revisar(prueba, SUPERVISOR, CARGA_PL2D);
    expect(r.ok && r.valor.id_usuario).toBe(SUPERVISOR);
  });

  it('marcar dos veces lo mismo: INSIGHT_YA_REVISADO y no escribe', async () => {
    const prueba = prepararPrueba();
    await revisar(prueba, ADMIN, INACTIVO_PL2D);
    const verificar = sinEscritura(prueba);
    const r = await revisar(prueba, ADMIN, INACTIVO_PL2D);
    expect(r).toEqual({
      ok: false,
      codigo: 'INSIGHT_YA_REVISADO',
      mensaje: 'Ya marcaste esta alerta como revisada.',
    });
    verificar();
  });

  it('un insight que el Administrador ya tenía revisado en la semilla también se rechaza', async () => {
    const prueba = prepararPrueba();
    const r = await revisar(prueba, ADMIN, CARGA_PL2D);
    expect(r).toMatchObject({ ok: false, codigo: 'INSIGHT_YA_REVISADO' });
  });

  it('reaparece a los 7 días y se puede volver a marcar', async () => {
    const prueba = prepararPrueba();
    // rev-01 es de hace 1 día: a los 8 días de ahora ya pasaron 7 completos.
    prueba.fijarAhora(new Date(AHORA_DE_PRUEBA.getTime() + 8 * 86_400_000));
    const r = await revisar(prueba, ADMIN, CARGA_PL2D);
    expect(r.ok).toBe(true);
    expect(prueba.datos().revisiones_insight).toHaveLength(2);
  });

  it('reaparece si la severidad sube, y se puede volver a marcar', async () => {
    const prueba = prepararPrueba();
    // El Administrador revisó la alerta cuando era de Atención; hoy es Crítico.
    prueba.modificar((d) => ({
      revisiones_insight: [
        ...d.revisiones_insight,
        {
          id: 'rev-previa',
          ...INACTIVO_PL2D,
          severidad_al_revisar: 'ATENCION' as const,
          fecha: '2026-11-17T12:00:00.000Z',
          id_usuario: ADMIN,
          nota: null,
        },
      ],
    }));
    expect(revisadoPor(prueba, ADMIN, INACTIVO_PL2D)).toBe(false);
    const r = await revisar(prueba, ADMIN, INACTIVO_PL2D);
    expect(r.ok).toBe(true);
  });

  describe('permisos y alcance', () => {
    it('el Administrador marca las 7 reglas (también las de postulaciones y fin de práctica)', async () => {
      const prueba = prepararPrueba();
      for (const o of [POSTULACION, FIN_PRACTICA, DEMORADA_INV]) {
        expect((await revisar(prueba, ADMIN, o)).ok, o.tipo_regla).toBe(true);
      }
    });

    it('el Supervisor marca los de sus proyectos', async () => {
      const prueba = prepararPrueba();
      for (const o of [INACTIVO_PL2D, INACTIVO_RSV, DEMORADA_RSV]) {
        expect((await revisar(prueba, SUPERVISOR, o)).ok, o.elemento.id).toBe(true);
      }
    });

    it.each([
      ['postulaciones sin decidir', POSTULACION],
      ['fin de práctica', FIN_PRACTICA],
    ])('el Supervisor no ve «%s»: ROL_NO_PERMITIDO', async (_n, objetivo) => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await revisar(prueba, SUPERVISOR, objetivo);
      expect(r).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
      verificar();
    });

    it.each([
      ['de otro supervisor (pry-inv)', SUPERVISOR, DEMORADA_INV],
      ['de un proyecto que no es suyo', OTRO_SUPERVISOR, INACTIVO_PL2D],
    ])('un insight %s: FUERA_DE_ALCANCE', async (_n, actor, objetivo) => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await revisar(prueba, actor, objetivo);
      expect(r).toMatchObject({ ok: false, codigo: 'FUERA_DE_ALCANCE' });
      verificar();
    });

    it('un practicante no marca insights', async () => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await revisar(prueba, PRACTICANTE, INACTIVO_PL2D);
      expect(r).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
      verificar();
    });

    it('un supervisor INACTIVO no marca insights', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === SUPERVISOR ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      const verificar = sinEscritura(prueba);
      const r = await revisar(prueba, SUPERVISOR, INACTIVO_PL2D);
      expect(r).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
      verificar();
    });
  });

  describe('datos inválidos e inexistentes', () => {
    it('un insight que no existe es NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await revisar(prueba, ADMIN, {
        tipo_regla: 'PRACTICANTE_INACTIVO',
        elemento: { tipo: 'USUARIO', id: 'usr-pra-01' },
      });
      expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
      verificar();
    });

    it('la regla debe coincidir con el elemento', async () => {
      const prueba = prepararPrueba();
      const r = await revisar(prueba, ADMIN, {
        tipo_regla: 'SUPERVISION_DEMORADA',
        elemento: INACTIVO_PL2D.elemento,
      });
      expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    });

    it('el tipo de elemento debe coincidir', async () => {
      const prueba = prepararPrueba();
      const r = await revisar(prueba, ADMIN, {
        tipo_regla: 'PRACTICANTE_INACTIVO',
        elemento: { tipo: 'TAREA', id: 'usr-pra-05' },
      });
      expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    });

    it('un insight que ya no se cumple deja de existir', async () => {
      const prueba = prepararPrueba();
      // Un umbral más alto que los 16 días de inactividad: la condición ya no se cumple.
      prueba.modificar((d) => ({
        parametros: d.parametros.map((p) =>
          p.clave === 'INSIGHT_INACTIVO_DIAS'
            ? { ...p, valor: { tipo: 'numero' as const, valor: 13 } }
            : p.clave === 'INSIGHT_INACTIVO_CRITICO_DIAS'
              ? { ...p, valor: { tipo: 'numero' as const, valor: 30 } }
              : p,
        ),
      }));
      const r = await revisar(prueba, ADMIN, INACTIVO_RSV); // 9 días
      expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    });

    it('una regla desconocida o un id vacío es DATOS_INVALIDOS', async () => {
      const prueba = prepararPrueba();
      const regla = await revisar(prueba, ADMIN, {
        tipo_regla: 'OTRA' as TipoReglaInsight,
        elemento: INACTIVO_PL2D.elemento,
      });
      const vacio = await revisar(prueba, ADMIN, {
        tipo_regla: 'PRACTICANTE_INACTIVO',
        elemento: { tipo: 'USUARIO', id: '' },
      });
      expect(regla).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
      expect(vacio).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    });

    it('un actor que no existe es NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();
      const r = await revisar(prueba, 'usr-fantasma', INACTIVO_PL2D);
      expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    });

    it('un parámetro de Configuración roto: CONFIGURACION_INVALIDA, sin escribir', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        parametros: d.parametros.filter((p) => p.clave !== 'INSIGHT_POSTULACION_DIAS'),
      }));
      const verificar = sinEscritura(prueba);
      const r = await revisar(prueba, ADMIN, INACTIVO_PL2D);
      expect(r).toMatchObject({ ok: false, codigo: 'CONFIGURACION_INVALIDA' });
      verificar();
    });
  });
});

describe('notificarDesdeInsight', () => {
  it('inactividad: el Administrador avisa al practicante, con el texto del insight', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    const insight = insightDe(prueba, INACTIVO_PL2D);

    const r = await notificar(prueba, ADMIN, INACTIVO_PL2D);

    expect(r).toEqual({ ok: true, valor: { id_destinatario: 'usr-pra-05' } });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    const nuevas = despues.notificaciones.slice(antes.notificaciones.length);
    expect(nuevas).toEqual([
      {
        id: 'ntf-t001',
        id_destinatario: 'usr-pra-05',
        tipo: 'NOTIFICACION_DESDE_INSIGHT',
        mensaje: `${insight.titulo}. ${insight.motivo}`,
        elemento: { tipo: 'USUARIO', id: 'usr-pra-05' },
        fecha: AHORA_ISO,
        leida: false,
      },
    ]);
    // Sin evento de historial ni revisión.
    expect(despues.historial).toBe(antes.historial);
    expect(despues.revisiones_insight).toBe(antes.revisiones_insight);
  });

  it('inactividad: el Supervisor avisa a un practicante de su proyecto', async () => {
    const prueba = prepararPrueba();
    const r = await notificar(prueba, SUPERVISOR, INACTIVO_RSV);
    expect(r).toEqual({ ok: true, valor: { id_destinatario: 'usr-pra-07' } });
    expect(prueba.datos().notificaciones.at(-1)).toMatchObject({
      id_destinatario: 'usr-pra-07',
      tipo: 'NOTIFICACION_DESDE_INSIGHT',
    });
  });

  it('supervisión demorada: el Administrador avisa al supervisor del proyecto de la tarea', async () => {
    const prueba = prepararPrueba();
    const r = await notificar(prueba, ADMIN, DEMORADA_RSV);
    expect(r).toEqual({ ok: true, valor: { id_destinatario: SUPERVISOR } });
    expect(prueba.datos().notificaciones.at(-1)).toMatchObject({
      id_destinatario: SUPERVISOR,
      elemento: { tipo: 'TAREA', id: 'tar-rsv-006' },
    });
    // En el otro proyecto, avisa a su propio supervisor.
    const otra = await notificar(prueba, ADMIN, DEMORADA_INV);
    expect(otra).toEqual({ ok: true, valor: { id_destinatario: 'usr-sup-03' } });
  });

  it('se puede avisar más de una vez (la propuesta no pone un límite)', async () => {
    const prueba = prepararPrueba();
    await notificar(prueba, ADMIN, INACTIVO_PL2D);
    const antes = prueba.datos().notificaciones.length;
    const r = await notificar(prueba, ADMIN, INACTIVO_PL2D);
    expect(r.ok).toBe(true);
    expect(prueba.datos().notificaciones).toHaveLength(antes + 1);
  });

  it('un insight ya revisado también se puede notificar', async () => {
    const prueba = prepararPrueba();
    await revisar(prueba, ADMIN, INACTIVO_PL2D);
    expect((await notificar(prueba, ADMIN, INACTIVO_PL2D)).ok).toBe(true);
  });

  describe('permisos y alcance', () => {
    it('el Supervisor no notifica supervisión demorada: ROL_NO_PERMITIDO', async () => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await notificar(prueba, SUPERVISOR, DEMORADA_RSV);
      expect(r).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
      verificar();
    });

    it.each([
      ['carga desbalanceada', CARGA_PL2D],
      ['postulaciones sin decidir', POSTULACION],
      ['fin de práctica', FIN_PRACTICA],
    ])('nadie notifica desde «%s»', async (_n, objetivo) => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      for (const actor of [ADMIN, SUPERVISOR]) {
        const r = await notificar(prueba, actor, objetivo);
        expect(r, actor).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
      }
      verificar();
    });

    it('el Supervisor no notifica a practicantes de proyectos ajenos: FUERA_DE_ALCANCE', async () => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await notificar(prueba, OTRO_SUPERVISOR, INACTIVO_PL2D);
      expect(r).toMatchObject({ ok: false, codigo: 'FUERA_DE_ALCANCE' });
      verificar();
    });

    it('un practicante no notifica', async () => {
      const prueba = prepararPrueba();
      const r = await notificar(prueba, PRACTICANTE, INACTIVO_PL2D);
      expect(r).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
    });

    it('un administrador INACTIVO no notifica', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === ADMIN ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      const verificar = sinEscritura(prueba);
      const r = await notificar(prueba, ADMIN, INACTIVO_PL2D);
      expect(r).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
      verificar();
    });
  });

  describe('destinatario', () => {
    it('un supervisor destinatario INACTIVO: USUARIO_OBJETIVO_INACTIVO', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        usuarios: d.usuarios.map((u) =>
          u.id === 'usr-sup-03' ? { ...u, estado: 'INACTIVO' as const } : u,
        ),
      }));
      const verificar = sinEscritura(prueba);
      const r = await notificar(prueba, ADMIN, DEMORADA_INV);
      expect(r).toMatchObject({ ok: false, codigo: 'USUARIO_OBJETIVO_INACTIVO' });
      verificar();
    });

    it('un supervisor que ya no existe: NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();
      prueba.modificar((d) => ({
        proyectos: d.proyectos.map((p) =>
          p.id === 'pry-inv' ? { ...p, id_supervisor: 'usr-fantasma' } : p,
        ),
      }));
      const r = await notificar(prueba, ADMIN, DEMORADA_INV);
      expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    });
  });

  describe('datos inválidos e inexistentes', () => {
    it('un insight que no existe es NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();
      const verificar = sinEscritura(prueba);
      const r = await notificar(prueba, ADMIN, {
        tipo_regla: 'PRACTICANTE_INACTIVO',
        elemento: { tipo: 'USUARIO', id: 'usr-pra-01' },
      });
      expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
      verificar();
    });

    it('un actor que no existe es NO_ENCONTRADO', async () => {
      const prueba = prepararPrueba();
      const r = await notificar(prueba, 'usr-fantasma', INACTIVO_PL2D);
      expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    });

    it('una entrada inválida es DATOS_INVALIDOS', async () => {
      const prueba = prepararPrueba();
      const r = await notificar(prueba, ADMIN, {
        tipo_regla: 'PRACTICANTE_INACTIVO',
        elemento: { tipo: 'COSA', id: 'usr-pra-05' },
      });
      expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    });
  });
});
