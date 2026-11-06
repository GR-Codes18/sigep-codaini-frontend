# SIGEP CODAINI — Plan de desarrollo por fases y reglas para el agente

> **Para quién es este archivo:** para el agente de IA que va a escribir el código (y para las dos personas que lo dirigen). Es lo PRIMERO que se lee en cada sesión nueva, junto con `PROGRESO.md` (ver sección 10).
> **Qué se construye:** un prototipo navegable en React + TypeScript, **solo frontend, con datos simulados**. No hay backend, base de datos real, autenticación real ni llamadas a modelos de lenguaje o a GitHub.

---

## 0. Cómo arrancar una sesión

1. Leer este archivo completo.
2. Leer `PROGRESO.md` (qué fase y qué paso van) y `DECISIONES.md` (qué ya se decidió y por qué).
3. Leer SOLO las secciones del documento de la propuesta que corresponden al paso actual (cada paso de la sección 9 dice cuáles).
4. Decir en 3 o 4 líneas qué paso toca, qué entiende que hay que hacer y qué duda real tiene. **Esperar confirmación antes de escribir código.**

---

## 1. Fuentes de verdad y precedencia

Los archivos van en la carpeta `docs/` del repositorio:

| Archivo | Qué contiene | Manda en… |
|---|---|---|
| `docs/Propuesta_SIGEP_Codaini_v6.md` (convertido de `Propuesta_SIGEP_Codaini_v6.docx`) | Reglas de negocio, los 3 paneles, matriz de permisos, Kanban, PR, modelo de datos, datos simulados | Todo lo funcional |
| `docs/Especificacion_visual_SIGEP (1).md` | Colores, tipografía, tokens, estados, estructura de interfaz | Todo lo visual |
| `docs/METODOLOGÍA DE TRABAJO.md` | Cómo trabajamos | La forma de trabajar |
| Este archivo | Plan por fases y reglas del proyecto | El orden y el alcance |

**Orden de precedencia si algo se contradice:** propuesta v6 > especificación visual > este archivo > lo que el agente "cree" que es mejor.

**Regla de oro:** si algo no está en la propuesta, **no se construye ni se inventa**. Se pregunta. Una herramienta de diseño anterior (Stitch) inventó sprints, prioridades, "gestionar cupos", "Super Administrador" y versiones del sistema; esas cosas **no existen** en este proyecto (ver sección 6).

**Decisiones ya cerradas NO se vuelven a abrir.** Todo lo que aparece en la propuesta v6 fue decidido punto por punto por los autores. El agente puede señalar un riesgo técnico real (con su argumento), pero no cambia ni "mejora" una decisión por su cuenta; espera la respuesta.

---

## 2. Metodología de trabajo (adaptada a este proyecto)

Aplica la metodología completa de `docs/METODOLOGÍA DE TRABAJO.md`. Estas son las adaptaciones para este proyecto, porque esa metodología está escrita pensando también en backend:

### 2.1 Ciclo de cada paso (obligatorio)

1. **Concepto:** explicar en términos simples qué se va a hacer y por qué (la lógica, no el código).
2. **Propuesta del paso:** qué archivos se crean o tocan. Si hay más de una forma razonable de hacerlo, dar **2 o 3 opciones con su trade-off** y recomendar una. Preguntar solo dudas reales (lo que la propuesta no define).
3. **Esperar el OK.**
4. **Implementar** solo ese paso, en piezas pequeñas.
5. **Explicar** lo no obvio: decisiones, trucos, el porqué de cada patrón. No explicar líneas triviales.
6. **Probar:** correr las pruebas automáticas y dar un **checklist de verificación manual** en el navegador (qué hacer, qué debe pasar, qué errores probar).
7. **Proponer el commit** (mensaje con convención `feat:`, `fix:`, `chore:`, `test:`, `docs:`) y listar los archivos que entrarían.
8. **Actualizar `PROGRESO.md`** y esperar confirmación antes del siguiente paso.

### 2.2 Qué cambia respecto a la metodología general

- **Postman no aplica** (no hay API). Lo equivalente: pruebas de las funciones de `services/` y `domain/` con **Vitest**, más el checklist manual del punto 6.
- **No hay `.env` ni secretos en el frontend.** Regla de seguridad central: **ninguna clave de API (modelo de lenguaje, GitHub) puede existir en el código del navegador**, ni siquiera de prueba. Esas integraciones se simulan.
- **Entornos local vs producción:** solo aplica al final (Fase 8): probar también el build de producción (`vite build` + `vite preview`), porque el comportamiento puede diferir del servidor de desarrollo.
- **Validación de entrada:** todos los formularios se validan con Zod. Aunque los datos sean simulados, se trata cada formulario como si el servidor no confiara en el cliente (así el día que haya backend, el contrato ya existe).
- **Verificación de permisos:** aunque el usuario sea simulado, **toda acción pasa por `services/` y se valida contra `domain/permisos`**. Nunca se confía solo en ocultar un botón.
- **Tamaño del paso:** un "paso" es una unidad que se puede revisar en 10–20 minutos (por ejemplo, "el listado de Postulaciones", no "el módulo Postulaciones completo").
- **Proporcionalidad de las explicaciones:** el código repetitivo o de configuración se explica en pocas líneas; la lógica de negocio y las decisiones de arquitectura se explican a fondo. Las personas que dirigen quieren **aprender el criterio**, no solo recibir código.

### 2.3 Versiones y dependencias (regla 4 de la metodología)

- Antes de instalar cualquier paquete: consultar la versión estable actual (`npm view <paquete> version`), **decir qué versión se va a instalar** y si es estable o reciente/experimental (RC, beta, next). No instalar RC, beta ni next sin autorización.
- Fijar versiones exactas (sin `^`) en `package.json` para que ambas personas tengan lo mismo.
- Antes de instalar shadcn/ui, Tailwind v4, Zustand, etc., **verificar en su documentación oficial la compatibilidad** entre ellas y con la versión de React elegida. No asumir.
- Si una instalación automática (`npx`, `shadcn add`) intenta traer otra versión, avisar.

