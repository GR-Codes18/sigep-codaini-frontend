import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router';
import { BarraBusqueda } from '@/compartido/BarraBusqueda';
import { Insignia } from '@/compartido/Insignia';
import { PestanasConContador } from '@/compartido/PestanasConContador';
import { TablaCompacta, type Columna } from '@/compartido/TablaCompacta';
import { Input } from '@/compartido/ui/input';
import {
  AREAS_EJEMPLO,
  ESPECIALIDADES_EJEMPLO,
  EVALUACIONES_EJEMPLO,
  POSTULANTES_EJEMPLO,
} from './datosEjemplo';
import {
  contarPorPestana,
  filtrarYOrdenar,
  unirFilas,
  type FilaPostulacion,
  type PestanaPostulacion,
} from './filtrosPostulaciones';

const SELECT = 'border-input bg-surface text-text h-8 rounded-md border px-2.5 text-sm';

const VACIO: Record<PestanaPostulacion, string> = {
  pendientes: 'No hay postulaciones pendientes',
  revision: 'No hay postulaciones que requieran revisión manual',
  aprobadas: 'Aún no hay postulaciones aprobadas',
  rechazadas: 'Aún no hay postulaciones rechazadas',
  todas: 'Aún no hay postulaciones',
};

export function ListadoPostulaciones() {
  const navegar = useNavigate();
  const [pestana, setPestana] = useState<PestanaPostulacion>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [idArea, setIdArea] = useState('');
  const [idEspecialidad, setIdEspecialidad] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const filas = unirFilas(POSTULANTES_EJEMPLO, EVALUACIONES_EJEMPLO);
  const conteo = contarPorPestana(filas);
  const visibles = filtrarYOrdenar(filas, {
    pestana,
    busqueda,
    idArea,
    idEspecialidad,
    desde,
    hasta,
  });
  const especialidades = ESPECIALIDADES_EJEMPLO.filter(
    (e) => !idArea || e.id_area_tecnica === idArea,
  );
  const nombre = (lista: { id: string; nombre: string }[], id: string) =>
    lista.find((x) => x.id === id)?.nombre ?? '—';

  const columnas: Columna<FilaPostulacion>[] = [
    {
      clave: 'postulante',
      encabezado: 'Postulante',
      celda: (f) => (
        <div>
          <p className="font-medium text-text">{f.postulante.nombre}</p>
          <p className="text-xs text-text-2">{f.postulante.correo}</p>
        </div>
      ),
    },
    {
      clave: 'area',
      encabezado: 'Área',
      celda: (f) => nombre(AREAS_EJEMPLO, f.postulante.id_area_tecnica),
    },
    {
      clave: 'esp',
      encabezado: 'Especialidad',
      celda: (f) => nombre(ESPECIALIDADES_EJEMPLO, f.postulante.id_especialidad),
    },
    {
      clave: 'fecha',
      encabezado: 'Fecha',
      className: 'whitespace-nowrap',
      celda: (f) => format(parseISO(f.postulante.fecha_postulacion), 'd MMM yyyy', { locale: es }),
    },
    {
      clave: 'puntaje',
      encabezado: 'Puntaje',
      celda: (f) =>
        f.evaluacion ? (
          <div className="flex items-center gap-2">
            <span className="w-7 tabular-nums">{f.evaluacion.puntaje_total}</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full bg-primary"
                style={{ width: `${f.evaluacion.puntaje_total}%` }}
              />
            </div>
          </div>
        ) : (
          '—'
        ),
    },
    {
      clave: 'revision',
      encabezado: 'Revisión',
      celda: (f) =>
        f.evaluacion?.requiere_revision_manual ? (
          <Insignia tipo="marca" estado="REVISION_MANUAL" />
        ) : null,
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      celda: (f) => <Insignia tipo="postulacion" estado={f.postulante.estado} />,
    },
  ];

  return (
    <section className="space-y-4">
      <h1 className="text-text">Postulaciones</h1>

      <PestanasConContador
        valor={pestana}
        onCambiar={(v) => setPestana(v as PestanaPostulacion)}
        pestanas={[
          { valor: 'pendientes', etiqueta: 'Pendientes', contador: conteo.pendientes },
          {
            valor: 'revision',
            etiqueta: 'Requieren revisión',
            contador: conteo.revision,
            resaltar: true,
          },
          { valor: 'aprobadas', etiqueta: 'Aprobadas', contador: conteo.aprobadas },
          { valor: 'rechazadas', etiqueta: 'Rechazadas', contador: conteo.rechazadas },
          { valor: 'todas', etiqueta: 'Todas', contador: conteo.todas },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <BarraBusqueda
          valor={busqueda}
          onCambiar={setBusqueda}
          placeholder="Buscar por nombre o correo"
        />
        <select
          aria-label="Filtrar por área técnica"
          className={SELECT}
          value={idArea}
          onChange={(e) => {
            setIdArea(e.target.value);
            setIdEspecialidad('');
          }}
        >
          <option value="">Todas las áreas</option>
          {AREAS_EJEMPLO.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por especialidad"
          className={SELECT}
          value={idEspecialidad}
          onChange={(e) => setIdEspecialidad(e.target.value)}
        >
          <option value="">Todas las especialidades</option>
          {especialidades.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
        <Input
          aria-label="Desde"
          type="date"
          className="w-auto"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
        />
        <Input
          aria-label="Hasta"
          type="date"
          className="w-auto"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
        />
      </div>

      <TablaCompacta
        columnas={columnas}
        filas={visibles}
        claveFila={(f) => f.postulante.id}
        onAbrir={(f) => navegar(`/administrador/postulaciones/${f.postulante.id}`)}
        vacio={{ titulo: VACIO[pestana] }}
      />
    </section>
  );
}
