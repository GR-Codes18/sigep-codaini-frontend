/**
 * Áreas técnicas, especialidades y criterios de evaluación de ejemplo.
 *
 * PROVISIONAL (plan §12): el catálogo real de especialidades está por revisar con CODAINI;
 * estas son especialidades de ejemplo. Cada bloque (área y especialidad) tiene criterios activos
 * que suman 100. Hay un criterio desactivado para mostrar que «no se borra, se desactiva».
 */

import type {
  AreaTecnica,
  CriterioEvaluacion,
  Especialidad,
  Id,
  JuicioCriterio,
  TipoCriterio,
} from '@/domain';

export const AREAS: AreaTecnica[] = [
  { id: 'area-sw', nombre: 'Software', activo: true },
  { id: 'area-vj', nombre: 'Videojuegos', activo: true },
  { id: 'area-ux', nombre: 'Diseño UX/UI', activo: true },
  { id: 'area-da', nombre: 'Datos e IA', activo: true },
];

interface DefinicionEspecialidad {
  id: Id;
  id_area_tecnica: Id;
  nombre: string;
  /** Cuatro criterios con pesos 35, 25, 25 y 15; el primero es obligatorio. */
  criterios: readonly [string, string, string, string];
}

const ESPECIALIDADES_DEFINIDAS: readonly DefinicionEspecialidad[] = [
  {
    id: 'esp-sw-front',
    id_area_tecnica: 'area-sw',
    nombre: 'Frontend',
    criterios: ['React o Vue', 'TypeScript', 'HTML y CSS accesible', 'Pruebas de interfaz'],
  },
  {
    id: 'esp-sw-back',
    id_area_tecnica: 'area-sw',
    nombre: 'Backend',
    criterios: [
      'API REST con Node.js o similar',
      'Bases de datos relacionales',
      'Autenticación y seguridad básica',
      'Pruebas automáticas',
    ],
  },
  {
    id: 'esp-sw-movil',
    id_area_tecnica: 'area-sw',
    nombre: 'Móvil',
    criterios: [
      'Flutter o React Native',
      'Consumo de APIs',
      'Diseño adaptable a pantallas',
      'Publicación en tiendas',
    ],
  },
  {
    id: 'esp-vj-prog',
    id_area_tecnica: 'area-vj',
    nombre: 'Programación de juegos',
    criterios: [
      'Unity o Godot',
      'C# o GDScript',
      'Física y colisiones 2D',
      'Control de versiones con Git',
    ],
  },
  {
    id: 'esp-vj-dis',
    id_area_tecnica: 'area-vj',
    nombre: 'Diseño de juegos',
    criterios: [
      'Diseño de niveles',
      'Documento de diseño de juego',
      'Balance y dificultad',
      'Prototipado en papel o digital',
    ],
  },
  {
    id: 'esp-ux-inv',
    id_area_tecnica: 'area-ux',
    nombre: 'Investigación UX',
    criterios: [
      'Entrevistas y encuestas a usuarios',
      'Análisis de datos cualitativos',
      'Mapas de empatía y recorridos',
      'Pruebas de usabilidad',
    ],
  },
  {
    id: 'esp-ux-int',
    id_area_tecnica: 'area-ux',
    nombre: 'Diseño de interfaces',
    criterios: ['Figma', 'Sistemas de diseño', 'Accesibilidad (WCAG)', 'Prototipos interactivos'],
  },
  {
    id: 'esp-da-ana',
    id_area_tecnica: 'area-da',
    nombre: 'Análisis de datos',
    criterios: ['SQL', 'Python para análisis', 'Visualización de datos', 'Estadística básica'],
  },
  {
    id: 'esp-da-ml',
    id_area_tecnica: 'area-da',
    nombre: 'Machine Learning',
    criterios: [
      'Python y scikit-learn',
      'Preparación de datos',
      'Evaluación de modelos',
      'Cuadernos reproducibles',
    ],
  },
];

export const ESPECIALIDADES: Especialidad[] = ESPECIALIDADES_DEFINIDAS.map(
  ({ id, id_area_tecnica, nombre }) => ({ id, id_area_tecnica, nombre, activo: true }),
);

/** Identificador corto del área para armar los IDs de los criterios (`area-sw` → `sw`). */
const corto = (id: Id) => id.replace(/^(area|esp)-/, '');

