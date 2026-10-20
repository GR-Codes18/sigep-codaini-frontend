**PROPUESTA DE PROYECTO — VERSIÓN 6**

**Diseño de un Sistema Web para la Centralización de la Gestión de Practicantes y Proyectos en la empresa CODAINI**

*Con módulos de Inteligencia Artificial e integración con GitHub*

Proyecto de tesis — Ingeniería de Software con IA — SENATI

*Esta versión completa la definición de los tres paneles (Administrador, Supervisor y Practicante) y la matriz de permisos, y es la fuente de las reglas de negocio para el desarrollo del prototipo. Los cambios respecto a la versión 5 se resumen en el Anexo A.*

## 1. Contexto y problemática

CODAINI es una empresa que desarrolla software y videojuegos, y que además forma practicantes mediante proyectos reales. Actualmente, la gestión de practicantes, proyectos y su seguimiento se realiza de forma manual en una hoja de cálculo (Excel), y el formulario de postulación del sitio web no funciona correctamente, por lo que la comunicación con nuevos postulantes depende de canales informales como WhatsApp. Esta situación genera pérdida de trazabilidad, sobrecarga administrativa y dificulta la toma de decisiones sobre la asignación y evaluación de practicantes (ver diagnóstico detallado, diagrama de flujo del proceso actual y diagrama de Ishikawa en las secciones correspondientes del documento de tesis).

## 2. Objetivos

### 2.1 Objetivo general

Diseñar un sistema web de gestión de practicantes y proyectos para la empresa CODAINI, mediante un prototipo navegable y un modelo de base de datos, orientado a centralizar el registro de usuarios y el seguimiento de actividades, con el fin de optimizar el control actualmente realizado mediante hojas de cálculo.

### 2.2 Objetivos específicos

- Diagnosticar el proceso actual de registro y seguimiento de practicantes y proyectos en la empresa CODAINI, identificando las deficiencias, demoras y requerimientos generados por el uso de hojas de cálculo.

- Diseñar la arquitectura de información, el modelo de base de datos del sistema (entidades, atributos y relaciones) y las interfaces de usuario, abarcando los módulos de postulación, practicantes, supervisores, proyectos y seguimiento de tareas mediante un flujo de estados.

- Elaborar el prototipo navegable de las interfaces del sistema, desarrollado como aplicación web de interfaz (frontend) con datos simulados, integrando los perfiles de acceso para administradores, supervisores y practicantes, e incluyendo un panel propio para el practicante con seguimiento de tareas, historial y notificaciones.

- Validar el prototipo y el modelo de datos mediante su revisión con la empresa CODAINI, verificando el cumplimiento de los requerimientos identificados en el diagnóstico.

## 3. Alcance del proyecto

El sistema será desarrollado como prototipo de diseño (no como sistema en producción), debido al tiempo disponible para el proyecto. El entregable es un prototipo navegable, desarrollado en React con TypeScript como aplicación web de interfaz (frontend) con datos simulados, junto con el modelo de base de datos correspondiente, presentado como diseño (diagrama entidad-relación). El usuario puede navegar, hacer clic y probar los flujos principales (por ejemplo, aprobar una postulación, o tomar una tarea y cambiar su estado), pero los datos son de ejemplo y se guardan únicamente en el navegador. Como requisito de la línea de Ingeniería de Software con IA, el proyecto incorpora tres componentes de inteligencia artificial y automatización, descritos en la sección 10.

**Arquitectura propuesta (no construida en esta fase):** sistema cliente-servidor con React y TypeScript (frontend), Node.js con Express (backend) y PostgreSQL (base de datos). En esta fase solo se construye el frontend; el backend y la base de datos quedan como diseño.

**Supuesto del proyecto:** el formulario de postulación del sitio web de CODAINI estará funcional y conectado al sistema, y le pedirá al postulante su área técnica y su especialidad (por ejemplo, Frontend o Backend). Su arreglo y conexión están a cargo de la empresa y no forman parte de este proyecto.

**Estado de la definición:** esta versión define los tres paneles del sistema: el del Administrador (sección 5), el del Supervisor (sección 9.1) y el del Practicante (sección 9.2), junto con los componentes compartidos por todos (tablero de tareas, integración con GitHub, notificaciones y perfil). La matriz de permisos de la sección 4 está completa para los tres roles.

Incluido en el alcance

- Módulo de postulaciones, con ranking automático de CVs mediante IA (simulado en el prototipo).

- Tres paneles diferenciados: Administrador, Supervisor y Practicante.

- Gestión de practicantes, supervisores, proyectos, asignaciones y tareas, con un tablero Kanban de seguimiento por estados.

- Módulo de Reportes con insights automáticos de rendimiento, basados en reglas.

- Historial de actividad (registro de auditoría) y notificaciones dentro del sistema.

- Parámetros del sistema configurables por el Administrador.

- Perfiles de acceso diferenciados (simulados en el prototipo): Administrador, Supervisor y Practicante.

- Diseño (sin implementación funcional) de la integración con la API de GitHub para la creación de Pull Requests desde el sistema.

- Tema visual claro y oscuro.

Fuera de alcance (versión inicial — mejoras futuras)

- Desarrollo del sistema en producción: backend, base de datos real, persistencia de datos y autenticación real.

- Implementación funcional real de la integración con GitHub (queda documentada y justificada como diseño).

- Integración real del ranking de CVs con un modelo de lenguaje (en el prototipo se simula).

- Rediseño del formulario público de postulación del sitio web de CODAINI (su arreglo y conexión al sistema están a cargo de la empresa).

- Notificaciones por correo electrónico o WhatsApp, verificación de correo y exportación de reportes.

- Solicitud de reuniones por parte del practicante; cálculo de nota formal; portafolio enriquecido; chat por tarea; portal de clientes externos.

- Solicitudes del Supervisor al Administrador desde el sistema (más practicantes, aviso de proyecto terminado).

## 4. Actores del sistema

| **Actor**                        | **Descripción**                                                                                                                                                                                  | **Principales acciones**                                                                                                                                                                                                             |
|----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Postulante**                   | Persona externa que aplica a una práctica mediante el formulario del sitio web de CODAINI (asumido como funcional y conectado al sistema). No tiene cuenta en el sistema.                        | Su postulación se registra automáticamente en el sistema y es evaluada por IA antes de la revisión del Administrador.                                                                                                                |
| **Administrador (Admin / RRHH)** | Encargado de revisar postulaciones y administrar el sistema en general. Es quien crea y gestiona las cuentas de supervisores y practicantes, y quien controla el ciclo de vida de los proyectos. | Decidir postulaciones y definir sus criterios de evaluación; gestionar practicantes, supervisores y proyectos; intervenir en tareas (liberar, reabrir, eliminar); consultar reportes e historial; ajustar la configuración.          |
| **Supervisor**                   | Responsable de uno o más proyectos y de los practicantes asignados a ellos. Solo ve y actúa sobre los proyectos que tiene a cargo.                                                               | Crear tareas y decidir cuáles requieren su supervisión; aprobar o devolver tareas; fijar la reunión semanal, los enlaces útiles y la rama base de sus proyectos; consultar los practicantes a cargo y los reportes de sus proyectos. |
| **Practicante**                  | Usuario con cuenta propia, asignado a uno o más proyectos (en la práctica, uno o dos).                                                                                                           | Tomar tareas disponibles, trabajarlas y enviarlas a revisión; crear el Pull Request de su trabajo; actualizar su perfil y disponibilidad; ver su equipo, su historial y sus notificaciones.                                          |

Reglas de acceso

- **Un usuario, un rol.** Cada cuenta es de Administrador, de Supervisor o de Practicante, nunca de más de uno.

- **Cómo nace cada cuenta.** La cuenta del practicante se crea al aprobar su postulación; la del supervisor la crea el Administrador. En ambos casos el sistema genera una contraseña temporal que el Administrador entrega por fuera del sistema (WhatsApp o Discord), porque no hay envío de correos.

- **Cada persona edita sus propios datos personales.** El Administrador no modifica datos personales de otras personas. La única excepción es el nombre y el correo institucional del supervisor, que son una credencial entregada por la empresa y solo los cambia el Administrador.

- **El alcance depende del proyecto.** El Supervisor actúa solo en los proyectos que tiene a cargo, y el Practicante solo en aquellos a los que está asignado.

- **Las acciones sobre una tarea se ejecutan desde su detalle,** nunca desde botones en las tarjetas del tablero o en las filas de los listados (ver sección 6.7).

Matriz de permisos

La matriz está completa para los tres roles. Cada regla se explica en las secciones 5 a 9. En todas las filas, el alcance de cada rol es el propio: el Supervisor solo en sus proyectos y el Practicante solo en aquellos a los que está asignado. Las acciones de la primera tabla se ejecutan siempre desde el detalle de la tarea.

**Tareas y Pull Requests**

| **Acción**                                                                       | **Administrador**     | **Supervisor**        | **Practicante**                          |
|----------------------------------------------------------------------------------|-----------------------|-----------------------|------------------------------------------|
| **Crear tareas**                                                                 | Sí                    | Sí                    | No                                       |
| **Editar título, descripción y fecha límite** (solo en Disponible y En progreso) | Sí                    | Sí                    | No                                       |
| **Tomar una tarea disponible**                                                   | No                    | No                    | Sí (de su proyecto; no si está en pausa) |
| **Liberar una tarea en progreso**                                                | Sí (con motivo)       | Sí (con motivo)       | Sí (la propia)                           |
| **Enviar a supervisión o marcar como terminada**                                 | No                    | No                    | Sí (el responsable)                      |
| **Aprobar o devolver una tarea**                                                 | No                    | Sí                    | No                                       |
| **Reabrir una tarea terminada**                                                  | Sí (con nota)         | Sí (con nota)         | No                                       |
| **Eliminar una tarea disponible sin Pull Request**                               | Sí (con motivo)       | Sí (con motivo)       | No                                       |
| **Cambiar “Requiere supervisión”**                                               | Sí                    | Sí                    | No                                       |
| **Activar o desactivar “Requiere PR”**                                           | Sí (si aún no hay PR) | Sí (si aún no hay PR) | Solo desactivar, con motivo              |
| **Crear un Pull Request**                                                        | No                    | No                    | Sí (el responsable)                      |
| **Cerrar un Pull Request**                                                       | Sí (con motivo)       | Sí (con motivo)       | Sí (el responsable, con motivo)          |
| **Ver el detalle de tareas ajenas**                                              | Sí                    | Sí                    | Solo lectura                             |

**Proyectos y equipo**

| **Acción**                                                                     | **Administrador** | **Supervisor**                                         | **Practicante**                                           |
|--------------------------------------------------------------------------------|-------------------|--------------------------------------------------------|-----------------------------------------------------------|
| **Crear proyectos y editar nombre, código, descripción, fechas y repositorio** | Sí                | No                                                     | No                                                        |
| **Cambiar la rama base**                                                       | Sí                | Sí                                                     | No                                                        |
| **Definir la reunión semanal**                                                 | Sí                | Sí                                                     | No                                                        |
| **Gestionar enlaces útiles**                                                   | Sí                | Sí                                                     | No                                                        |
| **Cambiar de supervisor**                                                      | Sí                | No                                                     | No                                                        |
| **Asignar o quitar practicantes**                                              | Sí                | No                                                     | No                                                        |
| **Pausar, reanudar, finalizar o reactivar un proyecto**                        | Sí                | No                                                     | No                                                        |
| **Ver el proyecto y su tablero**                                               | Todos             | Los suyos                                              | Los asignados y vigentes                                  |
| **Ver los proyectos anteriores**                                               | Sí                | Sí (los que tiene a cargo)                             | Solo un resumen mínimo                                    |
| **Ver a los practicantes**                                                     | Todos             | Los de sus proyectos (sin área técnica ni postulación) | Compañeros: nombre, especialidad, carga, Discord y GitHub |

**Personas y cuentas**

| **Acción**                                                    | **Administrador**       | **Supervisor**           | **Practicante**                                          |
|---------------------------------------------------------------|-------------------------|--------------------------|----------------------------------------------------------|
| **Decidir postulaciones y gestionar criterios de evaluación** | Sí                      | No                       | No                                                       |
| **Crear supervisores y restablecer contraseñas**              | Sí                      | No                       | No                                                       |
| **Finalizar o reactivar una práctica**                        | Sí                      | No                       | No                                                       |
| **Editar los datos de la práctica** (especialidad y fechas)   | Sí                      | No                       | No                                                       |
| **Editar los propios datos personales**                       | Nombre, correo, celular | Celular, Discord, GitHub | Nombre, correo, celular, Discord, GitHub, disponibilidad |

**Seguimiento y sistema**

| **Acción**                                | **Administrador**                           | **Supervisor**                       | **Practicante**             |
|-------------------------------------------|---------------------------------------------|--------------------------------------|-----------------------------|
| **Ver Reportes**                          | Todo                                        | Solo sus proyectos                   | No                          |
| **Marcar un insight como revisado**       | Sí                                          | Sí (independiente del Administrador) | No                          |
| **Notificar desde un insight**            | Practicante inactivo y supervisión demorada | Solo practicante inactivo            | No                          |
| **Historial de actividad**                | Vista global                                | Líneas de tiempo de sus proyectos    | Líneas de tiempo de lo suyo |
| **Configuración y datos de demostración** | Sí                                          | No                                   | No                          |

## 5. Panel del Administrador

El panel del Administrador es el más amplio del sistema, porque concentra la gestión de personas, proyectos y configuración. Se organiza en nueve módulos, agrupados en el menú lateral como muestra la siguiente tabla. Cada módulo se describe más abajo con lo que muestra, lo que permite hacer y las reglas que aplica.

| **Grupo del menú** | **Módulo**             | **Para qué sirve**                                                                                |
|--------------------|------------------------|---------------------------------------------------------------------------------------------------|
| (sin grupo)        | Dashboard              | Resume el estado actual del sistema y muestra las alertas más urgentes.                           |
| Gestión            | Postulaciones          | Evaluar y decidir las postulaciones con apoyo de la IA, y configurar los criterios de evaluación. |
| Gestión            | Practicantes           | Seguir a los practicantes, asignarlos a proyectos y finalizar su práctica.                        |
| Gestión            | Supervisores           | Crear y administrar las cuentas de los supervisores.                                              |
| Proyectos          | Proyectos              | Crear proyectos, formar sus equipos y ver su tablero de tareas.                                   |
| Proyectos          | Tareas                 | Ver y filtrar las tareas de todos los proyectos en un solo listado.                               |
| Análisis           | Reportes               | Mostrar insights automáticos e indicadores de avance.                                             |
| Análisis           | Historial de actividad | Consultar el registro permanente de todo lo que ocurre en el sistema.                             |
| Sistema            | Configuración          | Ajustar los parámetros del sistema y la conexión con GitHub.                                      |