---

## 3. Contexto mínimo del proyecto

- **Cliente:** CODAINI (software y videojuegos; forma practicantes en proyectos reales). Hoy gestiona todo en Excel, Discord y WhatsApp.
- **Problema central:** falta de trazabilidad en la gestión de practicantes y proyectos.
- **Roles (un usuario, un rol):** Administrador, Supervisor, Practicante. El Postulante no tiene cuenta.
- **Es una tesis de "Diseño":** por eso no hay backend. El prototipo debe verse y comportarse como el sistema real, con datos de ejemplo guardados en el navegador.
- **Tres componentes de IA/automatización:** (1) ranking de CVs, **simulado** con una función local; (2) insights, que son **reglas** (no un modelo de IA); (3) integración con GitHub para Pull Requests, **solo diseñada**, simulada en la interfaz.
- **Idioma:** toda la interfaz y todos los nombres de dominio en **español**.

---

## 4. Stack, convenciones y arquitectura

### 4.1 Stack (confirmado por los autores)

- React + TypeScript + Vite
- Tailwind CSS v4 (tokens como variables CSS; tema por atributo `data-theme`)
- shadcn/ui (componentes accesibles)
- Zustand (estado)
- React Hook Form + Zod (formularios y validación)
- Recharts (gráficos)
- date-fns (fechas)
- Lucide (íconos, trazo 1,5 px, 16–20 px)
- React Router (rutas) — **no está confirmado**: proponerlo con su justificación en la Fase 0 y esperar OK.
- Vitest + Testing Library (pruebas) — **no está confirmado**: proponerlo en la Fase 0 y esperar OK.
- **Kanban SIN librería de arrastre:** las tareas cambian de estado con botones (dentro del detalle). Prohibido instalar dnd-kit, react-beautiful-dnd o similares.

### 4.2 Nombres

- Dominio en español **sin tildes ni ñ** en identificadores: `Proyecto`, `Tarea`, `Practicante`, `fecha_limite`, `EN_PROGRESO`, `ESPERANDO_SUPERVISION`.
- Texto que ve el usuario: español **con tildes** correctas.
- Enumeraciones en MAYÚSCULAS con guion bajo. Propuesta de partida (confirmar en la Fase 1):
  - `Rol`: `ADMINISTRADOR | SUPERVISOR | PRACTICANTE`
  - `EstadoTarea`: `DISPONIBLE | EN_PROGRESO | ESPERANDO_SUPERVISION | TERMINADA`
  - `EstadoPR`: `PENDIENTE | CREADO | CON_CONFLICTOS | FUSIONADO | CERRADO`
  - `EstadoPostulacion`: `PENDIENTE | APROBADA | RECHAZADA`
  - `EstadoProyecto`: `ACTIVO | EN_PAUSA | FINALIZADO`
  - `EstadoUsuario` (campo `Usuario.estado`): `ACTIVO | INACTIVO`
  - `EstadoPracticante`: `ACTIVO | FINALIZADO`. Es solo presentación derivada de `Usuario.estado`; no se guarda.
- "Devuelta con observaciones" **no es un estado**: es una marca sobre una tarea EN_PROGRESO (viene de un evento del historial).
- "Requiere revisión manual" **no es un estado**: es una marca en la evaluación.

### 4.3 Estructura de carpetas

```
src/
  app/            rutas, redirección por rol, tema, proveedores, avisos (toasts), estilos globales
  auth/           login simulado, sesión, guarda de rutas por rol
  domain/         tipos y reglas puras (SIN React, SIN datos, SIN almacenamiento)
  services/       la "API" simulada: una función por acción
  data/           datos semilla y almacén persistente en el navegador (+ restablecer)
  compartido/     componentes usados por 2 o más paneles
  paneles/
    administrador/   una carpeta por módulo
    supervisor/
    practicante/
```

### 4.4 Capas (regla 5 de la metodología, aplicada a este proyecto)

Flujo obligatorio: **Pantalla → `services/` → `domain/` + `data/`**.

- **`domain/`:** funciones puras y tipos. Aquí viven: transiciones de tarea y quién puede hacerlas, permisos por rol, cálculo del puntaje, reglas de insights, cálculo de indicadores, generación de IDs legibles. **No importa React, ni Zustand, ni `data/`.** Recibe datos como parámetros y devuelve resultados. Es lo más importante de probar.
- **`services/`:** una función por acción de usuario (`tomarTarea`, `aprobarTarea`, `finalizarPractica`, …). Cada una: (1) valida la entrada, (2) pregunta a `domain/` si se puede, (3) modifica `data/`, (4) registra el `EventoHistorial`, (5) crea las `Notificacion`, (6) simula una breve demora de red, (7) devuelve un resultado o un error controlado. **Es la única capa que escribe en `data/`.**
- **`data/`:** semilla, almacén y restablecer. Nada de reglas de negocio.
- **Pantallas y componentes:** solo llaman a `services/` (para actuar) y leen del almacén mediante selectores (para mostrar). **Ninguna pantalla contiene reglas de negocio ni modifica datos directamente.**
- **Separar en cada módulo de UI:** presentación (componentes), estado/selectores (hooks) y cálculos (funciones en `domain/`). Nada de componentes gigantes que mezclen todo.
- **Regla de la barrera:** si un módulo con backend real reemplazara `services/`, las pantallas no deberían cambiar. Si cambian, la separación está mal hecha.
- **Reutilización:** se empieza el componente dentro del panel; cuando aparece un segundo uso, **sube a `compartido/`**. No duplicar lógica (la tabla 14.4 de la propuesta dice qué se reutiliza entre paneles).

