import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { cambiarActivoEspecialidad, crearEspecialidad, editarEspecialidad } from './especialidades';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';
const AREA = 'area-sw';
const ESPECIALIDAD = 'esp-sw-front'; // «Frontend»: activa, con su bloque válido

const SERVICIOS = {
  crear: (p: PruebaPreparada, idActor: Id) =>
    crearEspecialidad({ idActor, idAreaTecnica: AREA, nombre: 'DevOps' }, p.entorno),
  editar: (p: PruebaPreparada, idActor: Id) =>
    editarEspecialidad(
      { idActor, idEspecialidad: ESPECIALIDAD, nombre: 'Interfaces web' },
      p.entorno,
    ),
  cambiarActivo: (p: PruebaPreparada, idActor: Id) =>
    cambiarActivoEspecialidad({ idActor, idEspecialidad: ESPECIALIDAD, activo: false }, p.entorno),
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

describe('crearEspecialidad', () => {
  it('nace inactiva, en su área, y registra el evento', async () => {
    const prueba = prepararPrueba();
    const r = await crearEspecialidad(
      { idActor: ADMIN, idAreaTecnica: AREA, nombre: ' DevOps ' },
      prueba.entorno,
    );
    expect(r).toEqual({
      ok: true,
      valor: { id: 'esp-t001', id_area_tecnica: AREA, nombre: 'DevOps', activo: false },
    });
    const despues = prueba.datos();
    expect(despues.especialidades.at(-1)).toEqual(r.ok ? r.valor : null);
    expect(despues.historial.at(-1)).toMatchObject({
      tipo_accion: 'ESPECIALIDAD_CREADA',
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      elemento: { tipo: 'ESPECIALIDAD', id: 'esp-t001', etiqueta: 'DevOps' },
      id_proyecto: null,
      cambios: [
        { campo: 'nombre', valor_anterior: null, valor_nuevo: 'DevOps' },
        { campo: 'activo', valor_anterior: null, valor_nuevo: 'No' },
      ],
    });
  });

  it('también se crea en un área inactiva', async () => {
    const prueba = prepararPrueba();
    await prueba.modificar((d) => ({
      areas_tecnicas: d.areas_tecnicas.map((a) => (a.id === AREA ? { ...a, activo: false } : a)),
    }));
    const r = await crearEspecialidad(
      { idActor: ADMIN, idAreaTecnica: AREA, nombre: 'DevOps' },
      prueba.entorno,
    );
    expect(r.ok).toBe(true);
  });

  it.each([
    ['con otras mayúsculas', 'FRONTEND'],
    ['con espacios alrededor', '  Frontend  '],
  ])('un nombre repetido en la misma área (%s) → NOMBRE_DUPLICADO', async (_caso, nombre) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await crearEspecialidad(
      { idActor: ADMIN, idAreaTecnica: AREA, nombre },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'NOMBRE_DUPLICADO' });
    igual();
  });

  it('el mismo nombre en otra área sí se permite (la unicidad es por área)', async () => {
    const prueba = prepararPrueba();
    const r = await crearEspecialidad(
      { idActor: ADMIN, idAreaTecnica: 'area-vj', nombre: 'Frontend' },
      prueba.entorno,
    );
    expect(r.ok).toBe(true);
  });

  it('un área que no existe → NO_ENCONTRADO; sin nombre → DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(
      await crearEspecialidad(
        { idActor: ADMIN, idAreaTecnica: 'area-zz', nombre: 'DevOps' },
        prueba.entorno,
      ),
    ).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    expect(
      await crearEspecialidad(
        { idActor: ADMIN, idAreaTecnica: AREA, nombre: '  ' },
        prueba.entorno,
      ),
    ).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    igual();
  });
});

