import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { editarDatosPractica, type EntradaEditarDatosPractica } from './datosPractica';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE_DEMO = 'demo-practicante';
const PRACTICANTE = 'usr-pra-04'; // Backend (área Software)
const FINALIZADO = 'usr-pra-19';
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

function preparar() {
  const prueba = prepararPrueba();
  // Fechas conocidas para que las pruebas no dependan de la semilla.
  prueba.modificar((d) => ({
    practicantes: d.practicantes.map((p) =>
      p.id_usuario === PRACTICANTE
        ? { ...p, fecha_ingreso: '2026-06-01', fecha_fin_prevista: '2026-10-01' }
        : p,
    ),
  }));
  return prueba;
}

const editar = (
  p: PruebaPreparada,
  cambios: Partial<EntradaEditarDatosPractica>,
  idActor: Id = ADMIN,
  idPracticante: Id = PRACTICANTE,
) => editarDatosPractica({ idActor, idPracticante, ...cambios }, p.entorno);

const practicante = (p: PruebaPreparada, id: Id = PRACTICANTE) =>
  p.datos().practicantes.find((x) => x.id_usuario === id)!;

describe('editarDatosPractica: permisos y datos', () => {
  it('el Administrador activo puede', async () => {
    const prueba = preparar();
    expect((await editar(prueba, { fecha_fin_prevista: '2026-12-01' })).ok).toBe(true);
  });

  it.each([
    ['Supervisor', SUPERVISOR],
    ['Practicante', PRACTICANTE_DEMO],
  ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    expect(await editar(prueba, { fecha_fin_prevista: '2026-12-01' }, actor)).toMatchObject({
      ok: false,
      codigo: 'ROL_NO_PERMITIDO',
    });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO; actor o practicante inexistente → NO_ENCONTRADO', async () => {
    const prueba = preparar();
    expect(await editar(prueba, { fecha_fin_prevista: '2026-12-01' }, 'nadie')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    expect(
      await editar(prueba, { fecha_fin_prevista: '2026-12-01' }, ADMIN, 'usr-zz'),
    ).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' } : u)),
    }));
    expect(await editar(prueba, { fecha_fin_prevista: '2026-12-01' })).toMatchObject({
      codigo: 'USUARIO_INACTIVO',
    });
  });

  it('una persona que no es practicante → FUERA_DE_ALCANCE', async () => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    expect(
      await editar(prueba, { fecha_fin_prevista: '2026-12-01' }, ADMIN, 'usr-sup-02'),
    ).toMatchObject({ ok: false, codigo: 'FUERA_DE_ALCANCE' });
    igual();
  });

  it('sin ningún dato para cambiar → DATOS_INVALIDOS', async () => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    const r = await editar(prueba, {});
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty('_general');
    igual();
  });

  it.each([
    ['una fecha que no existe en el calendario', '2026-02-30'],
    ['con otro formato', '17/11/2026'],
    ['vacía', ''],
  ])('fecha de ingreso %s → DATOS_INVALIDOS', async (_caso, fecha) => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    const r = await editar(prueba, { fecha_ingreso: fecha });
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty('fecha_ingreso');
    igual();
  });

  it('el 29 de febrero solo existe en año bisiesto', async () => {
    const prueba = preparar();
    expect(await editar(prueba, { fecha_fin_prevista: '2027-02-29' })).toMatchObject({
      codigo: 'DATOS_INVALIDOS',
    });
    expect((await editar(prueba, { fecha_fin_prevista: '2028-02-29' })).ok).toBe(true);
  });
});

