import { describe, expect, it } from 'vitest';
import type { Id, ValorParametro } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { emitirAvisosFinDePractica } from './avisoFin';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // PL2D y RSV
const SUPERVISOR_INV = 'usr-sup-03'; // INV
const PRACTICANTE = 'usr-pra-04'; // vigente en PL2D
const HOY = '2026-11-17'; // AHORA_DE_PRUEBA en hora de Perú
const A_14_DIAS = '2026-12-01';

const emitir = (p: PruebaPreparada) => emitirAvisosFinDePractica(p.entorno);

const nombre = (p: PruebaPreparada, id: Id) => p.datos().usuarios.find((u) => u.id === id)!.nombre;

function fijarFin(p: PruebaPreparada, fecha: string, id: Id = PRACTICANTE) {
  p.modificar((d) => ({
    practicantes: d.practicantes.map((x) =>
      x.id_usuario === id ? { ...x, fecha_fin_prevista: fecha } : x,
    ),
  }));
}

function fijarAviso(p: PruebaPreparada, valor: ValorParametro | null) {
  p.modificar((d) => ({
    parametros:
      valor === null
        ? d.parametros.filter((x) => x.clave !== 'PRACTICA_AVISO_FIN_DIAS')
        : d.parametros.map((x) => (x.clave === 'PRACTICA_AVISO_FIN_DIAS' ? { ...x, valor } : x)),
  }));
}

/** Los avisos de fin de práctica que hay hoy en el almacén para esa persona. */
function avisosDe(p: PruebaPreparada, id: Id) {
  return p
    .datos()
    .notificaciones.filter(
      (n) =>
        n.tipo === 'PRACTICA_PROXIMA_A_FINALIZAR' &&
        n.elemento.tipo === 'USUARIO' &&
        n.elemento.id === id &&
        n.mensaje.includes(A_14_DIAS),
    );
}

