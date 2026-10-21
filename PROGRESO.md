# PROGRESO.md — SIGEP CODAINI

## Estado actual

- **Fase:** 0 — Base técnica y tema
- **Paso actual:** 8 de 11 — Página temporal de prueba (botón, tarjeta, badges, tabla y alternador de tema).
- **Fecha:** 2026-10-21
- **Rama:** `chore/fase0-base-tecnica` (creada desde `development`)

## Pasos terminados

| Fecha | Fase | Paso | Commit |
|---|---|---|---|
| 2026-10-20 | 0 | 1. Propuesta de versiones y verificación de compatibilidad (aprobada) | `2d35e5b` |
| 2026-10-20 | 0 | 2. Proyecto Vite + React + TS, TS estricto, ESLint y Prettier | `0b6de05` |
| 2026-10-20 | 0 | 3. Tailwind v4 y shadcn/ui | `9b7b073` |
| 2026-10-20 | 0 | 4. Tokens de la especificación visual y tema con `data-theme` + persistencia | `7f8b494` |
| 2026-10-20 | 0 | 5. Montserrat e Inter; escala tipográfica | `44a3e85` |
| 2026-10-21 | 0 | 6. Estructura de carpetas de `src/` | incluido en este commit |
| 2026-10-21 | 0 | 7. Vitest + Testing Library con prueba de ejemplo | incluido en este commit |

## Pendientes de la Fase 0

1. ✅ Versiones de paquetes y compatibilidad.
2. ✅ Proyecto Vite + React + TS, TS estricto, ESLint y Prettier.
3. ✅ Tailwind v4 y shadcn/ui.
4. ✅ Tokens de la especificación visual (claro/oscuro) y tema con `data-theme` + persistencia.
5. ✅ Montserrat e Inter; escala tipográfica.
6. ✅ Estructura de carpetas de `src/` (con `README`/`.gitkeep` donde haga falta).
7. ✅ Vitest (+ Testing Library) con prueba de ejemplo.
8. ⏳ Página temporal de prueba (botón, tarjeta, badges, tabla, alternador de tema).
9. ⏳ Verificar contraste en ambos temas y anotarlo en `DECISIONES.md`.
10. ⏳ Commit inicial en `main` (.gitignore, README, docs) y rama `development`.
11. ⏳ Crear/actualizar `PROGRESO.md` y `DECISIONES.md`.

## Estado del repositorio

- `main` en `0709f42` (documentos iniciales); `development` en `3f2177b` (actualización del plan).
- `chore/fase0-base-tecnica` en `6a7c25a`, **al día con `origin`**: los pasos 4 y 5 (`7f8b494`, `44a3e85`) y el commit de documentación (`6a7c25a`) ya están publicados.
- `docs/` ya está versionado y **no se debe borrar ni sobrescribir**.
- `AGENTS.md` está versionado (entró en `2d35e5b`).
- Código de aplicación: base mínima, estructura de la sección 4.3 del plan (`src/app/`, `auth/`, `domain/`, `services/`, `data/`, `compartido/` y `paneles/{administrador,supervisor,practicante}/`); `src/compartido/` (`utils.ts` y `ui/button.tsx` de prueba), `src/app/tema/` (tokens, proveedor y alternador) y las fuentes Inter/Montserrat con la escala tipográfica. Vitest + Testing Library configurados con una prueba de ejemplo. Sin módulos de negocio todavía.
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
- `git diff -- docs`: vacío; `docs/` intacto.

## Verificación del paso 5 (2026-10-20)

- `npm.cmd install @fontsource/inter@5.3.0 @fontsource/montserrat@5.3.0`: 2 paquetes; las versiones quedan exactas en `dependencies`.
- `npm.cmd run format`: aplicado.
- `npm.cmd run lint`: 0 errores y el aviso conocido de `react-refresh/only-export-components`.
- `npm.cmd run build`: compila; emite 5 `.woff2` y sus `.woff` de respaldo.
- Comprobado en Edge headless sobre `vite preview`:
  - Cuerpo: Inter, 14 px.
  - H1: Montserrat, 24 px, peso 700; H2: 18 px, peso 600; H3: 16 px, peso 600.
  - Tabla: 13 px con `font-variant-numeric: tabular-nums`.
  - Inter 400/500/600 y Montserrat 600/700 cargadas (`document.fonts.check`).
  - Solo se descargan fuentes locales `/assets/*.woff2`; ninguna petición externa.
  - Radios 6 px (botón) y 10 px (tarjeta) siguen correctos en ambos temas; tema persistente y sin parpadeo.
- `git diff -- docs`: vacío; `docs/` intacto.

