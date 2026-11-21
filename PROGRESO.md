# PROGRESO.md — SIGEP CODAINI

> **Cómo se edita este archivo:** Gabo y Roxana trabajan juntos con un solo agente (Claude Code) y avanzan
> una sola vez, por lo que no hay bloques por persona. Hay un único «Siguiente paso» y una única lista de
> pendientes. Quien cierra un paso lo actualiza, con el hash real de `git log`.
> En `DECISIONES.md` solo se agregan entradas al final, con fecha y autoría en el título.
> El estado de las ramas no se anota aquí: **git es la fuente de verdad**.

## Estado general (común)

- **Fase 2 — `data/` y `services/`: terminada (2026-11-18).** Bloques 1, 2 y 3 cerrados; el paso 11 completa las
  consultas con alcance por rol. El cierre y los sub-pasos constan en el historial inferior.
- **Fase 4 — componentes compartidos: terminada (2026-11-18, `9ea9835`).** Los pasos 1 a 11 están construidos, probados y
  conectados: las acciones pasan por `services/` y las lecturas, por `services/consultas/` mediante adaptadores; ninguna pantalla
  ni componente compartido lee el almacén ni decide reglas (el almacén solo se usa como señal de cambio en `useConsulta` y
  `useNotificaciones`). `PaginaDesarrollo` queda en `src/app/desarrollo/` como contenedor temporal hasta la Fase 7. **Salvedad:**
  `FormularioTarea` solo tiene pantalla anfitriona para **editar** (el detalle); su modo **crear** espera a los módulos 5.4 y 5.5,
  que son quienes lo alojan. Pendiente de los autores: el PR de esta rama a `development` y, al cumplirse el «Listo cuando», el
  cierre de fase en `main` con su etiqueta (plan §11).
- **Conexión de pantallas, sub-paso 0: terminado (2026-11-18, `83b1315`).** La interfaz usa los servicios de la Fase 2
  (`cuentas/` y `seguimiento/`) y se retiraron los duplicados de la Fase 4.
- **Conexión de pantallas, sub-paso a): terminado (2026-11-18, `0ed86c9`).** Adaptadores puros en `src/app/adaptadores/`
  (`tarea`, `tablero`, `eventos` y `notificacion`, con `parseISO` en el borde y sin reglas), más la tabla de rutas de las
  notificaciones por rol. Aún no los usa ningún componente: se conectan en b) y c).
- **Conexión de pantallas, sub-paso b): terminado (2026-11-18, `7269ba6`).** La campana (últimas 8) y «Ver todas» leen con
  `listarNotificaciones` mediante el hook `useNotificaciones`, que vuelve a consultar al montarse y cuando cambia la lista de
  notificaciones del almacén (opción A). El punto verde usa `no_leidas`; el enlace, `destino` y `enlace_activo`. Se retiró
  `notificacionVista.ts`.
- **Conexión de pantallas, sub-paso c): terminado (2026-11-18, `7354f39`).** `PaginaDesarrollo` lee con
  `obtenerTableroProyecto`, `obtenerTarea` y `listarTerminadasDeProyecto`, con un selector de proyecto según el rol, y las
  acciones del detalle salen de un mapeador (`src/app/tareas/accionesDelDetalle.ts`) de las que ofrece la consulta.
  `DetalleTarea` y `TableroKanban` dejan de leer el almacén y de recalcular reglas; hay un listado de «Ver todas las
  terminadas» con búsqueda y se edita una tarea con `FormularioTarea`. Incluye la señal D6-A como regla de `domain/`
  (`motivosDeAtencionDelResponsable`) y los campos `atencion_responsable` y `proyecto.rama_base` de `obtenerTarea`. Se retiraron
  `accionesDeTarea.ts` y `datos.ts` de `ejemplos/`.
- **Conexión de pantallas, sub-paso d): terminado (2026-11-18, `f2bb209`).** Mi perfil lee con la consulta nueva `obtenerMiPerfil`
  y guarda con `editarMiPerfil` y `cambiarMiContrasena`. Qué campos tiene cada rol y cuáles edita lo decide la regla
  `camposDelPerfil` de `domain/` (con `puede()`): el Practicante, los seis; el Supervisor, nombre y correo en solo lectura y
  celular, Discord y GitHub editables; el Administrador, nombre, correo y celular (Discord, GitHub y disponibilidad no existen
  para su rol y no se muestran). El formulario reutiliza `esquemaCorreo` y `esquemaCelular` del servicio (H3 resuelto). La
  página pasó a `src/app/perfil/` y se retiró el bloque «Asignaciones y responsabilidades», que no está en §8.2.
- **Conexión de pantallas, sub-paso e): terminado (2026-11-18, `9ea9835`).** `PaginaDesarrollo` (y su prueba) pasó a
  `src/app/desarrollo/`, sin cambios de comportamiento ni de ruta (`/<panel>/desarrollo`), y se eliminó la carpeta
  `src/app/ejemplos/`. Se retiró además el código de resultado `ACCESO_RAPIDO_NO_DISPONIBLE`, que quedó sin uso desde el sub-paso 0.
- **Verificación (en `9ea9835`):** 3.068 pruebas en 114 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin
  errores, con el aviso conocido en `button.tsx`; Vite conserva el aviso de chunk mayor a 500 kB. Detalle en «Estado de pruebas».
- **Fase 5 — módulo 5.1 (Postulaciones), bloque 1 (lectura): terminado (2026-11-18, `61f368a`).** Listado con pestañas y
  contadores (abre en «Pendientes», por puntaje), filtros por área, especialidad y fechas, búsqueda y orden; detalle con la evaluación
  de la IA en dos bloques, el CV (sin documento en el prototipo, con su aviso de uso) y el historial. Rutas
  `/administrador/postulaciones` y `/administrador/postulaciones/:idPostulante`, título de la barra superior por prefijo y aviso de
  postulación que lleva a su detalle. `obtenerPostulacion` trae `decisiones` (`decisionesDisponibles`). Quedan los bloques 2
  (decisiones y «Analizando…») y 3 (criterios, áreas y especialidades).
- **Verificación (en `61f368a`):** 3.174 pruebas en 120 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin
  errores, con el aviso conocido en `button.tsx`. Detalle en «Estado de pruebas».
- **Fase 5 — módulo 5.1 (Postulaciones), bloque 2 (decisiones y «Analizando…»): terminado (2026-11-18, `f8baf90`).** Desde el detalle:
  aprobar (con confirmación; la contraseña temporal se muestra una sola vez), rechazar (motivo obligatorio) y reconsiderar (nota
  obligatoria), con los botones que decide `domain/` y llegan en `decisiones`. Una postulación sin evaluación se evalúa al abrirla
  (una sola vez) mostrando «Analizando…»; si no se puede calcular el puntaje dice «No se pudo evaluar: …» y las decisiones siguen
  disponibles (E3-A y E5-A). La contraseña vive solo en el estado de la pantalla y no se persiste ni llega al historial.
- **Verificación (en `f8baf90`):** 3.214 pruebas en 123 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin
  errores, con el aviso conocido en `button.tsx`. Detalle en «Estado de pruebas».
- **Fase 5 — módulo 5.1 (Postulaciones), bloque 3 (criterios, áreas y especialidades): terminado
  (2026-11-18, `b47d571`).** Página `/administrador/postulaciones/criterios` (enlace «Criterios de evaluación» desde el
  listado): crear y renombrar áreas y especialidades, activarlas o desactivarlas, y editar cada bloque de criterios con «Suma actual:
  N/100» en vivo. El bloque se guarda completo con `guardarCriteriosDeBloque`; los criterios guardados no se borran, se desactivan.
  Áreas y especialidades nacen inactivas y solo se activan con su bloque válido (la regla es de `domain/` y el servicio la vuelve a
  comprobar). Cambiar criterios no recalcula las evaluaciones anteriores. Sin cambios en `domain/` ni en `services/`.
- **Verificación (en `b47d571`):** 3.276 pruebas en 127 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin
  errores, con el aviso conocido en `button.tsx`. Detalle en «Estado de pruebas».
- **Fase 5 — módulo 5.2 (Practicantes): terminado (2026-11-18, `2f3a4c9`).** Rama `feat/fase5-practicantes`, en tres bloques dentro de un
  solo commit. Lectura: listado en `/administrador/practicantes` con pestañas Activos (abre ahí, incluye a «Sin proyecto»), Sin proyecto,
  Finalizados y Todos con contadores, filtros por área y proyecto y búsqueda; detalle en `/administrador/practicantes/:idPracticante` con
  datos personales de solo lectura, datos de la práctica, proyectos actuales y anteriores con alta y baja, tareas, línea de tiempo y enlace
  a la postulación de origen. Sin «Nuevo practicante». Acciones: «Asignar a proyecto» (atajo en «Sin proyecto», uno o varios proyectos),
  editar los datos de la práctica (propone el fin y envía las dos fechas, F5-A) y restablecer la contraseña (visible una sola vez).
  Ciclo de vida: finalizar (motivo obligatorio y aviso «Tiene N tareas en progreso que serán liberadas») y reactivar (nota obligatoria; no
  cambia la fecha de fin, F4-A). Cambios aditivos en la Fase 2: `obtenerPracticante` trae `acciones` y `tareas_a_liberar`, y la consulta
  nueva `listarProyectosAsignables`. Sin cambios en `domain/`.
- **Verificación (en `2f3a4c9`):** 3.380 pruebas en 134 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con
  el aviso conocido en `button.tsx`; `git diff -- docs` vacío. Detalle en «Estado de pruebas».
- **Fase 5 — módulo 5.3 (Supervisores): terminado (2026-11-19, `b0d150f`, `97fda22`, `16b67b6` y `c5d5e0d`).** Rama
  `feat/fase5-supervisores`, en cuatro commits. Lectura (`b0d150f`): listado en `/administrador/supervisores` con pestañas Activos (abre
  ahí), Inactivos y Todos con contadores y búsqueda; «Tareas por revisar» se resalta en ámbar cuando es mayor que 0, sin umbral propio;
  detalle en `/administrador/supervisores/:idSupervisor` con contacto de solo lectura, proyectos a cargo con su reunión y practicantes,
  tareas por revisar con los días de espera, proyectos anteriores y línea de tiempo. `ModalContrasenaTemporal` pasa a `src/compartido/`
  (`97fda22`; ya lo usan 5.1, 5.2 y 5.3). Cuenta (`16b67b6`): «Nuevo supervisor» (nombre, correo y celular; contraseña temporal una sola
  vez), editar nombre y correo y restablecer contraseña. Ciclo de vida (`c5d5e0d`): desactivar (bloqueado con proyectos pendientes:
  «Tiene N proyectos pendientes: reasígnalos primero»), reactivar y «Reasignar proyectos» (un selector por proyecto, todo o nada).
  Cambios aditivos en la Fase 2: `obtenerSupervisor` trae `acciones`, `proyectos_pendientes` y `supervisores_destino`. Sin cambios en
  `domain/`.
- **Verificación (en `c5d5e0d`):** 3.477 pruebas en 141 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores,
  con el aviso conocido en `button.tsx`; `git diff -- docs` vacío. Detalle en «Estado de pruebas».
- **Fase 5 — módulo 5.4 (Proyectos): terminado (2026-11-19, `5431b8a`, `da41753`, `9b2b378` y `eeb4d50`).** Rama `feat/fase5-supervisores`, en cuatro bloques. Lectura (`5431b8a`): listado en `/administrador/proyectos` con
  pestañas Activos (abre ahí), En pausa, Finalizados y Todos con contadores, filtro por supervisor y búsqueda por nombre; detalle en
  `/administrador/proyectos/:idProyecto` con las pestañas en `?pestana=` (Resumen, Tablero y Equipo). Tablero (`da41753`): el Kanban con
  «Ver todas las terminadas», avisos de proyecto finalizado y en pausa, detalle de tarea en
  `/administrador/proyectos/:idProyecto/tareas/:idTarea` (`DetalleDeTarea`, en `src/app/tareas/`, reutilizable en el módulo 5.5) y «Nueva tarea».
  Datos (`9b2b378`): «Nuevo proyecto» y «Editar proyecto» como diálogo (el código no se edita; cada grupo de campos lo decide `puede()`), la
  reunión semanal, la rama base y los enlaces útiles. Equipo y ciclo de vida (`eeb4d50`): pausar, reanudar, finalizar (bloqueado con tareas
  esperando supervisión, con la cantidad) y reactivar, cada uno con nota obligatoria; cambiar de supervisor; y en «Equipo», asignar y quitar
  practicantes (bloqueados en un proyecto finalizado). Cambios aditivos en la Fase 2: `obtenerTableroProyecto` (`puede_crear_tarea`),
  `listarProyectos` (`puede_crear`, `supervisores_disponibles`), `obtenerProyecto` (`acciones`, `ciclo_de_vida`, `supervisores_destino`),
  `obtenerEquipoProyecto` (`estado_proyecto`, `puede_asignar`, y por miembro `tareas_a_liberar` y `puede_quitar`) y la consulta nueva
  `listarPracticantesAsignables`. Sin cambios en `domain/`.
