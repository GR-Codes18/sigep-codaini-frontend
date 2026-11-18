import { describe, expect, it } from 'vitest';
import type { DiaSemana, Id } from '@/domain';
import { prepararPrueba, sinEscritura, type PruebaPreparada } from '../pruebas/almacen';
import { AHORA_DE_PRUEBA } from '../pruebas/entorno';
import { equipoDelProyecto, textoReunion } from './comun';
import { definirReunion } from './reunion';

const ADMIN = 'demo-admin';
const SUPERVISOR = 'demo-supervisor'; // PL2D y RSV
const SUPERVISOR_AJENO = 'usr-sup-02';
const PRACTICANTE = 'demo-practicante'; // en PL2D
const PL2D = 'pry-pl2d';
const TIE = 'pry-tie'; // finalizado
const AHORA_ISO = AHORA_DE_PRUEBA.toISOString();

function definir(
  p: PruebaPreparada,
  dia: DiaSemana | null,
  hora: string | null,
  idProyecto: Id = PL2D,
  idActor: Id = ADMIN,
) {
  return definirReunion({ idActor, idProyecto, dia_reunion: dia, hora_reunion: hora }, p.entorno);
}

const proyecto = (p: PruebaPreparada, id: Id) => p.datos().proyectos.find((x) => x.id === id)!;

function sinReunion(p: PruebaPreparada, id: Id = PL2D) {
  p.modificar((d) => ({
    proyectos: d.proyectos.map((x) =>
      x.id === id ? { ...x, dia_reunion: null, hora_reunion: null } : x,
    ),
  }));
}

describe('textoReunion', () => {
  it('«lunes a las 10:00» y null si falta algo', () => {
    expect(textoReunion('LUNES', '10:00')).toBe('lunes a las 10:00');
    expect(textoReunion('MIERCOLES', '09:30')).toBe('miércoles a las 09:30');
    expect(textoReunion('SABADO', '18:00')).toBe('sábado a las 18:00');
    expect(textoReunion(null, null)).toBeNull();
    expect(textoReunion('LUNES', null)).toBeNull();
  });
});

describe('equipoDelProyecto', () => {
  it('el supervisor y los practicantes activos con asignación vigente, sin repetidos', () => {
    const prueba = prepararPrueba();
    const datos = prueba.datos();
    const proy = proyecto(prueba, PL2D);
    const equipo = equipoDelProyecto(datos, proy);
    expect(equipo[0]).toBe(proy.id_supervisor);
    expect(new Set(equipo).size).toBe(equipo.length);
    const vigentes = datos.asignaciones
      .filter((a) => a.id_proyecto === PL2D && a.fecha_baja === null)
      .map((a) => a.id_practicante);
    expect(equipo.slice(1).sort()).toEqual([...new Set(vigentes)].sort());
    expect(equipo).toContain(PRACTICANTE);
  });

  it('deja fuera a quien ya salió y a quien tiene la cuenta inactiva', () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      asignaciones: d.asignaciones.map((a) =>
        a.id_practicante === 'usr-pra-02' && a.id_proyecto === PL2D
          ? { ...a, fecha_baja: '2026-11-10' }
          : a,
      ),
      usuarios: d.usuarios.map((u) =>
        u.id === 'usr-pra-03' ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));
    const equipo = equipoDelProyecto(prueba.datos(), proyecto(prueba, PL2D));
    expect(equipo).not.toContain('usr-pra-02');
    expect(equipo).not.toContain('usr-pra-03');
    expect(equipo).toContain(PRACTICANTE);
  });
});

