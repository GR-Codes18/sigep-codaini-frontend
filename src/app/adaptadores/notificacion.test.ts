import { describe, expect, it } from 'vitest';
import { ROLES, TIPOS_ELEMENTO, type Rol } from '@/domain';
import { INICIO_POR_ROL, PREFIJO_POR_ROL } from '@/auth/rutasPorRol';
import { MENU_POR_ROL } from '@/app/menus';
import type { NotificacionVista } from '@/services';
import { rutaDeDetalleDeTarea } from '@/paneles/administrador/proyectos/rutas';
import {
  aNotificacionItem,
  RUTA_DE_DETALLE,
  RUTA_DE_MODULO,
  rutaDeNotificacion,
} from './notificacion';

function aviso(cambios: Partial<NotificacionVista> = {}): NotificacionVista {
  return {
    id: 'ntf-1',
    tipo: 'TAREA_APROBADA',
    mensaje: 'Aprobaron tu tarea.',
    elemento: { tipo: 'TAREA', id: 'tar-1' },
    fecha: '2026-11-18T15:30:00.000Z',
    leida: false,
    destino: 'DETALLE',
    enlace_activo: true,
    ...cambios,
  };
}

const contexto = (rol: Rol) => ({ idUsuario: 'usr-1', rol });

describe('aNotificacionItem', () => {
  it('convierte la fecha a Date y copia texto y estado de lectura', () => {
    const item = aNotificacionItem(aviso({ leida: true }), contexto('PRACTICANTE'));
    expect(item.id).toBe('ntf-1');
    expect(item.texto).toBe('Aprobaron tu tarea.');
    expect(item.fecha).toBeInstanceOf(Date);
    expect(item.fecha.toISOString()).toBe('2026-11-18T15:30:00.000Z');
    expect(item.leida).toBe(true);
  });

  it('con el enlace activo trae la ruta del módulo y existe=true', () => {
    const item = aNotificacionItem(aviso(), contexto('PRACTICANTE'));
    expect(item.existe).toBe(true);
    expect(item.ruta).toBe('/practicante/proyectos/tareas/tar-1');
  });

  it('con el enlace desactivado no trae ruta y existe=false (el texto se conserva)', () => {
    const item = aNotificacionItem(
      aviso({ destino: null, enlace_activo: false }),
      contexto('SUPERVISOR'),
    );
    expect(item.existe).toBe(false);
    expect(item).not.toHaveProperty('ruta');
    expect(item.texto).toBe('Aprobaron tu tarea.');
  });
});

