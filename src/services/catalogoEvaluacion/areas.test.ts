import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { cambiarActivoAreaTecnica, crearAreaTecnica, editarAreaTecnica } from './areas';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';
const AREA = 'area-sw'; // «Software»: activa, con su bloque general válido
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

const SERVICIOS = {
  crear: (p: PruebaPreparada, idActor: Id) =>
    crearAreaTecnica({ idActor, nombre: 'Ciberseguridad' }, p.entorno),
  editar: (p: PruebaPreparada, idActor: Id) =>
    editarAreaTecnica({ idActor, idAreaTecnica: AREA, nombre: 'Software y Web' }, p.entorno),
  cambiarActivo: (p: PruebaPreparada, idActor: Id) =>
    cambiarActivoAreaTecnica({ idActor, idAreaTecnica: AREA, activo: false }, p.entorno),
};

describe.each(Object.entries(SERVICIOS))('%s: permisos', (_nombre, ejecutar) => {
  it('el Administrador activo puede, con una sola escritura y sin avisos', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    expect((await ejecutar(prueba, ADMIN)).ok).toBe(true);
    expect(prueba.escrituras() - escrituras).toBe(1);
    expect(prueba.datos().notificaciones).toBe(antes.notificaciones);
    expect(prueba.datos().historial).toHaveLength(antes.historial.length + 1);
  });

  it.each([
    ['Supervisor', SUPERVISOR],
    ['Practicante', PRACTICANTE],
  ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await ejecutar(prueba, actor)).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' } : u)),
    }));
    const igual = sinEscritura(prueba);
    expect(await ejecutar(prueba, ADMIN)).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
    igual();
  });

  it('actor inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await ejecutar(prueba, 'nadie')).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    igual();
  });
});

describe('crearAreaTecnica', () => {
  it('nace inactiva, con el nombre recortado, y registra el evento', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await crearAreaTecnica(
      { idActor: ADMIN, nombre: '  Ciberseguridad  ' },
      prueba.entorno,
    );
    expect(r).toEqual({
      ok: true,
      valor: { id: 'area-t001', nombre: 'Ciberseguridad', activo: false },
    });
    const despues = prueba.datos();
    expect(despues.areas_tecnicas.at(-1)).toEqual({
      id: 'area-t001',
      nombre: 'Ciberseguridad',
      activo: false,
    });
    expect(despues.areas_tecnicas).toHaveLength(antes.areas_tecnicas.length + 1);
    expect(despues.historial.at(-1)).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'AREA_TECNICA_CREADA',
      elemento: { tipo: 'AREA_TECNICA', id: 'area-t001', etiqueta: 'Ciberseguridad' },
      id_proyecto: null,
      fecha: AHORA_ISO,
      cambios: [
        { campo: 'nombre', valor_anterior: null, valor_nuevo: 'Ciberseguridad' },
        { campo: 'activo', valor_anterior: null, valor_nuevo: 'No' },
      ],
    });
  });

  it.each([
    ['con otras mayúsculas', 'SOFTWARE'],
    ['con espacios alrededor', '  Software '],
    ['con espacios de más por dentro', 'Diseño   UX/UI'],
  ])('un nombre repetido (%s) → NOMBRE_DUPLICADO sin escribir', async (_caso, nombre) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await crearAreaTecnica({ idActor: ADMIN, nombre }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'NOMBRE_DUPLICADO' });
    igual();
  });

  it.each(['', '   '])('nombre vacío (%j) → DATOS_INVALIDOS', async (nombre) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await crearAreaTecnica({ idActor: ADMIN, nombre }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty('nombre');
    igual();
  });

  it('no hay límite de largo en el nombre', async () => {
    const prueba = prepararPrueba();
    const r = await crearAreaTecnica({ idActor: ADMIN, nombre: 'A'.repeat(500) }, prueba.entorno);
    expect(r.ok).toBe(true);
  });
});

describe('editarAreaTecnica', () => {
  it('cambia el nombre, registra el valor anterior y el nuevo y no toca nada más', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await editarAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, nombre: ' Software y Web ' },
      prueba.entorno,
    );
    expect(r).toEqual({ ok: true, valor: { id: AREA, nombre: 'Software y Web', activo: true } });
    const despues = prueba.datos();
    expect(despues.historial.at(-1)).toMatchObject({
      tipo_accion: 'AREA_TECNICA_EDITADA',
      elemento: { tipo: 'AREA_TECNICA', id: AREA, etiqueta: 'Software y Web' },
      cambios: [{ campo: 'nombre', valor_anterior: 'Software', valor_nuevo: 'Software y Web' }],
    });
    expect(despues.criterios).toBe(antes.criterios);
    expect(despues.especialidades).toBe(antes.especialidades);
    expect(despues.evaluaciones).toBe(antes.evaluaciones);
  });

  it('cambiar solo las mayúsculas de su propio nombre es una edición válida', async () => {
    const prueba = prepararPrueba();
    const r = await editarAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, nombre: 'SOFTWARE' },
      prueba.entorno,
    );
    expect(r.ok && r.valor.nombre).toBe('SOFTWARE');
  });

  it('el mismo nombre → SIN_CAMBIOS', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await editarAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, nombre: 'Software' },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'SIN_CAMBIOS' });
    igual();
  });

  it('el nombre de otra área → NOMBRE_DUPLICADO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await editarAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, nombre: ' videojuegos ' },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'NOMBRE_DUPLICADO' });
    igual();
  });

  it('un área que no existe → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await editarAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: 'area-zz', nombre: 'Otra' },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    igual();
  });

  it('sin nombre → DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const r = await editarAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, nombre: ' ' },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
  });
});