*En la barra superior, para los tres roles, se encuentran el botón de tema claro/oscuro, la campana de notificaciones y el menú del usuario (Mi perfil y Cerrar sesión).*

Principios que aplican a todo el panel

- **Nada se borra.** Personas, proyectos y tareas con actividad se desactivan o finalizan, pero no se eliminan, porque el historial es lo que permite la trazabilidad. La única excepción son las tareas creadas por error que nunca se tomaron (ver 5.5).

- **Las acciones que afectan a otras personas piden un motivo o una nota,** y quedan registradas en el Historial de actividad.

- **Los cambios de configuración valen hacia adelante.** No alteran decisiones ya tomadas, como evaluaciones de postulaciones anteriores.

- **La IA sugiere y el Administrador decide.** Ningún resultado automático aprueba o rechaza a una persona.

### 5.1 Módulo de Postulaciones

Es la puerta de entrada de los practicantes y reemplaza el manejo informal por WhatsApp. Toda postulación llega desde el formulario del sitio web de CODAINI (no existe registro manual); el sistema la evalúa automáticamente con IA y el Administrador decide. Solo el Administrador usa este módulo.

Qué muestra

- **Listado** con pestañas y contador: Pendientes, Requieren revisión, Aprobadas, Rechazadas y Todas. Abre en “Pendientes”.

- Columnas: postulante (nombre y correo), área técnica, especialidad, fecha, puntaje de la IA (número y barra), marca de revisión manual, estado y acceso al detalle. Se ordena por puntaje de mayor a menor por defecto (es el ranking) y puede ordenarse por fecha.

- Filtros por área técnica, especialidad y rango de fechas, y búsqueda por nombre o correo.

- **Detalle de la postulación:** datos del postulante, evaluación de la IA, vista previa del CV con descarga, y las acciones de decisión.

- **Evaluación de la IA:** puntaje final, una justificación breve y el desglose criterio por criterio (peso, si cumple, puntaje obtenido y observación), separado en dos bloques: criterios del área y criterios de la especialidad. Una nota fija recuerda que el puntaje es una ayuda y que la decisión es del Administrador.

Cómo se calcula el puntaje

Cada postulación se evalúa en dos bloques. El primero reúne los criterios generales del área técnica (por ejemplo, nivel académico y disponibilidad) y el segundo los criterios propios de la especialidad elegida (por ejemplo, las tecnologías de Backend). Cada bloque suma 100 puntos por separado, y la nota final los combina con una proporción ajustable, inicialmente 40 % para el área y 60 % para la especialidad. Por ejemplo, con 80 puntos en el área y 90 en la especialidad, la nota final es 0,4 × 80 + 0,6 × 90 = 86. Separar los bloques evita que un postulante de Frontend sea penalizado por no conocer tecnologías de Backend.

Qué se puede hacer

- **Aprobar:** pide confirmación. La postulación pasa a “Aprobada” y el sistema crea la cuenta del practicante con una contraseña temporal, que el Administrador entrega por fuera del sistema. El practicante hereda el área y la especialidad de su postulación. La asignación a un proyecto se hace después, en el módulo Practicantes o Proyectos.

- **Rechazar:** exige un motivo, que queda registrado.

- **Reconsiderar:** una postulación rechazada puede volver a “Pendiente” con una nota, para corregir errores de evaluación. Una postulación aprobada no se revierte aquí: si hace falta, se finaliza al practicante.

- **Gestionar los criterios de evaluación** (sub-sección del módulo): crear, editar, activar o desactivar los criterios de cada área y de cada especialidad, y gestionar las propias áreas técnicas y especialidades. Cada criterio tiene nombre, tipo (tecnología, académico, disponibilidad o palabra clave), peso, si es obligatorio y si está activo.

Reglas

- Los estados de una postulación son tres: Pendiente, Aprobada y Rechazada.

- **“Requiere revisión manual” es una marca, no un estado.** La pone la IA cuando falta un criterio obligatorio o cuando el puntaje cae en una banda ambigua (inicialmente entre 50 y 69, ajustable en Configuración). El Administrador decide siempre, con o sin marca.

- Los pesos de los criterios activos de cada bloque (área y especialidad) deben sumar 100.

- Un criterio que ya se usó no se borra, solo se desactiva.

- **Cambiar los criterios no recalcula evaluaciones anteriores.** Cada postulación conserva el desglose con el que fue evaluada, para no afectar decisiones ya tomadas.

- No existen el registro manual de postulantes ni un botón para marcar la revisión manual: la marca la pone el sistema.

### 5.2 Módulo de Practicantes

Permite seguir a cada practicante durante su ciclo (de unos 4 meses), asignarlo a proyectos y cerrar su práctica sin perder el historial. Este módulo ataca directamente la pérdida de continuidad que ocurre con cada cambio de grupo.

Qué muestra

- **Listado** con pestañas y contador: Activos, Sin proyecto, Finalizados y Todos. Abre en “Activos”.

- Columnas: practicante (nombre y correo), área y especialidad, proyectos activos, carga (tareas “En progreso”), última actividad, fecha de fin prevista, estado y acceso al detalle. Filtros por área técnica y proyecto, y búsqueda por nombre o correo.

- En la pestaña “Sin proyecto”, cada fila trae el atajo **“Asignar a proyecto”**, para que el Administrador vaya asignando sin cambiar de módulo.

- **Detalle:** datos personales (solo lectura para el Administrador), datos de la práctica (área, especialidad, fecha de ingreso y fecha de fin prevista), proyectos actuales y anteriores con sus fechas de alta y baja, tareas actuales y completadas, línea de tiempo de su actividad y enlace a su postulación de origen.

- No existe un botón “Nuevo practicante”: un practicante solo nace al aprobar una postulación, para que todos tengan su evaluación asociada.

Qué se puede hacer

- **Editar los datos de la práctica:** especialidad, fecha de ingreso y fecha de fin prevista. Los datos personales los edita el propio practicante.

- **Asignar a proyecto** (uno o varios), con confirmación.

- **Restablecer contraseña:** genera una contraseña temporal, visible una sola vez, para entregarla por fuera del sistema.

- **Finalizar la práctica:** pide un motivo (término de ciclo, retiro u otro) y avisa antes de confirmar: “Tiene N tareas en progreso que serán liberadas”. Al confirmar, se bloquea su acceso, sus asignaciones reciben fecha de baja y sus tareas “En progreso” pasan a “Disponible”, dejando un registro por cada una.

- **Reactivar:** devuelve a un practicante finalizado a “Activo”, con una nota. Sus asignaciones antiguas no se reactivan: aparece en “Sin proyecto” y se le asigna de nuevo.

Reglas

- Los estados son dos: Activo y Finalizado. La inactividad no es un estado: se detecta como una alerta (ver 5.6).

- **La fecha de fin prevista** se propone automáticamente (ingreso más 4 meses, valor configurable) y el Administrador puede cambiarla. No cierra la práctica por sí sola.

- **Aviso previo:** 14 días antes de la fecha de fin (ajustable), el sistema notifica al practicante, a los supervisores de sus proyectos y al Administrador. Si la fecha vence sin que se finalice, aparece una alerta.

- **Asignaciones con fecha de alta y de baja.** Una asignación nunca se borra: al salir de un proyecto recibe una fecha de baja, y si el practicante vuelve, se crea una asignación nueva. Así queda el historial de quién trabajó en cada proyecto y entre qué fechas. Las tareas conservan el nombre de quien las hizo aunque ya haya salido.

- Un practicante nunca se elimina.

### 5.3 Módulo de Supervisores

El supervisor no nace de una postulación: lo crea el Administrador. Este módulo permite administrar sus cuentas y verificar su carga de trabajo.

Qué muestra

- **Listado** con pestañas Activos, Inactivos y Todos. Columnas: supervisor (nombre y correo), proyectos a cargo, practicantes a cargo, tareas por revisar, última actividad, estado y acceso al detalle. Botón **“Nuevo supervisor”** (nombre, correo y celular).

- **Detalle:** datos de contacto, proyectos a cargo (con su reunión semanal y cantidad de practicantes), tareas que esperan su aprobación y desde hace cuántos días, proyectos anteriores y línea de tiempo de su actividad.

Qué se puede hacer

- **Crear al supervisor,** con una contraseña temporal visible una sola vez.

- **Editar su nombre y correo institucional.** Son una credencial que entrega la empresa, por eso solo el Administrador los modifica. El supervisor edita su celular, Discord y GitHub, y cambia su contraseña desde su perfil.

- **Restablecer contraseña.**

- **Reasignar proyectos:** atajo que muestra los proyectos activos del supervisor y pide elegir un nuevo supervisor para cada uno.

- **Desactivar y reactivar.** Un supervisor nunca se elimina.

Reglas

- Todo proyecto tiene exactamente un supervisor, por eso **no se puede desactivar a un supervisor con proyectos activos**: primero se reasignan. El sistema lo bloquea e indica cuántos proyectos tiene pendientes.

- Al reasignar un proyecto, sus tareas “Esperando supervisión” pasan al nuevo supervisor, porque siguen al proyecto. El proyecto reasignado deja de aparecer en el panel del supervisor anterior, pero sus acciones pasadas siguen asociadas a su nombre.

- Un supervisor desactivado no puede iniciar sesión, pero sus acciones anteriores siguen asociadas a su nombre.

- La sobrecarga de un supervisor (muchos proyectos o muchas tareas por revisar) se ve como indicador en el listado y no como una regla aparte.

- Un supervisor recién creado puede tener cero proyectos; su panel muestra entonces un estado vacío (ver 9.1).

### 5.4 Módulo de Proyectos

Reúne todo lo relativo a un proyecto: sus datos, su equipo y su tablero de tareas. Es el lugar donde se conecta lo definido en los módulos anteriores. El Administrador es el único que controla el ciclo de vida de un proyecto (crearlo, pausarlo, finalizarlo, reactivarlo); el Supervisor solo le avisa por fuera del sistema cuando considera que un proyecto terminó.

Qué muestra

- **Listado** con pestañas Activos, En pausa, Finalizados y Todos. Columnas: proyecto, supervisor, practicantes activos, avance (tareas terminadas sobre el total), tareas esperando supervisión, próxima reunión (o “Sin definir”), estado y acceso al detalle. Filtro por supervisor y búsqueda por nombre. Botón **“Nuevo proyecto”**.

- **Datos del proyecto:** nombre, código corto (de 3 a 5 caracteres, único y que no cambia; por ejemplo PL2D), descripción, fecha de inicio y de fin prevista, supervisor, repositorio y rama base de GitHub (obligatorios), y reunión semanal (día y hora, opcionales).

- **Detalle con tres pestañas:** “Resumen” (datos, indicadores de avance, tareas por estado, tareas vencidas, actividad reciente y enlaces útiles), “Tablero” (el tablero Kanban descrito en la sección 6) y “Equipo” (practicantes activos con su carga, y anteriores con sus fechas de alta y baja).

- **Enlaces útiles:** una lista simple de nombre y dirección (carpeta de documentos, canal de Discord u otro medio que use el equipo). Todo el equipo la ve, y la editan el Supervisor y el Administrador. Da al equipo el contexto del proyecto sin tener que preguntarlo a cada momento.

Qué se puede hacer

- Crear y editar el proyecto (incluye cambiar la reunión semanal, el repositorio y la rama base).

- **Cambiar de supervisor,** con el mismo cuadro de reasignación del módulo Supervisores.

- **Asignar practicantes:** lista de practicantes activos con su carga actual, para elegir uno o varios.

- **Quitar un practicante:** su asignación recibe fecha de baja y sus tareas “En progreso” de ese proyecto se liberan, con registro.

- **Pausar, reanudar, finalizar y reactivar el proyecto,** con una nota obligatoria. Un proyecto nunca se elimina.

Reglas

- La reunión semanal es **opcional** al crear el proyecto, porque la organiza el Supervisor. La define el Supervisor o el Administrador y, si cambia, se notifica al equipo. Se fija por proyecto (no por supervisor) para que un supervisor con varios proyectos no concentre todas sus reuniones en un solo día. El Administrador también puede definirla para cubrir el caso de un supervisor ausente.

- Un proyecto puede crearse sin equipo, pero siempre con un supervisor activo.

- **En pausa:** nadie puede tomar tareas nuevas; todo lo demás sigue igual. Quien tiene tareas en progreso puede seguir trabajándolas, y el Supervisor puede seguir aprobando o devolviendo lo que ya estaba en revisión.

- **Finalizar:** se bloquea mientras haya tareas “Esperando supervisión”, porque son decisiones pendientes del supervisor. Las tareas “En progreso” se liberan automáticamente con registro, y el tablero queda en solo lectura. Las asignaciones de los practicantes no se cierran al finalizar el proyecto: si el Administrador lo reactiva, el equipo recupera su acceso. El sistema guarda la fecha real de finalización.

- Quedan fuera sprints, prioridades, presupuesto, clientes y etiquetas, porque no forman parte del modelo.

### 5.5 Módulo de Tareas

El tablero Kanban vive dentro de cada proyecto (sección 5.4). Este módulo no lo repite: es una **vista transversal** que permite ver y filtrar las tareas de todos los proyectos juntas, por ejemplo para encontrar todas las vencidas o todas las que esperan supervisión. Las reglas del flujo de estados se explican en la sección 6.

Qué muestra

- **Listado** con pestañas por estado (Todas, Disponibles, En progreso, Esperando supervisión y Terminadas) y filtros por proyecto, responsable, vencidas, sin asignar, “requiere supervisión”, estado del Pull Request y búsqueda por título o ID.

- Columnas: ID, título, proyecto, responsable (o “Sin asignar”), estado, ícono de “Requiere supervisión”, etiqueta del Pull Request, fecha límite (en rojo si está vencida) y acceso al detalle.

- **ID legible:** cada tarea se identifica con el código de su proyecto y un número correlativo (por ejemplo, PL2D-018). Sirve para nombrar la tarea en el título del Pull Request, en Discord y en las reuniones, en lugar de asignar trabajo de palabra. Un número eliminado no se reutiliza.

