import { describe, expect, it } from 'vitest';
import type { CambiosAlmacen, DatosAlmacen } from '@/data';
import type { EstadoPostulacion, Id, Usuario, ValorParametro } from '@/domain';
import { AHORA_DE_PRUEBA, crearEntornoDePrueba } from '../pruebas/entorno';
import { aprobarPostulacion, rechazarPostulacion, reconsiderarPostulacion } from './decisiones';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';
const PENDIENTE = 'pos-25'; // Mariana Condori Apaza, Frontend
const APROBADA = 'pos-01';
const RECHAZADA = 'pos-35';
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

function preparar() {
  const prueba = crearEntornoDePrueba();
  const datos = () => prueba.almacen.getState().datos;
  const modificar = (operacion: (d: DatosAlmacen) => CambiosAlmacen) =>
    prueba.almacen.getState().transaccion(operacion);
  const cambiarUsuario = (id: Id, cambios: Partial<Usuario>) =>
    modificar((d) => ({
      usuarios: d.usuarios.map((u) => (u.id === id ? { ...u, ...cambios } : u)),
    }));
  const fijarParametro = (clave: string, valor: ValorParametro) =>
    modificar((d) => ({
      parametros: d.parametros.map((p) => (p.clave === clave ? { ...p, valor } : p)),
    }));
  const postulante = (id: Id) => datos().postulantes.find((p) => p.id === id)!;
  return { ...prueba, datos, modificar, cambiarUsuario, fijarParametro, postulante };
}

type Prueba = ReturnType<typeof preparar>;

function sinEscritura(prueba: Prueba) {
  const datosAntes = prueba.datos();
  const escriturasAntes = prueba.escrituras();
  return () => {
    expect(prueba.datos()).toBe(datosAntes);
    expect(prueba.escrituras()).toBe(escriturasAntes);
  };
}

/** Las tres decisiones con una postulación válida para cada una. */
const DECISIONES = {
  aprobar: (p: Prueba, idActor: Id, idPostulante: Id = PENDIENTE) =>
    aprobarPostulacion({ idActor, idPostulante }, p.entorno),
  rechazar: (p: Prueba, idActor: Id, idPostulante: Id = PENDIENTE) =>
    rechazarPostulacion({ idActor, idPostulante, motivo: 'No cumple.' }, p.entorno),
  reconsiderar: (p: Prueba, idActor: Id, idPostulante: Id = RECHAZADA) =>
    reconsiderarPostulacion({ idActor, idPostulante, nota: 'Se aclaró.' }, p.entorno),
};

describe.each(Object.entries(DECISIONES))('%s: permisos y datos', (nombre, ejecutar) => {
  it('el Administrador activo puede', async () => {
    const prueba = preparar();
    expect((await ejecutar(prueba, ADMIN)).ok).toBe(true);
  });

  it.each([
    ['Supervisor', SUPERVISOR],
    ['Practicante', PRACTICANTE],
  ])('%s → ROL_NO_PERMITIDO y no escribe nada', async (_rol, actor) => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    expect(await ejecutar(prueba, actor)).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO', async () => {
    const prueba = preparar();
    prueba.cambiarUsuario(ADMIN, { estado: 'INACTIVO' });
    const igual = sinEscritura(prueba);
    expect(await ejecutar(prueba, ADMIN)).toMatchObject({ ok: false, codigo: 'USUARIO_INACTIVO' });
    igual();
  });

  it('actor inexistente → NO_ENCONTRADO', async () => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    expect(await ejecutar(prueba, 'nadie')).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADO' });
    igual();
  });

  it('postulación inexistente → NO_ENCONTRADO', async () => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    expect(await ejecutar(prueba, ADMIN, 'pos-999')).toMatchObject({
      ok: false,
      codigo: 'NO_ENCONTRADO',
    });
    igual();
  });

  it('sin identificador de la postulación → DATOS_INVALIDOS', async () => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    const r = await ejecutar(prueba, ADMIN, '');
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty('idPostulante');
    igual();
  });

  it(`${nombre}: ninguna decisión notifica a nadie (§8.1)`, async () => {
    const prueba = preparar();
    const antes = prueba.datos().notificaciones;
    await ejecutar(prueba, ADMIN);
    expect(prueba.datos().notificaciones).toBe(antes);
  });
});

