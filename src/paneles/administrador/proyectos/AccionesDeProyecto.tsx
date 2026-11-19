import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import type { CicloDeVidaParaVista, DatosProyectoParaVista } from '@/app/adaptadores';
import { ModalConfirmacion } from '@/compartido/ModalConfirmacion';
import { Button } from '@/compartido/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/compartido/ui/dialog';
import type { Id } from '@/domain';
import {
  ENTORNO,
  finalizarProyecto,
  pausarProyecto,
  reactivarProyecto,
  reanudarProyecto,
  type AccionProyecto,
  type Entorno,
  type PersonaResumen,
  type Resultado,
} from '@/services';
import { rutaDeDetalleDeSupervisor } from '../supervisores/rutas';
import { CambiarSupervisorDelProyecto } from './CambiarSupervisorDelProyecto';
import { FormularioProyecto } from './FormularioProyecto';

interface Props {
  idActor: Id;
  proyecto: DatosProyectoParaVista;
  /** Lo que se puede hacer: lo deciden `puede()` y las reglas de `domain/` y llega con la consulta; aquí solo se ofrece. */
  acciones: readonly AccionProyecto[];
  /** Lo que explica finalizar y reactivar: lo calcula `domain/`, la pantalla no cuenta tareas. */
  cicloDeVida: CicloDeVidaParaVista;
  /** A quién se puede cambiar el supervisor: lo decide `domain/`. */
  supervisoresDestino: readonly PersonaResumen[];
  entorno?: Entorno;
}

type Abierta = 'EDITAR' | 'CAMBIAR_SUPERVISOR' | 'PAUSAR' | 'REANUDAR' | 'FINALIZAR' | 'REACTIVAR';

/** Los botones de ciclo de vida, en este orden; cada uno aparece solo si la consulta lo ofrece. */
const BOTONES: ReadonlyArray<{ accion: AccionProyecto & Abierta; etiqueta: string }> = [
  { accion: 'CAMBIAR_SUPERVISOR', etiqueta: 'Cambiar supervisor' },
  { accion: 'PAUSAR', etiqueta: 'Pausar proyecto' },
  { accion: 'REANUDAR', etiqueta: 'Reanudar proyecto' },
  { accion: 'FINALIZAR', etiqueta: 'Finalizar proyecto' },
  { accion: 'REACTIVAR', etiqueta: 'Reactivar proyecto' },
];

const plural = (n: number, singular: string, plurales: string) =>
  `${n} ${n === 1 ? singular : plurales}`;

/** Un error de servicio llega al modal como excepción: el modal se queda abierto y muestra el mensaje. */
function exigirExito<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new Error(resultado.mensaje);
  return resultado.valor;
}

