/**
 * Tareas de la semilla, construidas a partir de su ciclo de vida.
 *
 * Cada tarea se declara como una lista de pasos con su desfase («hace 6 días»). El constructor
 * aplica los pasos en orden y deriva el estado, el responsable, `fecha_termino`, `estado_pr` y
 * los eventos del historial; así los datos salen coherentes por construcción:
 *   - `fecha_termino` es el mismo instante que el evento que cierra la tarea
 *     (`TAREA_TERMINADA` o `TAREA_APROBADA`);
 *   - `estado_pr` se calcula con `siguienteEstadoPR` (tabla de §7.4), no a mano;
 *   - el número de cada tarea es su posición en el guion del proyecto (una tarea eliminada
 *     ocupa su número y nadie lo reutiliza).
 * Lo único que se repite de `domain/` es la secuencia de pasos permitidos, y el constructor
 * lanza un error si un guion pide un paso imposible.
 */

import {
  etiquetaPRVisible,
  formatearIdLegible,
  siguienteEstadoPR,
  type AutorEvento,
  type CambioRegistrado,
  type ConsultaGitHub,
  type EventoPR,
  type Id,
  type Proyecto,
  type Tarea,
  type TipoAccionHistorial,
  type TipoNotificacion,
  type Usuario,
} from '@/domain';
import { ID_PL2D, ID_RSV, ID_INV, ID_TIE, ID_DAT } from './proyectos';
import { ID_PRACTICANTE_DEMO } from './personas';
import { type Desfase, type Reloj } from './reloj';
import type { Registro } from './registro';

type Paso =
  | { a: 'TOMAR'; hace: Desfase; por: Id }
  | { a: 'LIBERAR'; hace: Desfase; por?: Id; nota?: string }
  | { a: 'ENVIAR'; hace: Desfase; github?: ConsultaGitHub }
  | { a: 'TERMINAR'; hace: Desfase; github?: ConsultaGitHub }
  | { a: 'APROBAR'; hace: Desfase }
  | { a: 'DEVOLVER'; hace: Desfase; nota: string }
  | { a: 'REABRIR'; hace: Desfase; nota: string }
  | { a: 'EDITAR'; hace: Desfase; limite: number }
  | { a: 'PR_CREAR'; hace: Desfase }
  | { a: 'PR_INFORMA'; hace: Desfase; consulta: ConsultaGitHub }
  | { a: 'PR_CERRAR'; hace: Desfase; por?: Id; motivo: string };

interface GuionTarea {
  titulo: string;
  descripcion: string;
  /** Fecha límite en días desde hoy (negativo = ya venció). */
  limite: number;
  creada: Desfase;
  /** Por defecto `false`: «Requiere supervisión» nace desactivada. */
  supervision?: boolean;
  /** Por defecto `true`: «Requiere PR» nace activado. */
  pr?: boolean;
  pasos?: readonly Paso[];
}

interface GuionEliminada {
  eliminada: true;
  titulo: string;
  creada: Desfase;
  borrada: Desfase;
  motivo: string;
}

type Guion = GuionTarea | GuionEliminada;

const DEMO = ID_PRACTICANTE_DEMO;
const DIEGO = 'usr-pra-02';
const CAMILA = 'usr-pra-03';
const MATEO = 'usr-pra-04';
const ANDRES = 'usr-pra-05';
const LUCIA = 'usr-pra-06';
const HERNAN = 'usr-pra-07';
const SOFIA = 'usr-pra-08';
const BRUNO = 'usr-pra-09';
const TOMAS = 'usr-pra-10';
const INES = 'usr-pra-11';
const RODRIGO = 'usr-pra-15';
const PAOLA = 'usr-pra-16';
const KEVIN = 'usr-pra-17';
const MARISOL = 'usr-pra-19';
const NICOLAS = 'usr-pra-20';

const FUSIONADO: ConsultaGitHub = { estado: 'FUSIONADO' };
const CON_CONFLICTOS: ConsultaGitHub = { estado: 'ABIERTO', conflictos: true };