describe('rutaDeNotificacion', () => {
  it.each([
    ['ADMINISTRADOR', 'TAREA', '/administrador/tareas/otro-id'],
    ['SUPERVISOR', 'TAREA', '/supervisor/tareas/otro-id'],
    ['PRACTICANTE', 'TAREA', '/practicante/proyectos/tareas/otro-id'],
    ['ADMINISTRADOR', 'PROYECTO', '/administrador/proyectos/otro-id'],
    ['SUPERVISOR', 'PROYECTO', '/supervisor/proyectos/otro-id'],
    ['PRACTICANTE', 'PROYECTO', '/practicante/proyectos/otro-id'],
    ['ADMINISTRADOR', 'USUARIO', '/administrador/practicantes/otro-id'],
    ['SUPERVISOR', 'USUARIO', '/supervisor/practicantes/otro-id'],
    ['ADMINISTRADOR', 'AREA_TECNICA', '/administrador/postulaciones/criterios'],
    ['ADMINISTRADOR', 'ESPECIALIDAD', '/administrador/postulaciones/criterios'],
    ['ADMINISTRADOR', 'CRITERIO_EVALUACION', '/administrador/postulaciones/criterios'],
    ['ADMINISTRADOR', 'PARAMETRO_CONFIGURACION', '/administrador/configuracion'],
  ] as const)('%s, %s → %s', (rol, tipo, esperada) => {
    const ruta = rutaDeNotificacion(aviso({ elemento: { tipo, id: 'otro-id' } }), contexto(rol));
    expect(ruta).toBe(esperada);
  });

  it('el aviso de una postulación lleva al detalle de esa postulación', () => {
    const ruta = rutaDeNotificacion(
      aviso({ elemento: { tipo: 'POSTULANTE', id: 'pos-25' } }),
      contexto('ADMINISTRADOR'),
    );
    expect(ruta).toBe('/administrador/postulaciones/pos-25');
  });

  it('con el enlace desactivado un aviso de postulación no lleva a ningún lado', () => {
    const ruta = rutaDeNotificacion(
      aviso({
        elemento: { tipo: 'POSTULANTE', id: 'pos-25' },
        destino: null,
        enlace_activo: false,
      }),
      contexto('ADMINISTRADOR'),
    );
    expect(ruta).toBeUndefined();
  });

  it('el aviso de un proyecto del Supervisor lleva al detalle de ese proyecto, no solo al listado', () => {
    const ruta = rutaDeNotificacion(
      aviso({ elemento: { tipo: 'PROYECTO', id: 'pry-pl2d' } }),
      contexto('SUPERVISOR'),
    );

    expect(ruta).toBe('/supervisor/proyectos/pry-pl2d');
  });

  it('el aviso de una tarea del Supervisor lleva al detalle de esa tarea, no solo al listado', () => {
    const ruta = rutaDeNotificacion(
      aviso({ elemento: { tipo: 'TAREA', id: 'tar-1' } }),
      contexto('SUPERVISOR'),
    );

    expect(ruta).toBe('/supervisor/tareas/tar-1');
  });

  it('el aviso de una persona del Supervisor lleva al detalle de ese practicante, no solo al listado', () => {
    const ruta = rutaDeNotificacion(
      aviso({ elemento: { tipo: 'USUARIO', id: 'usr-pra-03' } }),
      contexto('SUPERVISOR'),
    );

    expect(ruta).toBe('/supervisor/practicantes/usr-pra-03');
  });

  it('los detalles de la tabla cuelgan de una página del menú del propio rol', () => {
    for (const rol of ROLES) {
      const rutasDelMenu = MENU_POR_ROL[rol].flatMap((g) => g.items.map((i) => i.ruta));
      for (const detalle of Object.values(RUTA_DE_DETALLE[rol])) {
        const ruta = `${PREFIJO_POR_ROL[rol]}${detalle?.('x')}`;
        expect(rutasDelMenu.some((m) => ruta.startsWith(`${m}/`))).toBe(true);
      }
    }
  });

  it.each(ROLES)('el aviso de la propia cuenta lleva a Mi perfil (%s)', (rol) => {
    const ruta = rutaDeNotificacion(
      aviso({ elemento: { tipo: 'USUARIO', id: 'usr-1' } }),
      contexto(rol),
    );
    expect(ruta).toBe(`${PREFIJO_POR_ROL[rol]}/perfil`);
  });

  it('el aviso de un proyecto vigente del Practicante lleva a su detalle', () => {
    const ruta = rutaDeNotificacion(
      aviso({ elemento: { tipo: 'PROYECTO', id: 'pry-1' }, destino: 'DETALLE' }),
      contexto('PRACTICANTE'),
    );
    expect(ruta).toBe('/practicante/proyectos/pry-1');
  });

  it('un proyecto que ya no es vigente (finalizado o «Ya no participas») lleva a su resumen mínimo', () => {
    const ruta = rutaDeNotificacion(
      aviso({ elemento: { tipo: 'PROYECTO', id: 'pry-1' }, destino: 'RESUMEN_PROYECTO_ANTERIOR' }),
      contexto('PRACTICANTE'),
    );
    expect(ruta).toBe('/practicante/proyectos/pry-1/anterior');
  });

  it('el aviso de una tarea del Practicante lleva al mismo destino que el clic en el tablero', () => {
    const ruta = rutaDeNotificacion(
      aviso({ elemento: { tipo: 'TAREA', id: 'tar-7' } }),
      contexto('PRACTICANTE'),
    );
    expect(ruta).toBe('/practicante/proyectos/tareas/tar-7');
    expect(rutaDeDetalleDeTarea('pry-1', 'tar-7', 'PRACTICANTE')).toBe(ruta);
  });

  it('un tipo sin entrada en la tabla cae al inicio del rol', () => {
    const ruta = rutaDeNotificacion(
      aviso({ elemento: { tipo: 'POSTULANTE', id: 'pos-1' } }),
      contexto('SUPERVISOR'),
    );
    expect(ruta).toBe(INICIO_POR_ROL.SUPERVISOR);
  });

  it('con el destino nulo no hay ruta, sea cual sea el rol y el elemento', () => {
    for (const rol of ROLES) {
      for (const tipo of TIPOS_ELEMENTO) {
        expect(
          rutaDeNotificacion(
            aviso({ elemento: { tipo, id: 'x' }, destino: null, enlace_activo: false }),
            contexto(rol),
          ),
        ).toBeUndefined();
      }
    }
  });

  it('la tabla solo apunta a páginas del menú del propio rol', () => {
    for (const rol of ROLES) {
      const rutasDelMenu = MENU_POR_ROL[rol].flatMap((g) => g.items.map((i) => i.ruta));
      for (const modulo of Object.values(RUTA_DE_MODULO[rol])) {
        expect(rutasDelMenu).toContain(`${PREFIJO_POR_ROL[rol]}${modulo}`);
      }
    }
  });
});
