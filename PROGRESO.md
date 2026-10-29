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

- **Fase actual:** 1, paso 2 en curso.
- **Rama:** `feat/fase1-permisos`.
- **Siguiente paso:** Fase 1, paso 2 — permisos por rol (matriz de §4).

### Pasos terminados

| Fecha | Fase | Paso | Commit / PR |
|---|---|---|---|
| 2026-10-23 | 1 | 1. Tipos, enumeraciones y constantes de `domain/` | `1251fb5`; docs `fd8cf78`; PR #5 fusionado en `a17099a` |
| 2026-10-23 | — | chore PR #6: `.gitattributes` y regla de `git config` en `AGENTS.md` | fusionado en `e4993af` |

### Pendientes

- [x] Fase 1, paso 1: revisión de los tipos por la Persona B en el PR de `feat/fase1-tipos`.
- [ ] Confirmar que el PR de dependencias de la Persona B (`zustand`, `zod`, `react-hook-form`, `@hookform/resolvers`, `react-router`, `date-fns`, `sonner`) se fusionó en `development`.
- [ ] Fase 1, pasos 2–10: permisos, transiciones de tarea, reglas de edición, máquina del estado del
      PR, generación de ID, puntaje de postulaciones, insights, indicadores y ciclo de vida.
- [ ] Fase 1: pruebas mínimas de la sección 9 del plan.
- [ ] Fase 2, pasos 1–11: almacén, semilla, restablecer datos, utilidades y servicios por módulo,
      consultas con alcance por rol, más sus pruebas.

### Preguntas abiertas

- Paso 8 (regla «Posible atraso»): el 25 % de tareas vencidas, ¿se calcula sobre el total de tareas
  o sobre las no terminadas?
- Paso 10 (ciclo de vida): en un proyecto FINALIZADO, `puede()` no bloquea asignar o quitar
  practicantes ni cambiar de supervisor; decidir allí si debe bloquearse.
- Paso 8 (insights): definir qué 5 de las 7 reglas ve el Supervisor.
  `MARCAR_INSIGHT_REVISADO` y `NOTIFICAR_DESDE_INSIGHT` solo comprueban el alcance por proyectos.

## Persona B — Fases 3 y 4 (acceso, layout, `compartido/`)

- **Fase actual:** 3 — Acceso, estructura y contenedores de pantalla.
- **Rama:** ninguna todavía; al arrancar, `feat/fase3-acceso` desde `development`.
- **Siguiente paso:** Fase 3, paso 1 — pantalla de acceso.

### Pasos terminados

| Fecha | Fase | Paso | Commit / PR |
|---|---|---|---|
| — | — | — | — |

### Pendientes

- [ ] Confirmar que el proyecto instala y corre en su equipo (criterio de «Listo» de la Fase 0).
- [ ] Fase 3, pasos 1–7: pantalla de acceso, sesión y guardas por rol, layout común, tres menús,
      franja de contraseña temporal, páginas vacías y borrado de la página de prueba.
- [ ] Fase 4, pasos 1–11: base de componentes, badges, tarjetas, línea de tiempo, tablero, detalle de
      tarea, modales de PR, formulario de tarea, notificaciones, Mi perfil y página temporal.
- [ ] Fase 4, paso 3: definir el radio de 8 px de las tarjetas de métrica (pendiente heredado).

### Preguntas abiertas

- Ninguna por ahora.