const GUIONES: Record<Id, readonly Guion[]> = {
  [ID_PL2D]: [
    {
      titulo: 'Prototipo de movimiento del jugador',
      descripcion: 'Correr, saltar y caer con controles de teclado en una escena de prueba.',
      limite: -28,
      creada: [38, 2],
      pasos: [
        { a: 'TOMAR', hace: [36], por: DIEGO },
        { a: 'TERMINAR', hace: [30] },
        { a: 'PR_CREAR', hace: [29, 20] },
        { a: 'PR_INFORMA', hace: [29], consulta: FUSIONADO },
      ],
    },
    {
      titulo: 'Arte base de los personajes',
      descripcion: 'Hojas de sprites del protagonista y de los enemigos comunes.',
      limite: -22,
      creada: [38, 1],
      pr: false,
      pasos: [
        { a: 'TOMAR', hace: [34], por: CAMILA },
        { a: 'TERMINAR', hace: [28] },
      ],
    },
    {
      titulo: 'Sistema de puntuación',
      descripcion: 'Contar monedas y enemigos derrotados y mostrarlos en pantalla.',
      limite: -20,
      creada: [37, 6],
      supervision: true,
      pasos: [
        { a: 'TOMAR', hace: [35, 20], por: MATEO },
        { a: 'ENVIAR', hace: [26] },
        { a: 'PR_CREAR', hace: [25, 18] },
        { a: 'PR_INFORMA', hace: [25, 2], consulta: FUSIONADO },
        { a: 'APROBAR', hace: [24] },
      ],
    },
    {
      titulo: 'Menú principal',
      descripcion: 'Pantalla de inicio con las opciones de jugar, continuar y salir.',
      limite: -18,
      creada: [37, 2],
      pasos: [
        { a: 'TOMAR', hace: [35], por: DEMO },
        { a: 'TERMINAR', hace: [20] },
        { a: 'PR_CREAR', hace: [19, 22] },
        { a: 'PR_CERRAR', hace: [19], motivo: 'Se creó desde la rama equivocada.' },
      ],
    },
    {
      titulo: 'Nivel 1: tutorial',
      descripcion: 'Primer nivel que enseña los controles con indicaciones en pantalla.',
      limite: -10,
      creada: [36, 4],
      supervision: true,
      pasos: [
        { a: 'TOMAR', hace: [35], por: LUCIA },
        { a: 'ENVIAR', hace: [16] },
        { a: 'DEVOLVER', hace: [15], nota: 'Falta explicar cómo se usa el doble salto.' },
        { a: 'ENVIAR', hace: [13] },
        { a: 'APROBAR', hace: [12] },
        { a: 'PR_CREAR', hace: [11, 20] },
      ],
    },
    {
      titulo: 'Efectos de sonido',
      descripcion: 'Sonidos de salto, monedas y daño con control de volumen.',
      limite: -6,
      creada: [36],
      pasos: [
        { a: 'TOMAR', hace: [29], por: DEMO },
        { a: 'TERMINAR', hace: [8] },
      ],
    },
    {
      eliminada: true,
      titulo: 'Tutorial en video',
      creada: [33, 1],
      borrada: [30, 6],
      motivo: 'Se reemplazó por el tutorial dentro del juego.',
    },
    {
      titulo: 'Guardado de partida',
      descripcion: 'Guardar y cargar el avance del jugador en el navegador.',
      limite: 6,
      creada: [24],
      pasos: [
        { a: 'TOMAR', hace: [22], por: MATEO },
        { a: 'TERMINAR', hace: [18] },
        { a: 'REABRIR', hace: [8], nota: 'Se pierde el progreso al cerrar el juego.' },
      ],
    },
    {
      titulo: 'Física de los proyectiles',
      descripcion: 'Trayectoria y colisión de las bolas de fuego del jefe.',
      limite: -2,
      creada: [21],
      pasos: [{ a: 'TOMAR', hace: [16, 4], por: ANDRES }],
    },
    {
      titulo: 'Enemigos básicos',
      descripcion: 'Enemigos que patrullan y persiguen al jugador al verlo.',
      limite: 5,
      creada: [20, 1],
      supervision: true,
      pasos: [
        { a: 'TOMAR', hace: [17], por: DEMO },
        { a: 'ENVIAR', hace: [6] },
        { a: 'DEVOLVER', hace: [2, 5], nota: 'Falta manejar la colisión con las paredes.' },
      ],
    },
    {
      titulo: 'Jefe del primer nivel',
      descripcion: 'Comportamiento y barra de vida del jefe de la montaña.',
      limite: 12,
      creada: [19],
      pasos: [{ a: 'TOMAR', hace: [3], por: DIEGO }],
    },
    {
      titulo: 'Animaciones de salto',
      descripcion: 'Animación de salto, caída y aterrizaje del protagonista.',
      limite: -1,
      creada: [18],
      pasos: [{ a: 'TOMAR', hace: [4], por: CAMILA }],
    },
    {
      titulo: 'Pantalla de opciones',
      descripcion: 'Ajustes de volumen, controles y calidad gráfica.',
      limite: 4,
      creada: [16],
      pasos: [
        { a: 'TOMAR', hace: [10], por: MATEO },
        { a: 'EDITAR', hace: [3], limite: 9 },
      ],
    },
    {
      titulo: 'Compatibilidad con gamepad',
      descripcion: 'Reconocer mandos y mostrar los botones correctos en pantalla.',
      limite: 14,
      creada: [15],
      pasos: [{ a: 'TOMAR', hace: [6], por: MATEO }],
    },
    {
      titulo: 'Cámara que sigue al jugador',
      descripcion: 'Cámara suave con límites por nivel y sacudida al recibir daño.',
      limite: 6,
      creada: [14],
      supervision: true,
      pasos: [
        { a: 'TOMAR', hace: [8], por: DIEGO },
        { a: 'ENVIAR', hace: [2, 6] },
        { a: 'PR_CREAR', hace: [2, 4] },
        { a: 'PR_INFORMA', hace: [1, 20], consulta: CON_CONFLICTOS },
      ],
    },
    {
      titulo: 'Sistema de logros',
      descripcion: 'Logros desbloqueables con aviso en pantalla y lista en el menú.',
      limite: 20,
      creada: [14],
      pasos: [{ a: 'TOMAR', hace: [2], por: MATEO }],
    },
    {
      titulo: 'Música del menú',
      descripcion: 'Tema musical en bucle para el menú principal.',
      limite: 8,
      creada: [13],
      supervision: true,
      pasos: [
        { a: 'TOMAR', hace: [9], por: DEMO },
        { a: 'ENVIAR', hace: [1, 3] },
      ],
    },
    {
      titulo: 'Selector de niveles',
      descripcion: 'Mapa con los niveles desbloqueados y el progreso de cada uno.',
      limite: 7,
      creada: [12],
      pasos: [{ a: 'TOMAR', hace: [3], por: LUCIA }],
    },
    {
      titulo: 'Pausa del juego',
      descripcion: 'Menú de pausa con reanudar, reiniciar nivel y volver al menú.',
      limite: 1,
      creada: [5],
    },
    {
      titulo: 'Trampas del escenario',
      descripcion: 'Pinchos y plataformas que se caen, con su animación.',
      limite: 0,
      creada: [5],
    },
    {
      titulo: 'Localización en español e inglés',
      descripcion: 'Textos del juego traducidos y selector de idioma.',
      limite: 14,
      creada: [4],
    },
  ],
  [ID_RSV]: [
    {
      titulo: 'Modelo de datos de reservas',
      descripcion: 'Diagrama de tablas para tours, alojamientos y reservas.',
      limite: -40,
      creada: [57, 2],
      pr: false,
      pasos: [
        { a: 'TOMAR', hace: [55], por: SOFIA },
        { a: 'TERMINAR', hace: [40] },
      ],
    },
    {
      titulo: 'API de disponibilidad',
      descripcion: 'Consulta de fechas y cupos libres por tour.',
      limite: -25,
      creada: [56],
      supervision: true,
      pasos: [
        { a: 'TOMAR', hace: [54], por: HERNAN },
        { a: 'ENVIAR', hace: [32] },
        { a: 'PR_CREAR', hace: [31, 20] },
        { a: 'PR_INFORMA', hace: [31], consulta: FUSIONADO },
        { a: 'APROBAR', hace: [30] },
      ],
    },
    {
      titulo: 'Pantalla de búsqueda de tours',
      descripcion: 'Listado con filtros por fecha, precio y ciudad.',
      limite: -20,
      creada: [55],
      pasos: [
        { a: 'TOMAR', hace: [53], por: LUCIA },
        { a: 'TERMINAR', hace: [22] },
        { a: 'PR_CREAR', hace: [21, 20] },
        { a: 'PR_INFORMA', hace: [21], consulta: FUSIONADO },
      ],
    },
    {
      titulo: 'Integración de pagos simulada',
      descripcion: 'Flujo de pago de prueba con tarjeta ficticia.',
      limite: -9,
      creada: [50],
      pasos: [
        { a: 'TOMAR', hace: [20], por: SOFIA },
        { a: 'TERMINAR', hace: [8, 5] },
        { a: 'PR_CREAR', hace: [8, 4] },
      ],
    },
    {
      titulo: 'Calendario de reservas',
      descripcion: 'Vista mensual con las reservas confirmadas y pendientes.',
      limite: -1,
      creada: [45],
      supervision: true,
      pasos: [
        { a: 'TOMAR', hace: [30], por: LUCIA },
        { a: 'ENVIAR', hace: [8, 2] },
      ],
    },
    {
      titulo: 'Confirmación por correo',
      descripcion: 'Plantilla y envío simulado del correo de confirmación.',
      limite: 5,
      creada: [40],
      supervision: true,
      pasos: [
        { a: 'TOMAR', hace: [25], por: HERNAN },
        { a: 'ENVIAR', hace: [9, 3] },
      ],
    },
    {
      titulo: 'Panel de administración',
      descripcion: 'Gestión de tours, precios y reservas para el personal.',
      limite: -3,
      creada: [38],
      pasos: [{ a: 'TOMAR', hace: [12], por: HERNAN }],
    },
    {
      titulo: 'Pruebas de carga',
      descripcion: 'Medir el tiempo de respuesta con cien usuarios a la vez.',
      limite: -2,
      creada: [30],
    },
    {
      titulo: 'Manual de usuario',
      descripcion: 'Guía breve para clientes y para el personal.',
      limite: 10,
      creada: [20],
    },
  ],
  [ID_INV]: [
    {
      titulo: 'Wireframes del inventario',
      descripcion: 'Bocetos de las pantallas de existencias, entradas y salidas.',
      limite: -25,
      creada: [44],
      pr: false,
      pasos: [
        { a: 'TOMAR', hace: [42], por: INES },
        { a: 'TERMINAR', hace: [30] },
      ],
    },
    {
      titulo: 'Lectura de códigos de barras',
      descripcion: 'Escanear productos con la cámara del teléfono.',
      limite: 20,
      creada: [40],
      pasos: [{ a: 'TOMAR', hace: [20], por: TOMAS }],
    },
    {
      titulo: 'Sincronización sin conexión',
      descripcion: 'Guardar movimientos sin red y enviarlos al volver la conexión.',
      limite: 15,
      creada: [38],
      supervision: true,
      pasos: [
        { a: 'TOMAR', hace: [28], por: BRUNO },
        { a: 'ENVIAR', hace: [13] },
      ],
    },
    {
      titulo: 'Reporte de existencias',
      descripcion: 'Resumen de productos con poco stock, en pantalla y en PDF.',
      limite: 30,
      creada: [30],
    },
  ],
  [ID_TIE]: [
    {
      titulo: 'Catálogo de productos',
      descripcion: 'Listado con fotos, precios y categorías de las artesanías.',
      limite: -60,
      creada: [94],
      pasos: [
        { a: 'TOMAR', hace: [92], por: RODRIGO },
        { a: 'TERMINAR', hace: [75] },
        { a: 'PR_CREAR', hace: [74, 20] },
        { a: 'PR_INFORMA', hace: [74], consulta: FUSIONADO },
      ],
    },
    {
      titulo: 'Página de inicio',
      descripcion: 'Portada con productos destacados y el relato del colectivo.',
      limite: -65,
      creada: [93],
      pasos: [
        { a: 'TOMAR', hace: [90], por: NICOLAS },
        { a: 'TERMINAR', hace: [78] },
        { a: 'PR_CREAR', hace: [77, 20] },
        { a: 'PR_INFORMA', hace: [77], consulta: FUSIONADO },
      ],
    },
    {
      titulo: 'Carrito de compras',
      descripcion: 'Agregar, quitar y cambiar cantidades antes de pagar.',
      limite: -45,
      creada: [90],
      supervision: true,
      pasos: [
        { a: 'TOMAR', hace: [88], por: PAOLA },
        { a: 'ENVIAR', hace: [72] },
        { a: 'PR_CREAR', hace: [71, 20] },
        { a: 'PR_INFORMA', hace: [71], consulta: FUSIONADO },
        { a: 'APROBAR', hace: [70] },
      ],
    },
    {
      titulo: 'Panel de pedidos',
      descripcion: 'Lista de pedidos con su estado para el colectivo.',
      limite: -50,
      creada: [85],
      pasos: [
        { a: 'TOMAR', hace: [82], por: CAMILA },
        { a: 'TERMINAR', hace: [66] },
        { a: 'PR_CREAR', hace: [65, 20] },
        { a: 'PR_INFORMA', hace: [65], consulta: FUSIONADO },
      ],
    },
    {
      titulo: 'Pasarela de pago de prueba',
      descripcion: 'Pago ficticio con confirmación de la compra.',
      limite: -35,
      creada: [80],
      pr: false,
      pasos: [
        { a: 'TOMAR', hace: [78], por: KEVIN },
        { a: 'TERMINAR', hace: [50] },
      ],
    },
    {
      titulo: 'Formulario de contacto',
      descripcion: 'Formulario con validación y aviso de recepción.',
      limite: -30,
      creada: [75],
      pasos: [
        { a: 'TOMAR', hace: [74], por: MARISOL },
        { a: 'TERMINAR', hace: [40] },
        { a: 'PR_CREAR', hace: [39, 20] },
        { a: 'PR_INFORMA', hace: [39], consulta: FUSIONADO },
      ],
    },
  ],
  [ID_DAT]: [
    {
      titulo: 'Definir los indicadores clave',
      descripcion: 'Acordar con gerencia qué cifras debe mostrar el panel.',
      limite: 10,
      creada: [4, 2],
    },
    {
      titulo: 'Conexión a la base de ventas',
      descripcion: 'Leer las ventas desde el archivo de ejemplo del cliente.',
      limite: 20,
      creada: [4, 1],
    },
    {
      titulo: 'Gráfico de ventas por mes',
      descripcion: 'Barras con el total mensual y comparación con el año anterior.',
      limite: 30,
      creada: [4],
    },
    {
      titulo: 'Filtros por sucursal',
      descripcion: 'Elegir una o varias sucursales y ver sus cifras.',
      limite: 40,
      creada: [3, 12],
    },
  ],
};