### 4.5 Manejo de errores

- Toda función de `services/` devuelve un resultado explícito (éxito o error con un código y un mensaje legible), nunca lanza errores crudos a la pantalla.
- Mensajes para el usuario: claros y en español, sin jerga técnica. Los errores esperados (regla no cumplida, motivo faltante) se muestran junto al campo o en un aviso; los inesperados, en un aviso genérico más un registro en consola.
- Estados de carga: toda acción con demora simulada deshabilita el botón y muestra "Creando…", "Analizando…", etc., para evitar dobles clics.
- Estados vacíos: **cada listado y cada bloque tiene su mensaje de estado vacío**, definido en la propuesta (sección 9). No se dejan pantallas en blanco.

---

## 5. Reglas de negocio críticas (resumen; el detalle está en la propuesta)

Estas son las reglas que el agente más fácilmente rompe. Antes de tocar tareas, PR o permisos, releer la sección indicada.

1. **Transiciones de tarea (propuesta §6.2):** DISPONIBLE→EN_PROGRESO (tomar, practicante del proyecto, no si el proyecto está EN_PAUSA); EN_PROGRESO→DISPONIBLE (liberar; motivo obligatorio si lo hace supervisor o admin); EN_PROGRESO→ESPERANDO_SUPERVISION (solo si `requiere_supervision`); EN_PROGRESO→TERMINADA (solo si NO `requiere_supervision`); ESPERANDO_SUPERVISION→TERMINADA (aprobar, supervisor del proyecto); ESPERANDO_SUPERVISION→EN_PROGRESO (devolver, nota obligatoria, deja la marca "Devuelta con observaciones"); TERMINADA→EN_PROGRESO (reabrir, supervisor o admin, nota obligatoria). **No existe ninguna otra transición.** Una única función de `domain/` decide, y todos los botones la consultan.
2. **Todas las acciones sobre una tarea se ejecutan desde el DETALLE de la tarea** (§6.7). Prohibido poner botones de acción (aprobar, devolver, tomar, liberar…) en tarjetas del tablero, filas de listados o el Inicio. Clic en tarjeta o fila = abrir el detalle.
3. **Editar título, descripción y fecha límite** solo en DISPONIBLE y EN_PROGRESO. Si está EN_PROGRESO, avisar al responsable.
4. **"Requiere supervisión":** nace desactivada; solo supervisor y admin la editan, y solo antes de ESPERANDO_SUPERVISION. Los contadores de supervisión cuentan solo tareas marcadas.
5. **El estado del PR es un dato aparte** (`estado_pr`), no una columna. Se muestra solo en tareas ESPERANDO_SUPERVISION o TERMINADA con `requiere_pr`. `requiere_pr` nace activado. Reglas de recálculo al devolver/reabrir: §7.4.
6. **Nada se borra.** Personas, proyectos y asignaciones nunca se eliminan. Única excepción: tarea DISPONIBLE sin PR (con motivo y confirmación; el historial conserva copia del ID y título).
7. **Asignación con `fecha_alta` y `fecha_baja`.** Volver a un proyecto crea una asignación nueva. Finalizar un proyecto **no** cierra las asignaciones.
8. **Un supervisor con proyectos activos no se puede desactivar** (primero se reasignan). Todo proyecto tiene exactamente un supervisor.
9. **Alcance por rol:** el Supervisor solo ve y actúa en sus proyectos; el Practicante solo en aquellos a los que está asignado. El Practicante ve el tablero completo de sus proyectos, pero las tareas ajenas son de **solo lectura**. De sus compañeros ve solo nombre, especialidad, carga, Discord y GitHub (nunca correo ni celular).
10. **El Supervisor no** crea proyectos, no asigna ni quita practicantes, no pausa ni finaliza proyectos, no ve el área técnica ni la postulación de origen de los practicantes. Define reunión, enlaces y rama base (igual que el admin).
11. **La IA sugiere, el Administrador decide.** El puntaje lo calcula el **sistema** con los pesos (el "modelo" solo juzga criterio por criterio; en el prototipo, una función local simula ese juicio). Nota final = 40 % área + 60 % especialidad (ajustable). Ejemplo de prueba: 80 y 90 → **86**.
12. **Insights = reglas explicables** con umbrales de Configuración (propuesta §5.6). El Supervisor ve 5 de las 7 reglas. "Revisado" es independiente por usuario. Los insights **no se guardan**: se calculan.
13. **Notificaciones:** solo dentro del sistema, según la tabla de §8.1. La persona que hizo la acción no se notifica a sí misma.
14. **Historial:** eventos inmutables, con valor anterior y nuevo, autor "Sistema" para lo automático, copia del ID y título del elemento. Nunca guarda contraseñas ni inicios de sesión.
15. **Contraseña temporal:** franja persistente en todas las pantallas hasta que la persona la cambie; mínimo 8 caracteres.
16. **Tablero:** la columna "Terminada" muestra las 5 más recientes + "Ver todas las terminadas"; el Practicante tiene el filtro "Solo mis tareas".
17. **IDs legibles:** `CODIGO-NNN` (ej. `PL2D-018`); código de proyecto 3–5 caracteres, único, inmutable; un número eliminado no se reutiliza.

---

## 6. Qué NO se construye (lista de prohibiciones)

No construir, no sugerir como si existiera, no dejar "por si acaso":