- **Verificación (bloque 4 en `eeb4d50`):** 3.686 pruebas en 152 archivos (3.622 en 150 tras el bloque 3);
  `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el aviso conocido en `button.tsx`; `git diff -- docs` vacío. Detalle
  en «Estado de pruebas».
- **Fase 5 — módulo 5.5 (Tareas): terminado (2026-11-19, `c8d82e1`).** Rama `feat/fase5-supervisores`, en un solo commit con dos partes. Lectura:
  vista transversal en `/administrador/tareas` con pestañas por estado y contadores (abre en «Todas»), filtros por proyecto, responsable, vencidas,
  sin asignar, «Requiere supervisión» y estado del Pull Request, y búsqueda por título o ID; columnas de §5.5 (ID legible, título, proyecto,
  responsable o «Sin asignar», estado, ícono de «Requiere supervisión», etiqueta del Pull Request, fecha límite en rojo si está vencida y detalle),
  sin botones de acción en las filas. El clic abre el detalle en `/administrador/tareas/:idTarea` (`DetalleDeTarea`, el mismo del 5.4), y los avisos
  de tipo `TAREA` del Administrador llevan a esa ruta. «Nueva tarea» desde el módulo, eligiendo el proyecto: `DialogoNuevaTarea` (en
  `src/app/tareas/`) lo comparten este módulo y el tablero del 5.4. Cambio aditivo en la Fase 2: `listarTareas` trae `proyectos_para_crear`. Sin
  cambios en `domain/`.
- **Verificación (en `c8d82e1`):** 3.748 pruebas en 157 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el aviso
  conocido en `button.tsx`; `git diff -- docs` vacío. Detalle en «Estado de pruebas».
- **Fase 5 — módulo 5.6 (Reportes): terminado (2026-11-20, `77ecb38`, `301442a` y `864777f`).** Rama `feat/fase5-reportes`, en tres commits. Ruta
  `/administrador/reportes` con pestañas «Insights» e «Indicadores» en `?pestana=`. **Insights** (`77ecb38`): las 7 reglas, calculadas y no guardadas;
  filtros por severidad, tipo, proyecto y estado (abre en «Activos»); tarjetas con «Ver detalle», «Marcar como revisado» (independiente por persona,
  con nota opcional) y «Notificar», cada botón solo si la consulta lo permite. **Indicadores** (`77ecb38`): periodo de 1 a 365 días en hora de Perú
  (30 por defecto) con atajos de 7, 30, 90 y 365 días y filtro por proyecto (todos por defecto); tarjetas generales, puntaje promedio por área y tablas por proyecto y por practicante, con
  «Sin datos» donde no hay muestras. **Dependencia** (`301442a`): `recharts` 3.11.0, versión exacta. **Gráfico** (`864777f`): practicantes por
  área en barras horizontales con variables CSS de los tokens, válido en ambos temas, oculto a los lectores de pantalla y con la tabla «Practicantes
  por área» como alternativa accesible y estado vacío. Sin cambios en `domain/` ni ampliaciones de consultas. `Insignia` suma el tipo
  `severidad`.
- **Verificación (en `5a81b38`):** 3.803 pruebas en 162 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el aviso
  conocido en `button.tsx`; `git diff -- docs` vacío. Detalle en «Estado de pruebas».
- **Fase 5 — módulo 5.7 (Historial de actividad): terminado (2026-11-20, `18b381b`).** Rama `feat/fase5-historial`, en un solo commit. Ruta
  `/administrador/historial`, de **solo lectura** (los eventos son inmutables: ni editar ni borrar). Listado del más reciente al más antiguo con fecha y hora
  en hora de Perú, autor («Nombre (Rol)» o «Sistema»), acción, elemento con enlace al detalle y resumen del cambio; filtros por rango de fechas, autor
  (incluido «Sistema»), categoría (las 8 de §5.7), tipo de elemento, proyecto y búsqueda de texto, más «Limpiar filtros». Un clic en la fila abre el
  detalle con el valor anterior y el nuevo de cada campo y el motivo o la nota. Adaptador `historial.ts` con el nombre en español de las 63 acciones, las
  8 categorías, los tipos de elemento y los campos. Usa `listarHistorial` sin ampliarla; sin cambios en `domain/`. `eventos.ts` exporta
  `etiquetaAutor` y `etiquetaEstado`. Nunca muestra contraseñas (una prueba lo vigila).
- **Verificación (en `18b381b`):** 3.823 pruebas en 164 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el aviso
  conocido en `button.tsx`; `git diff -- docs` vacío. Detalle en «Estado de pruebas».
- **Fase 5 — módulo 5.8 (Configuración): terminado (2026-11-20, `c814dca` y `59d3f76`).** Rama `feat/fase5-configuracion`, en dos commits: el módulo
  (`c814dca`) y el ajuste de la fecha de la tarjeta de GitHub a una relativa a hoy (`59d3f76`). Ruta `/administrador/configuracion`. **Tres
  secciones** (Evaluación de postulaciones, Prácticas y Seguimiento) con los 14 parámetros de §5.8: cada uno muestra su valor actual, su unidad y
  «Predeterminado: …»; «Guardar» llama a `guardarConfiguracionSeccion` y deja el cambio en el Historial con su valor anterior y el nuevo; la validación
  (rango, entero, mínimo menor que máximo, proporción que suma 100, crítico mayor que atención) la decide el servicio y su mensaje sale junto a la
  casilla; «Restaurar valores originales» va por sección, con confirmación, y queda deshabilitado si todo ya es predeterminado. **Integraciones:**
  tarjeta de GitHub de ejemplo (Conectado, cuenta, última verificación relativa a hoy y «Probar conexión» y «Reconectar» con el aviso «Acción
  simulada»), marcada «Solo prototipo». **Datos de demostración:** «Restablecer datos» con confirmación y la marca «Solo prototipo»; aplica la sesión
  que devuelve el servicio y vuelve al inicio. Usa `obtenerConfiguracion` y los servicios de la Fase 2 sin ampliarlos; sin cambios en `domain/`.
  `Insignia` suma los tipos `integracion` y «Solo prototipo».
- **Verificación (en `59d3f76`):** 3.844 pruebas en 166 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el aviso
  conocido en `button.tsx`; `git diff -- docs` vacío. Detalle en «Estado de pruebas».
- **Fase 5 — módulo 5.9 (Dashboard): terminado (2026-11-20, `f3f787c` y `0f2db6f`).** Rama `feat/fase5-dashboard`, en dos commits. `f3f787c`: los
  listados de los módulos 5.1 a 5.5 (Postulaciones, Practicantes, Proyectos y Tareas) abren en la pestaña que pide `?pestana=` (hook
  `usePestanaInicial`, que solo lee al abrir; un valor desconocido abre la pestaña de siempre), sin cambiar sus pruebas existentes. `0f2db6f`: el
  Dashboard del Administrador en `/administrador/dashboard`, con `obtenerDashboardAdministrador` sin ampliarlo: cuatro tarjetas cuya cifra
  principal y secundaria enlazan al módulo con el filtro ya aplicado (las «demoradas» de supervisión son texto, sin enlace propio), las cinco
  postulaciones pendientes de mayor puntaje, hasta cinco alertas con sus acciones (la tarjeta de insight de Reportes pasó a
  `src/app/insights/` y se comparte, con una variante compacta), practicantes por área (gráfico y tabla alternativa), tareas por revisar, próximas
  reuniones y avance de los proyectos, con mensajes cuando no hay alertas o postulaciones y sin feed de actividad. Distribución en dos columnas. Sin
  cambios en `domain/`.
- **Verificación (en `0f2db6f`):** 3.868 pruebas en 169 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el aviso
  conocido en `button.tsx`; `git diff -- docs` vacío. Detalle en «Estado de pruebas».
- **Fase 5 — panel del Administrador: terminada (2026-11-20).** Los nueve módulos (5.1 a 5.9) están construidos, probados y conectados a
  `services/`; ninguna pantalla decide reglas. **Salvedades:** (1) los pendientes de la Fase 8 anotados en «Pendientes» (pulidos, rango permitido en
  Configuración, chunks de más de 500 kB, comprobación visual de gráficos y detalles); (2) la **comprobación manual en un navegador real** de los
  módulos 5.1 a 5.9, en tema claro y oscuro, que aún no se hizo: las pruebas son de jsdom y no cubren el aspecto. Pendiente de los autores: el cierre
  de la fase (PR de la rama a `development` y, después, de `development` a `main` con la etiqueta `fase-5-completa`).
- **Fase 6 — módulo 6.1 (Mis proyectos, Supervisor): terminado (2026-11-20, `179e3a6` y `f07aa48`).** Rama `feat/fase6-supervisor`, en dos commits: el
  módulo (`179e3a6`) y el destino de los avisos de proyecto (`f07aa48`). Ruta `/supervisor/proyectos`: sus proyectos en **tarjetas** (no tabla; la
  tarjeta `TarjetaProyecto` ya existía en `compartido/`), con pestañas Activos, En pausa, Finalizados y Todos con contadores (abre en «Activos») y
  búsqueda por nombre. Cada tarjeta: nombre, código y estado; barra de avance; practicantes activos o «Sin practicantes asignados»; tareas esperando su
  supervisión, en ámbar solo si hay alguna; y próxima reunión o «Sin definir»; sin tareas vencidas. Sin columna ni filtro de supervisor y sin «Nuevo
  proyecto». El detalle (`/supervisor/proyectos/:id`, con Resumen, Tablero y Equipo) es el del Administrador: sus tres rutas fijas pasaron a depender
  del rol de la sesión (`rutaDeProyectos(rol)`, con el Administrador por defecto), y los botones los decide la consulta: el Supervisor puede cambiar la
  reunión y la rama base y gestionar enlaces, y no ve crear, pausar, finalizar, asignar ni cambiar de supervisor. Un proyecto ajeno, aunque se escriba su
  dirección, no muestra ningún dato. Los avisos de proyecto del Supervisor llevan a `/supervisor/proyectos/:id` (`RUTA_DE_DETALLE`). Sin cambios en
  `domain/` ni en las consultas.
- **Verificación (en `f07aa48`):** 3.897 pruebas en 172 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el aviso
  conocido en `button.tsx`; `git diff -- docs` vacío. Detalle en «Estado de pruebas».
- **Fase 6 — módulo 6.2 (Tareas, Supervisor): terminado (2026-11-21, `424779a`).** Rama `feat/fase6-tareas`, en un solo commit. Rutas `/supervisor/tareas` y
  `/supervisor/tareas/:idTarea`: reutiliza el listado y el detalle de Tareas del Administrador (5.5), que ya recibían solo las tareas de sus proyectos;
  `PaginaTareas` y `PaginaDetalleTarea` toman el prefijo del rol de la sesión (`rutaDeTareas(rol)`, con el Administrador por defecto). El Supervisor abre en
  «Esperando supervisión» si hay tareas ahí y, si no, en «Todas» (`pestanaInicialDeTareas`; una pestaña pedida en `?pestana=` gana); hasta tener los
  contadores solo se ve el esqueleto de carga, sin pestañas ni filtros, para no mostrar «Todas» de paso. El contador de esa pestaña se resalta en ámbar solo
  si tiene tareas, y en ella se agrega la columna «Días esperando» (solo para el Supervisor). Pestaña vacía: «No tienes tareas esperando tu supervisión».
  Aprobar y devolver solo desde el detalle (también con el proyecto en pausa), «Nueva tarea» solo con sus proyectos, y ninguna tarea ajena llega a la
  pantalla, ni por el listado ni por la dirección del detalle. Los avisos de tarea del Supervisor llevan a `/supervisor/tareas/:idTarea`
  (`RUTA_DE_DETALLE`). `usePestanaInicial` admite `null` como predeterminada. Sin cambios en `domain/` ni en las consultas.
- **Verificación (en `424779a`):** 3.921 pruebas en 174 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el aviso
  conocido en `button.tsx`; `git diff -- docs` vacío. Detalle en «Estado de pruebas».
- **Fase 6 — módulo 6.3 (Practicantes a cargo, Supervisor): terminado (2026-11-21, `100efb3`).** Rama `feat/fase6-practicantes`, en un solo commit. Rutas
  `/supervisor/practicantes` y `/supervisor/practicantes/:idPracticante`, sobre `listarPracticantesACargo` y `obtenerPracticanteACargo` (Fase 2), que ya existían y ya
  entregan solo lo de sus proyectos y nada del área técnica ni de la postulación de origen. **Listado** en tabla con pestañas Activos y Anteriores
  (contadores; abre en «Activos»), una fila por persona aunque esté en dos de sus proyectos, columnas practicante (nombre y correo), especialidad, proyectos,
  carga, esperando mi revisión, última actividad y detalle, filtro por proyecto (solo los suyos) y búsqueda por nombre o correo; en «Anteriores» se agrega la
  fecha de baja. **Detalle de solo lectura**: contacto, especialidad, disponibilidad horaria, fecha de fin de práctica, proyectos con alta y baja, tareas y línea
  de tiempo, todo recortado a sus proyectos, sin ningún botón de gestión. Un practicante ajeno, aunque se escriba su dirección, no muestra datos. Los avisos de
  persona del Supervisor llevan a `/supervisor/practicantes/:idPracticante` (`RUTA_DE_DETALLE`). La lista de tareas del detalle del Administrador pasó a un
  componente compartido, `ListaDeTareasDePracticante` (en `src/app/practicantes/`), que usan las dos pantallas. `Insignia` suma «Anterior». Sin cambios en `domain/`
  ni en las consultas.
- **Verificación (en `100efb3`):** 3.955 pruebas en 178 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el aviso
  conocido en `button.tsx`; `git diff -- docs` vacío. Detalle en «Estado de pruebas».
- **Fase 6 — módulo 6.4 (Reportes, Supervisor): terminado (2026-11-21, `8194b00`).** Rama `feat/fase6-reportes` (sobre `55b212b`, con el 6.3), en un solo commit. Ruta
  `/supervisor/reportes`: reutiliza `PaginaReportes` del 5.6 con las mismas dos pestañas y datos solo de sus proyectos, sin ampliar consultas ni tocar `domain/`
  (`listarInsights` y `obtenerIndicadores` ya entregan la variante del Supervisor). **Insights:** solo sus 5 reglas (sin «Postulaciones sin decidir» ni «Fin de
  práctica»), con el filtro de tipo tomado de `REGLAS_INSIGHT_VISIBLES`; «Notificar» solo en «Practicante inactivo» (lo decide `puede()`); «revisado» independiente
  del Administrador; sin alertas, «No hay alertas en tus proyectos». **Indicadores:** selector de periodo (30 días por defecto) y filtro por proyecto (solo los suyos);
  tres tarjetas (tareas terminadas, tiempo de ciclo y tasa de devolución), sin «Espera de supervisión», postulaciones ni puntaje por área, y sin el gráfico ni la tabla
  de practicantes por área; las tablas por proyecto y por practicante traen solo lo suyo. **Enlaces por rol:** `rutaDelElemento(tipo, id, rol)` y `rutaDeReportes(rol)`;
  el «Ver detalle» de un insight (de persona, de proyecto y de tarea) y los enlaces de las tablas llevan a `/supervisor/practicantes`, `/supervisor/proyectos` y
  `/supervisor/tareas`. `aIndicadores` acepta las dos variantes (para el Supervisor deja `null` en postulaciones, puntaje y área).
- **Verificación (en `8194b00`):** 3.973 pruebas en 179 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el aviso
  conocido en `button.tsx`; `git diff -- docs` vacío. Detalle en «Estado de pruebas».
- **Fase 6 — módulo 6.5 (Dashboard del Supervisor): terminado (2026-11-21, `7ece550`).** Rama `feat/fase6-dashboard` (sobre `9951a9a`, con el 6.1 al 6.4), en un solo commit.
  Ruta `/supervisor/dashboard`, sobre `obtenerDashboardSupervisor` (Fase 2), que ya existía y solo trae lo de sus proyectos: no se amplió ninguna consulta ni se tocó
  `domain/`. **Cuatro tarjetas compactas** (etiqueta, cifra y cifra secundaria en tres líneas cortas, rejilla de 4, 2 y 1 columnas) con enlace al módulo con el filtro
  ya aplicado: tareas esperando mi supervisión (ámbar solo si hay alguna), mis proyectos activos y en pausa, practicantes a cargo y tareas vencidas con las sin asignar
  (rojo solo si hay alguna). **Por revisar** a todo el ancho, en filas de una línea (ID, título como enlace al detalle, proyecto, responsable y días esperando).
  **Alertas** (hasta cinco, con sus acciones y el enlace «Ver todas en Reportes») a la izquierda; **Próximas reuniones** y **Avance de mis proyectos** apilados a la
  derecha. Mensajes por bloque y estado vacío total («El Administrador aún no te ha asignado proyectos»). **Cambios aditivos:** Tareas lee `?vencidas=1` y
  `?sin_asignar=1` y Mis proyectos lee `?pestana=` (un valor inválido se ignora; el filtro que llega se ve activo y se puede quitar). `Seccion`, `Tarjeta`, `PorRevisar`,
  `Reuniones` y `Avance` pasaron a `src/app/dashboard/BloquesDeDashboard.tsx`, y `aPorRevisar`, `aReuniones` y `aAvances` al adaptador del dashboard; el dashboard del
  Administrador (5.9) queda igual en comportamiento. La revisión visual del 6.5 la hizo la autora a ojo, porque el agente no puede abrir el navegador.
- **Verificación (en `7ece550`):** 4.012 pruebas en 183 archivos; `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el aviso
  conocido en `button.tsx`; `git diff -- docs` vacío. Detalle en «Estado de pruebas».
- **Fase 6 — panel del Supervisor: terminada (2026-11-21).** Los cinco módulos (6.1 a 6.5) están construidos, probados y conectados a `services/`, y reutilizan lo del
  Administrador con el alcance filtrado; ninguna pantalla decide reglas ni muestra datos de proyectos ajenos. **Salvedades:** (1) los pendientes de la Fase 8 anotados
  en «Pendientes» (entre ellos, el pulido de tarjetas con mucho espacio); (2) las pruebas manuales en un navegador real de los módulos 6.1 a 6.4, anotadas en
  «Pendientes»; el 6.5 lo revisó la autora a ojo. Pendiente de los autores: el cierre de la fase (PR a `development` y, después, a `main` con la etiqueta
  `fase-6-completa`).
- **Pendiente de los autores (cierres de fase):** el cierre en `main` de las **Fases 3, 4 y 5**: PR de `development` a `main`, etiquetas `fase-3-completa`,
  `fase-4-completa` y `fase-5-completa`, y registrar sus filas en «Cierres de fase» (hoy solo constan las Fases 0, 1 y 2). **La Fase 6 también se cerrará en `main`**
  con su etiqueta `fase-6-completa`.
- **Actualizado:** 2026-11-21, tras el módulo 6.5 y el cierre de la Fase 6.
- **Siguiente paso:** Fase 7, módulo 7.1 (Mis proyectos del Practicante).

### Cierres de fase

