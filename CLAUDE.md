# SIGEP CODAINI — Reglas para Claude Code

Prototipo frontend de tesis (React 19, TypeScript estricto, Vite, Tailwind v4, shadcn/ui, Zustand,
Zod, Vitest). Solo frontend, con datos simulados. Dos autores (Gabriel y Roxana) trabajan JUNTOS con
este agente: avanzan una sola vez, no por separado.

## Al iniciar cada sesión
1. Lee completo `docs/SIGEP_Plan_de_Desarrollo_y_Reglas_del_Agente.md`, luego `PROGRESO.md` y
   `DECISIONES.md`.
2. De `docs/Propuesta_SIGEP_Codaini_v6.md` lee solo las secciones que indique el paso actual.
3. Lee `docs/METODOLOGÍA DE TRABAJO.md` y `docs/Especificacion_visual_SIGEP (1).md` solo cuando el
   paso lo requiera.
4. Responde SIEMPRE en español.
5. Di en pocas líneas qué paso toca, qué entiendes y qué dudas reales tienes. No escribas código
   hasta recibir el OK.

## Precedencia de las fuentes
Propuesta v6 > especificación visual > plan > tu criterio. Si algo no está en la propuesta, NO se
inventa: se pregunta. Las decisiones ya cerradas (propuesta y DECISIONES.md) no se reabren; puedes
señalar un riesgo técnico real con su argumento, pero no cambiarlas por tu cuenta. La lista de lo
que NO se construye está en la sección 6 del plan (sprints, prioridades, cupos, etc.).

## Forma de trabajo: una sesión por fase, una parada por paso
Dentro de una fase puedes encadenar los pasos, pero DETENTE al cerrar cada uno. Para cada paso:
1. **Propón:** concepto en términos simples, archivos que se crean o tocan, y si hay más de una
   forma razonable, 2 o 3 opciones con su trade-off y tu recomendación. Pregunta solo dudas reales.
2. **Espera el OK** de los autores.
3. **Implementa** en piezas pequeñas, con pruebas.
4. **Verifica:** `npm run test`, `npx tsc -b`, `npx eslint <carpeta tocada>`,
   `npx prettier --check <carpeta tocada>` y `npm run build`. `git diff -- docs` debe estar vacío.
5. **Muestra** el diff, explica lo no obvio (decisiones y trucos, no líneas triviales), lista los
   archivos y propón el mensaje de commit. Para reglas de `domain/` propón además qué mutación 
   (Mutación: primero git add <ruta>; rompe la regla; confirma que el test falla nombrando acción 
   y rol; git restore <ruta>; confirma que vuelve a pasar.) haría fallar cada prueba. **Detente.**
6. Cuando los autores confirmen que hicieron el commit, actualiza `PROGRESO` y `DECISIONES` con el hash de `git log`.

## Preguntas abiertas: el agente pregunta, no decide
Ante cualquiera de estas, detente y pregunta con opciones y trade-off:
- Regla «Posible atraso»: el 25 % de vencidas, ¿sobre el total o sobre las no terminadas?
- Qué 5 de las 7 reglas de insight ve el Supervisor.
- En un proyecto FINALIZADO, ¿se bloquea asignar/quitar practicantes y cambiar de supervisor?
- Cualquier valor, regla o pantalla que la propuesta no defina.

## Git
- Nunca trabajes en `main` ni en `development`: usa una rama propia (`feat/...`, `fix/...`,
  `test/...`, `docs/...`) creada desde `development`.
- NUNCA hagas `git commit` ni `git push` sin confirmación explícita. Antes de proponer un commit,
  lista los archivos y confirma que no hay secretos.
- Un commit = una unidad lógica. Convención: `feat:`, `fix:`, `chore:`, `test:`, `docs:`,
  `refactor:`, `style:`. Código primero, docs después, con `git add` por ruta (nunca `git add .`
  ni `git restore .`).
- Nunca cambies `git config`. Si un diff se ve raro por finales de línea, avisa y espera.
- Conflicto en `package-lock.json`: toma la versión de `development` y ejecuta `npm install`.
- Los commits y los PR los hacen los autores. Cada rama se integra con un PR revisado.

## Reglas del código
- Capas: pantalla → `services/` → `domain/` + `data/`. `domain/` es puro (sin React, sin Zustand,
  sin `data/`). `services/` es la única capa que escribe en `data/`. Las pantallas no tienen
  reglas de negocio. Si `services/` se reemplazara por un backend, las pantallas no deben cambiar.
- Toda acción pasa por `services/` y se valida contra `domain/permisos`; nunca se confía solo en
  ocultar un botón. Las acciones sobre una tarea se ejecutan SOLO desde su detalle.
- Identificadores de dominio en español, sin tildes ni ñ (`fecha_limite`, `EN_PROGRESO`); texto de
  interfaz en español con tildes.
- Validación de formularios con Zod. Errores como resultado explícito (código y mensaje legible),
  nunca errores crudos a la pantalla. Cada listado tiene su estado vacío.
- Sin claves de API ni secretos en ningún lugar. GitHub y el modelo de lenguaje se simulan.
- Solo colores y tamaños de los tokens de la especificación visual; nunca colores a mano. Todo
  funciona en tema claro y oscuro. Prohibido: degradados, brillos, sombras fuertes, emojis como
  iconos, lorem ipsum, negro puro.
- Sin librería de arrastre en el Kanban (los estados cambian con botones en el detalle).

## Dependencias
- Antes de instalar, verifica con `npm view <paquete> version` y di la versión y si es estable.
  No instales RC, beta ni next. Versiones exactas (sin `^`; `.npmrc` ya lo fuerza).
- Quien instala una dependencia hace un PR pequeño solo para eso.
- `shadcn add` puede sobrescribir `src/compartido/ui/button.tsx` (tiene dos ajustes de tokens):
  responde que NO o repite los dos cambios de DECISIONES.md.
- No ejecutes `npm audit fix` ni `--force` (ver DECISIONES.md, auditoría de dependencias).

## Pruebas
- Casos de éxito y de error. En `domain/` y `services/`: cada combinación estado × rol × condición,
  alcance (supervisor ajeno, practicante sin asignación o con baja), proyecto FINALIZADO, usuario
  INACTIVO, textos vacíos o solo espacios, y el orden de comprobación.
- En las pantallas: checklist manual (qué hacer, qué debe pasar, qué errores probar).
- Si algo falla, diagnostica la causa raíz antes de corregir; no apliques arreglos a ciegas.

## Límites
- Nunca borres ni sobrescribas `docs/`: los cambios en `docs/` los hacen los autores a mano. Si el
  código se desvía de `docs/`, avísalo para que lo actualicen.
- No reformatees ni toques archivos fuera del paso (por ejemplo, no ejecutes `npm run format` sobre
  todo el proyecto). Si una herramienta modifica archivos ajenos, revierte con `git checkout --
  <ruta>`.
- Si algo tarda mucho o queda a medias, verifica con `git status` que no haya archivos a medio
  escribir antes de repetir.

## Entorno
- Windows con Git Bash: usa `npm` y `npx`. Si falla por la política de PowerShell, usa `npm.cmd` y
  `npx.cmd`.
- Node `^22.22.2 || ^24.15.0 || >=26` (lo exige jsdom 30).