describe('estado de la postulación × decisión', () => {
  const ESTADOS: Record<EstadoPostulacion, Id> = {
    PENDIENTE,
    APROBADA,
    RECHAZADA,
  };
  // Qué responde cada decisión (permitida o el código) con la postulación en cada estado.
  const ESPERADO: Record<EstadoPostulacion, Record<keyof typeof DECISIONES, string>> = {
    PENDIENTE: { aprobar: 'OK', rechazar: 'OK', reconsiderar: 'POSTULACION_NO_RECHAZADA' },
    APROBADA: {
      aprobar: 'POSTULACION_NO_PENDIENTE',
      rechazar: 'POSTULACION_NO_PENDIENTE',
      reconsiderar: 'POSTULACION_NO_RECHAZADA',
    },
    RECHAZADA: {
      aprobar: 'POSTULACION_NO_PENDIENTE',
      rechazar: 'POSTULACION_NO_PENDIENTE',
      reconsiderar: 'OK',
    },
  };

  for (const estado of Object.keys(ESTADOS) as EstadoPostulacion[]) {
    for (const accion of Object.keys(DECISIONES) as (keyof typeof DECISIONES)[]) {
      const esperado = ESPERADO[estado][accion];
      it(`${accion} con la postulación ${estado} → ${esperado}`, async () => {
        const prueba = preparar();
        const igual = esperado === 'OK' ? null : sinEscritura(prueba);
        const r = await DECISIONES[accion](prueba, ADMIN, ESTADOS[estado]);
        if (esperado === 'OK') {
          expect(r.ok).toBe(true);
        } else {
          expect(r).toMatchObject({ ok: false, codigo: esperado });
          igual?.();
        }
      });
    }
  }

  it('el permiso se comprueba antes que el estado', async () => {
    const prueba = preparar();
    const r = await aprobarPostulacion(
      { idActor: SUPERVISOR, idPostulante: APROBADA },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'ROL_NO_PERMITIDO' });
  });

  it('el estado se comprueba antes que el texto', async () => {
    const prueba = preparar();
    const r = await rechazarPostulacion({ idActor: ADMIN, idPostulante: APROBADA }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'POSTULACION_NO_PENDIENTE' });
  });
});