| Fase | Etiqueta | Commit etiquetado | Fecha |
|---|---|---|---|
| 0 — Base técnica y tema | `fase-0-completa` (anotada, objeto `cd07cc4`, publicada en `origin`) | `67e4116` | 2026-10-21 18:02 -05 |
| 1 — `domain/`: tipos y reglas puras | `fase-1-completa` (anotada, objeto `272f57f`, publicada en `origin`) | `e1e112d` | 2026-11-18 13:46 -05 |
| 2 — `data/` y `services/` | `fase-2-completa` (anotada, objeto `2925648`, publicada en `origin`) | `6b51fbd` (merge del PR #29, `development` → `main`) | 2026-11-18 13:46 -05 |

### Historial de la Fase 0 (resumen)

| Fecha | Paso | Commit |
|---|---|---|
| 2026-10-20 | 1. Versiones y compatibilidad (aprobado) | `2d35e5b` |
| 2026-10-20 | 2. Vite + React + TS, TS estricto, ESLint y Prettier | `0b6de05` |
| 2026-10-20 | 3. Tailwind v4 y shadcn/ui | `9b7b073` |
| 2026-10-20 | 4. Tokens y tema claro/oscuro con `data-theme` y persistencia | `7f8b494` |
| 2026-10-20 | 5. Montserrat e Inter, escala tipográfica | `44a3e85` |
| 2026-10-21 | 6 y 7. Estructura de `src/` + Vitest y Testing Library | `111af6e` |
| 2026-10-21 | 8. Página temporal de prueba | `35e9fb7` |
| 2026-10-21 | 9. Contraste verificado en ambos temas | `14a79ea` |
| 2026-10-21 | Docs: pasos 4 y 5 registrados | `6a7c25a` |
| 2026-10-21 | Docs: regla de no hacer commit sin confirmación | `995b3a3` |
| 2026-10-21 | Docs: ajustes de contraste en especificación y propuesta | `56d755a` |
| 2026-10-21 | 10 y 11. `README.md`, `PROGRESO.md` y `DECISIONES.md` | `0d5420d` |
| 2026-10-21 | Docs: hash del commit de cierre registrado | `b2c0b52` |
| 2026-10-21 | PR #1 a `development` / PR #2 a `main` + etiqueta | `56bc44e` / `67e4116` |

- **Decisiones clave** (detalle completo en `DECISIONES.md`): TypeScript 6.0.3 por compatibilidad con
  `typescript-eslint`; `react-router` 7.18.4; Fontsource 5.3.0 autoalojado para Inter y Montserrat;
  Vitest 5.0.5 + Testing Library + jsdom 30; Tailwind 4.3.3 configurado en CSS (sin
  `tailwind.config.js`); shadcn con alias a `@/compartido/*`; 7 vulnerabilidades altas aceptadas del
  CLI de `shadcn` (no llegan al bundle); contraste corregido con `#137A4A` y `--danger-text`.

### Verificación de la Fase 0 (una línea por paso)

- **Paso 2:** `install`, `lint`, `format:check` y `build` OK; `git diff -- docs` vacío.
- **Paso 3:** 502 paquetes; 7 vulnerabilidades altas de las herramientas de `shadcn`; `build`, `lint`
  y `format:check` OK (1 aviso conocido en `button.tsx`); `docs/` intacto.
- **Paso 4:** tokens y tema comprobados en Edge headless (radios 6/10 px, ambos temas, persistencia);
  `docs/` intacto.
- **Paso 5:** fuentes locales (5 `.woff2`, sin peticiones externas), escala tipográfica correcta;
  `docs/` intacto.
- **Pasos 6 y 7:** 72 paquetes nuevos; 2 pruebas pasan; `build` OK; `docs/` intacto.
- **Pasos 8 y 9:** 42 pares de texto ≥ 4,5:1 (21 por tema); `lint`, `test` y `build` OK; revisión
  visual aprobada por los autores; `docs/` intacto.
- **Pasos 10 y 11:** `format:check`, `lint`, 2 pruebas y `build` OK; ningún color a mano fuera de
  `src/index.css`; `docs/` intacto.
- **Cierre:** PR #1 fusionado en `development`, PR #2 fusionado en `main` y etiqueta `fase-0-completa`
  publicada.

## Registro detallado de avances anteriores

- **Sesión de verificación: terminada (2026-11-13).** `iniciarSesion.ts` y `App.tsx` ya no fallan; el único
  fallo era `.claude/settings.json` en `format:check`, ya corregido en `a232922`.
- **Paso 5: terminado (2026-11-14).** Máquina del estado del PR en `src/domain/estadoPR.ts`; el riesgo
  C1 quedó resuelto. Detalle en `DECISIONES.md`.
- **Paso 6: terminado (2026-11-14).** ID legible en `src/domain/idLegible.ts` (`9177852`): sin tope, mínimo
  3 dígitos, código de 3 a 5 mayúsculas o dígitos. Detalle y pendientes de Fase 2 en `DECISIONES.md`.
- **Paso 7: terminado (2026-11-15).** Puntaje de postulaciones en `src/domain/puntaje.ts` (`aeb6ea5`):
  bloques de área y especialidad, nota redondeada, banda y proporción por parámetro, marca de revisión
  manual. Detalle y pendientes de Fase 2 en `DECISIONES.md`.
- **Paso 8: terminado (2026-11-15).** Reglas de insights en `src/domain/reglasInsights.ts`
  (commit A `6f61810`, que corrige `MARCAR_INSIGHT_REVISADO` en `permisos.ts`; commit B `e784e4e`, con las
  reglas). Son las 7 reglas, con los 10 umbrales como parámetro y validados, y `ahora` por parámetro con
  el día cortado en hora de Perú (UTC−5). «Revisado» es por usuario y el alcance usa la misma fuente que
  `puede()`. Detalle, decisiones y pendientes de la Fase 2 en `DECISIONES.md`.
- **Paso 9: terminado (2026-11-16).** Indicadores de Reportes en `src/domain/indicadores.ts` (tres commits:
  A `998987e` extrae las utilidades de tiempo a `src/domain/tiempo.ts`; B `e408893` con los indicadores;
  C `86b0167`, que hace que las reglas de «supervisión demorada» y «carga desbalanceada» reutilicen
  `instanteUltimoEnvio`, `proyectosDeCarga` y `cargaDePracticante`). Son avance, tiempo de ciclo neto,
  espera de supervisión, tasa de devolución, última actividad, días esperando, veces devuelta y carga,
  con `ahora` por parámetro, periodo de 1 a 365 días y el alcance de `puede('VER_REPORTES')`. Detalle,
  decisiones, riesgos y pendientes en `DECISIONES.md`.
- **Paso 10: terminado (2026-11-17).** Ciclo de vida en dos archivos nuevos de `domain/`:
  - `src/domain/practicas.ts` (commit A `3c78c4f`): fecha de fin prevista (ingreso + meses, de 1 a 24, con
    el último día del mes si el destino es más corto), aviso previo (de 1 a 365 días) y vencimiento.
  - `src/domain/cicloVida.ts` (commit B `2a3dc50`): finalizar práctica, finalizar proyecto, desactivar
    supervisor, y asignar, quitar y cambiar de supervisor, con el bloqueo de un proyecto FINALIZADO
    (decisión de los autores) y sus efectos listos para que los aplique el servicio.

  Detalle, decisiones, riesgos y pendientes en `DECISIONES.md`.
- **Pruebas mínimas del plan §9: terminadas (2026-11-17).** Repaso contra las pruebas existentes: cinco de
  los siete mínimos ya estaban cubiertos del todo y dos en parte; se añadieron tres tests para los huecos (rejilla
  completa de transiciones, reunión/enlaces/rama base/datos del proyecto en FINALIZADO y no modificar la
  entrada en el ciclo de vida), con 9 mutaciones detectadas de 9 (`e1e112d`). Además se comprobó que `domain/`
  no importa React, Zustand, `data/` ni `services/`. Detalle en `DECISIONES.md`.
- **Fase 2, paso 1: terminado (2026-11-17).** Almacén en `src/data/` (`809ff44`): un solo store de Zustand
  con las 17 colecciones, persistencia en `localStorage` (clave `sigep-datos`, versión 1), validación con
  Zod al leer y `transaccion(operacion)` para operaciones atómicas (una sola escritura; si lanza, no se
  escribe nada). Con datos vacíos, dañados o de otra versión regenera la semilla en silencio con un
  `console.warn`. La semilla de este paso es **provisional** (vacía, solo con los parámetros). Las contraseñas
  de demostración se guardan tal cual. Detalle en `DECISIONES.md`.
- **Fase 2, paso 2: terminado (2026-11-17).** Semilla completa en `src/data/semilla.ts` y `src/data/semilla/`
  (`91b29e0`): 1 administrador, 3 supervisores, 24 practicantes, 5 proyectos (uno por situación), 43 tareas,
  42 postulaciones (24 aprobadas y 18 en flujo), 4 áreas con 9 especialidades y 53 criterios, 321 eventos de
  historial y 82 notificaciones (unos 290 KB). Se genera desde un único «ahora» (`crearSemilla(ahora)`), con
  fechas relativas a hoy en hora de Perú, y es determinista. Tareas, `estado_pr` y eventos salen de un
  constructor por ciclo de vida que usa `siguienteEstadoPR`; las evaluaciones, de `calcularPuntaje`; la fecha
  de fin de cada práctica, de `fechaFinPrevista`. Decisiones D1 a D8, contraseñas de demostración
  (`demo12345`) y detalle en `DECISIONES.md`.
- **Fase 2, paso 3: terminado (2026-11-17).** Restablecer datos de demostración en `src/data/almacen.ts`
  (`d3d4800`): acción `restablecer(ahora?)` del almacén, un único `set` con una semilla nueva (una sola
  escritura y un solo aviso, nunca una base vacía a medias). Cambia todas las colecciones, no toca otras claves
  del navegador (sesión, tema) y no registra evento de historial. Además, `protegerEscritura` atrapa los
  errores de `setItem` (disco lleno o modo privado): aviso con `console.warn` y la app sigue en memoria. La
  autorización y la sesión activa quedan para el servicio del paso 10. Detalle en `DECISIONES.md`.
- **Fase 2, paso 4: terminado (2026-11-17).** Utilidades base en `src/services/` (`c2b3f47`): resultado
  estándar plano (`{ ok, valor }` / `{ ok: false, codigo, mensaje, campos? }`) con la tabla de mensajes en
  español; `Entorno` (almacén, reloj, IDs y demora) que cada servicio recibe como último parámetro opcional;
  `simularDemora`; `Marca` (un único instante por operación); `ejecutarServicio` (demora → transacción →
  resultado, con las excepciones convertidas en `ERROR_INESPERADO`) y `conEfectos`; `obtenerActor`;
  `crearEvento`/`agregarEventos` (el historial solo se agrega; `id_proyecto` obligatorio donde el dominio lo
  exige; nunca una contraseña), `diferencias` y etiquetas; y `crearNotificaciones` (nunca notifica al autor).
  Detalle en `DECISIONES.md`.
- **Migración del acceso a la semilla: terminada (2026-11-17).** `src/services/autenticacion.ts` consulta
  los usuarios del almacén; `src/auth/iniciarSesion.ts` delega en el servicio y `PaginaAcceso.tsx` muestra
  los errores de acceso. Se eliminan las cuentas duplicadas de `auth/usuariosDemo.ts`, se conservan los
  accesos rápidos por IDs estables y se bloquean las cuentas INACTIVAS sin revelar si existen. La sesión
  sigue guardando solo el resumen sin contraseña. Commit `0307f83`; verificación: 966 pruebas, `tsc -b`,
  ESLint, Prettier y `build` OK (aviso conocido de chunk mayor a 500 kB). Detalle en `DECISIONES.md`.
- **Fase 2, Bloque 1 cerrado.** Pasos 1 a 4 en una sola sesión, con parada y commit por paso. Quedan los
  pasos 5 a 11 (servicios y consultas con alcance por rol); ver «Decisiones pendientes» sobre cómo partirlos
  en sesiones.
- **Fase 2, paso 5: plan aprobado (2026-11-17)** con las siete decisiones en la opción A (D1 a D7; detalle en
  `DECISIONES.md`). En resumen: carpeta `src/services/tareas/` por grupo; tres sub-pasos (5A, 5B, 5C);
  «Requiere PR» va en el paso 5 y no en el 6; puerto `github` en `Entorno` (llega en 5B); desactivar
  «Requiere PR» registra `PULL_REQUEST_NO_REQUERIDO` con cualquier rol; devolver o reabrir conserva al
  responsable aunque ya no pueda trabajar; la fecha límite no se exige futura.
- **Fase 2, sub-paso 5A: terminado (2026-11-17).** Servicios `crearTarea`, `editarTarea` y `eliminarTarea`
  en `src/services/tareas/datosTarea.ts`, con piezas comunes en `src/services/tareas/comun.ts` (`2c54c04`).
  Crear guarda la tarea y `ultimo_numero_tarea` en una sola transacción; editar registra solo los campos que
  cambian y avisa al responsable si la tarea está EN_PROGRESO; eliminar quita la tarea y deja el evento con
  el motivo. Código nuevo `SIN_CAMBIOS`. 50 pruebas nuevas y 13 mutaciones detectadas de 13. Detalle en
  `DECISIONES.md`.
- **Fase 2, sub-paso 5B: terminado (2026-11-17).** Las 7 transiciones de §6.2 (`tomarTarea`, `liberarTarea`,
  `enviarTareaASupervision`, `marcarTareaTerminada`, `aprobarTarea`, `devolverTarea`, `reabrirTarea`) en
  `src/services/tareas/transiciones.ts`, y el puerto `github` del `Entorno` con su simulación en
  `src/services/github.ts` (`2726b9a`). Enviar y terminar recalculan `estado_pr` y consultan a GitHub solo si
  ya hubo PR; aprobar no recalcula (S5); `fecha_termino` sale de la marca al terminar o aprobar y vuelve a
  `null` al reabrir; devolver y reabrir conservan al responsable (D6-A). 82 pruebas nuevas; 10 mutaciones
  detectadas y 1 equivalente (sin efecto observable). Detalle en `DECISIONES.md`.
- **Fase 2, sub-paso 5C: terminado (2026-11-17).** `cambiarRequiereSupervision` y `cambiarRequierePR` en
  `src/services/tareas/opciones.ts`, y la prueba de flujo `src/services/tareas/flujo.test.ts` (`98ead18`).
  «Requiere PR» aplica C1 con `siguienteEstadoPR`; desactivarlo registra `PULL_REQUEST_NO_REQUERIDO` con
  cualquier rol (D5-A) y solo avisa al supervisor cuando actúa el practicante. El flujo crear → tomar → enviar
  → aprobar (más una variante con devolución y otra con «No requiere PR») deja historial, avisos e
  indicadores coherentes. 33 pruebas nuevas; 10 mutaciones detectadas y 1 equivalente. Detalle en
  `DECISIONES.md`.
- **Fase 2, paso 5: terminado (2026-11-17).** Los 12 servicios de tareas (crear, editar, eliminar, las 7
  transiciones y las 2 opciones) en `src/services/tareas/`, el puerto `github` en `Entorno` y 165 pruebas
  nuevas, en tres commits de código: `2c54c04`, `2726b9a` y `98ead18`.
- **Fase 2, paso 6: plan aprobado (2026-11-17)** con las siete decisiones en la opción A (P1 a P7; detalle en
  `DECISIONES.md`): catálogo de ramas derivado del proyecto, caso de error preparado «rama inexistente» con una
  rama especial, PR existente detectado en los datos, vincularlo registra `PULL_REQUEST_CREADO` con nota,
  conflictos al crear con otra rama especial, sin servicio de sincronización con GitHub y dos sub-pasos.
- **Fase 2, sub-paso 6A: terminado (2026-11-17).** `PuertoGitHub` con las cuatro operaciones de §7.6 y su
  simulación (`src/services/github.ts`), `ejecutarConsulta` (consulta con demora y sin escritura) y los
  servicios `listarRamasParaPullRequest` y `crearPullRequest` en `src/services/pullRequests/` (`59dc320`).
  Código nuevo `RAMA_INEXISTENTE`. 36 pruebas nuevas y 9 mutaciones detectadas de 9. Detalle en
  `DECISIONES.md`.
- **Fase 2, sub-paso 6B: terminado (2026-11-17).** `cerrarPullRequest` en
  `src/services/pullRequests/pullRequests.ts` y el flujo de punta a punta en
  `src/services/tareas/flujo.test.ts` (`9600f46`). Cerrar solo cambia `estado_pr` a CERRADO (URL y ramas se
  conservan), llama a GitHub después de los permisos y del motivo, y avisa al responsable si lo cerró otra
  persona. El flujo crear → tomar → enviar → aprobar → crear PR (y la variante cerrar → crear de nuevo) deja
  historial y avisos coherentes. 16 pruebas nuevas y 4 mutaciones detectadas de 4. Detalle en `DECISIONES.md`.
- **Fase 2, paso 6: terminado (2026-11-17).** Servicios de Pull Request (listar ramas, crear y cerrar) con el
  `PuertoGitHub` completo de §7.6, en dos commits de código: `59dc320` y `9600f46`; 52 pruebas nuevas.
- **Fase 2, Bloque 2 (pasos 5 y 6): terminado (2026-11-17).** 15 servicios (12 de tareas y 3 de Pull Request),
  el puerto de GitHub simulado y `ejecutarConsulta`, con 217 pruebas nuevas en cinco commits de código
  (`2c54c04`, `2726b9a`, `98ead18`, `59dc320`, `9600f46`). Del «Listo cuando» de la Fase 2 queda cubierta la
  parte de tareas y PR del flujo por código (crear tarea → tomar → enviar → aprobar → crear PR); «aprobar
  postulación → asignar» llega con los pasos 7 y 8.
- **Fase 2, paso 7: plan aprobado (2026-11-17)** con las cinco decisiones en la opción recomendada (E1-A a E5-A)
  y el supuesto de `fecha_ingreso`; detalle en `DECISIONES.md`. En resumen: puerto `evaluador` simulado y
  determinista; `generarContrasena` en `Entorno` (10 caracteres, una sola vez); si `calcularPuntaje` falla, evaluar
  falla sin escribir y no bloquea aprobar ni rechazar; la regla de estado de la decisión vive en `domain/`;
  `evaluarPostulacion` es del sistema; `fecha_ingreso` = día de la aprobación en hora de Perú. El paso se parte en
  7A y 7B.
- **Fase 2, sub-paso 7A: terminado (2026-11-17).** Regla `puedeDecidirPostulacion` en
  `src/domain/decisionPostulacion.ts` (`42c0b25`) y los servicios `evaluarPostulacion`, `aprobarPostulacion`,
  `rechazarPostulacion` y `reconsiderarPostulacion` en `src/services/postulaciones/`, con el puerto
  `evaluador`, `generarContrasena` y 3 códigos nuevos (`debd47e`). Aprobar crea la cuenta y la práctica en una
  escritura, sin asignar a un proyecto y sin notificar a nadie (§8.1). 110 pruebas nuevas y 17 mutaciones
  detectadas de 17. Detalle en `DECISIONES.md`.
- **Fase 2, sub-paso 7B: plan aprobado (2026-11-17)** con las decisiones C1-B, C2-B y C3 en la opción
  recomendada y los supuestos confirmados; detalle en `DECISIONES.md`. En resumen: `guardarCriteriosDeBloque`
  guarda el bloque completo en una operación (la regla de los 100 puntos se comprueba al final); áreas y
  especialidades nacen inactivas y se activan solo con su bloque válido; la validación es una función pura de
  `domain/`; nombres únicos por nivel; sin cascadas; la especialidad no cambia de área; sin límite de largo.
- **Fase 2, sub-paso 7B: terminado (2026-11-17).** `validarBloqueCriterios` en
  `src/domain/criteriosBloque.ts` (`3368603`) y 7 servicios en `src/services/catalogoEvaluacion/` (`5eb54a4`):
  crear, editar y activar o desactivar áreas y especialidades, y `guardarCriteriosDeBloque`. 142 pruebas nuevas
  (32 en `domain/`) y 17 mutaciones detectadas de 17. Con esto **termina el paso 7**. Detalle en `DECISIONES.md`.
- **Fase 2, paso 8: plan aprobado (2026-11-17)** con las siete decisiones en la opción A (F1 a F7) y tres
  supuestos menores confirmados; detalle en `DECISIONES.md`. En resumen: el paso se parte en **8A** (practicantes)
  y **8B** (supervisores, contraseñas y aviso de fin de práctica); «reasignar proyectos» del supervisor pasa al
  paso 9 junto con «cambiar supervisor» (F1-A); asignar es una lista de pares todo o nada (F2-A); al quitar se
  avisa la salida y cada tarea liberada (F3-A); reactivar conserva la fecha de fin (F4-A); editar datos acepta
  cualquier especialidad activa, valida fechas y no recalcula el fin (F5-A); el aviso previo es un servicio del
  sistema, idempotente, el día exacto (F6-A, en 8B); el celular tiene 9 dígitos y empieza con 9 (F7-A, en 8B).
- **Fase 2, sub-paso 8A: terminado (2026-11-17).** Reglas `reactivarPractica` y `reactivarSupervisor` en
  `src/domain/reactivacion.ts` (`861c5f3`) y cinco servicios en `src/services/practicantes/` (`df57b0d`):
  `asignarPracticantes`, `quitarPracticante`, `finalizarPractica`, `reactivarPractica` y `editarDatosPractica`.
  Además `denegarCicloVida` (`src/services/cicloVida.ts`), que da mensaje en español, con la cantidad cuando la
  hay, a los 11 códigos de ciclo de vida que no lo traían. 127 pruebas nuevas (19 en `domain/`) y 28 mutaciones
  detectadas de 28. Detalle en `DECISIONES.md`.
- **«Listo cuando» de la Fase 2: cubierto por código (2026-11-17).** La prueba
  `src/services/practicantes/flujo.test.ts` recorre aprobar postulación → asignar → crear tarea → tomar → quitar
  → asignar de nuevo → tomar → finalizar práctica → reactivar, con historial y avisos coherentes; junto con
  `src/services/tareas/flujo.test.ts` (crear tarea → tomar → enviar → aprobar → crear PR) cubre el flujo completo
  que pide el plan §9. Faltan las demás pruebas por servicio (pasos 9 a 11), el alcance por rol y revisar que
  restablecer la semilla deja el sistema consistente (ya probado en el paso 3).
- **Fase 2, sub-paso 8B: terminado (2026-11-17).** Seis servicios nuevos en `src/services/` (`a52fe0c`):
  `crearSupervisor`, `editarSupervisor`, `desactivarSupervisor` y `reactivarSupervisor`
  (`supervisores/supervisores.ts`); `restablecerContrasena`, para practicantes y supervisores
  (`cuentas/restablecerContrasena.ts`); y `emitirAvisosFinDePractica`, un proceso del sistema
  (`practicantes/avisoFin.ts`). Más las validaciones de correo y celular (`cuentas/validaciones.ts`) y un ajuste a
  `SalidaOperacion` (`cambios: null` = éxito sin nada que escribir, para que el aviso del sistema no escriba nada
  cuando no hay avisos nuevos). 105 pruebas nuevas y 27 mutaciones detectadas de 27. Detalle en `DECISIONES.md`.
  Aplica F6-A (aviso el día exacto, idempotente), F7-A (celular de 9 dígitos que empieza con 9) y los tres supuestos
  menores (editar datos de un practicante finalizado, restablecer solo a personas activas y correo único sin
  distinguir mayúsculas ni espacios, también al editar). **`reasignarProyectosDeSupervisor` no está en este paso:
  va en el paso 9 (F1-A).**
- **Fase 2, paso 8: terminado (2026-11-17).** Practicantes (8A) y supervisores, contraseñas y aviso de fin de
  práctica (8B): 11 servicios (5 y 6), 232 pruebas nuevas y 55 mutaciones detectadas de 55, en tres commits de
  código (`861c5f3`, `df57b0d` y `a52fe0c`); docs de 8A `14e94cb`.
- **Fase 2, paso 9: plan aprobado (2026-11-18)** con las cuatro decisiones en la opción A (G1 a G4) y seis
  supuestos menores confirmados; detalle en `DECISIONES.md`. En resumen: el paso se parte en **9A** (datos del
  proyecto) y **9B** (ciclo de vida y supervisor); el repositorio es `https://github.com/{organización}/{repositorio}`
  sin «/» final ni «.git» (G1-A); reactivar un proyecto no avisa (G2-A); la reunión se puede definir, cambiar y quitar,
  y quitarla también avisa (G3-A); `reasignarProyectosDeSupervisor` acepta una lista atómica de proyectos no finalizados
  del supervisor (G4-A).
- **Fase 2, sub-paso 9A: terminado (2026-11-18).** Siete servicios en `src/services/proyectos/` (`30b27ab`):
  `crearProyecto`, `editarDatosProyecto`, `cambiarRamaBase`, `definirReunion`, `agregarEnlace`, `editarEnlace` y
  `quitarEnlace`; más `esquemas.ts` (esquemas Zod reutilizables por los formularios de la Fase 5.4) y `comun.ts`
  (`equipoDelProyecto`, `textoReunion`, `eventoDeProyecto`). `crearProyecto` usa `validarCodigoProyecto` con los códigos
  de **todos** los proyectos y sin normalizar el código; `editarDatosProyecto` rechaza cambiarlo (`CODIGO_INMUTABLE`).
  Códigos nuevos: `CODIGO_INMUTABLE` y `FIN_ANTES_DE_INICIO`. 164 pruebas nuevas y 31 mutaciones detectadas de 31.
  Detalle en `DECISIONES.md`.
- **Fase 2, sub-paso 9B: terminado (2026-11-18).** Reglas de estado en `src/domain/estadoProyecto.ts` (`e15e4f5`):
  `puedePausarProyecto`, `puedeReanudarProyecto`, `puedeReactivarProyecto` (exige supervisor ACTIVO) y
  `accionesDeEstadoDisponibles`, con los códigos `PROYECTO_NO_ACTIVO`, `PROYECTO_NO_EN_PAUSA`,
  `PROYECTO_NO_FINALIZADO` y `SUPERVISOR_DEL_PROYECTO_INACTIVO`. Y seis servicios en `src/services/proyectos/`
  (`12efa20`): `pausarProyecto`, `reanudarProyecto`, `finalizarProyecto` y `reactivarProyecto` (`estado.ts`), y
  `cambiarSupervisor` y `reasignarProyectosDeSupervisor` (`supervisor.ts`). Finalizar libera las tareas en progreso con
  un `TAREA_LIBERADA` por cada una, avisa al equipo y a cada responsable, fija `fecha_fin_real` y no cierra las
  asignaciones; reactivar no avisa (G2-A) y limpia `fecha_fin_real`; reasignar es una lista atómica (G4-A). Código
  nuevo: `PROYECTO_NO_ES_DEL_SUPERVISOR`. Prueba de flujo `src/services/proyectos/flujo.test.ts` de punta a punta.
  117 pruebas nuevas (35 en `domain/`) y 33 mutaciones detectadas de 33. Detalle en `DECISIONES.md`.
- **Fase 2, paso 9: terminado (2026-11-18).** Servicios de proyectos (9A y 9B): 13 servicios, 281 pruebas nuevas y 64
  mutaciones detectadas de 64, en tres commits de código (`30b27ab`, `e15e4f5` y `12efa20`); docs de 9A `a3b124f`.
  Con esto **terminan los servicios de módulos de negocio del Bloque 3** (postulaciones, catálogo, practicantes,
  supervisores y proyectos); quedan los pasos 10 (cuenta y configuración) y 11 (consultas con alcance por rol).
- **Fase 2, paso 10: plan aprobado (2026-11-18)** con las cuatro decisiones en la opción recomendada; detalle en
  `DECISIONES.md`. En resumen: tres sub-pasos (10A, 10B y 10C); marcar notificaciones leídas **sin acción nueva en
  `puede()`**; Discord y GitHub **sin espacios y con largo máximo** (32 y 39); «Notificar» desde un insight con **texto
  automático**.
- **Fase 2, sub-paso 10A: terminado (2026-11-18).** Servicios en `src/services/cuentas/` (`d8f89b4`): `iniciarSesion` y
  `accesoRapido` (`sesion.ts`), que leen las cuentas de `data/` con el correo normalizado, bloquean a las cuentas
  `INACTIVO` (solo lo dicen si la contraseña era correcta, para no revelar que la cuenta existe) y llaman a
  `emitirAvisosFinDePractica` tras un acceso correcto; `editarMiPerfil` (`perfil.ts`: un `puede()` por campo, correo único,
  historial solo de nombre y correo) y `cambiarMiContrasena` (`contrasenaPropia.ts`: mínimo 8 caracteres sin recortar
  espacios, distinta de la actual, limpia `debe_cambiar_contrasena` y deja un evento sin «cambios»). Se retiraron
  `CUENTAS_DEMO`, `auth/usuariosDemo.ts` y `auth/iniciarSesion.ts`; `PaginaAcceso` llama a los servicios. 70 pruebas netas
  nuevas y 20 mutaciones detectadas de 20. Detalle en `DECISIONES.md`.
- **Fase 2, sub-paso 10B: terminado (2026-11-18).** Servicios en `src/services/seguimiento/` (`84c438d`):
  `calcularInsightsVigentes` y `umbralesDe` (`comun.ts`, reutilizables por el paso 11), `marcarInsightRevisado` (revisión
  independiente por usuario, `INSIGHT_YA_REVISADO`, sin evento ni aviso), `notificarDesdeInsight` (aviso
  `NOTIFICACION_DESDE_INSIGHT` con el texto `título. motivo` al practicante inactivo o al supervisor del proyecto de la tarea
  demorada), `marcarNotificacionLeida` y `marcarTodasLeidas` (actor activo, notificación propia, idempotentes). 73
  pruebas nuevas y 20 mutaciones detectadas de 20. Detalle en `DECISIONES.md`.
- **Fase 2, sub-paso 10C: terminado (2026-11-18).** Parte 1 (`185c6ae`): `validarSeccionConfiguracion` en
  `src/domain/configuracionValidacion.ts` (Evaluación, Prácticas y Seguimiento, esta última con `validarUmbrales`), 93
  pruebas y 20 mutaciones detectadas de 20. Parte 2 (`66ff605`), en `src/services/configuracion/`:
  `guardarConfiguracionSeccion` y `restaurarSeccionConfiguracion` (un `PARAMETRO_CONFIGURACION_CAMBIADO` por parámetro
  que cambió, `SIN_CAMBIOS` si no cambió ninguno) y `restablecerDatosDemostracion` (devuelve `{ usuario }` con la sesión
  refrescada o `null`); `AlmacenServicio` pasó a incluir `restablecer`. 70 pruebas nuevas y 20 mutaciones detectadas de 20
  (una prueba se agregó antes de mutar para cubrir al actor que queda INACTIVO tras el reinicio).
- **Fase 2, paso 10: terminado (2026-11-18).** Cuenta propia, seguimiento y configuración: 11 servicios, 2 ayudantes de insights y la regla pura de
  Configuración, 306 pruebas nuevas netas (1.942 → 2.248 en 87 archivos) y 80 mutaciones detectadas de 80, en cuatro
  commits de código (`d8f89b4`, `84c438d`, `185c6ae` y `66ff605`). Con esto terminan **todos los servicios de la Fase 2**;
  queda el paso 11 (consultas con alcance por rol).
- **Fase 2, paso 11: plan aprobado (2026-11-18)** con las decisiones Q1 a Q9 en la opción recomendada; detalle en
  `DECISIONES.md`. En resumen: consultas de **todos** los módulos, «livianas» (entidades de `domain/` más campos derivados);
  tres acciones nuevas de `puede()` para los módulos solo del Administrador y `puedeEnRol` para el permiso de módulo;
  `NO_ENCONTRADO` si no existe y `FUERA_DE_ALCANCE` si es ajeno; **una vista (tipo) por rol** cuando cambian los campos
  visibles; las pantallas filtran pestañas y búsqueda en memoria (salvo Historial e Indicadores); alertas del Dashboard de
  Crítico a Informativo, sin revisadas y con tope 5; postulaciones decididas y puntaje promedio por área en `domain/`; `ids_proyecto`
  de los insights recortado al Supervisor; y seis supuestos menores confirmados. El paso se parte en **11A a 11E**.
- **Fase 2, sub-paso 11A: terminado (2026-11-18).** Commit A (`3bd4460`, `domain/`): `VER_POSTULACIONES`, `VER_SUPERVISORES` y
  `VER_DIRECTORIO_PRACTICANTES` (58 acciones en total), `puedeEnRol`, `accionesDeTarea` y los ayudantes de `consultas.ts`.
  Commit B (`5821b99`, `src/services/consultas/`): la base común y 7 consultas de proyectos (`listarProyectos`,
  `listarMisProyectos`, `obtenerProyecto`, `obtenerEquipoProyecto`, `obtenerTableroProyecto`, `listarTerminadasDeProyecto` y
  `obtenerResumenProyectoAnterior`). 178 pruebas y 68 mutaciones detectadas de 68 (una era código muerto y se retiró).
- **Fase 2, sub-paso 11B: terminado (2026-11-18).** Commit `b6a0d1b`: `listarTareas`, `obtenerTarea` (con las acciones de
  `domain/`), `listarMiHistorial`, `listarMisTareasEnCurso` y `listarPullRequestsPorAtender`, más
  `observacionDevolucionVigente` en `domain/`. 92 pruebas y 30 mutaciones detectadas de 30.
- **Fase 2, sub-paso 11C: terminado (2026-11-18).** Commit `6d6b79a`: `listarPracticantes`, `obtenerPracticante`,
  `listarPracticantesACargo`, `obtenerPracticanteACargo`, `listarSupervisores`, `obtenerSupervisor`, `listarPostulaciones`,
  `obtenerPostulacion`, `listarCatalogoEvaluacion` y `obtenerConfiguracion`. El tipo del Supervisor no tiene área técnica ni
  postulación de origen. 133 pruebas y 47 mutaciones detectadas de 47.
- **Fase 2, sub-paso 11D: terminado (2026-11-18).** Commit `31d127d`: `indicadoresDePostulaciones` en `domain/` y
  `listarInsights`, `obtenerIndicadores`, `listarHistorial`, `obtenerLineaDeTiempo` y `listarNotificaciones`. 125 pruebas y
  67 mutaciones detectadas de 67 (dos mutantes equivalentes se descartaron; de uno de ellos se retiró además el código redundante).
- **Fase 2, sub-paso 11E: terminado (2026-11-18).** Commit `006022d`: `obtenerDashboardAdministrador`,
  `obtenerDashboardSupervisor` y `obtenerInicioPracticante`, que componen las consultas anteriores sin cálculo propio. 60
  pruebas y 40 mutaciones detectadas de 41 (la restante es equivalente: el chequeo del parámetro ausente lo repite
  `alertasDe`).
- **Fase 2, paso 11: terminado (2026-11-18).** **30 consultas con alcance por rol** en `src/services/consultas/`, más
  `puedeEnRol`, tres acciones de `puede()`, `accionesDeTarea`, los ayudantes de `domain/consultas.ts` (incluida
  `observacionDevolucionVigente`) e `indicadoresDePostulaciones`. 588 pruebas nuevas (2.248 → **2.836 en 99 archivos**) y 253
  mutaciones, **252 detectadas y 1 equivalente** (el 100 % de las no equivalentes), en seis commits de código (`3bd4460`,
  `5821b99`, `b6a0d1b`, `6d6b79a`, `31d127d` y `006022d`).
- **Fase 2: terminada (2026-11-18).** Almacén y semilla, utilidades, servicios de escritura (pasos 5 a 10) y consultas con
  alcance por rol (paso 11). El «Listo cuando» del plan §9 queda cubierto por código: el flujo completo (aprobar postulación,
  asignar, crear tarea, tomar, enviar, aprobar y crear PR) está en `src/services/practicantes/flujo.test.ts` y
  `src/services/tareas/flujo.test.ts`; los servicios tienen caso exitoso, sin permiso, datos inválidos e inexistente;
  el alcance (un supervisor no obtiene datos de un proyecto ajeno; un practicante no recibe correo ni celular de un
  compañero) está probado campo por campo en las consultas; y restablecer la semilla deja el sistema consistente (paso 3).
- **Siguiente:** **Fase 5 — panel del Administrador, módulo 5.1 (Postulaciones).** La conexión de las pantallas a `services/` y
  a `services/consultas/` y el retiro de `src/app/ejemplos/` quedaron hechos (cierre de la Fase 4, `9ea9835`). La integración de
  las ramas de interfaz con el Bloque 3 de `development` se hizo en `48abbbc`. La conexión fue en sub-pasos, cada uno con su commit: **0** unificar servicios y acceso (hecho, `83b1315`); **a**
  adaptadores (hecho, `0ed86c9`); **b** campana y «Ver todas» (hecho, `7269ba6`); **c** detalle de tarea y Kanban (hecho, `7354f39`); **d** Mi perfil y sesión (hecho, `f2bb209`); **e** mover
  `PaginaDesarrollo` y retirar `ejemplos/` (hecho, `9ea9835`).
- **Fase 1, «Listo cuando»:** cumplido y cerrado (2026-11-18). Los autores revisaron los tipos de `domain/` y ajustaron la línea del
  plan; `fase-1-completa` y `fase-2-completa` están publicadas en `origin` (ver «Cierres de fase»).
- **Rama:** `feat/fase5-postulaciones` (módulo 5.1). Antes: `feat/fase4-conectar-pantallas` y `feat/fase4-vistas-lectura`; `development`
  ya contiene el merge `48abbbc` (Bloque 3 de la Fase 2 integrado con las Fases 3 y 4).
- **Integración (2026-11-18):** Integración del Bloque 3 de la Fase 2 en las ramas de interfaz — `48abbbc`.

## Pasos terminados

### Fase 1 — `domain/`

| Fecha | Paso | Commit / PR |
|---|---|---|
| 2026-10-23 | 1. Tipos, enumeraciones y constantes | `1251fb5`; docs `fd8cf78`; PR #5 fusionado en `a17099a`; docs de cierre `6233dda` |
| 2026-10-23 | chore PR #6: `.gitattributes` y regla de `git config` | fusionado en `e4993af` |
| 2026-10-28 | 2A. Contrato de permisos | `eb0e382`; docs `6407ec7`; plan/propuesta `5fd8f80` |
| 2026-10-30 | 2B. `puede()`, ayudantes, fábricas y pruebas de la matriz | `2eef457`; docs `5647787`; PR #7 fusionado en `2f603cc` |
| 2026-11-06 | 3. Transiciones de tarea y matriz de §6.2 | `66cfa34`; docs `623c287`; PR #8 fusionado en `8b7739f` |
| 2026-11-07 | 4. Reglas de edición de tarea y de opciones | `6ea9260`; test `c210313`; docs `ab8128d`; style `35d5af2`; fusionado en `development` (merge `aa536cb`) |
| 2026-11-14 | 5. Máquina del estado del PR | `5aba475`; PR #15 fusionado en `3d09766` |
| 2026-11-14 | 6. Generación de ID legible | `9177852` |
| 2026-11-15 | 7. Puntaje de postulaciones | `aeb6ea5`; docs `367bf3b`; docs/ a mano `cec750a` |
| 2026-11-15 | 8. Reglas de insights | A (permisos) `6f61810`; B (reglas) `e784e4e`; docs/ a mano `d05e278` |
| 2026-11-16 | 9. Indicadores | A (tiempo) `998987e`; B (indicadores) `e408893`; C (reutilización en insights) `86b0167`; docs `d156acc`; PR #20 fusionado en `8a44800` |
| 2026-11-17 | 10. Ciclo de vida | A (fechas de la práctica) `3c78c4f`; B (reglas de ciclo de vida) `2a3dc50` (incluye el cambio a mano de §9.1.4 de la propuesta); docs `3ee5277`; docs/ a mano `3d68cc4`; docs `65c58b9` |
| 2026-11-17 | Pruebas mínimas del plan §9 (cierre de la Fase 1) | test `e1e112d` |

### Fase 2 — `data/` y `services/`

| Fecha | Paso | Commit / PR |
|---|---|---|
| 2026-11-17 | 1. Almacén persistente con recuperación segura | `809ff44`; docs `b317640` |
| 2026-11-17 | 2. Semilla completa de demostración | `91b29e0`; docs `b7e8d68` |
| 2026-11-17 | 3. Restablecer datos de demostración | `d3d4800`; docs `e950907` |
| 2026-11-17 | 4. Utilidades base de `services/` (cierra el Bloque 1) | `c2b3f47`; docs `0a08c1d`; PR #22 fusionado en `ba4f077` |
| 2026-11-17 | 5A. Servicios para crear, editar y eliminar tareas | `2c54c04`; docs `b6683dd` |
| 2026-11-17 | 5B. Las 7 transiciones de tarea y el puerto de GitHub simulado | `2726b9a`; docs `ed6a6bc` |
| 2026-11-17 | 5C. Opciones de la tarea y prueba de flujo (cierra el paso 5) | `98ead18`; docs `6c8e32f` |
| 2026-11-17 | 6A. Listar ramas y crear Pull Request con GitHub simulado | `59dc320`; docs `465a147` |
| 2026-11-17 | 6B. Cerrar Pull Request y flujo de punta a punta (cierra el paso 6 y el Bloque 2) | `9600f46`; docs `03d246c`; PR #23 fusionado en `34e0656` |
| 2026-11-17 | 7A. Evaluar, aprobar, rechazar y reconsiderar postulaciones | A (regla en `domain/`) `42c0b25`; B (servicios) `debd47e`; docs `801a992` |
| 2026-11-17 | 7B. Áreas técnicas, especialidades y criterios de evaluación (cierra el paso 7) | A (validación del bloque en `domain/`) `3368603`; B (servicios) `5eb54a4`; docs `752aad3` |
| 2026-11-17 | 8A. Asignar, quitar, finalizar y reactivar practicantes; editar datos de la práctica | A (reglas de reactivación en `domain/`) `861c5f3`; B (servicios) `df57b0d`; docs `14e94cb` |
| 2026-11-17 | 8B. Supervisores, restablecer contraseña y aviso de fin de práctica (cierra el paso 8) | `a52fe0c`; docs `cdbbb26` |
| 2026-11-18 | 9A. Crear y editar proyectos, rama base, reunión y enlaces | `30b27ab`; docs `a3b124f` |
| 2026-11-18 | 9B. Cambiar supervisor, reasignar proyectos, pausar, reanudar, finalizar y reactivar proyectos (cierra el paso 9) | A (reglas de estado en `domain/`) `e15e4f5`; B (servicios) `12efa20`; docs `dacc9e0`; PR #24 fusionado en `905758b` |
| 2026-11-18 | 10A. Acceso desde `data/`, Mi perfil y contraseña propia | `d8f89b4` |
| 2026-11-18 | 10B. Insights revisados, «Notificar» desde un insight y notificaciones leídas | `84c438d` |
| 2026-11-18 | 10C. Configuración y restablecer datos de demostración (cierra el paso 10) | A (validación en `domain/`) `185c6ae`; B (servicios) `66ff605`; docs `37eb072` |
| 2026-11-18 | 11A. Permisos de lectura, acciones de tarea, ayudantes de consulta y consultas de proyectos | A (`domain/`) `3bd4460`; B (consultas) `5821b99` |
| 2026-11-18 | 11B. Consultas de tareas y vistas del practicante | `b6a0d1b` |
| 2026-11-18 | 11C. Consultas de practicantes, supervisores, postulaciones, catálogo y Configuración | `6d6b79a` |
| 2026-11-18 | 11D. Insights, indicadores, historial, líneas de tiempo y notificaciones | `31d127d` |
| 2026-11-18 | 11E. Dashboards y Inicio (cierra el paso 11 y la Fase 2) | `006022d`; docs `1a19c9f`; PR #25 fusionado en `4082eaa` |
| 2026-11-18 | Hash de cierre del paso 11 en `PROGRESO.md` | `40cfbc9`; PR #26 fusionado en `2f33f79` |
| 2026-11-18 | Ajustes a mano de `docs/` de las Fases 1 y 2 (hechos por los autores) | `3d6f019`; PR #27 fusionado en `6cdd2fb` |

### Fases 3 y 4 — acceso, layout y `compartido/`

| Fecha | Fase | Paso | Commit / PR |
|---|---|---|---|
| 2026-10-22 | 3 | 1. Acceso y sesión simulada | `7edc37d` (PR #4) |
| 2026-10-22 | 3 | Dependencias con versiones exactas (`@hookform/resolvers` 5.2.2) | `29f3da4` |
| 2026-10-22 | 3 | Lint de `iniciarSesion` y pruebas de `PaginaAcceso` | `2c8d707` |
| 2026-10-23 | 3 | 2, 3, 4 y 6. Router, guarda, layout, menús y páginas vacías | `4fbca0e` |
| 2026-10-23 | 3 | 5. Franja de contraseña temporal | `627303a` |
| 2026-10-23 | 3 | Formato (prettier) de layout y menús | `1f8b0be` |
| 2026-10-23 | 4 | 1a. `select` y `textarea` | `f2f3b47` |
| 2026-10-23 | 4 | Docs de las fases 3 y 4 | `51e428d` |
| 2026-10-24 | 4 | `sonner` 2.0.8 | `9e89afe` |
| 2026-10-24 | 4 | 1b. Toast, esqueleto y estado vacío | `8d9ac21` |
| 2026-10-24 | 4 | 1b. Modal de confirmación | `5e796d2` |
| 2026-10-24 | 4 | 1c. Pestañas con contador, tabla compacta, búsqueda | `be181b5` |
| 2026-10-24 | 4 | 5. Tablero Kanban | `aab2185` |
| 2026-10-25 | 4 | 2, 3, 4, 7 y 8 (insignias, tarjetas, línea de tiempo, modal PR, formulario de tarea) | `7a78c98` |
| 2026-11-07 | 3–4 | Eliminar página de prueba, extraer redirecciones de sesión, migrar acciones a `domain/`, derivar devolución del historial | eliminación `d0f35ce` (PR #9, `8316b1b`); devolución `70f6510`; redirecciones y acciones `6eb2516`; docs `9d644dd`; PR #10 fusionado en `884b2e9` |
| 2026-11-18 | 4 | 6–11. Integración de detalle, PR, formulario, notificaciones y perfil; limpieza final de la página temporal | `4d7b47d` (tablero y detalle con la semilla) y `a4d2e54` (cierre de la Fase 4) |
| 2026-11-18 | 3–4 | Integración del Bloque 3 de la Fase 2 en las ramas de interfaz | `48abbbc` |
| 2026-11-18 | 4 | Conexión de pantallas, sub-paso 0. Acceso, Mi perfil y notificaciones usan los servicios de la Fase 2 (`cuentas/`, `seguimiento/`); se retiran `services/cuenta.ts`, `autenticacion.ts`, `marcar*` de `notificaciones.ts` y `auth/iniciarSesion.ts`. El acceso vuelve a emitir los avisos de fin de práctica (F6-A) | `83b1315` |
| 2026-11-18 | 4 | Conexión de pantallas, sub-paso a). Adaptadores de las consultas a los componentes compartidos en `src/app/adaptadores/` (`tarea`, `tablero`, `eventos`, `notificacion`) y tabla de rutas de las notificaciones | `0ed86c9` |
| 2026-11-18 | 4 | Conexión de pantallas, sub-paso b). Campana y «Ver todas» leen con `listarNotificaciones` (hook `useNotificaciones`); `CampanaNotificaciones` recibe `noLeidas`; se retira `notificacionVista.ts` | `7269ba6` |
| 2026-11-18 | 4 | Conexión de pantallas, sub-paso c). Detalle de tarea, Kanban y «Ver todas las terminadas» con `obtenerTarea`, `obtenerTableroProyecto` y `listarTerminadasDeProyecto`; mapeador de acciones; editar con `FormularioTarea`; regla D6-A en `domain/` (`responsableTarea.ts`); se retiran `accionesDeTarea.ts` y `datos.ts` de `ejemplos/` | `7354f39` |
| 2026-11-18 | 4 | Conexión de pantallas, sub-paso d). Mi perfil con `obtenerMiPerfil` y la regla `camposDelPerfil` de `domain/` (campos por rol y cuáles se editan); `PaginaPerfil` pasa a `src/app/perfil/`; el formulario reutiliza `esquemaCorreo` y `esquemaCelular` (H3); se retiran `responsabilidadesPerfil.ts` y el bloque de responsabilidades | `f2bb209` |
| 2026-11-18 | 4 | Conexión de pantallas, sub-paso e). `PaginaDesarrollo` pasa a `src/app/desarrollo/`, se elimina `src/app/ejemplos/` y se retira `ACCESO_RAPIDO_NO_DISPONIBLE`. **Cierre de la Fase 4** | `9ea9835` |