- **Detalle de la tarea:** estado y responsable, descripción y fecha límite, las dos opciones (supervisión y Pull Request), los datos del Pull Request (etiqueta, enlace, rama de origen y rama base), las observaciones del supervisor y la línea de tiempo de la tarea. Es un componente compartido por los tres paneles.

Cómo se crea una tarea

Se crea desde este módulo (eligiendo el proyecto) o desde el tablero del proyecto. Los datos son: proyecto, título, descripción (qué se espera y cuándo se considera terminada) y fecha límite, todos obligatorios, más dos opciones: “Requiere supervisión” (desactivada por defecto) y “Requiere PR” (activada por defecto). La tarea nace en estado “Disponible”, sin responsable. Que la descripción y la fecha límite sean obligatorias responde a un problema identificado en el diagnóstico: tareas asignadas de palabra, sin alcance ni plazo.

Qué puede hacer el Administrador

Todas estas acciones se ejecutan desde el detalle de la tarea (ver 6.7).

- Crear tareas, y **editar su título, descripción y fecha límite mientras estén en “Disponible” o “En progreso”.** En “Esperando supervisión” y “Terminada” no se editan: si hace falta corregir algo, la tarea se devuelve (o se reabre) y se edita después. Cada cambio queda registrado y, si la tarea está “En progreso”, se avisa a su responsable.

- **Liberar** una tarea en progreso, con motivo obligatorio. **Reabrir** una tarea terminada, con nota obligatoria.

- **Cerrar el Pull Request** de una tarea (cuando está Creado o Con conflictos), con motivo.

- Cambiar las opciones “Requiere supervisión” y “Requiere PR” según las reglas de la sección 6.

- **Eliminar** una tarea, solo si está “Disponible” y no tiene Pull Request, con motivo y confirmación. El Historial conserva una copia del ID y el título de la tarea eliminada.

El Administrador no toma tareas, no las marca como terminadas ni las aprueba o devuelve: esas acciones pertenecen al practicante y al supervisor. Tampoco existe la reasignación directa: una tarea se libera y cualquier practicante del proyecto la toma. Una tarea no puede cambiarse de proyecto, porque su ID, su equipo, su supervisor y su repositorio dependen de él; si se creó en el proyecto equivocado, se elimina y se vuelve a crear en el correcto. Quedan fuera la prioridad, los sprints, los comentarios y los archivos adjuntos.

### 5.6 Módulo de Reportes

Responde a una deficiencia del diagnóstico: no existían indicadores definidos para medir el avance real. A diferencia del Historial, que registra lo ocurrido, Reportes lo analiza. Todos los números salen de los eventos del Historial, que guardan la fecha de cada cambio. El módulo tiene dos pestañas. El Supervisor usa el mismo módulo, limitado a sus proyectos (ver 9.1.4).

Pestaña “Insights”

Muestra alertas automáticas, cada una como una tarjeta con su severidad (Crítico, Atención o Informativo), un título corto (por ejemplo, “Luis Quispe sin actividad hace 12 días”), el motivo con los datos que la dispararon, el elemento afectado con enlace a su detalle, la fecha de detección y sus acciones. Se ordenan por severidad y luego por antigüedad, y pueden filtrarse por severidad, tipo, proyecto y estado. Los insights se generan solos con las siguientes siete reglas, cuyos umbrales se ajustan en Configuración:

| **Regla**                       | **Se dispara cuando**                                                                                          | **Umbral inicial**                      | **Severidad**         |
|---------------------------------|----------------------------------------------------------------------------------------------------------------|-----------------------------------------|-----------------------|
| **Practicante inactivo**        | Un practicante activo no registra acciones.                                                                    | 7 días (14 = crítico)                   | Atención / Crítico    |
| **Carga desbalanceada**         | Un practicante tiene demasiadas tareas “En progreso”, o ninguna mientras su proyecto tiene tareas disponibles. | Más de 3 / 0                            | Atención              |
| **Posible atraso del proyecto** | El avance real es menor al esperado por el tiempo transcurrido, o hay muchas tareas vencidas.                  | 20 puntos de diferencia / 25 % vencidas | Crítico               |
| **Proyecto sin actividad**      | Un proyecto activo con equipo no registra acciones.                                                            | 7 días                                  | Atención              |
| **Supervisión demorada**        | Una tarea espera la respuesta del supervisor.                                                                  | 3 días                                  | Atención              |
| **Postulaciones sin decidir**   | Una postulación pendiente no recibe decisión.                                                                  | 5 días                                  | Atención              |
| **Fin de práctica**             | Un practicante está cerca de su fecha de fin, o ya la superó sin finalizar.                                    | 14 días / vencida                       | Informativo / Crítico |

*El avance esperado de un proyecto es el tiempo transcurrido sobre su duración total, según sus fechas de inicio y de fin.*

Acciones sobre un insight: **ver el detalle** del elemento afectado; **marcar como revisado**, con una nota opcional, lo que lo saca de la lista activa (reaparece si la situación empeora o a los 7 días si sigue igual, para no perder un problema sin resolver); y **notificar** al practicante o supervisor afectado, disponible en los insights de practicante inactivo y de supervisión demorada, lo que permite pasar de la alerta a la acción sin salir del sistema. Los insights no se editan ni se borran: desaparecen cuando la condición deja de cumplirse. El estado “revisado” es independiente por persona: si el Supervisor revisa un insight, el Administrador lo sigue viendo.

Pestaña “Indicadores”

Con selector de periodo (últimos 30 días por defecto) y filtro por proyecto. Muestra tarjetas generales (tareas terminadas, tiempo promedio de ciclo, postulaciones decididas y puntaje promedio por área), una tabla por proyecto, una tabla por practicante y un gráfico de practicantes por área. Se calculan así:

- **Avance del proyecto:** tareas terminadas sobre el total (sin contar las eliminadas).

- **Tiempo de ciclo:** promedio entre que se toma una tarea y llega a “Terminada”.

- **Espera de supervisión:** tiempo promedio que las tareas pasan en “Esperando supervisión”.

- **Tasa de devolución:** tareas devueltas sobre tareas enviadas a supervisión.

- **Última actividad:** la última acción registrada en el Historial.

Quedan fuera la exportación de reportes, los constructores de reportes personalizados y las comparaciones de practicantes como ranking.

### 5.7 Módulo de Historial de actividad

Es el registro de auditoría del sistema: guarda automáticamente quién hizo qué y cuándo, y es la base de la trazabilidad que el diagnóstico identificó como carencia central. La vista global es solo para el Administrador; el Supervisor ve la actividad de sus proyectos y el Practicante la suya, como líneas de tiempo dentro de cada proyecto, tarea y perfil.

Qué muestra

- Un listado de eventos, de los más recientes a los más antiguos, con fecha y hora, autor (nombre y rol, o “Sistema”), acción, elemento afectado (con enlace) y resumen del cambio (por ejemplo, “En progreso → Esperando supervisión”).

- Filtros por rango de fechas, autor, categoría, tipo de elemento y proyecto, y búsqueda de texto (por ejemplo, un ID de tarea).

- Un panel de detalle por evento con el valor anterior y el nuevo de cada campo modificado, y el motivo o la nota.

Qué se registra

| **Categoría**     | **Eventos registrados**                                                                                                                                                          |
|-------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Postulaciones** | Recibida, evaluada por la IA, aprobada, rechazada (con motivo) y reconsiderada (con nota).                                                                                       |
| **Evaluación**    | Criterios, áreas y especialidades creados, editados, activados o desactivados; parámetros de configuración cambiados.                                                            |
| **Practicantes**  | Cuenta creada, datos de la práctica editados, contraseña restablecida, asignado o quitado de un proyecto, finalizado y reactivado.                                               |
| **Supervisores**  | Cuenta creada, nombre o correo editados, contraseña restablecida, proyectos reasignados, desactivado y reactivado.                                                               |
| **Proyectos**     | Creado, editado, supervisor cambiado, reunión definida o cambiada, repositorio o rama base cambiados, enlaces agregados o quitados, pausado, reanudado, finalizado y reactivado. |
| **Tareas**        | Creada, editada, opciones de supervisión o de PR cambiadas, tomada, liberada, enviada a supervisión, terminada, aprobada, devuelta, reabierta y eliminada.                       |
| **Pull Request**  | Creado, estado actualizado (conflictos, fusionado, cerrado), cerrado desde el sistema y marcado como “No requiere PR”.                                                           |
| **Cuenta propia** | Cambios de nombre, correo y contraseña de cada persona.                                                                                                                          |

Reglas

- Los eventos **no se editan ni se borran** y se conservan de forma indefinida.

- Las acciones automáticas (por ejemplo, la liberación de tareas al finalizar una práctica, o la actualización del estado de un Pull Request) se registran con el autor “Sistema” y su motivo.

- Las ediciones guardan el valor anterior y el nuevo, para ver exactamente qué cambió.

- Cada evento guarda una copia del identificador y el título del elemento afectado, de modo que el registro sigue siendo legible aunque el elemento ya no exista (por ejemplo, una tarea eliminada).

- Nunca se guardan contraseñas: solo que hubo un cambio. De los datos personales solo se registran los cambios de nombre y correo; no los de celular, Discord, GitHub o disponibilidad.

- No se registran inicios de sesión. Por eso la “última actividad” de una persona es su última acción registrada, no su último ingreso.

### 5.8 Módulo de Configuración

Es una pantalla de parámetros ajustables, solo para el Administrador, organizada en secciones. Cada parámetro muestra su valor actual y su valor predeterminado, tiene su validación, y cada sección permite restaurar sus valores originales. Los cambios valen hacia adelante y quedan en el Historial con su valor anterior y el nuevo. Los umbrales que fija el Administrador aplican también a los insights que ve el Supervisor.

| **Sección**                     | **Parámetro**                                                                                                                                                                                         | **Valor inicial**                               |
|---------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| **Evaluación de postulaciones** | Banda de puntaje ambiguo (el mínimo debe ser menor que el máximo)                                                                                                                                     | 50 a 69                                         |
|                                 | Proporción de la nota entre área y especialidad (deben sumar 100)                                                                                                                                     | 40 % / 60 %                                     |
| **Prácticas**                   | Duración predeterminada, para proponer la fecha de fin                                                                                                                                                | 4 meses                                         |
|                                 | Días de anticipación del aviso de fin de práctica                                                                                                                                                     | 14 días                                         |
| **Seguimiento**                 | Umbrales de las siete reglas de insights (sección 5.6), incluida la anticipación del insight “Fin de práctica”                                                                                        | Ver tabla de la sección 5.6                     |
| **Integraciones**               | Conexión con GitHub: estado (conectado o no), organización o cuenta conectada, fecha de la última verificación, y botones “Probar conexión” y “Reconectar”. La clave de la conexión nunca se muestra. | Diseño; en el prototipo, una tarjeta de ejemplo |
| **Datos de demostración**       | Restablecer los datos de ejemplo a su estado original (existe solo en el prototipo)                                                                                                                   | —                                               |

Las áreas técnicas y especialidades no se configuran aquí sino dentro de Postulaciones, junto a sus criterios, porque solo se usan allí. El perfil personal está en el menú del usuario, y los roles y permisos son fijos, no configurables.

### 5.9 Dashboard

Es la primera pantalla del Administrador. No calcula nada propio: resume lo que ya existe en los otros módulos, de modo que haya una sola fuente de alertas. Muestra el estado actual, sin selector de periodo ni exportación (el análisis por periodo está en Reportes).

- **Cuatro tarjetas de métricas,** cada una con un enlace al módulo con el filtro ya aplicado: postulaciones pendientes (y cuántas requieren revisión manual), proyectos activos (y cuántos están en pausa), practicantes activos (y cuántos están sin proyecto) y tareas esperando supervisión (y cuántas llevan demasiado tiempo).

- **Postulaciones pendientes:** las cinco de mayor puntaje, con nombre, área, especialidad, puntaje, marca de revisión manual y acceso al detalle.

- **Alertas:** los insights vigentes (primero los críticos y luego los de atención, hasta cinco), cada uno con sus acciones. Incluyen los practicantes próximos a finalizar y los que ya superaron su fecha de fin.

- **Practicantes por área:** barras con la cantidad de practicantes activos de cada área técnica.

Si no hay alertas o postulaciones pendientes, se muestra un mensaje que lo indica. No incluye un feed de actividad reciente, porque duplicaría el Historial.

## 6. Tablero Kanban y flujo de tareas

El tablero Kanban es compartido por los tres paneles: todos ven las mismas cuatro columnas, pero cada rol tiene botones distintos. Las tareas no se arrastran con el mouse: cada cambio de estado se hace con un botón de acción dentro del detalle de la tarea, y el sistema mueve la tarjeta a su columna. Una única regla central define qué transiciones son válidas y quién puede hacerlas, y todos los botones la consultan. Así no pueden existir estados imposibles, como saltar de “Disponible” a “Terminada” o que un practicante apruebe su propia tarea. Esta regla se puede probar de forma aislada, por eso es una de las partes más cuidadas del diseño.

### 6.1 Estados de una tarea

| **Estado**                | **Qué significa**                                                                                                                             |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| **Disponible**            | La tarea fue creada y está en el “pool” del proyecto: libre para que cualquier practicante del proyecto la tome.                              |
| **En progreso**           | Un practicante la tomó y trabaja en ella. Puede liberarla de vuelta al pool.                                                                  |
| **Esperando supervisión** | Solo para tareas marcadas “Requiere supervisión”: el practicante terminó su parte y espera la revisión del supervisor.                        |
| **Terminada**             | El trabajo se dio por cumplido: el supervisor lo aprobó, o el propio practicante lo marcó como terminado si la tarea no requería supervisión. |

### 6.2 Transiciones permitidas

| **De**                    | **A**                 | **Quién**                                           | **Acción y condición**                                                               |
|---------------------------|-----------------------|-----------------------------------------------------|--------------------------------------------------------------------------------------|
| **Disponible**            | En progreso           | Practicante del proyecto                            | Tomar la tarea. No se puede si el proyecto está en pausa.                            |
| **En progreso**           | Disponible            | Practicante responsable, Supervisor o Administrador | Liberar. Si lo hace el Supervisor o el Administrador, el motivo es obligatorio.      |
| **En progreso**           | Esperando supervisión | Practicante responsable                             | Enviar a revisión. Solo si la tarea requiere supervisión.                            |
| **En progreso**           | Terminada             | Practicante responsable                             | Marcar como terminada. Solo si la tarea no requiere supervisión.                     |
| **Esperando supervisión** | Terminada             | Supervisor del proyecto                             | Aprobar.                                                                             |
| **Esperando supervisión** | En progreso           | Supervisor del proyecto                             | Devolver, con nota obligatoria. La tarea queda marcada “Devuelta con observaciones”. |
| **Terminada**             | En progreso           | Supervisor o Administrador                          | Reabrir, con nota obligatoria (ver 6.5).                                             |

