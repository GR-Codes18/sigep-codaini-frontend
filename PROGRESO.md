# PROGRESO.md — SIGEP CODAINI

## Estado actual

- **Fase:** 0 — Base técnica y tema
- **Paso actual:** 4 de 11 — Tokens de la especificación visual y tema con `data-theme` (**terminado; pendiente de commit**).
- **Fecha:** 2026-10-20
- **Rama:** `chore/fase0-base-tecnica` (creada desde `development`)

## Pasos terminados

| Fecha | Fase | Paso | Commit |
|---|---|---|---|
| 2026-10-20 | 0 | 1. Propuesta de versiones y verificación de compatibilidad (aprobada) | `2d35e5b` |
| 2026-10-20 | 0 | 2. Proyecto Vite + React + TS, TS estricto, ESLint y Prettier | `0b6de05` |
| 2026-10-20 | 0 | 3. Tailwind v4 y shadcn/ui | `9b7b073` |
| 2026-10-20 | 0 | 4. Tokens de la especificación visual y tema con `data-theme` + persistencia | pendiente de commit |

## Pendientes de la Fase 0

1. ✅ Versiones de paquetes y compatibilidad.
2. ✅ Proyecto Vite + React + TS, TS estricto, ESLint y Prettier.
3. ✅ Tailwind v4 y shadcn/ui.
4. ✅ Tokens de la especificación visual (claro/oscuro) y tema con `data-theme` + persistencia.
5. ⏳ Montserrat e Inter; escala tipográfica.
6. ⏳ Estructura de carpetas de `src/` (con `README`/`.gitkeep` donde haga falta).
7. ⏳ Vitest (+ Testing Library) con prueba de ejemplo.
8. ⏳ Página temporal de prueba (botón, tarjeta, badges, tabla, alternador de tema).
9. ⏳ Verificar contraste en ambos temas y anotarlo en `DECISIONES.md`.
10. ⏳ Commit inicial en `main` (.gitignore, README, docs) y rama `development`.
11. ⏳ Crear/actualizar `PROGRESO.md` y `DECISIONES.md`.

## Estado del repositorio

- `main` en `0709f42` (documentos iniciales); `development` en `3f2177b` (actualización del plan).
- Punto de partida del paso 4: `chore/fase0-base-tecnica` en `9b7b073` (paso 3), al día con `origin/chore/fase0-base-tecnica` y con el árbol limpio.
- `docs/` ya está versionado y **no se debe borrar ni sobrescribir**.
- `AGENTS.md` está versionado (entró en `2d35e5b`).
- Código de aplicación: base mínima, `src/compartido/` (`utils.ts` y `ui/button.tsx` de prueba) y `src/app/tema/` (tokens, proveedor y alternador). Sin módulos de negocio todavía.
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

## Verificación del paso 4 (2026-10-20)

- `npm.cmd run format`: aplicado.
- `npm.cmd run lint`: 0 errores y el aviso conocido de `react-refresh/only-export-components` en `button.tsx`.
- `npm.cmd run build`: compila (CSS 21.12 kB, JS 258.57 kB).
- Comprobado en Edge headless sobre `vite preview`:
  - `lang="es"`; tema claro por defecto.
  - Botón con `border-radius: 6px`; tarjeta con `border-radius: 10px`.
  - Claro: fondo `rgb(247, 249, 252)`, superficie `rgb(255, 255, 255)`.
  - Oscuro: fondo `rgb(15, 20, 27)`, superficie `rgb(24, 30, 39)`.
  - El alternador guarda `dark` en `localStorage` y al recargar `data-theme="dark"` ya está aplicado en `DOMContentLoaded`.
  - Un valor inválido en `localStorage` deja el tema claro sin errores.
- `git diff -- docs`: pendiente de comprobar antes del commit.

## Decisiones recientes

- Tailwind CSS 4.3.3 con `@tailwindcss/vite` 4.3.3 (sin `tailwind.config.js`).
- `shadcn init --base radix --preset nova`: preset obligatorio en modo no interactivo; se quitó Geist (fuentes en el paso 5).
- Alias de shadcn apuntando a `@/compartido/*`; no existen `src/lib`, `src/components` ni `src/hooks`.
- `cn` 0.5.0 y `shadcn` 4.22.1 quedan en `dependencies`, como los instala el CLI.
- `prettier-plugin-tailwindcss` 0.8.1 con `tailwindStylesheet: ./src/index.css`.
- Tokens de la especificación en `:root`/`[data-theme="dark"]`; `@theme inline` los traduce a Tailwind y crea alias para shadcn. Sin `oklch`, sin `.dark`, sin `--chart-*` (paleta de gráficos pendiente para la Fase 5).
- Tema inicial claro, clave `sigep-tema` y script inline en `index.html` para evitar el parpadeo.
- Radios 6 px (controles) y 10 px (contenedores); sidebar mapeado a `surface`/`active-bg`.
- Botón generado: solo se ajustaron `hover:bg-primary-hover` y `text-link`; repetir si se regenera.
- Detalle completo en `DECISIONES.md`.

## Preguntas abiertas

- Node local 24.21.0: cumple el rango; 24.22.0 es el parche más reciente de la LTS.
- Confirmar estilo de Prettier si se quiere otro distinto al propuesto (comillas simples, punto y coma, ancho 100).
- Contraste de ambos temas: pendiente del paso 9.
- Revisar las 7 vulnerabilidades altas de `shadcn` al actualizar esa dependencia.