### Fase 5 — panel del Administrador

| Fecha | Módulo | Paso | Commit / PR |
|---|---|---|---|
| 2026-11-18 | 5.1 Postulaciones | Bloque 1 (lectura): listado, detalle, rutas por prefijo, adaptadores y `decisiones` en `obtenerPostulacion` | `61f368a` |
| 2026-11-18 | 5.1 Postulaciones | Bloque 2 (decisiones): aprobar con la contraseña temporal una sola vez, rechazar, reconsiderar y «Analizando…» / error de evaluación | `f8baf90` |
| 2026-11-18 | 5.1 Postulaciones | Bloque 3 (criterios, áreas y especialidades): página de criterios, editor de bloque con «Suma actual: N/100», adaptador `catalogo`, activar solo con bloque válido, `Insignia` de catálogo y ruta de sus notificaciones | `b47d571` |
| 2026-11-18 | 5.2 Practicantes | Bloques 1 a 3: listado y detalle, «Asignar a proyecto», editar datos de la práctica, restablecer contraseña, finalizar y reactivar; `acciones`, `tareas_a_liberar` y `listarProyectosAsignables` en las consultas; `Insignia` de practicante; aviso que lleva al detalle | `2f3a4c9` |
| 2026-11-19 | 5.3 Supervisores | Bloque 1 (lectura): listado con pestañas y búsqueda, detalle con proyectos a cargo, tareas por revisar y línea de tiempo; adaptador `supervisores`; `Insignia` de supervisor | `b0d150f` |
| 2026-11-19 | 5.3 Supervisores | Bloque 2a: `ModalContrasenaTemporal` pasa de `postulaciones/` a `compartido/` | `97fda22` |
| 2026-11-19 | 5.3 Supervisores | Bloque 2b: «Nuevo supervisor», editar nombre y correo y restablecer contraseña; `acciones` en `obtenerSupervisor` | `16b67b6` |
| 2026-11-19 | 5.3 Supervisores | Bloque 3: desactivar con bloqueo por proyectos pendientes, reactivar y reasignar proyectos; `proyectos_pendientes` y `supervisores_destino` en `obtenerSupervisor` | `c5d5e0d` |
| 2026-11-19 | 5.4 Proyectos | Bloque 1 (lectura): listado con pestañas, filtro por supervisor y búsqueda; detalle con Resumen y Equipo en `?pestana=`; adaptador `proyectos`; eventos de proyecto en la línea de tiempo; el aviso de un proyecto lleva a su detalle | `5431b8a` |
| 2026-11-19 | 5.4 Proyectos | Bloque 2 (tablero): pestaña «Tablero», detalle de tarea dentro del proyecto (`DetalleDeTarea` en `app/tareas/`), «Nueva tarea» y `puede_crear_tarea` en `obtenerTableroProyecto` | `da41753` |
| 2026-11-19 | 5.4 Proyectos | Bloque 3 (datos): «Nuevo proyecto» y «Editar proyecto» como diálogo, reunión, rama base y enlaces; `puede_crear` y `supervisores_disponibles` en `listarProyectos`, `acciones` en `obtenerProyecto` | `9b2b378` |
| 2026-11-19 | 5.4 Proyectos | Bloque 4 (equipo y ciclo de vida): pausar, reanudar, finalizar y reactivar con nota, cambiar supervisor, asignar y quitar practicantes; `ciclo_de_vida`, `supervisores_destino`, `puede_asignar`, `puede_quitar` y `listarPracticantesAsignables` | `eeb4d50` |
| 2026-11-19 | 5.5 Tareas | Listado transversal con pestañas y filtros, detalle en `/administrador/tareas/:idTarea`, avisos de tarea al detalle, «Nueva tarea» eligiendo el proyecto (`DialogoNuevaTarea` compartido con el tablero del 5.4) y `proyectos_para_crear` en `listarTareas` | `c8d82e1` |
| 2026-11-20 | 5.6 Reportes | Insights (7 reglas, filtros, revisado por persona y notificar) e Indicadores (periodo de 1 a 365 días con atajos, tarjetas y tablas por proyecto y por practicante); `Insignia` de severidad | `77ecb38` |
| 2026-11-20 | 5.6 Reportes | Instalación de `recharts` 3.11.0 (versión exacta) | `301442a` |
| 2026-11-20 | 5.6 Reportes | Gráfico de practicantes por área con alternativa en tabla | `864777f` |
| 2026-11-20 | 5.6 Reportes | Se restaura el filtro por proyecto de Indicadores, que §5.6 pide y se había quitado por error | `5a81b38` |
| 2026-11-20 | 5.7 Historial | Historial de actividad de solo lectura: listado, filtros, búsqueda y panel de detalle con valor anterior y nuevo; adaptador `historial` | `18b381b` |
| 2026-11-20 | 5.8 Configuración | Configuración por secciones con guardar y restaurar, validación del servicio junto a cada casilla, tarjeta de GitHub de ejemplo y «Restablecer datos» (solo prototipo); adaptador `configuracion` | `c814dca` |
| 2026-11-20 | 5.8 Configuración | La fecha de la última verificación de la tarjeta de GitHub es relativa a hoy | `59d3f76` |
| 2026-11-20 | 5.9 Dashboard | Los listados de 5.1 a 5.5 abren en la pestaña de `?pestana=` (`usePestanaInicial` y lista de pestañas válidas por módulo) | `f3f787c` |
| 2026-11-20 | 5.9 Dashboard | Dashboard del Administrador: tarjetas con enlace y filtro, postulaciones, alertas, practicantes por área, por revisar, reuniones y avance; tarjeta de insight compartida con Reportes | `0f2db6f` |