describe('definirReunion: éxito', () => {
  it('define la reunión de un proyecto que no la tenía, con evento y aviso al equipo', async () => {
    const prueba = prepararPrueba();
    sinReunion(prueba);
    const antes = prueba.datos();
    const escrituras = prueba.escrituras();
    const proy = proyecto(prueba, PL2D);
    const equipo = equipoDelProyecto(antes, proy);

    const r = await definir(prueba, 'MARTES', '16:30');

    expect(r.ok && r.valor).toEqual({ ...proy, dia_reunion: 'MARTES', hora_reunion: '16:30' });
    expect(prueba.escrituras() - escrituras).toBe(1);
    const despues = prueba.datos();
    const eventos = despues.historial.slice(antes.historial.length);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      autor: { tipo: 'USUARIO', id_usuario: ADMIN },
      tipo_accion: 'PROYECTO_REUNION_CAMBIADA',
      elemento: { tipo: 'PROYECTO', id: PL2D },
      id_proyecto: PL2D,
      fecha: AHORA_ISO,
      cambios: [{ campo: 'reunion', valor_anterior: null, valor_nuevo: 'martes a las 16:30' }],
    });
    // §8.1: al equipo del proyecto (supervisor y practicantes activos).
    const avisos = despues.notificaciones.slice(antes.notificaciones.length);
    expect(avisos.map((n) => n.id_destinatario).sort()).toEqual([...equipo].sort());
    for (const n of avisos) {
      expect(n).toMatchObject({
        tipo: 'REUNION_SEMANAL_CAMBIADA',
        mensaje: `La reunión semanal de ${proy.nombre} quedó el martes a las 16:30.`,
        elemento: { tipo: 'PROYECTO', id: PL2D },
        leida: false,
      });
    }
  });

  it('cambiarla guarda el valor anterior y el nuevo', async () => {
    const prueba = prepararPrueba();
    const anterior = textoReunion(
      proyecto(prueba, PL2D).dia_reunion,
      proyecto(prueba, PL2D).hora_reunion,
    );
    await definir(prueba, 'VIERNES', '08:00');
    expect(prueba.datos().historial.at(-1)!.cambios).toEqual([
      { campo: 'reunion', valor_anterior: anterior, valor_nuevo: 'viernes a las 08:00' },
    ]);
  });

  it('el Supervisor del proyecto la define: él no recibe el aviso, el Administrador tampoco (no es del equipo)', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const r = await definir(prueba, 'JUEVES', '11:00', PL2D, SUPERVISOR);
    expect(r.ok).toBe(true);
    const avisos = prueba.datos().notificaciones.slice(antes.notificaciones.length);
    expect(avisos.some((n) => n.id_destinatario === SUPERVISOR)).toBe(false);
    expect(avisos.some((n) => n.id_destinatario === ADMIN)).toBe(false);
    expect(avisos.some((n) => n.id_destinatario === PRACTICANTE)).toBe(true);
    expect(prueba.datos().historial.at(-1)!.autor).toEqual({
      tipo: 'USUARIO',
      id_usuario: SUPERVISOR,
    });
  });

  it('el Administrador la define: avisa también al supervisor', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    await definir(prueba, 'JUEVES', '11:00');
    const avisos = prueba.datos().notificaciones.slice(antes.notificaciones.length);
    expect(avisos.some((n) => n.id_destinatario === SUPERVISOR)).toBe(true);
  });

  it('no avisa a quien ya salió del proyecto ni a quien tiene la cuenta inactiva', async () => {
    const prueba = prepararPrueba();
    prueba.modificar((d) => ({
      asignaciones: d.asignaciones.map((a) =>
        a.id_practicante === 'usr-pra-02' && a.id_proyecto === PL2D
          ? { ...a, fecha_baja: '2026-11-10' }
          : a,
      ),
      usuarios: d.usuarios.map((u) =>
        u.id === 'usr-pra-03' ? { ...u, estado: 'INACTIVO' as const } : u,
      ),
    }));
    const antes = prueba.datos().notificaciones.length;
    await definir(prueba, 'JUEVES', '11:00');
    const destinatarios = prueba
      .datos()
      .notificaciones.slice(antes)
      .map((n) => n.id_destinatario);
    expect(destinatarios).not.toContain('usr-pra-02');
    expect(destinatarios).not.toContain('usr-pra-03');
  });

  it.each([
    ['00:00', '00:00'],
    ['23:59', '23:59'],
  ])('la hora %s es válida', async (_c, hora) => {
    const prueba = prepararPrueba();
    expect((await definir(prueba, 'DOMINGO', hora)).ok).toBe(true);
  });

  it('también con el proyecto FINALIZADO', async () => {
    const prueba = prepararPrueba();
    sinReunion(prueba, TIE);
    expect((await definir(prueba, 'LUNES', '09:00', TIE)).ok).toBe(true);
  });
});

