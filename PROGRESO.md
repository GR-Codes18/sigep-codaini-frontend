# PROGRESO.md — SIGEP CODAINI

> **Cómo se edita este archivo:** Gabo y Roxana trabajan juntos con un solo agente (Claude Code) y avanzan
> una sola vez, por lo que no hay bloques por persona. Hay un único «Siguiente paso» y una única lista de
> pendientes. Quien cierra un paso lo actualiza, con el hash real de `git log`.
> En `DECISIONES.md` solo se agregan entradas al final, con fecha y autoría en el título.
> El estado de las ramas no se anota aquí: **git es la fuente de verdad**.

## Estado general (común)

- **Fase actual:** Fase 2 (`data/` y `services/`), **Bloque 2** (pasos 5 y 6: servicios de tareas y de Pull
  Request). El Bloque 1 (pasos 1 a 4) está fusionado en `development` (PR #22). El paso 5 se parte en tres
  sub-pasos con parada y commit cada uno (D2-A): **5A terminado** (crear, editar y eliminar tareas,
  `2c54c04`); siguen 5B (las 7 transiciones y el puerto de GitHub) y 5C (opciones y prueba de flujo).
- **Actualizado:** 2026-11-17, al cerrar el sub-paso 5A.

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
- **Siguiente: sub-paso 5B** (tomar, liberar, enviar a supervisión, marcar terminada, aprobar, devolver y
  reabrir, más el puerto `github` en `Entorno`). Se propone y se espera el OK antes de escribir código.
- **Luego:** del «Listo cuando» de la Fase 1 quedan dos cosas de los autores: que revisen los tipos de
  `domain/` y que ajusten una línea del plan (ver «Pendientes»). Después, el resto de la Fase 2 (servicios
  por módulo); queda por decidir si se parte en sesiones (ver «Decisiones pendientes»).
- **Rama:** `feat/fase2-servicios-tareas-pr` (sale de `development`, con el Bloque 1 ya fusionado en el
  PR #22).

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
| 2026-11-17 | 5A. Servicios para crear, editar y eliminar tareas | `2c54c04`; docs pendientes de commit |

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

**Estado de pruebas (2026-11-17):** 1010 pruebas en 45 archivos (de la Fase 2: 22 del almacén, 180 de la
semilla, 11 de restablecer, 136 de las utilidades de `services/` y 50 de los servicios de tareas del
sub-paso 5A); `build` OK (aviso de Vite por chunk > 500 kB, no es de seguridad).

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
- [ ] Sub-paso 5B: las 7 transiciones de tarea y el puerto `github` en `Entorno` (D4-A).
- [ ] Sub-paso 5C: «Requiere supervisión», «Requiere PR» (D3-A, D5-A) y la prueba de flujo crear → tomar →
      enviar → aprobar.
- [ ] Ajustar a mano el plan §9, Fase 2, paso 6: «No requiere PR» pasa al paso 5 (decisión D3-A); el paso 6
      queda con crear y cerrar PR, ramas de ejemplo, error preparado, PR existente y recálculo.
- [ ] Fase 4 (detalle de tarea): con la decisión D6-A, una tarea devuelta o reabierta puede quedar EN_PROGRESO
      a nombre de un practicante INACTIVO o con la asignación de baja. La interfaz debe señalarlo para que el
      Administrador o el Supervisor la liberen con motivo.
- [ ] Pasos 5 a 11: servicios por módulo, consultas con alcance por rol, más sus pruebas. Cada servicio recibe
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
- [ ] Paso 6 (servicios de PR): definir el «caso de error de PR preparado» del plan §8 (rama inexistente o
      GitHub no disponible) y las ramas de ejemplo; la semilla deja tareas en `PENDIENTE` listas para crear PR.
- [ ] Login: `auth/usuariosDemo.ts` sigue provisional. La semilla ya trae los tres accesos rápidos con los
      mismos ID, nombre, correo y contraseña; falta que `iniciarSesion` lea de `data/` y retirar las
      `CUENTAS_DEMO`.
- [ ] Semilla: `ultimo_numero_tarea` es el mayor `numero` de las tareas existentes. Si se añade a la semilla
      una tarea eliminada que sea la última de su proyecto, el contador quedaría por debajo del real.
- [ ] La regla de «no notificar al autor» ya vive en `crearNotificaciones` (`services/`, paso 4). El registro
      de la semilla (`src/data/semilla/registro.ts`) conserva una copia mínima solo para generar los datos
      iniciales; no se reutiliza en los servicios.
- [ ] Servicios (pasos 5 a 11): `ejecutarServicio` toma la marca de tiempo **dentro** de la transacción, tras la
      demora; el servicio que escriba `fecha_termino` debe usar `marca.ahora` y el mismo valor en el evento de
      cierre (`TAREA_TERMINADA` o `TAREA_APROBADA`), como ya pide el pendiente de indicadores.
- [ ] Servicios: pasar a `puede()` las asignaciones **de quien actúa** (no las de todo el proyecto).
- [ ] Los servicios deben pasar SIEMPRE el texto y rechazar si `exige_texto !== null` y falta o viene vacío.
- [ ] Aviso al Supervisor cuando el practicante desactiva «Requiere PR» (§7.5/§8.1).
- [ ] Servicios de PR: simular GitHub y, si `necesitaConsultaGitHub(tarea)`, pasar SIEMPRE `github` en el
      evento `TAREA_ENVIADA_O_TERMINADA`; llamar a `siguienteEstadoPR` tras enviar/terminar, tras crear o
      cerrar el PR y tras cambiar «Requiere PR». Detalle en `DECISIONES.md` (paso 5).
- [x] Aviso al responsable al editar una tarea `EN_PROGRESO` (`editarTarea`, `2c54c04`).
- [ ] Paso explícito: migrar las pantallas de `src/app/ejemplos/` a `services/`.
- [ ] `fecha_ingreso` del practicante al aprobar; en configuración, `id === clave`.
- [x] ID legible: guardar `numero` y `ultimo_numero_tarea` en una sola operación (`crearTarea`, `2c54c04`).
- [ ] ID legible: usar `validarCodigoProyecto` (con los códigos de todos los proyectos, también finalizados)
      en el servicio de proyectos y en el formulario de la Fase 5.4. Detalle en `DECISIONES.md` (paso 6).
- [ ] Migrar los formateos de ID de `src/compartido/` y `src/app/ejemplos/` a `formatearIdLegible`.
- [ ] Puntaje: la evaluación simulada lee la banda y la proporción vigentes de `data/`, llama a
      `calcularPuntaje` y genera la justificación; decidir qué muestra una postulación si
      `calcularPuntaje` devuelve un error; el formulario de criterios y el de Configuración exigen enteros.
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
      `DECISIONES.md` (paso 10).
- [ ] Ciclo de vida: notificaciones de los efectos: «práctica finalizada con tareas liberadas» a
      `supervisores_a_avisar`; asignado y quitado; proyecto finalizado al equipo; el **aviso previo** lo emite
      el servicio una sola vez, cuando `dias_restantes === avisoDias` (`situacionFinPractica`).
- [ ] Ciclo de vida: usar `fechaFinPrevista` al aprobar una postulación (`fecha_ingreso` + la duración vigente
      de Configuración). Los formularios de Configuración exigen enteros: duración de 1 a 24 meses y aviso de 1
      a 365 días (`DURACION_MAXIMA_MESES`, `AVISO_MAXIMO_DIAS`).
- [ ] Ciclo de vida: la reactivación de un proyecto debe exigir que su supervisor esté ACTIVO. Con el bloqueo
      de un proyecto FINALIZADO (no se cambia de supervisor) y la desactivación de supervisores (que ignora los
      FINALIZADO), un proyecto podría reactivarse con un supervisor inactivo (§5.4: «siempre con un supervisor
      activo»). No se construyó en el paso 10; va en los servicios de proyectos (Fase 2, paso 9).

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
  (pasos 1 a 4) fue una sesión y el Bloque 2 (pasos 5 y 6) es otra, en la rama
  `feat/fase2-servicios-tareas-pr`.
- Estilo de Prettier si se quiere otro distinto al propuesto (comillas simples, punto y coma, ancho 100).
- Interlineado: la especificación visual y la propuesta §13 no definen un valor.
- Rutas con prefijo por panel (`/administrador/...`): la propuesta no define URLs.
- `@hookform/resolvers` 5.2.2 en vez de 6.0.0 (ver DECISIONES 2026-11-07).
- Mi perfil: Discord y GitHub del Administrador están bloqueados (la propuesta no los lista); decidir si se
  ocultan.
- Conversión de fechas ISO a `Date` en el borde de la interfaz con `parseISO` (propuesta de Roxana).
- Fase 5.9: ¿los insights Informativos (fin de práctica próximo) entran en las alertas del Dashboard y en qué
  orden?