# PROGRESO.md — SIGEP CODAINI

> **Cómo se edita este archivo:** Gabo y Roxana trabajan juntos con un solo agente (Claude Code) y avanzan
> una sola vez, por lo que no hay bloques por persona. Hay un único «Siguiente paso» y una única lista de
> pendientes. Quien cierra un paso lo actualiza, con el hash real de `git log`.
> En `DECISIONES.md` solo se agregan entradas al final, con fecha y autoría en el título.
> El estado de las ramas no se anota aquí: **git es la fuente de verdad**.

## Estado general (común)

- **Fase actual:** Fase 2 (`data/` y `services/`), **Bloque 3 en curso: pasos 7 y 8 terminados.** **7A:**
  evaluar, aprobar, rechazar y reconsiderar postulaciones (`42c0b25` y `debd47e`). **7B:** áreas técnicas,
  especialidades y criterios (`3368603` y `5eb54a4`). **8A:** asignar, quitar, finalizar y reactivar practicantes y
  editar los datos de su práctica (`861c5f3` y `df57b0d`). **8B:** supervisores, restablecer contraseña y aviso de fin
  de práctica (`a52fe0c`). **9A:** crear y editar proyectos, rama base, reunión y enlaces (`30b27ab`). El Bloque 2
  (pasos 5 y 6, servicios de tareas y de Pull Request) está fusionado en `development` (PR #23) y el Bloque 1
  (pasos 1 a 4) en el PR #22. Siguiente: el **sub-paso 9B** (cambiar supervisor, `reasignarProyectosDeSupervisor`,
  pausar, reanudar, finalizar y reactivar proyectos), luego los pasos 10 y 11.
- **Actualizado:** 2026-11-18, al cerrar el sub-paso 9A (rama `feat/fase2-servicios-modulos`).

### Cierres de fase

| Fase | Etiqueta | Commit etiquetado | Fecha |
|---|---|---|---|
| 0 — Base técnica y tema | `fase-0-completa` (anotada, objeto `cd07cc4`, publicada en `origin`) | `67e4116` | 2026-10-21 18:02 -05 |

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

## Siguiente paso

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
- **Siguiente:** implementar el **sub-paso 9B** (propuesta ya aprobada): reglas de estado en
  `src/domain/estadoProyecto.ts` y `cambiarSupervisor`, `reasignarProyectosDeSupervisor`, `pausarProyecto`,
  `reanudarProyecto`, `finalizarProyecto` y `reactivarProyecto`; después, los pasos 10 (cuenta y configuración) y 11
  (consultas con alcance por rol).
- **Luego:** del «Listo cuando» de la Fase 1 quedan dos cosas de los autores: que revisen los tipos de
  `domain/` y que ajusten una línea del plan (ver «Pendientes»).