- Sprints, prioridades de tareas, etiquetas, comentarios en tareas, adjuntos, arrastrar y soltar.
- "Gestionar cupos", "capacidad asignada", "convocatoria", "motor de evaluación IA vX", "recalcular matriz", estados como "apto para entrevista".
- Versión del sistema ("SIGEP v2.4"), lugares de reunión ("Sala 2").
- El rol "Super Administrador". El rol es **Administrador**.
- Registro manual de postulantes, botón "Nuevo practicante", botón para marcar revisión manual, botón "Recalcular".
- Reasignación directa de tareas, cambio de proyecto de una tarea, límite de tareas por practicante.
- Que el Supervisor cree proyectos, asigne practicantes o pause/finalice proyectos.
- Exportar reportes, reportes personalizados, rankings de practicantes.
- Notificaciones por correo o WhatsApp, foto de perfil, verificación en dos pasos, preferencias de notificación.
- Registro de inicios de sesión.
- Llamadas reales a un modelo de lenguaje o a GitHub; claves de API en cualquier forma.
- Datos con fechas fijas del pasado (todas las fechas de la semilla son **relativas a hoy**).
- Emojis como íconos, `lorem ipsum`, negro puro `#000000`, degradados, brillos, glassmorphism, sombras fuertes, neón.

---

## 7. Reglas visuales (resumen; manda `docs/Especificacion_visual_SIGEP (1).md`)

- **Nunca colores escritos a mano en un componente.** Solo tokens (`--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-2`, `--primary`, `--link`, `--danger`, etc.). Todo componente debe verse bien en tema claro y oscuro.
- Un solo color de acción (verde `#58C481`). `#58C481` **no** se usa como texto sobre fondo claro; para texto verde, `--link`.
- Los colores de estado se usan **solo** para estados. El rojo solo para rechazo/eliminación, errores, atrasos y "Devuelta con observaciones". No mostrar a la vez un aviso rojo y uno ámbar por lo mismo.
- Montserrat para títulos y marca; Inter para todo lo demás (números tabulares en tablas). Cuerpo 14 px; nada menor a 12 px.
- Radio 6 px (botones, inputs) y 10 px (tarjetas, modales); bordes de 1 px en vez de sombras; foco visible siempre.
- Logo: isotipo negro **dentro de un recuadro blanco**, una sola vez arriba del sidebar.
- Íconos de métricas en gris neutro; solo la tarjeta que pide atención lleva color.
- Verificar contraste mínimo 4,5:1 en texto (pendiente desde el diseño).

---

## 8. Datos simulados (guía para la semilla)

Coherentes entre sí y con las reglas: ~24 practicantes, 3 supervisores, 5 proyectos, ~40 tareas, ~18 postulaciones, 4 áreas técnicas con especialidades y criterios. Fechas relativas a hoy.

La semilla **debe incluir casos para poder demostrar todo**:

- Un supervisor con 2 proyectos y otro con 1 (prueba Supervisor 1:N Proyecto). El estado vacío del Supervisor se demuestra creando un supervisor nuevo desde el panel del Administrador.
- Proyectos en cada estado: activo, en pausa y finalizado. Un proyecto sin practicantes.
- Practicantes: varios "Sin proyecto", uno finalizado, uno en 2 proyectos, uno con un proyecto anterior (asignación con baja), uno inactivo hace más de 7 y otro hace más de 14 días, uno con más de 3 tareas EN_PROGRESO, uno sin tareas mientras su proyecto tiene disponibles, uno cerca de su fecha de fin y uno que ya la superó.
- Tareas en cada estado y en cada etiqueta de PR (Pendiente, Creado, Con conflictos, Fusionado, Cerrado), tareas con y sin `requiere_supervision`, devueltas con observaciones (con nota), vencidas, sin asignar, una esperando supervisión hace más de 3 días, una reabierta, y un proyecto con más de 5 tareas terminadas (para la regla de "5 más recientes").
- Postulaciones en cada estado, con puntajes variados, una con la marca "Requiere revisión manual" por criterio obligatorio y otra por banda ambigua (50–69).
- Notificaciones y eventos de historial coherentes con los datos (el historial es la fuente de varios indicadores, así que la semilla debe generar eventos reales, no solo estados finales).
- Un caso de error de PR preparado ("rama inexistente" o "GitHub no disponible").
- Acceso rápido por rol: "Entrar como Administrador / Supervisor / Practicante" con un aviso discreto "Prototipo: autenticación simulada".

---

## 9. Plan por fases

**Cómo leer cada fase:** *Objetivo* · *Pasos* (cada uno se hace con el ciclo de la sección 2.1) · *Listo cuando* (criterio de terminado, incluye pruebas) · *Lee de la propuesta*. No se pasa a la fase siguiente sin cumplir el "Listo cuando" y sin OK de los autores.

> **Dependencias:** 0 → 1 → 2 → 3 → 4 → 5/6/7 → 8. Las fases 1–2 (lógica y datos) y 3–4 (interfaz base) pueden hacerse **en paralelo por dos personas** una vez terminada la Fase 0 y acordados los tipos de `domain/`.

---

### FASE 0 — Base técnica y tema

**Objetivo:** proyecto que arranca, con tema claro/oscuro funcionando y herramientas de pruebas listas.

**Pasos**
1. Propuesta de versiones de cada paquete (cumpliendo la sección 2.3), con la verificación de compatibilidad. Esperar OK.
2. Crear el proyecto con Vite + React + TypeScript; activar TypeScript estricto. Configurar ESLint y Prettier.
3. Instalar y configurar Tailwind v4 y shadcn/ui.
4. Definir **todos los tokens** de la especificación visual como variables CSS (claro y oscuro) y conectarlos a Tailwind. Cambio de tema con `data-theme` y persistencia de la preferencia.
5. Cargar Montserrat e Inter; definir la escala tipográfica.
6. Crear la estructura de carpetas (sección 4.3) con archivos `README` o `.gitkeep` donde estén vacías.
7. Configurar Vitest (y Testing Library si se aprueba) con una prueba de ejemplo.
8. Página de prueba temporal con: botón primario, tarjeta, badges de los 5 estados de tarea, tabla pequeña y alternador de tema. (Se elimina al final de la fase 3.)
9. **Verificar contraste** de los pares texto/fondo en ambos temas y anotar los resultados en `DECISIONES.md`.
10. Primer commit en `main` solo con `.gitignore`, `README.md` y `docs/`. Luego crear la rama `development` desde main y trabajar a partir de ahí. Desde ese momento nunca se trabaja directo en main ni en development.
11. Crear `PROGRESO.md` y `DECISIONES.md`.