describe('cambiarActivoAreaTecnica', () => {
  it('desactivar es libre y no tiene cascadas', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await cambiarActivoAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, activo: false },
      prueba.entorno,
    );
    expect(r).toEqual({ ok: true, valor: { id: AREA, nombre: 'Software', activo: false } });
    const despues = prueba.datos();
    expect(despues.historial.at(-1)).toMatchObject({
      tipo_accion: 'AREA_TECNICA_DESACTIVADA',
      cambios: [{ campo: 'activo', valor_anterior: 'Sí', valor_nuevo: 'No' }],
    });
    // Sin cascadas: ni especialidades, ni criterios, ni postulantes, ni evaluaciones cambian.
    expect(despues.especialidades).toBe(antes.especialidades);
    expect(despues.criterios).toBe(antes.criterios);
    expect(despues.postulantes).toBe(antes.postulantes);
    expect(despues.evaluaciones).toBe(antes.evaluaciones);
  });

  it('activar un área cuyo bloque general es válido', async () => {
    const prueba = prepararPrueba();
    await cambiarActivoAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, activo: false },
      prueba.entorno,
    );
    const r = await cambiarActivoAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, activo: true },
      prueba.entorno,
    );
    expect(r.ok && r.valor.activo).toBe(true);
    expect(prueba.datos().historial.at(-1)).toMatchObject({
      tipo_accion: 'AREA_TECNICA_ACTIVADA',
      cambios: [{ campo: 'activo', valor_anterior: 'No', valor_nuevo: 'Sí' }],
    });
  });

  it('un área nueva, sin criterios, no se puede activar → BLOQUE_SIN_CRITERIOS', async () => {
    const prueba = prepararPrueba();
    await crearAreaTecnica({ idActor: ADMIN, nombre: 'Ciberseguridad' }, prueba.entorno);
    const igual = sinEscritura(prueba);
    const r = await cambiarActivoAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: 'area-t001', activo: true },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'BLOQUE_SIN_CRITERIOS' });
    igual();
  });

  it('con los pesos del bloque en 99 no se puede activar → PESOS_NO_SUMAN_100', async () => {
    const prueba = prepararPrueba();
    await cambiarActivoAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, activo: false },
      prueba.entorno,
    );
    prueba.modificar((d) => ({
      criterios: d.criterios.map((c) => (c.id === 'cri-sw-a4' ? { ...c, peso: 14 } : c)),
    }));
    const igual = sinEscritura(prueba);
    const r = await cambiarActivoAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, activo: true },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'PESOS_NO_SUMAN_100' });
    igual();
  });

  it('un bloque con un peso en 0 no se puede activar → PESO_INVALIDO', async () => {
    const prueba = prepararPrueba();
    await cambiarActivoAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, activo: false },
      prueba.entorno,
    );
    prueba.modificar((d) => ({
      criterios: d.criterios.map((c) =>
        c.id === 'cri-sw-a3' ? { ...c, peso: 0 } : c.id === 'cri-sw-a4' ? { ...c, peso: 40 } : c,
      ),
    }));
    const r = await cambiarActivoAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, activo: true },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'PESO_INVALIDO' });
  });

  it.each([
    ['activar un área ya activa', true],
    ['desactivar un área ya inactiva', false],
  ])('%s → SIN_CAMBIOS', async (_caso, activo) => {
    const prueba = prepararPrueba();
    if (!activo) {
      await cambiarActivoAreaTecnica(
        { idActor: ADMIN, idAreaTecnica: AREA, activo: false },
        prueba.entorno,
      );
    }
    const igual = sinEscritura(prueba);
    const r = await cambiarActivoAreaTecnica(
      { idActor: ADMIN, idAreaTecnica: AREA, activo },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'SIN_CAMBIOS' });
    igual();
  });

  it('un área que no existe → NO_ENCONTRADO; un valor que no es booleano → DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    expect(
      await cambiarActivoAreaTecnica(
        { idActor: ADMIN, idAreaTecnica: 'area-zz', activo: true },
        prueba.entorno,
      ),
    ).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    expect(
      await cambiarActivoAreaTecnica(
        { idActor: ADMIN, idAreaTecnica: AREA, activo: 'si' as unknown as boolean },
        prueba.entorno,
      ),
    ).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
  });
});