**Estado de pruebas (2026-11-20, en `0f2db6f`):** 3.868 pruebas en 169 archivos, todas aprobadas (`npx vitest run --testTimeout=60000 --maxWorkers=3`);
el módulo 5.9 sumó 24 y 3 archivos de prueba (9 de la pestaña por la dirección en `f3f787c`; adaptador y página del Dashboard en `0f2db6f`). No se hicieron
pruebas de mutación. Antes, en `59d3f76`: 3.844 pruebas en 166 archivos; el módulo 5.8 sumó 21 y 2 archivos de prueba. Antes, en `18b381b`: 3.823 pruebas en 164 archivos; el módulo 5.7 sumó 20 y 2 archivos de prueba (adaptador y página del historial). No se hicieron pruebas de mutación. Antes, en `5a81b38`: 3.803 pruebas en
162 archivos; el módulo 5.6 sumó 55 y 5 archivos de prueba (filtros de insights, adaptador de reportes, pestañas de Insights e Indicadores y gráfico). No se hicieron
pruebas de mutación. Antes, en `c8d82e1`: 3.748 pruebas en 157 archivos; el módulo 5.5 sumó 62 y 5 archivos de prueba (filtros, adaptador, listado, detalle y «Nueva tarea», más consultas y ajustes). No se hicieron
pruebas de mutación. Antes, en `eeb4d50`: 3.686 pruebas en 152 archivos; el bloque 4 del módulo 5.4 sumó 64 y 2 archivos de prueba (ciclo de vida y equipo, más consultas y adaptador). Antes, en `9b2b378`:
3.622 pruebas en 150 archivos; el bloque 3 sumó 51 y 3 archivos de prueba (nuevo proyecto, editar proyecto y enlaces, más consultas). Antes, en
`da41753`: 3.571 pruebas en 147 archivos; los bloques 1 y 2 del módulo 5.4 sumaron 94 y 6 archivos de prueba (filtros, adaptador, listado y detalle de proyectos; tablero con «Nueva
tarea» y detalle de tarea; más ajustes en `tablero`, `FormularioTarea`, `eventos`, `notificacion` y las consultas). No se hicieron
pruebas de mutación. Antes, en `c5d5e0d`: 3.477 pruebas en 141 archivos; el
módulo 5.3 sumó 97 y 7 archivos de prueba (consultas ampliadas, adaptador, filtros, listado, detalle, nuevo supervisor, acciones y ciclo de
vida, más ajustes en `Insignia`). No se hicieron pruebas de mutación en este módulo. Con el equipo lento, algunas pruebas pesadas de 5.1 a 5.3
superan el límite de 5 s por defecto y pasan con el límite ampliado; no cambia ninguna lógica. Antes, en `2f3a4c9`: 3.380 pruebas en 134
archivos; el módulo 5.2 sumó 104 y
7 archivos de prueba (consultas ampliadas, adaptador, filtros, listado, detalle, asignar, acciones y ciclo de vida, más ajustes en
`Insignia` y `ModalContrasenaTemporal`). No se hicieron pruebas de mutación en este módulo. Antes, en `b47d571`: 3.276 pruebas en 127 archivos; el bloque 3 del
módulo 5.1 sumó 62 y 4 archivos de prueba (adaptador del catálogo, editor de bloque, formulario de nombre y página de criterios). No se
hicieron pruebas de mutación en este bloque. Antes, en `f8baf90`: 3.214 pruebas en 123 archivos; el bloque 2 del
módulo 5.1 sumó 40 netas (modal de la contraseña 8, acciones 19, evaluación y decisiones en el detalle 14, menos una prueba del
bloque 1 que quedó superada). Antes, en `61f368a`: 3.174 pruebas en 120 archivos; el bloque 1 del
módulo 5.1 sumó 106 (listado 20, detalle 17, filtros 32, adaptador 12, barra de puntaje 4, desglose 4, `decisiones` 5 y las ajustadas de
eventos, notificaciones, menús y rutas).