**Listo cuando:** el proyecto instala y corre en el equipo de **ambas** personas; el cambio de tema funciona sin reescribir componentes; ningún color está escrito a mano; la prueba de ejemplo pasa; contraste verificado.

**Lee de la propuesta:** §13, §14.1, §14.2 y toda la especificación visual.

---

### FASE 1 — `domain/`: tipos y reglas puras (con pruebas)

**Objetivo:** todas las reglas del sistema como funciones puras y probadas, sin pantallas.

**Pasos**
1. **Tipos y enumeraciones** de todas las entidades (propuesta §11). Mostrar y acordar nombres antes de seguir.
2. **Permisos** por rol (la matriz de §4 convertida en una función `puede(usuario, accion, contexto)`). Recibe el usuario completo porque el rol solo no alcanza para "el responsable" o "sus proyectos". Devuelve un resultado con el código de denegación y si exige motivo o nota. Decide solo **quién** puede (rol, alcance, identidad, usuario activo); no mira el estado de la tarea, eso es de los pasos 3 a 5. Única excepción: un proyecto FINALIZADO es de solo lectura para las acciones que cambian tareas (§6.8). En un proyecto FINALIZADO nadie (Administrador o Supervisor) ejecuta acciones que cambien tareas; la vía es reactivar el proyecto. La guarda NO bloquea editar datos del proyecto, que siguen su fila de la matriz: reunión, enlaces y rama base (Administrador y Supervisor); descripción, fechas y repositorio (solo Administrador). El código del proyecto se define al crearlo y no se edita nunca.
3. **Transiciones de tarea** (regla 1 de la sección 5): función única `transicionesDisponibles(tarea, usuario, proyecto)` y `puedeTransicionar(...)`, incluyendo condiciones (supervisión, pausa, motivo/nota obligatorios).
4. **Reglas de edición de tarea y de opciones** (`requiere_supervision`, `requiere_pr`).
5. **Máquina del estado del PR** (tabla de §7.4, incluyendo recálculo al devolver/reabrir y "No requiere PR").
6. **Generación de ID legible** (`CODIGO-NNN`, número correlativo no reutilizable).
7. **Puntaje de postulaciones:** cálculo por bloques (área y especialidad), proporción, marca de revisión manual (criterio obligatorio no cumplido o banda ambigua).
8. **Reglas de insights** (las 7, con umbrales como parámetros) y su filtrado por alcance (admin vs supervisor).
9. **Indicadores:** avance, tiempo de ciclo, espera de supervisión, tasa de devolución, última actividad, días esperando, veces devuelta, carga.
10. **Reglas de ciclo de vida:** finalizar práctica (qué se libera), finalizar proyecto (bloqueo si hay ESPERANDO_SUPERVISION), desactivar supervisor (bloqueo con proyectos activos), fecha de fin prevista (ingreso + duración), aviso previo, vencimiento.

**Pruebas obligatorias (casos mínimos)**
- Matriz completa de transiciones: **cada combinación estado × rol × condición**, tanto la permitida como las prohibidas (por ejemplo, un practicante no puede aprobar su propia tarea; no se salta de DISPONIBLE a TERMINADA; no se envía a supervisión una tarea sin `requiere_supervision`).
- Tomar una tarea en un proyecto EN_PAUSA → rechazada.
- Motivo/nota faltante cuando es obligatorio → rechazada.
- Puntaje: el ejemplo 80/90 → 86; pesos que no suman 100; criterio obligatorio incumplido → marca; puntaje 50, 69, 49 y 70 en los bordes de la banda.
- Insights: justo en el umbral y un valor por debajo; reaparición de un insight revisado (empeora o 7 días).
- Permisos: cada fila de la matriz de §4 para cada rol; alcance (supervisor ajeno, practicante sin asignación o con fecha_baja, responsable vs. otro practicante); proyecto FINALIZADO (acciones de tareas denegadas a todos; editar reunión, enlaces y rama base permitido); usuario INACTIVO.
- Generación de IDs: número eliminado no se reutiliza.

**Listo cuando:** todas las pruebas pasan; `domain/` no importa React ni `data/`; los autores revisaron los tipos.

**Lee de la propuesta:** §4, §5.1 (puntaje), §5.2–5.4 (reglas), §5.6, §6, §7.4, §11.

---

### FASE 2 — `data/` y `services/`

**Objetivo:** la "base de datos" falsa y la "API" simulada, completas y probadas.

**Pasos**
1. **Almacén** (Zustand) con persistencia en el navegador y manejo del caso "almacenamiento vacío o corrupto" (se regenera la semilla, no se rompe la app).
2. **Semilla** según la sección 8, generada por funciones con fechas relativas a hoy. Debe generar también los eventos de historial.
3. **Restablecer datos de demostración.**
4. **Utilidades de `services/`:** registrar evento, crear notificación (respetando "no notificar la acción propia"), simular demora, resultado de éxito/error estándar.
5. **Servicios de tareas** (crear, editar, tomar, liberar, enviar a supervisión, terminar, aprobar, devolver, reabrir, eliminar, cambiar opciones). **Primero estos**, porque son el corazón.
6. **Servicios de Pull Request** (crear con ramas de ejemplo, caso de error preparado, detectar PR existente, cerrar, "No requiere PR", recálculo).
7. **Servicios de postulaciones** (evaluación simulada, aprobar —crea practicante con contraseña temporal—, rechazar, reconsiderar, criterios, áreas y especialidades).
8. **Servicios de practicantes y supervisores** (asignar, quitar, finalizar práctica, reactivar, restablecer contraseña, crear supervisor, editar, reasignar proyectos, desactivar).
9. **Servicios de proyectos** (crear, editar, cambiar supervisor, pausar, reanudar, finalizar, reactivar, reunión, enlaces, rama base). El servicio de editar proyecto rechaza cualquier cambio del código.
10. **Servicios de cuenta** (perfil, cambiar contraseña, marcar insight revisado, notificar desde insight, marcar notificaciones leídas, configuración).
11. **Consultas con alcance por rol:** funciones que devuelven "lo que este usuario puede ver" (proyectos, tareas, practicantes, insights). El alcance se aplica **aquí**, no en las pantallas.

