import { useCallback, useMemo, useState } from 'react';
import { aCatalogo } from '@/app/adaptadores';
import { useConsulta } from '@/app/useConsulta';
import { useSesionActiva } from '@/auth/useSesionActiva';
import { CabeceraDeDetalle } from '@/compartido/CabeceraDeDetalle';
import { EstadoVacio } from '@/compartido/EstadoVacio';
import { Button } from '@/compartido/ui/button';
import { Skeleton } from '@/compartido/ui/skeleton';
import {
  cambiarActivoAreaTecnica,
  cambiarActivoEspecialidad,
  crearAreaTecnica,
  crearEspecialidad,
  editarAreaTecnica,
  editarEspecialidad,
  ENTORNO,
  guardarCriteriosDeBloque,
  listarCatalogoEvaluacion,
  type Entorno,
} from '@/services';
import { FormularioNombre } from './FormularioNombre';
import { RUTA_POSTULACIONES } from './rutas';
import { SeccionDeArea, type AccionesDelCatalogo } from './SeccionDeArea';

/**
 * Criterios de evaluación, áreas técnicas y especialidades (§5.1, sub-sección de Postulaciones). Lee con
 * `listarCatalogoEvaluacion` y escribe con los servicios del catálogo; las reglas (pesos enteros que suman 100, nombres
 * únicos, activar solo con el bloque válido, nada se borra) son de `domain/` y de los servicios: la pantalla las muestra.
 * Cambiar los criterios no recalcula las evaluaciones anteriores. `entorno` solo lo cambian las pruebas.
 */
export function PaginaCriterios({ entorno = ENTORNO }: { entorno?: Entorno } = {}) {
  const { sesion } = useSesionActiva();
  const idUsuario = sesion?.id ?? null;
  const [creandoArea, setCreandoArea] = useState(false);

  const cargar = useCallback(
    () => listarCatalogoEvaluacion({ idActor: idUsuario ?? '' }, entorno),
    [entorno, idUsuario],
  );
  const consulta = useConsulta(idUsuario === null ? null : cargar);
  const catalogo = useMemo(
    () => (consulta.valor === null ? null : aCatalogo(consulta.valor)),
    [consulta.valor],
  );

  const acciones = useMemo<AccionesDelCatalogo>(() => {
    const idActor = idUsuario ?? '';
    return {
      editarArea: (idAreaTecnica, nombre) =>
        editarAreaTecnica({ idActor, idAreaTecnica, nombre }, entorno),
      cambiarActivoArea: (idAreaTecnica, activo) =>
        cambiarActivoAreaTecnica({ idActor, idAreaTecnica, activo }, entorno),
      crearEspecialidad: (idAreaTecnica, nombre) =>
        crearEspecialidad({ idActor, idAreaTecnica, nombre }, entorno),
      editarEspecialidad: (idEspecialidad, nombre) =>
        editarEspecialidad({ idActor, idEspecialidad, nombre }, entorno),
      cambiarActivoEspecialidad: (idEspecialidad, activo) =>
        cambiarActivoEspecialidad({ idActor, idEspecialidad, activo }, entorno),
      guardarBloque: (idAreaTecnica, idEspecialidad, criterios) =>
        guardarCriteriosDeBloque({ idActor, idAreaTecnica, idEspecialidad, criterios }, entorno),
    };
  }, [entorno, idUsuario]);

  if (idUsuario === null) return null;

  function contenido() {
    if (consulta.error) {
      return (
        <p role="alert" className="text-sm text-danger-text">
          {consulta.error}
        </p>
      );
    }
    if (catalogo === null) {
      return (
        <div className="space-y-2" role="status" aria-label="Cargando los criterios">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }
    if (catalogo.areas.length === 0) {
      return (
        <EstadoVacio
          titulo="Aún no hay áreas técnicas"
          descripcion="Crea la primera área, define sus criterios y actívala para poder evaluar postulaciones."
        />
      );
    }
    return (
      <div className="space-y-3">
        {catalogo.areas.map((area) => (
          <SeccionDeArea key={area.id} area={area} acciones={acciones} />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <CabeceraDeDetalle
        volver={{ a: RUTA_POSTULACIONES, etiqueta: 'Volver a postulaciones' }}
        titulo="Criterios de evaluación"
        metadatos="Cada área y cada especialidad se evalúa con sus propios criterios, y los pesos de los criterios activos de cada bloque deben sumar 100. Los criterios no se borran: se desactivan. Cambiarlos no recalcula las evaluaciones anteriores."
        acciones={
          creandoArea ? undefined : (
            <Button type="button" variant="outline" onClick={() => setCreandoArea(true)}>
              Nueva área técnica
            </Button>
          )
        }
      />

      {creandoArea && (
        <FormularioNombre
          etiqueta="Nombre de la nueva área técnica"
          etiquetaGuardar="Crear área"
          onGuardar={(nombre) => crearAreaTecnica({ idActor: idUsuario, nombre }, entorno)}
          onCancelar={() => setCreandoArea(false)}
        />
      )}

      {contenido()}
    </section>
  );
}