export interface DatosTareas {
  tareas: Tarea[];
  /** Mayor número de tarea de cada proyecto (el contador `ultimo_numero_tarea`). */
  ultimoNumero: Map<Id, number>;
}

export function crearTareas(
  reloj: Reloj,
  registro: Registro,
  proyectos: readonly Proyecto[],
  usuarios: readonly Usuario[],
): DatosTareas {
  const nombre = (id: Id) => usuarios.find((u) => u.id === id)?.nombre ?? id;
  const tareas: Tarea[] = [];
  const ultimoNumero = new Map<Id, number>();

  for (const proyecto of proyectos) {
    const guiones = GUIONES[proyecto.id] ?? [];
    const supervisor: AutorEvento = { tipo: 'USUARIO', id_usuario: proyecto.id_supervisor };
    let siguientePr = 1;

    guiones.forEach((guion, indice) => {
      const numero = indice + 1;
      const idLegible = formatearIdLegible(proyecto.codigo, numero);
      if (!idLegible.ok) throw new Error(idLegible.mensaje);
      const etiqueta = `${idLegible.id} · ${guion.titulo}`;
      const clave = `${proyecto.codigo}-${numero}`;
      const elemento = {
        tipo: 'TAREA',
        id: `tar-${proyecto.codigo.toLowerCase()}-${String(numero).padStart(3, '0')}`,
        etiqueta,
      } as const;
      const fallo = (mensaje: string): never => {
        throw new Error(`Guion ${clave}: ${mensaje}`);
      };

      const creada = reloj.hace(guion.creada);
      registro.evento({
        fecha: creada,
        autor: supervisor,
        tipo_accion: 'TAREA_CREADA',
        elemento,
        id_proyecto: proyecto.id,
        cambios: [{ campo: 'estado', valor_anterior: null, valor_nuevo: 'DISPONIBLE' }],
      });

      if ('eliminada' in guion) {
        registro.evento({
          fecha: reloj.hace(guion.borrada),
          autor: supervisor,
          tipo_accion: 'TAREA_ELIMINADA',
          elemento,
          id_proyecto: proyecto.id,
          cambios: [{ campo: 'estado', valor_anterior: 'DISPONIBLE', valor_nuevo: null }],
          nota: guion.motivo,
        });
        return;
      }

      const t: Tarea = {
        id: elemento.id,
        numero,
        titulo: guion.titulo,
        descripcion: guion.descripcion,
        fecha_limite: reloj.dia(guion.limite),
        id_proyecto: proyecto.id,
        id_practicante: null,
        estado: 'DISPONIBLE',
        requiere_supervision: guion.supervision ?? false,
        requiere_pr: guion.pr ?? true,
        estado_pr: null,
        rama_origen: null,
        rama_base: null,
        url_pull_request: null,
        fecha_termino: null,
      };

      let ultimo = Date.parse(creada);
      const referencia = { tipo: 'TAREA', id: t.id } as const;

      const registrar = (
        fecha: string,
        autor: AutorEvento,
        tipo_accion: TipoAccionHistorial,
        cambios: CambioRegistrado[],
        nota: string | null = null,
      ) =>
        registro.evento({
          fecha,
          autor,
          tipo_accion,
          elemento,
          id_proyecto: proyecto.id,
          cambios,
          nota,
        });

      const avisar = (
        fecha: string,
        autor: AutorEvento,
        destinatarios: Id[],
        tipo: TipoNotificacion,
        mensaje: string,
      ) => registro.notificar({ fecha, autor, destinatarios, tipo, mensaje, elemento: referencia });

      const cambioEstado = (anterior: string, nuevo: string): CambioRegistrado => ({
        campo: 'estado',
        valor_anterior: anterior,
        valor_nuevo: nuevo,
      });

      /** Aplica un evento de la tabla de §7.4 y devuelve el cambio de `estado_pr` si lo hubo. */
      const aplicarPR = (evento: EventoPR): CambioRegistrado[] => {
        const resultado = siguienteEstadoPR(t, evento);
        if (!resultado.aplica)
          return fallo(`el evento ${evento.tipo} no aplica (${resultado.codigo}).`);
        if (resultado.estado_pr === t.estado_pr) return [];
        const cambio: CambioRegistrado = {
          campo: 'estado_pr',
          valor_anterior: t.estado_pr,
          valor_nuevo: resultado.estado_pr,
        };
        t.estado_pr = resultado.estado_pr;
        return [cambio];
      };

      for (const paso of guion.pasos ?? []) {
        const fecha = reloj.hace(paso.hace);
        const ms = Date.parse(fecha);
        if (ms < ultimo) fallo(`el paso ${paso.a} (${fecha}) va antes del anterior.`);
        ultimo = ms;
        const responsable = t.id_practicante;
        const autorResponsable = (): AutorEvento =>
          responsable === null
            ? fallo(`el paso ${paso.a} necesita un responsable.`)
            : { tipo: 'USUARIO', id_usuario: responsable };

        switch (paso.a) {
          case 'TOMAR': {
            if (t.estado !== 'DISPONIBLE') fallo('solo se toma una tarea DISPONIBLE.');
            t.estado = 'EN_PROGRESO';
            t.id_practicante = paso.por;
            registrar(fecha, { tipo: 'USUARIO', id_usuario: paso.por }, 'TAREA_TOMADA', [
              cambioEstado('DISPONIBLE', 'EN_PROGRESO'),
              { campo: 'responsable', valor_anterior: null, valor_nuevo: nombre(paso.por) },
            ]);
            break;
          }
          case 'LIBERAR': {
            if (t.estado !== 'EN_PROGRESO' || responsable === null)
              fallo('solo se libera EN_PROGRESO.');
            const autor: AutorEvento = { tipo: 'USUARIO', id_usuario: paso.por ?? responsable! };
            if (paso.por !== undefined && paso.por !== responsable && paso.nota === undefined) {
              fallo('liberar la tarea de otra persona exige un motivo.');
            }
            t.estado = 'DISPONIBLE';
            t.id_practicante = null;
            registrar(
              fecha,
              autor,
              'TAREA_LIBERADA',
              [
                cambioEstado('EN_PROGRESO', 'DISPONIBLE'),
                { campo: 'responsable', valor_anterior: nombre(responsable!), valor_nuevo: null },
              ],
              paso.nota ?? null,
            );
            avisar(
              fecha,
              autor,
              [responsable!],
              'TAREA_LIBERADA',
              `Liberaron tu tarea «${t.titulo}» (${idLegible.id}).`,
            );
            break;
          }
          case 'ENVIAR': {
            if (t.estado !== 'EN_PROGRESO' || !t.requiere_supervision) {
              fallo('solo se envía una tarea EN_PROGRESO que requiere supervisión.');
            }
            t.estado = 'ESPERANDO_SUPERVISION';
            const cambios = [
              cambioEstado('EN_PROGRESO', 'ESPERANDO_SUPERVISION'),
              ...aplicarPR({ tipo: 'TAREA_ENVIADA_O_TERMINADA', github: paso.github }),
            ];
            const autor = autorResponsable();
            registrar(fecha, autor, 'TAREA_ENVIADA_A_SUPERVISION', cambios);
            avisar(
              fecha,
              autor,
              [proyecto.id_supervisor],
              'TAREA_ENVIADA_A_SUPERVISION',
              `${nombre(responsable!)} envió «${t.titulo}» (${idLegible.id}) a supervisión.`,
            );
            break;
          }
          case 'TERMINAR': {
            if (t.estado !== 'EN_PROGRESO' || t.requiere_supervision) {
              fallo('solo termina una tarea EN_PROGRESO sin supervisión.');
            }
            t.estado = 'TERMINADA';
            t.fecha_termino = fecha;
            const cambios = [
              cambioEstado('EN_PROGRESO', 'TERMINADA'),
              ...aplicarPR({ tipo: 'TAREA_ENVIADA_O_TERMINADA', github: paso.github }),
            ];
            registrar(fecha, autorResponsable(), 'TAREA_TERMINADA', cambios);
            break;
          }
          case 'APROBAR': {
            if (t.estado !== 'ESPERANDO_SUPERVISION')
              fallo('solo se aprueba ESPERANDO_SUPERVISION.');
            t.estado = 'TERMINADA';
            t.fecha_termino = fecha;
            registrar(fecha, supervisor, 'TAREA_APROBADA', [
              cambioEstado('ESPERANDO_SUPERVISION', 'TERMINADA'),
            ]);
            avisar(
              fecha,
              supervisor,
              [responsable!],
              'TAREA_APROBADA',
              `Aprobaron tu tarea «${t.titulo}» (${idLegible.id}).`,
            );
            break;
          }
          case 'DEVOLVER': {
            if (t.estado !== 'ESPERANDO_SUPERVISION')
              fallo('solo se devuelve ESPERANDO_SUPERVISION.');
            t.estado = 'EN_PROGRESO';
            registrar(
              fecha,
              supervisor,
              'TAREA_DEVUELTA',
              [cambioEstado('ESPERANDO_SUPERVISION', 'EN_PROGRESO')],
              paso.nota,
            );
            avisar(
              fecha,
              supervisor,
              [responsable!],
              'TAREA_DEVUELTA',
              `Devolvieron tu tarea «${t.titulo}» (${idLegible.id}) con observaciones.`,
            );
            break;
          }
          case 'REABRIR': {
            if (t.estado !== 'TERMINADA') fallo('solo se reabre una tarea TERMINADA.');
            t.estado = 'EN_PROGRESO';
            t.fecha_termino = null;
            registrar(
              fecha,
              supervisor,
              'TAREA_REABIERTA',
              [cambioEstado('TERMINADA', 'EN_PROGRESO')],
              paso.nota,
            );
            avisar(
              fecha,
              supervisor,
              [responsable!],
              'TAREA_REABIERTA',
              `Reabrieron tu tarea «${t.titulo}» (${idLegible.id}).`,
            );
            break;
          }
          case 'EDITAR': {
            if (t.estado !== 'DISPONIBLE' && t.estado !== 'EN_PROGRESO') {
              fallo('solo se edita DISPONIBLE o EN_PROGRESO.');
            }
            const anterior = t.fecha_limite;
            t.fecha_limite = reloj.dia(paso.limite);
            registrar(fecha, supervisor, 'TAREA_EDITADA', [
              { campo: 'fecha_limite', valor_anterior: anterior, valor_nuevo: t.fecha_limite },
            ]);
            if (t.estado === 'EN_PROGRESO' && responsable !== null) {
              avisar(
                fecha,
                supervisor,
                [responsable],
                'TAREA_EDITADA_EN_PROGRESO',
                `Editaron tu tarea «${t.titulo}» (${idLegible.id}) mientras estaba en progreso.`,
              );
            }
            break;
          }
          case 'PR_CREAR': {
            if (etiquetaPRVisible(t) === null) fallo('el PR solo se crea con la etiqueta visible.');
            const cambios = aplicarPR({ tipo: 'PR_CREADO', resultado: 'NUEVO' });
            t.url_pull_request = `${proyecto.repositorio_url}/pull/${siguientePr}`;
            siguientePr += 1;
            t.rama_origen = `feature/${proyecto.codigo.toLowerCase()}-${String(numero).padStart(3, '0')}`;
            t.rama_base = proyecto.rama_base;
            registrar(fecha, autorResponsable(), 'PULL_REQUEST_CREADO', [
              ...cambios,
              { campo: 'url_pull_request', valor_anterior: null, valor_nuevo: t.url_pull_request },
            ]);
            break;
          }
          case 'PR_INFORMA': {
            const cambios = aplicarPR({ tipo: 'GITHUB_INFORMA', consulta: paso.consulta });
            const sistema: AutorEvento = { tipo: 'SISTEMA' };
            registrar(fecha, sistema, 'PULL_REQUEST_ESTADO_ACTUALIZADO', cambios);
            if (t.estado_pr === 'CON_CONFLICTOS' && responsable !== null) {
              avisar(
                fecha,
                sistema,
                [responsable],
                'PULL_REQUEST_CON_CONFLICTOS',
                `El Pull Request de «${t.titulo}» (${idLegible.id}) tiene conflictos.`,
              );
            }
            break;
          }
          case 'PR_CERRAR': {
            if (etiquetaPRVisible(t) === null)
              fallo('el PR solo se cierra con la etiqueta visible.');
            const cambios = aplicarPR({ tipo: 'PR_CERRADO_DESDE_SISTEMA' });
            const autor: AutorEvento =
              paso.por === undefined
                ? autorResponsable()
                : { tipo: 'USUARIO', id_usuario: paso.por };
            registrar(fecha, autor, 'PULL_REQUEST_CERRADO_DESDE_EL_SISTEMA', cambios, paso.motivo);
            if (responsable !== null) {
              avisar(
                fecha,
                autor,
                [responsable],
                'PULL_REQUEST_CERRADO_POR_OTRA_PERSONA',
                `Cerraron el Pull Request de «${t.titulo}» (${idLegible.id}).`,
              );
            }
            break;
          }
        }
      }

      tareas.push(t);
      ultimoNumero.set(proyecto.id, Math.max(ultimoNumero.get(proyecto.id) ?? 0, numero));
    });
  }

  return { tareas, ultimoNumero };
}