### 6.3 La opción “Requiere supervisión”

No todas las tareas necesitan el visto bueno del supervisor. Si las necesitaran todas, el supervisor tendría que revisar tarea por tarea cada proyecto a su cargo, y la revisión perdería valor. Por eso, al crear la tarea, el Supervisor (o el Administrador) decide si esa tarea requiere su supervisión; lo habitual es activarla en las tareas más complejas o críticas. Además, al definir explícitamente qué tareas se revisan, el criterio de “tarea terminada” deja de depender del juicio improvisado de cada persona.

- Viene **desactivada por defecto**. La editan solo el Supervisor y el Administrador, nunca el practicante, y solo mientras la tarea no esté “Esperando supervisión” ni terminada, para no dejarla en un estado ambiguo.

- La tarjeta lleva un ícono que indica que requiere supervisión, para que el practicante lo sepa desde el principio.

- Una tarea con la opción activada pasa por “Esperando supervisión”; una sin ella va directo de “En progreso” a “Terminada”. Por eso esa columna puede quedar corta o vacía, y es normal.

- Los contadores y alertas de supervisión cuentan solo las tareas marcadas, porque solo esas pueden llegar a ese estado. El avance del proyecto cuenta todas las tareas.

### 6.4 Crear y mantener las tareas

- Crean tareas el Supervisor y el Administrador; el practicante no crea tareas.

- La descripción y la fecha límite son obligatorias. **El título, la descripción y la fecha límite se pueden editar solo mientras la tarea está “Disponible” o “En progreso”.** Una tarea en “Esperando supervisión” no cambia mientras el supervisor la evalúa, porque estaría juzgando algo distinto de lo que el practicante entregó; una tarea “Terminada” tampoco. Si hace falta corregirla, el Supervisor la devuelve (o la reabre), la edita y el flujo sigue normal. Si la tarea está “En progreso”, cada edición avisa al practicante responsable.

- El proyecto de una tarea no se puede cambiar.

- Una tarea “Disponible” y sin Pull Request puede eliminarse (con motivo y confirmación) si se creó por error o dejó de ser necesaria. El Historial conserva el rastro. Una tarea con trabajo realizado nunca se elimina.

### 6.5 Tareas devueltas, reabiertas y liberadas

- **Devolver:** el supervisor encuentra observaciones y regresa la tarea a “En progreso” con una nota. La tarjeta muestra la marca roja “Devuelta con observaciones” y la nota, para que el practicante sepa qué corregir.

- **Reabrir:** “Terminada” no debe ser un callejón sin salida. Si después de darla por terminada se descubre que el resultado no cumple lo pedido (por ejemplo, falla al probarlo en la reunión, o una tarea sin supervisión se marcó terminada estando incompleta), el Supervisor o el Administrador la reabre con una nota. Así toda la historia queda en una sola tarea, en lugar de crear una nueva sin vínculo con la original. Los conflictos de código **no** reabren la tarea: se resuelven en el Pull Request (ver sección 7).

- **Liberar:** sirve, por ejemplo, cuando un practicante finaliza su práctica con tareas en progreso. Las libera el propio practicante, el Supervisor o el Administrador. Cuando lo hace otra persona, el motivo es obligatorio y se notifica al responsable.

### 6.6 Carga de trabajo

No hay un límite de tareas “En progreso” por practicante: la toma de tareas es libre, y el sistema solo muestra un indicador de carga (la cantidad de tareas en progreso), tanto al propio practicante como a los supervisores. Si un practicante acumula demasiadas, el sistema lo señala como insight de carga desbalanceada (sección 5.6).

### 6.7 Dónde se ejecutan las acciones

Ninguna acción que cambie el estado o los datos de una tarea se hace desde una tarjeta del tablero ni desde una fila de un listado. Hacer clic en cualquier tarjeta o fila **abre el detalle de la tarea**, y desde ahí se ejecutan todas las acciones, con los botones que correspondan al estado de la tarea y al rol de quien la mira (la función única de reglas decide cuáles se muestran). Esta regla vale para los tres paneles y para el tablero y los listados por igual.

- **Aprobar y devolver** aparecen solo si la tarea está en “Esperando supervisión” y quien la ve es el supervisor de ese proyecto. Así revisa la descripción, el Pull Request y el historial antes de decidir, y se evita aprobar por error con un clic.

- **Tomar** también se hace desde el detalle: el practicante puede leer la descripción y la fecha límite antes de comprometerse, lo que refuerza el objetivo de que las tareas tengan alcance y plazo claros.

- El resto (liberar, reabrir, eliminar, cerrar el Pull Request, cambiar opciones, editar) sigue la misma regla.

- Para cualquier rol, el detalle de una tarea sobre la que no tiene permiso de actuar se muestra en solo lectura, sin botones.

### 6.8 Contenido del tablero

- **Tarjeta de tarea:** ID, título, responsable (si lo hay), fecha límite (en rojo si está vencida), ícono de “Requiere supervisión”, etiqueta del Pull Request (solo en tareas “Esperando supervisión” o “Terminada” que lo requieren) y, si corresponde, la marca “Devuelta con observaciones”. No se repite en la tarjeta el estado de su columna.

- **Columna “Terminada”:** muestra las **5 tareas más recientes**, ordenadas por fecha de término de la más nueva a la más antigua. Un enlace **“Ver todas las terminadas”** abre el listado completo de las terminadas del proyecto, en el mismo orden y con búsqueda por título o ID, para que la columna no crezca sin límite en proyectos largos.

- **Filtro “Solo mis tareas”:** disponible para el Practicante, para encontrar las suyas sin recorrer todas las columnas.

- **Proyecto finalizado:** el tablero queda en solo lectura. **Proyecto en pausa:** no se pueden tomar tareas nuevas.

## 7. Integración con GitHub: Pull Requests

Esta integración está **diseñada y documentada, pero no implementada** en el prototipo, porque requiere un repositorio real, credenciales y un servidor. Su objetivo es que cada tarea terminada deje una evidencia verificable de su trabajo: un Pull Request (PR) en el repositorio del proyecto, creado desde el propio sistema.

### 7.1 Principio de diseño: el estado de la tarea y el del PR van por separado

El estado de la tarea responde a “¿se cumplió lo pedido?”, algo que decide el supervisor (o el practicante, si la tarea no requiere supervisión). El estado del Pull Request responde a “¿el código quedó integrado?”, algo que decide GitHub y la revisión humana. Se llevan por separado porque, si se mezclaran, un conflicto de código haría parecer que la tarea está mal hecha, cuando puede estar perfecta y chocar igual porque alguien más modificó el mismo archivo. Además, el PR cambia después de “Terminada” (se fusiona, aparece un conflicto, se cierra), y el estado de una tarea no debe cambiar solo. Por eso el tablero mantiene sus cuatro columnas y el PR aparece como una **etiqueta** en la tarjeta.

Se descartó el merge automático directo a la rama principal por representar un riesgo de calidad: crear un Pull Request preserva el control humano de la revisión final, alineándose con las prácticas estándar de integración continua. **El merge es manual, en GitHub:** el sistema no fusiona nada ni define quién puede hacerlo; eso queda a criterio de cada proyecto y de la empresa, que además puede proteger las ramas base desde GitHub.

### 7.2 Cómo se crea un Pull Request

- La tarea llega a “Esperando supervisión” (si requiere supervisión) o a “Terminada” (si no la requiere), y requiere PR. Su etiqueta queda en “Pendiente”. Que el PR se pueda crear desde “Esperando supervisión” permite al supervisor ver el código antes de aprobar; aprobar no exige que el PR exista.

- El practicante responsable abre la tarea y pulsa “Crear Pull Request”. Se abre una ventana con: **título** (propuesto con el ID y el título de la tarea), **descripción** (con una plantilla para completar), **rama de trabajo** y **rama base**.

- La **rama de trabajo** no se escribe: se elige de una lista desplegable con buscador, cargada desde las ramas del repositorio en GitHub, igual que al crear un PR allí. Esto evita errores de tipeo y asegura que la rama exista. Solo aparecen ramas ya subidas, por eso la ventana avisa: “¿No ves tu rama? Asegúrate de haberla subido”.

- La **rama base** aparece fija y de solo lectura: es la que el proyecto definió (por ejemplo, main u otra rama de integración acordada por el grupo). Se define por proyecto para que nadie apunte por error a otra rama; solo el Supervisor o el Administrador pueden cambiarla, y los PR ya creados conservan la rama con la que se hicieron.

- Al pulsar “Crear PR”, el botón pasa a “Creando…” y se desactiva para evitar un doble clic. Si sale bien, la ventana se cierra y la etiqueta pasa a “Creado”, con el enlace al PR. Si falla, la ventana no se cierra: muestra el motivo y permite reintentar.

- La revisión y la fusión (merge) se realizan en GitHub.

La dirección (URL) del PR no la escribe nadie: GitHub la devuelve al crearlo, con el formato https://github.com/{organización}/{repositorio}/pull/{número}, y el sistema la guarda en la tarea.

### 7.3 Etiquetas del Pull Request

La etiqueta se muestra solo en tareas “Esperando supervisión” o “Terminada” cuyo PR sea requerido. Las tareas con “Requiere PR” desactivado no muestran etiqueta.

| **Etiqueta**       | **Cuándo se muestra**                       | **Detalle**                             |
|--------------------|---------------------------------------------|-----------------------------------------|
| **Pendiente**      | Todavía no existe un PR para la tarea.      | Se puede crear.                         |
| **Creado**         | Hay un PR abierto y sin conflictos.         | Con enlace a GitHub.                    |
| **Con conflictos** | GitHub detecta conflictos con la rama base. | El practicante recibe una notificación. |
| **Fusionado**      | El PR ya se integró a la rama base.         | Estado final.                           |
| **Cerrado**        | El PR se cerró sin fusionarse.              | Se puede crear uno nuevo.               |

### 7.4 Cómo cambia el estado del PR

| **Evento**                                                                                             | **Resultado**                                                                                                                                                                                                                                                               |
|--------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| La tarea llega a “Esperando supervisión” (supervisada) o a “Terminada” (sin supervisión) y requiere PR | Pendiente                                                                                                                                                                                                                                                                   |
| Se crea el PR, o se detecta uno existente que está abierto                                             | Creado                                                                                                                                                                                                                                                                      |
| Se detecta un PR existente que ya estaba fusionado                                                     | Fusionado                                                                                                                                                                                                                                                                   |
| GitHub detecta conflictos / el practicante los resuelve                                                | Con conflictos / Creado                                                                                                                                                                                                                                                     |
| El PR se fusiona (en GitHub)                                                                           | Fusionado                                                                                                                                                                                                                                                                   |
| El PR se cierra sin fusionar (en GitHub o desde el sistema)                                            | Cerrado                                                                                                                                                                                                                                                                     |
| Desde “Cerrado”, se pulsa “Crear nuevo PR”                                                             | Creado                                                                                                                                                                                                                                                                      |
| La tarea se devuelve o se reabre                                                                       | La etiqueta se oculta y el enlace se conserva. Cuando la tarea vuelve a “Esperando supervisión” o “Terminada”, el sistema consulta GitHub y recalcula: PR abierto, Creado (o Con conflictos); fusionado, Pendiente (las correcciones van en un PR nuevo); cerrado, Cerrado. |
| El practicante marca “No requiere PR” (con motivo)                                                     | La opción “Requiere PR” se desactiva y la etiqueta desaparece                                                                                                                                                                                                               |

### 7.5 Situaciones especiales

- **Ya existe un PR para esas ramas:** el sistema no crea un segundo. Lo detecta, lo enlaza y la etiqueta refleja su estado real (Creado o Fusionado), con un aviso: “Ya existía un PR para estas ramas; lo vinculamos”.

- **Conflictos:** GitHub crea el PR igual y calcula los conflictos unos segundos después; el sistema lo consulta de nuevo y pone la etiqueta “Con conflictos”. La tarea no se reabre: el practicante resuelve el conflicto en su rama y la etiqueta vuelve a “Creado”. Las observaciones de un revisor en GitHub se corrigen igual, con más cambios en la misma rama y el mismo PR.

- **No se pudo crear:** por ejemplo, rama inexistente, sin cambios respecto a la base, falta de permisos o GitHub caído. La ventana muestra el motivo, permite reintentar y la etiqueta sigue en “Pendiente”.

- **Cerrar un PR desde el sistema:** si se cometió un error (rama base equivocada, PR duplicado o enfoque descartado), el practicante responsable, el Supervisor o el Administrador pueden cerrarlo desde la tarea, sin saltar a GitHub. Solo está disponible con la etiqueta “Creado” o “Con conflictos”, pide un motivo y una confirmación, y deja la etiqueta en “Cerrado” con la opción de crear otro. GitHub no permite eliminar un PR, solo cerrarlo, y un PR fusionado no se puede cerrar.

- **“No requiere PR”:** hay tareas sin código (diseño, documentación) para las que un PR no tiene sentido. Todas las tareas nacen con la opción activada; el Supervisor o el Administrador pueden desactivarla al crear la tarea, y el practicante puede hacerlo después, con un motivo obligatorio que queda registrado y avisa al supervisor.

### 7.6 Qué necesita GitHub en un entorno real

- **Una conexión de la empresa con GitHub:** lo recomendable es una GitHub App instalada en la organización de CODAINI (o una cuenta de servicio con token), con permiso para leer ramas y para leer y escribir Pull Requests. Su clave se guarda solo en el servidor, nunca en el navegador ni en pantalla. Como el PR lo crea esa conexión, el nombre del practicante se incluye en la descripción.

- **Dos datos por proyecto,** que el sistema ya guarda: el repositorio (organización y nombre) y la rama base.

- **Cuatro operaciones:** listar las ramas del repositorio, crear el PR, consultar su estado (abierto, fusionado o cerrado, y si tiene conflictos) y cerrarlo.

- **Avisos de GitHub al sistema** (webhooks), para que el estado del PR se actualice solo cuando alguien lo fusiona o lo cierra. Esto requiere un servidor con dirección pública, por eso solo existe con backend.