**Pruebas obligatorias**
- Por cada servicio: caso exitoso, caso sin permiso, caso de datos inválidos y caso de dato inexistente. Verificar que cada acción exitosa deja su **evento de historial** y sus **notificaciones** correctas.
- Efectos en cascada: finalizar práctica (tareas EN_PROGRESO pasan a DISPONIBLE con un registro por cada una, asignaciones con baja, acceso bloqueado); quitar practicante; finalizar proyecto con tareas esperando supervisión (bloqueado); reasignar proyecto (las tareas esperando pasan al nuevo supervisor).
- Alcance: un supervisor no puede obtener datos de un proyecto ajeno; un practicante no obtiene correo ni celular de un compañero.
- Restablecer la semilla deja el sistema consistente.

**Listo cuando:** se puede ejecutar el **flujo completo por código** (aprobar postulación → asignar → crear tarea → tomar → enviar → aprobar → crear PR) en una prueba automática, con su historial y notificaciones coherentes.

**Lee de la propuesta:** §5 (reglas de cada módulo), §6, §7, §8.1, §11, §14.2–14.3.

---

### FASE 3 — Acceso, estructura y contenedores de pantalla

**Objetivo:** poder entrar como cada rol y navegar por un esqueleto vacío con el menú correcto.

**Pasos**
1. **Pantalla de acceso:** correo + contraseña de demostración y botones de acceso rápido por rol, con el aviso "Prototipo: autenticación simulada".
2. **Sesión** persistente y **guarda de rutas** por rol (un practicante que escribe la ruta de otro panel es redirigido).
3. **Layout común:** sidebar (logo en recuadro blanco, grupos con etiquetas), barra superior (ruta de navegación, botón de tema, campana, menú de usuario con Mi perfil y Cerrar sesión).
4. **Tres menús:** Administrador (9 módulos), Supervisor (Dashboard; Mis proyectos, Practicantes a cargo, Tareas; Reportes), Practicante (Inicio, Mis proyectos, Mi historial).
5. **Franja de contraseña temporal** persistente.
6. **Páginas vacías** por ruta con su título y estado vacío provisional.
7. Eliminar la página de prueba de la Fase 0.

**Listo cuando:** se puede entrar como cada rol, ver solo su menú, cambiar de tema, cerrar sesión; las rutas ajenas están bloqueadas; el sidebar y la barra superior no se rompen en pantallas estrechas razonables.

**Lee de la propuesta:** §4 (reglas de acceso), §5 (menú), §8.2–8.3, §9.1, §9.2, §13.4, §14.3.

---

### FASE 4 — Componentes compartidos

**Objetivo:** las piezas que usan varios paneles, construidas una sola vez.

**Pasos (en este orden)**
1. **Base:** botón, campo, selector, modal de confirmación (con motivo/nota), toast, estado vacío, esqueleto de carga, pestañas con contador, tabla compacta (filas ~44 px), paginación o scroll, filtros y búsqueda.
2. **Badges** de estado (tarea, postulación, proyecto, PR) y marcas ("Devuelta con observaciones", "Requiere revisión manual", ícono de supervisión). Un único componente alimentado por tokens.
3. **Tarjeta de métrica** y **tarjeta de proyecto** (con variante atenuada para "anteriores").
4. **Línea de tiempo** (alimentada por eventos del historial).
5. **Tablero Kanban** (4 columnas, tarjetas sin botones de acción, columna "Terminada" con las 5 más recientes y "Ver todas las terminadas", filtro "Solo mis tareas").
6. **Detalle de tarea** (componente compartido): estado, responsable, descripción, fecha límite, opciones, datos del PR, observaciones, línea de tiempo y **los botones que `domain/` permita** para el usuario y la tarea. Solo lectura cuando no tiene permiso. La línea de tiempo se muestra en cualquier detalle de tarea que el usuario pueda abrir, incluso en solo lectura. «Lo suyo» (matriz, Historial) se aplica a los perfiles y a «mi actividad» del resumen del proyecto.
7. **Modal "Crear Pull Request"** (título, descripción, rama de trabajo con buscador, rama base fija; estado "Creando…"; error que no cierra la ventana) y modal de cerrar PR.
8. **Formulario de tarea** (crear/editar) con Zod.
9. **Notificaciones:** campana con las últimas 8, "marcar todas", "ver todas" con pestañas, enlace desactivado si el elemento ya no existe.
10. **Mi perfil** (los 3 bloques, con las diferencias por rol y validaciones).
11. **Página de desarrollo temporal** (solo para probar): el tablero de un proyecto con selector de rol. Sirve para probar el flujo completo de tareas antes de tener los módulos. Se elimina al terminar la Fase 7.

**Listo cuando:** en la página temporal se puede recorrer el flujo de una tarea con los tres roles y cada botón aparece **solo** cuando corresponde; los badges coinciden con la especificación en ambos temas; las pruebas de componentes críticos (detalle de tarea: qué botones se ven por rol y estado) pasan.

**Lee de la propuesta:** §5.5, §6 completo, §7 completo, §8, §13, §14.4.

---

### FASE 5 — Panel del Administrador (módulo por módulo)