## Verificación de los pasos 6 y 7 (2026-10-21)

- Estructura de `src/` según la sección 4.3: se crearon `auth/`, `domain/`, `services/`, `data/` y `paneles/{administrador,supervisor,practicante}/`, todas vacías con `.gitkeep`. No se movieron `app/`, `compartido/`, `App.tsx`, `main.tsx` ni `index.css`.
- Versiones verificadas con `npm.cmd view` y coincidentes con `DECISIONES.md`; instaladas exactas: `vitest` 5.0.5, `jsdom` 30.1.3, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/jest-dom` 7.0.1, `@testing-library/user-event` 14.6.8.
- `npm.cmd install`: 72 paquetes nuevos, 576 auditados; se mantienen las 7 vulnerabilidades altas conocidas de las herramientas de `shadcn` (ninguna de las pruebas llega al navegador).
- `npm.cmd run format` y `format:check`: pasan.
- `npm.cmd run lint`: 0 errores y el aviso conocido de `react-refresh/only-export-components`.
- `npm.cmd run test`: Vitest 5.0.5, 1 archivo y 2 pruebas pasan (tema claro por defecto; cambio a oscuro con persistencia en `localStorage`).
- `npm.cmd run build`: `tsc -b` revisa también `src/vitest.setup.ts` y la prueba; compila (CSS 23.89 kB, JS 260.13 kB).
- `git diff -- docs`: vacío; `docs/` intacto.

## Decisiones recientes

- Tailwind CSS 4.3.3 con `@tailwindcss/vite` 4.3.3 (sin `tailwind.config.js`).
- `shadcn init --base radix --preset nova`: preset obligatorio en modo no interactivo; se quitó Geist (fuentes en el paso 5).
- Alias de shadcn apuntando a `@/compartido/*`; no existen `src/lib`, `src/components` ni `src/hooks`.
- `cn` 0.5.0 y `shadcn` 4.22.1 quedan en `dependencies`, como los instala el CLI.
- `prettier-plugin-tailwindcss` 0.8.1 con `tailwindStylesheet: ./src/index.css`.
- Tokens de la especificación en `:root`/`[data-theme="dark"]`; `@theme inline` los traduce a Tailwind y crea alias para shadcn. Sin `oklch` ni `.dark` en los tokens del tema y sin `--chart-*` (paleta de gráficos pendiente para la Fase 5). La variante `secondary` del botón generado conserva un `color-mix(in oklch, ...)` interno que usa tokens; no se tocó porque el alcance acordado del botón eran solo dos clases.
- Tema inicial claro, clave `sigep-tema` y script inline en `index.html` para evitar el parpadeo.
- Radios 6 px (controles) y 10 px (contenedores); sidebar mapeado a `surface`/`active-bg`.
- Botón generado: solo se ajustaron `hover:bg-primary-hover` y `text-link`; repetir si se regenera.
- Fontsource 5.3.0 para Inter y Montserrat, subconjunto latin y pesos 400/500/600 y 600/700; sin peticiones externas.
- Escala: H1 24/700, H2 18/600, H3 16/600, cuerpo 14, tablas 13 con `tabular-nums`, auxiliar 12. Sin tokens de interlineado porque la especificación no lo define.
- Estructura de la sección 4.3 con `.gitkeep` en las carpetas vacías; `App.tsx`, `main.tsx` e `index.css` se quedan en `src/` hasta la Fase 3 (al moverlos habría que tocar `components.json`, Prettier y `main.tsx`).
- Vitest 5.0.5 + Testing Library con `environment: 'jsdom'`, sin `globals`, setup en `src/vitest.setup.ts` y pruebas colocadas junto al código con sufijo `.test.tsx`.
- Nota visual pendiente: la especificación §6 pide radio de 8 px en el cuadrado del icono de las tarjetas de métricas; se resuelve en la Fase 4 (ver `DECISIONES.md`).
- Detalle completo en `DECISIONES.md`.

## Preguntas abiertas

- Node local 24.21.0: cumple el rango; 24.22.0 es el parche más reciente de la LTS.
- Confirmar estilo de Prettier si se quiere otro distinto al propuesto (comillas simples, punto y coma, ancho 100).
- Contraste de ambos temas: pendiente del paso 9.
- Interlineado: la especificación visual y la propuesta §13 no definen un valor; no se crearon tokens. Confirmar si se quiere fijar uno.
- Radio de 8 px del cuadrado de icono en las tarjetas de métricas (especificación visual §6): los tokens solo tienen 6 y 10 px; se resuelve en la Fase 4.
- Revisar las 7 vulnerabilidades altas de `shadcn` al actualizar esa dependencia.