describe('definirReunion: quitar la reunión (G3-A)', () => {
  it('con los dos campos en null la quita, deja el evento y avisa «sin definir»', async () => {
    const prueba = prepararPrueba();
    const antes = prueba.datos();
    const proy = proyecto(prueba, PL2D);
    const anterior = textoReunion(proy.dia_reunion, proy.hora_reunion);

    const r = await definir(prueba, null, null);

    expect(r.ok && r.valor).toMatchObject({ dia_reunion: null, hora_reunion: null });
    const despues = prueba.datos();
    expect(despues.historial.at(-1)).toMatchObject({
      tipo_accion: 'PROYECTO_REUNION_CAMBIADA',
      cambios: [{ campo: 'reunion', valor_anterior: anterior, valor_nuevo: null }],
    });
    const avisos = despues.notificaciones.slice(antes.notificaciones.length);
    expect(avisos.length).toBeGreaterThan(0);
    for (const n of avisos) {
      expect(n.mensaje).toBe(`La reunión semanal de ${proy.nombre} quedó sin definir.`);
    }
  });

  it('quitarla cuando ya no hay → SIN_CAMBIOS y no escribe nada', async () => {
    const prueba = prepararPrueba();
    sinReunion(prueba);
    const igual = sinEscritura(prueba);
    expect(await definir(prueba, null, null)).toMatchObject({ ok: false, codigo: 'SIN_CAMBIOS' });
    igual();
  });
});

describe('definirReunion: errores', () => {
  it('la misma reunión → SIN_CAMBIOS', async () => {
    const prueba = prepararPrueba();
    const proy = proyecto(prueba, PL2D);
    const igual = sinEscritura(prueba);
    expect(await definir(prueba, proy.dia_reunion, proy.hora_reunion)).toMatchObject({
      ok: false,
      codigo: 'SIN_CAMBIOS',
    });
    igual();
  });

  it.each([
    ['día sin hora', 'LUNES' as DiaSemana | null, null, 'hora_reunion'],
    ['hora sin día', null, '10:00', 'dia_reunion'],
    ['hora 24:00', 'LUNES' as DiaSemana | null, '24:00', 'hora_reunion'],
    ['hora mal escrita', 'LUNES' as DiaSemana | null, '9:30', 'hora_reunion'],
    ['día que no existe', 'LUNESS' as unknown as DiaSemana, '10:00', 'dia_reunion'],
  ])('%s → DATOS_INVALIDOS', async (_caso, dia, hora, campo) => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    const r = await definir(prueba, dia, hora);
    expect(r).toMatchObject({ ok: false, codigo: 'DATOS_INVALIDOS' });
    expect(r.ok ? {} : r.campos).toHaveProperty(campo);
    igual();
  });

  it('un Supervisor ajeno → FUERA_DE_ALCANCE; un Practicante → ROL_NO_PERMITIDO', async () => {
    const prueba = prepararPrueba();
    const igual = sinEscritura(prueba);
    expect(await definir(prueba, 'MARTES', '10:00', PL2D, SUPERVISOR_AJENO)).toMatchObject({
      codigo: 'FUERA_DE_ALCANCE',
    });
    expect(await definir(prueba, 'MARTES', '10:00', PL2D, PRACTICANTE)).toMatchObject({
      codigo: 'ROL_NO_PERMITIDO',
    });
    igual();
  });

  it('Administrador INACTIVO → USUARIO_INACTIVO; proyecto o actor inexistente → NO_ENCONTRADO', async () => {
    const prueba = prepararPrueba();
    expect(await definir(prueba, 'MARTES', '10:00', 'pry-zz')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    expect(await definir(prueba, 'MARTES', '10:00', PL2D, 'nadie')).toMatchObject({
      codigo: 'NO_ENCONTRADO',
    });
    prueba.modificar((d) => ({
      usuarios: d.usuarios.map((u) => (u.id === ADMIN ? { ...u, estado: 'INACTIVO' as const } : u)),
    }));
    expect(await definir(prueba, 'MARTES', '10:00')).toMatchObject({ codigo: 'USUARIO_INACTIVO' });
  });
});