*Los permisos exactos y el comportamiento de la API se confirmarán con la documentación de GitHub al momento de implementar.*

### 7.7 Qué se muestra en el prototipo

Como no hay servidor, el prototipo usa ramas de ejemplo, genera una URL ficticia con el formato real, incluye tareas de ejemplo en cada estado del PR y un caso de error preparado, para poder demostrar todo el flujo y sus excepciones. La sección de Integraciones de Configuración se muestra como una tarjeta de ejemplo.

## 8. Componentes compartidos por todos los paneles

### 8.1 Notificaciones

Las notificaciones funcionan solo dentro del sistema (sin correo ni WhatsApp, que quedan como mejora futura). Su finalidad es que cada persona se entere de lo que le corresponde sin tener que preguntarlo, que era una de las carencias del seguimiento por Discord.

- **Campana en la barra superior,** con un punto verde cuando hay notificaciones sin leer. Al pulsarla se despliegan las últimas ocho, cada una con su ícono, texto, hora relativa (“hace 2 h”) y marca de no leída. Al hacer clic en una, se abre el elemento relacionado y se marca como leída.

- Botones para “Marcar todas como leídas” y “Ver todas”, que abre un listado completo con pestañas “Todas” y “No leídas”.

- Si el elemento ya no existe (por ejemplo, una tarea eliminada), el texto se conserva, pero el enlace aparece desactivado.

| **Evento**                                                                    | **Quién la recibe**                                        |
|-------------------------------------------------------------------------------|------------------------------------------------------------|
| Tarea enviada a supervisión                                                   | Supervisor del proyecto                                    |
| Tarea aprobada, devuelta, reabierta o liberada por otra persona               | Practicante responsable                                    |
| Tarea editada mientras está “En progreso”                                     | Practicante responsable                                    |
| El practicante marca “No requiere PR”                                         | Supervisor del proyecto                                    |
| PR con conflictos, o cerrado por otra persona                                 | Practicante responsable                                    |
| Asignación a un proyecto o salida de él                                       | Practicante o Supervisor afectado                          |
| Reunión semanal definida o cambiada; proyecto pausado, reanudado o finalizado | Equipo del proyecto (supervisor y practicantes activos)    |
| Práctica próxima a finalizar (14 días antes)                                  | Practicante, supervisores de sus proyectos y Administrador |
| Práctica finalizada con tareas liberadas                                      | Supervisores de los proyectos afectados                    |
| Botón “Notificar” desde un insight                                            | Practicante o Supervisor afectado                          |

Reglas

- La persona que realizó la acción no recibe aviso de su propia acción.

- Las notificaciones son privadas de su destinatario y no se borran.

- Los insights no generan notificaciones por sí solos, porque viven en Reportes y el Dashboard: una sola fuente de alertas. Tampoco se avisa cuando un PR se fusiona ni cuando se crean tareas nuevas, para no generar ruido, ni por cada postulación recibida.

- Aprobar o rechazar una postulación no notifica a nadie, porque el postulante no tiene cuenta en el sistema. La contraseña temporal se entrega por fuera del sistema.

- En el prototipo se ve de forma directa: al tomar y enviar una tarea como practicante, y cambiar luego al rol de supervisor, la campana ya muestra el aviso. Los avisos que dependen de un proceso programado o de GitHub se simulan con datos de ejemplo.

### 8.2 Mi perfil

Está en el menú del usuario de la barra superior, para los tres roles, junto con “Cerrar sesión”. Tiene tres bloques: datos de la cuenta (solo lectura: rol, estado, fecha de alta y, para el practicante, su área, especialidad y fechas de la práctica), datos personales editables y seguridad.

| **Rol**           | **Datos personales que puede editar**                                                                                                                        |
|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Practicante**   | Nombre, correo, celular, usuario de Discord, cuenta de GitHub y disponibilidad (horas por semana). Si cambia su correo, cambia también su usuario de acceso. |
| **Supervisor**    | Celular, Discord y GitHub. Su nombre y correo institucional son solo lectura: los fija el Administrador.                                                     |
| **Administrador** | Nombre, correo y celular.                                                                                                                                    |

El correo debe tener un formato válido y ser único; el celular, un formato válido; Discord y GitHub se escriben como nombre de usuario, y la disponibilidad es un número entero positivo. En un sistema real, el cambio de correo exigiría verificarlo, lo que queda como diseño. El bloque de **seguridad** permite cambiar la contraseña ingresando la actual, la nueva (mínimo 8 caracteres y distinta de la actual) y su confirmación; el cambio queda en el Historial sin guardar la contraseña. No hay foto de perfil (se usa un círculo con las iniciales), preferencias de notificación ni verificación en dos pasos.

### 8.3 Contraseña temporal

Cuando se crea una cuenta o el Administrador restablece una contraseña, la cuenta queda marcada para cambiarla. Mientras no lo haga, aparece una **franja persistente** en la parte superior de todas las pantallas: “Estás usando una contraseña temporal. Cámbiala ahora”, con un botón que lleva a su perfil. No bloquea la navegación, y desaparece cuando la persona cambia su contraseña. Aplica a practicantes y supervisores; el Administrador no la necesita.

## 9. Paneles del Supervisor y del Practicante

Estos dos paneles reutilizan gran parte de lo definido para el Administrador: el tablero, el detalle de tarea, el Pull Request, las notificaciones y el perfil son los mismos componentes. Lo que cambia es el **alcance** (cada rol ve solo lo suyo) y las **acciones** disponibles (según la matriz de la sección 4). Cada módulo se describe, como en el panel del Administrador, con lo que muestra, lo que permite hacer y las reglas que aplica. En ambos paneles el módulo de resumen (Dashboard o Inicio) se describe al final, porque no calcula nada propio: resume lo que ya existe en los demás módulos.

### 9.1 Panel del Supervisor

El Supervisor ve y gestiona únicamente los proyectos que tiene a cargo, y todo lo que ve (practicantes, tareas, reportes, historial) se limita a esos proyectos. El panel tiene cinco ítems en el menú lateral.

| **Grupo del menú** | **Módulo**           | **Formato**            | **Para qué sirve**                                                       |
|--------------------|----------------------|------------------------|--------------------------------------------------------------------------|
| (sin grupo)        | Dashboard            | Tarjetas y bloques     | Resume su cola de revisión, las alertas y las reuniones.                 |
| Proyectos          | Mis proyectos        | Tarjetas en cuadrícula | Ver sus proyectos, su tablero y su equipo.                               |
| Proyectos          | Practicantes a cargo | Tabla                  | Ver a todos sus practicantes juntos, con su carga y su última actividad. |
| Proyectos          | Tareas               | Tabla                  | Ver y filtrar las tareas de sus proyectos; es su cola de trabajo.        |
| Análisis           | Reportes             | Insights e indicadores | Alertas e indicadores de avance, solo de sus proyectos.                  |

Principios que aplican a todo el panel

- **Solo lo suyo.** Si el Administrador le reasigna un proyecto, deja de aparecer en su panel, pero sus acciones anteriores siguen asociadas a su nombre en el Historial.

- **No gestiona el ciclo de vida de los proyectos ni a las personas:** no crea proyectos, no cambia de supervisor, no asigna ni quita practicantes, y no pausa, finaliza ni reactiva proyectos. Eso es del Administrador; si el Supervisor necesita algo de esto, se lo pide por fuera del sistema (ver sección 15).

- **Aprobar y devolver se hacen solo desde el detalle de la tarea** (ver 6.7).

- **Estado vacío:** un supervisor recién creado no tiene proyectos hasta que el Administrador se los asigne. Su panel lo indica con un solo mensaje (ver 9.1.5).

#### 9.1.1 Módulo Mis proyectos

**Qué muestra**

- **Listado en tarjetas,** con pestañas Activos, En pausa, Finalizados y Todos (abre en “Activos”), en una cuadrícula de 2 o 3 por fila según el ancho, y búsqueda por nombre. Se eligieron tarjetas y no una tabla porque un supervisor tiene pocos proyectos (dos o tres) y la tarjeta muestra mejor el estado de cada uno de un vistazo; el Administrador, que compara muchos, usa tabla.

- **Cada tarjeta muestra:** nombre y código del proyecto con su etiqueta de estado; barra de avance (tareas terminadas sobre el total); practicantes activos (o “Sin practicantes asignados”); **tareas esperando su supervisión**, resaltadas en ámbar solo si hay alguna; y la próxima reunión (o “Sin definir”). Todo el clic de la tarjeta lleva al detalle.

- Las tareas vencidas **no** se muestran en la tarjeta, para que el ámbar quede solo para lo que depende del supervisor; se ven en la pestaña Resumen del detalle.

- Sin columna de supervisor (siempre es él), sin filtro por supervisor y sin botón “Nuevo proyecto”.

- **Detalle con tres pestañas,** igual que el Administrador: **Resumen** (datos del proyecto, indicadores de avance, tareas por estado, tareas vencidas, actividad reciente de su línea de tiempo y enlaces útiles), **Tablero** (el Kanban compartido, sección 6) y **Equipo** (practicantes activos con su carga, y anteriores con sus fechas de alta y baja).

**Qué puede hacer**

- Definir o cambiar la **reunión semanal** del proyecto (se notifica al equipo).

- Agregar, editar y quitar los **enlaces útiles**.

- Cambiar la **rama base** del repositorio.

- Todo lo que le corresponde sobre el tablero y las tareas (sección 6): crear tareas, aprobar, devolver, reabrir, liberar, eliminar y cerrar Pull Requests.

**Qué no puede hacer**

- Crear proyectos; editar nombre, código, descripción, fechas o repositorio; cambiar de supervisor; asignar o quitar practicantes; pausar, reanudar, finalizar o reactivar.

**Reglas**

- Solo aparecen los proyectos que tiene a cargo. En pausa, nadie toma tareas nuevas, pero él puede seguir aprobando y devolviendo lo que ya estaba en revisión. En un proyecto finalizado, el tablero queda en solo lectura.

- Un proyecto sin practicantes muestra “Sin practicantes asignados” y no tiene botón de acción, porque el Supervisor no puede resolverlo.

- **Estado vacío:** sin proyectos, el mensaje indica que el Administrador todavía no le ha asignado ninguno.

#### 9.1.2 Módulo Practicantes a cargo

Es la vista transversal de todos los practicantes de sus proyectos. Se añadió porque la pestaña “Equipo” de cada proyecto muestra a las personas proyecto por proyecto, y un supervisor con dos o tres proyectos necesita una vista que le muestre a todos sus practicantes juntos, con su carga y su última actividad. También le da dónde profundizar en los insights que hablan de personas (practicante inactivo y carga desbalanceada).

**Qué muestra**

- **Listado en tabla** (son varias personas y conviene comparar), con pestañas **Activos** y **Anteriores** (los que ya salieron de sus proyectos, con fecha de baja). Abre en “Activos”.

- **Columnas:** practicante (nombre y correo), especialidad, proyectos suyos en los que participa, carga (tareas “En progreso”), tareas esperando su revisión, última actividad y acceso al detalle. Si un practicante está en dos proyectos del supervisor, aparece una sola fila con ambos, y sus tareas cuentan solo las de los proyectos de este supervisor.

- **Filtros:** proyecto (solo los suyos) y búsqueda por nombre o correo.

- **Detalle del practicante (solo lectura):** datos de contacto (celular, Discord y GitHub), especialidad, **disponibilidad horaria**, **fecha de fin de práctica**, proyectos suyos con sus fechas de alta y baja, tareas actuales y completadas solo en sus proyectos, y línea de tiempo de su actividad en ellos.

**Qué puede hacer y qué no**

- Solo consultar: no edita ningún dato del practicante. No hay botón “Notificar” aquí; la notificación se envía desde el insight de practicante inactivo en Reportes.

- **No ve** el área técnica, la postulación de origen ni los proyectos de otros supervisores: es información de gestión del Administrador. La fecha de fin de práctica es el único dato de gestión que sí ve, porque le sirve para planificar las tareas y porque ya recibe el aviso de “práctica próxima a finalizar”.

- No asigna, quita ni finaliza practicantes, ni restablece contraseñas.

**Reglas**

- Solo aparecen practicantes con asignación activa o anterior en alguno de sus proyectos. Si el Administrador finaliza la práctica de alguien, pasa a “Anteriores” con su historial intacto.

- **Estado vacío:** “Aún no tienes practicantes asignados en tus proyectos”.

#### 9.1.3 Módulo Tareas

Es la misma vista transversal del Administrador (sección 5.5), filtrada a sus proyectos. Es donde vive su cola de revisión: “Por revisar” no es un ítem del menú, sino la pestaña “Esperando supervisión” de este módulo y una tarjeta del Dashboard.

**Qué muestra**

- **Listado** con pestañas Todas, Disponibles, En progreso, **Esperando supervisión** y Terminadas. **Abre en “Esperando supervisión”** si hay tareas ahí; si no, en “Todas”, para que su cola de revisión sea lo primero que ve. La pestaña “Esperando supervisión” lleva contador y se resalta en ámbar solo si tiene tareas.

- **Columnas:** ID, título, proyecto, responsable (o “Sin asignar”), estado, ícono de “Requiere supervisión”, etiqueta del Pull Request, fecha límite (en rojo si está vencida) y acceso al detalle. En la pestaña “Esperando supervisión” se agrega **“Días esperando”**, porque la regla de supervisión demorada (3 días) trata justo de eso.

- **Filtros:** proyecto (solo los suyos), responsable (solo practicantes de sus proyectos), vencidas, sin asignar, “requiere supervisión”, estado del PR y búsqueda por título o ID.

- **Detalle de la tarea:** el componente compartido (sección 5.5).

**Qué puede hacer** (todo desde el detalle, ver 6.7)

- **Crear tareas** (botón “Nueva tarea”, eligiendo uno de sus proyectos), con los campos obligatorios y las dos opciones.

- Editar título, descripción y fecha límite mientras la tarea esté Disponible o En progreso.

- **Aprobar o devolver** (con nota obligatoria) las tareas Esperando supervisión.

- **Reabrir** tareas terminadas (nota obligatoria) y **liberar** tareas en progreso (motivo obligatorio).

- **Eliminar** tareas Disponibles sin PR (motivo y confirmación).

- Cambiar “Requiere supervisión” y “Requiere PR” según las reglas de la sección 6, y **cerrar el PR** (Creado o Con conflictos) con motivo.