**Estado de pruebas anterior (2026-11-18, en `9ea9835`):** 3.068 pruebas en 114 archivos, todas aprobadas (`npx vitest run`); el sub-paso e)
no cambió el total (mover archivos y quitar un código sin uso). Antes eran 3.068 en 114 (`f2bb209`), y antes
3.017 en 112 (`7354f39`): el sub-paso d) sumó 51 netas (regla de `domain/`, consulta, adaptador, formulario y página de Mi
perfil, y se retiraron las de `PaginaPerfil` y `responsabilidadesPerfil` de `ejemplos/`). Antes, 2.937 en 109 (`7269ba6`): el
sub-paso c) (`7354f39`) sumó 80 netas (23 de la regla D6-A y de la consulta; el resto de adaptadores,
mapeador, `useConsulta`, listado de terminadas, detalle, tablero y `PaginaDesarrollo`) y retiró las de `accionesDeTarea`. Antes,
2.915 en 108 (`0ed86c9`): el sub-paso b) agregó 23 pruebas y retiró 1 (la de `notificacionVista`). Antes, 2.871 en 104
(`83b1315`): el sub-paso a) sumó 44 pruebas en 4 archivos. Y antes, 2.890 en 108 (`48abbbc`): el sub-paso 0 retiró 23
pruebas por duplicadas y agregó 4. `npx tsc -b`, `npx prettier --check` y `npm run build` sin errores; `npx eslint` con 0 errores y el aviso conocido en
`src/compartido/ui/button.tsx` (Vite avisa que el chunk principal supera 500 kB).
`npx tsc -b` y `npx prettier --check .` sin errores; `npx eslint .` con 0 errores y el aviso conocido en
`src/compartido/ui/button.tsx`; `npm run build` OK (Vite avisa que el chunk principal supera 500 kB). Desglose de la
Fase 2 (2.836 pruebas en 99 archivos antes de la integración): 22 del almacén, 180 de la
semilla, 11 de restablecer, 136 de las utilidades de `services/`, 165 de los servicios de tareas del paso 5
—50 en 5A, 82 en 5B y 33 en 5C—, 52 de los servicios de Pull Request del paso 6 —36 en 6A y 16 en 6B—, 110
del sub-paso 7A —12 en `domain/`—, 142 del sub-paso 7B —32 en `domain/`—, 127 del sub-paso 8A —19 en
`domain/`—, 105 del sub-paso 8B, 164 del sub-paso 9A, 117 del sub-paso 9B —35 en `domain/`—, 70 netas del 10A (se retiraron las 8 de
`auth/iniciarSesion`), 73 del 10B, 93 del 10C parte 1 —todas en `domain/`— y 70 del 10C parte 2; las de 8B, 9A, 10A, 10B y
10C parte 2 todas en `services/`; y 588 del paso 11: 79 de 11A parte 1 —todas en `domain/`—, 99 de 11A parte 2, 92 de 11B
—9 en `domain/`—, 133 de 11C, 125 de 11D —17 en `domain/`— y 60 de 11E);
la integración sumó 54 pruebas netas (2.836 → 2.890) y 9 archivos (99 → 108).

### Fase 6 — panel del Supervisor

| Fecha | Módulo | Qué se hizo | Commit |
|---|---|---|---|
| 2026-11-20 | 6.1 Mis proyectos | Listado en tarjetas con pestañas y búsqueda, detalle compartido con el Administrador (rutas según el rol) y `aTarjetaDeProyecto` | `179e3a6` |
| 2026-11-20 | 6.1 Mis proyectos | Los avisos de proyecto del Supervisor llevan a `/supervisor/proyectos/:id` | `f07aa48` |
| 2026-11-21 | 6.2 Tareas | Tareas del Supervisor sobre el listado y el detalle del 5.5: pestaña inicial por rol, esqueleto de carga, «Días esperando» y avisos de tarea al detalle | `424779a` |
| 2026-11-21 | 6.3 Practicantes a cargo | Listado en tabla con pestañas, filtro y búsqueda, y detalle de solo lectura del Supervisor; avisos de persona al detalle; `ListaDeTareasDePracticante` compartida | `100efb3` |
| 2026-11-21 | 6.4 Reportes | Reportes del Supervisor sobre el módulo 5.6: sus 5 reglas, indicadores sin postulaciones ni área y enlaces según el rol (`rutaDelElemento(tipo, id, rol)`, `rutaDeReportes(rol)`) | `8194b00` |
| 2026-11-21 | 6.5 Dashboard | Dashboard del Supervisor: tarjetas compactas con enlaces con filtro, «Por revisar» a todo el ancho, alertas, reuniones y avance; Tareas lee `?vencidas=1` y `?sin_asignar=1`, Mis proyectos lee `?pestana=`; bloques compartidos en `src/app/dashboard/` | `7ece550` |
| 2026-11-21 | Cierre de la Fase 6 | Los cinco módulos del panel del Supervisor (6.1 a 6.5) terminados; falta su cierre en `main` con la etiqueta `fase-6-completa` | — |

**Estado de pruebas (2026-11-21, en `7ece550`):** 4.012 pruebas en 183 archivos, todas aprobadas (`npx vitest run --testTimeout=60000 --maxWorkers=3`);
el módulo 6.5 sumó 39 y 4 archivos de prueba (Dashboard del Supervisor, su adaptador, y los filtros por dirección de Tareas y de Mis proyectos). No se hicieron pruebas de
mutación. Antes, en `8194b00`: 3.973 pruebas en 179 archivos; el módulo 6.4 sumó 18 y 1 archivo de prueba (Reportes del Supervisor, más las del adaptador con rol en
`reportes.test.ts`). No se hicieron pruebas de mutación. Antes, en `100efb3`: 3.955 pruebas en 178 archivos; el módulo 6.3 sumó 34 y 4 archivos de prueba (listado, detalle, filtros y adaptador de Practicantes a cargo; más las de los avisos en `notificacion.test.ts` y la
etiqueta «Anterior» de `Insignia`). No se hicieron pruebas de mutación. Antes, en `424779a`: 3.921 pruebas en 174 archivos; el módulo 6.2 sumó 24 y 2 archivos de prueba (Tareas del Supervisor y pestaña inicial, más pruebas de los avisos en `notificacion.test.ts`). No se hicieron
pruebas de mutación. Antes, en `f07aa48`: 3.897 pruebas en 172 archivos; el módulo 6.1 sumó 29 y 3 archivos de prueba (Mis proyectos, detalle del Supervisor y adaptador de la tarjeta; más 2 pruebas de los avisos en
`notificacion.test.ts`). No se hicieron pruebas de mutación. Antes, en `0f2db6f`: 3.868 pruebas en 169 archivos.

## Pendientes

### Fase 1 (`domain/`)

- [x] Paso 5: máquina del estado del PR (§7.4), con el riesgo C1 resuelto (`5aba475`, PR #15).
- [x] Paso 6: generación de ID legible (`CODIGO-NNN`), sin tope y con el correlativo no reutilizable
      (`9177852`).
- [x] Paso 7: puntaje de postulaciones (`aeb6ea5`).
- [x] Paso 8: reglas de insights (`6f61810` y `e784e4e`).
- [x] Paso 9: indicadores (`998987e`, `e408893` y `86b0167`).
- [x] Paso 10: ciclo de vida (`3c78c4f` y `2a3dc50`).
- [x] Pruebas mínimas de la sección 9 del plan (`e1e112d`).
- [x] Revisión de los tipos de `domain/` por los autores («Listo cuando» de la Fase 1; los tipos no se
      cambian sin avisar). Hecha y confirmada por Gabriel y Roxana (2026-11-18): sin cambios en los tipos.
- [x] Ajustar a mano el plan §9, Fase 1, pruebas obligatorias (hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`)): la línea «Motivo/nota faltante cuando es
      obligatorio → rechazada» no coincide con el dominio. Vacío o solo espacios da `TEXTO_OBLIGATORIO`; si
      todavía no se escribió, la acción queda pendiente de texto y devuelve qué texto exige, y el servicio
      la rechaza si falta (decisión del paso 3). Texto propuesto en `DECISIONES.md`.
- [x] Cierre de la Fase 1: hecho el 2026-11-18. Los autores confirmaron los tipos y el ajuste del plan; `development` se fusionó en
      `main` (PR #29, `6b51fbd`) y la etiqueta anotada `fase-1-completa` apunta a `e1e112d` (plan §11).

### Fase 2 (`data/`, `services/`)

- [x] Paso 1: almacén con persistencia y recuperación segura (`809ff44`).
- [x] Paso 2: semilla completa, coherente por construcción y con 180 pruebas (`91b29e0`).
- [x] Paso 3: restablecer datos de demostración (acción `restablecer` del almacén) y guardado protegido
      (`d3d4800`).
- [x] Paso 4: utilidades base de `services/` (`c2b3f47`). Cierra el Bloque 1 (pasos 1 a 4).
- [x] Sub-paso 5A: crear, editar y eliminar tareas (`2c54c04`).
- [x] Sub-paso 5B: las 7 transiciones de tarea y el puerto `github` en `Entorno` (D4-A) (`2726b9a`).
- [ ] Semilla (opcional, para la demostración): ninguna tarea EN_PROGRESO tiene un PR previo, así que el
      recálculo al volver a llegar (§7.4) no se ve en pantalla sin reabrir antes una tarea (por ejemplo
      `PL2D-001`, PR fusionado); hoy solo lo cubren las pruebas.
- [x] Sub-paso 5C: «Requiere supervisión», «Requiere PR» (D3-A, D5-A) y la prueba de flujo crear → tomar →
      enviar → aprobar (`98ead18`). **Paso 5 terminado.**
- [x] Sub-paso 6A: listar ramas y crear Pull Request (P1 a P5) con `ejecutarConsulta` (`59dc320`).
- [x] Sub-paso 6B: `cerrarPullRequest` y el flujo de la Fase 2 terminando en «crear PR» (`9600f46`). **Paso 6
      y Bloque 2 terminados.**
- [x] PR del Bloque 2 (`feat/fase2-servicios-tareas-pr`) a `development`, revisado por ambos autores (PR #23,
      `34e0656`).
- [x] Ajustar a mano el plan §9, Fase 2, paso 6 (hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`)): «No requiere PR» pasa al paso 5 (decisión D3-A); el paso 6
      queda con crear y cerrar PR, ramas de ejemplo, error preparado, PR existente y recálculo.
- [x] Ajustar a mano el plan §8 (y la propuesta §7.7; hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`)): el caso de error de PR
      preparado es «rama inexistente», con la rama de ejemplo `feature/<código>-rama-eliminada` (P2-A); las
      ramas de ejemplo son `feature/<código>-NNN` más `…-con-conflictos` (P1-A, P5-A).
- [ ] Riesgo aceptado (P3-A): si dos tareas comparten un PR vinculado y una lo cierra, la otra conserva su
      etiqueta hasta que vuelva a llegar a supervisión o a terminada.
- [x] Fase 4 (detalle de tarea): se señala el caso D6-A en que una tarea EN_PROGRESO conserva como responsable
      a un practicante INACTIVO o con la asignación de baja; Administrador o Supervisor pueden identificar que
      deben liberarla con motivo. Hecho en el sub-paso c) (`7354f39`): la regla vive en `domain/responsableTarea.ts`
      (`motivosDeAtencionDelResponsable`: cuenta inactiva, cuenta no encontrada o sin asignación vigente), la consulta
      `obtenerTarea` entrega `atencion_responsable` solo al Administrador y al Supervisor, y `DetalleTarea` solo lo muestra.
- [x] Sub-paso 7A: evaluar, aprobar, rechazar y reconsiderar postulaciones (`42c0b25` y `debd47e`).
- [x] Sub-paso 7B: áreas técnicas, especialidades y criterios de evaluación (crear, editar, activar y
      desactivar) (`3368603` y `5eb54a4`). **Paso 7 terminado.**
- [x] Fase 5.1 (formularios de criterios): el editor de un bloque llama a `guardarCriteriosDeBloque` con el
      bloque completo (los criterios no se borran: se desactivan), muestra «Suma actual: N/100» con
      `sumaPesosActivos` y `validarBloqueCriterios`, y ofrece activar un área o especialidad solo cuando su
      bloque es válido. Nacen inactivas. Construido en el bloque 3 (`EditorBloqueCriterios`, `SeccionDeArea` y `PaginaCriterios`);
      hecho en `b47d571`.
- [x] Fase 5.1: «Analizando…», el mensaje cuando la evaluación falla y la contraseña temporal visible una sola vez: hecho en el
      bloque 2 (`f8baf90`). Al abrir una postulación sin evaluación se evalúa una sola vez y se ve «Analizando…»; si falla, «No se
      pudo evaluar: <mensaje>» y las decisiones siguen disponibles (E3-A y E5-A). La contraseña temporal se muestra una sola vez en un
      modal que solo cierra «Entendido», con «Copiar contraseña». La semilla evalúa a todas, así que «Analizando…» se ve solo al
      quitar una evaluación (se cubre con pruebas).
- [x] Ajustar a mano la propuesta §5.1/§5.2 (hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`)): la fecha de ingreso de un practicante nuevo es el día de la
      aprobación (hora de Perú) y la de fin se calcula con la duración vigente (supuesto confirmado en 7A).
- [x] Sub-paso 8A: asignar, quitar, finalizar y reactivar practicantes y editar los datos de su práctica
      (`861c5f3` y `df57b0d`).
- [x] Sub-paso 8B: `crearSupervisor`, `editarSupervisor`, `desactivarSupervisor`, `reactivarSupervisor`,
      `restablecerContrasena` (practicante y supervisor) y `emitirAvisosFinDePractica` (`a52fe0c`). **Paso 8
      terminado.** Las validaciones de correo y celular (F7-A: 9 dígitos que empieza con 9) quedan en
      `src/services/cuentas/validaciones.ts` para que Mi perfil (paso 10) las reutilice.
- [x] Sub-paso 9A: `crearProyecto`, `editarDatosProyecto`, `cambiarRamaBase`, `definirReunion`, `agregarEnlace`,
      `editarEnlace` y `quitarEnlace` (`30b27ab`).
- [x] Sub-paso 9B: reglas de estado en `src/domain/estadoProyecto.ts` (`e15e4f5`) y los servicios `cambiarSupervisor`,
      `reasignarProyectosDeSupervisor` (G4-A), `pausarProyecto`, `reanudarProyecto`, `finalizarProyecto` y
      `reactivarProyecto` (exige supervisor ACTIVO; sin aviso, G2-A) (`12efa20`). **Paso 9 terminado.**
- [x] `reasignarProyectosDeSupervisor` (F1-A): ya permite, en una sola operación, dejar a un supervisor sin proyectos para
      poder desactivarlo (una prueba lo recorre: reasignar todos → `desactivarSupervisor`). Para la **Fase 5.3**: la
      pantalla propone todos los proyectos activos o en pausa del supervisor y exige elegir un nuevo supervisor para cada
      uno; el servicio no lo exige (G4-A), y `desactivarSupervisor` avisa cuántos quedan.
- [x] (hecho en el bloque 4 del módulo 5.4) Fase 5.4 (Proyectos): los botones de estado salen de `accionesDeEstadoDisponibles(estado)` (reactivar además exige un
      supervisor activo: si no, el mensaje dice que primero se reactive al supervisor); pausar, reanudar, finalizar y
      reactivar piden una nota; finalizar muestra el aviso con la cantidad de tareas esperando supervisión (bloqueo) o la
      de tareas en progreso que se liberarán (el servicio las calcula con `finalizarProyecto` de `domain/`).
- [x] (hecho en `9b2b378`) Fase 5.4 (Proyectos): los formularios usan los esquemas de `src/services/proyectos/esquemas.ts` y ponen el código en
      mayúsculas y sin espacios **antes** de enviarlo (el servicio no lo normaliza, G1/9A); crear muestra el error del
      código en `campos.codigo`; editar no ofrece el código; la reunión se quita enviando día y hora vacíos; reactivar no
      avisa al equipo (G2-A) y los autores pueden sumar esa fila a §8.1 si lo quieren.
- [ ] **Pendiente (paso aparte): mover a `domain/` la regla «un proyecto nuevo siempre con un supervisor activo» (§5.4).** Hoy la
      comprueba `crearProyecto` con código propio en `services/proyectos/datos.ts` (`rol === 'SUPERVISOR'` y `estado === 'ACTIVO'`, error
      `SUPERVISOR_NO_VALIDO`) y la repite `listarProyectos` en `supervisores_disponibles` (módulo 5.4, bloque 3) para ofrecer solo
      candidatos válidos. Decisión de los autores: dejarlo así por ahora y hacerlo en un paso aparte, con la regla pura en `domain/`,
      que el servicio y la consulta la usen, sus pruebas por combinación (rol × estado × existencia) y la mutación que haga fallar
      cada prueba. `puedeCambiarSupervisor` ya tiene una condición equivalente para otro caso: conviene reutilizar o unificar.
- [ ] Fase 6 (Supervisor, Tareas, §9.1.3): en la pestaña «Esperando supervisión» se agrega la columna «Días esperando» (regla de supervisión demorada
      de 3 días). `listarTareas` ya entrega `dias_esperando` y el adaptador `aTareas` lo lleva como `diasEsperando`; en el módulo 5.5 del
      Administrador no se muestra porque §5.5 no lo pide. Los avisos de tipo `TAREA` del Supervisor y del Practicante siguen yendo a la página
      del módulo hasta que tengan su detalle (Fases 6 y 7).
- [x] Ajustar a mano la propuesta §5.4 con los supuestos del paso 9 (hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`)): el repositorio es
      `https://github.com/{organización}/{repositorio}`; la rama base no lleva espacios; la reunión y los enlaces
      también se editan en un proyecto finalizado; quitar la reunión avisa al equipo; reactivar no avisa.
- [x] Paso 10 (login): hecho en 10A (`d8f89b4`). `iniciarSesion` debe leer de `data/` para que `Usuario.estado = INACTIVO` bloquee de verdad
      el acceso de quien finalizó su práctica o de un supervisor desactivado (hoy el bloqueo solo lo aplican los
      servicios y `puede()`); y llamar a `emitirAvisosFinDePractica` al iniciar sesión (F6-A: si ese día exacto nadie
      lo ejecuta, el aviso se pierde). El servicio ya es idempotente y no escribe cuando no hay nada nuevo.
- [x] Paso 10 (Mi perfil): hecho en 10A (`d8f89b4`). El cambio de correo propio y el de celular usan `esquemaCorreo`, `esquemaCelular` y
      `correoEnUso` de `src/services/cuentas/validaciones.ts`; el cambio de contraseña propia va en
      `src/services/cuentas/`, junto a `restablecerContrasena`, y su evento nunca lleva la contraseña (el historial
      rechaza cualquier campo cuyo nombre la contenga, también `debe_cambiar_contrasena`).
- [x] Fase 3/4 (sesión): `GuardaRuta` revalida la sesión guardada contra el almacén (`useSesionActiva`, `a4d2e54`): exige que la
      cuenta exista, esté ACTIVO y conserve el rol, cierra la sesión si no y refresca el resumen persistido. Lo cubren las
      pruebas de `GuardaRuta.test.tsx` (cuenta inactiva, cambio de rol y refresco).
- [x] Fase 4 (Mi perfil): hecho en el sub-paso d) (`f2bb209`). `editarMiPerfil` y `cambiarMiContrasena` devuelven la
      `SesionUsuario` nueva y la pantalla la aplica con `abrirSesion` (si no, la barra superior y la franja de contraseña
      temporal no se refrescan). Los errores vienen por campo en `campos` (`nombre`, `correo`, `celular`, `discord`,
      `cuenta_github`, `disponibilidad_horaria`, `contrasenaActual`, `contrasenaNueva`, `confirmacion`; el formulario usa
      los mismos nombres, salvo los de la contraseña, que la página renombra). Discord, GitHub y disponibilidad vacíos quitan
      el dato. El Administrador no tiene Discord, GitHub ni disponibilidad: esos campos **no existen para su rol** y no se
      muestran.