describe('aprobarPostulacion', () => {
  it('crea la cuenta y la práctica, aprueba la postulación y registra dos eventos, todo en una escritura', async () => {
    const prueba = preparar();
    const antes = prueba.datos();
    const escriturasAntes = prueba.escrituras();
    const postulante = prueba.postulante(PENDIENTE);

    const r = await aprobarPostulacion({ idActor: ADMIN, idPostulante: PENDIENTE }, prueba.entorno);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(prueba.escrituras() - escriturasAntes).toBe(1);
    expect(r.valor).toMatchObject({
      contrasena_temporal: expect.stringMatching(/^Clave-t\d{3}$/),
      fecha_ingreso: '2026-11-17',
      fecha_fin_prevista: '2027-03-17',
    });
    const despues = prueba.datos();

    const usuario = despues.usuarios.find((u) => u.id === r.valor.id_usuario)!;
    expect(usuario).toEqual({
      id: r.valor.id_usuario,
      nombre: postulante.nombre,
      correo: postulante.correo,
      celular: postulante.celular,
      contrasena: r.valor.contrasena_temporal,
      rol: 'PRACTICANTE',
      estado: 'ACTIVO',
      debe_cambiar_contrasena: true,
      fecha_alta: AHORA_ISO,
    });
    expect(despues.practicantes.find((x) => x.id_usuario === usuario.id)).toEqual({
      id_usuario: usuario.id,
      discord: null,
      cuenta_github: null,
      disponibilidad_horaria: null,
      id_area_tecnica: postulante.id_area_tecnica,
      id_especialidad: postulante.id_especialidad,
      fecha_ingreso: '2026-11-17',
      fecha_fin_prevista: '2027-03-17',
      id_postulante: PENDIENTE,
    });
    expect(prueba.postulante(PENDIENTE)).toEqual({ ...postulante, estado: 'APROBADA' });
    // La asignación a un proyecto es otra acción: el practicante nuevo queda «Sin proyecto».
    expect(despues.asignaciones).toBe(antes.asignaciones);
    expect(despues.usuarios).toHaveLength(antes.usuarios.length + 1);
    expect(despues.practicantes).toHaveLength(antes.practicantes.length + 1);
    // Ni la evaluación ni las notificaciones cambian.
    expect(despues.evaluaciones).toBe(antes.evaluaciones);
    expect(despues.notificaciones).toBe(antes.notificaciones);

    const nuevos = despues.historial.slice(antes.historial.length);
    expect(nuevos.map((e) => e.tipo_accion)).toEqual([
      'POSTULACION_APROBADA',
      'PRACTICANTE_CREADO',
    ]);
    expect(nuevos.every((e) => e.fecha === AHORA_ISO)).toBe(true);
    expect(nuevos.every((e) => e.autor.tipo === 'USUARIO' && e.autor.id_usuario === ADMIN)).toBe(
      true,
    );
    expect(nuevos[0]).toMatchObject({
      elemento: { tipo: 'POSTULANTE', id: PENDIENTE, etiqueta: postulante.nombre },
      id_proyecto: null,
      cambios: [{ campo: 'estado', valor_anterior: 'PENDIENTE', valor_nuevo: 'APROBADA' }],
    });
    expect(nuevos[1]).toMatchObject({
      elemento: { tipo: 'USUARIO', id: usuario.id, etiqueta: postulante.nombre },
      id_proyecto: null,
    });
  });

  it('la contraseña temporal no aparece en ningún evento del historial', async () => {
    const prueba = preparar();
    const r = await aprobarPostulacion({ idActor: ADMIN, idPostulante: PENDIENTE }, prueba.entorno);
    if (!r.ok) throw new Error(r.mensaje);
    const historial = JSON.stringify(prueba.datos().historial);
    expect(historial).not.toContain(r.valor.contrasena_temporal);
  });

  it('cada aprobación recibe una contraseña distinta', async () => {
    const prueba = preparar();
    const a = await aprobarPostulacion({ idActor: ADMIN, idPostulante: PENDIENTE }, prueba.entorno);
    const b = await aprobarPostulacion({ idActor: ADMIN, idPostulante: 'pos-26' }, prueba.entorno);
    if (!a.ok || !b.ok) throw new Error('No se aprobaron.');
    expect(a.valor.contrasena_temporal).not.toBe(b.valor.contrasena_temporal);
    expect(a.valor.contrasena_temporal.length).toBeGreaterThanOrEqual(8);
  });

  it('la fecha de ingreso es el día de Perú: las 22:00 de Lima son las 03:00Z del día siguiente', async () => {
    const prueba = preparar();
    prueba.fijarAhora(new Date('2026-11-18T03:00:00.000Z'));
    const r = await aprobarPostulacion({ idActor: ADMIN, idPostulante: PENDIENTE }, prueba.entorno);
    expect(r.ok && r.valor.fecha_ingreso).toBe('2026-11-17');
  });

  it.each([
    ['fin de mes', '2026-10-31T15:00:00.000Z', 4, '2027-02-28'],
    ['año bisiesto', '2027-10-31T15:00:00.000Z', 4, '2028-02-29'],
    ['cambio de año', '2026-09-30T15:00:00.000Z', 4, '2027-01-30'],
    ['duración configurada en 6 meses', '2026-11-17T18:30:00.000Z', 6, '2027-05-17'],
    ['duración mínima de 1 mes', '2026-11-17T18:30:00.000Z', 1, '2026-12-17'],
    ['duración máxima de 24 meses', '2026-11-17T18:30:00.000Z', 24, '2028-11-17'],
  ])('fecha de fin prevista: %s', async (_caso, ahora, meses, fin) => {
    const prueba = preparar();
    prueba.fijarAhora(new Date(ahora));
    prueba.fijarParametro('PRACTICA_DURACION_MESES', { tipo: 'numero', valor: meses });
    const r = await aprobarPostulacion({ idActor: ADMIN, idPostulante: PENDIENTE }, prueba.entorno);
    expect(r.ok && r.valor.fecha_fin_prevista).toBe(fin);
  });

  it.each([0, 25, 2.5])(
    'duración configurada inválida (%s) → MESES_INVALIDOS sin escribir',
    async (meses) => {
      const prueba = preparar();
      prueba.fijarParametro('PRACTICA_DURACION_MESES', { tipo: 'numero', valor: meses });
      const igual = sinEscritura(prueba);
      const r = await aprobarPostulacion(
        { idActor: ADMIN, idPostulante: PENDIENTE },
        prueba.entorno,
      );
      expect(r).toMatchObject({ ok: false, codigo: 'MESES_INVALIDOS' });
      igual();
      expect(prueba.postulante(PENDIENTE).estado).toBe('PENDIENTE');
    },
  );

  it('falta la duración en Configuración → CONFIGURACION_INVALIDA sin escribir', async () => {
    const prueba = preparar();
    prueba.modificar((d) => ({
      parametros: d.parametros.filter((p) => p.clave !== 'PRACTICA_DURACION_MESES'),
    }));
    const igual = sinEscritura(prueba);
    const r = await aprobarPostulacion({ idActor: ADMIN, idPostulante: PENDIENTE }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'CONFIGURACION_INVALIDA' });
    igual();
  });

  it.each([
    ['con otras mayúsculas', (c: string) => c.toUpperCase()],
    ['con espacios alrededor', (c: string) => `  ${c}  `],
    ['idéntico', (c: string) => c],
  ])('correo ya registrado (%s) → CORREO_YA_REGISTRADO sin escribir', async (_caso, variante) => {
    const prueba = preparar();
    prueba.cambiarUsuario(PRACTICANTE, { correo: variante(prueba.postulante(PENDIENTE).correo) });
    const igual = sinEscritura(prueba);
    const r = await aprobarPostulacion({ idActor: ADMIN, idPostulante: PENDIENTE }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'CORREO_YA_REGISTRADO' });
    igual();
  });

  it('aprobar dos veces la misma postulación: la segunda es POSTULACION_NO_PENDIENTE y no duplica la cuenta', async () => {
    const prueba = preparar();
    await aprobarPostulacion({ idActor: ADMIN, idPostulante: PENDIENTE }, prueba.entorno);
    const usuarios = prueba.datos().usuarios.length;
    const r = await aprobarPostulacion({ idActor: ADMIN, idPostulante: PENDIENTE }, prueba.entorno);
    expect(r).toMatchObject({ ok: false, codigo: 'POSTULACION_NO_PENDIENTE' });
    expect(prueba.datos().usuarios).toHaveLength(usuarios);
  });

  it('no modifica los datos de entrada: las demás postulaciones quedan igual', async () => {
    const prueba = preparar();
    const antes = structuredClone(prueba.datos().postulantes.filter((p) => p.id !== PENDIENTE));
    await aprobarPostulacion({ idActor: ADMIN, idPostulante: PENDIENTE }, prueba.entorno);
    expect(prueba.datos().postulantes.filter((p) => p.id !== PENDIENTE)).toEqual(antes);
  });
});