**Qué no puede hacer**

- Tomar tareas, enviarlas a revisión o marcarlas como terminadas (son del practicante); crear el Pull Request (lo crea el practicante responsable); ver o buscar tareas de proyectos que no son suyos.

**Reglas**

- **Aprobar y devolver solo desde el detalle,** no con botones en cada fila, para que revise la descripción, el PR y el historial antes de decidir. Si la cola crece demasiado, se podrá añadir un atajo (ver sección 15).

- **Estado vacío** de la pestaña: “No tienes tareas esperando tu supervisión”.

#### 9.1.4 Módulo Reportes

Mismas dos pestañas que el Administrador (sección 5.6), con datos solo de sus proyectos.

**Pestaña “Insights”**

- Tarjetas con severidad, título, motivo con los datos, elemento afectado con enlace, fecha de detección y acciones; mismo orden y filtros (severidad, tipo, proyecto y estado; el filtro de proyecto solo lista los suyos).

- **Reglas que le aplican (5 de 7):** practicante inactivo, carga desbalanceada, posible atraso del proyecto, proyecto sin actividad y supervisión demorada.

- **No le aplican:** “Postulaciones sin decidir” (solo Administrador) y “Fin de práctica” (ya le llega como notificación, y la fecha la ve en el detalle del practicante).

- Los umbrales son los que fija el Administrador en Configuración; el Supervisor no los cambia.

- El insight de **supervisión demorada** trata sobre él mismo: lo ve como recordatorio de sus propias tareas pendientes, no tiene botón “Notificar” (no tendría sentido avisarse a sí mismo) y su detalle lleva directo a la tarea en su cola.

**Pestaña “Indicadores”**

- Selector de periodo (últimos 30 días por defecto) y filtro por proyecto (solo los suyos).

- Tarjetas generales: tareas terminadas, tiempo promedio de ciclo y tasa de devolución. **Sin** “postulaciones decididas” ni “puntaje promedio por área”, porque vienen de postulaciones.

- Tabla por proyecto y **tabla por practicante** (solo los de sus proyectos). La tabla por practicante se mantiene aunque exista “Practicantes a cargo”, porque aporta métricas distintas (tiempo de ciclo y tasa de devolución).

- No incluye el gráfico de practicantes por área, porque el Supervisor no ve el área técnica.

**Qué puede hacer**

- **Ver el detalle** del elemento afectado; **marcar como revisado**, con nota opcional (es independiente del Administrador y reaparece si empeora o a los 7 días); y **notificar** solo en “Practicante inactivo”.

- No cambia umbrales, no exporta, no crea reportes personalizados ni compara practicantes como ranking.

- **Estado vacío:** “No hay alertas en tus proyectos”.

#### 9.1.5 Dashboard

Es la primera pantalla del Supervisor. Como el del Administrador, no calcula nada propio: resume lo que ya existe en los otros módulos, de modo que haya una sola fuente de alertas. Muestra el estado actual, sin selector de periodo ni exportación.

- **Cuatro tarjetas de métricas,** cada una con enlace al módulo con el filtro ya aplicado:

  - **Tareas esperando mi supervisión** (y cuántas llevan más de 3 días). Es la primera y la única que se pinta en ámbar, solo si hay tareas esperando.

  - **Mis proyectos activos** (y cuántos están en pausa).

  - **Practicantes a cargo** activos (y cuántos no tienen tareas en progreso).

  - **Tareas vencidas** en sus proyectos (y cuántas están sin asignar). Se pinta en rojo solo si hay alguna.

- **Por revisar:** las cinco tareas que más tiempo llevan esperando su supervisión, con ID, título, proyecto, responsable, días esperando y acceso al detalle (donde decide). Es su cola de trabajo, por eso va en el lugar más visible.

- **Alertas:** los insights vigentes de sus proyectos (primero críticos, luego de atención, hasta cinco), cada uno con sus acciones. Son los mismos de Reportes.

- **Próximas reuniones:** la reunión semanal de cada proyecto (día, hora y proyecto), o “Sin definir”. Es un dato propio del Supervisor, que es quien organiza las reuniones.

- **Avance de mis proyectos:** barras con el avance de cada proyecto activo (equivale al gráfico “Practicantes por área” del Administrador, que aquí no aplica).

**Qué no incluye:** selector de periodo, exportación, feed de actividad (duplicaría el historial de cada proyecto) ni postulaciones.

**Reglas:** si no hay tareas por revisar o alertas, cada bloque muestra un mensaje que lo indica (“No tienes tareas esperando tu supervisión”, “No hay alertas en tus proyectos”). **Estado vacío total** (recién creado, sin proyectos): en lugar de las tarjetas, un solo mensaje: “El Administrador aún no te ha asignado proyectos”.

### 9.2 Panel del Practicante

El Practicante ve y trabaja solo en los proyectos a los que está asignado. Como en la práctica participa en uno o dos proyectos, el panel es el más corto del sistema: tres ítems, sin grupos en el menú. No existe un módulo de tareas aparte: el tablero vive dentro de cada proyecto, y la vista de sus tareas en curso está en el Inicio.

| **Orden en el menú** | **Módulo**    | **Formato**        | **Para qué sirve**                                                                   |
|----------------------|---------------|--------------------|--------------------------------------------------------------------------------------|
| 1.º                  | Inicio        | Tarjetas y bloques | Resume su carga, sus tareas en curso, los Pull Requests por atender y las reuniones. |
| 2.º                  | Mis proyectos | Tarjetas           | Puerta de entrada al trabajo: sus proyectos, su tablero y su equipo.                 |
| 3.º                  | Mi historial  | Tabla              | Consultar las tareas que terminó, de todos sus proyectos.                            |

Principios que aplican a todo el panel

- **Solo lo suyo y lo de su equipo.** Ve el tablero completo de sus proyectos (porque el pool de tareas disponibles es lo que necesita para tomar trabajo), pero solo actúa sobre las tareas Disponibles (tomar) y sobre las propias.

- **Privacidad de los compañeros.** De los demás practicantes ve solo nombre, especialidad, carga actual, Discord y GitHub. No ve correo, celular ni historial ajeno.

- **Tareas ajenas en solo lectura.** Puede abrir el detalle de la tarea de un compañero para coordinarse y no duplicar trabajo, pero sin botones de acción.

- **Todas las acciones se ejecutan desde el detalle de la tarea** (ver 6.7), incluida “Tomar”. No hay botones de acción en las tarjetas ni en el Inicio.

#### 9.2.1 Módulo Mis proyectos

**Listado**

- **Tarjetas,** como en el panel del Supervisor. Como tiene uno o dos proyectos, **no lleva pestañas ni búsqueda.** Muestra los proyectos con asignación activa, tanto Activos como En pausa.

- **Cada tarjeta muestra:** nombre y código con su etiqueta de estado, el supervisor, mi carga en ese proyecto (mis tareas en progreso), las tareas disponibles para tomar, la barra de avance y la próxima reunión (o “Sin definir”).

- **Sección “Anteriores”:** debajo de las tarjetas activas, solo si existe alguno. Incluye los proyectos Finalizados y aquellos de los que el practicante salió (asignación con fecha de baja). Cada tarjeta se ve atenuada y muestra nombre, código, la etiqueta “Finalizado” o “Ya no participas”, el supervisor y el periodo en que participó (fecha de alta y de baja o de finalización), sin barra de avance, carga ni reunión.

- **Acceso bloqueado a un proyecto anterior:** el clic no abre el tablero ni el equipo, sino un **resumen mínimo de solo lectura** con los datos del proyecto, su periodo de participación y el número de tareas que terminó ahí, con un enlace a Mi historial filtrado por ese proyecto. Si el Administrador reactiva un proyecto finalizado y la asignación del practicante sigue vigente, el proyecto vuelve a la lista de activos con acceso normal.

- **Estado vacío:** “Aún no tienes proyectos asignados. El Administrador te asignará uno”.

**Detalle de un proyecto vigente, con tres pestañas**

- **Resumen (solo lectura):** descripción, fechas, supervisor, reunión semanal y enlaces útiles; repositorio y rama base (los necesita para crear el PR); avance del proyecto; mis tareas del proyecto (con las vencidas en rojo); y **mi actividad** en el proyecto, sin la del resto del equipo.

- **Tablero:** las cuatro columnas del Kanban compartido (sección 6.8), con el filtro “Solo mis tareas”. Las tarjetas ajenas muestran ID, título, responsable, fecha límite y etiquetas; las propias agregan la marca “Devuelta con observaciones” si corresponde. Un clic en cualquier tarjeta abre el detalle, que en las tareas ajenas es de solo lectura. La columna “Terminada” muestra las 5 más recientes, con “Ver todas las terminadas”.

- **Equipo:** los compañeros activos con nombre, especialidad, carga, Discord y GitHub, y el supervisor con su Discord y GitHub (no su celular). No se muestran compañeros anteriores.

**Qué puede hacer** (siempre desde el detalle de la tarea)

- **Tomar** una tarea Disponible; **liberar** la propia; **enviarla a supervisión** o **marcarla como terminada**, según la opción de la tarea.

- **Crear y cerrar el Pull Request** de sus tareas, y marcar “No requiere PR” con un motivo.

**Qué no puede hacer**

- Crear, editar, eliminar, aprobar, devolver o reabrir tareas; editar la reunión, los enlaces o la rama base; asignar o quitar compañeros.

**Reglas**

- **Proyecto en pausa:** no puede tomar tareas nuevas, pero sigue trabajando en las suyas.

- **Proyecto finalizado o salida del proyecto:** el acceso al tablero y al equipo se bloquea, el proyecto pasa a “Anteriores” y sus tareas terminadas siguen en Mi historial.

#### 9.2.2 Módulo Mi historial

**Qué muestra**

- **Listado en tabla** de **todas las tareas terminadas por el practicante**, de todos sus proyectos (activos, finalizados o de los que salió), de la más reciente a la más antigua.

- **Columnas:** ID, título, proyecto, fecha de término, número de veces devuelta, etiqueta final del Pull Request y acceso al detalle. El dato “veces devuelta” es una columna de este listado; las devoluciones también aparecen en la línea de tiempo de cada tarea y en la tasa de devolución de Reportes, de modo que no es un dato privado del practicante.

- **Filtros:** proyecto (incluye los anteriores) y búsqueda por título o ID. Sin pestañas ni selector de periodo, porque con un ciclo de unos 4 meses el listado no crece tanto.

- **Detalle:** el componente compartido, en solo lectura, con su línea de tiempo (tomada, enviada, devuelta, aprobada, etc.). También se llega desde el resumen mínimo de un proyecto anterior, con el filtro ya aplicado.

**Qué puede hacer y qué no incluye**

- Solo consultar: no hay acciones en el historial. Reabrir es del Supervisor o del Administrador; el PR de una tarea terminada, si está Creado o Con conflictos, se gestiona desde el detalle normal mientras el proyecto siga activo.

- No incluye tareas de otros practicantes, estadísticas ni comparaciones (eso queda en Reportes del Administrador y del Supervisor).

**Reglas**

- **Las tareas liberadas no aparecen:** solo cuentan las que llegaron a “Terminada” con él como responsable.

- **Tarea reabierta:** sale del historial mientras esté En progreso y vuelve al terminarse de nuevo, conservando la línea de tiempo completa.

- **Proyecto finalizado:** el detalle se abre en solo lectura y sin acciones.

- **Estado vacío:** “Aún no has terminado tareas”.

#### 9.2.3 Módulo Inicio

Es la primera pantalla del Practicante. Como los dashboards de los otros dos paneles, no calcula nada propio: resume lo que ya existe en Mis proyectos y en las tareas. No incluye selector de periodo, exportación, feed de actividad ni notificaciones (las cubre la campana de la barra superior).

- **Cuatro tarjetas de métricas,** cada una con enlace a lo que cuenta:

  - **Mis tareas en progreso:** el indicador de carga (sin límite). No lleva color.

  - **Devueltas con observaciones:** cuántas de sus tareas le devolvió el supervisor. Es la única tarjeta que se pinta en rojo, y solo si hay alguna.

  - **Esperando supervisión:** sus tareas que están en revisión. Es información, no una acción suya, así que va neutra.

  - **Disponibles para tomar:** tareas Disponibles en sus proyectos activos (no cuentan los proyectos en pausa).

- **Mis tareas en curso:** todas sus tareas En progreso, de todos sus proyectos. Columnas: ID, título, proyecto, fecha límite (en rojo si venció), marca “Devuelta con observaciones” y acceso al detalle. Orden: primero las devueltas, luego las vencidas y luego por fecha límite. Reemplaza a la vista transversal “Mis tareas” que se fusionó con Mis proyectos.