/** Un aviso que bloquea una acción (§5.4): se explica y se cierra, sin nada que confirmar. */
function AvisoDeBloqueo({
  titulo,
  texto,
  onCerrar,
  children,
}: {
  titulo: string;
  texto: string;
  onCerrar: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{texto}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar}>
            Cerrar
          </Button>
          {children}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Las acciones del Administrador sobre un proyecto (§5.4): «Editar proyecto» (datos, rama base y reunión), cambiar de
 * supervisor y el ciclo de vida: pausar, reanudar, finalizar y reactivar, las cuatro con nota obligatoria. Qué botones
 * aparecen lo deciden `puede()` y las reglas de `domain/`, y llegan en `acciones`: la pantalla no los deduce del estado.
 * Finalizar con tareas «Esperando supervisión» y reactivar con el supervisor inactivo se ofrecen igual, y explican el
 * bloqueo con los números y la marca que traen la consulta.
 */
export function AccionesDeProyecto({
  idActor,
  proyecto,
  acciones,
  cicloDeVida,
  supervisoresDestino,
  entorno = ENTORNO,
}: Props) {
  const [abierta, setAbierta] = useState<Abierta | null>(null);
  const cerrar = () => setAbierta(null);
  const puedeEditar =
    acciones.includes('EDITAR_DATOS') ||
    acciones.includes('CAMBIAR_RAMA_BASE') ||
    acciones.includes('DEFINIR_REUNION');
  const botones = BOTONES.filter((b) => acciones.includes(b.accion));
  const entrada = { idActor, idProyecto: proyecto.id };

  const nota = { etiqueta: 'Nota', obligatorio: true } as const;

  return (
    <>
      {(puedeEditar || botones.length > 0) && (
        <div role="group" aria-label="Acciones" className="flex flex-wrap gap-2">
          {puedeEditar && (
            <Button type="button" variant="outline" onClick={() => setAbierta('EDITAR')}>
              Editar proyecto
            </Button>
          )}
          {botones.map((b) => (
            <Button
              key={b.accion}
              type="button"
              variant="outline"
              onClick={() => setAbierta(b.accion)}
            >
              {b.etiqueta}
            </Button>
          ))}
        </div>
      )}

      {abierta === 'EDITAR' && (
        <FormularioProyecto
          modo="editar"
          idActor={idActor}
          proyecto={proyecto}
          acciones={acciones}
          onCerrar={cerrar}
          entorno={entorno}
        />
      )}

      {abierta === 'CAMBIAR_SUPERVISOR' && (
        <CambiarSupervisorDelProyecto
          idActor={idActor}
          proyecto={{ id: proyecto.id, nombre: proyecto.nombre, supervisor: proyecto.supervisor }}
          destinos={supervisoresDestino}
          onCerrar={cerrar}
          entorno={entorno}
        />
      )}

      {abierta === 'PAUSAR' && (
        <ModalConfirmacion
          abierto
          onCerrar={cerrar}
          titulo="Pausar proyecto"
          descripcion={`Nadie podrá tomar tareas nuevas en ${proyecto.nombre}. Quien tiene tareas en progreso puede seguir trabajándolas y el supervisor puede seguir aprobando o devolviendo lo que ya estaba en revisión. Se avisa al equipo.`}
          etiquetaConfirmar="Pausar"
          pedirMotivo={nota}
          onConfirmar={async (texto) => {
            exigirExito(await pausarProyecto({ ...entrada, nota: texto }, entorno));
            toast.success('Proyecto pausado');
          }}
        />
      )}

      {abierta === 'REANUDAR' && (
        <ModalConfirmacion
          abierto
          onCerrar={cerrar}
          titulo="Reanudar proyecto"
          descripcion={`${proyecto.nombre} vuelve a «Activo» y se pueden tomar tareas de nuevo. Se avisa al equipo.`}
          etiquetaConfirmar="Reanudar"
          pedirMotivo={nota}
          onConfirmar={async (texto) => {
            exigirExito(await reanudarProyecto({ ...entrada, nota: texto }, entorno));
            toast.success('Proyecto reanudado');
          }}
        />
      )}

      {abierta === 'FINALIZAR' && cicloDeVida.tareasEsperandoSupervision > 0 && (
        <AvisoDeBloqueo
          titulo="No se puede finalizar"
          texto={`Tiene ${plural(cicloDeVida.tareasEsperandoSupervision, 'tarea esperando supervisión', 'tareas esperando supervisión')}: ${cicloDeVida.tareasEsperandoSupervision === 1 ? 'es una decisión pendiente' : 'son decisiones pendientes'} del supervisor. Primero deben aprobarse o devolverse.`}
          onCerrar={cerrar}
        />
      )}

      {abierta === 'FINALIZAR' && cicloDeVida.tareasEsperandoSupervision === 0 && (
        <ModalConfirmacion
          abierto
          onCerrar={cerrar}
          titulo="Finalizar proyecto"
          descripcion={`${
            cicloDeVida.tareasALiberar === 0
              ? 'No tiene tareas en progreso.'
              : `Tiene ${plural(cicloDeVida.tareasALiberar, 'tarea en progreso que será liberada', 'tareas en progreso que serán liberadas')}.`
          } Se guarda la fecha real de finalización y el tablero queda en solo lectura. Las asignaciones no se cierran: si reactivas el proyecto, el equipo recupera su acceso.`}
          etiquetaConfirmar="Finalizar proyecto"
          destructivo
          pedirMotivo={nota}
          onConfirmar={async (texto) => {
            exigirExito(await finalizarProyecto({ ...entrada, nota: texto }, entorno));
            toast.success('Proyecto finalizado');
          }}
        />
      )}

      {abierta === 'REACTIVAR' && cicloDeVida.supervisorInactivo && (
        <AvisoDeBloqueo
          titulo="No se puede reactivar"
          texto="El supervisor del proyecto está inactivo: reactívalo antes de reactivar el proyecto."
          onCerrar={cerrar}
        >
          <Button asChild>
            <Link to={rutaDeDetalleDeSupervisor(proyecto.supervisor.id)}>Ir al supervisor</Link>
          </Button>
        </AvisoDeBloqueo>
      )}

      {abierta === 'REACTIVAR' && !cicloDeVida.supervisorInactivo && (
        <ModalConfirmacion
          abierto
          onCerrar={cerrar}
          titulo="Reactivar proyecto"
          descripcion={`${proyecto.nombre} vuelve a «Activo» y el equipo recupera su acceso. No se avisa al equipo.`}
          etiquetaConfirmar="Reactivar"
          pedirMotivo={nota}
          onConfirmar={async (texto) => {
            exigirExito(await reactivarProyecto({ ...entrada, nota: texto }, entorno));
            toast.success('Proyecto reactivado');
          }}
        />
      )}
    </>
  );
}