describe('editarEspecialidad', () => {
  it('cambia el nombre y no toca el área, los criterios ni las evaluaciones', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await editarEspecialidad(
      { idActor: ADMIN, idEspecialidad: ESPECIALIDAD, nombre: 'Interfaces web' },
      prueba.entorno,
    );
    expect(r).toEqual({
      ok: true,
      valor: { id: ESPECIALIDAD, id_area_tecnica: AREA, nombre: 'Interfaces web', activo: true },
    });
    const despues = prueba.datos();
    expect(despues.historial.at(-1)).toMatchObject({
      tipo_accion: 'ESPECIALIDAD_EDITADA',
      elemento: { tipo: 'ESPECIALIDAD', id: ESPECIALIDAD, etiqueta: 'Interfaces web' },
      cambios: [{ campo: 'nombre', valor_anterior: 'Frontend', valor_nuevo: 'Interfaces web' }],
    });
    expect(despues.criterios).toBe(antes.criterios);
    expect(despues.evaluaciones).toBe(antes.evaluaciones);
    expect(despues.postulantes).toBe(antes.postulantes);
  });

  it('la especialidad no cambia de área: un campo de área en la entrada → DATOS_INVALIDOS', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await editarEspecialidad(
      {
        idActor: ADMIN,
        idEspecialidad: ESPECIALIDAD,
        nombre: 'Interfaces web',
        idAreaTecnica: 'area-vj',
      } as never,
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    igual();
    expect(prueba.datos().especialidades.find((e) => e.id === ESPECIALIDAD)!.id_area_tecnica).toBe(
      AREA,
    );
  });

  it('el nombre de otra especialidad de la misma área → NOMBRE_DUPLICADO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await editarEspecialidad(
      { idActor: ADMIN, idEspecialidad: ESPECIALIDAD, nombre: 'backend' },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'NOMBRE_DUPLICADO' });
    igual();
  });

  it('el mismo nombre → SIN_CAMBIOS; una especialidad inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(
      await editarEspecialidad(
        { idActor: ADMIN, idEspecialidad: ESPECIALIDAD, nombre: 'Frontend' },
        prueba.entorno,
      ),
    ).toMatchObject({ ok: false, codigo: 'SIN_CAMBIOS' });
    expect(
      await editarEspecialidad(
        { idActor: ADMIN, idEspecialidad: 'esp-zz', nombre: 'Otra' },
        prueba.entorno,
      ),
    ).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    igual();
  });
});

describe('cambiarActivoEspecialidad', () => {
  it('desactivar es libre y no tiene cascadas', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await cambiarActivoEspecialidad(
      { idActor: ADMIN, idEspecialidad: ESPECIALIDAD, activo: false },
      prueba.entorno,
    );
    expect(r.ok && r.valor.activo).toBe(false);
    const despues = prueba.datos();
    expect(despues.historial.at(-1)).toMatchObject({
      tipo_accion: 'ESPECIALIDAD_DESACTIVADA',
      cambios: [{ campo: 'activo', valor_anterior: 'Sí', valor_nuevo: 'No' }],
    });
    expect(despues.criterios).toBe(antes.criterios);
    expect(despues.areas_tecnicas).toBe(antes.areas_tecnicas);
    expect(despues.evaluaciones).toBe(antes.evaluaciones);
  });

  it('activar una especialidad con su bloque válido', async () => {
    const prueba = prepararPrueba();
    await cambiarActivoEspecialidad(
      { idActor: ADMIN, idEspecialidad: ESPECIALIDAD, activo: false },
      prueba.entorno,
    );
    const r = await cambiarActivoEspecialidad(
      { idActor: ADMIN, idEspecialidad: ESPECIALIDAD, activo: true },
      prueba.entorno,
    );
    expect(r.ok && r.valor.activo).toBe(true);
    expect(prueba.datos().historial.at(-1)).toMatchObject({ tipo_accion: 'ESPECIALIDAD_ACTIVADA' });
  });

  it('una especialidad nueva, sin criterios, no se puede activar → BLOQUE_SIN_CRITERIOS', async () => {
    const prueba = prepararPrueba();
    await crearEspecialidad(
      { idActor: ADMIN, idAreaTecnica: AREA, nombre: 'DevOps' },
      prueba.entorno,
    );
    const igual = sinEscritura(prueba);
    const r = await cambiarActivoEspecialidad(
      { idActor: ADMIN, idEspecialidad: 'esp-t001', activo: true },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'BLOQUE_SIN_CRITERIOS' });
    igual();
  });

  it('con los pesos en 101 no se puede activar → PESOS_NO_SUMAN_100', async () => {
    const prueba = prepararPrueba();
    await cambiarActivoEspecialidad(
      { idActor: ADMIN, idEspecialidad: ESPECIALIDAD, activo: false },
      prueba.entorno,
    );
    prueba.modificar((d) => ({
      criterios: d.criterios.map((c) => (c.id === 'cri-sw-front-4' ? { ...c, peso: 16 } : c)),
    }));
    const r = await cambiarActivoEspecialidad(
      { idActor: ADMIN, idEspecialidad: ESPECIALIDAD, activo: true },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'PESOS_NO_SUMAN_100' });
  });

  it('el mismo estado → SIN_CAMBIOS; inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(
      await cambiarActivoEspecialidad(
        { idActor: ADMIN, idEspecialidad: ESPECIALIDAD, activo: true },
        prueba.entorno,
      ),
    ).toMatchObject({ ok: false, codigo: 'SIN_CAMBIOS' });
    expect(
      await cambiarActivoEspecialidad(
        { idActor: ADMIN, idEspecialidad: 'esp-zz', activo: true },
        prueba.entorno,
      ),
    ).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    igual();
  });
});
