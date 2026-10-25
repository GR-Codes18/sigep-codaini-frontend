# PROGRESO.md — SIGEP CODAINI

> **Cómo se edita este archivo:** cada persona escribe **solo en su bloque** (Persona A / Persona B).
> El bloque «Estado general (común)» solo lo edita quien cierra una fase, avisando a la otra persona.
> En `DECISIONES.md` solo se agregan entradas al final, con fecha y `[A]` o `[B]` en el título.
> El estado de las ramas no se anota aquí: **git es la fuente de verdad**.

## Estado general (común)

- **Fase actual:** Fase 0 cerrada. En paralelo: Persona A (Fases 1–2) y Persona B (Fases 3–4).
- **Actualizado:** 2026-10-21, al crear la rama `chore/progreso-por-persona`.

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

### Pendientes comunes

- Confirmar el estilo de Prettier si se quiere otro distinto al propuesto (comillas simples, punto y
  coma, ancho 100).
- Interlineado: la especificación visual y la propuesta §13 no definen un valor; confirmar si se fija
  uno.
- Revisar las 7 vulnerabilidades altas de `shadcn` al actualizar esa dependencia.

## Persona A — Fases 1 y 2 (`domain/`, `data/`, `services/`)

- **Fase actual:** 1 — `domain/`: tipos y reglas puras.
- **Rama:** `feat/fase1-tipos` (se crea desde `development`).
- **Siguiente paso:** Fase 1, paso 1 — tipos y enumeraciones (propuesta §11).

### Pasos terminados

| Fecha | Fase | Paso | Commit / PR |
|---|---|---|---|
| — | — | — | — |

### Pendientes

- [ ] Fase 1, paso 1: tipos y enumeraciones. Se acuerdan con la Persona B por PR antes de seguir.
- [ ] Fase 1, pasos 2–10: permisos, transiciones de tarea, reglas de edición, máquina del estado del
      PR, generación de ID, puntaje de postulaciones, insights, indicadores y ciclo de vida.
- [ ] Fase 1: pruebas mínimas de la sección 9 del plan.
- [ ] Fase 2, pasos 1–11: almacén, semilla, restablecer datos, utilidades y servicios por módulo,
      consultas con alcance por rol, más sus pruebas.

### Preguntas abiertas

- Ninguna por ahora.

## Persona B — Fases 3 y 4 (acceso, layout, `compartido/`)

- **Fase actual:** 4 — hecho todo lo que no depende de Persona A (pasos 1 a 5, 7 y 8).
- **Rama:** `feature/fase3`.
- **Siguiente paso:** esperar a Persona A para el paso 6 (detalle de tarea) y los pasos 9 a 11.

### Pasos terminados

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
| 2026-10-25 | 4 | 2 (insignias), 3 (tarjetas), 4 (línea de tiempo, `date-fns`), 7 (modal PR), 8 (formulario de tarea) | `7a78c98` (commit conjunto) |

### Pendientes

- [ ] Fase 3, paso 7: borrar `src/app/pagina-prueba/` (se dejó a propósito).
- [ ] Checklist manual de los pasos 2 a 5 de la Fase 3.
- [ ] Mover `RaizSegunSesion` y `AccesoSiNoHaySesion` fuera de `rutas.tsx` (2 avisos de lint).
- [ ] Logo real de CODAINI (hoy hay un placeholder con colores a mano).
- [ ] Reemplazar tipos provisionales (`auth/tipos.ts`, `TareaTablero`, `EventoLinea`) cuando entre `feat/fase1-tipos`.
- [ ] Fase 4, paso 6 (detalle de tarea) y pasos 9 a 11: esperan a Persona A.
- [ ] PR a `development` y aviso a Persona A.

### Preguntas abiertas

- ¿Persona A aprueba `@hookform/resolvers` 5.2.2 en vez de 6.0.0?
- ¿Persona A aprueba las rutas con prefijo (`/administrador/...`)? La propuesta no las define.
- ¿Una rama por paso desde ahora, o seguimos en `feature/fase3`?