- [ ] Fase 4 (campana) y Reportes (5.6 y 6.4): la campana usa `marcarNotificacionLeida` al abrir un aviso y
      `marcarTodasLeidas`; Reportes usa `marcarInsightRevisado` (`INSIGHT_YA_REVISADO` desactiva el botón) y
      `notificarDesdeInsight` (sin campo libre; el aviso de supervisión demorada apunta a la tarea).
- [ ] Fase 5.8 (Configuración): los formularios llaman a `guardarConfiguracionSeccion` y `restaurarSeccionConfiguracion`
      por sección, muestran `campos` (`CLAVE` o `CLAVE.campo`, por ejemplo `EVALUACION_BANDA_AMBIGUA.minimo`) y usan
      `etiquetaParametro` para los títulos. «Restablecer datos» aplica el `{ usuario }` que devuelve el servicio
      (refresca o cierra la sesión) y vuelve al inicio.
- [x] Paso 11 (hecho en 11D, `31d127d`, y 11E, `006022d`): las consultas de insights (Dashboard y Reportes) reutilizan `calcularInsightsVigentes`,
      `filtrarInsightsPorAlcance` y `aplicarRevisiones` (o `insightsParaUsuario`) con los umbrales de `umbralesDe`.
- [x] Ajustar a mano la propuesta con los supuestos del paso 10 (hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`)): §8.2 (Discord y GitHub sin espacios, hasta 32 y 39
      caracteres, vacío quita el dato), §8.1 (el aviso «Notificar» lleva el texto del insight y marcar como leída no tiene
      fila en la matriz de §4) y §5.8 (proporción de enteros de 0 a 100 que suman 100; `100/0` y `0/100` son válidas).
- [x] Paso 11 (hecho en 11C, `6d6b79a`; consultas con alcance por rol): las pantallas de supervisores y practicantes (Fases 5.2, 5.3 y 6.3)
      leen con consultas del paso 11; `emitirAvisosFinDePractica` y los demás servicios del paso 8 no son consultas.
- [x] (hecho en `16b67b6` y `c5d5e0d`) Fase 5.3 (Supervisores): «Nuevo supervisor» usa `crearSupervisor` y muestra la contraseña temporal una sola
      vez; desactivar muestra el mensaje con la cantidad de proyectos que trae el servicio; restablecer contraseña
      también se muestra una sola vez. Un supervisor nuevo no tiene proyectos (estado vacío del panel).
- [x] (hecho en `2f3a4c9`) Fase 5.2 (Practicantes): «Asignar a proyecto» usa `asignarPracticantes` con una lista de pares (atajo de
      «Sin proyecto», varios proyectos o varios practicantes); finalizar avisa «Tiene N tareas en progreso que serán
      liberadas» (el servicio las calcula con `finalizarPractica` de `domain/`); la contraseña temporal de
      restablecer se muestra una sola vez; editar datos propone la nueva fecha de fin con `fechaFinPrevista` y envía
      ambas fechas (F5-A); reactivar no cambia la fecha de fin, que puede quedar vencida (F4-A).
- [x] Paso 11 (Bloque 3; terminado en 11A a 11E): servicios por módulo, consultas con
      alcance por rol (pueden usar `ejecutarConsulta`), más sus pruebas. Cada servicio recibe
      `(entrada con idActor, entorno = ENTORNO)`, usa `ejecutarServicio`, resuelve al actor con `obtenerActor`
      dentro de la transacción, valida con `validarEntrada` (Zod) y `puede()`, y suma a `MENSAJES` los códigos
      nuevos que no traigan `mensaje` del dominio (una prueba exige que todo código conocido tenga mensaje).
- [ ] Mientras no haya escrituras, la semilla se regenera con la fecha de hoy en cada carga; tras la primera
      escritura los datos quedan fijos hasta restablecer (`restablecer`, paso 3).
- [x] Paso 10 (servicios de configuración): hecho en 10C (`185c6ae` y `66ff605`). Servicio `restablecerDatosDemostracion(usuario)` que valide
      `puede('RESTABLECER_DATOS_DEMOSTRACION')` (ya existe: solo Administrador), devuelva el resultado estándar
      y simule la demora. Contrato de la sesión activa: si el usuario sigue existiendo en la semilla nueva se
      conserva y se refresca su copia (nombre, correo, contraseña temporal); si no existe, se cierra la sesión.
- [ ] Fase 5.8: botón «Restablecer datos» con confirmación y la marca «solo prototipo»; tras restablecer,
      volver al inicio para no dejar pantallas abiertas sobre registros que ya no existen. La pantalla llama al
      servicio, nunca al almacén.
- [ ] Varias pestañas abiertas: el almacén no se sincroniza entre pestañas (no hay evento `storage`); la otra
      pestaña conserva sus datos hasta recargar y los sobrescribiría con su próxima escritura.
- [x] Paso 6 (servicios de PR): definir el «caso de error de PR preparado» del plan §8 (rama inexistente o
      GitHub no disponible) y las ramas de ejemplo; la semilla deja tareas en `PENDIENTE` listas para crear PR.
      Definido en 6A (`59dc320`): «rama inexistente» con `feature/<código>-rama-eliminada` (P2-A) y el
      catálogo `feature/<código>-NNN` (P1-A).
- [x] Login: `iniciarSesion` consulta los usuarios del almacén por medio de `services/autenticacion.ts`
      (`0307f83`) y, desde 10A (`d8f89b4`), delega en el servicio de `src/services/cuentas/`. `CUENTAS_DEMO` y las
      cuentas duplicadas se retiraron, los accesos rápidos usan IDs estables y `auth/usuariosDemo.ts` ya no existe
      (queda `auth/sesionDePrueba.ts`, solo para tests).
- [ ] Semilla: `ultimo_numero_tarea` es el mayor `numero` de las tareas existentes. Si se añade a la semilla
      una tarea eliminada que sea la última de su proyecto, el contador quedaría por debajo del real.
- [ ] La regla de «no notificar al autor» ya vive en `crearNotificaciones` (`services/`, paso 4). El registro
      de la semilla (`src/data/semilla/registro.ts`) conserva una copia mínima solo para generar los datos
      iniciales; no se reutiliza en los servicios.
- [x] Servicios (pasos 5 a 11): `ejecutarServicio` toma la marca de tiempo **dentro** de la transacción, tras la
      demora; el servicio que escriba `fecha_termino` debe usar `marca.ahora` y el mismo valor en el evento de
      cierre (`TAREA_TERMINADA` o `TAREA_APROBADA`), como ya pide el pendiente de indicadores. Cumplido en
      `marcarTareaTerminada` y `aprobarTarea` (`2726b9a`).
- [ ] Servicios: pasar a `puede()` las asignaciones **de quien actúa** (no las de todo el proyecto). Cumplido
      en los servicios de tareas y de PR con `asignacionesDe` (`src/services/tareas/comun.ts`); sigue vigente
      para los pasos 7 a 11.
- [ ] Los servicios deben pasar SIEMPRE el texto y rechazar si `exige_texto !== null` y falta o viene vacío.
      Cumplido en los servicios de tareas y de PR con `exigirTexto` (`comun.ts`); sigue vigente para los pasos
      7 a 11.
- [x] Aviso al Supervisor cuando el practicante desactiva «Requiere PR» (§7.5/§8.1) (`cambiarRequierePR`,
      `98ead18`).
- [x] Servicios de PR: simular GitHub y, si `necesitaConsultaGitHub(tarea)`, pasar SIEMPRE `github` en el
      evento `TAREA_ENVIADA_O_TERMINADA`; llamar a `siguienteEstadoPR` tras enviar/terminar, tras crear o
      cerrar el PR y tras cambiar «Requiere PR». Detalle en `DECISIONES.md` (paso 5). **Hecho para enviar y
      terminar** en 5B (`2726b9a`, puerto `entorno.github`) y **tras cambiar «Requiere PR»** en 5C (`98ead18`,
      C1), **tras crear el PR** en 6A (`59dc320`, `PR_CREADO` y `GITHUB_INFORMA` por conflictos) y **tras
      cerrarlo** en 6B (`9600f46`, `PR_CERRADO_DESDE_SISTEMA`). Completo.
- [x] Aviso al responsable al editar una tarea `EN_PROGRESO` (`editarTarea`, `2c54c04`).

- [x] Las mutaciones de la interfaz pasan por `services/` y la página de desarrollo temporal es un contenedor de integración sin
      simulaciones locales. Las lecturas del tablero y del detalle usan `services/consultas/` desde el sub-paso c) (`7354f39`) y
      la de Mi perfil, desde el sub-paso d) (`f2bb209`).
- [ ] `fecha_ingreso` del practicante al aprobar; en configuración, `id === clave`.

- [x] **Conectar las pantallas y retirar `src/app/ejemplos/`:** hecho en los sub-pasos 0 a e (cierre de la Fase 4, `9ea9835`).
      Cada pantalla llama a `services/` (acciones) y a `src/services/consultas/` (lecturas) y no filtra ni decide nada. Se
      retiraron `accionesDeTarea.ts` y `datos.ts` (`7354f39`); `almacenNotificaciones.ts` ya no existía;
      `responsabilidadesPerfil.ts` y `PaginaPerfil` salieron de `ejemplos/` (`f2bb209`); y `PaginaDesarrollo` pasó a
      `src/app/desarrollo/` y la carpeta `ejemplos/` se eliminó (`9ea9835`). `PaginaDesarrollo` se conserva como contenedor
      temporal hasta la Fase 7.
- [x] Fase 3 y 4 (adaptadores): hecho en el sub-paso a) (`0ed86c9`). Las consultas devuelven la forma de `domain/` (snake_case y
      fechas ISO) y los adaptadores de `src/app/adaptadores/` las convierten a los tipos de los componentes compartidos
      (`TareaDetalle`, `TareaTablero`, `EventoLinea`, `NotificacionItem`), con `parseISO` en el borde. Esos cuatro tipos se
      conservan como tipos de presentación (ya no son «provisionales»). Ya conectados: la campana con `listarNotificaciones`
      (sub-paso b, `7269ba6`) y el detalle, el tablero y el listado de terminadas con `obtenerTarea`, `obtenerTableroProyecto` y
      `listarTerminadasDeProyecto` (sub-paso c, `7354f39`).
- [x] Fase 4 (campana y «Ver todas»): hecho en el sub-paso b) (`7269ba6`). `listarNotificaciones` con `limite: 8` para la
      campana; `enlace_activo` y `destino` deciden el enlace (la ruta sale de la tabla de `adaptadores/notificacion.ts`);
      `no_leidas` da el punto verde. Mientras no existan los detalles de los módulos, un aviso lleva a la página del módulo
      (divergencia temporal con §8.1).
- [ ] Fase 5 y 6 (listados): las consultas devuelven el conjunto completo del alcance con contadores por pestaña; la pantalla
      filtra pestañas y búsqueda en memoria. Solo `listarHistorial` y `obtenerIndicadores` reciben filtros.
- [ ] Fase 7 (Practicante): `listarMisProyectos`, `obtenerProyecto` (variante `PRACTICANTE`), `obtenerEquipoProyecto`,
      `listarMiHistorial` y `obtenerInicioPracticante`. Una tarea que el supervisor devolvió o reabrió y que quedó a nombre de
      alguien que ya salió del proyecto no aparece en «Mis tareas en curso» (solo en proyectos vigentes), pero sí en
      `listarTareas` y en `obtenerTarea` (decisión D6-A del paso 5).
- [x] Cierre de la Fase 2: hecho el 2026-11-18. El PR de `feat/fase2-cuenta-consultas` (PR #25, `4082eaa`), el #26 (`2f33f79`), el #27
      (`6cdd2fb`) y el #28 (`5eaf39b`) están en `development`, que se fusionó en `main` (PR #29, `6b51fbd`, junto con la Fase 1);
      la etiqueta anotada `fase-2-completa` apunta a `6b51fbd` (plan §11).
- [x] Ajustar a mano `docs/` con las decisiones del paso 11 (hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`), incluida la decisión de documentar
      en §5.9 los bloques «por revisar», reuniones y avance del Dashboard del Administrador; el agente no toca `docs/`):
      - **Propuesta §4 (matriz):** filas «Ver postulaciones», «Ver supervisores» y «Ver el directorio de practicantes»
        (solo Administrador).
      - **§5.1:** «Requieren revisión» son las postulaciones **pendientes** con la marca de revisión manual.
      - **§5.2:** «Activos» incluye a los «Sin proyecto»; «Sin proyecto» incluye a quien solo sigue asignado a un proyecto
        finalizado.
      - **§5.6:** «postulaciones decididas» (aprobadas o rechazadas con la decisión dentro del periodo, extremos incluidos) y
        «puntaje promedio por área» (promedio del puntaje final de esas postulaciones, con un decimal, sin las que no
        tienen evaluación); el gráfico «practicantes por área» cuenta a los activos y, con filtro de proyecto, a los asignados.
      - **§5.9:** las alertas van de Crítico a Informativo (los de «Fin de práctica» entran si sobra lugar), sin revisadas y
        hasta cinco; «demasiado tiempo» usa el parámetro de Supervisión demorada. El Dashboard del Administrador devuelve
        además «por revisar», próximas reuniones y avance de proyectos (no están en §5.9): decidir si se muestran.
      - **§9.1.2:** «Activo» es quien tiene una asignación vigente en alguno de sus proyectos y cuenta activa; el detalle trae
        la fecha de fin y no el área ni la postulación.
      - **§9.1.5 y §9.2.3:** el estado vacío total del Supervisor es no tener ningún proyecto y el del Practicante, no tener
        un proyecto vigente; las reuniones y el avance incluyen los proyectos en pausa y excluyen los finalizados.
      - **§9.2.1:** un proyecto del que salió el practicante dice «Ya no participas» aunque además esté finalizado.
      - **§8.1:** el enlace de una notificación está activo solo si el elemento existe y quien mira puede abrirlo.
      - **§6.7:** la línea de tiempo de una tarea ajena que el practicante puede abrir trae todos sus eventos, también la
        nota de una devolución; «lo suyo» (Mi actividad) son los eventos de los que es autor.
- [x] `fecha_ingreso` del practicante al aprobar (`aprobarPostulacion`, `debd47e`). Sigue abierto: en
      configuración, `id === clave`.
- [x] ID legible: guardar `numero` y `ultimo_numero_tarea` en una sola operación (`crearTarea`, `2c54c04`).
- [x] ID legible: usar `validarCodigoProyecto` (con los códigos de todos los proyectos, también finalizados)
      en el servicio de proyectos (`crearProyecto`, `30b27ab`). Sigue abierto el formulario de la Fase 5.4. Detalle en
      `DECISIONES.md` (paso 6).
- [x] Migrar los formateos de ID de `src/compartido/` y `src/app/ejemplos/` a `formatearIdLegible`: ya no queda ningún formateo
      manual de IDs en la interfaz. El ID legible llega ya formateado de las consultas (`id_legible`), que usan
      `formatearIdLegible`; el único código de la interfaz que lo formateaba (`ejemplos/datos.ts`) se retiró en `7354f39`.
- [x] Puntaje: la evaluación simulada lee la banda y la proporción vigentes de `data/`, llama a
      `calcularPuntaje` y genera la justificación; si `calcularPuntaje` devuelve un error no se escribe nada
      y las decisiones no se bloquean (E3-A, `debd47e`). Sigue abierto: el formulario de criterios y el de Configuración exigen enteros.
      Detalle en `DECISIONES.md` (paso 7).
- [x] Insights: hecho en 10B (`84c438d`; `umbralesDe` y `calcularInsightsVigentes`). El servicio arma `UmbralesInsight` con los valores vigentes de Configuración y pasa `ahora`
      en ISO UTC con `Z` (`new Date().toISOString()`); si no, el resultado es `AHORA_INVALIDO`. Detalle en
      `DECISIONES.md` (paso 8).
- [x] Insights: hecho en 10B (`84c438d`). Marcar como revisado pasa por `puede('MARCAR_INSIGHT_REVISADO', { insight, proyectos })`.
- [ ] Insights: los formularios de Configuración (Fase 5.8) exigen lo mismo que `validarUmbrales`.
- [ ] Indicadores: `fecha_termino` de la tarea y la fecha del evento que la cierra (`TAREA_TERMINADA` o
      `TAREA_APROBADA`) deben salir del **mismo instante**. Si el evento queda unos milisegundos después,
      `tiempoCicloMs` lo descarta y el tiempo de ciclo da `null`. Detalle en `DECISIONES.md` (paso 9).
- [ ] Indicadores: el servicio pasa `ahora` en ISO UTC con `Z` y `dias` entero de 1 a 365
      (`DIAS_PERIODO_MAXIMO`); entrega `tareas` sin las eliminadas (el historial sí conserva sus eventos);
      el selector de periodo de Reportes (Fase 5.6) solo ofrece valores dentro de ese rango.
- [x] Indicadores (Fase 5.6): las tarjetas «postulaciones decididas» y «puntaje promedio por área», el gráfico
      de practicantes por área, las opciones del selector de periodo (atajos de 7, 30, 90 y 365 días) y las
      columnas de cada tabla quedaron resueltos en el módulo 5.6 (`77ecb38` y `864777f`); las definiciones de
      «decidida en el periodo» y del promedio ya constan en la propuesta §5.6.
- [x] Indicadores (Fase 5.6): el **filtro por proyecto** que pide §5.6 se quitó por error en `864777f` y se restauró
      (todos los proyectos por defecto, con los proyectos que ofrece la consulta; pasa `id_proyecto` a `obtenerIndicadores`
      y las tablas y el gráfico lo respetan). Restaurado en `5a81b38`.
