# PROGRESO.md — SIGEP CODAINI

## Estado actual

- **Fase:** 0 — Base técnica y tema
- **Paso actual:** 2 de 11 — proyecto Vite + React + TypeScript, TS estricto, ESLint y Prettier (**terminado; esperando revisión y OK para el paso 3**).
- **Fecha:** 2026-10-20
- **Rama:** `chore/fase0-base-tecnica` (creada desde `development`)

## Pasos terminados

| Fecha | Fase | Paso | Commit |
|---|---|---|---|
| 2026-10-20 | 0 | 1. Propuesta de versiones y verificación de compatibilidad (aprobada) | pendiente (entra con el paso 2) |
| 2026-10-20 | 0 | 2. Proyecto Vite + React + TS, TS estricto, ESLint y Prettier | pendiente de confirmación |

## Pendientes de la Fase 0

1. ✅ Versiones de paquetes y compatibilidad.
2. ✅ Proyecto Vite + React + TS, TS estricto, ESLint y Prettier.
3. ⏳ Tailwind v4 y shadcn/ui.
4. Tokens de la especificación visual (claro/oscuro) y tema con `data-theme` + persistencia.
5. Montserrat e Inter; escala tipográfica.
6. Estructura de carpetas de `src/` (con `README`/`.gitkeep` donde haga falta).
7. Vitest (+ Testing Library) con prueba de ejemplo.
8. Página temporal de prueba (botón, tarjeta, badges, tabla, alternador de tema).
9. Verificar contraste en ambos temas y anotarlo en `DECISIONES.md`.
10. Commit inicial en `main` (.gitignore, README, docs) y rama `development`.
11. Crear/actualizar `PROGRESO.md` y `DECISIONES.md`.

## Estado del repositorio

- `main` en `0709f42` (documentos iniciales); `development` en `3f2177b` (actualización del plan); el paso 2 se trabaja en `chore/fase0-base-tecnica`.
- `docs/` ya está versionado y **no se debe borrar ni sobrescribir**.
- `AGENTS.md` existe en la raíz y aún no está versionado.
- Código de aplicación: base mínima creada (React + Vite); sin módulos de negocio todavía.
- En Windows se usa `npm.cmd` (la política de PowerShell bloquea `npm.ps1`).

## Verificación del paso 2 (2026-10-20)

- `npm.cmd install`: 160 paquetes, 0 vulnerabilidades, sin conflictos de peers.
- `npm.cmd run lint`: sin errores.
- `npm.cmd run format:check`: pasa (se aplicó `format` una vez para `src/index.css`).
- `npm.cmd run build`: compila con Vite 8.3.4.
- `git diff -- docs`: vacío; `docs/` intacto.

## Decisiones recientes

- TypeScript 6.0.3 con ESLint (TS 7 no lo soporta `typescript-eslint`).
- `react-router` 7.18.4 (no `react-router-dom`).
- `engines.node = "^22.22.2 || ^24.15.0 || >=26"` (lo impone jsdom 30; Node 24 LTS recomendado).
- Tipografías autoalojadas con Fontsource.
- Detalle completo en `DECISIONES.md`.

## Preguntas abiertas

- Node local 24.21.0: cumple el rango; 24.22.0 es el parche más reciente de la LTS.
- Confirmar estilo de Prettier si se quiere otro distinto al propuesto (comillas simples, punto y coma, ancho 100).
- Vigilar que `shadcn init/add` no cambie versiones de paquetes sin avisar.