describe('editarDatosPractica: las fechas', () => {
  it('cambia el ingreso y el fin, y registra el valor anterior y el nuevo', async () => {
    const prueba = preparar();
    const antes = prueba.datos();
    const persona = antes.usuarios.find((u) => u.id === PRACTICANTE)!;
    const escrituras = prueba.escrituras();

    const r = await editar(prueba, {
      fecha_ingreso: '2026-07-01',
      fecha_fin_prevista: '2026-11-30',
    });

    expect(r.ok && r.valor).toEqual({
      ...practicante(prueba),
      fecha_ingreso: '2026-07-01',
      fecha_fin_prevista: '2026-11-30',
    });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'PRACTICANTE_DATOS_PRACTICA_EDITADOS',
      elemento: { tipo: 'USUARIO', id: PRACTICANTE, etiqueta: persona.nombre },
      id_proyecto: null,
      fecha: AHORA_ISO,
      cambios: [
        { campo: 'fecha_ingreso', valor_anterior: '2026-06-01', valor_nuevo: '2026-07-01' },
        { campo: 'fecha_fin_prevista', valor_anterior: '2026-10-01', valor_nuevo: '2026-11-30' },
      ],
    });
    // §8.1: no avisa a nadie. Y no toca a las demás personas.
    expect(despues.notificaciones).toBe(antes.notificaciones);
    expect(despues.practicantes.filter((p) => p.id_usuario !== PRACTICANTE)).toEqual(
      antes.practicantes.filter((p) => p.id_usuario !== PRACTICANTE),
    );
  });

  it('nunca recalcula la fecha de fin: al cambiar solo el ingreso, el fin queda como estaba', async () => {
    const prueba = preparar();
    const r = await editar(prueba, { fecha_ingreso: '2026-08-15' });
    expect(r.ok && r.valor).toMatchObject({
      fecha_ingreso: '2026-08-15',
      fecha_fin_prevista: '2026-10-01',
    });
  });

  it('el fin puede ser el mismo día del ingreso', async () => {
    const prueba = preparar();
    expect((await editar(prueba, { fecha_fin_prevista: '2026-06-01' })).ok).toBe(true);
  });

  it.each([
    ['solo el fin, antes del ingreso', { fecha_fin_prevista: '2026-05-31' }],
    ['solo el ingreso, después del fin', { fecha_ingreso: '2026-10-02' }],
    [
      'las dos, con el fin antes',
      { fecha_ingreso: '2026-09-01', fecha_fin_prevista: '2026-08-01' },
    ],
  ])('%s → FIN_ANTES_DE_INGRESO y no escribe nada', async (_caso, cambios) => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    const r = await editar(prueba, cambios);
    expect(r).toMatchObject({ ok: false, codigo: 'FIN_ANTES_DE_INGRESO' });
    expect(r.ok ? {} : r.campos).toHaveProperty('fecha_fin_prevista');
    igual();
  });

  it('los mismos valores → SIN_CAMBIOS', async () => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    expect(
      await editar(prueba, { fecha_ingreso: '2026-06-01', fecha_fin_prevista: '2026-10-01' }),
    ).toMatchObject({ ok: false, codigo: 'SIN_CAMBIOS' });
    igual();
  });

  it('también se pueden corregir las fechas de un practicante finalizado', async () => {
    const prueba = preparar();
    const r = await editar(prueba, { fecha_fin_prevista: '2026-12-31' }, ADMIN, FINALIZADO);
    expect(r.ok).toBe(true);
  });
});

describe('editarDatosPractica: la especialidad', () => {
  it('una especialidad de otra área cambia también el área y deja los dos cambios en el evento', async () => {
    const prueba = preparar();
    const antes = prueba.datos();
    const r = await editar(prueba, { id_especialidad: 'esp-vj-prog' });
    expect(r.ok && r.valor).toMatchObject({
      id_especialidad: 'esp-vj-prog',
      id_area_tecnica: 'area-vj',
    });
    const evento = prueba.datos().historial.at(-1)!;
    expect(evento.cambios).toEqual([
      { campo: 'especialidad', valor_anterior: 'Backend', valor_nuevo: 'Programación de juegos' },
      { campo: 'area', valor_anterior: 'Software', valor_nuevo: 'Videojuegos' },
    ]);
    // Cambiar la especialidad no toca las evaluaciones de su postulación de origen.
    expect(prueba.datos().evaluaciones).toBe(antes.evaluaciones);
  });

  it('una especialidad de la misma área solo cambia la especialidad', async () => {
    const prueba = preparar();
    await editar(prueba, { id_especialidad: 'esp-sw-front' });
    expect(prueba.datos().historial.at(-1)!.cambios).toEqual([
      { campo: 'especialidad', valor_anterior: 'Backend', valor_nuevo: 'Frontend' },
    ]);
    expect(practicante(prueba).id_area_tecnica).toBe('area-sw');
  });

  it('una especialidad inactiva → ESPECIALIDAD_INACTIVA y no escribe nada', async () => {
    const prueba = preparar();
    prueba.modificar((d) => ({
      especialidades: d.especialidades.map((e) =>
        e.id === 'esp-vj-prog' ? { ...e, activo: false } : e,
      ),
    }));
    const igual = sinEscritura(prueba);
    const r = await editar(prueba, { id_especialidad: 'esp-vj-prog' });
    expect(r).toMatchObject({ ok: false, codigo: 'ESPECIALIDAD_INACTIVA' });
    expect(r.ok ? {} : r.campos).toHaveProperty('id_especialidad');
    igual();
  });

  it('una especialidad que no existe → NO_ENCONTRADO', async () => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    expect(await editar(prueba, { id_especialidad: 'esp-zz' })).toMatchObject({
      ok: false,
      codigo: 'NO_ENCONTRADO',
    });
    igual();
  });

  it('si su especialidad actual quedó inactiva, puede editar otros datos sin cambiarla', async () => {
    const prueba = preparar();
    prueba.modificar((d) => ({
      especialidades: d.especialidades.map((e) =>
        e.id === 'esp-sw-back' ? { ...e, activo: false } : e,
      ),
    }));
    const r = await editar(prueba, {
      id_especialidad: 'esp-sw-back',
      fecha_fin_prevista: '2026-12-01',
    });
    expect(r.ok).toBe(true);
    // La misma especialidad no figura como cambio.
    expect(
      prueba
        .datos()
        .historial.at(-1)!
        .cambios.map((c) => c.campo),
    ).toEqual(['fecha_fin_prevista']);
  });
});