- [ ] Indicadores: la «última actividad» de las tablas de Reportes solo cuenta eventos con proyecto del
      alcance; los eventos de cuenta (`CUENTA_*`) no entran, tampoco para el Administrador. Confirmarlo al
      construir las tablas (la función `ultimaActividadDeUsuario` sí es global para las Fases 5.2 y 5.3).
- [x] Ciclo de vida (el bloqueo real del acceso llegó en el paso 10, 10A `d8f89b4`): los servicios aplican los efectos de
      `finalizarPractica`, `finalizarProyecto` y `puedeQuitarPracticante`: bajas de las asignaciones, tareas EN_PROGRESO a DISPONIBLE con **un evento
      `TAREA_LIBERADA` por cada una** (autor Administrador, nota = motivo o nota del cierre), `Usuario.estado`
      en INACTIVO y acceso bloqueado al finalizar la práctica, y `fecha_fin_real` al finalizar el proyecto.
      Pasan SIEMPRE el texto (motivo o nota) y rechazan si `exige_texto !== null` y falta. Detalle en
      `DECISIONES.md` (paso 10). **Hecho para quitar un practicante y finalizar su práctica** en 8A (`df57b0d`) y
      **para finalizar un proyecto** en 9B (`12efa20`: tareas liberadas con un evento por cada una y `fecha_fin_real`);
      queda el bloqueo real del acceso (paso 10).
- [x] Ciclo de vida: notificaciones de los efectos: «práctica finalizada con tareas liberadas» a
      `supervisores_a_avisar`; asignado y quitado; proyecto finalizado al equipo; el **aviso previo** lo emite
      el servicio una sola vez, cuando `dias_restantes === avisoDias` (`situacionFinPractica`). **Hechos en 8A:**
      práctica finalizada (un aviso por supervisor y proyecto afectado), asignado y quitado (más un aviso por
      cada tarea liberada). **El aviso previo está hecho en 8B** (`emitirAvisosFinDePractica`, `a52fe0c`) y **el
      proyecto finalizado en 9B** (`12efa20`: al equipo, más un aviso `TAREA_LIBERADA` a cada responsable).
      **Completo**; el aviso previo se llama al iniciar sesión desde 10A (`d8f89b4`).
- [x] Ciclo de vida: usar `fechaFinPrevista` al aprobar una postulación (`fecha_ingreso` + la duración vigente
      de Configuración) (`aprobarPostulacion`, `debd47e`). Los formularios de Configuración exigen enteros: duración de 1 a 24 meses y aviso de 1
      a 365 días (`DURACION_MAXIMA_MESES`, `AVISO_MAXIMO_DIAS`).
- [x] Ciclo de vida: la reactivación de un proyecto debe exigir que su supervisor esté ACTIVO. Con el bloqueo
      de un proyecto FINALIZADO (no se cambia de supervisor) y la desactivación de supervisores (que ignora los
      FINALIZADO), un proyecto podría reactivarse con un supervisor inactivo (§5.4: «siempre con un supervisor
      activo»). **Hecho en 9B** (`reactivarProyecto` con `SUPERVISOR_DEL_PROYECTO_INACTIVO`, regla en
      `domain/estadoProyecto.ts`, `e15e4f5` y `12efa20`).

### Fases 3 y 4 (interfaz)

- [x] Conexión de pantallas, sub-paso 0 (`83b1315`): la interfaz usa `cuentas/` y `seguimiento/`; regresión H2 resuelta (el acceso
      vuelve a llamar a `emitirAvisosFinDePractica`, F6-A).
- [x] H3 (Mi perfil): resuelto en el sub-paso d) (`f2bb209`). El formulario ya no tiene la regex laxa del celular: reutiliza
      `esquemaCelular` (9 dígitos que empiezan con 9, F7-A) y `esquemaCorreo` de `services/`, y el mínimo de la contraseña usa
      `LARGO_MINIMO_CONTRASENA`. Discord, GitHub y disponibilidad los valida el servicio y su error sale junto al campo.
- [x] `ACCESO_RAPIDO_NO_DISPONIBLE` (`services/resultado.ts` y `resultado.test.ts`): quedó sin uso tras el sub-paso 0 y se retiró en
      el sub-paso e) (`9ea9835`).
- [ ] Checklist manual de los pasos 2 a 5 de la Fase 3.
- [ ] Logo real de CODAINI (hoy hay un placeholder con colores a mano).
- [x] Tipos provisionales (`TareaTablero`, `EventoLinea`, `TareaDetalle`, `NotificacionItem`): se conservan como tipos de
      presentación de los componentes, con adaptadores desde las consultas (`0ed86c9`). `auth/tipos.ts` ya reutiliza `Rol` y
      `Usuario` de `domain/` (`0307f83`).
- [x] Mostrar la acción «No requiere PR» al practicante responsable ya en `EN_PROGRESO`.
- [x] Con `estado_pr === 'PENDIENTE'` y `url_pull_request` no nula (PR fusionado recalculado), no mostrar la
      URL como el PR vigente; la etiqueta se resuelve con `etiquetaPRVisible`.
- [x] Fase 4, pasos 6 a 11: detalle, creación y cierre de PR, formulario, notificaciones, perfil y limpieza de
      la página de desarrollo temporal conectados con los servicios y el almacén.
- [x] El Kanban usa `estaVencida` para el resaltado de fechas límite y no marca como vencida una tarea que
      vence hoy.
- [x] Los dashboards (Fases 5.9 y 6.5) quitan de las alertas los insights con `revisado: true`. Hecho en 11E (`006022d`):
      `obtenerDashboardAdministrador` y `obtenerDashboardSupervisor` ya los excluyen (tope 5); la pantalla solo muestra lo que devuelven.

### Verificaciones y cierres

- [x] Confirmar que `npm run lint` y `format:check` pasan en `development` (sesión de verificación,
      2026-11-13). `src/auth/iniciarSesion.ts` y `src/App.tsx` ya no fallan. El único fallo es
      `.claude/settings.json` (commit `1d57175`, solo formato de Prettier); `lint` pasa con el aviso conocido
      de `button.tsx`, `test` (211) y `build` OK. Corregido en la rama `style/formato-claude-settings`
      con `a232922` (formatea el archivo y quita una regla `Write` inválida); `format:check` pasa.
- [ ] Confirmar que el PR de dependencias (`zustand`, `zod`, `react-hook-form`, `@hookform/resolvers`,
      `react-router`, `date-fns`, `sonner`) está fusionado en `development` (por confirmar).
- [ ] Confirmar que Roxana revisó el cambio de contrato de `ContextoInsight` (`proyectos`) (por confirmar).
- [ ] Confirmar que la entrada de DECISIONES sobre la auditoría de dependencias llegó a `development`.
- [ ] Fase 8: el build avisa de chunks de más de 500 kB y `recharts` (módulo 5.6) los agranda; evaluar `import()` dinámico de las pestañas o de los
      gráficos, o `build.rolldownOptions.output.codeSplitting`.
- [ ] Fase 8: comprobación visual del gráfico de practicantes por área (módulo 5.6) en tema claro y oscuro, en un navegador real: en jsdom Recharts no
      mide nada y las pruebas no dibujan las barras.
- [ ] Fase 8: comprobación visual del panel de detalle del evento del Historial (módulo 5.7) en un navegador real, en tema claro y oscuro; solo se
      probó en jsdom.
- [ ] Fase 8 (pulido del Historial, módulo 5.7): el resumen de «Proyectos reasignados» se lee «Proyectos: — → INV» y debería leerse sin el «—».
- [ ] Fase 8 (pulido del Historial, módulo 5.7): «Tarea tomada» y «Tarea enviada a supervisión» muestran «2 campos modificados»; el resumen podría mostrar
      el campo principal (el estado) y dejar el resto para el detalle.
- [ ] Fase 8 (pulido del Historial, módulo 5.7): el rango de fechas inválido («Desde» posterior a «Hasta») muestra el mensaje genérico «Revisa los datos
      ingresados.»; hay que darle un mensaje propio, lo que exige ampliar la consulta `listarHistorial`.
- [ ] Fase 8 (pulido de Configuración, módulo 5.8): mostrar el rango permitido junto a cada casilla (por ejemplo «de 1 a 24 meses»). Hoy solo aparece
      como mensaje del servicio al fallar, porque los límites de los umbrales de Seguimiento no se exportan desde `domain/`.
- [ ] Fase 8 (comprobación manual de la Fase 5): recorrer en un navegador real, en tema claro y oscuro, los módulos 5.1 a 5.9 del Administrador (listados,
      detalles, formularios, gráficos del 5.6 y del Dashboard, detalle del evento del Historial y distribución en dos columnas del Dashboard). Las pruebas
      son de jsdom y no cubren el aspecto.
- [ ] Fase 8 (Dashboard, módulo 5.9): las alertas no muestran cuántas quedaron fuera de las cinco (el adaptador lleva `totalAlertas`); decidir si se muestra.
- [ ] Prueba manual pendiente del módulo 6.1 (Mis proyectos, Supervisor): en un navegador real, en tema claro y oscuro, entrar como `demo-supervisor`
      y como `usr-sup-02` y `usr-sup-03`; comprobar las tarjetas en 2 y 3 por fila según el ancho, el ámbar solo con tareas por supervisar, «Sin
      practicantes asignados», las pestañas y la búsqueda; abrir el detalle y comprobar que «Editar proyecto» solo ofrece reunión y rama base; escribir la
      dirección de un proyecto ajeno y ver que no muestra datos; y abrir un aviso de proyecto desde la campana. Las pruebas son de jsdom y no cubren el aspecto.
- [ ] Prueba manual pendiente del módulo 6.2 (Tareas, Supervisor): en un navegador real, en tema claro y oscuro, entrar como `demo-supervisor` (con cola de
      revisión) y como `usr-sup-02` (sin ella); comprobar que mientras cargan solo se ve el esqueleto y que luego abre en «Esperando supervisión» o en
      «Todas» sin pasar por la otra; la columna «Días esperando» solo en esa pestaña, el ámbar solo con tareas y el mensaje de la pestaña vacía; abrir una
      tarea y ver Aprobar y Devolver, también con el proyecto en pausa; escribir la dirección de una tarea ajena y ver que no muestra datos; abrir un aviso de
      tarea desde la campana; y **provocar un error de la consulta de la pestaña inicial** (por ejemplo, sin conexión simulada) para ver que se muestra el error y
      no un esqueleto eterno (en las pruebas no se pudo reproducir: con una sesión inválida la página ni se muestra).
- [ ] Prueba manual pendiente del módulo 6.3 (Practicantes a cargo, Supervisor): en un navegador real, en tema claro y oscuro, entrar como `demo-supervisor`; comprobar la
      tabla con las pestañas Activos y Anteriores, el filtro por proyecto (solo los suyos) y la búsqueda; que una persona en dos proyectos suyos sea una sola
      fila con ambos; la columna «Fecha de baja» en «Anteriores»; abrir el detalle y ver que no hay área técnica, postulación de origen ni botones; escribir la
      dirección de un practicante de otro supervisor y ver que no muestra datos; y abrir un aviso de persona desde la campana. Las pruebas son de jsdom y no
      cubren el aspecto.
- [ ] Cierre de las Fases 3, 4 y 5 en `main` (autores): PR de `development` a `main` con las etiquetas `fase-3-completa`, `fase-4-completa` y
      `fase-5-completa`, y sus filas en «Cierres de fase».
- [ ] Cierre de la Fase 6 en `main` (autores): PR de la rama a `development` y, después, de `development` a `main` con la etiqueta `fase-6-completa`, y su fila en
      «Cierres de fase».
- [ ] Fase 8 (pulido de tarjetas con mucho espacio, detectado en el 6.5; no se cambiaron): la tarjeta de métrica del dashboard del Administrador (`p-4`, cifra de 3xl); las
      tarjetas generales de Indicadores de Reportes (Administrador y Supervisor); las tarjetas de insight de Reportes (la variante compacta solo la usan los dashboards);
      y `TarjetaProyecto` de «Mis proyectos» (espacios `mt-4`). El Dashboard del Supervisor ya usa la variante compacta de `Tarjeta` (`BloquesDeDashboard`) como referencia.
- [x] Módulo 6.4 (Reportes, Supervisor): el «Ver detalle» de un insight que habla de una persona (practicante inactivo, carga desbalanceada, fin de práctica) debe
      llevar a `/supervisor/practicantes/:idPracticante` (y el de un proyecto o una tarea, a su ruta del Supervisor). `rutaDelElemento` y la tarjeta compartida de
      insights (`src/app/insights/`) usaban solo la ruta del Administrador (`RUTA_DE_DETALLE.ADMINISTRADOR`). **Resuelto en `8194b00`:** `rutaDelElemento(tipo, id, rol)` y
      `aInsights(listado, rol)` arman los enlaces con el rol de la sesión, y los de las tablas de Indicadores también.
- [ ] Prueba manual pendiente del módulo 6.4 (Reportes, Supervisor): en un navegador real, en tema claro y oscuro, entrar como `demo-supervisor`; comprobar en «Insights» que
      el filtro de tipo ofrece solo sus 5 reglas, que «Notificar» solo sale en «Practicante inactivo», el «Ver detalle» de cada tipo de insight (persona, proyecto y
      tarea) y marcar una alerta como revisada (el Administrador la sigue viendo); en «Indicadores», las tres tarjetas, el periodo, el filtro de proyecto y los enlaces de
      las tablas, sin el gráfico ni la sección de practicantes por área; y el mensaje «No hay alertas en tus proyectos». Las pruebas son de jsdom y no cubren el aspecto.
- [ ] Revisar las vulnerabilidades de `shadcn` y `eslint` al actualizar esas dependencias y en la Fase 8
      (no se usa `npm audit fix` ni `--force`).
- [x] Actualizar a mano `docs/` con las decisiones del paso 9 (hecho por los autores, 2026-11-17): propuesta
      §9.1.4 (tabla por practicante, en `2a3dc50`) y, en `3d68cc4`, propuesta §5.6 («Cómo se mide cada
      indicador») y plan §9, Fase 1, paso 9 con su viñeta de pruebas.
- [x] Actualizar a mano `docs/` con las decisiones del paso 10 (hecho por los autores, 2026-11-17,
      `3d68cc4`): propuesta §5.4 (FINALIZADO no admite asignar, quitar ni cambiar de supervisor; finalizar
      desde ACTIVO o EN_PAUSA), §5.3 («proyectos activos» incluye EN_PAUSA), §5.2 (ingreso + meses con el
      último día del mes, aviso previo y vencimiento) y §5.8 (duración de 1 a 24 meses y aviso de 1 a 365
      días); plan §9, Fase 1, paso 10 con su viñeta de pruebas.
- [x] Actualizar a mano `docs/` con los 5 cambios del paso 8: propuesta §5.6 (nota del avance esperado y
      párrafo «Fecha de detección» + «Cómo se mide cada regla»), §5.8 (nota de validación de umbrales), §4
      (fila «Marcar un insight como revisado») y plan §5, regla 12 (hecho por los autores, 2026-11-15,
      `d05e278`).
- [x] Actualizar a mano la propuesta (§5.1, §5.8 y §11) y el plan (§9, Fase 1, paso 7 y pruebas de puntaje)
      con las decisiones del paso 7 (hecho por los autores, 2026-11-15, `cec750a`).
- [x] Actualizar a mano `Tu_Rol.md` (hecho por los autores, 2026-11-14).
- [x] Actualizar a mano el plan §11 (fin de la división A/B, flujo por paso y revisión conjunta de los PR)
      y, en la propuesta, §7.4, §7.5 y §11 (Tarea) con las decisiones del paso 5 (hecho por los autores,
      2026-11-14, en la rama `docs/cierre-paso5-maquina-pr`).

## Decisiones pendientes de los autores

**El agente debe detenerse y preguntar con 2 o 3 opciones y trade-off (no decide solo):**

- ~~Paso 10, ciclo de vida: en un proyecto `FINALIZADO`, ¿se bloquea asignar o quitar practicantes y cambiar
  de supervisor?~~ **Decidido (2026-11-17): sí, las tres.** Un proyecto finalizado es historia cerrada; al
  reactivarlo vuelven a permitirse. Está aplicado en `src/domain/cicloVida.ts` (el bloqueo no vive en
  `puede()`).
- (Ninguna otra por ahora.)

**Decisiones de proceso y de diseño:**

- ~~¿Se mantiene el PR revisado por «la otra persona» o basta la revisión conjunta?~~ **Decidido
  (2026-11-14): revisión conjunta de ambos autores.** Ya está reflejado en el plan §11.
- Fase 2: ¿una sesión por fase o partirla en 2 o 3 sesiones (almacén y semilla; servicios de tareas y PR;
  el resto)? Recomendación del asesor: partirla. **En la práctica ya se parte por bloques:** el Bloque 1
  (pasos 1 a 4) fue una sesión y el Bloque 2 (pasos 5 y 6) otra, en la rama
  `feat/fase2-servicios-tareas-pr`; el Bloque 3 (pasos 7 a 11) irá en una sesión nueva.
- Estilo de Prettier si se quiere otro distinto al propuesto (comillas simples, punto y coma, ancho 100).
- Interlineado: la especificación visual y la propuesta §13 no definen un valor.
- Rutas con prefijo por panel (`/administrador/...`): la propuesta no define URLs.
- `@hookform/resolvers` 5.2.2 en vez de 6.0.0 (ver DECISIONES 2026-11-07).
- ~~Mi perfil: Discord y GitHub del Administrador están bloqueados (la propuesta no los lista); decidir si se
  ocultan.~~ **Decidido (2026-11-18, D8-A):** se ocultan; no existen para su rol. Lo aplica la regla `camposDelPerfil` de
  `domain/` (sub-paso d, `f2bb209`).
- Conversión de fechas ISO a `Date` en el borde de la interfaz con `parseISO` (propuesta de Roxana).
- ~~Fase 5.9: ¿los insights Informativos (fin de práctica próximo) entran en las alertas del Dashboard y en qué
  orden?~~ **Decidido (2026-11-18, Q6-A del paso 11):** orden de `ordenarInsights` (Crítico, Atención, Informativo), sin los
  revisados y hasta cinco; los Informativos entran si sobra lugar.