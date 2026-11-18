import { describe, expect, it } from 'vitest';
import type { Id } from '@/domain';
import { prepararPrueba, sinEscritura } from '../pruebas/almacen';
import type { Resultado } from '../resultado';
import { obtenerMiPerfil } from './perfil';

// Semilla en AHORA_DE_PRUEBA (martes 17 de noviembre de 2026).
const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor';
const PRACTICANTE = 'demo-practicante';
const PRA_PRACTICA_FINALIZADA = 'usr-pra-19'; // INACTIVO

function valor<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(`${resultado.codigo}: ${resultado.mensaje}`);
  return resultado.valor;
}

function codigo(resultado: Resultado<unknown>): string {
  if (resultado.ok) throw new Error('Se esperaba un error y la consulta tuvo éxito.');
  return resultado.codigo;
}

const mi = (p: ReturnType<typeof prepararPrueba>, idActor: Id) =>
  obtenerMiPerfil({ idActor }, p.entorno);

describe('obtenerMiPerfil', () => {
  it('el Practicante trae su cuenta, sus datos personales y los de su práctica', async () => {
    const prueba = prepararPrueba();
    const usuario = prueba.datos().usuarios.find((u) => u.id === PRACTICANTE)!;
    const detalle = prueba.datos().practicantes.find((p) => p.id_usuario === PRACTICANTE)!;
    const area = prueba.datos().areas_tecnicas.find((a) => a.id === detalle.id_area_tecnica)!;
    const especialidad = prueba
      .datos()
      .especialidades.find((e) => e.id === detalle.id_especialidad)!;

    const perfil = valor(await mi(prueba, PRACTICANTE));

    expect(perfil).toMatchObject({
      id: PRACTICANTE,
      rol: 'PRACTICANTE',
      estado: 'ACTIVO',
      fecha_alta: usuario.fecha_alta,
      datos: {
        nombre: usuario.nombre,
        correo: usuario.correo,
        celular: usuario.celular,
        discord: detalle.discord,
        cuenta_github: detalle.cuenta_github,
        disponibilidad_horaria: detalle.disponibilidad_horaria,
      },
      practica: {
        area: area.nombre,
        especialidad: especialidad.nombre,
        fecha_ingreso: detalle.fecha_ingreso,
        fecha_fin_prevista: detalle.fecha_fin_prevista,
      },
    });
    expect(perfil.campos.map((c) => c.campo)).toEqual([
      'nombre',
      'correo',
      'celular',
      'discord',
      'cuenta_github',
      'disponibilidad_horaria',
    ]);
    expect(perfil.campos.every((c) => c.editable)).toBe(true);
  });

  it('el Supervisor no trae datos de práctica ni disponibilidad, y no edita su nombre ni su correo', async () => {
    const prueba = prepararPrueba();
    const detalle = prueba.datos().supervisores.find((s) => s.id_usuario === SUPERVISOR)!;

    const perfil = valor(await mi(prueba, SUPERVISOR));

    expect(perfil.rol).toBe('SUPERVISOR');
    expect(perfil.practica).toBeNull();
    expect(perfil.datos).toMatchObject({
      discord: detalle.discord,
      cuenta_github: detalle.cuenta_github,
      disponibilidad_horaria: null,
    });
    expect(perfil.campos).toEqual([
      { campo: 'nombre', editable: false },
      { campo: 'correo', editable: false },
      { campo: 'celular', editable: true },
      { campo: 'discord', editable: true },
      { campo: 'cuenta_github', editable: true },
    ]);
  });

  it('el Administrador solo tiene nombre, correo y celular, sin Discord, GitHub ni práctica', async () => {
    const prueba = prepararPrueba();

    const perfil = valor(await mi(prueba, ADMIN));

    expect(perfil.rol).toBe('ADMINISTRADOR');
    expect(perfil.practica).toBeNull();
    expect(perfil.datos).toMatchObject({
      discord: null,
      cuenta_github: null,
      disponibilidad_horaria: null,
    });
    expect(perfil.campos).toEqual([
      { campo: 'nombre', editable: true },
      { campo: 'correo', editable: true },
      { campo: 'celular', editable: true },
    ]);
  });

  it('cada persona recibe solo su cuenta: no hay forma de pedir la de otra', async () => {
    const prueba = prepararPrueba();

    const comoAdmin = valor(await mi(prueba, ADMIN));
    const comoPracticante = valor(await mi(prueba, PRACTICANTE));

    expect(comoAdmin.id).toBe(ADMIN);
    expect(comoPracticante.id).toBe(PRACTICANTE);
    expect(comoPracticante.datos.correo).not.toBe(comoAdmin.datos.correo);
  });

  it('nunca devuelve la contraseña ni el ID de la postulación de origen', async () => {
    const prueba = prepararPrueba();

    for (const idActor of [ADMIN, SUPERVISOR, PRACTICANTE]) {
      const texto = JSON.stringify(valor(await mi(prueba, idActor)));
      const usuario = prueba.datos().usuarios.find((u) => u.id === idActor)!;
      expect(texto, idActor).not.toContain(usuario.contrasena);
      expect(texto, idActor).not.toContain('contrasena');
      expect(texto, idActor).not.toContain('id_postulante');
    }
  });

  it('no escribe nada', async () => {
    const prueba = prepararPrueba();
    const comprobar = sinEscritura(prueba);

    valor(await mi(prueba, PRACTICANTE));

    comprobar();
  });

  it('un actor que no existe es NO_ENCONTRADO', async () => {
    expect(codigo(await mi(prepararPrueba(), 'no-existe'))).toBe('NO_ENCONTRADO');
  });

  it('un usuario INACTIVO recibe USUARIO_INACTIVO, sea cual sea su rol', async () => {
    const prueba = prepararPrueba();

    expect(codigo(await mi(prueba, PRA_PRACTICA_FINALIZADA))).toBe('USUARIO_INACTIVO');

    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) =>
        u.id === SUPERVISOR || u.id === ADMIN ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));
    expect(codigo(await mi(prueba, SUPERVISOR))).toBe('USUARIO_INACTIVO');
    expect(codigo(await mi(prueba, ADMIN))).toBe('USUARIO_INACTIVO');
  });

  it('un identificador vacío es DATOS_INVALIDOS', async () => {
    expect(codigo(await mi(prepararPrueba(), ''))).toBe('DATOS_INVALIDOS');
  });

  it('un Practicante o un Supervisor sin su detalle es NO_ENCONTRADO, no un perfil a medias', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      practicantes: d.practicantes.filter((p) => p.id_usuario !== PRACTICANTE),
      supervisores: d.supervisores.filter((s) => s.id_usuario !== SUPERVISOR),
    }));

    expect(codigo(await mi(prueba, PRACTICANTE))).toBe('NO_ENCONTRADO');
    expect(codigo(await mi(prueba, SUPERVISOR))).toBe('NO_ENCONTRADO');
    expect(valor(await mi(prueba, ADMIN)).rol).toBe('ADMINISTRADOR');
  });

  it('un Practicante cuya área o especialidad no existe es NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      especialidades: d.especialidades.filter(
        (e) => e.id !== d.practicantes.find((p) => p.id_usuario === PRACTICANTE)?.id_especialidad,
      ),
    }));

    expect(codigo(await mi(prueba, PRACTICANTE))).toBe('NO_ENCONTRADO');
  });

  it('refleja un cambio en el almacén: lo que se editó aparece en la siguiente consulta', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, celular: '911222333' } : u)),
    }));

    expect(valor(await mi(prueba, ADMIN)).datos.celular).toBe('911222333');
  });
});