- **Pull Requests por atender:** sus tareas con etiqueta **Pendiente** (falta crearlo) o **Con conflictos** (hay que resolverlos). Cada fila lleva al detalle, donde crea el PR o ve el conflicto. Este bloque consulta el estado del PR (\`estado_pr\`), no el estado del Kanban, porque incluye tareas Esperando supervisión o Terminada.

- **Próximas reuniones:** la reunión semanal de cada proyecto activo (día, hora y proyecto), o “Sin definir”.

**Qué puede hacer:** solo navegar. Todo clic lleva al detalle de la tarea o al proyecto; no hay botones de acción en el Inicio.

**Reglas**

- Sin tareas en curso, el bloque muestra “No tienes tareas en progreso” y, si hay Disponibles, un enlace “Ver tareas disponibles” que lleva a Mis proyectos. Sin PR por atender: “No tienes Pull Requests pendientes”.

- En un proyecto en pausa, sus tareas En progreso siguen apareciendo, pero sus Disponibles no cuentan.

- **Estado vacío total** (sin proyectos asignados): un solo mensaje, “Aún no tienes proyectos asignados. El Administrador te asignará uno”, sin tarjetas en cero.

- La franja de contraseña temporal aparece encima, como en todas las pantallas.

## 10. Componentes de Inteligencia Artificial y automatización

En cumplimiento de los lineamientos de la carrera de Ingeniería de Software con IA, el proyecto incorpora los siguientes tres componentes, con distinto nivel de implementación según su naturaleza:

| **Componente**                        | **Tipo de entregable**                                               | **Justificación del alcance**                                                                                                                                                                                                                                         |
|---------------------------------------|----------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Ranking de CVs por IA**             | Prototipo con respuestas simuladas (demostración del funcionamiento) | Es el componente central de IA del proyecto. Su diseño está completo (criterios, pesos, puntaje, justificación y decisión humana). Como el prototipo es solo de interfaz, el análisis se simula sobre datos de ejemplo y muestra cómo funcionaría en el sistema real. |
| **Insights de rendimiento**           | Prototipo con datos de ejemplo                                       | Corresponde a análisis de datos sobre el propio modelo mediante siete reglas explicables, por lo que no requiere un modelo de IA. Se prioriza el diseño de las vistas.                                                                                                |
| **Integración GitHub (Pull Request)** | Documentado y diagramado, sin implementación                         | Requiere acceso real a un repositorio y configuración de permisos externos, fuera del alcance de un prototipo de diseño; se sustenta como propuesta técnica justificada (sección 7).                                                                                  |

### 10.1 Ranking de CVs: cómo funcionaría en un entorno real

- Llega una postulación con su CV.

- El backend envía el CV y los criterios del área y de la especialidad al modelo de lenguaje.

- El modelo evalúa cada criterio por separado: si se cumple y una observación breve.

- El **sistema** (no el modelo) calcula el puntaje con los pesos y la proporción entre área y especialidad, y coloca la marca “Requiere revisión manual” según las reglas. Que el modelo juzgue criterio por criterio y el sistema haga la suma hace que el puntaje sea explicable y repetible; si el modelo diera el número directamente, no respetaría los pesos y variaría entre ejecuciones.

- El Administrador ve el resultado, lo contrasta con el CV y decide. La IA nunca aprueba ni rechaza.

Un CV contiene datos personales, por lo que, en un entorno real, hay que considerar la normativa de protección de datos y avisar al postulante que su información se usa únicamente para evaluar su postulación y no para otros fines. En el prototipo no hay modelo real: una función con los criterios y pesos calcula el puntaje y genera la justificación sobre datos de ejemplo, con una breve espera visible (“Analizando…”).

### 10.2 Insights y Pull Request

Los **insights** son reglas calculadas sobre los datos del sistema, con umbrales ajustables (sección 5.6). No usan un modelo de IA: son análisis de datos que convierten el historial en alertas accionables, y el Administrador y el Supervisor los ven con el alcance de cada rol. La **integración con GitHub** se describe en la sección 7.

## 11. Modelo de datos preliminar

Entidades principales, incluidas las que soportan el ranking de CVs con IA, el tablero de tareas, el Pull Request, el historial y las notificaciones. Los nombres de los campos son preliminares y se fijarán en el diagrama entidad-relación. Los campos marcados como **(nuevo en v6)** se añadieron al definir los paneles del Supervisor y del Practicante.

| **Entidad**                       | **Atributos principales**                                                                                                                                                                                                                                                                          | **Relaciones**                                                                                                                                                                             |
|-----------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Postulante**                    | nombre, correo, celular, id_area_tecnica (FK), id_especialidad (FK), fecha_postulacion, CV (archivo), estado (pendiente / aprobada / rechazada)                                                                                                                                                    | 1 postulante → 0..1 usuario Practicante (al ser aprobado); 1 postulante → 0..1 PostulacionEvaluacion                                                                                       |
| **Usuario**                       | nombre, correo (login), contraseña, rol, estado (activo / inactivo; en practicantes se presenta como “Finalizado”), debe_cambiar_contrasena                                                                                                                                                        | Tabla base; 1 usuario → 0..1 Practicante o Supervisor (detalle)                                                                                                                            |
| **Practicante (detalle)**         | id_usuario (FK), celular, discord, cuenta_github, disponibilidad_horaria, id_area_tecnica (FK), id_especialidad (FK), fecha_ingreso, fecha_fin_prevista, id_postulante (FK, origen)                                                                                                                | N practicantes → N proyectos (vía Asignación)                                                                                                                                              |
| **Supervisor (detalle)**          | id_usuario (FK), celular, discord, cuenta_github                                                                                                                                                                                                                                                   | 1 supervisor → N proyectos                                                                                                                                                                 |
| **Proyecto**                      | nombre, codigo (3–5 caracteres, único), descripción, fecha_inicio, fecha_fin_prevista, **fecha_fin_real (nuevo en v6; nula hasta que se finaliza)**, estado (activo / en pausa / finalizado), dia_reunion y hora_reunion (opcionales), repositorio_url, rama_base, id_supervisor (FK)              | 1 proyecto → 1 supervisor; 1 proyecto → N practicantes (vía Asignación); 1 proyecto → N tareas y N enlaces                                                                                 |
| **EnlaceProyecto**                | id_proyecto (FK), nombre, url                                                                                                                                                                                                                                                                      | N enlaces → 1 proyecto. Es una entidad aparte porque un proyecto puede tener cualquier cantidad de enlaces.                                                                                |
| **Asignación**                    | id_practicante (FK), id_proyecto (FK), fecha_alta, fecha_baja (nula mientras sigue en el proyecto)                                                                                                                                                                                                 | Tabla intermedia practicante–proyecto. Nunca se borra; volver a un proyecto crea una asignación nueva. Finalizar un proyecto no cierra sus asignaciones.                                   |
| **Tarea**                         | numero (correlativo dentro del proyecto), título, descripción, fecha_limite, id_proyecto (FK), id_practicante (FK, nulo si Disponible), estado, requiere_supervision, requiere_pr, estado_pr, rama_origen, rama_base, url_pull_request, **fecha_termino (nuevo en v6; nula si no está Terminada)** | N tareas → 1 proyecto; N tareas → 0..1 practicante. Se identifica como codigo-numero (por ejemplo, PL2D-018). Las observaciones del supervisor se guardan como eventos del historial.      |
| **AreaTecnica**                   | nombre (Software, Videojuegos, ...), activo                                                                                                                                                                                                                                                        | 1 área → N especialidades; 1 área → N criterios; 1 área → N postulantes                                                                                                                    |
| **Especialidad**                  | id_area_tecnica (FK), nombre (Frontend, Backend, ...), activo                                                                                                                                                                                                                                      | N especialidades → 1 área; 1 especialidad → N criterios                                                                                                                                    |
| **CriterioEvaluacion**            | id_area_tecnica (FK), id_especialidad (FK, nulo si es general del área), nombre, tipo (tecnología / académico / disponibilidad / palabra_clave), peso, obligatorio, activo                                                                                                                         | Configurable por el Administrador; los pesos de cada bloque (área y especialidad) suman 100                                                                                                |
| **PostulacionEvaluacion**         | id_postulante (FK), puntaje_area, puntaje_especialidad, puntaje_total, justificacion, requiere_revision_manual, fecha_evaluacion                                                                                                                                                                   | 1 evaluación → 1 postulante; 1 evaluación → N detalles                                                                                                                                     |
| **PostulacionEvaluacion_Detalle** | id_evaluacion (FK), id_criterio (FK), nombre_criterio y peso (copia al momento de evaluar), cumplido, puntaje_obtenido, observacion                                                                                                                                                                | Desglose del puntaje por criterio. Guarda una copia del criterio para que cambiarlo después no altere evaluaciones pasadas.                                                                |
| **EventoHistorial**               | fecha, id_autor (FK, o “Sistema”), tipo_accion, tipo y referencia del elemento afectado, etiqueta del elemento (copia del ID y título), id_proyecto (opcional), cambios (campo, valor anterior, valor nuevo), nota                                                                                 | Registro permanente; no se edita ni se borra                                                                                                                                               |
| **Notificacion**                  | id_destinatario (FK), tipo, mensaje, referencia al elemento, fecha, leida                                                                                                                                                                                                                          | N notificaciones → 1 usuario                                                                                                                                                               |
| **InsightRevision**               | tipo_regla, referencia al elemento, severidad_al_revisar, fecha, id_usuario (FK), nota                                                                                                                                                                                                             | Permite que un insight revisado reaparezca si empeora. Al guardar el usuario, el estado “revisado” es independiente por persona (el Supervisor y el Administrador no se afectan entre sí). |
| **ParametroConfiguracion**        | clave, valor, valor_predeterminado                                                                                                                                                                                                                                                                 | Parámetros de la sección 5.8                                                                                                                                                               |

**Nota de diseño:** los criterios de evaluación, las áreas y las especialidades se modelan como tablas configurables (no como campos fijos), de modo que el Administrador pueda agregar, modificar o desactivar criterios sin requerir cambios en el sistema. El detalle de la evaluación permite justificar el puntaje criterio por criterio, evitando que el resultado de la IA funcione como una “caja negra” y dejando la decisión final en manos del Administrador. Los insights no se guardan: se calculan sobre los datos cada vez que se consultan.

**Valores que se calculan y no se guardan:** los “días esperando” de una tarea en supervisión, el número de veces que fue devuelta, la carga de un practicante (tareas “En progreso”) y los indicadores de Reportes salen de los eventos del Historial y de los estados actuales. Se guardan **fecha_termino** (para ordenar la columna “Terminada” y Mi historial sin recorrer eventos) y **fecha_fin_real** del proyecto (para mostrar el periodo de participación de un practicante en un proyecto finalizado).

## 12. Flujo general del sistema

- El postulante llena el formulario del sitio web de CODAINI, indicando su área técnica y su especialidad; el registro se guarda automáticamente en Postulaciones.

- La IA evalúa el CV contra los criterios del área y de la especialidad, y genera un puntaje con su desglose; marca “Requiere revisión manual” cuando corresponde.

- El Administrador revisa el listado (ordenado por puntaje) y aprueba o rechaza; la decisión siempre es suya.

- Al aprobar, el sistema crea la cuenta del practicante con una contraseña temporal, que el Administrador le entrega por fuera del sistema. El practicante la cambia al ingresar.

- El Administrador crea un Proyecto (con su código, repositorio y rama base) y le asigna un Supervisor; luego asigna practicantes, empezando por los que están “Sin proyecto”.

- El Supervisor (o el Administrador) crea tareas con su descripción y fecha límite, y marca cuáles requieren supervisión. Todas quedan “Disponibles”, sin dueño.

- Los practicantes abren una tarea disponible, la toman y la trabajan. Si la tarea requiere supervisión, la envían a revisión; si no, la marcan como terminada.

- El Supervisor abre la tarea desde su cola “Esperando supervisión” y la aprueba (pasa a “Terminada”) o la devuelve con observaciones (vuelve a “En progreso”).

- Con la tarea en “Esperando supervisión” o “Terminada”, el practicante crea el Pull Request desde el sistema; la revisión y la fusión se hacen en GitHub.

- Cada acción queda en el Historial de actividad y genera las notificaciones correspondientes.

- El Administrador y los supervisores consultan Reportes, con sus insights; el Dashboard resume lo más urgente. Cuando el Supervisor considera que un proyecto terminó, se lo avisa al Administrador, quien lo evalúa y lo finaliza.

- Al terminar el ciclo (alrededor de 4 meses), el Administrador finaliza la práctica: se bloquea el acceso, se liberan las tareas en progreso y se conserva todo el historial para el siguiente grupo.

## 13. Diseño visual del sistema

La interfaz busca verse sobria y profesional, como una herramienta de trabajo, y no como una página promocional. Parte de la identidad de CODAINI (azul profundo, verde esmeralda y gris pizarra) pero la usa con medida: el verde es el único color de acción y el resto de la interfaz es neutro. Se descartó el verde neón y cian brillante del sitio web de la empresa, porque no resulta adecuado para un sistema de uso diario. Se evitan también los degradados, los brillos, los efectos de vidrio y las sombras fuertes. Esta propuesta se validó con pantallas de referencia del Dashboard, el detalle de una postulación y el tablero Kanban, en tema claro y oscuro. La fuente única de estilos para el desarrollo es el archivo de especificación visual (Especificacion_visual_SIGEP).

### 13.1 Paleta de colores

El sistema ofrece tema claro y tema oscuro, que el usuario elige con el botón de la barra superior. En ambos, la interfaz tiene tres capas de tono: el fondo de la aplicación, las superficies (barra lateral, barra superior, tarjetas y tablas) y un tono intermedio para pasar el cursor y las cabeceras de tabla. Esa separación por capas, con bordes finos en lugar de sombras, es lo que da el efecto de tarjetas.

| **Uso**                                       | **Tema claro** | **Tema oscuro** |
|-----------------------------------------------|----------------|-----------------|
| Fondo de la aplicación                        | **\#F7F9FC**   | **\#0F141B**    |
| Superficies (barras, tarjetas, tablas)        | **\#FFFFFF**   | **\#181E27**    |
| Cabecera de tablas y cursor sobre un elemento | **\#F0F3F8**   | **\#1F2733**    |
| Bordes                                        | **\#E1E6EF**   | **\#283241**    |
| Texto principal                               | **\#0A192F**   | **\#E6E9EF**    |
| Texto secundario                              | **\#5B6785**   | **\#9BA3B2**    |
| Botón principal y acento                      | **\#58C481**   | **\#58C481**    |
| Texto sobre el botón principal                | **\#0A192F**   | **\#0F141B**    |
| Enlaces y texto verde                         | **\#14804E**   | **\#7FD9A3**    |
| Rechazo, errores y atrasos (rojo)             | **\#D64545**   | **\#D64545**    |

*El verde claro \#58C481 no se usa como texto sobre fondo claro por su bajo contraste; para eso se usa un verde más oscuro (#14804E). El contraste de los textos se verificará antes de cerrar el diseño.*

### 13.2 Colores de estado

Cada estado se muestra como una pequeña etiqueta: en tema claro, con fondo suave y texto oscuro; en tema oscuro, con fondo translúcido del color base y texto claro. Los mismos colores se usan en todo el sistema, de modo que el color significa siempre lo mismo.

| **Estado de la tarea**         | **Color base** | **Uso**                                                        |
|--------------------------------|----------------|----------------------------------------------------------------|
| **Disponible**                 | **\#8892B0**   | Gris pizarra                                                   |
| **En progreso**                | **\#3B7DDD**   | Azul                                                           |
| **Esperando supervisión**      | **\#F2B01E**   | Ámbar                                                          |
| **Terminada**                  | **\#58C481**   | Verde                                                          |
| **Devuelta con observaciones** | **\#D64545**   | Rojo; es una marca sobre una tarea “En progreso”, no un estado |

- **Postulaciones:** Pendiente en azul, Aprobada en verde, Rechazada en rojo, y la marca “Requiere revisión manual” en ámbar.

- **Proyectos:** Activo en verde, En pausa en ámbar y Finalizado en gris pizarra.

- **Pull Request:** Pendiente en ámbar, Creado en azul, Con conflictos en rojo, Fusionado en verde y Cerrado en gris.

- **El rojo se reserva** para acciones de rechazo o eliminación, errores de formulario, alertas de atraso y la marca “Devuelta con observaciones”. No existe un “estado de error” en las tareas. No se muestran a la vez un aviso rojo y uno ámbar por lo mismo.

### 13.3 Tipografía

Los títulos y la marca usan **Montserrat** (la tipografía oficial de CODAINI), en peso SemiBold o Bold. El resto de la interfaz (cuerpo de texto, tablas, formularios y botones) usa **Inter**, una tipografía diseñada para pantallas que se lee mejor en tamaños pequeños y con números en columnas. Los tamaños base son 14 px para el cuerpo y 24 px para los títulos de página, y no se usan tamaños menores a 12 px.

### 13.4 Estructura y elementos de la interfaz

- **Menú lateral** agrupado por etiquetas pequeñas (como en las secciones 5 y 9), con el elemento activo resaltado con un relleno verde suave. El menú de cada rol contiene solo los módulos de su panel.

- **Barra superior** con la ruta de navegación, el botón de tema, la campana de notificaciones y el menú del usuario.

- **Tarjetas de métricas** con un número grande, un título y una sola línea de apoyo; los íconos van en gris neutro y solo la tarjeta que pide atención lleva color.

- **Tarjetas de proyecto** (paneles del Supervisor y del Practicante): borde de 1 px y esquinas de 10 px, sin sombras. Las de proyectos anteriores se ven atenuadas y sin barra de avance.

- **Esquinas** de 6 px en botones y campos, y de 10 px en tarjetas y ventanas; **bordes** de 1 px; íconos de línea fina.

- **Logo:** el isotipo de CODAINI (arcos concéntricos en forma de “C”) es negro, por lo que se muestra siempre dentro de un pequeño recuadro blanco, en ambos temas, para no alterar la identidad de la marca. Aparece una sola vez, arriba del menú lateral.

## 14. Tecnologías y organización del prototipo

### 14.1 Tecnologías

- **React con TypeScript, construido con Vite.** TypeScript permite describir las entidades y reglas del modelo con tipos, lo que reduce errores en un sistema con tantas reglas de estado.

- **Tailwind CSS (v4)** para los estilos. Los colores de la sección 13 se registran como variables, y el cambio entre tema claro y oscuro (atributo data-theme) consiste en cambiar esas variables, sin reescribir los componentes.

- **Tablero Kanban sin librería de arrastre:** como los estados cambian con botones y no arrastrando, el tablero es solo cuatro columnas que filtran las tareas por estado.

- **Librerías complementarias (confirmadas):** shadcn/ui (componentes accesibles), Zustand (estado), React Hook Form con Zod (formularios y validación), Recharts (gráficos), date-fns (fechas) y Lucide (íconos).

- **Nombres de dominio en español y sin tildes** (por ejemplo, Proyecto, Tarea, EN_PROGRESO), para que el código sea coherente con el modelo y con el lenguaje de la empresa.

### 14.2 Organización de las carpetas

El proyecto se organiza por panel: lo que usa un solo panel vive dentro de él, y lo que usan dos o más sube a una carpeta compartida. Se empieza dentro del panel y se mueve a lo compartido cuando aparece el segundo uso.

| **Carpeta**                                        | **Para qué sirve**                                                                                                                                                                                                                                                                                                             |
|----------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **paneles/administrador, supervisor, practicante** | Pantallas y componentes propios de cada panel. Dentro del Administrador hay una carpeta por módulo, porque es el más grande.                                                                                                                                                                                                   |
| **compartido/**                                    | Piezas usadas por varios paneles: componentes base, el tablero Kanban, el detalle de tarea, las etiquetas de estado, las tarjetas de métricas y utilidades.                                                                                                                                                                    |
| **domain/**                                        | Las reglas del sistema, sin pantallas ni datos: los tipos de cada entidad; las transiciones de estado de tareas y postulaciones y quién puede hacerlas; el cálculo del puntaje; las reglas de los insights; y los permisos por rol. Son lo más importante de probar y, con backend, se reutilizan como contrato.               |
| **services/**                                      | La “API” simulada: una función por acción (por ejemplo, tomar tarea o aprobar postulación). Cada una consulta las reglas de domain/, modifica los datos, registra el historial, crea las notificaciones y simula la demora de red. Las pantallas solo llaman a estas funciones; con backend real, solo se reemplaza esta capa. |
| **data/**                                          | La “base de datos” falsa: los datos de ejemplo y el almacén que los guarda en el navegador, con la función de restablecerlos.                                                                                                                                                                                                  |
| **auth/**                                          | Quién es el usuario: la pantalla de acceso, la sesión, y la guarda de rutas que impide entrar a paneles de otro rol.                                                                                                                                                                                                           |
| **app/**                                           | El armazón: rutas principales, redirección por rol, tema claro/oscuro, avisos emergentes y estilos globales.                                                                                                                                                                                                                   |

Un ejemplo de cómo se conectan: cuando un practicante pulsa “Tomar tarea” en el detalle, la pantalla llama a la función de services/; esta pregunta a domain/ si esa persona puede hacerlo; si puede, cambia la tarea en data/, anota el historial y crea la notificación; y la pantalla se actualiza moviendo la tarjeta a su columna.

### 14.3 Datos simulados y acceso

- **Datos de ejemplo coherentes entre sí:** unos 24 practicantes, 3 supervisores, 5 proyectos, alrededor de 40 tareas, unas 18 postulaciones y 4 áreas técnicas con sus especialidades y criterios. Deben incluir casos para demostrar los estados vacíos y los proyectos anteriores de un practicante. Las fechas se generan relativas al día actual (“hace 3 días”), para que la demostración nunca se vea vencida.

- **Persistencia en el navegador:** los cambios sobreviven al recargar la página, y un botón en Configuración restablece los datos originales (marcado como “solo prototipo”). Sirve también para presentar el sistema a la empresa.

- **Ranking de CVs:** una función calcula el puntaje con los criterios y pesos reales y genera la justificación; los insights se calculan con reglas reales sobre los datos de ejemplo.

- **Acceso simulado:** una pantalla de ingreso con correo y contraseña de demostración, más botones de acceso rápido por rol (“Entrar como Administrador / Supervisor / Practicante”), para presentar sin fricción. La sesión se guarda en el navegador, sin credenciales reales, y un aviso discreto indica “Prototipo: autenticación simulada”.

### 14.4 Qué se reutiliza entre paneles

Para no duplicar trabajo, varias pantallas se construyen una sola vez y cada panel las usa con su propio alcance y sus propios botones.

| **Pantalla**                                                  | **Administrador**                   | **Supervisor**                                      | **Practicante**                                               |
|---------------------------------------------------------------|-------------------------------------|-----------------------------------------------------|---------------------------------------------------------------|
| **Resumen inicial**                                           | Dashboard (propio)                  | Dashboard (propio)                                  | Inicio (propio)                                               |
| **Listado de proyectos**                                      | Tabla con todos                     | Tarjetas, solo los suyos                            | Tarjetas simples, solo los asignados                          |
| **Detalle del proyecto** (Resumen, Tablero, Equipo)           | Completo, con gestión               | Mismo detalle, sin acciones de gestión              | Versión de solo lectura; el tablero con sus acciones          |
| **Tablero Kanban**                                            | Compartido                          | Compartido                                          | Compartido, con filtro “Solo mis tareas”                      |
| **Detalle de tarea**                                          | Compartido                          | Compartido                                          | Compartido (solo lectura en tareas ajenas)                    |
| **Listado de tareas**                                         | Módulo Tareas                       | Mismo componente, filtrado a sus proyectos          | No tiene (usa Inicio y Mis proyectos)                         |
| **Personas**                                                  | Módulos Practicantes y Supervisores | Practicantes a cargo (pantalla nueva, solo lectura) | Pestaña Equipo del proyecto                                   |
| **Reportes**                                                  | Completo                            | Mismo componente, filtrado a sus proyectos          | No tiene                                                      |
| **Historial**                                                 | Vista global                        | Líneas de tiempo de sus proyectos                   | Líneas de tiempo de lo suyo; Mi historial (tareas terminadas) |
| **Notificaciones, Mi perfil y franja de contraseña temporal** | Compartidos                         | Compartidos                                         | Compartidos                                                   |

## 15. Mejoras futuras (fuera del alcance actual)

- Implementación del backend real del sistema (servidor, base de datos y autenticación) y su puesta en producción.

- Integración real del ranking de CVs con un modelo de lenguaje, ejecutada desde el backend, con aviso al postulante sobre el uso de sus datos.

- Implementación real de la integración con GitHub (listado de ramas, creación y cierre de Pull Requests, y actualización automática de su estado mediante webhooks).

- Notificaciones por correo electrónico o WhatsApp, y verificación del correo al cambiarlo.

- Exportación de reportes y resumen en lenguaje natural de los insights.

- Rediseño del formulario público de postulación del sitio web de CODAINI.

- Solicitud de reuniones por parte del practicante; cálculo de nota formal; portafolio enriquecido; chat por tarea; portal de clientes externos.

- Foto de perfil, preferencias de notificación y verificación en dos pasos.

- Reentrenamiento o ajuste fino del modelo de IA con datos históricos propios de CODAINI.

- **Solicitar un practicante** al Administrador desde el sistema (hoy el Supervisor lo pide por fuera, por Discord).

- **Avisar al Administrador desde el sistema** que un proyecto terminó o debe pausarse, para que lo evalúe y lo finalice.

- **Atajo para aprobar desde el listado** de tareas, solo si la cola de revisión del Supervisor crece mucho.

## 16. Próximos pasos sugeridos

- Compartir este documento con la compañera de tesis como fuente única de las reglas de negocio, y validarlo con el asesor y con la empresa CODAINI.

- **Consultar al asesor:** si el ranking de CVs simulado cumple la exigencia de incorporar IA en un proyecto de diseño; si el título o los objetivos deben mencionar la IA; y si un prototipo en React sigue siendo “Diseño”. Conviene saberlo antes de construir los tres paneles completos.

- **Confirmar con CODAINI** si el proyecto sigue en pie (hay tres grupos con el mismo tema) y revisar su hoja de cálculo (por ejemplo, el campo “ROL”) para fijar el catálogo inicial de especialidades.

- Armar el archivo de reglas del proyecto para el agente de desarrollo (convenciones, qué no construir —sprints, prioridades, cupos, entre otros—, de dónde salen los datos y los tokens visuales) y el plan de desarrollo por fases.

- Elaborar el diagrama entidad-relación completo (con la relación Supervisor 1:N Proyecto) y las historias de usuario por módulo y por rol.

- Construir el prototipo navegable en React con TypeScript (solo frontend, con datos simulados), por fases: base técnica y tema visual; reglas, datos y servicios con sus pruebas; acceso y estructura; componentes compartidos; panel del Administrador por módulos; panel del Supervisor; panel del Practicante; y pulido, con especial cuidado en el flujo de tareas y Pull Requests.

- Verificar el contraste de los colores de texto en ambos temas durante la primera fase.

- Simular el ranking de CVs con respuestas de ejemplo (puntaje, justificación y desglose por criterio) que demuestren cómo funcionaría en el sistema real.

## Anexo A. Cambios respecto a la versión 5

| **Sección**                                     | **Cambio**                                                                                                                                                                                                                                                                                                                                                                                     |
|-------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **3. Alcance**                                  | El estado de la definición se actualiza: los tres paneles y la matriz de permisos están completos. Se agrega a lo que queda fuera de alcance las solicitudes del Supervisor al Administrador.                                                                                                                                                                                                  |
| **4. Actores y matriz de permisos**             | La matriz se completa con las columnas del Supervisor y el Practicante, y se reorganiza en cuatro tablas. Filas nuevas: editar tarea, ver detalle de tareas ajenas, definir reunión, gestionar enlaces, pausar o finalizar proyecto, asignar practicantes, ver Reportes, marcar insights y notificar desde un insight. Regla nueva: las acciones sobre una tarea se ejecutan desde su detalle. |
| **5.3, 5.4, 5.5 y 5.8**                         | Precisiones: el proyecto reasignado sale del panel del supervisor anterior; el Administrador también puede definir la reunión; finalizar un proyecto no cierra las asignaciones y guarda la fecha real de finalización; la edición de tareas queda limitada a Disponible y En progreso; los umbrales de Configuración aplican también a los insights del Supervisor.                           |
| **5.6 Reportes**                                | El estado “revisado” de un insight es independiente por persona.                                                                                                                                                                                                                                                                                                                               |
| **6.2, 6.4 y 6.7**                              | Cambio de regla: **la edición de tareas ya no se permite hasta “Terminada”,** sino solo en Disponible y En progreso. Nueva sección 6.7: aprobar, devolver, tomar y todas las demás acciones se ejecutan solo desde el detalle de la tarea, nunca desde tarjetas o filas.                                                                                                                       |
| **6.8 (nueva)**                                 | Contenido de la tarjeta del tablero, regla de las 5 tareas más recientes en “Terminada” con “Ver todas las terminadas”, y filtro “Solo mis tareas”.                                                                                                                                                                                                                                            |
| **9. Paneles del Supervisor y del Practicante** | Se reemplaza el resumen por la definición completa de ambos paneles: cinco módulos del Supervisor (Dashboard, Mis proyectos, Practicantes a cargo, Tareas, Reportes) y tres del Practicante (Inicio, Mis proyectos, Mi historial).                                                                                                                                                             |
| **11. Modelo de datos**                         | Se agregan Proyecto.fecha_fin_real y Tarea.fecha_termino, y se aclara que InsightRevision es por usuario. Se listan los valores que se calculan y no se guardan.                                                                                                                                                                                                                               |
| **12. Flujo general**                           | El practicante abre el detalle para tomar la tarea; el supervisor decide desde su cola; el supervisor avisa al Administrador cuando un proyecto termina.                                                                                                                                                                                                                                       |
| **13 y 14**                                     | Se agregan las tarjetas de proyecto al diseño visual; se confirman las librerías y los nombres de dominio en español sin tildes; se agrega la tabla de reutilización entre paneles (14.4).                                                                                                                                                                                                     |
| **15 y 16**                                     | Nuevas mejoras futuras (solicitar practicante, avisar fin de proyecto, atajo de aprobación) y próximos pasos actualizados.                                                                                                                                                                                                                                                                     |
