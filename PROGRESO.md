# PROGRESO.md — SIGEP CODAINI

## Estado actual

- **Fase:** 0 — Base técnica y tema
- **Paso actual:** 3 de 11 — Tailwind v4 y shadcn/ui (**terminado; pendiente de commit**).
- **Fecha:** 2026-10-20
- **Rama:** `chore/fase0-base-tecnica` (creada desde `development`)

## Pasos terminados

| Fecha | Fase | Paso | Commit |
|---|---|---|---|
| 2026-10-20 | 0 | 1. Propuesta de versiones y verificación de compatibilidad (aprobada) | `2d35e5b` |
| 2026-10-20 | 0 | 2. Proyecto Vite + React + TS, TS estricto, ESLint y Prettier | `0b6de05` |
| 2026-10-20 | 0 | 3. Tailwind v4 y shadcn/ui | pendiente de commit |

## Pendientes de la Fase 0

1. ✅ Versiones de paquetes y compatibilidad.
2. ✅ Proyecto Vite + React + TS, TS estricto, ESLint y Prettier.
3. ✅ Tailwind v4 y shadcn/ui.
4. ⏳ Tokens de la especificación visual (claro/oscuro) y tema con `data-theme` + persistencia.
5. ⏳ Montserrat e Inter; escala tipográfica.
6. ⏳ Estructura de carpetas de `src/` (con `README`/`.gitkeep` donde haga falta).
7. ⏳ Vitest (+ Testing Library) con prueba de ejemplo.
8. ⏳ Página temporal de prueba (botón, tarjeta, badges, tabla, alternador de tema).
9. ⏳ Verificar contraste en ambos temas y anotarlo en `DECISIONES.md`.
10. ⏳ Commit inicial en `main` (.gitignore, README, docs) y rama `development`.
11. ⏳ Crear/actualizar `PROGRESO.md` y `DECISIONES.md`.

## Estado del repositorio

- `main` en `0709f42` (documentos iniciales); `development` en `3f2177b` (actualización del plan).
- `chore/fase0-base-tecnica` está en `0b6de05` (paso 2) más los cambios del paso 3 sin commitear; la rama está subida a `origin`.
- `docs/` ya está versionado y **no se debe borrar ni sobrescribir**.
- `AGENTS.md` está versionado (entró en `2d35e5b`).
- Código de aplicación: base mínima + `src/compartido/` (`utils.ts` y `ui/button.tsx` de prueba); sin módulos de negocio todavía.
- En Windows se usa `npm.cmd` (la política de PowerShell bloquea `npm.ps1`).

## Verificación del paso 2 (2026-10-20)

- `npm.cmd install`: 160 paquetes, 0 vulnerabilidades, sin conflictos de peers.
- `npm.cmd run lint`: sin errores.
- `npm.cmd run format:check`: pasa (se aplicó `format` una vez para `src/index.css`).
- `npm.cmd run build`: compila con Vite 8.3.4.
- `git diff -- docs`: vacío; `docs/` intacto.

## Verificación del paso 3 (2026-10-20)

- `.npmrc` con `save-exact=true` y `engine-strict=true`; todas las versiones quedan exactas (sin `^`).
- `npm.cmd install`: 502 paquetes; `npm audit` reporta 7 vulnerabilidades altas, todas de herramientas de build de `shadcn` (ver `DECISIONES.md`).
- `npm.cmd run format`: aplicado (shadcn genera el CSS con comillas dobles y el botón sin el estilo del proyecto).
- `npm.cmd run build`: compila (CSS 20.54 kB, JS 219.80 kB).
- `npm.cmd run lint`: 0 errores y 1 aviso (`react-refresh/only-export-components` en el `button.tsx` generado, por exportar `buttonVariants`). No se desactiva la regla: no es un fallo.
- `npm.cmd run format:check`: pasa.
- `git diff -- docs`: vacío; `docs/` intacto.
- Ensayo previo en carpeta temporal (fuera del repo) validado y borrado.

## Decisiones recientes

- Tailwind CSS 4.3.3 con `@tailwindcss/vite` 4.3.3 (sin `tailwind.config.js`).
- `shadcn init --base radix --preset nova`: preset obligatorio en modo no interactivo; se quitó Geist (fuentes en el paso 5).
- Alias de shadcn apuntando a `@/compartido/*`; no existen `src/lib`, `src/components` ni `src/hooks`.
- `cn` 0.5.0 y `shadcn` 4.22.1 quedan en `dependencies`, como los instala el CLI.
- `prettier-plugin-tailwindcss` 0.8.1 con `tailwindStylesheet: ./src/index.css`.
- Detalle completo en `DECISIONES.md`.

## Preguntas abiertas

- Node local 24.21.0: cumple el rango; 24.22.0 es el parche más reciente de la LTS.
- Confirmar estilo de Prettier si se quiere otro distinto al propuesto (comillas simples, punto y coma, ancho 100).
- En el paso 4 hay que sustituir el tema temporal del preset (`oklch`, `--radius`, sidebar/chart) y el `@custom-variant dark` de clase `.dark` por los tokens de la especificación y `data-theme`.
- Revisar las 7 vulnerabilidades altas de `shadcn` al actualizar esa dependencia.