describe('rechazarPostulacion', () => {
  it('pasa a RECHAZADA y registra el motivo recortado', async () => {
    const prueba = preparar();
    const antes = prueba.datos();
    const r = await rechazarPostulacion(
      { idActor: ADMIN, idPostulante: PENDIENTE, motivo: '  Sin portafolio.  ' },
      prueba.entorno,
    );
    expect(r.ok && r.valor).toEqual({ ...prueba.postulante(PENDIENTE), estado: 'RECHAZADA' });
    const nuevos = prueba.datos().historial.slice(antes.historial.length);
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'POSTULACION_RECHAZADA',
      elemento: { tipo: 'POSTULANTE', id: PENDIENTE },
      id_proyecto: null,
      fecha: AHORA_ISO,
      nota: 'Sin portafolio.',
      cambios: [{ campo: 'estado', valor_anterior: 'PENDIENTE', valor_nuevo: 'RECHAZADA' }],
    });
    // No crea cuentas.
    expect(prueba.datos().usuarios).toBe(antes.usuarios);
    expect(prueba.datos().practicantes).toBe(antes.practicantes);
  });

  it.each([
    ['sin motivo', undefined],
    ['motivo vacío', ''],
    ['motivo de solo espacios', '   \n '],
  ])('%s → TEXTO_OBLIGATORIO y no escribe nada', async (_caso, motivo) => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    const r = await rechazarPostulacion(
      { idActor: ADMIN, idPostulante: PENDIENTE, motivo },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'TEXTO_OBLIGATORIO' });
    igual();
  });

  it('un motivo que no es texto → DATOS_INVALIDOS', async () => {
    const prueba = preparar();
    const r = await rechazarPostulacion(
      { idActor: ADMIN, idPostulante: PENDIENTE, motivo: 5 as unknown as string },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
  });
});

describe('reconsiderarPostulacion', () => {
  it('vuelve a PENDIENTE, registra la nota y conserva la evaluación', async () => {
    const prueba = preparar();
    const antes = prueba.datos();
    const r = await reconsiderarPostulacion(
      { idActor: ADMIN, idPostulante: RECHAZADA, nota: ' Aclaró su disponibilidad. ' },
      prueba.entorno,
    );
    expect(r.ok && r.valor.estado).toBe('PENDIENTE');
    const despues = prueba.datos();
    const nuevos = despues.historial.slice(antes.historial.length);
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0]).toMatchObject({
      tipo_accion: 'POSTULACION_RECONSIDERADA',
      nota: 'Aclaró su disponibilidad.',
      cambios: [{ campo: 'estado', valor_anterior: 'RECHAZADA', valor_nuevo: 'PENDIENTE' }],
    });
    // No se recalcula: la evaluación y su desglose siguen siendo los mismos objetos.
    expect(despues.evaluaciones).toBe(antes.evaluaciones);
    expect(despues.detalles_evaluacion).toBe(antes.detalles_evaluacion);
  });

  it.each([
    ['sin nota', undefined],
    ['nota vacía', ''],
    ['nota de solo espacios', '  '],
  ])('%s → TEXTO_OBLIGATORIO y no escribe nada', async (_caso, nota) => {
    const prueba = preparar();
    const igual = sinEscritura(prueba);
    const r = await reconsiderarPostulacion(
      { idActor: ADMIN, idPostulante: RECHAZADA, nota },
      prueba.entorno,
    );
    expect(r).toMatchObject({ ok: false, codigo: 'TEXTO_OBLIGATORIO' });
    igual();
  });
});
