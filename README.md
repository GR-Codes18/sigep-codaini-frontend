# SIGEP CODAINI

Prototipo navegable, solo frontend y con datos simulados, para centralizar la gestión de
practicantes y proyectos de CODAINI (React + TypeScript).

## Requisitos

- Node.js `^22.22.2 || ^24.15.0 || >=26` (el rango lo impone jsdom 30; se recomienda la LTS 24).
  Node 20 ya no recibe soporte. El proyecto falla al instalar si el Node no cumple `engines`.
- npm (el repo trae `.npmrc` con versiones exactas).

En Windows, si PowerShell bloquea `npm.ps1`, usar `npm.cmd` y `npx.cmd`.

## Instalación y ejecución

```bash
npm install       # instala las dependencias
npm run dev       # servidor de desarrollo
npm run test      # pruebas con Vitest (una pasada)
npm run lint      # ESLint
npm run build     # comprobación de tipos + build de producción
```

Otros scripts disponibles: `npm run preview`, `npm run test:watch`, `npm run format` y
`npm run format:check`.

## Documentación

- `docs/` — fuentes de verdad del proyecto (no se borran ni se sobrescriben):
  - `Propuesta_SIGEP_Codaini_v6.md`: reglas de negocio, paneles, permisos, modelo de datos.
  - `Especificacion_visual_SIGEP (1).md`: colores, tipografía, tokens, componentes.
  - `METODOLOGÍA DE TRABAJO.md`: forma de trabajo.
  - `SIGEP_Plan_de_Desarrollo_y_Reglas_del_Agente.md`: plan por fases y reglas del agente.
- `PROGRESO.md` — fase y paso actual, pasos terminados con fecha y commit, pendientes y preguntas.
- `DECISIONES.md` — decisiones técnicas y su porqué.

Al empezar una sesión se lee el plan completo, luego `PROGRESO.md` y `DECISIONES.md`, y solo las
secciones de la propuesta que pida el paso actual.

## Flujo de ramas y Pull Requests

- `main` es la versión estable y demostrable; solo recibe código de `development` al cerrar una fase.
- `development` es la rama de integración y pruebas.
- Cada paso o módulo se trabaja en una rama propia creada desde `development`
  (`feat/...`, `fix/...`, `test/...`, `chore/...`). Nunca se trabaja directo en `main` ni en
  `development`.
- Commits pequeños, una unidad lógica por commit, con prefijo `feat:`, `fix:`, `chore:`, `test:`,
  `docs:` o `refactor:`.
- Cada rama se une a `development` mediante un Pull Request revisado por la otra persona, con las
  pruebas pasando.
- `development` se une a `main` solo cuando la fase cumple su criterio de "Listo" y ambas personas
  lo confirman; el cierre se etiqueta en `main` (por ejemplo, `fase-0-completa`).