**Método:** cada módulo se construye en sub-pasos: (a) listado con pestañas y filtros → (b) detalle → (c) acciones una por una → (d) estados vacíos y errores. Cada módulo se cierra con sus pruebas y OK de los autores antes de pasar al siguiente. Si algo no convence al verlo, se ajusta (los autores lo anticiparon).

**Orden:** 5.1 Postulaciones → 5.2 Practicantes → 5.3 Supervisores → 5.4 Proyectos → 5.5 Tareas → 5.6 Reportes → 5.7 Historial de actividad → 5.8 Configuración → 5.9 Dashboard (**al final**, porque solo resume).

| Módulo | Puntos que no se pueden olvidar | Lee |
|---|---|---|
| **5.1 Postulaciones** | Abre en "Pendientes"; orden por puntaje; evaluación en 2 bloques con desglose; nota fija "el puntaje es una ayuda"; "Analizando…" al evaluar; Aprobar (crea practicante, muestra la contraseña temporal una sola vez), Rechazar (motivo), Reconsiderar (nota); sub-sección de criterios, áreas y especialidades (pesos suman 100; no se borra, se desactiva; no recalcula evaluaciones pasadas). Aviso sobre uso del CV. | §5.1, §10.1 |
| **5.2 Practicantes** | Sin botón "Nuevo practicante"; atajo "Asignar a proyecto" en "Sin proyecto"; finalizar con aviso de tareas a liberar; reactivar; fecha de fin y aviso previo. | §5.2 |
| **5.3 Supervisores** | "Nuevo supervisor"; reasignar proyectos; no desactivar con proyectos activos (mensaje con cuántos). | §5.3 |
| **5.4 Proyectos** | Código único e inmutable; repositorio y rama base obligatorios; reunión opcional; detalle con Resumen, Tablero y Equipo; pausar/reanudar/finalizar/reactivar con nota; finalizar bloqueado con tareas esperando supervisión. | §5.4 |
| **5.5 Tareas** | Vista transversal con filtros; ID legible; sin botones de decisión en las filas. | §5.5, §6.7 |
| **5.6 Reportes** | Insights (7 reglas, ver detalle, marcar revisado, notificar) e Indicadores (selector de periodo, tablas por proyecto y por practicante, gráfico por área). | §5.6 |
| **5.7 Historial** | Filtros, panel de detalle con valor anterior y nuevo, solo lectura. | §5.7 |
| **5.8 Configuración** | Umbrales con validación y valor predeterminado; restaurar por sección; tarjeta de GitHub de ejemplo; "Restablecer datos" marcado "solo prototipo". | §5.8 |
| **5.9 Dashboard** | 4 tarjetas con enlace filtrado; 5 postulaciones de mayor puntaje; alertas (máx. 5); practicantes por área. No calcula nada propio. | §5.9 |

**Listo cuando (por módulo):** el flujo del módulo funciona con sus excepciones; cada acción deja historial y notificaciones; estados vacíos correctos; se ve bien en ambos temas; checklist manual entregado y probado.

---

### FASE 6 — Panel del Supervisor

**Orden:** 6.1 Mis proyectos → 6.2 Tareas → 6.3 Practicantes a cargo → 6.4 Reportes → 6.5 Dashboard (al final).

**Regla de esta fase:** reutilizar lo construido para el Administrador **con alcance filtrado**; solo se crea código nuevo donde la propuesta lo marca como pantalla nueva (tarjetas de proyecto, Practicantes a cargo).

| Módulo | Puntos que no se pueden olvidar | Lee |
|---|---|---|
| **6.1 Mis proyectos** | Tarjetas (no tabla), pestañas y búsqueda por nombre; ámbar solo si hay tareas esperando; vencidas NO en la tarjeta; "Sin practicantes asignados"; detalle con 3 pestañas; puede cambiar reunión, enlaces y rama base; **no** puede crear/pausar/finalizar ni asignar. | §9.1.1 |
| **6.2 Tareas** | Abre en "Esperando supervisión" si hay tareas ahí; columna "Días esperando" en esa pestaña; aprobar/devolver solo desde el detalle; en proyecto en pausa aún puede aprobar/devolver. | §9.1.3, §6.7 |
| **6.3 Practicantes a cargo** | Una fila por practicante aunque esté en 2 proyectos; cuentas solo de sus proyectos; pestañas Activos/Anteriores; detalle de solo lectura con fecha de fin y disponibilidad; **sin** área técnica ni postulación. | §9.1.2 |
| **6.4 Reportes** | 5 de 7 reglas; sin "Notificar" en supervisión demorada; indicadores sin postulaciones ni área; "revisado" independiente del admin. | §9.1.4 |
| **6.5 Dashboard** | 4 tarjetas (ámbar y rojo solo si hay); Por revisar (5 más antiguas); alertas; próximas reuniones; avance por proyecto; **estado vacío total** si no tiene proyectos. | §9.1.5 |

**Listo cuando:** probado con un supervisor de 2 proyectos y con uno recién creado (sin proyectos); **ninguna pantalla ni consulta devuelve datos de proyectos ajenos**.

---

### FASE 7 — Panel del Practicante

**Orden:** 7.1 Mis proyectos → 7.2 Mi historial → 7.3 Inicio (al final).

| Módulo | Puntos que no se pueden olvidar | Lee |
|---|---|---|
| **7.1 Mis proyectos** | Tarjetas sin pestañas ni búsqueda; sección "Anteriores" atenuada con resumen mínimo de solo lectura (sin tablero ni equipo); detalle con Resumen (repo y rama base, mi actividad), Tablero (con "Solo mis tareas", tareas ajenas en solo lectura) y Equipo (compañeros: nombre, especialidad, carga, Discord, GitHub; supervisor: Discord y GitHub, **sin celular**). Tomar solo desde el detalle. | §9.2.1 |
| **7.2 Mi historial** | Tareas terminadas por él, de todos sus proyectos; columna "veces devuelta"; filtro por proyecto y búsqueda; solo lectura; las liberadas no aparecen; una reabierta sale y vuelve. | §9.2.2 |
| **7.3 Inicio** | 4 tarjetas (rojo solo en "Devueltas" si hay); Mis tareas en curso (orden: devueltas, vencidas, fecha límite); Pull Requests por atender (**consulta `estado_pr`**, no el estado del Kanban); próximas reuniones; sin botones de acción; estado vacío total. | §9.2.3 |