interface PlantillaCriterio {
  nombre: string;
  tipo: TipoCriterio;
  peso: number;
  obligatorio: boolean;
}

const CRITERIOS_DE_AREA: readonly PlantillaCriterio[] = [
  {
    nombre: 'Nivel académico (técnico o universitario en curso)',
    tipo: 'ACADEMICO',
    peso: 30,
    obligatorio: true,
  },
  {
    nombre: 'Disponibilidad mínima de 20 horas semanales',
    tipo: 'DISPONIBILIDAD',
    peso: 30,
    obligatorio: true,
  },
  { nombre: 'Portafolio o proyectos previos', tipo: 'PALABRA_CLAVE', peso: 25, obligatorio: false },
  { nombre: 'Inglés técnico de lectura', tipo: 'PALABRA_CLAVE', peso: 15, obligatorio: false },
];

const PESOS_ESPECIALIDAD = [35, 25, 25, 15] as const;

export function crearCriterios(): CriterioEvaluacion[] {
  const criterios: CriterioEvaluacion[] = [];
  for (const area of AREAS) {
    CRITERIOS_DE_AREA.forEach((plantilla, i) => {
      criterios.push({
        id: `cri-${corto(area.id)}-a${i + 1}`,
        id_area_tecnica: area.id,
        id_especialidad: null,
        nombre: plantilla.nombre,
        tipo: plantilla.tipo,
        peso: plantilla.peso,
        obligatorio: plantilla.obligatorio,
        activo: true,
      });
    });
  }
  for (const especialidad of ESPECIALIDADES_DEFINIDAS) {
    especialidad.criterios.forEach((nombre, i) => {
      criterios.push({
        id: `cri-${corto(especialidad.id)}-${i + 1}`,
        id_area_tecnica: especialidad.id_area_tecnica,
        id_especialidad: especialidad.id,
        nombre,
        tipo: i < 3 ? 'TECNOLOGIA' : 'PALABRA_CLAVE',
        peso: PESOS_ESPECIALIDAD[i],
        obligatorio: i === 0,
        activo: true,
      });
    });
  }
  // Criterio retirado: no cuenta en las evaluaciones nuevas, pero no se borra.
  criterios.push({
    id: 'cri-sw-a5',
    id_area_tecnica: 'area-sw',
    id_especialidad: null,
    nombre: 'Carta de recomendación',
    tipo: 'PALABRA_CLAVE',
    peso: 10,
    obligatorio: false,
    activo: false,
  });
  return criterios;
}

/** Área de una especialidad (`esp-sw-front` → `area-sw`). */
export function areaDeEspecialidad(idEspecialidad: Id): Id {
  const especialidad = ESPECIALIDADES.find((e) => e.id === idEspecialidad);
  if (especialidad === undefined) throw new Error(`Especialidad desconocida: ${idEspecialidad}`);
  return especialidad.id_area_tecnica;
}

/**
 * Juicios del «modelo simulado»: una letra por criterio activo de cada bloque, en orden
 * (`S` = cumple, `N` = no cumple). Ejemplo: `juicios(c, 'area-sw', 'esp-sw-front', 'SSNS', 'SSSN')`.
 */
export function juicios(
  criterios: readonly CriterioEvaluacion[],
  idArea: Id,
  idEspecialidad: Id,
  bitsArea: string,
  bitsEspecialidad: string,
): JuicioCriterio[] {
  const delBloque = (bits: string, filtro: (c: CriterioEvaluacion) => boolean) => {
    const activos = criterios.filter((c) => c.activo && filtro(c));
    if (activos.length !== bits.length) {
      throw new Error(`Se esperaban ${activos.length} juicios y llegaron «${bits}».`);
    }
    return activos.map((c, i) => ({
      id_criterio: c.id,
      cumplido: bits[i] === 'S',
      observacion:
        bits[i] === 'S'
          ? 'Se evidencia en el CV del postulante.'
          : 'No se encontró evidencia en el CV.',
    }));
  };
  return [
    ...delBloque(bitsArea, (c) => c.id_area_tecnica === idArea && c.id_especialidad === null),
    ...delBloque(bitsEspecialidad, (c) => c.id_especialidad === idEspecialidad),
  ];
}