describe('emitirAvisosFinDePractica: el día exacto', () => {
  it('avisa al practicante, a los supervisores de sus proyectos vigentes y al Administrador', async () => {
    const prueba = prepararPrueba();
    // Además de PL2D, tiene un proyecto con otro supervisor (INV).
    prueba.modificar((d) => ({
      asignaciones: [
        ...d.asignaciones,
        {
          id: 'asi-x',
          id_practicante: PRACTICANTE,
          id_proyecto: 'pry-inv',
          fecha_alta: '2026-11-01',
          fecha_baja: null,
        },
      ],
    }));
    fijarFin(prueba, A_14_DIAS);
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();

    const r = await emitir(prueba);

    expect(r).toEqual({ ok: true, valor: { practicantes_avisados: [PRACTICANTE] } });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    const nuevos = despues.notificaciones.slice(antes.notificaciones.length);
    expect(nuevos.map((n) => n.id_destinatario)).toEqual([
      PRACTICANTE,
      SUPERVISOR,
      SUPERVISOR_INV,
      ADMIN,
    ]);
    for (const n of nuevos) {
      expect(n).toMatchObject({
        tipo: 'PRACTICA_PROXIMA_A_FINALIZAR',
        mensaje: `La práctica de ${nombre(prueba, PRACTICANTE)} finaliza el ${A_14_DIAS}.`,
        elemento: { tipo: 'USUARIO', id: PRACTICANTE },
        fecha: AHORA_DE_PRUEBA.toISOString(),
        leida: false,
      });
    }
    // Es un aviso del sistema: no deja eventos en el historial ni cambia otra cosa.
    expect(despues.historial).toBe(antes.historial);
    expect(despues.usuarios).toBe(antes.usuarios);
  });

  it('un supervisor con dos proyectos del practicante recibe un solo aviso', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      asignaciones: [
        ...d.asignaciones,
        {
          id: 'asi-x',
          id_practicante: PRACTICANTE,
          id_proyecto: 'pry-rsv',
          fecha_alta: '2026-11-01',
          fecha_baja: null,
        },
      ],
    }));
    fijarFin(prueba, A_14_DIAS);
    await emitir(prueba);
    expect(
      avisosDe(prueba, PRACTICANTE).filter((n) => n.id_destinatario === SUPERVISOR),
    ).toHaveLength(1);
  });

  it('un practicante sin proyecto avisa solo a él y al Administrador', async () => {
    const prueba = prepararPrueba();
    fijarFin(prueba, A_14_DIAS, 'usr-pra-20');
    await emitir(prueba);
    expect(avisosDe(prueba, 'usr-pra-20').map((n) => n.id_destinatario)).toEqual([
      'usr-pra-20',
      ADMIN,
    ]);
  });

  it('no avisa a supervisores de proyectos de los que el practicante ya salió', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      asignaciones: [
        ...d.asignaciones,
        {
          id: 'asi-x',
          id_practicante: PRACTICANTE,
          id_proyecto: 'pry-inv',
          fecha_alta: '2026-10-01',
          fecha_baja: '2026-11-10',
        },
      ],
    }));
    fijarFin(prueba, A_14_DIAS);
    await emitir(prueba);
    const destinatarios = avisosDe(prueba, PRACTICANTE).map((n) => n.id_destinatario);
    expect(destinatarios).toContain(SUPERVISOR);
    expect(destinatarios).not.toContain(SUPERVISOR_INV);
  });

  it('usa el día de Perú: las 22:00 de Lima (03:00Z del día siguiente) siguen siendo el mismo día', async () => {
    const prueba = prepararPrueba();
    prueba.fijarAhora(new Date('2026-11-18T03:00:00.000Z'));
    fijarFin(prueba, A_14_DIAS);
    const r = await emitir(prueba);
    expect(r.ok && r.valor.practicantes_avisados).toContain(PRACTICANTE);
  });

  it('respeta el aviso configurado en Configuración (7 días)', async () => {
    const prueba = prepararPrueba();
    fijarAviso(prueba, { tipo: 'numero', valor: 7 });
    fijarFin(prueba, '2026-11-24');
    const r = await emitir(prueba);
    expect(r.ok && r.valor.practicantes_avisados).toEqual([PRACTICANTE]);
    // Con 7 días configurados, estar a 14 ya no dispara nada.
    const otra = prepararPrueba();
    fijarAviso(otra, { tipo: 'numero', valor: 7 });
    fijarFin(otra, A_14_DIAS);
    expect(await emitir(otra)).toEqual({ ok: true, valor: { practicantes_avisados: [] } });
  });

  it('avisa a varios practicantes a la vez', async () => {
    const prueba = prepararPrueba();
    fijarFin(prueba, A_14_DIAS);
    fijarFin(prueba, A_14_DIAS, 'usr-pra-20');
    const r = await emitir(prueba);
    expect(r.ok && r.valor.practicantes_avisados.sort()).toEqual(
      [PRACTICANTE, 'usr-pra-20'].sort(),
    );
  });
});