**Listo cuando:** se recorre el flujo completo como practicante (tomar → trabajar → enviar/terminar → crear PR → ver devolución → corregir); un practicante no puede ver correo ni celular de nadie ni actuar sobre tareas ajenas; se elimina la página de desarrollo temporal de la Fase 4.

---

### FASE 8 — Pulido, pruebas de punta a punta y entrega

**Pasos**
1. **Guion de demostración** (el recorrido que se presenta al asesor y a la empresa): del postulante al cierre de práctica, pasando por los tres roles.
2. **Pruebas de punta a punta** del guion (con una herramienta de pruebas de navegador si los autores lo aprueban, o con checklist manual firmado).
3. **Recorrido de coherencia:** cada pantalla vs. la propuesta (¿aparece algo que no debería? ¿falta algún estado vacío?). Verificar la lista de la sección 6.
4. **Revisión visual** en ambos temas y en distintos anchos; contraste final.
5. **Accesibilidad básica:** navegación con teclado, foco visible, etiquetas en formularios, textos alternativos.
6. **Prueba del build de producción** (`vite build` + `vite preview`) y de cargar la app con el almacenamiento vacío y con datos viejos.
7. **Limpieza:** código muerto, comentarios obsoletos, dependencias sin uso, que no quede ninguna clave ni dato personal real.
8. **Documentación final:** `README.md` (instalar, correr, probar, estructura, cómo cambiar de rol), `DECISIONES.md` actualizado.
9. Unir `development` a `main` y etiquetar `v1.0-prototipo` en `main`.

**Listo cuando:** el guion completo se ejecuta sin errores en una instalación limpia en el equipo de ambas personas, y el build de producción se comporta igual que el de desarrollo.

---

## 10. Archivos de seguimiento (el agente los mantiene)

El agente no tiene memoria entre sesiones; estos archivos sí.

**`PROGRESO.md`** — se actualiza al final de cada paso:
- Fase y paso actual.
- Lista de pasos terminados (con la fecha y el commit).
- Lo que quedó a medias y por qué.
- Preguntas abiertas para los autores.

**`DECISIONES.md`** — una línea o un párrafo breve por decisión técnica importante: qué se eligió, qué alternativas había y por qué (versiones elegidas, nombres, patrones, resultados del contraste, etc.). Evita que la decisión viva solo en un chat.

---

## 11. Trabajo en pareja y Git

- **Ramas:** `main` es la versión estable y demostrable (solo recibe código de `development` al cerrar una fase). `development` es la rama de integración y pruebas. Cada paso o módulo se trabaja en una rama propia creada desde `development`: `feat/fase2-servicios-tareas`, `feat/admin-postulaciones`, `fix/...`, `test/...`.
- **Commits:** una unidad lógica por commit; mensajes con `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`. Antes de cada commit, el agente lista los archivos que entrarán y confirma que no hay secretos ni archivos locales.
- **Integración:** cada rama de trabajo se une a `development` mediante un Pull Request revisado por **la otra persona** (es la misma práctica que el sistema promueve; vale la pena vivirla), con las pruebas pasando. `development` se une a `main` solo cuando una fase cumple su "Listo cuando" y ambas personas lo confirman. Se etiqueta el cierre de fase en `main` (por ejemplo, `fase-2-completa`).
- **División sugerida del trabajo en paralelo** (se puede acordar otra):
  - Persona A: Fases 1 y 2 (`domain/`, `data/`, `services/`).
  - Persona B: Fases 3 y 4 (acceso, layout, componentes), usando datos de ejemplo mínimos hasta que A entregue los servicios.
  - Desde la Fase 5, repartir por módulo o por panel; antes de empezar, acordar qué componentes de `compartido/` se tocan para evitar choques.
- **Contrato entre ambas personas:** los tipos de `domain/` (Fase 1, paso 1) se acuerdan juntos y **no se cambian sin avisar**, porque todo depende de ellos.
- Si dos personas usan agentes de IA distintos, ambos leen este mismo archivo y los mismos `PROGRESO.md` y `DECISIONES.md` (versionados en el repositorio).

---

## 12. Riesgos y pendientes abiertos (no bloquean el inicio)

| Pendiente | Qué hacer |
|---|---|
| Consulta al **asesor**: ¿el ranking de CVs simulado cumple la exigencia de IA en un proyecto de "Diseño"? ¿Título u objetivos deben mencionar la IA? ¿Un prototipo en React sigue siendo "Diseño"? | Resolver pronto. Si la respuesta obliga a un ranking real, hace falta un servidor mínimo (la clave **nunca** puede ir en el navegador). El agente no implementa nada real de IA sin instrucción explícita. |
| **3 grupos** trabajan el mismo tema en CODAINI | Confirmar si el proyecto sigue. No impide empezar. |
| Catálogo inicial de **especialidades** (campo "ROL" del Excel) | Revisar con CODAINI; mientras tanto la semilla usa especialidades de ejemplo (Frontend, Backend, etc.). |
| **Contraste** de colores | Se verifica en la Fase 0 y se vuelve a verificar en la Fase 8. |
| Librerías no confirmadas (router, pruebas) | Proponerlas en la Fase 0 con justificación. |
| API real de GitHub | Fuera del prototipo; verificar su documentación solo si algún día se implementa. |
| Diagrama entidad-relación e historias de usuario (para la tesis) | Van en paralelo al desarrollo; no bloquean. |