- **Rama:** `feat/fase2-servicios-modulos` (sale de `development`, con el Bloque 2 ya fusionado en el PR #23).

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
| 2026-11-18 | 9A. Crear y editar proyectos, rama base, reunión y enlaces | `30b27ab`; docs pendientes de commit |

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
| 2026-11-07 | 3–4 | Eliminar página de prueba, extraer redirecciones de sesión, migrar acciones a `domain/`, derivar devolución del historial | fusionado en `development` (hash por confirmar) |

**Estado de pruebas (2026-11-18):** 1825 pruebas en 75 archivos (de la Fase 2: 22 del almacén, 180 de la
semilla, 11 de restablecer, 136 de las utilidades de `services/`, 165 de los servicios de tareas del paso 5
—50 en 5A, 82 en 5B y 33 en 5C—, 52 de los servicios de Pull Request del paso 6 —36 en 6A y 16 en 6B—, 110
del sub-paso 7A —12 en `domain/`—, 142 del sub-paso 7B —32 en `domain/`—, 127 del sub-paso 8A —19 en
`domain/`—, 105 del sub-paso 8B y 164 del sub-paso 9A, estas dos últimas todas en `services/`);
`build` OK (aviso de Vite por chunk > 500 kB, no es de seguridad).

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
- [ ] Revisión de los tipos de `domain/` por los autores («Listo cuando» de la Fase 1; los tipos no se
      cambian sin avisar).
- [ ] Ajustar a mano el plan §9, Fase 1, pruebas obligatorias: la línea «Motivo/nota faltante cuando es
      obligatorio → rechazada» no coincide con el dominio. Vacío o solo espacios da `TEXTO_OBLIGATORIO`; si
      todavía no se escribió, la acción queda pendiente de texto y devuelve qué texto exige, y el servicio
      la rechaza si falta (decisión del paso 3). Texto propuesto en `DECISIONES.md`.
- [ ] Cierre de la Fase 1: PR a `development` y, cuando ambos autores lo confirmen, `development` → `main`
      con la etiqueta de cierre (plan §11, por ejemplo `fase-1-completa`).

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
- [ ] Ajustar a mano el plan §9, Fase 2, paso 6: «No requiere PR» pasa al paso 5 (decisión D3-A); el paso 6
      queda con crear y cerrar PR, ramas de ejemplo, error preparado, PR existente y recálculo.
- [ ] Ajustar a mano el plan §8 (y la propuesta §7.7 si lo quieren explícito): el caso de error de PR
      preparado es «rama inexistente», con la rama de ejemplo `feature/<código>-rama-eliminada` (P2-A); las
      ramas de ejemplo son `feature/<código>-NNN` más `…-con-conflictos` (P1-A, P5-A).
- [ ] Riesgo aceptado (P3-A): si dos tareas comparten un PR vinculado y una lo cierra, la otra conserva su
      etiqueta hasta que vuelva a llegar a supervisión o a terminada.
- [ ] Fase 4 (detalle de tarea): con la decisión D6-A, una tarea devuelta o reabierta puede quedar EN_PROGRESO
      a nombre de un practicante INACTIVO o con la asignación de baja. La interfaz debe señalarlo para que el
      Administrador o el Supervisor la liberen con motivo.
- [x] Sub-paso 7A: evaluar, aprobar, rechazar y reconsiderar postulaciones (`42c0b25` y `debd47e`).
- [x] Sub-paso 7B: áreas técnicas, especialidades y criterios de evaluación (crear, editar, activar y
      desactivar) (`3368603` y `5eb54a4`). **Paso 7 terminado.**
- [ ] Fase 5.1 (formularios de criterios): el editor de un bloque llama a `guardarCriteriosDeBloque` con el
      bloque completo (los criterios no se borran: se desactivan), muestra «Suma actual: N/100» con
      `sumaPesosActivos` y `validarBloqueCriterios`, y ofrece activar un área o especialidad solo cuando su
      bloque es válido. Nacen inactivas.
- [ ] Fase 5.1: cómo se muestra «Analizando…» (la semilla ya evalúa a todos y `evaluarPostulacion` solo se
      dispara por código), el mensaje cuando la evaluación falla y la contraseña temporal visible una sola vez.
- [ ] Ajustar a mano la propuesta §5.1/§5.2: la fecha de ingreso de un practicante nuevo es el día de la
      aprobación (hora de Perú) y la de fin se calcula con la duración vigente (supuesto confirmado en 7A).
- [x] Sub-paso 8A: asignar, quitar, finalizar y reactivar practicantes y editar los datos de su práctica
      (`861c5f3` y `df57b0d`).
- [x] Sub-paso 8B: `crearSupervisor`, `editarSupervisor`, `desactivarSupervisor`, `reactivarSupervisor`,
      `restablecerContrasena` (practicante y supervisor) y `emitirAvisosFinDePractica` (`a52fe0c`). **Paso 8
      terminado.** Las validaciones de correo y celular (F7-A: 9 dígitos que empieza con 9) quedan en
      `src/services/cuentas/validaciones.ts` para que Mi perfil (paso 10) las reutilice.
- [x] Sub-paso 9A: `crearProyecto`, `editarDatosProyecto`, `cambiarRamaBase`, `definirReunion`, `agregarEnlace`,
      `editarEnlace` y `quitarEnlace` (`30b27ab`).
- [ ] Sub-paso 9B (queda): reglas de estado en `src/domain/estadoProyecto.ts` (`puedePausarProyecto`,
      `puedeReanudarProyecto`, `puedeReactivarProyecto` y `accionesDeEstadoDisponibles`) y los servicios
      `cambiarSupervisor`, `reasignarProyectosDeSupervisor` (G4-A: lista atómica de proyectos no finalizados del
      supervisor), `pausarProyecto`, `reanudarProyecto`, `finalizarProyecto` (con `finalizarProyecto` de
      `domain/cicloVida.ts`, tareas liberadas con un `TAREA_LIBERADA` por cada una y avisos al equipo) y
      `reactivarProyecto` (exige supervisor ACTIVO; sin aviso, G2-A). Reutiliza `equipoDelProyecto`, `eventoDeProyecto` y
      `reemplazarProyecto` de `src/services/proyectos/comun.ts`, `liberarTareasDe` y `denegarCicloVida`.
- [ ] Paso 9B: la pantalla de supervisores (Fase 5.3) depende de `reasignarProyectosDeSupervisor` para poder
      desactivar a un supervisor con proyectos (hoy `desactivarSupervisor` solo responde `SUPERVISOR_CON_PROYECTOS`).
- [ ] Fase 5.4 (Proyectos): los formularios usan los esquemas de `src/services/proyectos/esquemas.ts` y ponen el código en
      mayúsculas y sin espacios **antes** de enviarlo (el servicio no lo normaliza, G1/9A); crear muestra el error del
      código en `campos.codigo`; editar no ofrece el código; la reunión se quita enviando día y hora vacíos; reactivar no
      avisa al equipo (G2-A) y los autores pueden sumar esa fila a §8.1 si lo quieren.
- [ ] Ajustar a mano la propuesta §5.4 con los supuestos del paso 9: el repositorio es
      `https://github.com/{organización}/{repositorio}`; la rama base no lleva espacios; la reunión y los enlaces
      también se editan en un proyecto finalizado; quitar la reunión avisa al equipo; reactivar no avisa.
- [ ] Paso 10 (login): `iniciarSesion` debe leer de `data/` para que `Usuario.estado = INACTIVO` bloquee de verdad
      el acceso de quien finalizó su práctica o de un supervisor desactivado (hoy el bloqueo solo lo aplican los
      servicios y `puede()`); y llamar a `emitirAvisosFinDePractica` al iniciar sesión (F6-A: si ese día exacto nadie
      lo ejecuta, el aviso se pierde). El servicio ya es idempotente y no escribe cuando no hay nada nuevo.
- [ ] Paso 10 (Mi perfil): el cambio de correo propio y el de celular usan `esquemaCorreo`, `esquemaCelular` y
      `correoEnUso` de `src/services/cuentas/validaciones.ts`; el cambio de contraseña propia va en
      `src/services/cuentas/`, junto a `restablecerContrasena`, y su evento nunca lleva la contraseña (el historial
      rechaza cualquier campo cuyo nombre la contenga, también `debe_cambiar_contrasena`).
- [ ] Paso 11 (consultas con alcance por rol): las pantallas de supervisores y practicantes (Fases 5.2, 5.3 y 6.3)
      leen con consultas del paso 11; `emitirAvisosFinDePractica` y los demás servicios del paso 8 no son consultas.
- [ ] Fase 5.3 (Supervisores): «Nuevo supervisor» usa `crearSupervisor` y muestra la contraseña temporal una sola
      vez; desactivar muestra el mensaje con la cantidad de proyectos que trae el servicio; restablecer contraseña
      también se muestra una sola vez. Un supervisor nuevo no tiene proyectos (estado vacío del panel).
- [ ] Fase 5.2 (Practicantes): «Asignar a proyecto» usa `asignarPracticantes` con una lista de pares (atajo de
      «Sin proyecto», varios proyectos o varios practicantes); finalizar avisa «Tiene N tareas en progreso que serán
      liberadas» (el servicio las calcula con `finalizarPractica` de `domain/`); la contraseña temporal de
      restablecer se muestra una sola vez; editar datos propone la nueva fecha de fin con `fechaFinPrevista` y envía
      ambas fechas (F5-A); reactivar no cambia la fecha de fin, que puede quedar vencida (F4-A).
- [ ] Pasos 9B a 11 (Bloque 3; los pasos 5, 6, 7 y 8 y el sub-paso 9A ya están terminados): servicios por módulo, consultas con
      alcance por rol (pueden usar `ejecutarConsulta`), más sus pruebas. Cada servicio recibe
      `(entrada con idActor, entorno = ENTORNO)`, usa `ejecutarServicio`, resuelve al actor con `obtenerActor`
      dentro de la transacción, valida con `validarEntrada` (Zod) y `puede()`, y suma a `MENSAJES` los códigos
      nuevos que no traigan `mensaje` del dominio (una prueba exige que todo código conocido tenga mensaje).
- [ ] Mientras no haya escrituras, la semilla se regenera con la fecha de hoy en cada carga; tras la primera
      escritura los datos quedan fijos hasta restablecer (`restablecer`, paso 3).
- [ ] Paso 10 (servicios de configuración): servicio `restablecerDatosDemostracion(usuario)` que valide
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
- [ ] Login: `auth/usuariosDemo.ts` sigue provisional. La semilla ya trae los tres accesos rápidos con los
      mismos ID, nombre, correo y contraseña; falta que `iniciarSesion` lea de `data/` y retirar las
      `CUENTAS_DEMO`.
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
- [ ] Paso explícito: migrar las pantallas de `src/app/ejemplos/` a `services/`.
- [x] `fecha_ingreso` del practicante al aprobar (`aprobarPostulacion`, `debd47e`). Sigue abierto: en
      configuración, `id === clave`.
- [x] ID legible: guardar `numero` y `ultimo_numero_tarea` en una sola operación (`crearTarea`, `2c54c04`).
- [x] ID legible: usar `validarCodigoProyecto` (con los códigos de todos los proyectos, también finalizados)
      en el servicio de proyectos (`crearProyecto`, `30b27ab`). Sigue abierto el formulario de la Fase 5.4. Detalle en
      `DECISIONES.md` (paso 6).
- [ ] Migrar los formateos de ID de `src/compartido/` y `src/app/ejemplos/` a `formatearIdLegible`.
- [x] Puntaje: la evaluación simulada lee la banda y la proporción vigentes de `data/`, llama a
      `calcularPuntaje` y genera la justificación; si `calcularPuntaje` devuelve un error no se escribe nada
      y las decisiones no se bloquean (E3-A, `debd47e`). Sigue abierto: el formulario de criterios y el de Configuración exigen enteros.
      Detalle en `DECISIONES.md` (paso 7).
- [ ] Insights: el servicio arma `UmbralesInsight` con los valores vigentes de Configuración y pasa `ahora`
      en ISO UTC con `Z` (`new Date().toISOString()`); si no, el resultado es `AHORA_INVALIDO`. Detalle en
      `DECISIONES.md` (paso 8).
- [ ] Insights: marcar como revisado pasa por `puede('MARCAR_INSIGHT_REVISADO', { insight, proyectos })`.
- [ ] Insights: los formularios de Configuración (Fase 5.8) exigen lo mismo que `validarUmbrales`.
- [ ] Indicadores: `fecha_termino` de la tarea y la fecha del evento que la cierra (`TAREA_TERMINADA` o
      `TAREA_APROBADA`) deben salir del **mismo instante**. Si el evento queda unos milisegundos después,
      `tiempoCicloMs` lo descarta y el tiempo de ciclo da `null`. Detalle en `DECISIONES.md` (paso 9).
- [ ] Indicadores: el servicio pasa `ahora` en ISO UTC con `Z` y `dias` entero de 1 a 365
      (`DIAS_PERIODO_MAXIMO`); entrega `tareas` sin las eliminadas (el historial sí conserva sus eventos);
      el selector de periodo de Reportes (Fase 5.6) solo ofrece valores dentro de ese rango.
- [ ] Indicadores (Fase 5.6): las tarjetas «postulaciones decididas», «puntaje promedio por área» y el
      gráfico de practicantes por área quedaron fuera del paso 9; hay que definir qué cuenta como «decidida
      en el periodo» y qué evaluación entra en el promedio. Tampoco están decididas las opciones del selector
      de periodo ni las columnas de cada tabla.
- [ ] Indicadores: la «última actividad» de las tablas de Reportes solo cuenta eventos con proyecto del
      alcance; los eventos de cuenta (`CUENTA_*`) no entran, tampoco para el Administrador. Confirmarlo al
      construir las tablas (la función `ultimaActividadDeUsuario` sí es global para las Fases 5.2 y 5.3).
- [ ] Ciclo de vida: los servicios aplican los efectos de `finalizarPractica`, `finalizarProyecto` y
      `puedeQuitarPracticante`: bajas de las asignaciones, tareas EN_PROGRESO a DISPONIBLE con **un evento
      `TAREA_LIBERADA` por cada una** (autor Administrador, nota = motivo o nota del cierre), `Usuario.estado`
      en INACTIVO y acceso bloqueado al finalizar la práctica, y `fecha_fin_real` al finalizar el proyecto.
      Pasan SIEMPRE el texto (motivo o nota) y rechazan si `exige_texto !== null` y falta. Detalle en
      `DECISIONES.md` (paso 10). **Hecho para quitar un practicante y finalizar su práctica** en 8A (`df57b0d`);
      queda `finalizarProyecto` (paso 9) y el bloqueo real del acceso (paso 10).
- [ ] Ciclo de vida: notificaciones de los efectos: «práctica finalizada con tareas liberadas» a
      `supervisores_a_avisar`; asignado y quitado; proyecto finalizado al equipo; el **aviso previo** lo emite
      el servicio una sola vez, cuando `dias_restantes === avisoDias` (`situacionFinPractica`). **Hechos en 8A:**
      práctica finalizada (un aviso por supervisor y proyecto afectado), asignado y quitado (más un aviso por
      cada tarea liberada). **El aviso previo está hecho en 8B** (`emitirAvisosFinDePractica`, `a52fe0c`); queda el
      proyecto finalizado (paso 9).
- [x] Ciclo de vida: usar `fechaFinPrevista` al aprobar una postulación (`fecha_ingreso` + la duración vigente
      de Configuración) (`aprobarPostulacion`, `debd47e`). Los formularios de Configuración exigen enteros: duración de 1 a 24 meses y aviso de 1
      a 365 días (`DURACION_MAXIMA_MESES`, `AVISO_MAXIMO_DIAS`).
- [ ] Ciclo de vida: la reactivación de un proyecto debe exigir que su supervisor esté ACTIVO. Con el bloqueo
      de un proyecto FINALIZADO (no se cambia de supervisor) y la desactivación de supervisores (que ignora los
      FINALIZADO), un proyecto podría reactivarse con un supervisor inactivo (§5.4: «siempre con un supervisor
      activo»). No se construyó en el paso 10; va en los servicios de proyectos (Fase 2, paso 9): **queda para 9B**
      (`reactivarProyecto` con `SUPERVISOR_DEL_PROYECTO_INACTIVO`).

### Fases 3 y 4 (interfaz)

- [ ] Checklist manual de los pasos 2 a 5 de la Fase 3.
- [ ] Logo real de CODAINI (hoy hay un placeholder con colores a mano).
- [ ] Reemplazar tipos provisionales (`auth/tipos.ts`, `TareaTablero`, `EventoLinea`, `TareaDetalle`,
      `NotificacionItem`) cuando existan los servicios.
- [ ] Mostrar la acción «No requiere PR» al practicante responsable ya en `EN_PROGRESO`.
- [ ] Con `estado_pr === 'PENDIENTE'` y `url_pull_request` no nula (PR fusionado recalculado), no mostrar la
      URL como el PR vigente. Usar `etiquetaPRVisible` para la etiqueta.
- [ ] Fase 4, pasos 6 y 9 a 11: completar con datos reales cuando existan los servicios.
- [ ] El Kanban (`TableroKanban.tsx:54`) migra a `estaVencida`: hoy marca en rojo una tarea que vence hoy
      desde las 00:00 (hallazgo H1 del paso 8).
- [ ] Los dashboards (Fases 5.9 y 6.5) quitan de las alertas los insights con `revisado: true`.

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
- Mi perfil: Discord y GitHub del Administrador están bloqueados (la propuesta no los lista); decidir si se
  ocultan.
- Conversión de fechas ISO a `Date` en el borde de la interfaz con `parseISO` (propuesta de Roxana).
- Fase 5.9: ¿los insights Informativos (fin de práctica próximo) entran en las alertas del Dashboard y en qué
  orden?