describe('emitirAvisosFinDePractica: solo ese día, una sola vez', () => {
  it.each([
    ['un día antes (faltan 15)', '2026-12-02'],
    ['un día después (faltan 13)', '2026-11-30'],
    ['el mismo día del fin', HOY],
    ['una práctica ya vencida', '2026-11-01'],
  ])('%s → no avisa y no escribe nada', async (_caso, fecha) => {
    const prueba = prepararPrueba();
    fijarFin(prueba, fecha);
    const antes = prueba.datos().notificaciones.length;
    const igual = sinEscritura(prueba);
    const r = await emitir(prueba);
    expect(r).toEqual({ ok: true, valor: { practicantes_avisados: [] } });
    igual();
    expect(prueba.datos().notificaciones).toHaveLength(antes);
  });

  it('con los datos de la semilla de hoy no hay nada que avisar y no se escribe', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await emitir(prueba)).toEqual({ ok: true, valor: { practicantes_avisados: [] } });
    igual();
  });

  it('es idempotente: ejecutarlo otra vez el mismo día no repite los avisos ni escribe', async () => {
    const prueba = prepararPrueba();
    fijarFin(prueba, A_14_DIAS);
    await emitir(prueba);
    const cantidad = avisosDe(prueba, PRACTICANTE).length;
    const igual = sinEscritura(prueba);
    expect(await emitir(prueba)).toEqual({ ok: true, valor: { practicantes_avisados: [] } });
    igual();
    expect(avisosDe(prueba, PRACTICANTE)).toHaveLength(cantidad);
  });

  it('si la fecha de fin cambia y vuelve a ser el día exacto, se avisa de nuevo (otro mensaje)', async () => {
    const prueba = prepararPrueba();
    fijarFin(prueba, A_14_DIAS);
    await emitir(prueba);
    // El Administrador mueve la fecha de fin un día y el reloj avanza un día: es otra fecha, otro mensaje.
    fijarFin(prueba, '2026-12-02');
    prueba.fijarAhora(new Date('2026-11-18T18:30:00.000Z'));
    const r = await emitir(prueba);
    expect(r.ok && r.valor.practicantes_avisados).toContain(PRACTICANTE);
    const mensajes = prueba
      .datos()
      .notificaciones.filter(
        (n) =>
          n.tipo === 'PRACTICA_PROXIMA_A_FINALIZAR' &&
          n.elemento.tipo === 'USUARIO' &&
          n.elemento.id === PRACTICANTE &&
          n.id_destinatario === PRACTICANTE,
      )
      .map((n) => n.mensaje.slice(-11));
    expect(mensajes).toEqual(['2026-12-01.', '2026-12-02.']);
  });

  it('al día siguiente, otra práctica que llega a 14 días recibe su aviso', async () => {
    const prueba = prepararPrueba();
    fijarFin(prueba, A_14_DIAS);
    await emitir(prueba);
    fijarFin(prueba, '2026-12-02', 'usr-pra-20');
    prueba.fijarAhora(new Date('2026-11-18T18:30:00.000Z'));
    const r = await emitir(prueba);
    // Recibe su aviso quien llega hoy a 14 días; quien ya lo recibió ayer no lo recibe de nuevo.
    expect(r.ok && r.valor.practicantes_avisados).toContain('usr-pra-20');
    expect(r.ok && r.valor.practicantes_avisados).not.toContain(PRACTICANTE);
  });
});

describe('emitirAvisosFinDePractica: a quién no se avisa y errores', () => {
  it('un practicante con la práctica finalizada no recibe aviso', async () => {
    const prueba = prepararPrueba();
    fijarFin(prueba, A_14_DIAS, 'usr-pra-19');
    expect(await emitir(prueba)).toEqual({ ok: true, valor: { practicantes_avisados: [] } });
  });

  it('las cuentas inactivas (supervisor, administrador) no reciben el aviso', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) =>
        u.id === SUPERVISOR || u.id === ADMIN ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));
    fijarFin(prueba, A_14_DIAS);
    await emitir(prueba);
    expect(avisosDe(prueba, PRACTICANTE).map((n) => n.id_destinatario)).toEqual([PRACTICANTE]);
  });

  it('el aviso previo ausente en Configuración → CONFIGURACION_INVALIDA sin escribir', async () => {
    const prueba = prepararPrueba();
    fijarAviso(prueba, null);
    const igual = sinEscritura(prueba);
    expect(await emitir(prueba)).toMatchObject({ ok: false, codigo: 'CONFIGURACION_INVALIDA' });
    igual();
  });

  it('de otro tipo → CONFIGURACION_INVALIDA', async () => {
    const prueba = prepararPrueba();
    fijarAviso(prueba, { tipo: 'rango', minimo: 1, maximo: 2 });
    expect(await emitir(prueba)).toMatchObject({ ok: false, codigo: 'CONFIGURACION_INVALIDA' });
  });

  it.each([0, 366, 2.5])(
    'un aviso fuera de rango (%s) → AVISO_INVALIDO sin escribir',
    async (dias) => {
      const prueba = prepararPrueba();
      fijarAviso(prueba, { tipo: 'numero', valor: dias });
      const igual = sinEscritura(prueba);
      const r = await emitir(prueba);
      expect(r).toMatchObject({ ok: false, codigo: 'AVISO_INVALIDO' });
      expect(!r.ok && r.mensaje).toContain('entre 1 y 365');
      igual();
    },
  );
});
