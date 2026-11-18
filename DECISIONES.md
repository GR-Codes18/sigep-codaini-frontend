# DECISIONES.md — SIGEP CODAINI

Registro de decisiones técnicas importantes: qué se eligió, qué alternativas había y por qué.
Se actualiza al cerrar cada decisión; no sustituye a `docs/`.

---

## 2026-10-20 — Versiones del stack (Fase 0, paso 1)

### Entorno

- **Node.js:** `engines: "^22.22.2 || ^24.15.0 || >=26"`.
  - Node 20 terminó su soporte el **30 de abril de 2026** (calendario oficial de Node.js; último parche publicado: 20.20.2, 24-mar-2026).
  - Node 24 «Krypton» es LTS: entra en mantenimiento el 20-oct-2026 y recibe soporte hasta el 30-abr-2028. Node 26 será LTS desde el 28-oct-2026.
  - El rango lo impone **jsdom 30**: `^22.22.2 || ^24.15.0 || >=26.0.0`. Es la restricción más estricta del stack (ESLint 10 pide `^22.13.0`; Vitest 5 pide `^22.12 || ^24 || >=26`), así que se adopta el de jsdom para todo el proyecto.
  - Equipo de desarrollo: Node 24.21.0 instalado; cumple el rango (24.22.0 es el parche más reciente de la LTS).
- **npm:** se usa `npm.cmd` porque `npm.ps1` está bloqueado por la política de ejecución de PowerShell en Windows.

### TypeScript y linting

- **TypeScript `6.0.3` exacto**, con **ESLint**.
  - El `latest` del registro es **7.0.2** (compilador nativo), pero **`typescript-eslint` 8.72.0** (último estable) declara peer `typescript >=4.8.4 <6.1.0`; TS 7 no está soportado para lint.
  - La plantilla oficial de **create-vite 9.3.0** (y 9.3.1, la actual) usa **TypeScript ~7.0.2 y `oxlint`**. Se decide no seguir esa plantilla porque el plan exige ESLint; por eso se fija TS 6.0.3.
  - Alternativa descartada: TS 7 + `oxlint` (más rápido, pero incumple el plan y cambia la herramienta acordada).

### Enrutamiento

- **`react-router` 7.18.4** (paquete `react-router`, **no** `react-router-dom`).
  - En v7 los imports se hacen desde `react-router` y `react-router-dom` solo existe por compatibilidad.
  - Se descarta **v8** (jun-2026): exige Node ≥22.22, React ≥19.2.7, Vite ≥7, es ESM-only y eliminó `react-router-dom`. La v7 es madura y suficiente para las rutas por rol de este prototipo.
  - Motivo de usar router: rutas por rol, guardas, enlaces directos y botón «Atrás» del navegador. Alternativa descartada: enrutamiento manual con Zustand (rompe URLs y la navegación del navegador).

### Tipografías

- **Fontsource autoalojado**: `@fontsource/inter` 5.3.0 y `@fontsource/montserrat` 5.3.0.
  - Evita peticiones a Google Fonts, funciona sin conexión y fija versiones reproducibles.
  - Alternativa descartada: `<link>` a Google Fonts (más simple, pero depende de red y de un servicio externo).

### Pruebas

- **Vitest 5.0.5** + **Testing Library** (`@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/jest-dom` 7.0.1, `@testing-library/user-event` 14.6.8) + **jsdom** 30.1.3.
  - Vitest reutiliza la configuración de Vite y permite probar `domain/` y `services/` sin configuración extra.
  - `jsdom` 30 fija el rango de Node del proyecto (`^22.22.2 || ^24.15.0 || >=26`).
  - Alternativa descartada: Jest (duplica configuración de TS/ESM y de build).

### Interfaz

- **Tailwind CSS 4.3.3** con `@tailwindcss/vite` 4.3.3 (configuración en CSS, sin `tailwind.config.js`).
- **shadcn/ui** vía CLI `shadcn` 4.22.1; soporte oficial de React 19 y Tailwind v4.
- `class-variance-authority` 0.7.1, `radix-ui` 1.8.1, `tw-animate-css` 1.4.0, `sonner` 2.0.8, `lucide-react` 1.60.0.
- **Regla:** si `shadcn init/add` intenta instalar versiones distintas a las acordadas, se avisa y se registra aquí antes de fijarlas.

### Estado y datos

- `zustand` 5.0.15 (estado y persistencia), `zod` 4.6.7 (validación), `react-hook-form` 7.90.0 + `@hookform/resolvers` 6.0.0, `date-fns` 4.4.0, `recharts` 3.10.1.

### Fijación de versiones

- Todas las dependencias se fijan **sin `^`** en `package.json`, para que ambas personas trabajen exactamente con lo mismo.
- Antes de cada instalación se verifica la versión con `npm.cmd view <paquete> version` y se comprueba compatibilidad en la documentación oficial.

### Git

- `main` es la versión estable; `development` es la rama de integración. El repositorio ya existía con ambas ramas y `docs/` versionado.
- El trabajo de la Fase 0 se hace en la rama `chore/fase0-base-tecnica`, creada desde `development` (no se trabaja directamente en `development`).
- `docs/` es intocable: nunca se borra ni se sobrescribe.

---

## 2026-10-20 — Configuración del proyecto (Fase 0, paso 2)

### Alias `@/*`

- El alias `@/* → ./src/*` se declara solo con `paths`, **sin `baseUrl`**. Desde TypeScript 4.1 las rutas de `paths` se resuelven relativas al `tsconfig` que las declara; `baseUrl` ya no es necesario y evita una opción obsoleta.
- En Vite el alias se resuelve con `fileURLToPath(new URL('./src', import.meta.url))`, que funciona en ESM sin depender de `__dirname`.

### ESLint y Prettier

- **ESLint 10** con configuración plana (`eslint.config.js`), `typescript-eslint` recomendado, `eslint-plugin-react-hooks` y `eslint-plugin-react-refresh`.
- **Prettier 3.9.10**: comillas simples, punto y coma, ancho 100, `trailingComma: all`, LF. Se ignora `docs/` y los `.md` para no modificar la documentación.
- El plugin `prettier-plugin-tailwindcss` se añadirá en el paso 3, cuando exista el CSS de Tailwind.

### Estructura inicial

- En este paso solo existen `src/main.tsx`, `src/App.tsx`, `src/index.css` y `src/vite-env.d.ts`; la estructura de carpetas por capas se crea en el paso 6.

---

## 2026-10-20 — Tailwind v4 + shadcn/ui (Fase 0, paso 3)

### Versiones fijadas

- **`.npmrc`** con `save-exact=true` y `engine-strict=true`: cualquier `npm install` guarda versiones exactas y falla si el Node local no cumple `engines`, en vez de instalarlo todo con una versión no soportada.
- **`tailwindcss` 4.3.3** + **`@tailwindcss/vite` 4.3.3** (devDependencies). El plugin va en `vite.config.ts` (`plugins: [react(), tailwindcss()]`) y el CSS arranca con `@import 'tailwindcss'`. Sin `tailwind.config.js`: en v4 el tema se declara en CSS.
- **`prettier-plugin-tailwindcss` 0.8.1** con `"tailwindStylesheet": "./src/index.css"`. Es la forma de que el plugin ordene las clases en v4: sin ese campo no sabe leer los tokens del tema.

### Comando de shadcn y preset

- Comando usado: `npx.cmd shadcn@4.22.1 init --base radix --no-monorepo --no-rtl --pointer -y --preset nova`.
- **`--preset` es obligatorio en modo no interactivo.** Sin ese flag, `init` abre un menú de presets (Nova, Vega, Maia, …) y se queda esperando; con la entrada cerrada aborta sin escribir nada. Tampoco sirve precrear `components.json`: el CLI lo detecta, pregunta si se sobrescribe y, si se responde que no, termina con «To start over, remove the components.json file and run init again». Se usó el preset por defecto (**Nova**, `style: radix-nova`, iconos Lucide) y se aceptó su tema.
- **Geist eliminado.** Nova añade `@fontsource-variable/geist`, `@import "@fontsource-variable/geist"` y `--font-sans: 'Geist Variable'`. Se quitaron el paquete, el import y las variables `--font-sans`/`--font-heading`: las tipografías (Montserrat e Inter) entran en el paso 5 con Fontsource. Verificado: ninguna mención a «geist» en `src/*.css`, `package.json`, `package-lock.json` ni `components.json`.
- El resto del tema del preset (variables `oklch`, `--radius`, sidebar y chart) y `@custom-variant dark (&:is(.dark *))` quedan **como relleno temporal**: el paso 4 los sustituye por los tokens de la especificación visual y el tema por `data-theme`. No se usan como base de diseño.

### Alias y estructura

- `components.json` se editó después de `init` porque el CLI siempre escribe los alias por defecto (`@/components`, `@/lib/utils`):

  ```json
  "aliases": {
    "components": "@/compartido",
    "utils": "@/compartido/utils",
    "ui": "@/compartido/ui",
    "lib": "@/compartido",
    "hooks": "@/compartido/hooks"
  }
  ```

- `src/lib/utils.ts` se movió a **`src/compartido/utils.ts`** y se borró `src/lib`. No existen `src/components` ni `src/lib` ni `src/hooks`; así se cumple la estructura de la sección 4.3 del plan (todo lo compartido vive en `compartido/`).
- Verificado con la prueba del botón (`add button`): el componente se creó en `src/compartido/ui/button.tsx` y no en `src/components/ui`. El botón no se usa en ninguna pantalla todavía.

### `cn` y `shadcn` en `dependencies`

- `init` instala **`cn` 0.5.0** (paquete oficial de shadcn, mantenedor `shadcn`, sustituto directo de `clsx` + `tailwind-merge`) y **`shadcn` 4.22.1**, ambos en **`dependencies`**, no en `devDependencies`.
- `cn` va en `dependencies` porque es código que se ejecuta en el navegador: `src/compartido/utils.ts` es `export { cn } from "cn"` y los componentes generados importan `cn` directamente de `"cn"`.
- `shadcn` va en `dependencies` porque `src/index.css` hace `@import "shadcn/tailwind.css"` (utilidades y variantes que usan los componentes). Técnicamente podría moverse a `devDependencies` (Vite lo resuelve al compilar), pero se deja **como lo instala el CLI** para que `shadcn add` y las actualizaciones sigan siendo predecibles.
- Ya no se instalan `clsx` ni `tailwind-merge`: `cn` los sustituye. Tampoco hay `tailwind.config.js`.

### Vulnerabilidades aceptadas (revisar al actualizar shadcn)

- `npm audit` reporta **7 vulnerabilidades altas**: `shadcn` → `@shadcn/registry`, `ts-morph`, `fast-glob` → `micromatch` → `braces` (ReDoS en el emparejamiento de globs). Son **dependencias de las herramientas de línea de comandos** del CLI, no del bundle: no llegan al navegador ni al CSS compilado.
- Se aceptan conscientemente y **no se ejecuta `npm audit fix --force`**, porque forzaría versiones distintas a las acordadas. Se revisan cada vez que se actualice `shadcn`.

### Notas de mantenimiento

- `init` y `add` escriben con su propio estilo (comillas dobles, CSS en líneas largas), así que después de usarlos hay que correr `npm.cmd run format`; si no, `format:check` falla.
- `npm.cmd run lint` deja **1 aviso** (no error) en `src/compartido/ui/button.tsx` por `react-refresh/only-export-components`: el archivo exporta `buttonVariants` además del componente. Es lo normal en los componentes de shadcn; no se toca el archivo generado ni se desactiva la regla.

---

## 2026-10-20 — Tokens y tema claro/oscuro (Fase 0, paso 4)

### Fuente de los valores

- **Especificación visual:** §2 (paleta base y `--primary-hover`, `--active-bg`, `--active-text`, `--focus`), §3 (colores de estado), §5 (radios 6/10), §6 (sidebar) y §8 (bloque CSS de referencia).
- **Propuesta v6:** §13.1 (paleta), §13.2 (estados), §13.4 (radios 6/10 y sidebar) y §14.1 (Tailwind v4 con variables y `data-theme`).
- No se añadió ningún color ni tamaño que no estuviera en esos documentos. Los nombres `--state-*` son solo la forma de nombrar los valores de la tabla de estados; los valores son los de la especificación.

### Arquitectura

- Los tokens viven en `:root, [data-theme="light"]` y `[data-theme="dark"]` dentro de `src/index.css`. El atributo se coloca en `<html>`.
- `@theme inline` traduce esos tokens a utilidades de Tailwind (`bg-bg`, `bg-surface`, `text-text-2`, etc.) y crea **alias para shadcn** (`background`, `foreground`, `card`, `popover`, `muted`, `accent`, `secondary`, `destructive`, `input`, `ring`, `sidebar-*`). Así los componentes de shadcn usan los tokens de SIGEP sin reescribirse.
- Se eliminaron las variables `oklch`, el `--radius: 0.625rem`, los `--chart-*` y la clase `.dark` del preset. También se retiró el `main { max-width: 48rem }` temporal.
- `@custom-variant dark` ahora es `(&:where([data-theme='dark'], [data-theme='dark'] *))`, para que los `dark:` de shadcn respondan al atributo.
- **Radios:** `sm/md/lg = 0.375rem` (6 px) y `xl/2xl/3xl/4xl = 0.625rem` (10 px). Botones, inputs y campos quedan en 6; tarjetas y modales en 10.
- **Sidebar:** `--sidebar` = `surface`, `--sidebar-accent` = `active-bg`, `--sidebar-accent-foreground` = `active-text`, borde = `border`, foco = `focus`.
- **Gráficos:** la especificación no define una paleta de gráficos. No se inventó: `--chart-*` se elimina y la paleta se definirá en la Fase 5 (Reportes), cuando se construya el gráfico por área.
- **Estados:** cinco familias (`neutral`, `info`, `warning`, `success`, `danger`) con `-bg` y `-text`; en oscuro el fondo es el color base al 16 % de opacidad, como indica la especificación. Mapeo: Disponible = neutral, En progreso = info, Esperando supervisión = warning, Terminada = success, Devuelta = danger. Postulaciones y proyectos reutilizan esas familias.

### Tema y persistencia

- **Tema inicial: claro**, por decisión de los autores. No se sigue `prefers-color-scheme`.
- Clave de `localStorage`: `sigep-tema`; valores `light`/`dark`.
- El script clásico inline de `index.html` (en el `<head>`, antes del módulo de React) aplica `data-theme="dark"` y `color-scheme` antes del primer pintado. Si el valor no es `dark` o el almacenamiento falla, se queda en claro.
- `ProveedorTema` toma su estado inicial del `data-theme` ya aplicado por el script, no de `localStorage`, para que el primer render coincida con el DOM.
- `guardarPreferencia` usa `try/catch`: si el navegador bloquea el almacenamiento, el tema sigue funcionando en la sesión.
- No se usa Zustand para el tema: es estado de interfaz pequeño y debe aplicarse antes de React; Zustand se usará para los datos en la Fase 2.

### Botón generado por shadcn

- Se cambiaron solo dos clases de `src/compartido/ui/button.tsx` para respetar la especificación: el hover del botón principal usa `hover:bg-primary-hover` y la variante `link` usa `text-link` (el verde `#58C481` no se usa como texto sobre fondo claro).
- **Si se regenera el botón con `shadcn add`, hay que repetir estos dos cambios.**
- La variante `secondary` del botón generado conserva un `hover:bg-[color-mix(in oklch, var(--secondary), var(--foreground) 5%)]` interno. Usa los tokens del tema y no introduce un color fijo; no se tocó porque los autores limitaron los cambios del botón a las dos clases anteriores.

### Interlineado

- La especificación visual y la propuesta §13 definen tamaños y pesos, pero **no un interlineado**. Para no inventar valores, no se crean tokens de `line-height`; se conserva el interlineado que aportan Tailwind y el navegador.

### Verificación

- `npm.cmd run build` compila; `npm.cmd run lint` solo mantiene el aviso conocido de `button.tsx`.
- Comprobado en Edge headless sobre el build de producción:
  - `lang="es"`, tema claro por defecto.
  - Botón con `border-radius: 6px`; tarjeta con `10px`.
  - Claro: fondo `rgb(247, 249, 252)`, superficie `rgb(255, 255, 255)`, botón `rgb(88, 196, 129)` con texto `rgb(10, 25, 47)`.
  - Oscuro: fondo `rgb(15, 20, 27)`, superficie `rgb(24, 30, 39)`, botón `rgb(88, 196, 129)` con texto `rgb(15, 20, 27)`.
  - Al recargar con `dark` guardado, `data-theme="dark"` ya está aplicado en `DOMContentLoaded` (no se pinta el tema claro primero).
  - Un valor inválido en `localStorage` deja el tema claro sin errores.
- El contraste de ambos temas sigue pendiente para el paso 9.

---

## 2026-10-20 — Tipografía (Fase 0, paso 5)

### Versiones y carga

- **`@fontsource/inter` 5.3.0** y **`@fontsource/montserrat` 5.3.0**, verificados con `npm.cmd view` y coincidentes con la decisión de la Fase 0, paso 1. Quedan fijados sin `^` en `dependencies`.
- Se importan solo los pesos y el subconjunto necesarios:
  - Inter `latin-400`, `latin-500`, `latin-600`.
  - Montserrat `latin-600`, `latin-700`.
- El subconjunto `latin` cubre tildes y ñ. Fontsource declara `font-display: swap` y ofrece `.woff2` con `.woff` de respaldo; el navegador carga solo los `.woff2`. No hay peticiones a Google Fonts y funciona sin conexión.
- Los paquetes variables de Fontsource también están en 5.3.0, pero no se usan: la decisión cerrada era Fontsource no variable.

### Escala

- **H1: 24 px, Montserrat 700** (especificación visual §4; propuesta §13.3).
- **H2: 18 px, Montserrat 600** (especificación visual §4).
- **H3: 16 px, Montserrat 600** (especificación visual §4).
- **Cuerpo: 14 px, Inter 400** (especificación visual §4; propuesta §13.3).
- **Tablas: 13 px, Inter con números tabulares** (especificación visual §4 permite 13–14 px; propuesta §13.3 pide números en columna).
- **Auxiliar: 12 px, Inter 400** (especificación visual §4; nada menor a 12).
- Pesos disponibles: Inter 400/500/600 y Montserrat SemiBold/Bold (especificación visual §4).
- Se crean los tokens `--text-h1`, `--text-h2`, `--text-h3` y `--text-tabla`; el cuerpo usa `text-sm` (14 px de Tailwind) y el auxiliar `text-xs` (12 px).
- `h1`, `h2` y `h3` reciben Montserrat desde la capa base. `strong`/`b` usan 600 para no sintetizar una negrita inexistente. Las tablas usan `font-variant-numeric: tabular-nums`.
- **Interlineado:** la especificación visual y la propuesta §13 no definen un valor de `line-height`. Para no inventarlo, no se crean tokens de interlineado; se conserva el que aporta Tailwind (20 px para el cuerpo de 14 px) y el navegador. Si los autores quieren fijar uno, se decide y se añade como token.

### Verificación

- `npm.cmd run build`: emite 5 `.woff2` (Inter 400/500/600 y Montserrat 600/700), más los `.woff` de respaldo.
- Comprobado en Edge headless sobre el build de producción:
  - Cuerpo: `font-family: Inter`, `font-size: 14px`.
  - H1: `Montserrat`, `24px`, peso 700; H2: `18px`, peso 600; H3: `16px`, peso 600.
  - Tabla: `13px`, `font-variant-numeric: tabular-nums`.
  - `document.fonts.check` confirma Inter 400/500/600 y Montserrat 600/700 cargadas.
  - Los recursos de fuente son todos locales (`/assets/...woff2`), sin dominios externos.
  - El color de enlace es `rgb(20, 128, 78)` en claro y `rgb(127, 217, 163)` en oscuro (`--link`).
- El contraste sigue pendiente para el paso 9.

---

## 2026-10-21 — Estructura de `src/` y pruebas (Fase 0, pasos 6 y 7)

### Estructura

- Se crean las carpetas de la sección 4.3 del plan con `.gitkeep` porque están vacías hasta su fase: `src/auth/`, `src/domain/`, `src/services/`, `src/data/` y `src/paneles/{administrador,supervisor,practicante}/`.
- No se crean subcarpetas hipotéticas dentro de `app/` ni módulos dentro de cada panel: llegan en la Fase 3 y en las Fases 5–7 con los nombres ya acordados.
- `src/app/tema/` y `src/compartido/` no se mueven. `src/App.tsx`, `src/main.tsx` y `src/index.css` se quedan en `src/` hasta la Fase 3: moverlos ahora obligaría a tocar `main.tsx`, la ruta del CSS en `components.json` y `tailwindStylesheet` en `.prettierrc.json`, y ese código se reemplaza al montar el router y el layout.
- Se usa `.gitkeep` en vez de un `README.md` por carpeta para no duplicar la descripción de capas que ya viven en el plan y en este archivo.

### Pruebas

- Versiones verificadas con `npm.cmd view` (coinciden con la decisión del paso 1) e instaladas exactas: `vitest` 5.0.5, `jsdom` 30.1.3, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/jest-dom` 7.0.1 y `@testing-library/user-event` 14.6.8.
- La configuración `test` vive en `vite.config.ts` y usa `defineConfig` de `vitest/config` para que TypeScript conozca la propiedad. `environment: 'jsdom'` e `include` limitado a `src/**/*.{test,spec}.{ts,tsx}`.
- **Sin `globals: true`**: cada prueba importa `describe`, `it`, `expect`, etc. Evita depender de variables globales y de ampliar `types` en el tsconfig.
- `src/vitest.setup.ts` importa `@testing-library/jest-dom/vitest` y registra `afterEach(cleanup)`, que Testing Library no hace sola cuando no hay globals. Se deja dentro de `src/` para que lo revise `tsconfig.app.json` (tiene libs del DOM) sin añadir `DOM` a `tsconfig.node.json`.
- Las pruebas se colocan junto al código con sufijo `.test.tsx` (patrón por defecto de Vitest, sin configuración extra). Si se prefiere español (`.prueba.tsx`), habría que declarar un `include` propio.
- Scripts: `test` ejecuta `vitest run` (una pasada, apta para verificación) y `test:watch` abre el modo interactivo.
- La prueba de ejemplo prueba código real, no un archivo desechable: monta `ProveedorTema` + `AlternadorTema`, limpia `localStorage` y `data-theme` antes de cada caso, y cubre (1) tema claro por defecto y (2) cambio a oscuro con `data-theme`, `color-scheme` y persistencia.

### Pendiente visual: radio de 8 px en tarjetas de métricas

- La especificación visual §6 pide el icono de las tarjetas de métricas en un cuadrado de 32 px con **esquinas de 8 px**, pero §5 solo define radios de 6 px (controles) y 10 px (contenedores). No se inventa un token en la Fase 0 porque esas tarjetas no existen todavía.
- Se resuelve en la **Fase 4**, al construir la tarjeta de métrica: se añade el radio específico que corresponda (8 px) sin cambiar los 6/10 px del resto.

### Verificación

- `npm.cmd run test`: 1 archivo, 2 pruebas, todas pasan.
- `npm.cmd run lint`: 0 errores y el aviso conocido de `button.tsx`; `format:check` pasa.
- `npm.cmd run build`: `tsc -b` revisa el setup y la prueba; compila (CSS 23.89 kB, JS 260.13 kB).
- `npm.cmd install`: 72 paquetes nuevos; `npm audit` mantiene las 7 vulnerabilidades altas de las herramientas de `shadcn` (no llegan al bundle).
- `git diff -- docs`: vacío.

---

## 2026-10-21 — Página temporal y contraste (Fase 0, pasos 8 y 9)

### Página temporal

- Se crea **`src/app/pagina-prueba/PaginaPrueba.tsx`** y `src/App.tsx` solo la renderiza. Para eliminarla al final de la Fase 3: borrar la carpeta `src/app/pagina-prueba/` y sustituir esa línea de `App.tsx` por el layout definitivo.
- Incluye botón primario (el `Button` existente), tarjeta, los 5 badges de tarea con punto del color base, tabla pequeña (cabecera `surface-2`, filas de ~44 px con `py-3`, 13 px) y el `AlternadorTema`.
- Solo usa tokens (`bg-surface`, `text-text-2`, `bg-state-*-bg`, etc.). No se instalaron componentes de shadcn ni dependencias nuevas, y no hay colores escritos a mano.
- La revisión visual la hacen los autores en el navegador (no se usó Edge headless en este paso).

### Ajustes de contraste (valores antes → después)

| Token | Tema claro antes | Tema claro ahora | Tema oscuro |
|---|---|---|---|
| `--link` | `#14804E` | **`#137A4A`** | `#7FD9A3` (sin cambio) |
| `--active-text` | `#14804E` | **`#137A4A`** | `#7FD9A3` (sin cambio) |
| `--state-success-text` | `#14804E` | **`#137A4A`** | `#7FD9A3` (sin cambio) |
| `--danger` | `#D64545` | `#D64545` (sin cambio) | `#D64545` (sin cambio) |
| `--danger-text` | no existía | **`#A12626`** (nuevo) | **`#F59A9A`** (nuevo) |
| alias `--color-destructive` | `var(--danger)` | **`var(--danger-text)`** | `var(--danger-text)` |

**Por qué:**

- `#14804E` no llegaba a 4,5:1 como texto: `link` sobre `surface-2` daba **4,47**, `active-text` sobre `active-bg` **4,48** y el badge Terminada **4,42**. `#137A4A` mantiene el mismo tono y deja **4,83**, **4,84** y **4,78**.
- `#D64545` tampoco llegaba como texto: claro **4,15 / 4,38 / 3,94** y oscuro **4,22 / 3,83 / 3,44** (bg / surface / surface-2). No se cambió el rojo base: se añadió `--danger-text` con dos valores que ya existían en la especificación §3 (`#A12626` claro, `#F59A9A` oscuro). Resultado: **6,69–7,45** en claro y **7,14–8,78** en oscuro.
- El botón destructivo generado por shadcn **usa `destructive` como color de texto** (`text-destructive`), así que el alias `--color-destructive` se apunta a `--danger-text`. Efecto secundario: `bg-destructive/10`, `border-destructive/40` y los anillos de error también derivan de `--danger-text` (siguen siendo el mismo rojo de la familia, algo más oscuro en claro y más claro en oscuro).
- **Regla de uso:** `--danger` (`#D64545`) queda para fondos sólidos, bordes e iconos; para texto rojo se usa `--danger-text` (clase `text-danger-text`). `text-danger` no debe usarse como texto.

### Divergencia con la documentación (resuelta en `56d755a`)

- El código **se apartó a propósito** de la especificación visual §2/§3 y de la propuesta §13: `--link`, `--active-text` y `--state-success-text` en claro pasan de `#14804E` a `#137A4A`, y se añade `--danger-text` (`#A12626` / `#F59A9A`).
- Los autores actualizaron `docs/` en **`56d755a`** (`docs: actualiza especificacion y propuesta con ajustes de contraste`): la especificación visual (§2 paleta, §3 estados y §8 bloque CSS) y la propuesta (§13.1) ya usan `#137A4A` y documentan `--danger-text`. Ya no hay divergencia y `docs/` vuelve a ser la fuente única.
- El agente no tocó `docs/`: el cambio entró por un commit de los autores, respetando la regla de no borrar ni sobrescribir esa carpeta.

### Verificación

- Script WCAG temporal en `%TEMP%` (fuera del repo, borrado después), leyendo los valores reales de `src/index.css` y componiendo las transparencias de `active-bg` (14 %) y de los badges oscuros (16 %) sobre `surface`.
- **42 pares de texto (21 por tema): todos ≥ 4,5:1.** Mínimos: claro `active-text` sobre `active-bg` sobre `bg` **4,61**, badge Terminada **4,78**, `link` sobre `surface-2` **4,83**; oscuro `text-2` sobre `surface-2` **5,93**.
- `--danger` como texto queda entre **3,44 y 4,38**: por eso no se usa como texto.
- `npm.cmd run format` y `format:check`: pasan. `npm.cmd run lint`: 0 errores y el aviso conocido de `button.tsx`. `npm.cmd run test`: 2 pruebas pasan. `npm.cmd run build`: compila (CSS 25,33 kB, JS 261,85 kB).
- `git diff -- docs`: vacío.

---

## 2026-10-21 — README y cierre de la Fase 0 (Fase 0, pasos 10 y 11)

### `README.md`

- Se crea `README.md` en la raíz, en español, con: qué es el prototipo (una línea), requisitos, instalación y ejecución, otros scripts, ubicación de la documentación y flujo de ramas y PR.
- **Dónde se commitea:** en `chore/fase0-base-tecnica`, no en `main`. El paso 10 del plan decía «primer commit en `main` con `.gitignore`, `README.md` y `docs/`», pero `main` (`0709f42`) solo trae `docs/`; el `.gitignore` nació en la rama de trabajo (`0b6de05`) y nunca se commiteó directo en `main`. Como la sección 11 prohíbe trabajar en `main`/`development`, no se recrea ese commit: el README se commitea en la rama y ambos archivos llegan a `main` en el PR de cierre de la Fase 0. Alternativa descartada: commit directo en `main` (rompe la regla y deja la rama estable sin revisión).
- **Alcance:** solo lo que piden el plan y la propuesta. No se añade estructura de `src/` (está en el plan §4.3 y cambia por fases), ni licencia, autores, capturas, badges de CI o URL de despliegue, porque no existen en la documentación del proyecto.
- **Requisitos:** se copia el rango real de `package.json` (`^22.22.2 || ^24.15.0 || >=26`), con la nota de que lo impone `jsdom` 30 y que se recomienda la LTS 24. No se inventa una versión mínima de npm. Se documenta `npm.cmd`/`npx.cmd` en Windows (política de PowerShell, ver paso 1).
- Se listan los cinco comandos pedidos (`install`, `dev`, `test`, `lint`, `build`) y una línea aparte con `preview`, `test:watch`, `format` y `format:check`, que ya existen en `package.json`.

### Estado de la Fase 0

- **Commits registrados:** pasos 8 (`35e9fb7`), 9 (`14a79ea`) y la actualización de `docs/` con los ajustes de contraste (`56d755a`).
- **Repositorio:** `main` `0709f42`, `development` `3f2177b`; `chore/fase0-base-tecnica` en `0d5420d` con **1 commit sin publicar** (`ahead 1`; `origin` en `56d755a`). Se corrige en `PROGRESO.md` la afirmación anterior de que la rama estaba al día con `origin`.
- **Revisión visual** de la página temporal: aprobada por los autores.
- **Criterio de «Listo»:** código, tema, tokens, prueba de ejemplo y contraste cumplidos. Falta comprobar la instalación y ejecución en el equipo de la otra persona y cerrar en Git (PR a `development`, luego `development` → `main` con etiqueta `fase-0-completa`), que requieren el OK de ambos.
- **Commit:** `0d5420d` (`docs: agrega README y cierra la documentación de la Fase 0 (pasos 10 y 11)`), pendiente de publicar en `origin/chore/fase0-base-tecnica` al redactar esto.

### Verificación

- `npm.cmd run format:check`: pasa (Prettier ignora `docs/` y los `.md`). `npm.cmd run lint`: 0 errores y el aviso conocido de `button.tsx`. `npm.cmd run test`: 2 pruebas pasan. `npm.cmd run build`: compila (CSS 25.62 kB, JS 261.85 kB).
- Colores escritos a mano: solo en `src/index.css` (tokens).
- `git diff -- docs`: vacío; solo cambian `README.md`, `PROGRESO.md` y `DECISIONES.md`.

---

## 2026-10-21 — [A] Reparto en paralelo y reglas de convivencia

Con la Fase 0 cerrada (PR #1 a `development`, PR #2 a `main` y etiqueta `fase-0-completa` en
`67e4116`), el trabajo pasa a hacerse entre dos personas a la vez. Estas son las reglas acordadas
para que el paralelismo no genere conflictos ni decisiones duplicadas.

### Reparto

- **Persona A:** Fases 1 y 2 (`domain/`, `data/`, `services/`).
- **Persona B:** Fases 3 y 4 (acceso, layout, componentes de `compartido/`).
- **Desde la Fase 5:** se reparte por panel o por módulo, acordando antes qué componentes de
  `compartido/` toca cada una.

### Ramas y revisión

- Una rama por paso o módulo, creada **desde `development`** (nunca se trabaja en `main` ni en
  `development`).
- Cada rama se integra con un **PR revisado por la otra persona**, con test, lint y build pasando.
- **Dependencias:** quien instale una dependencia lo avisa y hace un **PR pequeño solo para eso**,
  para que la otra persona no reciba instalaciones mezcladas con código.
- **Conflicto en `package-lock.json`:** se toma la versión de `development` y se ejecuta
  `npm.cmd install`; no se resuelve a mano.

### Archivos de seguimiento

- **`PROGRESO.md`:** cada persona escribe **solo en su bloque** (Persona A / Persona B); el bloque
  «Estado general (común)» solo lo edita quien cierra una fase, avisando a la otra persona.
- **`DECISIONES.md`:** solo se **agregan entradas al final**, con fecha y `[A]` o `[B]` en el título;
  las entradas anteriores no se editan.

### Fronteras de código mientras dure el paralelismo

- **Persona B** usa datos de ejemplo propios en `src/app/ejemplos/` hasta que existan los servicios;
  **`src/data/` es de la Persona A**.
- **`main.tsx` y `App.tsx` los toca solo quien monta el router (Persona B)**; la Persona A no los
  modifica.
- **Tipos de `domain/`:** se acuerdan por PR en la rama `feat/fase1-tipos` y **no se cambian sin
  avisar**, porque todo el resto del sistema depende de ellos.

## 2026-10-22 — [A] Fase 1, paso 1: contrato de tipos de `domain/`

Acuerdo entre las dos personas para `src/domain/`: solo tipos, enumeraciones y listas constantes;
cero lógica. Se implementa en `feat/fase1-tipos`.

### Convenciones

- Enumeraciones como arreglo `as const` + tipo derivado (`ESTADOS_TAREA` → `EstadoTarea`).
  Descartado `enum` de TypeScript: `tsconfig.app.json` activa `erasableSyntaxOnly` y
  `verbatimModuleSyntax`.
- `Id = string`, sin *branded types*. `Fecha = string` (`YYYY-MM-DD`), `FechaHora = string`
  (ISO 8601 UTC) y `Hora = string` (`HH:mm`). Descartados `Date` y los números de época por
  persistencia, zona horaria y legibilidad. `crypto.randomUUID()` no vive en `domain/`: lo usan
  `services/` y `data/`; la semilla usa IDs fijos y legibles.
- Sin campos calculados en entidades guardadas (días esperando, veces devuelta, carga, avance,
  indicadores). `Tarea.id` es el identificador interno; `Tarea.numero` es el correlativo por
  proyecto; el ID legible `CODIGO-NNN` se calcula y no se guarda.

### Personas

- `Usuario` es la tabla base; `Practicante` y `Supervisor` son detalles. Descartada la unión
  discriminada. La PK de los detalles es `id_usuario`.
- `Usuario.fecha_alta: FechaHora` no nula, separada de `Practicante.fecha_ingreso`.
- `celular: string` no nulo en `Usuario` para los tres roles; se quita de `Practicante` y
  `Supervisor`. `Postulante` conserva su propio celular. Descartado el detalle `Administrador`
  solo para el celular.
- `Usuario.contrasena` nunca se registra en el historial. `Usuario.estado` es `EstadoUsuario`
  (`ACTIVO | INACTIVO`). `Practicante` no guarda estado: `EstadoPracticante`
  (`ACTIVO | FINALIZADO`) es presentación derivada de `Usuario.estado`.
- `Practicante.discord`, `cuenta_github` y `disponibilidad_horaria` nacen nulos al crear la
  cuenta desde una postulación y se completan en Mi perfil.

### Proyecto, tareas y Pull Requests

- `Proyecto.ultimo_numero_tarea: number` no nulo, inicia en 0 y solo lo escribe la generación de
  IDs (paso 6). Descartado derivar `max(numero) + 1` porque reutilizaría el último número
  eliminado.
- `dia_reunion` y `hora_reunion` son opcionales; «ambos o ninguno» se valida en servicios y Zod,
  no en el tipo.
- `Tarea.estado_pr: EstadoPR | null`. Es `null` hasta la primera llegada a `ESPERANDO_SUPERVISION`
  o `TERMINADA` (ahí pasa a `PENDIENTE`); después se conserva al devolver o reabrir y se oculta
  con una regla de visibilidad (`requiere_pr` y estado de la tarea). Descartado el diseño que lo
  ponía en `null` al devolver o reabrir: perdía el último estado y dejaba un `Pendiente` con
  enlace a un PR fusionado.
- `url_pull_request`, `rama_origen` y `rama_base` son nulos hasta el primer PR y se conservan al
  devolver o reabrir; un PR nuevo los sobrescribe.
- `Asignacion.id_practicante`, `Tarea.id_practicante` y `Proyecto.id_supervisor` contienen un
  `Usuario.id` (comentario en el código).

### Enumeraciones e historial

- Se mantienen las seis del plan (`Rol`, `EstadoTarea`, `EstadoPR`, `EstadoPostulacion`,
  `EstadoProyecto`, `EstadoPracticante`) y se agregan `EstadoUsuario`, `TipoCriterio`,
  `Severidad`, `TipoReglaInsight`, `TipoElemento`, `DiaSemana`, `BloqueCriterio`,
  `TipoAccionHistorial` y `TipoNotificacion`.
- `TipoElemento`: `USUARIO | PROYECTO | TAREA | POSTULANTE | AREA_TECNICA | ESPECIALIDAD |
  CRITERIO_EVALUACION | PARAMETRO_CONFIGURACION`. Toda persona se referencia como `USUARIO` +
  `id_usuario`; descartados `PRACTICANTE` y `SUPERVISOR` como tipos de elemento.
- `ACCIONES_POR_CATEGORIA` es un objeto `as const` con un arreglo por categoría (8 categorías,
  62 acciones) y es la única fuente de `TipoAccionHistorial` y `CategoriaEvento`.
  `CategoriaEvento` no se guarda en `EventoHistorial`: se deriva de la acción. Incluye
  `PROYECTO_ENLACE_EDITADO` (13 acciones de proyectos). Prefijo `PULL_REQUEST_` en historial y
  notificaciones.
- `TipoNotificacion`: 18 valores. `ASIGNADO_A_PROYECTO` y `QUITADO_DE_PROYECTO` cubren a
  practicantes y supervisores. En asignación o quita, `Notificacion.elemento` es el `PROYECTO` y
  la persona va en `id_destinatario`.
- `EventoHistorial`: `autor` es `{ tipo: 'USUARIO'; id_usuario } | { tipo: 'SISTEMA' }`;
  `elemento` lleva `tipo`, `id` y `etiqueta` copiada; `cambios` es `CambioRegistrado[]`;
  `id_proyecto` es opcional, pero obligatorio en eventos de proyecto, tarea y asignación. En
  asignación o quita el elemento es `USUARIO` y el proyecto va en `id_proyecto`.
- `PostulacionEvaluacionDetalle.bloque: BloqueCriterio` (`AREA | ESPECIALIDAD`) se copia al
  evaluar; no se deriva de `id_criterio` porque los criterios se editan.

### Insights y configuración

- Los insights no se guardan. El tipo calculado lleva `tipo_regla`, `severidad`, `titulo`,
  `motivo`, `elemento`, `fecha_deteccion` (`FechaHora`), `revisado` e `ids_proyecto: Id[]` (`[]`
  para postulantes). `fecha_deteccion` es el inicio de la condición por regla; se usa `ahora` en
  carga desbalanceada y en el tramo de 20 puntos de posible atraso. El cálculo es del paso 8.
- `InsightRevision` queda como en §11, sin `metrica_al_revisar`. «Empeora» significa solo aumento
  de severidad, más el plazo de 7 días; se documentará en §5.6.
- `Postulante.cv: ArchivoCV { nombre: string; url: string }`, con PDFs de ejemplo; sin subida
  real.
- `ParametroConfiguracion.valor` y `valor_predeterminado` usan `ValorParametro`
  (`numero | rango | proporcion`). Banda ambigua: `{ tipo: 'rango', minimo: 50, maximo: 69 }`.
  Proporción: `{ tipo: 'proporcion', area: 40, especialidad: 60 }`. El catálogo de claves se fija
  al construir `configuracion.ts`, tras leer §5.8 y la tabla de umbrales de §5.6.

### Archivos

- `src/domain/`: `comunes.ts`, `enumeraciones.ts`, `usuarios.ts`, `proyectos.ts`, `tareas.ts`,
  `postulaciones.ts` (contiene Postulante, catálogos y evaluación; no existe `evaluacion.ts`),
  `historial.ts`, `notificaciones.ts`, `insights.ts`, `configuracion.ts` e `index.ts` (barril).
  Se borra `domain/.gitkeep` al crear los archivos.
- `docs/` no se toca: los cambios de la propuesta v6 los aplican los autores a mano.

### Fechas

- `Tarea.fecha_termino` y `Postulante.fecha_postulacion` son `FechaHora` (no `Fecha`) a
  propósito: desempatan el orden por hora y permiten calcular plazos.
- `Proyecto.fecha_fin_real` es `Fecha`.

---

## 2026-10-28 — [A] Fase 1, paso 2: permisos por rol

La matriz de §4 queda en `src/domain/permisos.ts` como `puede(usuario, accion, contexto)`.
No se toca `enumeraciones.ts` y el barril `index.ts` solo agrega los exports nuevos. El paso se
entrega en dos commits: **2A** (contrato: nombres, ámbitos, contextos y resultado) y **2B**
(lógica de `puede`, ayudantes, fábricas y pruebas).

### Vocabulario y firma

- `ACCIONES_PERMISO` (`as const`) + `AccionPermiso`, en español sin tildes y separados de
  `TipoAccionHistorial`: una acción de permiso no siempre equivale a un evento del historial.
- **55 acciones**: una por fila de §4, divididas cuando cambia el «quién» o el texto exigido.
  Incluye `APROBAR_POSTULACION`, `RECHAZAR_POSTULACION` (motivo) y `RECONSIDERAR_POSTULACION`
  (nota) en lugar de una sola «decidir» (§5.1); la separación de aprobar/devolver; la de
  activar/desactivar «Requiere PR»; crear/editar datos del proyecto; asignar/quitar practicante;
  las cuatro operaciones del ciclo de vida del proyecto; crear supervisor/restablecer contraseña;
  finalizar/reactivar práctica y supervisor; y un campo por acción en los datos propios.
- `AmbitoPermiso` (`PROYECTO | PROPIO | GLOBAL`) y `AMBITO_POR_ACCION` (`as const satisfies
  Record<AccionPermiso, AmbitoPermiso>`): **32 PROYECTO, 7 PROPIO, 16 GLOBAL**. Sirve para las
  pruebas de alcance y para no repetir comprobaciones.
- `ContextoPorAccion[A]` está tipado por acción (tipo mapeado sobre `AccionPermiso`; si falta una
  acción, el proyecto no compila) y trae solo las entidades necesarias: `proyecto`, `tarea`,
  `asignaciones` **del usuario que actúa**, `usuario_objetivo` e `insight`
  (`Pick<Insight, 'ids_proyecto' | 'tipo_regla'>`). La asignación vigente
  (`fecha_baja === null`) se calcula en `domain/`.
- `SolicitudPermiso` es la unión discriminada `{ accion, contexto }` por acción; permite escribir
  la tabla de pruebas sin perder el tipado.
- Resultado: `{ permitido: true; exige_texto: 'MOTIVO' | 'NOTA' | null }` o
  `{ permitido: false; codigo }`.
- Códigos: `USUARIO_INACTIVO`, `ROL_NO_PERMITIDO`, `FUERA_DE_ALCANCE`,
  `NO_ES_EL_RESPONSABLE`, `NO_ES_TU_CUENTA` y `PROYECTO_FINALIZADO`. Ninguno revela si el recurso
  existe: el servicio resuelve la entidad antes de preguntar y devuelve su propio error si no la
  encuentra.

### Orden de comprobación

`puede()` comprueba, en este orden, y se detiene en la primera negativa:

1. `usuario.estado === 'ACTIVO'`; si no, `USUARIO_INACTIVO`.
2. Rol permitido para la acción; si no, `ROL_NO_PERMITIDO`.
3. Alcance (proyecto del supervisor, asignación o insight del practicante); si no,
   `FUERA_DE_ALCANCE`.
4. Identidad (responsable de la tarea o cuenta propia); si no, `NO_ES_EL_RESPONSABLE` o
   `NO_ES_TU_CUENTA`.
5. Proyecto `FINALIZADO` para las 14 acciones que cambian tareas; si no, `PROYECTO_FINALIZADO`.
6. Texto exigido (`'MOTIVO'`, `'NOTA'` o `null`).

**El alcance va siempre antes que la identidad.** Quien está fuera del proyecto recibe
`FUERA_DE_ALCANCE`, nunca `NO_ES_EL_RESPONSABLE`, para no revelar que la tarea existe. Queda
escrito también en la cabecera de `permisos.ts`.

### Alcance de la guarda

- Decide rol, alcance, identidad y usuario ACTIVO. **No** mira el estado de la tarea, la pausa del
  proyecto ni si hay PR: eso llega en los pasos 3 a 5. Por eso el resultado no basta para mostrar
  botones; la interfaz usará las funciones de esos pasos.
- Excepción única: en un proyecto `FINALIZADO` se deniegan las **14** acciones que cambian tareas
  (tabla 1 menos `VER_TAREA`, incluidas las de Pull Request) a los tres roles. Ver, definir
  reunión, gestionar enlaces, cambiar rama base y editar datos del proyecto siguen su fila.
- En un proyecto `FINALIZADO`, `puede()` **no** bloquea asignar o quitar practicantes ni cambiar de
  supervisor: si debe bloquearse, se decide en el paso 10 (ciclo de vida).
- Practicante:
  - `VER_PROYECTO`: asignación vigente **y** proyecto no FINALIZADO.
  - `VER_PRACTICANTES`: mismo criterio que `VER_PROYECTO` (asignación vigente **y** proyecto no
    FINALIZADO), porque §9.2.1 bloquea el acceso al tablero y al equipo cuando el proyecto finaliza.
  - `VER_TAREA`: asignación vigente **y** proyecto no FINALIZADO, **o** ser el responsable de la
    tarea (`tarea.id_practicante === usuario.id`), aunque la asignación tenga baja o el proyecto
    esté FINALIZADO. Siempre en solo lectura (§9.2.2).
  - `VER_RESUMEN_PROYECTO_ANTERIOR`: cualquier asignación a ese proyecto, vigente o con baja.
- `VER_HISTORIAL_GLOBAL` es solo del Administrador (§5.7). Las líneas de tiempo del Supervisor y
  del Practicante forman parte de ver proyecto/tarea/perfil y se resuelven en la Fase 2.
- El código del proyecto solo existe en `CREAR_PROYECTO`; no hay acción para editarlo.
- Datos propios por campo y solo para la propia cuenta: el Administrador no edita datos personales
  de otras personas; la única excepción es el nombre y el correo del supervisor.
- `EDITAR_CREDENCIAL_SUPERVISOR`, `DESACTIVAR_SUPERVISOR`, `REACTIVAR_SUPERVISOR` y
  `CAMBIAR_CONTRASENA_PROPIA` no están en la matriz pero salen de §4 (reglas de acceso), §5.3 y
  §8.2. `FINALIZAR_PRACTICA` exige motivo y `REACTIVAR_PRACTICA` nota (§5.2), aunque la matriz no
  lo diga.
- **Objetivos de persona** (si no coinciden, `FUERA_DE_ALCANCE`): `RESTABLECER_CONTRASENA` solo a
  PRACTICANTE o SUPERVISOR (§8.3); `EDITAR_CREDENCIAL_SUPERVISOR`, `DESACTIVAR_SUPERVISOR` y
  `REACTIVAR_SUPERVISOR` solo a SUPERVISOR; `FINALIZAR_PRACTICA`, `REACTIVAR_PRACTICA` y
  `EDITAR_DATOS_PRACTICA` solo a PRACTICANTE.
- **`VER_REPORTES` se comprueba por proyecto** (Admin cualquiera, Supervisor el suyo, Practicante
  no). La vista transversal del Supervisor es la unión de los proyectos que ya puede ver; el
  filtro lo aplica la Fase 2.
- Insights: el Supervisor solo actúa si al menos un `id_proyecto` del insight es suyo; con
  `ids_proyecto` vacío, nunca. `NOTIFICAR_DESDE_INSIGHT` es una sola acción: el Administrador
  puede notificar en `PRACTICANTE_INACTIVO` y `SUPERVISION_DEMORADA`; el Supervisor solo en
  `PRACTICANTE_INACTIVO`; otra regla, `ROL_NO_PERMITIDO`. Nombres exactos de
  `TIPOS_REGLA_INSIGHT`. Qué 5 de las 7 reglas ve el Supervisor se decide en el paso 8.
  `MARCAR_INSIGHT_REVISADO` admite una nota **opcional** (§5.6): no exige texto.

### Pruebas (paso 2B)

- Tabla dirigida por datos con las 55 acciones × 3 roles (`true`, `'MOTIVO'`, `'NOTA'` o `false`),
  con el `ambito` de cada acción. Los barridos de «supervisor ajeno», «sin asignación» y «con
  baja» se aplican solo a `PROYECTO`; un practicante sin proyecto sí puede editar sus datos y
  cambiar su contraseña.
- Exhaustividad (toda acción tiene fila y ámbito), FINALIZADO con el practicante
  (`VER_PROYECTO` denegado, `VER_TAREA` solo si es el responsable), `INACTIVO`, textos exigidos y
  códigos que no revelan existencia.
- Fábricas en `src/domain/pruebas/fabricas.ts`, importadas solo por los tests.
- Archivos: `src/domain/permisos.ts`, `src/domain/permisos.test.ts`,
  `src/domain/pruebas/fabricas.ts` y `src/domain/index.ts`. Sin dependencias nuevas y sin cambios
  en `src/auth` ni `src/App.tsx`.

### Tabla de las 55 acciones

Leyenda: «Sí» en Supervisor dentro de `PROYECTO` implica `proyecto.id_supervisor === usuario.id`
(en insights, al menos un `ids_proyecto` suyo); en Practicante implica asignación vigente, salvo
las excepciones de arriba. El Administrador no tiene comprobación de alcance en las acciones de
proyecto.

| Acción | Ámbito | Admin | Supervisor | Practicante | `exige_texto` |
|---|---|---|---|---|---|
| **Tareas y Pull Requests** | | | | | |
| `CREAR_TAREA` | PROYECTO | Sí | Sí | — | — |
| `EDITAR_DATOS_TAREA` | PROYECTO | Sí | Sí | — | — |
| `TOMAR_TAREA` | PROYECTO | — | — | Sí | — |
| `LIBERAR_TAREA` | PROYECTO | Sí | Sí | Sí (responsable) | `MOTIVO` (Admin/Sup); — (Prac) |
| `ENVIAR_TAREA` | PROYECTO | — | — | Sí (responsable) | — |
| `APROBAR_TAREA` | PROYECTO | — | Sí | — | — |
| `DEVOLVER_TAREA` | PROYECTO | — | Sí | — | `NOTA` |
| `REABRIR_TAREA` | PROYECTO | Sí | Sí | — | `NOTA` |
| `ELIMINAR_TAREA` | PROYECTO | Sí | Sí | — | `MOTIVO` |
| `CAMBIAR_REQUIERE_SUPERVISION` | PROYECTO | Sí | Sí | — | — |
| `ACTIVAR_REQUIERE_PR` | PROYECTO | Sí | Sí | — | — |
| `DESACTIVAR_REQUIERE_PR` | PROYECTO | Sí | Sí | Sí (responsable) | — (Admin/Sup); `MOTIVO` (Prac) |
| `CREAR_PULL_REQUEST` | PROYECTO | — | — | Sí (responsable) | — |
| `CERRAR_PULL_REQUEST` | PROYECTO | Sí | Sí | Sí (responsable) | `MOTIVO` |
| `VER_TAREA` | PROYECTO | Sí | Sí | Sí (regla de arriba) | — |
| **Proyectos y equipo** | | | | | |
| `CREAR_PROYECTO` | GLOBAL | Sí | — | — | — |
| `EDITAR_DATOS_PROYECTO` | PROYECTO | Sí | — | — | — |
| `CAMBIAR_RAMA_BASE` | PROYECTO | Sí | Sí | — | — |
| `DEFINIR_REUNION` | PROYECTO | Sí | Sí | — | — |
| `GESTIONAR_ENLACES` | PROYECTO | Sí | Sí | — | — |
| `CAMBIAR_SUPERVISOR` | PROYECTO | Sí | — | — | — |
| `ASIGNAR_PRACTICANTE` | PROYECTO | Sí | — | — | — |
| `QUITAR_PRACTICANTE` | PROYECTO | Sí | — | — | — |
| `PAUSAR_PROYECTO` | PROYECTO | Sí | — | — | `NOTA` |
| `REANUDAR_PROYECTO` | PROYECTO | Sí | — | — | `NOTA` |
| `FINALIZAR_PROYECTO` | PROYECTO | Sí | — | — | `NOTA` |
| `REACTIVAR_PROYECTO` | PROYECTO | Sí | — | — | `NOTA` |
| `VER_PROYECTO` | PROYECTO | Sí | Sí | Sí (vigente y no finalizado) | — |
| `VER_RESUMEN_PROYECTO_ANTERIOR` | PROYECTO | Sí | Sí | Sí (cualquier asignación) | — |
| `VER_PRACTICANTES` | PROYECTO | Sí | Sí | Sí (vigente y no finalizado) | — |
| **Personas y cuentas** | | | | | |
| `APROBAR_POSTULACION` | GLOBAL | Sí | — | — | — |
| `RECHAZAR_POSTULACION` | GLOBAL | Sí | — | — | `MOTIVO` |
| `RECONSIDERAR_POSTULACION` | GLOBAL | Sí | — | — | `NOTA` |
| `GESTIONAR_CRITERIOS_EVALUACION` | GLOBAL | Sí | — | — | — |
| `CREAR_SUPERVISOR` | GLOBAL | Sí | — | — | — |
| `RESTABLECER_CONTRASENA` | GLOBAL | Sí | — | — | — |
| `FINALIZAR_PRACTICA` | GLOBAL | Sí | — | — | `MOTIVO` |
| `REACTIVAR_PRACTICA` | GLOBAL | Sí | — | — | `NOTA` |
| `EDITAR_DATOS_PRACTICA` | GLOBAL | Sí | — | — | — |
| `EDITAR_NOMBRE_PROPIO` | PROPIO | Sí | — | Sí | — |
| `EDITAR_CORREO_PROPIO` | PROPIO | Sí | — | Sí | — |
| `EDITAR_CELULAR_PROPIO` | PROPIO | Sí | Sí | Sí | — |
| `EDITAR_DISCORD_PROPIO` | PROPIO | — | Sí | Sí | — |
| `EDITAR_GITHUB_PROPIO` | PROPIO | — | Sí | Sí | — |
| `EDITAR_DISPONIBILIDAD_PROPIA` | PROPIO | — | — | Sí | — |
| `EDITAR_CREDENCIAL_SUPERVISOR` | GLOBAL | Sí | — | — | — |
| `DESACTIVAR_SUPERVISOR` | GLOBAL | Sí | — | — | — |
| `REACTIVAR_SUPERVISOR` | GLOBAL | Sí | — | — | — |
| `CAMBIAR_CONTRASENA_PROPIA` | PROPIO | Sí | Sí | Sí | — |
| **Seguimiento y sistema** | | | | | |
| `VER_REPORTES` | PROYECTO | Sí | Sí | — | — |
| `MARCAR_INSIGHT_REVISADO` | PROYECTO | Sí | Sí (algún `ids_proyecto` suyo) | — | — |
| `NOTIFICAR_DESDE_INSIGHT` | PROYECTO | Sí (2 reglas) | Sí (1 regla) | — | — |
| `VER_HISTORIAL_GLOBAL` | GLOBAL | Sí | — | — | — |
| `GESTIONAR_CONFIGURACION` | GLOBAL | Sí | — | — | — |
| `RESTABLECER_DATOS_DEMOSTRACION` | GLOBAL | Sí | — | — | — |

**Totales:** 55 acciones; 32 de ámbito `PROYECTO`, 7 `PROPIO` y 16 `GLOBAL`; 14 exigen texto
(6 `MOTIVO` y 8 `NOTA`; `LIBERAR_TAREA` y `DESACTIVAR_REQUIERE_PR` solo cuando las ejecuta el rol
indicado).

## 2026-10-30 — [A] Fase 1, paso 2B: implementación de `puede()`

### Orden y estructura

- `puede()` es el único lugar donde vive el orden: `ACTIVO` → rol (`REGLAS_POR_ACCION`, un `Record`
  total sobre las 55) → alcance → identidad → `FINALIZADO` → texto. Delega en tres funciones
  privadas (`comprobarAlcance`, `comprobarIdentidad` y `finalizadoBloquea`) que reciben
  `SolicitudPermiso`, de modo que cada `switch` estrecha `contexto` sin conversiones por caso.
- `accion` y `contexto` llegan como parámetros independientes y TypeScript no los correlaciona: se
  unen una sola vez con `as SolicitudPermiso` en la frontera de `puede()`. No hay otro `as` ni
  `as any`, `ts-ignore` o `ts-expect-error` en el paso.
- Ayudantes privados: `tieneAsignacionVigente` (exige `id_proyecto`, `id_practicante` y
  `fecha_baja === null`), `esResponsable`, `proyectoEsDelSupervisor` e `insightEnAlcance`.
- `AccionQueCambiaTarea` se deriva de una lista privada de 14 y `finalizadoBloquea` lee
  `contexto.proyecto` sobre un `Extract<SolicitudPermiso, …>`: si una de las 14 no trae `proyecto`,
  el proyecto no compila. La lista no se exporta.

### D1 — `ContextoInsight` gana `proyectos` (cambio de contrato del 2A)

- `ContextoInsight` pasa a `{ insight: Pick<Insight, 'ids_proyecto' | 'tipo_regla'>; proyectos:
  Pick<Proyecto, 'id' | 'id_supervisor'>[] }`, con los proyectos del usuario que actúa.
- Sin esa lista, `domain/` no puede comprobar la regla «al menos un proyecto del insight es suyo»:
  el Supervisor exige que algún proyecto de `proyectos` esté en `insight.ids_proyecto` **y** tenga
  `id_supervisor === usuario.id`. Con `ids_proyecto` vacío nunca hay alcance.
- Es un cambio de contrato del paso 2A dentro del mismo PR: la Persona B debe revisarlo antes de
  fusionar. El servicio que arma el contexto resuelve la lista; `puede()` no consulta el almacén.

### D2 — `FUERA_DE_ALCANCE` para el practicante en proyecto FINALIZADO

- `VER_PROYECTO`, `VER_PRACTICANTES` y `VER_TAREA` de un practicante exigen «asignación vigente y
  proyecto no FINALIZADO». Si el proyecto está FINALIZADO, la respuesta es `FUERA_DE_ALCANCE`, no
  `PROYECTO_FINALIZADO`: es una regla de alcance.
- `PROYECTO_FINALIZADO` queda reservado a las 14 acciones que cambian tareas (§6.8). **La interfaz
  no debe usar ese código para mostrar «proyecto finalizado»**: ese texto sale del estado del
  proyecto. Queda documentado en la cabecera de `permisos.ts`.
- Excepciones que se conservan: `VER_RESUMEN_PROYECTO_ANTERIOR` acepta cualquier asignación (con o
  sin baja) y `VER_TAREA` permite al responsable aunque el proyecto esté FINALIZADO o su asignación
  tenga baja.

### D3 — `NOTIFICAR_DESDE_INSIGHT`: la regla va antes del alcance

- Si la regla del insight no aplica al rol, responde `ROL_NO_PERMITIDO` antes de comprobar el
  alcance: es una condición de rol. Administrador en `PRACTICANTE_INACTIVO` y
  `SUPERVISION_DEMORADA`; Supervisor solo en `PRACTICANTE_INACTIVO`; otra regla,
  `ROL_NO_PERMITIDO`.
- La tabla se tipa con `TipoReglaInsight`, no con cadenas sueltas.

### D4 — Contexto incoherente y pruebas

- `comprobarAlcance` empieza comprobando `tarea.id_proyecto === proyecto.id`; si no coincide, deniega
  con `FUERA_DE_ALCANCE` incluso al Administrador. Un contexto incoherente nunca concede acceso.
- Pruebas: matriz de 55 × 3 transcrita a mano de §4 y de la tabla de arriba (con un comentario por
  fila), ámbito por acción, textos (6 `MOTIVO` + 8 `NOTA`), barridos de alcance (`AJENO`,
  `SIN_ASIGNACION`, `CON_BAJA`, `OTRO_PROYECTO`), FINALIZADO solo en las 14 y solo en celdas
  permitidas, `INACTIVO` en 55 × 3, objetivos de persona, identidad, orden de comprobación,
  insights, opacidad, frontera del paso y los 6 códigos con al menos una aserción.
- Fábricas en `src/domain/pruebas/fabricas.ts` (solo las importan los tests), con
  `contextoPara(accion, usuario, variante, cambiosDelProyecto)` tipado por un tipo mapeado: si falta
  una acción, no compila.
- Verificación: `npm run test` con 62 pruebas en verde; `tsc -b` y `build` OK; `eslint src/domain` y
  `prettier --check src/domain` limpios. `npm run lint` sigue fallando en
  `src/auth/iniciarSesion.ts` y `format:check` en `src/App.tsx`, ambos de la Persona B y fuera de
  este paso.

## 2026-11-06 — [A] Fase 1, paso 3: transiciones de tarea

### API y composición

- `src/domain/transiciones.ts` es la única fuente de las 7 transiciones de §6.2. El catálogo
  `TRANSICIONES_TAREA` declara `desde`, `hacia` y la `accion` de permiso de §4; no incluye el
  evento de historial (eso es Fase 2).
- `puedeTransicionar(tarea, usuario, contexto, transicion, texto?)` comprueba en este orden:
  `puede()` → estado → condición → texto. `puede()` va primero para conservar sus códigos y no
  revelar la pausa del proyecto ni la marca de supervisión a quien no tiene alcance.
- `ContextoTransicion = { proyecto, asignaciones }`. Las `asignaciones` son las del usuario que
  actúa; sin ellas `puede()` no puede comprobar el alcance del practicante. El plan escribía
  `(tarea, usuario, proyecto)`; se amplía con el contexto acordado.
- La capa de transiciones no repite roles, alcance, identidad, usuario activo ni FINALIZADO:
  todo eso vive en `puede()`. Solo añade estado, `EN_PAUSA` para TOMAR y `requiere_supervision`
  para ENVIAR_A_SUPERVISION / MARCAR_TERMINADA.
- `transicionesDisponibles(tarea, usuario, contexto)` filtra el catálogo por el estado actual y
  devuelve `{ transicion, exige_texto }[]` en el orden de §6.2. No tiene ningún `switch` de roles.
- `ENVIAR_TAREA` cubre las dos salidas de EN_PROGRESO porque §4 las agrupa como «Enviar a
  supervisión o marcar como terminada»; la condición de `requiere_supervision` decide cuál aplica.

### Texto obligatorio

- `undefined` en el campo exigido significa «todavía no se escribió»: la transición sigue
  disponible y el resultado devuelve `exige_texto` para que la interfaz abra el modal.
- Vacío o solo espacios = `TEXTO_OBLIGATORIO`.
- La propuesta no define este matiz; se decide aquí como regla mínima para que la interfaz y el
  servicio usen la misma función. El paso 2 había dejado el contenido del texto al servicio.
- Con `texto` ausente, `puedeTransicionar` devuelve `permitido: true`, así que un servicio que 
  no pase el texto dejaría pasar un `LIBERAR` de supervisor sin motivo. El servicio debe pasar 
  siempre el texto y rechazar si `exige_texto !== null` y el campo falta o viene vacío.

### Marca «Devuelta con observaciones»

- No se implementa `devolucionVigente` en este paso; la función llega en la Fase 4.
- La marca no se guarda en `Tarea` y no es un estado: se deriva del historial.
- Regla acordada: se apaga solo cuando la tarea vuelve a ESPERANDO_SUPERVISION o a TERMINADA;
  liberar y volver a tomar **no** la apagan (§6.5: el practicante debe saber qué corregir).
- La función de Fase 4 mirará el historial y aplicará esa regla: `TAREA_DEVUELTA` la enciende;
  `TAREA_ENVIADA_A_SUPERVISION` y `TAREA_TERMINADA` la apagan; `TAREA_LIBERADA` y `TAREA_TOMADA`
  no la cambian.

### Pruebas

- Matriz de 7 transiciones × 3 roles escrita a mano desde §6.2, con un comentario por fila.
- Los 7 pares `(desde, hacia)` se comparan contra una lista escrita a mano desde §6.2, no generada
  desde `TRANSICIONES_TAREA`.
- Casos añadidos: usuario sin alcance en una tarea cuyo estado no coincide → `FUERA_DE_ALCANCE`
  (no `TRANSICION_NO_APLICA`); `ENVIAR_A_SUPERVISION` y `MARCAR_TERMINADA` nunca disponibles a la
  vez; proyecto EN_PAUSA solo bloquea TOMAR; FINALIZADO e INACTIVO no dejan ninguna transición;
  motivo/nota vacíos o con espacios → `TEXTO_OBLIGATORIO`.

### Archivos y verificación

- `src/domain/transiciones.ts`, `src/domain/transiciones.test.ts`, `src/domain/index.ts` y
  `src/domain/permisos.ts`.
- En `permisos.ts` el único cambio fue `type TextoExigido` → `export type TextoExigido`; ninguna
  regla, firma ni tabla cambió.
- `src/domain/index.ts` conserva todos los exports anteriores y solo agrega los nuevos.
- Verificación: `npm run test` con 98 pruebas en verde; `tsc -b` y `build` OK; `eslint` de los
  4 archivos limpio; `prettier --check` de los 4 archivos limpio; `git diff -- docs` vacío.
  `npm run lint` global sigue fallando solo por `src/auth/iniciarSesion.ts` (Persona B) y el
aviso conocido de `button.tsx`.

## 2026-11-07 — [A] Fase 1, paso 4: reglas de edición de tarea y de opciones

### API y orden

- `src/domain/edicionTarea.ts` es la única fuente de las reglas de edición. Expone cinco
  funciones: `tuvoPullRequest`, `puedeEditarDatosTarea`, `puedeCambiarRequiereSupervision`,
  `puedeCambiarRequierePR(tarea, usuario, contexto, valor, motivo?)` y
  `puedeEliminarTarea(tarea, usuario, contexto, motivo?)`.
- Se reutiliza `ContextoTransicion` (`proyecto` y `asignaciones` de quien actúa); no se creó un
  `ContextoEdicionTarea` paralelo.
- Orden de comprobación, detenido en la primera negativa: `puede()` → estado →
  `tuvoPullRequest` → texto. **«Requiere PR» es la excepción al estado**: §4 no lo restringe por
  el estado de la tarea, así que solo se miran el PR existente y el motivo.
- `tuvoPullRequest(tarea) = tarea.url_pull_request !== null`. Un PR **CERRADO** cuenta como «ya
  hubo PR»: la URL se conserva al cerrar, devolver o reabrir.
- La condición «aún no hubo PR» se comprueba **para los tres roles**, después de `puede()` y
  antes del texto, sin mirar `usuario.rol` ni `exige_texto`. Por eso un practicante que desactiva
  con PR existente y sin motivo recibe `TAREA_YA_TIENE_PR`, no `TEXTO_OBLIGATORIO`.
- Códigos nuevos: `TAREA_NO_EDITABLE`, `TAREA_YA_TIENE_PR` y `TAREA_NO_ELIMINABLE`. Se reutiliza
  `TEXTO_OBLIGATORIO` de `transiciones.ts` y la misma `validarTexto` (vacío o solo espacios).
- `ResultadoEdicion` añade `avisar_responsable`: solo puede ser `true` al editar los datos de una
  tarea `EN_PROGRESO` con responsable. Las otras tres reglas lo devuelven en `false`.
- Si `valor === tarea.requiere_pr`, `domain/` **no decide**: no compara el valor actual con el
  nuevo. Un cambio que no cambia nada se rechaza en Zod o en el servicio, no aquí.

### Reglas acordadas

- **Editar título, descripción y fecha límite:** solo en `DISPONIBLE` y `EN_PROGRESO`; fuera de
  ahí, `TAREA_NO_EDITABLE` (§6.4). Los tres campos comparten la misma regla, así que la función
  no recibe cuál se edita.
- **«Requiere supervisión»:** solo `DISPONIBLE` y `EN_PROGRESO`; fuera de ahí,
  `TAREA_NO_EDITABLE` (§6.3). No mira el PR ni pide texto.
- **«Requiere PR»:** sin restricción por estado de la tarea, ni siquiera `TERMINADA`. Solo aplican
  «ya hubo PR» y el motivo del practicante. Activar es solo de Administrador y Supervisor; el
  Practicante responsable solo desactiva, con motivo.
- **Eliminar:** solo `DISPONIBLE` y sin PR; fuera de `DISPONIBLE`, `TAREA_NO_ELIMINABLE`; con PR,
  `TAREA_YA_TIENE_PR`. No se lee el historial: la URL es la única prueba de trabajo que necesita
  la regla. El estado se comprueba antes que el PR.

### C1 — «Requiere PR» en una tarea TERMINADA

- Con la regla cerrada, un Administrador o un Supervisor pueden **activar** «Requiere PR» en una
  tarea `ESPERANDO_SUPERVISION` o `TERMINADA` cuyo `url_pull_request` es nulo. Es un **riesgo
  aceptado**: §4 solo condiciona la acción a que no haya PR.
- El paso 4 solo permite la activación; el **paso 5** es quien decide que, si `estado_pr` era
  `null`, pase a `PENDIENTE`. Queda anotado como pendiente del paso 5.
- El aviso al Supervisor cuando el practicante desactiva «Requiere PR» (§7.5/§8.1) es de la
  **Fase 2**, no de este paso.
- Pendiente de la **Fase 4**: la acción «No requiere PR» debe estar visible para el practicante
  responsable ya en `EN_PROGRESO` (hoy `domain/` ya la permite, falta la interfaz).

### Cambio mínimo en `transiciones.ts`

- Se exporta `TEXTO_OBLIGATORIO` y se usa dentro de `CODIGOS_TRANSICION`, y se añade `export` a
  `validarTexto`. **No cambió ninguna lógica**; `textoDe` sigue privado y `ContextoTransicion` se
  reutiliza. Tras ese cambio, las 100 (98 más las 2 del paso 3) pruebas siguieron en verde.
- En `index.ts` se agregan los exports de `edicionTarea.ts` y los dos nuevos de `transiciones.ts`.

### Pruebas y verificación

- `src/domain/edicionTarea.test.ts` con 33 pruebas nuevas: los 4 estados × los 3 campos editables,
  «Requiere supervisión» en los 4 estados, `estado_pr` × URL, practicante con y sin motivo,
  supervisor ajeno, practicante sin asignación / con baja / no responsable, proyecto `FINALIZADO`,
  usuario `INACTIVO`, textos vacíos, C1, eliminación `DISPONIBLE` + `PENDIENTE` + URL nula y el
  orden `puede()` → estado → condición → texto. Dos de ellas (motivo vacío con PR existente, en
  «Requiere PR» y en eliminar) se añadieron tras la prueba de mutación: el orden condición-texto
  no estaba protegido cuando el motivo venía vacío.
- `npm run test`: **133 pruebas en verde** (98 de pasos previos, 2 pendientes del paso 3 y 33
  nuevas). `tsc -b`, `eslint src/domain`, `prettier --check src/domain` y `npm run build` OK.

### Divergencias respecto a la propuesta

- **B2:** el practicante queda sujeto a «aún no hubo PR» al desactivar «Requiere PR». La matriz de
  §4 solo lo escribía para Administrador y Supervisor; se actualizó a mano la celda del
  Practicante.
- **Eliminar tarea:** entra en el paso 4 porque ningún otro paso de `domain/` la cubre. El plan no
  la listaba; se actualizó a mano.

## 2026-11-07 — [B] Fase 3: acceso, rutas, layout y dependencias

- **`@hookform/resolvers` 5.2.2 en lugar de 6.0.0** (la entrada de la Fase 0 queda como estaba; esta la corrige hacia adelante). La 6.0.0 nunca se había instalado y falla con `ERESOLVE`: sus peers opcionales (`effect@^4`, `@typeschema/main`) arrastran `@effect/schema@0.71.4`, que pide `effect@^3`. Se descartaron `--force` y `--legacy-peer-deps` porque instalan un árbol roto u ocultan conflictos futuros. La 5.2.2 solo tiene como peer `react-hook-form@^7.55.0` y usa Standard Schema, así que funciona con Zod 4. Reabrir cuando una 6.x instale sin conflicto.
- **`zod` 4.6.7 declarado en `dependencies`** (antes llegaba solo como transitiva de `shadcn`). También `zustand` 5.0.15, `react-hook-form` 7.90.0, `date-fns` 4.4.0 y `sonner` 2.0.8, todas exactas.
- **`react-router` 7.18.4** sin `react-router-dom`. Se corrigió una instalación errónea que había dejado la 8.5.0 (descartada en la Fase 0).
- **Sesión simulada** en `src/auth/` con Zustand persistido (`sigep-sesion`). Lo guardado se valida con Zod al rehidratar; una sesión corrupta o con rol inventado se descarta y vuelve al login. Cuentas demo con contraseña común `demo12345` y `debe_cambiar_contrasena: false`. Tipos provisionales en `auth/tipos.ts`.
- **Rutas con prefijo por panel** (`/administrador/...`, `/supervisor/...`, `/practicante/...`). `puedeVerRuta` (pura) decide y `GuardaRuta` la consulta. Alternativa descartada: rutas planas (la guarda se complica). La propuesta no define URLs; **pendiente de confirmar con Persona A**.
- **Menús como datos** (`src/app/menus.ts`): un arreglo alimenta sidebar, rutas y migas (9, 5 y 3 módulos).
- **Franja de contraseña temporal** neutra (`surface-2`); no aparece al Administrador (§8.3).
- **Logo provisional** con `bg-white` y `text-neutral-900` (colores a mano, excepción temporal hasta tener el isotipo real).

## 2026-11-07 — [B] Fase 4: componentes compartidos (pasos 1 a 11)

- **shadcn 4.22.1** para `dialog`, `select`, `textarea`, `skeleton` y `sonner`. `sonner.tsx` se adaptó para leer el tema de `useTema()`; se desinstaló `next-themes` (lo había instalado el CLI) para mantener una sola fuente de verdad del tema. Al correr `shadcn add dialog`, responder **N** a sobrescribir `button.tsx` (tiene dos ajustes de tokens).
- **Pestañas, tabla y búsqueda** con `radix-ui` directo, sin pasar por el CLI.
- **Componentes sin reglas de negocio:** `ModalConfirmacion`, `ModalCrearPR`, `FormularioTarea`, `TableroKanban`, `DetalleTarea`, `PerfilUsuario`, etc. reciben datos y callbacks. `DetalleTarea` recibe las `acciones` ya calculadas; sin acciones queda en solo lectura.
- **Radio de 8 px** solo en el icono de `TarjetaMetrica` (`rounded-[8px]`), sin token nuevo.
- **`src/app/ejemplos/` provisional** (acordado con Persona A): `datos.ts`, `accionesProvisionales.ts`, store de notificaciones, `PaginaDesarrollo` (paso 11, ruta `/<panel>/desarrollo`, se elimina al terminar la Fase 7), `PaginaPerfil`. Se reemplazan por `domain/`, `data/` y `services/`.
- **Mi perfil:** Discord y GitHub del Administrador se muestran bloqueados (la propuesta no los lista); revisar si deben ocultarse.
- **Pendientes:** borrar `src/app/pagina-prueba/` (paso 7 de la Fase 3); logo real; `devolucionVigente` (Fase 4, la deja Persona A); revisar el cambio D1 de `ContextoInsight`.
- **Migración a `domain/`:** `accionesProvisionales` → `transicionesDisponibles`. Las fechas de `domain/` son strings ISO y mis componentes usan `Date`; propuesta: convertir en el borde con `parseISO` (a confirmar con Persona A). Tipos provisionales a reemplazar: `TareaTablero`, `TareaDetalle`, `EventoLinea`, `NotificacionItem`, `auth/tipos.ts`.

## 2026-11-07 — [B] Limpieza de rutas y migración del detalle de tarea

- Se eliminó la carpeta vacía `src/app/pagina-prueba/` y se movieron `RaizSegunSesion` y
  `AccesoSiNoHaySesion` a `src/app/RedireccionesSesion.tsx`; `rutas.tsx` solo los importa y
  compone las rutas.
- `accionesDeTarea` reemplaza `accionesProvisionales`: las transiciones visibles vienen de
  `transicionesDisponibles`, y las acciones adicionales de eliminar y crear PR consultan también
  `puede()`. El adaptador convierte el modelo de presentación al tipo `Tarea` del dominio y los
  datos del ejemplo ahora incluyen proyectos, asignaciones e historial tipados.
- `devolucionVigente(idTarea, historial)` deriva la marca del historial de esa tarea: una devolución
  la activa; enviar a supervisión o terminar la apagan; tomar y liberar la conservan. La página de
  desarrollo calcula también la observación vigente desde el evento de devolución.
- Verificación: 176 pruebas pasan; `npm.cmd run build`, ESLint y Prettier para los archivos
  modificados pasan. Vite conserva su aviso de bundle de más de 500 kB. `docs/` no se modificó.

## 2026-11-13 — [A] Auditoría de dependencias (`npm audit`)

### Resultado

- `npm audit` reporta **17 avisos** (1 alto, 14 moderados, 2 bajos). `npm audit --omit=dev` reporta
  **9**, todos de la rama de `shadcn`.
- El número cambia con la base de avisos de npm, no con nuestras instalaciones: antes eran 4 o 7 y
  ahora son 17 sin haber instalado nada nuevo a propósito.

### De dónde salen (verificado con `npm ls`)

- **`shadcn` 4.22.1** (CLI): `@modelcontextprotocol/sdk` → `hono`, `@hono/node-server` y
  `body-parser`; además `@shadcn/registry` → `deepmerge`, y `ts-morph` → `@ts-morph/common` →
  `minimatch`.
- **Herramientas de lint:** `eslint` 10.13.0 y `typescript-eslint` 8.72.0 → `minimatch`.
- Ningún paquete de la aplicación (`react`, `zustand`, `zod`, `react-router`, etc.) aparece en el
  árbol de avisos.

### Por qué se aceptan

- `npm run build` compila y `grep` sobre `dist/` no encuentra `hono`, `body-parser`, `deepmerge` ni
  `ts-morph`: **no llegan al bundle del navegador**. Son código del CLI y del lint que solo corre
  en las máquinas de desarrollo.
- Aparecen en `--omit=dev` porque `shadcn` está en `dependencies`, tal como lo deja el CLI
  (decisión de la Fase 0, paso 3), no porque el navegador los use.

### Qué no se hace

- **No se ejecuta `npm audit fix` ni `npm audit fix --force`.** El segundo instalaría `shadcn`
  1.0.0 y `eslint` 9.39.5, versiones distintas de las acordadas, y el primero modificaría
  `package-lock.json` sin necesidad.

### Cuándo se revisa

- Al actualizar `shadcn`, `eslint` o `typescript-eslint`.
- En la Fase 8, junto con la decisión de mover `shadcn` a `devDependencies` para dejar
  `npm audit --omit=dev` limpio. Alternativa descartada por ahora: moverlo ya, porque `shadcn add`
  deja de ser predecible.


## 2026-11-13 — [A+B] Cambio de OpenCode a Claude Code y de la forma de trabajo

Esta entrada reemplaza el reparto en paralelo de la entrada del 2026-10-21 («Reparto en paralelo y
reglas de convivencia»), que no se edita. Las entradas anteriores que mencionan «Persona A»,
«Persona B» u OpenCode conservan su redacción original.

### Herramienta

- **Claude Code reemplaza a OpenCode** (con modelos gratuitos). Motivo: avanzar más rápido y con menos
  errores. OpenCode queda descartado.
- Se **elimina `AGENTS.md`**, que traía las reglas de OpenCode. La fuente de reglas del agente es ahora
  `CLAUDE.md`, en la raíz. Evita dos archivos de reglas que se contradigan.
- `CLAUDE.md` precisa que el agente debe preguntar, con 2 o 3 opciones y su trade-off, ante las
  preguntas abiertas de los pasos 8 y 10 de la Fase 1 y ante cualquier valor, regla o pantalla que la
  propuesta no defina.

### Forma de trabajo

- **Ya no hay Persona A y Persona B.** Gabo y Roxana trabajan juntos con un solo agente y avanzan una
  sola vez. `PROGRESO.md` queda con un único «Siguiente paso» y una única lista de pendientes.
- **Una sesión por fase, una parada por paso.** Dentro de una fase el agente puede encadenar los pasos,
  pero en cada uno: (1) dice qué entiende y plantea dudas reales; (2) espera el OK; (3) implementa con
  pruebas; (4) corre `test`, `tsc -b`, `eslint`, `prettier --check` y `build`; (5) muestra el diff,
  propone el commit y se detiene. Descartado pedirle «toda la fase de una»: se pierde la revisión.
- **Fase 2:** por su tamaño (11 pasos), se recomienda abrir sesión nueva tras un commit grande;
  `PROGRESO.md` y `DECISIONES.md` son la memoria entre sesiones. Decisión pendiente de los autores.
- **Commits y PR:** los hacen los autores; el agente no hace `commit` ni `push` sin confirmación.
  Ramas `feat/...`, nunca trabajo directo en `main` ni en `development`. Si el PR lo revisa la otra
  persona o basta la revisión conjunta queda pendiente de decidir.
- **Pruebas de mutación** en los pasos con reglas de `domain/`: se rompe una regla a propósito, el test
  debe fallar nombrando la acción y el rol, se restaura y vuelve a pasar. Ya cazó una brecha real en el
  paso 4 (el orden condición-texto con motivo vacío no estaba protegido).
  - **Seguridad de la mutación:** antes de mutar se hace `git add <ruta>`, para que la versión buena
    quede en el índice y `git restore <ruta>` no borre trabajo sin commitear.
- Hashes en `PROGRESO.md` y `DECISIONES.md`: solo del `git log`, y después de que los autores confirmen
  que hicieron el commit.

### Permisos de Claude Code

- Se configura `.claude/settings.json` para que el agente pida confirmación en `git commit`,
  `npm install`, `git restore` y `git checkout`; y para negar `git push`, `git config`,
  `npm audit fix`, `git add .` y la escritura en `docs/`.
- Las reglas `Edit`/`Write` sobre `docs/` bloquean las herramientas de edición, pero no impiden que un
  comando de shell escriba ahí: la verificación real sigue siendo `git diff -- docs` vacío.
- La sintaxis de las reglas está **por verificar** con `/permissions` dentro de Claude Code.

### z ai

- El prototipo visual que generó z ai para el panel del Administrador (otra estructura) **no es la
  base** y se descartó migrarlo. Podría servir solo como referencia visual más adelante, guardado
  **fuera de este repositorio**. Por ahora el foco son las Fases 1 a 4.

## 2026-11-14 — [A+B] Fase 1, paso 5: máquina del estado del PR

### API

- `src/domain/estadoPR.ts` es la única fuente de la tabla de §7.4. `siguienteEstadoPR(tarea, evento)` es
  pura y no recibe usuario: nunca cambia `Tarea.estado`, la URL ni las ramas (las escribe el servicio).
- Eventos (`EventoPR`): `TAREA_ENVIADA_O_TERMINADA` (con `github?`), `PR_CREADO` (`NUEVO`,
  `EXISTENTE_ABIERTO` o `EXISTENTE_FUSIONADO`), `GITHUB_INFORMA` (con `consulta`),
  `PR_CERRADO_DESDE_SISTEMA` y `REQUIERE_PR_CAMBIADO` (con `valor`).
- `domain/` no consulta GitHub: el resultado entra como parámetro (`ConsultaGitHub`: `ABIERTO` con
  `conflictos`, `FUSIONADO` o `CERRADO`). `necesitaConsultaGitHub(tarea)` (`requiere_pr` y URL no nula)
  dice al servicio cuándo debe consultar.
- `etiquetaPRVisible(tarea)` aplica §7.3: solo en `ESPERANDO_SUPERVISION` o `TERMINADA` con `requiere_pr`.
- `puedeCrearPullRequest` y `puedeCerrarPullRequest` reutilizan `ContextoTransicion`, `validarTexto` y
  `TEXTO_OBLIGATORIO`. «No requiere PR» no tiene función nueva: se reutiliza `puedeCambiarRequierePR`
  (paso 4).
- «Llegar» es solo `ENVIAR_A_SUPERVISION` o `MARCAR_TERMINADA`. `APROBAR` no recalcula (S5).

### Las 4 decisiones de los autores

1. **Primera llegada sin «Requiere PR»:** `estado_pr` queda `null` (§7.4 literal). Si luego se activa la
   opción, C1 lo pasa a `PENDIENTE`. Descartado: pasar a `PENDIENTE` siempre (dejaba un valor guardado en
   tareas que nunca pidieron PR).
2. **Forma de la API:** una función con unión de eventos. Descartadas: una función por evento (la tabla
   quedaría repartida) y un parche completo con URL y ramas (mezclaría en `domain/` datos de GitHub y del
   proyecto).
3. **«No requiere PR»:** `estado_pr` se conserva y `etiquetaPRVisible` oculta la etiqueta; solo cambia
   `requiere_pr`. Coherente con la decisión del paso 1 («se conserva y se oculta»).
4. **Crear y cerrar un PR:** solo con la etiqueta visible (tarea `ESPERANDO_SUPERVISION` o `TERMINADA` con
   `requiere_pr`). Tras devolver o reabrir, el PR se corrige en la misma rama y el mismo PR; no se cierra ni
   se crea con la tarea `EN_PROGRESO`.

### C1 resuelto

- `REQUIERE_PR_CAMBIADO` con `valor: true`, tarea en `ESPERANDO_SUPERVISION` o `TERMINADA` y
  `estado_pr === null` → `PENDIENTE`. Activar antes de llegar deja `null` (la llegada lo pasará a
  `PENDIENTE`); activar con un `estado_pr` ya calculado no lo cambia; desactivar nunca lo cambia.

### Supuestos secundarios (S1 a S5)

- **S1:** GitHub no disponible al recalcular no se modela (§7.7 solo prepara el error al crear). El GitHub
  simulado siempre responde al recalcular.
- **S2:** `GITHUB_INFORMA` solo aplica desde `CREADO` o `CON_CONFLICTOS`. Desde `FUSIONADO` (final),
  `CERRADO`, `PENDIENTE` o `null` responde `ESTADO_PR_NO_APLICA`. Aplica aunque la tarea esté `EN_PROGRESO`
  o el proyecto `FINALIZADO` (GitHub manda; §7.1).
- **S3:** un error al crear (rama inexistente, GitHub caído) no es un evento: `domain/` no cambia nada, el
  servicio devuelve el error y la etiqueta sigue en `PENDIENTE` o `CERRADO`.
- **S4:** al recalcular «fusionado → `PENDIENTE`» se conserva la URL anterior (§7.4 y paso 1).
- **S5:** `APROBAR` no recalcula: §7.4 dice «Terminada (sin supervisión)» y la tarea supervisada ya llegó al
  pasar a `ESPERANDO_SUPERVISION`.

### Códigos nuevos

- `TAREA_SIN_ETIQUETA_PR` (estado de la tarea sin etiqueta), `TAREA_NO_REQUIERE_PR`, `ESTADO_PR_NO_APLICA`
  y `FALTA_CONSULTA_GITHUB` (hay URL y el servicio no pasó `github`: error de programación, nunca se
  adivina). Se reutiliza `TEXTO_OBLIGATORIO`. Exportados como `CODIGOS_PR`; los de `puede()` se conservan.
  `FALTA_CONSULTA_GITHUB` solo sale de `siguienteEstadoPR`, no de crear ni cerrar.

### Orden de comprobación (crear y cerrar)

`puede()` → estado de la tarea (`TAREA_SIN_ETIQUETA_PR`) → `requiere_pr` (`TAREA_NO_REQUIERE_PR`) →
`estado_pr` (`ESTADO_PR_NO_APLICA`) → texto (`TEXTO_OBLIGATORIO`, solo al cerrar).

- Crear solo desde `PENDIENTE` o `CERRADO`; cerrar solo desde `CREADO` o `CON_CONFLICTOS`.
- Quien no tiene alcance recibe `FUERA_DE_ALCANCE` sin enterarse del estado del PR. Un PR `FUSIONADO` con
  motivo vacío responde `ESTADO_PR_NO_APLICA`, no `TEXTO_OBLIGATORIO`.
- Cerrar exige `MOTIVO` a los tres roles; crear no exige texto. `PROYECTO_EN_PAUSA` no bloquea ninguna de
  las dos; `PROYECTO_FINALIZADO` sí (viene de `puede()`).

### Aviso para la Fase 4

- Tras recalcular «fusionado → `PENDIENTE`», la tarea queda con `estado_pr === 'PENDIENTE'` y
  `url_pull_request` apuntando al PR **viejo** ya fusionado. Esa URL **no es el PR vigente**: la interfaz no
  debe mostrarla como enlace del PR actual hasta que se cree uno nuevo. La etiqueta sale de
  `etiquetaPRVisible`.

### Pendientes para la Fase 2

- El servicio simula GitHub (ramas de ejemplo, URL ficticia con el formato real, caso de error preparado) y,
  si `necesitaConsultaGitHub(tarea)`, **siempre** pasa `github` en `TAREA_ENVIADA_O_TERMINADA`; sin eso
  recibe `FALTA_CONSULTA_GITHUB` y debe tratarlo como error de programación.
- Escribir en `data/` la URL y las ramas (`rama_base` del proyecto) al crear el PR; `domain/` no lo hace.
- Registrar el evento de historial (`PULL_REQUEST_CREADO`, `PULL_REQUEST_ESTADO_ACTUALIZADO`,
  `PULL_REQUEST_CERRADO_DESDE_EL_SISTEMA`, `PULL_REQUEST_NO_REQUERIDO`) con autor «Sistema» en lo que viene
  de GitHub, y las notificaciones `PULL_REQUEST_CON_CONFLICTOS` y `PULL_REQUEST_CERRADO_POR_OTRA_PERSONA`.
- Comprobar que el servicio de «Requiere PR» llama a `siguienteEstadoPR` con `REQUIERE_PR_CAMBIADO` y guarda
  el resultado (C1).

### Pruebas y verificación

- `src/domain/estadoPR.test.ts`: 43 pruebas. Tabla de §7.4 escrita a mano (evento × 6 valores de
  `estado_pr` × 4 estados de tarea), `ConsultaGitHub` en sus 4 variantes, C1, decisiones 1, 3 y 4, los tres
  roles, alcance, `FINALIZADO`, `INACTIVO` y el orden de comprobación.
- Pruebas de mutación del agente: 11 mutaciones, todas detectadas (C1, recalcular fusionado, cerrar desde
  `FUSIONADO`, crear desde `CREADO`, texto antes que `estado_pr`, visibilidad sin `requiere_pr`, adivinar
  sin consulta, crear o cerrar sin etiqueta, decisiones 1 y 3, y orden estado-de-tarea / `requiere_pr`).
- **Mutaciones repetidas por los autores** con `git add` / `git restore` (procedimiento de `CLAUDE.md`), las
  3 que protegen lo central. Todas fallaron nombrando el caso y volvieron a 254 en verde al restaurar:
  quitar la regla C1 («C1 ESPERANDO_SUPERVISION»: `null` en vez de `PENDIENTE`), recalcular fusionado →
  `FUSIONADO` («fusionado vuelve a PENDIENTE») y validar el texto antes que `estado_pr` («motivo vacío con
  FUSIONADO»: `TEXTO_OBLIGATORIO` en vez de `ESTADO_PR_NO_APLICA`).
- **Corrección de proceso:** el agente hizo sus 11 mutaciones sobre una copia en el scratchpad, en vez de
  `git add` / `git restore` con permiso. No debe repetirse: se usa el procedimiento de `CLAUDE.md` y, si un
  paso pide permiso, se pide.
- `npm run test` con 254 pruebas en verde; `tsc -b`, `eslint src/domain`, `prettier --check src/domain` y
  `build` OK; `git diff -- docs` vacío.
- Divergencias entre el código y la propuesta: las había en §7.4 (aprobar no recalcula, S5), §7.5 (decisión 4)
  y §11 (decisión 1). Los autores las resolvieron a mano en `docs/` el 2026-11-14 (ver más abajo).
- Commit `5aba475` (`feat: agrega la máquina del estado del PR en domain (Fase 1, paso 5)`), fusionado con
  el PR #15 en `3d09766`.

### Cambios a mano en `docs/` (hechos por los autores el 2026-11-14)

- Propuesta §7.4: filas «se aprueba la tarea» (no recalcula, S5) y «se activa Requiere PR…» (C1).
- Propuesta §11 (Tarea): `estado_pr` es nulo hasta la primera llegada **con «Requiere PR» activo**
  (decisión 1).
- Propuesta §7.5: con la decisión 4 no se cierra ni se crea un PR mientras la tarea está devuelta o
  reabierta.
- Plan §11: **revisión conjunta de los PR** (decidido el 2026-11-14, descarta la revisión cruzada), fin de la
  división Persona A / Persona B y flujo de trabajo con un solo agente. `Tu_Rol.md` ya está actualizado.

## 2026-11-14 — [A+B] Fase 1, paso 6: ID legible

### API

- `src/domain/idLegible.ts` es la única fuente del ID `CODIGO-NNN`. Expone `validarCodigoProyecto(codigo,
  codigosExistentes)`, `siguienteNumeroTarea(proyecto)` y `formatearIdLegible(codigo, numero)`, más las
  constantes `CODIGO_PROYECTO_MIN` (3), `CODIGO_PROYECTO_MAX` (5) y `DIGITOS_MINIMOS_NUMERO` (3) y la lista
  `CODIGOS_ID_LEGIBLE` (`CODIGO_PROYECTO_VACIO`, `CARACTERES_INVALIDOS`, `LONGITUD_INVALIDA`,
  `CODIGO_DUPLICADO`, `NUMERO_INVALIDO`, `ULTIMO_NUMERO_INVALIDO`). Todo es puro; no toca `data/` ni
  `services/`.
- Orden de comprobación del código: vacío → caracteres → longitud → duplicado. El formato va siempre antes que
  el duplicado.

### Las decisiones de los autores

- **D1 — Sin tope:** después de 999 el número crece (`PL2D-1000`, `PL2D-12345`). `NNN` significa «mínimo 3
  dígitos». Descartado rechazar el 1000.º intento: la propuesta no define ningún límite de tareas por
  proyecto (§6.6) y habríamos inventado una regla.
- **D2 — Relleno:** `padStart(3, '0')` (`001`, `018`, `099`, `100`). Supuesto, sin alternativa razonable.
- **D3 — Caracteres del código:** solo mayúsculas A-Z y dígitos, de 3 a 5 (`/^[A-Z0-9]{3,5}$/`). `domain/`
  valida y **no convierte ni recorta**: `pl2d` es inválido. Si la pantalla quiere pasar a mayúsculas o recortar
  antes de validar, lo hace ella. Descartado solo mayúsculas (rechazaría `PL2D`, el ejemplo de la propuesta) y
  normalizar a mayúsculas dentro de `domain/` (una conversión que la propuesta no pide).
- **D4 — Unicidad:** `validarCodigoProyecto` recibe `codigosExistentes` por parámetro. La comparación es
  literal (`PL2D` y `pl2d` no coexisten porque el formato solo admite mayúsculas) y los proyectos
  **FINALIZADOS cuentan**: nunca se borran, así que un código nunca se libera. **El servicio arma la lista con
  todos los proyectos**; `domain/` no distingue estados. Descartado dejar la unicidad en el servicio: partía
  la regla entre capas y la dejaba sin prueba en `domain/`.
- **D5 — `domain/` devuelve, no muta:** `siguienteNumeroTarea` devuelve `{ ok, numero,
  ultimo_numero_tarea }` y no modifica el proyecto. El número sale de `ultimo_numero_tarea + 1`, nunca de
  `max(numero) + 1` (reutilizaría el de una tarea eliminada). Rechaza con `ULTIMO_NUMERO_INVALIDO` un
  contador que no sea entero ≥ 0 (negativo, decimal, `NaN`, `Infinity`). `formatearIdLegible` rechaza con
  `NUMERO_INVALIDO` un número que no sea entero ≥ 1, para no producir nunca un ID mal formado; no valida el
  código.
- **D6 — Espacios alrededor:** `' PL2D'`, `'PL2D '` y `'\tPL2D'` dan `CARACTERES_INVALIDOS`. Un texto vacío o
  solo espacios da `CODIGO_PROYECTO_VACIO`; `trim()` se usa solo para elegir ese mensaje, no para recortar el
  valor que se valida.

### Descartado

- **`idLegibleDeTarea(proyecto, tarea)`:** se quitó. Era un atajo sin lógica propia y sin prueba propia; el
  servicio y la interfaz llaman a `formatearIdLegible(proyecto.codigo, tarea.numero)`.

### Pruebas y verificación

- `src/domain/idLegible.test.ts`: 49 pruebas (primer número, número eliminado no reutilizado, no mutación,
  contador inválido, relleno en 1, 18, 99, 100, 999, 1000 y 12345, número inválido, caracteres, bordes de
  longitud 2/3/5/6, espacios alrededor, unicidad con finalizados, comparación literal y orden formato →
  duplicado con códigos mal formados que además están en la lista).
- `npm run test`: **303 pruebas en 27 archivos** en verde; `tsc -b`, `eslint src/domain`,
  `prettier --check src/domain` y `build` OK; `git diff -- docs` vacío.
- **Mutaciones del agente (13), todas detectadas**, hechas con `git add` / `git restore` tras la autorización
  de los autores: `trim()` antes del regex, duplicado antes del formato, sin validar `ultimo_numero_tarea`,
  `ultimo + 1` → `ultimo`, ignorar el contador, mutar el proyecto, `padStart` de 2, tope en 999, longitud
  máxima 6, longitud mínima 2, no consultar `codigosExistentes`, sin validar `numero` y regex con minúsculas.
- **La mutación `max(numero) + 1` se simuló** (`Math.min(ultimo, 3) + 1`): `siguienteNumeroTarea` solo recibe
  el proyecto, no la lista de tareas, así que ese error no se puede escribir en ella. Lo que protege la
  prueba es el contrato: el número sale del contador y no de las tareas que quedan.
- **Mutaciones repetidas por los autores** (las 3 centrales): `ultimo + 1` → `ultimo`, duplicado antes del
  formato y `padStart` de 2. Las tres fallaron nombrando el caso.
- Commit `9177852` (`feat: agrega la generación de ID legible en domain (Fase 1, paso 6)`).

### Pendientes para la Fase 2 y posteriores

- **Guardar en una sola operación:** el servicio de crear tarea escribe `ultimo_numero_tarea` del resultado
  de `siguienteNumeroTarea` y crea la tarea con ese `numero` en la misma operación de `data/`; si falla una,
  no queda la otra. `ultimo_numero_tarea` solo lo escribe esa generación.
- **Código de proyecto:** el servicio de proyectos (Fase 2, paso 9) y el formulario de crear proyecto (Fase
  5.4) deben usar `validarCodigoProyecto`, pasando los códigos de **todos** los proyectos, también los
  finalizados. El servicio de editar proyecto rechaza cualquier cambio del código.
- **Migrar los formateos de ID:** reemplazar los que hay en `src/compartido/` y `src/app/ejemplos/` por
  `formatearIdLegible`, sin tocarlos en este paso.

### Cambios a mano en `docs/` (hechos por los autores el 2026-11-14, commit `fdfeb67`)

- Propuesta §5.4 (Datos del proyecto): el código admite solo mayúsculas A-Z sin tildes y números, y es único
  entre todos los proyectos, también los finalizados.
- Propuesta §5.5 (ID legible): el número lleva al menos tres dígitos y no tiene tope (`PL2D-1000`).
- Propuesta §11: fila Proyecto (`codigo`: mayúsculas A-Z y dígitos, único entre todos los proyectos, no se
  edita) y fila Tarea (`numero` entero desde 1 y sin tope; ID con mínimo 3 dígitos).
- Plan §5 (regla 17): mínimo de 3 dígitos sin tope, mayúsculas y dígitos, finalizados incluidos.
- Plan §9, Fase 1: paso 6 detallado y pruebas obligatorias de IDs ampliadas (bordes del formato, código
  inválido, duplicado, orden formato → duplicado y contador inválido).
- Plan §9, Fase 2: paso 5 (crear tarea usa `siguienteNumeroTarea` y guarda `ultimo_numero_tarea` y `numero` en
  una sola operación) y paso 9 (crear proyecto valida con `validarCodigoProyecto`).
- Plan §9, Fase 5, fila 5.4: código único entre todos los proyectos, de 3 a 5 mayúsculas o dígitos.

### Decisión abierta para la Fase 5.4

- `domain/` no recorta espacios ni pasa a mayúsculas (D3 y D6). Si el formulario de «Nuevo proyecto» debe
  hacerlo antes de validar, se decide en la Fase 5.4 y, entonces, se documenta en la propuesta §5.4 y en la
  fila 5.4 del plan. Hoy no está decidido y no está escrito en `docs/`.

## 2026-11-15 — [A+B] Fase 1, paso 7: puntaje de postulaciones

### API

- `src/domain/puntaje.ts` es la única fuente del cálculo de §5.1 y §10.1: el modelo (simulado en la Fase 2)
  solo juzga cada criterio y el **sistema** suma. `calcularPuntaje(entrada)` recibe `id_area_tecnica` e
  `id_especialidad` del postulante, el catálogo de `criterios`, los `juicios` (`id_criterio`, `cumplido`,
  `observacion`), la `banda` y la `proporcion`.
- Éxito: `puntaje_area`, `puntaje_especialidad`, `puntaje_total`, `requiere_revision_manual`,
  `motivos_revision` y `detalles` (forma de `PostulacionEvaluacionDetalle` sin `id` ni `id_evaluacion`).
  Error: `codigo`, `mensaje` y `bloque` (`AREA`, `ESPECIALIDAD` o `null` si falla un parámetro).
- Códigos (`CODIGOS_PUNTAJE`): `PROPORCION_INVALIDA`, `BANDA_INVALIDA`, `BLOQUE_SIN_CRITERIOS`,
  `PESO_INVALIDO`, `PESOS_NO_SUMAN_100` y `JUICIO_FALTANTE`.
- Tipos `BandaAmbigua` y `ProporcionNota` derivados de `ValorParametro` (sin `tipo`). No cambió ningún tipo
  existente. Fábrica `criterio()` y los IDs `areaTecnica`, `especialidad` y `criterio` agregados a
  `src/domain/pruebas/fabricas.ts`.
- Orden de comprobación: proporción → banda → bloque ÁREA (sin criterios → peso inválido → suma ≠ 100 →
  juicio faltante) → bloque ESPECIALIDAD (igual) → cálculo → marca.

### Las decisiones de los autores (P1 a P7)

- **P1 — Redondeo:** la nota final se redondea al entero más cercano, con las mitades hacia arriba
  (`Math.round`: 86,4 → 86; 69,5 → 70). Se multiplica con enteros y se divide al final,
  `(area% × a + especialidad% × b) / 100`, porque `0.3 × 11 + 0.7 × 66` da 49,4999… en coma flotante y se
  redondearía a 49 en vez de 50. Descartados: guardar 1 decimal (la banda de enteros deja huecos como 69,1–69,9)
  y no redondear en `domain/` (el número guardado, el visible y el comparado podrían diferir).
- **P2 — Banda:** se compara la nota **ya redondeada**, con ambos extremos incluidos (`min ≤ nota ≤ max`):
  49,5 → 50 lleva la marca; 69,5 → 70 no. Con 40/60 la nota nunca termina en ,5; ocurre si el Administrador
  cambia la proporción. Descartados: comparar el valor sin redondear (69,5 fuera aunque sea menor que 70) y un
  intervalo semiabierto (`maximo` con un significado que la pantalla no explica).
- **P3 — Pesos que no suman 100 o bloque sin criterios activos:** error explícito, no se calcula. Pesos
  enteros mayores que 0 (`PESO_INVALIDO` para 0, negativo, decimal o `NaN`). Descartados: normalizar a 100
  (regla inventada que oculta un catálogo mal configurado) y calcular con marca (tercera causa que §5.1 no
  define).
- **P4 — Criterio obligatorio no cumplido:** solo pone la marca; aporta 0 como cualquier criterio no cumplido y
  no anula su bloque. Descartados: bloque en 0 o un tope de nota (reglas inventadas).
- **P5 — Banda y proporción por parámetro, obligatorios.** El servicio pasa los valores vigentes de
  Configuración. Validación defensiva en `domain/`: proporción que suma 100 y banda con mínimo < máximo
  (§5.8). Descartados: leer `CATALOGO_PARAMETROS` (solo es el valor inicial) y parámetros opcionales con ese
  catálogo por defecto (si el servicio los olvida, se usan los iniciales sin aviso).
- **P6 — `domain/` elige los criterios de cada bloque** a partir del catálogo completo: ÁREA = activos del área
  del postulante con `id_especialidad === null`; ESPECIALIDAD = activos de su especialidad. Los inactivos o
  ajenos se ignoran aunque tengan juicio; si a un criterio activo le falta su juicio, `JUICIO_FALTANTE`. Mismo
  criterio que la unicidad del código en el paso 6 (D4): la regla queda entera y probada en `domain/`.
  Descartado: que el servicio entregue los bloques ya separados.
- **P7 — Justificación y motivos:** `domain/` **no genera la justificación** (su formato no está definido; la
  escribe la evaluación simulada de la Fase 2, §10.1). Devuelve `motivos_revision` (`CRITERIO_OBLIGATORIO`,
  `BANDA_AMBIGUA`), que **no se guarda** (`PostulacionEvaluacion` solo tiene el booleano): sirve para que las
  pruebas distingan las dos causas y para preparar la semilla. Si se muestra en pantalla, se decide en la
  Fase 5.1.

### Supuestos

- **Cumplido = peso completo; no cumplido = 0**, sin créditos parciales (§10.1: el modelo solo dice si se
  cumple). El puntaje de un bloque es la suma de los pesos de sus criterios activos cumplidos.
- **Un solo juicio por criterio:** el modelo simulado entrega exactamente uno; los duplicados no se modelan (si
  llegaran, se toma el primero).
- **Pesos, proporción y banda son enteros entre 0 y 100** (los pesos, además, mayores que 0). La propuesta no lo
  dice; todos sus ejemplos usan enteros y así ninguna suma por coma flotante da 99,99 ≠ 100.

### Pruebas y verificación

- `src/domain/puntaje.test.ts`: 46 pruebas. Ejemplo 80/90 → 86, proporción y banda por parámetro, redondeo
  (86,4; 69,5; 49,5), cálculo con enteros (11 y 66 con 30/70 → 50 con marca), bordes 49, 50, 69 y 70 con los
  criterios cumplidos escritos en el nombre, criterio obligatorio en cada bloque, ambos motivos, pesos que no
  suman 100, bloque sin criterios, criterios inactivos y ajenos, peso inválido, juicio faltante, desglose,
  parámetros inválidos, orden de comprobación y no mutación de la entrada.
- La prueba del cálculo con enteros detecta la forma con decimales (`(p/100) × a + …` o `0.3 × a + …`), pero no
  la variante `a × p / 100 + b × q / 100`, que en ese caso también da 49,5 exacto.
- El agente no ejecutó mutaciones: propuso una por prueba y las hacen los autores con `git add` /
  `git restore`.
- `npm run test`: **349 pruebas en 28 archivos** en verde; `tsc -b`, `eslint src/domain`,
  `prettier --check src/domain` y `build` OK; `git diff -- docs` vacío.
- Commit `aeb6ea5` (`feat: agrega el cálculo del puntaje de postulaciones en domain (Fase 1, paso 7)`).

### Pendientes para la Fase 2 y posteriores

- **Evaluación simulada (Fase 2, paso 7):** lee la banda y la proporción **vigentes** de `data/` y las pasa a
  `calcularPuntaje`; genera la justificación; crea `PostulacionEvaluacion` y sus detalles con `id`,
  `id_evaluacion` y `fecha_evaluacion`.
- **Error de `calcularPuntaje`:** decidir qué muestra una postulación si el catálogo está mal configurado y no
  se puede calcular el puntaje.
- **Formularios:** el de criterios (Fase 5.1) exige pesos enteros mayores que 0 que sumen 100 por bloque, y el
  de Configuración (Fase 5.8) exige banda y proporción enteras entre 0 y 100, para que los errores de `domain/`
  no aparezcan en la práctica.

### Divergencias con `docs/`

- Las decisiones de este paso aún no están en la propuesta (§5.1 y §5.8) ni en el plan (§9, Fase 1, paso 7 y
  pruebas de puntaje). Los autores las actualizan a mano en otro commit.

### Cambios a mano en `docs/` (hechos por los autores el 2026-11-15, commit `cec750a`)

- Propuesta §5.1, «Cómo se calcula el puntaje»: al final del párrafo, cumplido = peso completo y no
  cumplido = 0; la nota final se redondea al entero con las mitades hacia arriba (86,4 → 86; 69,5 → 70), y esa
  nota redondeada es la que se compara con la banda.
- Propuesta §5.1, «Reglas», viñeta «Requiere revisión manual»: la banda se compara con la nota redondeada, con
  ambos extremos incluidos; el criterio obligatorio no cumplido solo pone la marca y no anula su bloque.
- Propuesta §5.1, «Reglas», viñeta de los pesos: enteros mayores que 0 que suman 100; si un bloque no tiene
  criterios activos o sus pesos no suman 100, el sistema no calcula el puntaje y devuelve un error.
- Propuesta §5.8, fila de la banda: números enteros entre 0 y 100, mínimo menor que el máximo y ambos extremos
  incluidos en la banda.
- Propuesta §5.8, fila de la proporción: números enteros que deben sumar 100.
- Propuesta §11, fila `PostulacionEvaluacion`: `puntaje_total` es un entero de 0 a 100, redondeado con las
  mitades hacia arriba.
- Plan §9, Fase 1, paso 7: detalle del cálculo (criterios activos por bloque, cumplido = peso completo,
  banda y proporción por parámetro, redondeo, marca), sus errores explícitos y que no genera la justificación.
- Plan §9, «Pruebas obligatorias», viñeta de Puntaje: redondeo y cálculo con enteros, bloque sin criterios
  activos, obligatorio sin anular el bloque, bordes 49, 50, 69 y 70, y banda y proporción por parámetro.

Con esto ya no hay divergencia entre el código y `docs/` para el paso 7.

## 2026-11-15 — [A+B] Fase 1, paso 8: reglas de insights

### API y archivos

- `src/domain/reglasInsights.ts` es la única fuente de las 7 reglas de §5.6. Expone:
  - `insightsParaUsuario(usuario, datos, umbrales, revisiones, ahora)`: es la que usará el servicio.
  - Las piezas, que se prueban por separado: `calcularInsights`, `aplicarRevisiones`,
    `filtrarInsightsPorAlcance`, `ordenarInsights`, `validarUmbrales`, `estaVencida` y `hoyEn`.
  - Las constantes `DESFASE_ZONA_HORARIA_MS`, `DIAS_REAPARICION_INSIGHT` y `CODIGOS_INSIGHTS`
    (`AHORA_INVALIDO`, `UMBRAL_INVALIDO`).
  - Los tipos `UmbralesInsight`, `ClaveUmbralInsight`, `DatosInsights`, `ResultadoInsights` y
    `ErrorUmbral`.
- `src/domain/reglasInsights.test.ts`: 132 pruebas.
- `src/domain/pruebas/fabricas.ts`: fábricas `practicanteDetalle`, `evento`, `postulante` y `revision`.
- `src/domain/index.ts`: exporta lo anterior, `REGLAS_INSIGHT_VISIBLES` e `insightEnAlcance`.
- `src/domain/insights.ts`: solo el comentario de `ids_proyecto` (decisión 28); el tipo no cambia.
- **Commit A** `6f61810` (`fix:`): corrección de permisos (ver «Corrección del paso 2»).
- **Commit B** `e784e4e` (`feat:`): las reglas, las pruebas y `export` de `insightEnAlcance`.
- `npm run test`: 495 pruebas en 29 archivos; `tsc -b`, `eslint src/domain`,
  `prettier --check src/domain` y `build` OK; `git diff -- docs` vacío.
- **Orden de comprobación:**
  1. `ahora`.
  2. Umbrales: cada clave en el orden del catálogo y después las relaciones.
  3. Las 7 reglas, en el orden de `TIPOS_REGLA_INSIGHT`.
  4. Alcance.
  5. Revisiones del usuario.

  Dentro de cada regla: elegibilidad → medición → umbral → severidad.

### Decisiones (1 a 29)

1. **25 % de vencidas sobre el total** de tareas del proyecto. Motivo: la misma base que el avance real y
   estable al final del proyecto.
2. **El Supervisor ve las 5 reglas de §9.1.4** (inactivo, carga, atraso, proyecto sin actividad,
   supervisión demorada). Motivo: lo dice la propuesta y no choca con el plan.
3. **Vencida** = `fecha_limite < hoy` (fechas `YYYY-MM-DD`) y no TERMINADA; incluye
   ESPERANDO_SUPERVISION, y vencer hoy no es estar vencida. Motivo: decisión de los autores.
4. **Bordes:** ≥ en días, puntos y porcentaje; carga máxima > («más de 3»); carga mínima ≤; fin de
   práctica cuando faltan ≤ N días. Motivo: decisión de los autores.
5. **Días completos de 24 h** (`diasCompletos`, con `Math.floor`; 6 d 23 h = 6). Motivo: decisión de los
   autores.
6. **`hoy` sale de `ahora`, cortado en hora de Perú (UTC−5 fijo).** Motivo: Perú no tiene horario de
   verano y `fecha_limite` no tiene hora; cortar en UTC daría «mañana» desde las 19:00.
7. **Una `Fecha` vale como el inicio de ese día en hora de Perú** (`YYYY-MM-DDT05:00:00.000Z`). Motivo:
   así se compara sin ambigüedad con los eventos, que sí tienen hora.
8. **Proyecto sin tareas:** «Posible atraso» no se evalúa. Motivo: no hay nada que medir y nunca se divide
   entre cero.
9. **Actividad del practicante = eventos de los que es autor.** Lo que otro hace sobre él no cuenta.
   Motivo: §5.7.
10. **Actividad del proyecto = todo evento con su `id_proyecto`**, de cualquier autor. Motivo: decisión
    de los autores.
11. **«Proyecto sin actividad»: solo proyectos ACTIVO con al menos una asignación vigente.** Motivo:
    «con equipo» (§5.6).
12. **«Practicante inactivo»: practicante ACTIVO con asignación vigente en un proyecto ACTIVO.** El reloj
    arranca en lo más reciente entre su último evento propio y su asignación vigente más antigua en un
    proyecto ACTIVO. `ids_proyecto` = sus proyectos ACTIVO vigentes. Motivo: decisión de los autores.
13. **No se descuenta el tiempo en pausa.** Motivo: riesgo aceptado (ver abajo).
14. **Con `fecha_fin_prevista <= fecha_inicio` no se evalúa el tramo de avance; el de vencidas sí.**
    Motivo: el tramo de vencidas no depende de las fechas del proyecto.
15. **El último día cuenta:** `d = (fin − inicio) + 1`; `t = min(max(hoy − inicio, 0), d)`. Comparación
    entera: `100·t·n − 100·k·d ≥ P·d·n`. Motivo: decisión de los autores; con enteros no hay error de coma
    flotante.
16. **Carga: un insight por persona**, solo practicantes ACTIVO con asignación vigente en un proyecto
    ACTIVO. El mínimo solo dispara si algún proyecto ACTIVO suyo tiene tareas DISPONIBLE. Motivo: decisión
    de los autores.
17. **En la carga cuentan las EN_PROGRESO de proyectos EN_PAUSA**, e `ids_proyecto` = vigentes ACTIVO y
    EN_PAUSA. Motivo: §6.6 define la carga como todas sus tareas en progreso, el mismo número que muestran
    Practicantes a cargo y Equipo.
18. **Validación de los 10 umbrales con las claves existentes** (sin claves nuevas):
    - días, enteros ≥ 1;
    - cargas, enteros ≥ 0, con la mínima menor que la máxima;
    - puntos y porcentaje, enteros de 1 a 100;
    - el umbral crítico de inactividad mayor que el de atención.

    El error es `UMBRAL_INVALIDO` con la clave. Motivo: decisión de los autores, como la validación
    defensiva del paso 7.
19. **`fecha_deteccion` de «Posible atraso» = `ahora`** en los dos tramos. Motivo: decisión de los autores.
20. **`ahora` llega por parámetro, en ISO 8601 UTC con `Z`**; si no, el resultado es `AHORA_INVALIDO`
    (antes que los umbrales). Motivo: un `ahora` inválido haría desaparecer todos los insights sin aviso.
21. **«Revisado» por usuario.**
    - Solo cuentan las revisiones de `usuario.id`.
    - La identidad del insight es `tipo_regla` + `elemento`, y manda la revisión más reciente por fecha.
    - Vale mientras la severidad no suba y no pasen 7 días completos.
    - El insight revisado sigue en la lista con `revisado: true`.

    Motivo: §5.6 y §11.
22. **Cambio de severidad:**
    - Si sube, reaparece.
    - Si baja, o baja y vuelve a la que tenía al revisarlo, sigue revisado hasta los 7 días.
    - Una revisión nueva reemplaza a la anterior.
    - A los 7 días exactos reaparece.

    Motivo: §5.6 («otros cambios en los datos no lo reactivan»).
23. **Orden:** severidad, luego el más antiguo primero; desempate por el orden de las reglas y el id del
    elemento. Motivo: confirmado por los autores.
24. **`fecha_deteccion` de «inactivo» = referencia + umbral de atención**, también en crítico. Motivo: es
    cuando empezó el problema.
25. **Postulación reconsiderada:** el reloj arranca en su último `POSTULACION_RECONSIDERADA`. Motivo:
    vuelve a estar pendiente desde ahí (§5.1).
26. **Supervisión demorada:** desde el último `TAREA_ENVIADA_A_SUPERVISION`; sin ese evento no dispara;
    vale en ACTIVO y EN_PAUSA. Motivo: §9.1.3.
27. **Proyecto sin eventos:** el reloj arranca en `fecha_inicio`. Motivo: es el único inicio medible.
28. **Fin de práctica:** todo practicante ACTIVO, tenga o no proyecto.
    - `ids_proyecto` = vigentes no finalizados (puede ser `[]`).
    - Termina hoy → INFORMATIVO; desde el día siguiente → CRÍTICO.
    - Con una fecha inválida o sin detalle se omite.

    Motivo: §5.2.
29. **Textos:** `domain/` arma `titulo` y `motivo`, con plural «1 día» / «N días». Motivo: el tipo
    `Insight` ya los tiene.

### Riesgo y consecuencia aceptados

- **Riesgo (decisión 13):** no se descuenta el tiempo en pausa. Un proyecto reanudado puede disparar
  «inactivo» o «atraso» enseguida.
- **Consecuencia:** `ids_proyecto` difiere por regla:
  - inactivo: solo proyectos ACTIVO;
  - carga: ACTIVO y EN_PAUSA;
  - fin de práctica: no finalizados.

  Por eso el Supervisor de un proyecto en pausa ve la carga de un practicante, pero no su inactividad.

### Corrección del paso 2

- `MARCAR_INSIGHT_REVISADO` ahora deniega con `ROL_NO_PERMITIDO` las reglas que el rol no ve, antes del
  alcance. Usa la nueva constante `REGLAS_INSIGHT_VISIBLES` de `permisos.ts`: Administrador 7, Supervisor
  5, Practicante 0.
- Corrige la entrada del 2026-10-28, que solo exigía el alcance: un Supervisor podía marcar un insight de
  «Fin de práctica» de su proyecto aunque no lo ve.
- Se hizo en un commit aparte (A, `6f61810`), con 4 pruebas nuevas. Ninguna expectativa existente cambió.
- El filtro de alcance de los insights usa la misma constante y la misma `insightEnAlcance`. La prueba L-6
  comprueba que ver y marcar coinciden.

### Nota sobre la prueba A-2

- El plan proponía `(3/10 − 1/10) × 100` como ejemplo de error de coma flotante. En JavaScript ese cálculo
  da **20 exacto**, así que **no distingue** la fórmula entera de la decimal.
- El caso válido es 70 % − 50 %: hoy 08-nov, 1 de 2 tareas terminadas. Da `19.999999999999996` en coma
  flotante y `400 = 400` con enteros.
- Fue un error de ese plan, detectado al ejecutar las mutaciones: la de A-2 no hacía fallar la prueba. Se
  corrigió la prueba antes del commit B, y los autores repitieron las mutaciones con resultado correcto.

### Hallazgo H1 (Kanban)

- `src/compartido/TableroKanban.tsx:54` compara un `Date` a la medianoche con `new Date()` (con hora). Una
  tarea que vence hoy sale en rojo desde las 00:00.
- La regla acordada (`estaVencida`) no la cuenta como vencida hasta mañana.
- No se tocó `compartido/` en este paso; queda como pendiente.

### Pendientes para la Fase 2 y posteriores

- El servicio arma `UmbralesInsight` con los valores vigentes de Configuración y pasa `ahora` en ISO UTC
  (`new Date().toISOString()`). Un `ahora` sin `Z` o mal formado da `AHORA_INVALIDO`.
- Los dashboards (5.9 y 6.5) quitan de las alertas los insights con `revisado: true`.
- Marcar como revisado pasa por `puede('MARCAR_INSIGHT_REVISADO', { insight, proyectos })`.
- Los formularios de Configuración (5.8) exigen lo mismo que `validarUmbrales`.
- El Kanban migra a `estaVencida` (H1).

### Divergencias con `docs/` (pendientes; las actualizan los autores a mano)

Todavía **no** están hechas. Son los 5 cambios del plan aprobado:

1. `docs/Propuesta_SIGEP_Codaini_v6.md`, §5.6, nota bajo la tabla de reglas
   («*El avance esperado de un proyecto es…*»). Agregar al final: «La duración incluye el día de fin y el
   tiempo transcurrido cuenta los días completos desde el inicio. Si el proyecto no tiene tareas, la regla
   no se evalúa; si su fecha de fin no es posterior a la de inicio, solo se evalúa el porcentaje de tareas
   vencidas.»
2. `docs/Propuesta_SIGEP_Codaini_v6.md`, §5.6, párrafo «**Fecha de detección.**». Hay dos cambios:
   - Al final del párrafo, agregar: «; en «Posible atraso» y «Carga desbalanceada» siempre es el momento
     del cálculo».
   - Debajo, un párrafo nuevo «**Cómo se mide cada regla.**», con el texto del plan:
     - Los umbrales se cumplen al alcanzarse, salvo la carga máxima.
     - Los días son periodos completos de 24 horas y el día se corta a la medianoche en hora de Perú
       (UTC−5).
     - La actividad propia del practicante solo se evalúa con un proyecto activo vigente.
     - La actividad de un proyecto es cualquier evento suyo, solo si está activo y con equipo.
     - Vencida = fecha límite pasada y no terminada; el porcentaje se calcula sobre el total.
     - El atraso solo se evalúa en proyectos activos.
     - La carga incluye las tareas de proyectos en pausa, y su mínimo exige disponibles en un proyecto
       activo.
     - Una postulación reconsiderada cuenta desde su reconsideración.
     - La supervisión demorada corre desde el último envío y vale también en pausa.
     - «Fin de práctica» se evalúa a todo practicante activo, tenga o no proyecto.
     - El tiempo en pausa no se descuenta.
3. `docs/Propuesta_SIGEP_Codaini_v6.md`, §5.8, nota al pie de la tabla. Agregar al final la validación de
   los umbrales de Seguimiento:
   - días (incluida la anticipación de «Fin de práctica»), enteros desde 1;
   - cargas, enteros desde 0, con la mínima menor que la máxima;
   - puntos y porcentaje, de 1 a 100;
   - el crítico de inactividad, mayor que el de atención.
4. `docs/Propuesta_SIGEP_Codaini_v6.md`, §4, tabla «Seguimiento y sistema», fila «Marcar un insight como
   revisado», columna Supervisor: `Sí (independiente del Administrador)` →
   `Sí, en las cinco reglas que ve (independiente del Administrador)`.
5. `docs/SIGEP_Plan_de_Desarrollo_y_Reglas_del_Agente.md`, §5, regla 12: después de «El Supervisor ve 5 de
   las 7 reglas», agregar: «: practicante inactivo, carga desbalanceada, posible atraso del proyecto,
   proyecto sin actividad y supervisión demorada (no ve «Postulaciones sin decidir» ni «Fin de práctica»,
   y solo marca como revisadas esas 5)».

## 2026-11-15 — [A+B] Fase 1, paso 8: cambios a mano en docs/

Hechos por los autores en el commit `d05e278`:

1. **Propuesta §5.6, nota del avance esperado** (bajo la tabla de reglas): la duración incluye el día de
   fin y los días transcurridos son completos. Sin tareas, la regla no se evalúa; con fin <= inicio, solo
   se evalúa el porcentaje de vencidas.
2. **Propuesta §5.6, «Fecha de detección»:** en «Posible atraso» y «Carga desbalanceada» siempre es el
   momento del cálculo. Además, un párrafo nuevo **«Cómo se mide cada regla»**, con:
   - bordes (≥, salvo la carga máxima);
   - días completos de 24 h, con el día cortado a la medianoche en hora de Perú (UTC−5);
   - actividad del practicante y del proyecto;
   - tarea vencida;
   - carga con los proyectos en pausa;
   - postulación reconsiderada;
   - supervisión demorada también en pausa;
   - fin de práctica aunque no tenga proyecto;
   - el tiempo en pausa no se descuenta.
3. **Propuesta §5.8, nota al pie de la tabla de parámetros:** validación de los umbrales de Seguimiento.
4. **Propuesta §4, tabla «Seguimiento y sistema», fila «Marcar un insight como revisado»:** el Supervisor
   marca solo en las cinco reglas que ve.
5. **Plan §5, regla 12:** nombra las 5 reglas del Supervisor y aclara que solo marca como revisadas esas
   5.

Con esto ya no hay divergencia entre el código y docs/ para el paso 8.

### Decisión pendiente para la Fase 5.9

- La propuesta §5.9 («Alertas» del Dashboard del Administrador) dice «primero los críticos y luego los de
  atención, hasta cinco» e incluye a los practicantes próximos a finalizar. Pero «Fin de práctica» próximo
  es **Informativo**.
- Hay que decidir si los informativos entran en las alertas y en qué orden. No se resuelve ahora ni se
  escribe texto para docs/.

## 2026-11-16 — [A+B] Fase 1, paso 9: indicadores

### API y archivos

- **Commit A** `998987e` (`refactor:`): `src/domain/tiempo.ts` recibe, sin cambiar su lógica, las utilidades
  de tiempo del paso 8: `DESFASE_ZONA_HORARIA_MS`, `MS_POR_DIA`, `diasCompletos`, `hoyEn`, `inicioDelDia`,
  `diasEntreFechas`, `ultimaFecha` y `aFechaHora`. La única función nueva es `esAhoraValido`, que extrae la
  condición que `calcularInsights` ya tenía. `reglasInsights.ts` reexporta `DESFASE_ZONA_HORARIA_MS` y
  `hoyEn`; `index.ts` no cambió y no exporta `./tiempo`, así que `hoyEn` sigue saliendo por un solo camino.
  Las 495 pruebas previas pasaron sin tocarlas.
- **Commit B** `e408893` (`feat:`): `src/domain/indicadores.ts`, `src/domain/indicadores.test.ts` y los
  exports en `index.ts`.
  - `indicadoresParaUsuario(usuario, datos, filtro, ahora)` devuelve `resumen`, `por_proyecto` y
    `por_practicante`, o `AHORA_INVALIDO` / `PERIODO_INVALIDO`.
  - Piezas exportadas, que usan también otras pantallas: `avanceProyecto`, `tiempoCicloMs`,
    `enviosASupervision`, `instanteUltimoEnvio`, `diasEsperando`, `vecesDevuelta`, `proyectosDeCarga`,
    `cargaDePracticante`, `ultimaActividadDeUsuario` y `ultimaActividadDeProyecto`.
  - Constantes: `DIAS_PERIODO_PREDETERMINADO` (30), `DIAS_PERIODO_MAXIMO` (365) y `CODIGOS_INDICADORES`.
- **Commit C** `86b0167` (`refactor:`): `reglaSupervisionDemorada` usa `instanteUltimoEnvio` y
  `reglaCargaDesbalanceada` usa `proyectosDeCarga` y `cargaDePracticante`. Mismo comportamiento y mismo
  orden de `ids_proyecto`; no se tocó ninguna prueba.
- **Orden de comprobación de `indicadoresParaUsuario`:** `ahora` → periodo → alcance → filtro → cálculo.
- **Pruebas:** 59 nuevas; `npm run test` da 554 en 30 archivos.

### Decisiones (D1 a D15)

1. **D1 — Hitos.** Tomada = `TAREA_TOMADA`; enviada = `TAREA_ENVIADA_A_SUPERVISION`; devuelta =
   `TAREA_DEVUELTA`; terminada = la tarea que hoy está TERMINADA, anclada en su `fecha_termino`.
   `TAREA_REABIERTA` no es una devolución. Motivo: coincide con la columna «Terminada» y con Mi historial
   (§11); una tarea reabierta sale y vuelve.
2. **D2 — Tiempo de ciclo neto.** Es la suma de los tramos que van de cada `TOMADA` o `REABIERTA` a la
   siguiente `LIBERADA`, `TERMINADA` o `APROBADA`; enviar y devolver no cortan el tramo. Se mide hasta la
   `fecha_termino` de la tarea: lo que el historial registre después no cuenta. Motivo: no suma el tiempo
   sin responsable tras liberar ni el que pasó terminada antes de reabrir.
3. **D3 — Espera de supervisión.** Una muestra por cada envío ya respondido, anclada en la fecha de la
   respuesta. La espera que sigue abierta no cuenta (ya se ve en «días esperando»).
4. **D4 — Tasa de devolución.** Tareas con al menos un envío del periodo devuelto / tareas con al menos un
   envío en el periodo. El ancla es el envío, y no se cambia el texto de §5.6:
   - una tarea devuelta dos veces cuenta una sola vez (ese dato lo da «veces devuelta»);
   - un envío anterior al periodo no entra, aunque su devolución caiga dentro;
   - una devolución anterior al periodo no cuenta, aunque la tarea se reenvíe y apruebe dentro;
   - en la fila de un practicante, solo cuentan los envíos de los que es autor.
5. **D5 — Periodo.** `dias` días de calendario en hora de Perú, incluido hoy, desde las 00:00 del primer día
   hasta `ahora`. Los límites inferior y superior entran. Valor predeterminado: 30.
6. **D6 — Sin datos y redondeo.** Sin muestras el resultado es `null` (los conteos dan 0). Las duraciones van
   en días con un decimal y los porcentajes enteros, con las mitades hacia arriba y con cálculo entero. Las
   proporciones llevan `numerador` y `denominador`.
7. **D7 — `tiempo.ts`.** Las utilidades de tiempo viven en un módulo propio, porque el paso 10 las necesita.
8. **D8 — Una sola fuente.** `instanteUltimoEnvio`, `proyectosDeCarga` y `cargaDePracticante` las usan los
   indicadores y las reglas de insights. Descartado mantener la lógica en las reglas y copiarla.
9. **D9 — Alcance.** Los proyectos del alcance son los que pasan `puede(usuario, 'VER_REPORTES', { proyecto })`,
   los FINALIZADO incluidos; el Practicante o un usuario INACTIVO reciben el resultado vacío, sin error.
   Un filtro por un proyecto ajeno devuelve vacío. Las métricas de cada fila solo cuentan tareas y eventos
   de esos proyectos.
10. **D10 — Fuera del paso.** «Postulaciones decididas», «puntaje promedio por área» y el gráfico de
    practicantes por área. El resultado no tiene esos campos, así que el Supervisor nunca los recibe.
11. **D11 — Envíos sin respuesta.** Un envío del periodo que aún no tiene respuesta **sí entra en el
    denominador** de la tasa (lectura literal de §5.6). Consecuencia aceptada: con muchas tareas pendientes,
    la tasa baja.
12. **D12 — Tareas eliminadas.** Sus eventos no cuentan en ciclo, espera ni tasa: todo se calcula recorriendo
    `datos.tareas`, así que una tarea que ya no existe nunca se mira.
13. **D13 — Tope del periodo: 365 días** (decisión de los autores, a propuesta del agente). Sin tope, un
    `dias` enorme saca la fecha del rango de `Date` y `toISOString` lanza `RangeError` en vez de devolver
    `PERIODO_INVALIDO`. 365 cubre la práctica de 4 meses y un año entero. La propuesta no lo define.
14. **D14 — Filas por practicante.** Aparece quien tiene una asignación a un proyecto del alcance que se cruza
    con el periodo: `fecha_alta` no posterior a hoy y `fecha_baja` nula o desde el primer día. Antes solo se
    miraba la baja, así que una asignación futura aparecía con ceros. Se comparan las `Fecha` como texto.
15. **D15 — Última actividad en las tablas.** Solo cuenta eventos con `id_proyecto` de los proyectos visibles
    (consecuencia de D9). Los eventos de cuenta (`CUENTA_*`) no entran, tampoco para el Administrador sin
    filtro. `ultimaActividadDeUsuario` y `ultimaActividadDeProyecto` sí son globales cuando se llaman sueltas.

### Riesgos y consecuencias aceptados

- **El ciclo depende de que el evento de cierre no sea posterior a `fecha_termino`.** Si el servicio escribe
  la tarea y el evento con dos `new Date()` distintos y el evento queda unos milisegundos después,
  `tiempoCicloMs` lo descarta y el ciclo de esa tarea da `null` (ver pendientes de la Fase 2).
- **La tasa baja con muchas tareas pendientes** (D11).
- **La carga de un practicante tiene doble protección** (ver «Pruebas y mutaciones»).

### Pruebas y mutaciones

- `src/domain/indicadores.test.ts`: 59 pruebas con IDs por tema: periodo (P), avance (A), ciclo (C), espera
  (E), tasa (T), tareas eliminadas (X), última actividad (U), días esperando (D), veces devuelta (V), carga
  (K), alcance y forma (L), resumen (R) y entrada (N). Las fábricas de `src/domain/pruebas/fabricas.ts`
  no cambiaron.
- **Mutaciones del commit B: 63 de 64 detectadas, 0 errores.** Las hizo el agente con `git add` y
  `git restore` tras autorización de los autores, mediante un script en el scratchpad (fuera del repo).
  Una mutación por prueba, más variantes de P-2 (5), C-9 (2) y L-9 (2).
- **La no detectada es L-4, y es un mutante equivalente.** La carga de un practicante se limita dos veces a
  lo visible: con los ids de proyecto (`visibles`) y con las tareas (`tareasVisibles`). Cambiar solo una de
  las dos no altera el resultado, porque la otra lo sostiene. Con las dos a la vez, L-4 falla. Las fugas de
  una línea que sí detecta son `terminadasEnPeriodo(datos.tareas, …)` y
  `ultimaActividadDeUsuario(id, datos.historial)`. La redundancia es deliberada y se conserva.
- **X-1 y X-2:** la mutación de una línea del plan no servía (era equivalente: el recorrido va sobre
  `tareasVisibles`). Se detectan con mutaciones de dos ediciones. **X-3** (el ciclo de una tarea eliminada) es
  una prueba de regresión **sin mutación**, por decisión de los autores: ninguna mutación de una línea puede
  hacer que cuente, porque el ciclo necesita la `Tarea` con su `fecha_termino`.
- **C-9:** una reapertura sola (`REABIERTA` el día 5) no detecta la ausencia del corte en `fecha_termino`:
  deja un tramo sin cerrar y el resultado es el mismo. La prueba añade un `TERMINADA` el día 6, que sí
  sumaría un día de más sin el corte.
- **Commit C:** las 4 mutaciones propuestas (en `reglaSupervisionDemorada` y `reglaCargaDesbalanceada`) las
  hicieron los autores y confirmaron que se detectan; no se anotaron los IDs.
- **Verificación** (salidas pegadas por los autores en cada commit):
  - **A:** 495 pruebas, `tsc -b`, `eslint src/domain` y `prettier --check src/domain` limpios.
  - **B:** `tsc -b`, `eslint`, `prettier --check` y `npm run build` limpios; 552 pruebas con las 57
    primeras y 554 con los ajustes (59 nuevas); `git diff -- docs` vacío.
  - **C (`86b0167`):** `prettier --check`, `tsc -b` y `eslint src/domain` limpios; `npm run test` con 554 en
    30 archivos; `git diff --stat e408893 -- "src/domain/*.test.ts"` vacío (ninguna prueba tocada);
    `git diff --stat development -- "src/domain/*.test.ts"` muestra solo `indicadores.test.ts`; `hoyEn`
    aparece 1 vez en `index.ts` y `./tiempo` 0 veces; `git diff -- docs` vacío.

### Pendientes para la Fase 2 y posteriores

- **Mismo instante:** `fecha_termino` de la tarea y la fecha del evento que la cierra salen del mismo
  instante.
- **El servicio de Reportes** pasa `ahora` en ISO UTC con `Z` (si no, `AHORA_INVALIDO`) y `dias` entero de 1 a
  365 (si no, `PERIODO_INVALIDO`), y entrega `tareas` sin las eliminadas.
- **Fase 5.6:** el selector de periodo solo ofrece valores dentro de 1 a 365; las tarjetas del Administrador
  de D10 requieren definir primero qué es una postulación «decidida en el periodo»; las columnas de cada tabla
  no están fijadas en la propuesta; confirmar D15 al construir las tablas.
- **Fases 5.2 y 5.3:** «última actividad» y «carga» usan `ultimaActividadDeUsuario`,
  `ultimaActividadDeProyecto`, `proyectosDeCarga` y `cargaDePracticante`, sin copiar la lógica.
- **Fase 7.2 (Mi historial) y 6.2 (Días esperando):** usan `vecesDevuelta` y `diasEsperando`.

### Divergencias con `docs/` (pendientes; las actualizan los autores a mano)

Todavía **no** están hechas. Son las decisiones que la propuesta y el plan no escriben:

1. `docs/Propuesta_SIGEP_Codaini_v6.md`, §5.6, «Indicadores»: cuándo cuenta cada hito (D1), el tiempo de ciclo
   neto hasta `fecha_termino` (D2), la espera por envío respondido (D3), la tasa de devolución por tareas con
   un envío en el periodo (D4 y D11), el periodo de calendario en hora de Perú (D5), «sin datos» y el
   redondeo (D6) y el tope de 365 días (D13).
2. `docs/Propuesta_SIGEP_Codaini_v6.md`, §9.1.4: las filas de la tabla por practicante y qué cuenta cada
   métrica en ellas (D9, D14).
3. `docs/SIGEP_Plan_de_Desarrollo_y_Reglas_del_Agente.md`, §9, Fase 1, paso 9: el detalle de lo anterior y sus
   pruebas.

**Actualización (2026-11-17):** la divergencia 2 (§9.1.4, tabla por practicante) ya la escribieron los autores,
dentro del commit `2a3dc50`. La 1 (§5.6) y la 3 (plan) las escribieron en `3d68cc4`. Con esto ya no hay
divergencia entre el código y `docs/` para el paso 9.

## 2026-11-17 — [A+B] Fase 1, paso 10: ciclo de vida

### API y archivos

- **Commit A** `3c78c4f` (`feat:`): `src/domain/practicas.ts`.
  - `fechaFinPrevista(ingreso, meses)` devuelve la fecha o `MESES_INVALIDOS` / `FECHA_INVALIDA`.
  - `situacionFinPractica(fin, ahora, avisoDias)` devuelve `EN_CURSO`, `AVISO`, `FIN_HOY` o `VENCIDA`, con
    `dias_restantes` (negativo si ya venció), o `AHORA_INVALIDO` / `AVISO_INVALIDO` / `FECHA_INVALIDA`.
  - Constantes `DURACION_MAXIMA_MESES` (24), `AVISO_MAXIMO_DIAS` (365) y `CODIGOS_PRACTICA`.
  - Reutiliza `hoyEn`, `diasEntreFechas` y `esAhoraValido` de `tiempo.ts`.
- **Commit B** `2a3dc50` (`feat:`): `src/domain/cicloVida.ts`. Todas devuelven `{ ok: true, exige_texto, … }` o
  `{ ok: false, codigo, cantidad? }`:
  - `finalizarPractica(usuario, objetivo, datos, ahora, texto?)`: efectos `asignaciones_a_cerrar`,
    `fecha_baja`, `tareas_a_liberar` y `supervisores_a_avisar`.
  - `finalizarProyecto(usuario, proyecto, tareas, ahora, texto?)`: efectos `tareas_a_liberar` y
    `fecha_fin_real`; no trae nada sobre asignaciones.
  - `desactivarSupervisor(usuario, objetivo, proyectos)`.
  - `puedeAsignarPracticante`, `puedeQuitarPracticante` (efectos `asignacion_a_cerrar` y `tareas_a_liberar`)
    y `puedeCambiarSupervisor`.
  - Códigos propios en `CODIGOS_CICLO_VIDA` (11); se conservan los de `puede()` y `TEXTO_OBLIGATORIO`.
- **`index.ts`:** solo se agregaron exports de `./practicas` y `./cicloVida`; no se exporta nada de
  `./tiempo`. No se tocó `permisos.ts`, `transiciones.ts`, `reglasInsights.ts` ni `tiempo.ts`.
- **Orden de comprobación de `cicloVida.ts`:** `ahora` (si la función lo usa) → `puede()` → proyecto
  FINALIZADO (asignar, quitar y cambiar de supervisor) → estado de la persona o del proyecto → condición con
  su cantidad → texto. En `practicas.ts`: `fechaFinPrevista`, meses y luego fecha; `situacionFinPractica`,
  `ahora`, luego aviso y luego fecha.
- **El commit B incluye también** el cambio a mano de los autores en `docs/Propuesta_SIGEP_Codaini_v6.md`
  (§9.1.4). Quedó junto al código; se anota aquí porque CLAUDE.md pide docs después del código.

### Decisiones

1. **Pregunta obligatoria: un proyecto FINALIZADO bloquea asignar, quitar y cambiar de supervisor**
   (decisión de los autores, 2026-11-17). Es historia cerrada: se reactiva para volver a permitirlo, y
   coincide con que finalizar no cierra las asignaciones (§5.4). Descartados: bloquear solo asignar y quitar
   (permitía editar un proyecto cerrado) y no bloquear nada (lo que hacía `puede()` hasta ahora).
2. **El bloqueo vive en `cicloVida.ts`, no en `puede()`.** Primero `puede()` y después el estado del
   proyecto, con el código `PROYECTO_FINALIZADO` que ya existe: el mismo patrón de los pasos 3 a 5.
   Descartado pasar de 14 a 17 las acciones con guarda dentro de `puede()`: reabría el contrato del paso 2
   (su prueba «solo 14») y el significado de ese código.
3. **«Proyectos activos» de un supervisor incluye EN_PAUSA.** Desactivar se bloquea con proyectos ACTIVO o
   EN_PAUSA y el error trae cuántos son. Los FINALIZADO y los de otro supervisor no cuentan. Motivo: una pausa
   se reanuda y §5.4 dice que un proyecto siempre tiene un supervisor activo.
4. **Ingreso + meses: el último día del mes.** 31-oct + 4 meses es 28-feb (o 29-feb en año bisiesto); no
   desborda al mes siguiente. Es lo que hace `addMonths` de date-fns. Descartado desbordar al 3 de marzo.
5. **Topes de la configuración:** duración de 1 a 24 meses y aviso de 1 a 365 días, enteros. La propuesta
   (§5.8) no define límites; sin tope, un número enorme saca la fecha del rango de `Date`. Tampoco se acepta un
   resultado con año mayor que 9999 (`FECHA_INVALIDA`).
6. **Supuestos aplicados porque los autores no dijeron otra cosa (S1 a S6):**
   - **S1:** al finalizar la práctica solo se liberan las EN_PROGRESO; las ESPERANDO_SUPERVISION se quedan
     (§5.2 solo menciona las primeras).
   - **S2:** un proyecto se puede finalizar desde ACTIVO o EN_PAUSA.
   - **S3:** finalizar la práctica da baja a las asignaciones vigentes en **todos** los proyectos, también en
     uno FINALIZADO (§5.2: «sus asignaciones reciben fecha de baja»).
   - **S4:** asignar exige un practicante ACTIVO y sin asignación vigente en ese proyecto; una vigente en
     otro proyecto, o una con baja en este, no lo impide.
   - **S5:** vencida = hoy posterior a la fecha de fin; vencer hoy no cuenta. Es la regla del insight «Fin de
     práctica» (paso 8); una prueba comprueba que las dos coinciden.
   - **S6:** al liberar tareas por un cierre, el registro de cada una copia el motivo o la nota del cierre.
7. **Aviso previo:** la función devuelve `dias_restantes`; no decide cuándo se notifica. El servicio emite el
   aviso una sola vez, cuando `dias_restantes` es igual al aviso configurado.
8. **Texto:** como en las transiciones, `undefined` en el motivo o la nota significa «todavía no se escribió»:
   la acción queda permitida y devuelve `exige_texto` y los `efectos`, que sirven para el aviso «Tiene N
   tareas en progreso que serán liberadas». Vacío o solo espacios es `TEXTO_OBLIGATORIO`.

### Riesgo anotado, no construido

- **Reactivar un proyecto con el supervisor inactivo.** Con la decisión 1 no se cambia de supervisor mientras
  el proyecto está FINALIZADO, y `desactivarSupervisor` ignora los FINALIZADO. Un supervisor puede quedar
  inactivo y, al reactivar su proyecto, este quedaría ACTIVO sin supervisor activo (§5.4: «siempre con un
  supervisor activo»). La salida natural es que la reactivación exija un supervisor ACTIVO. No está en el
  paso 10; va en los servicios de proyectos (Fase 2, paso 9).

### Pruebas y mutaciones

- `src/domain/practicas.test.ts` (12 pruebas) y `src/domain/cicloVida.test.ts` (42). Con ellas,
  `npm run test` da **608 en 32 archivos**. IDs: F y V (fechas de la práctica), FP (finalizar práctica), PY
  (finalizar proyecto), DS (desactivar supervisor), AS (asignar), QU (quitar) y CS (cambiar supervisor).
- **Mutaciones de `practicas.ts`: 15 de 15 detectadas.** Hechas por el agente con `git restore` entre cada
  una, mediante un script en el scratchpad (fuera del repo). Una mutación del plan era equivalente
  (`faltan === 0` → `faltan <= 0`, porque `faltan < 0` se comprueba antes) y se sustituyó por
  `faltan === 1`.
- **Mutaciones de `cicloVida.ts`: 49 de 49 detectadas**, con un hallazgo. La primera corrida dio 48: **FP-11**
  (no modifica los datos que recibe) no detectaba que `finalizarPractica` ordenase la lista de asignaciones,
  porque tenía un solo elemento y ordenar un arreglo congelado de un elemento no escribe nada. Se reforzó con
  listas desordenadas de dos elementos y se repitió: se detecta.
- **Verificación** (las corrió el agente): `tsc -b`, `eslint src/domain` y `prettier --check src/domain` sin
  errores; `npm run build` OK; `git diff -- docs` sin cambios míos; `grep -c "from './tiempo'"
  src/domain/index.ts` da 0; el diff de pruebas contra `development` solo trae los archivos nuevos de los
  pasos 9 y 10.

### Pendientes para la Fase 2 y posteriores

- **Aplicar los efectos:** bajas, `TAREA_LIBERADA` por cada tarea (autor Administrador, nota = motivo o nota
  del cierre), `Usuario.estado` en INACTIVO con el acceso bloqueado y `fecha_fin_real`. Pasar SIEMPRE el texto.
- **Notificaciones:** práctica finalizada con tareas liberadas (a `supervisores_a_avisar`), asignado, quitado,
  proyecto finalizado (al equipo) y el aviso previo.
- **`fechaFinPrevista`** al aprobar una postulación.
- **Formularios de Configuración:** duración de 1 a 24 meses y aviso de 1 a 365 días.
- **Reactivar un proyecto** exige un supervisor ACTIVO (ver el riesgo anotado).

### Divergencias con `docs/` (pendientes; las actualizan los autores a mano)

Todavía **no** están hechas. Son las decisiones que la propuesta y el plan no escriben:

1. `docs/Propuesta_SIGEP_Codaini_v6.md`, §5.4: un proyecto FINALIZADO no admite asignar, quitar ni cambiar de
   supervisor (decisión 1), y el proyecto se puede finalizar desde ACTIVO o EN_PAUSA (S2).
2. `docs/Propuesta_SIGEP_Codaini_v6.md`, §5.3: los «proyectos activos» de un supervisor incluyen los EN_PAUSA
   (decisión 3).
3. `docs/Propuesta_SIGEP_Codaini_v6.md`, §5.2: ingreso + meses con el último día del mes (decisión 4); aviso
   previo cuando faltan 14 días, que se avisa una sola vez (decisión 7).
4. `docs/Propuesta_SIGEP_Codaini_v6.md`, §5.8: duración de 1 a 24 meses y aviso de 1 a 365 días (decisión 5).
5. `docs/SIGEP_Plan_de_Desarrollo_y_Reglas_del_Agente.md`, §9, Fase 1, paso 10: el detalle de lo anterior y
   sus pruebas.

**Actualización (2026-11-17):** las cinco divergencias las escribieron los autores a mano en `3d68cc4`
(propuesta §5.2, §5.3, §5.4, §5.6, §5.8 y §9.1.4, y plan §9, pasos 9 y 10, con sus viñetas de pruebas).
Con esto ya no hay divergencia entre el código y `docs/` para los pasos 9 y 10.

## 2026-11-17 — [A+B] Fase 1: repaso de las pruebas mínimas y cierre

### Qué se hizo

- Repaso de las «Pruebas obligatorias (casos mínimos)» del plan §9 (Fase 1) contra las pruebas existentes de
  `domain/`, y comprobación del «Listo cuando» de la fase. Solo lectura; los únicos cambios son 3 tests.
- **Commit de pruebas** `e1e112d` (`test:`); el commit `65c58b9` (`docs:`) registró en PROGRESO y DECISIONES
  los cambios a mano de los pasos 9 y 10.

### «Listo cuando» de la Fase 1

- **Todas las pruebas pasan:** 611 en 32 archivos; `tsc -b`, `eslint src/domain`, `prettier --check
  src/domain` y `build` sin errores.
- **`domain/` no importa React ni `data/`:** verificado con una búsqueda sobre `src/domain/`. Ningún archivo
  importa `react`, `react-dom`, `react-router`, `zustand`, `zod`, `date-fns` ni `data/`, `services/`, `app/`,
  `auth/`, `compartido/` o `paneles/`. Lo único que no es relativo es `vitest`, en los tests.
- **Los autores revisaron los tipos:** pendiente, es de los autores.

### Cobertura de los mínimos del plan

De los siete mínimos originales, cinco estaban cubiertos del todo: tomar en proyecto EN_PAUSA, el texto
obligatorio, el puntaje (80/90 → 86, redondeo, enteros, pesos, bloque sin criterios, obligatorio, bordes
49/50/69/70 y parámetros), los insights (justo en el umbral y un valor por debajo en las 7 reglas, y la
reaparición a los 7 días o al empeorar) y los IDs. Otros dos estaban cubiertos solo en parte: la matriz de
transiciones y los permisos con un proyecto FINALIZADO (la matriz de permisos 55×3, su alcance e INACTIVO sí
estaban completos). Los mínimos de indicadores y de ciclo de vida (añadidos en `3d68cc4`) también estaban
cubiertos, salvo un detalle del ciclo de vida. Quedaban tres huecos, solo de tests:

1. **Matriz de transiciones.** Se probaban las 21 celdas en su estado de origen, las condiciones y un caso
   fuera de estado. Se añadió una rejilla de las 63 celdas fuera de su estado de origen, escrita a mano desde
   §6.2: `TRANSICION_NO_APLICA` si el rol puede la acción y el estado no coincide, el código del rol si no, y
   `NO_ES_EL_RESPONSABLE` para el practicante con `LIBERAR`, `ENVIAR_A_SUPERVISION` o `MARCAR_TERMINADA` sobre
   una tarea DISPONIBLE (no tiene responsable y `puede()` va antes que el estado). Comprueba además que desde
   cada estado solo se ofrecen transiciones que salen de él.
2. **Proyecto FINALIZADO.** Solo se probaba que el Administrador edita reunión, enlaces y rama base. Ahora los
   tres roles con esas tres acciones y `EDITAR_DATOS_PROYECTO`, según la matriz de §4 (el Supervisor no edita
   los datos del proyecto; el Practicante, nada). Reemplaza al test anterior.
3. **Ciclo de vida.** «No se modifican los datos de entrada» solo se probaba en `finalizarPractica` (FP-11). Se
   añadieron PY-11 (`finalizarProyecto`) y QU-5 (`puedeQuitarPracticante`), con listas desordenadas y
   congeladas.

### Mutaciones: 9 de 9 detectadas

Hechas por el agente con `git restore` entre cada una (script en el scratchpad, fuera del repo):
- **Rejilla:** sin comprobar el estado de origen; comprobarlo contra el estado de destino; comprobar el estado
  antes que `puede()`.
- **FINALIZADO:** añadir `EDITAR_DATOS_PROYECTO`, `DEFINIR_REUNION` o `GESTIONAR_ENLACES` a las acciones que
  bloquea la guarda. La de `EDITAR_DATOS_PROYECTO` solo la detecta el test nuevo: el anterior no la cubría.
- **Ciclo de vida:** ordenar en el sitio las tareas (PY-11) o las asignaciones y las tareas (QU-5).

### Diferencia entre el plan y el código

- El plan dice «Motivo/nota **faltante** cuando es obligatorio → rechazada». El dominio hace otra cosa, por la
  decisión del paso 3: vacío o solo espacios da `TEXTO_OBLIGATORIO` (probado); si todavía no se escribió
  (`undefined` o `{}`), la acción queda permitida y devuelve qué texto exige, para que la interfaz abra el modal.
  Rechazar el texto que falta es del servicio (pendiente de la Fase 2, ya anotado).
- No se cambió el comportamiento; se propone ajustar la línea del plan (lo hacen los autores a mano) con algo
  como: «Motivo o nota obligatorio: vacío o solo espacios → rechazada (`TEXTO_OBLIGATORIO`); si todavía no se
  escribió, la acción queda pendiente de texto y devuelve qué texto exige (el servicio la rechaza si falta).»

### Aspecto menor, sin cambios

- El lado «no dispara» de la carga mínima (un valor por encima del umbral) solo se prueba con «sin tareas
  disponibles». No se añadió prueba.

## 2026-11-17 — [A+B] Fase 2, paso 1: almacén de datos

### Qué se construyó (`src/data/`)

- `tipos.ts` (`DatosAlmacen`: una colección por entidad de `domain/`; los insights no se guardan, solo su
  revisión en `revisiones_insight`), `esquemas.ts` (Zod, cada esquema tipado contra su tipo de `domain/`),
  `parametros.ts` (`crearParametros`: `id === clave`, valor predeterminado como copia), `semilla.ts`
  (**provisional**: colecciones vacías + parámetros; el paso 2 la reemplaza), `almacen.ts` y `index.ts`.

- **Commit:** `809ff44` (`feat: agrega el almacén persistente con recuperación segura (Fase 2, paso 1)`).
  Verificación: 632 pruebas en 33 archivos (21 nuevas), `tsc -b`, `eslint src/data`, `prettier --check
  src/data` y `build` OK; `git diff -- docs` vacío.

### Decisiones de los autores

- **Un solo store** con todas las colecciones (no uno por entidad): es la única forma de que una operación
  atómica abarque varias entidades.
- **`transaccion(operacion)`** en lugar de `immer` (sin dependencias nuevas) o de un setter por colección: la
  operación es síncrona, lee los datos actuales y devuelve las colecciones nuevas; se hace un solo `set` y, por
  tanto, una sola escritura a `localStorage`. Si lanza, no se escribe nada; `null` = sin cambios. La demora
  simulada va fuera. Crear una tarea = devolver `tareas` y `proyectos` (con `ultimo_numero_tarea`) en la misma
  operación.
- **Validación con Zod completa** al leer del navegador (clave `sigep-datos`, `version` 1). Exige además todas
  las claves del catálogo de parámetros y `id === clave`; `ultimo_numero_tarea` entero ≥ 0.
- **Datos dañados, vacíos o de otra versión: se regenera la semilla en silencio** y se deja un `console.warn`
  (sin aviso visible al usuario). Se pierden los cambios guardados. No se migra entre versiones: al cambiar la
  forma de los datos se sube `VERSION_ALMACEN`.
- **Contraseñas de demostración guardadas tal cual** (sin hash) en `localStorage` dentro de
  `Usuario.contrasena`: son valores de demostración del prototipo, no secretos reales. Nunca van al historial.
- Si `localStorage` está bloqueado, la app sigue funcionando en memoria sin guardar.

### Detalles para pasos siguientes

- Sin nada guardado no se escribe hasta el primer cambio, así que la semilla se regenera con la fecha de hoy
  en cada carga hasta que haya una escritura; después los datos quedan fijos (el paso 3 los restablece).
- La validación comprueba forma y tipos, **no** la integridad referencial (por ejemplo, que `id_proyecto` de una
  tarea exista). La semilla del paso 2 debe ser coherente por construcción.
- Solo `services/` debe escribir con `transaccion`; las pantallas leen con selectores. No hay barrera técnica
  (es convención). Los datos recibidos no se mutan: se devuelven colecciones nuevas.
- `src/auth/usuariosDemo.ts` y `src/app/ejemplos/` siguen intactos; su migración a la semilla es posterior.

## 2026-11-17 — [A+B] Fase 2, paso 2: semilla completa de demostración

- **Commit:** `91b29e0` (`feat: agrega la semilla completa de demostración (Fase 2, paso 2)`). Verificación:
  812 pruebas en 34 archivos (180 nuevas en `src/data/semilla.test.ts`), `tsc -b`, `eslint src/data`,
  `prettier --check src/data` y `build` OK; `git diff -- docs` vacío.

### Qué se construyó (`src/data/semilla.ts` y `src/data/semilla/`)

- `semilla.ts` (entrada: `crearSemilla(ahora)`), `reloj.ts` (fechas «hace N días y H horas»), `registro.ts`
  (junta eventos y notificaciones, los ordena y les pone ID), `catalogos.ts`, `personas.ts`, `proyectos.ts`,
  `tareas.ts` y `postulaciones.ts`. `almacen.test.ts` se ajustó para usar una base vacía propia (antes asumía
  la semilla provisional).
- Cantidades: 1 administrador, 3 supervisores, 24 practicantes, 5 proyectos, 43 tareas, 42 postulaciones,
  4 áreas, 9 especialidades, 53 criterios, 336 detalles de evaluación, 321 eventos, 82 notificaciones, 22
  asignaciones, 7 enlaces y 1 revisión de insight (unos 290 KB).
- Es determinista: con el mismo «ahora» da exactamente los mismos datos, con IDs fijos y legibles. Los instantes
  (`FechaHora`) se restan de `ahora`, así que nunca quedan en el futuro a ninguna hora del día; las `Fecha` se
  cortan en la hora de Perú con `hoyEn`.

### Decisiones de los autores (D1 a D8, opción A en todas)

- **D1 — Cifras:** cada practicante exige `id_postulante` (no nulo), así que hay 24 postulaciones aprobadas
  (el origen de cada practicante) **más** 18 en flujo (9 pendientes, 1 reconsiderada y 8 rechazadas): 42 en
  total. «~18» es lo que ve el Administrador en el flujo. Descartado dejar 18 en total (rompía la
  integridad) y apuntar a postulantes inexistentes.
- **D2 — Catálogo de áreas** (no definido en la propuesta; **provisional**, plan §12): Software (Frontend,
  Backend, Móvil), Videojuegos (Programación de juegos, Diseño de juegos), Diseño UX/UI (Investigación UX,
  Diseño de interfaces) y Datos e IA (Análisis de datos, Machine Learning). Cada bloque suma 100 en sus
  criterios activos; hay un criterio desactivado («Carta de recomendación») para mostrar que no se borra.
- **D3 — Constructor por ciclo de vida:** cada tarea es una lista de pasos con su desfase y el constructor
  deriva estado, responsable, `fecha_termino`, `estado_pr` y eventos. Lanza un error si un guion pide un paso
  imposible. Descartado escribir tareas y eventos a mano (~160 eventos, propenso a incoherencias).
- **D4 — Tiempo:** instantes como `ahora − N días − H horas` y `Fecha` como el día de Perú ± N. Descartado
  «día de calendario más hora fija» (a primera hora quedaría un evento en el futuro).
- **D5 — Archivos:** carpeta `src/data/semilla/` con `semilla.ts` como entrada. Descartado un solo archivo de
  unas 1.200 líneas.
- **D6 — Cuentas de demostración:** los tres accesos rápidos conservan ID, nombre y correo de
  `auth/usuariosDemo.ts` (`demo-admin`, `demo-supervisor`, `demo-practicante`, con correos `admin@`,
  `supervisor@` y `practicante@codaini.demo`). `auth/` no se tocó. Una prueba verifica que coinciden.
- **D7 — Caso de error de PR preparado (plan §8):** no se resuelve en la semilla. El modelo no tiene catálogo
  de ramas y crear PR es el paso 6; la semilla deja tareas en `PENDIENTE` listas para crear su PR y el paso 6
  define la rama que dispara el error. Descartado agregar una colección de ramas (cambia el contrato de
  `domain/`).
- **D8 — `data/` invoca reglas de `domain/`:** la semilla llama a `calcularPuntaje` (evaluaciones: puntaje,
  marca y desglose) y a `siguienteEstadoPR` (`estado_pr`) en lugar de reimplementarlos; solo escribe los
  «juicios». Descartado escribir los números a mano.

### Contraseñas de demostración

- **Todas las cuentas** (administrador, supervisores y practicantes) usan la contraseña **`demo12345`**
  (constante `CONTRASENA_DEMO`), guardada tal cual en `Usuario.contrasena` (ver el paso 1). Los accesos
  rápidos son `admin@codaini.demo`, `supervisor@codaini.demo` y `practicante@codaini.demo`; el resto usa
  `nombre.apellido@codaini.demo`. Son datos de demostración, no secretos reales, y nunca van al historial
  (una prueba lo verifica). Los nombres de personas, los repositorios (`github.com/org-demo/...`) y los
  enlaces (`example.com`) son inventados.

### Valores acordados con la propuesta del paso

- Supervisores: `demo-supervisor` lleva PL2D y RSV (activos), `usr-sup-02` lleva TIE (finalizado) y DAT
  (activo, sin practicantes) y `usr-sup-03` lleva INV (en pausa). Reparto 2/2/1.
- Reconsideradas: no son un estado; es `PENDIENTE` con un evento `POSTULACION_RECONSIDERADA` (propuesta
  §5.1), y la regla «postulaciones sin decidir» cuenta desde esa fecha.
- La fecha de fin de cada práctica sale de `fechaFinPrevista` con la duración vigente (4 meses); para «cerca de
  su fin» (Diego, fin en 9 días) y «ya la superó» (Camila, hace 6 días) `ingresoParaFin` retrocede el ingreso
  hasta que ingreso + duración dé la fecha deseada (o la más cercana alcanzable).
- Casos cubiertos: practicantes sin proyecto, finalizado (cuenta inactiva), en 2 proyectos, con un proyecto
  anterior (asignación con baja), inactivos hace más de 7 y más de 14 días, con más de 3 tareas en progreso,
  sin tareas con su proyecto con disponibles, cerca de su fin y que ya la superó, y uno nuevo con contraseña
  temporal. Tareas en los 4 estados y con los 5 estados de PR, devuelta con nota, reabierta, vencidas, por
  vencer, sin asignar, esperando supervisión hace más de 3 días y un proyecto con 6 terminadas. Las 7 reglas
  de insights disparan; el Supervisor ve 5, y «revisado» es independiente por persona.

### Pruebas y mutaciones

- `semilla.test.ts`: 44 pruebas por cada uno de 4 «ahora» (incluidos un 29 de febrero y las primeras horas
  del día en Perú) más 4 sueltas. Cubren forma, cantidades, integridad referencial entre las 17 colecciones,
  contratos de la Fase 1 (`ultimo_numero_tarea`, `fecha_termino` igual al evento que cierra, `estado_pr` y
  URL, reproducción del historial, fechas), evaluaciones recalculadas con `calcularPuntaje`, notificaciones
  (nunca al autor) y escenarios con las funciones de insights.
- Mutaciones del agente (10, con `git add` previo y `git restore` después; todas detectadas y restauradas):
  `ultimo_numero_tarea` + 1, `fecha_termino` 5 ms desfasada, código de proyecto duplicado, asignación a un
  practicante inexistente, bloque de criterios que suma 99, evento en el futuro, notificación al autor,
  parámetro con `id` distinto de su clave, PR abierto sin URL e historial sin ordenar.
- **Mutación 5:** falla al **generar** la semilla (`Evaluación de pos-01: Los pesos de los criterios activos
  del bloque de la especialidad deben sumar 100`), porque `calcularPuntaje` se niega a evaluar con pesos que
  no suman 100; la prueba «los pesos … suman 100» no llega a correr. Los autores lo aceptaron así: no hace
  falta construir la semilla dentro de cada prueba.

### Pendientes

- Paso 6: definir el caso de error de PR y las ramas de ejemplo (D7).
- Login: `iniciarSesion` debe leer de `data/` y retirar las `CUENTAS_DEMO` provisionales.
- `ultimo_numero_tarea` de la semilla es el mayor `numero` de las tareas existentes; no hay ninguna tarea
  eliminada al final de un proyecto. Si se agrega una, el contador quedaría por debajo del real.
- La regla «no notificar al autor» está repetida (mínima) en `registro.ts`; la definitiva es la del paso 4.
- El catálogo de áreas y especialidades es de ejemplo y se revisa con CODAINI (plan §12).

## 2026-11-17 — [A+B] Fase 2, paso 3: restablecer datos de demostración

- **Commit:** `d3d4800` (`feat: agrega restablecer datos de demostración y protege el guardado (Fase 2,
  paso 3)`). Verificación: 824 pruebas en 35 archivos (11 nuevas en `src/data/restablecer.test.ts` y 1 en
  `almacen.test.ts`), `tsc -b`, `eslint src/data`, `prettier --check src/data` y `build` OK;
  `git diff -- docs` vacío.

### Qué se construyó (`src/data/almacen.ts`)

- **`restablecer(ahora?)`**, acción del almacén junto a `transaccion`: un único `set({ datos: semilla(ahora) })`.
  Una sola escritura a `localStorage` y un solo aviso a los suscriptores, así que nunca se ve una base vacía a
  medias. Sin argumento usa la fecha de hoy. Regenera todas las colecciones (también historial,
  notificaciones y parámetros) y no toca otras claves del navegador (`sigep-sesion`, `sigep-tema`).
- **No registra evento de historial:** se borraría junto con el resto de los datos y el dominio no define una
  acción del historial para ello.
- `OpcionesAlmacen.crearSemilla` pasa a `(ahora?: Date) => DatosAlmacen` (por defecto, `crearSemilla`), para
  poder probar con fechas distintas. El estado inicial y `migrate` siguen llamándola sin argumento.
- **`protegerEscritura`:** envuelve el almacenamiento y atrapa los errores de `setItem` (disco lleno, modo
  privado), con un `console.warn`. Corrige un hueco del paso 1: `persist` de Zustand lanza el error después
  de cambiar la memoria, así que `transaccion` fallaba con los datos ya modificados. Ahora la app sigue en
  memoria y lo escrito solo se pierde al recargar. Protege también a `transaccion` y a todos los servicios.

### Decisiones de los autores

- **Alcance: solo capa de datos.** El servicio autorizado (`puede('RESTABLECER_DATOS_DEMOSTRACION')`, resultado
  estándar y demora) se construye en el paso 10 de la Fase 2, con las utilidades del paso 4. Descartado crear
  ahora un servicio mínimo con resultado propio (habría que reescribirlo) y reordenar los pasos. La acción de
  permiso ya existía en `domain/permisos.ts` (Administrador, GLOBAL): no se tocó `domain/`.
- **Sesión activa (contrato para el servicio y la pantalla, no código del paso 3):** se conserva si el usuario
  existe en la semilla nueva, refrescando su copia (nombre, correo, contraseña temporal), y se cierra si no
  existe. Hoy basta con lo primero: el login solo conoce las 3 cuentas demo y sus IDs existen en cualquier
  semilla. El caso «no existe» aparecerá cuando el login lea de `data/`. Descartado cerrar siempre la sesión y
  no hacer nada.
- **Guardado:** atrapar y avisar (`protegerEscritura`), en lugar de dejar que cada servicio atrape el error.

### Pruebas y mutaciones

- `restablecer.test.ts` (11 pruebas, con la semilla real y el reloj simulado): los datos modificados vuelven
  a la semilla; usa la fecha actual (las fechas relativas se mueven con «hoy»); los parámetros vuelven a su
  valor inicial y predeterminado; una sola escritura y sobrevive a «recargar»; es atómico (un solo aviso y
  nunca una base vacía); no toca la sesión ni el tema; deja el sistema consistente (`validarDatos`,
  `ultimo_numero_tarea`) y acepta operaciones después; es idempotente con el mismo «ahora»; y con
  almacenamiento ausente, con `setItem` que falla o con lo guardado dañado no lanza.
- Mutaciones del agente (8, con `git add` previo y `git restore` después; todas detectadas y restauradas):
  no regenerar nada, usar una fecha fija, cambiar la memoria sin pasar por `set`, reiniciar en dos pasos, borrar
  también `sigep-sesion`, dejar escapar el error de `setItem`, conservar los parámetros actuales y restaurar
  solo algunas colecciones.
- La mutación «cambiar la memoria sin pasar por `set`» no hace fallar «los datos modificados vuelven a la
  semilla» (la asignación directa sí deja la memoria con la semilla): lo que se pierde es el aviso y la
  persistencia, y lo detectan las pruebas de escritura única y de «recargar».
- Un fallo de la primera ejecución fue del ayudante de la prueba (sustituía la fecha por la A cuando
  `restablecer()` no recibía argumento) y no del código; se corrigió pasando `crearSemilla` directamente.

### Pendientes

- Paso 10: servicio `restablecerDatosDemostracion(usuario)` con `puede()`, resultado estándar, demora y el
  contrato de sesión de arriba.
- Fase 5.8: botón «Restablecer datos» con confirmación y la marca «solo prototipo»; tras restablecer, volver
  al inicio para no dejar pantallas abiertas sobre registros que ya no existen. La pantalla llama al servicio,
  nunca al almacén.
- Varias pestañas abiertas: el almacén no se sincroniza entre pestañas (no hay evento `storage`); la otra
  pestaña conserva sus datos hasta recargar y los sobrescribiría con su próxima escritura.

## 2026-11-17 — [A+B] Fase 2, paso 4: utilidades base de `services/` (cierra el Bloque 1)

- **Commit:** `c2b3f47` (`feat: agrega las utilidades base de services (Fase 2, paso 4)`). Verificación: 960
  pruebas en 43 archivos (136 nuevas en `src/services/`), `tsc -b`, `eslint src/services`,
  `prettier --check src/services` y `build` OK; `git diff -- docs` vacío. Se elimina `src/services/.gitkeep`.
- Con este paso queda cerrado el **Bloque 1 de la Fase 2** (pasos 1 a 4): almacén (`809ff44`), semilla
  (`91b29e0`), restablecer (`d3d4800`) y utilidades de `services/` (`c2b3f47`).

### Qué se construyó (`src/services/`)

- `resultado.ts`: `Resultado<T>` plano (`{ ok: true, valor }` / `{ ok: false, codigo, mensaje, campos? }`, igual
  que las formas de `domain/`), `exito`, `fallo`, `denegar` (convierte `{ permitido: false, codigo }` o
  `{ codigo, mensaje }` de `domain/`), `validarEntrada` (Zod → `DATOS_INVALIDOS` con un mensaje por campo; un
  error de todo el formulario va en `_general`) y la tabla `MENSAJES`: 22 códigos en español (permisos,
  transiciones, edición, Pull Request y los propios `NO_ENCONTRADO`, `DATOS_INVALIDOS`, `ERROR_INESPERADO`).
  Los códigos de ciclo de vida, puntaje, ID e indicadores ya traen `mensaje` desde `domain/` y pasan tal cual.
- `entorno.ts`: `Entorno { almacen, ahora(), generarId(prefijo), demoraMs }`, `ENTORNO` por defecto
  (`useAlmacen`, `new Date()`, `${prefijo}-${crypto.randomUUID()}`, 600 ms) y `crearEntorno`.
- `demora.ts` (`simularDemora`), `marca.ts` (`Marca { ahora, hoy }`, `crearMarca`), `actor.ts`
  (`obtenerActor`), `etiquetas.ts` (mismo formato que la semilla: `PL2D-018 · Título`), `historial.ts`
  (`crearEvento`, `agregarEventos`, `cambio`, `diferencias`, `autorDe`, `AUTOR_SISTEMA`), `notificaciones.ts`
  (`crearNotificaciones`, `agregarNotificaciones`), `transaccional.ts` (`ejecutarServicio`, `conEfectos`),
  `index.ts` y `pruebas/entorno.ts` (solo para tests).

### Decisiones de los autores

- **Dependencias: parámetro opcional `entorno`** al final de cada servicio (`tomarTarea(entrada, entorno =
  ENTORNO)`). Descartado una fábrica `crearServicios(entorno)` (API más grande) y los singletons con mocks
  globales (pruebas frágiles y con estado compartido).
- **Demora: al inicio de cada llamada, fija** (600 ms, configurable; 0 en las pruebas) y también cuando acaba
  en error, como una red real. Todo se valida con datos frescos tras la espera. Descartado esperar solo en los
  éxitos (el estado de carga parpadearía) y una demora aleatoria (demostraciones impredecibles).
- **Alcance: núcleo + ayudantes** (`ejecutarServicio`, `obtenerActor`, `validarEntrada`, `diferencias`,
  etiquetas), además de las cuatro utilidades pedidas y la marca. Descartado dejar los ayudantes para el paso 5.

### Contratos fijados sin pregunta (consecuencia de lo ya decidido)

- **El actor es un `idActor`:** la sesión guarda `UsuarioSesion` (sin `estado` ni `celular`) y `puede()` pide
  el `Usuario` completo, así que cada servicio lo resuelve **dentro de la transacción** con `obtenerActor`
  (rol y estado vigentes, no los de la sesión).
- **La marca de tiempo se toma dentro de la transacción, después de la demora.** Si se tomara antes, dos
  acciones concurrentes podrían dejar el historial con fechas desordenadas. Todo lo que escribe una operación
  (`fecha_termino`, evento, avisos) comparte ese instante; así `tiempoCicloMs` no se descarta por milisegundos.
- **Resultado plano**, como las formas de `domain/`; **IDs `evt-<uuid>` y `ntf-<uuid>`** con `crypto.randomUUID()`
  (el paso 1 de la Fase 1 ya asignó los UUID a `services/`; la semilla usa IDs fijos y legibles).
- **El historial solo se agrega** (`agregarEventos` devuelve una lista nueva y conserva las referencias; no hay
  función para editar o borrar), `id_proyecto` es obligatorio en los eventos de proyecto, tarea, Pull Request
  y asignación, y un campo de contraseña se rechaza siempre (también en `diferencias`, que lo omite).
- **Notificaciones:** nunca se notifica al autor (autor `USUARIO`); con autor `SISTEMA` o `null` se notifica a
  todos; se quitan los duplicados; un destinatario inexistente o un mensaje vacío son errores de programación
  que lanzan, y como van dentro de la transacción no se escribe nada. Qué destinatarios corresponden a cada aviso
  lo decide cada servicio con la tabla de §8.1.
- **Una excepción dentro de un servicio** devuelve `ERROR_INESPERADO` (mensaje genérico; el detalle va a
  `console.error`) y no escribe nada. Una demora mal configurada se informa igual, sin lanzar.

### Pruebas y mutaciones

- 136 pruebas: `resultado`, `demora`, `marca`, `historial` (incluye etiquetas y `diferencias`), `notificaciones`,
  `entorno`, `actor` y `transaccional`. La de `transaccional` incluye dos servicios de ejemplo escritos en el
  propio test (terminar y enviar a supervisión) como contrato para los pasos 5 a 11: sobre la semilla real
  validan con `domain/`, escriben, registran el evento y avisan al supervisor sin avisar al autor, todo con la
  misma marca y en una sola escritura.
- Mutaciones del agente (12, con `git add` previo y `git restore` después; todas detectadas y restauradas):
  no excluir al autor, no quitar duplicados, que el evento use el reloj y no la marca, tomar la marca antes de
  la demora, escribir los cambios aun con error, no atrapar excepciones, aceptar un campo de contraseña, quitar
  la guarda de `id_proyecto`, que `agregarEventos` reemplace el historial, borrar el mensaje de un código de
  denegación, que `simularDemora` ignore los milisegundos y que `diferencias` incluya campos sin cambio.
- Un error del ejemplo de la prueba, no de las utilidades: el servicio de ejemplo pasaba una lista vacía de
  asignaciones a `puede()` y rechazaba la acción. `puede()` espera las asignaciones **de quien actúa**; los
  servicios reales deben pasarlas así.

### Pendientes

- Pasos 5 a 11: cada servicio recibe `(entrada con idActor, entorno = ENTORNO)`, usa `ejecutarServicio` y suma
  a `MENSAJES` los códigos nuevos que no traigan `mensaje` del dominio.
- La regla de «no notificar al autor» definitiva es la de `crearNotificaciones`; el registro de la semilla
  (`src/data/semilla/registro.ts`) conserva una copia mínima solo para generar los datos iniciales.
- El historial queda en orden de escritura, que coincide con el cronológico porque la marca se toma dentro de
  la transacción.


## 2026-11-17 — [A+B] Autenticación simulada desde el almacén

- **Commit:** `0307f83` (`feat(auth): integrar inicio de sesión con servicios de fase 2 y actualizar interfaz`).
- `src/services/autenticacion.ts` consulta `entorno.almacen.getState().datos.usuarios`; es una consulta de solo
  lectura, con demora simulada y un `Entorno` inyectable para pruebas. Amplía `AlmacenServicio` para exponer
  los datos junto con `transaccion`.
- `iniciarSesion` delega en el servicio. Las credenciales incorrectas, inexistentes o de una cuenta INACTIVA
  comparten `CREDENCIALES_INVALIDAS` y el mismo mensaje. El acceso rápido consulta por IDs fijos de la semilla,
  valida también el rol y devuelve `ACCESO_RAPIDO_NO_DISPONIBLE` si la cuenta falta o está INACTIVA.
- `usuariosDemo.ts` deja de duplicar cuentas y contraseñas; conserva solo el mapa de roles a IDs de acceso
  rápido. `UsuarioSesion` usa los tipos `Rol` y `Usuario` de `domain/`. `almacenSesion.ts` no cambia: conserva
  la validación y persistencia de un resumen sin contraseña.
- `semilla.test.ts` comprueba directamente las tres cuentas previstas y ya no importa desde `auth/`, evitando
  invertir la dependencia entre `data/` y `auth/`.
- Verificación: 966 pruebas en 44 archivos; `tsc -b`, ESLint y Prettier pasan; `npm run build` pasa con el
  aviso existente de chunk mayor a 500 kB. No se modificaron los servicios de mutación de tareas ni otras
  mutaciones del almacén.

## 2026-11-17 — [A+B] Fase 2, paso 5A: servicios para crear, editar y eliminar tareas

- **Commit:** `2c54c04` (`feat: agrega los servicios para crear, editar y eliminar tareas (Fase 2, paso5A)`). Verificación: 1010 pruebas en 45 archivos (50 nuevas en `src/services/tareas/`), `tsc -b`,
  `eslint src/services`, `prettier --check src/services` y `build` OK; `git diff -- docs` vacío.

### Plan del paso 5 (aprobado por los autores, opción A en las siete decisiones)

- **D1 — Archivos:** carpeta `src/services/tareas/` por grupo: `comun.ts`, `datosTarea.ts` (crear, editar,
  eliminar), `transiciones.ts` (las 7 de §6.2) y `opciones.ts` (supervisión y PR). Descartados un solo
  archivo (unas 700 líneas y un test de más de 1500) y un archivo por servicio (mucha repetición).
- **D2 — Tamaño:** el paso 5 se parte en tres sub-pasos con parada y commit cada uno: **5A** comunes +
  crear/editar/eliminar; **5B** las 7 transiciones + puerto de GitHub; **5C** opciones + prueba de flujo.
  Descartado un solo commit (11 servicios no se revisan en 10 a 20 minutos, plan §2.2).
- **D3 — «Requiere PR» va en el paso 5**, junto con «Requiere supervisión»: es una opción de la tarea, usa
  `puedeCambiarRequierePR` y C1 solo necesita `siguienteEstadoPR` (sin GitHub). El paso 6 queda para crear y
  cerrar PR, ramas de ejemplo, error preparado, PR existente y recálculo. El plan §9 (Fase 2, paso 6) nombra
  «No requiere PR»: **los autores ajustan esa línea a mano**.
- **D4 — Consulta a GitHub al volver a enviar o terminar una tarea que ya tuvo PR:** puerto `github` en
  `Entorno`, con una implementación simulada por defecto que responde lo último que se sabe del PR (CREADO →
  abierto sin conflictos; CON_CONFLICTOS → abierto con conflictos; FUSIONADO → fusionado; CERRADO → cerrado;
  PENDIENTE con URL, es decir, un PR viejo ya fusionado → fusionado). Las pruebas inyectan otras respuestas y
  el paso 6 amplía el mismo puerto. Cambia la interfaz `Entorno` del paso 4; **se construye en 5B**.
  Descartada una función fija sin puerto (las pruebas no podrían simular un cambio en GitHub).
- **D5 — Evento al desactivar «Requiere PR»:** con cualquier rol, `PULL_REQUEST_NO_REQUERIDO`; activar →
  `TAREA_OPCIONES_CAMBIADAS`. El aviso `PULL_REQUEST_NO_REQUERIDO_POR_PRACTICANTE` al supervisor sale solo
  cuando actúa el practicante (§8.1). Descartado usar dos tipos de evento para el mismo hecho según el rol.
- **D6 — Devolver o reabrir cuando el responsable ya no puede trabajar** (INACTIVO o con la asignación de
  baja): se conserva el responsable (literal §6.2) y el Administrador o el Supervisor liberan la tarea después,
  con motivo. Descartados bloquear con un código nuevo (la tarea quedaría atascada: §6.2 no ofrece salida
  hacia DISPONIBLE desde ESPERANDO_SUPERVISION ni TERMINADA) y liberar automáticamente (regla nueva). La
  interfaz de la Fase 4 debe señalar el caso.
- **D7 — Fecha límite:** solo se exige que sea una fecha válida; no tiene que ser futura (la propuesta no lo
  define). Descartado exigir `≥ hoy` (regla nueva que iría en §5.5/§6.4).
- **Supuestos sin pregunta:** sin largo máximo de título ni descripción; un motivo opcional que el practicante
  envíe al liberar su propia tarea se guarda en `nota`; editar recibe los tres campos y `diferencias` decide
  qué cambió.

### Qué se construyó (sub-paso 5A)

- `src/services/tareas/comun.ts`: esquemas de Zod (`esquemaId`, `esquemaTitulo`, `esquemaDescripcion`,
  `esquemaFechaLimite` con `esFechaDeCalendario`, `esquemaTextoOpcional`); `cargarContextoProyecto` y
  `cargarContextoTarea` (actor → proyecto o tarea → asignaciones **de quien actúa** con `asignacionesDe`);
  `exigirTexto` y `textoGuardado`; `reemplazarTarea`, `referenciaTarea` (`«Menú» (PL2D-004)`) y
  `eventoDeTarea` (autor, etiqueta `PL2D-018 · Título` e `id_proyecto` siempre presentes).
- `src/services/tareas/datosTarea.ts`: `crearTarea`, `editarTarea` y `eliminarTarea`, con el contrato del paso 4
  (`servicio(entrada, entorno = ENTORNO)` dentro de `ejecutarServicio`). Devuelven la `Tarea` resultante;
  eliminar devuelve `{ id }`.
- `src/services/tareas/index.ts` y la reexportación en `src/services/index.ts`.
- `src/services/resultado.ts`: código nuevo `SIN_CAMBIOS` («No hay cambios para guardar.»), con su caso en
  `resultado.test.ts`.

### Decisiones de implementación

- **Orden de comprobación de todos los servicios de tareas:** Zod (forma y formato) → actor → tarea o proyecto
  → regla de `domain/` → texto ausente → `SIN_CAMBIOS` → escritura. Por eso un practicante que edita con los
  mismos valores recibe `ROL_NO_PERMITIDO`, no `SIN_CAMBIOS`, y un actor inexistente con datos inválidos recibe
  `DATOS_INVALIDOS`.
- **Zod no exige contenido en el motivo ni en la nota**, solo que sean texto si vienen. Si rechazara un motivo
  vacío, se saltaría el orden de `domain/`: eliminar una tarea EN_PROGRESO o con PR con motivo vacío debe
  responder `TAREA_NO_ELIMINABLE` o `TAREA_YA_TIENE_PR`. El texto vacío lo rechaza `domain/`
  (`TEXTO_OBLIGATORIO`) y el texto **ausente**, `exigirTexto` (cumple el pendiente de «el servicio pasa siempre
  el texto y rechaza si falta»).
- **Crear:** número de `siguienteNumeroTarea` y `ultimo_numero_tarea` del proyecto en la **misma** transacción
  (`tareas` y `proyectos` en un solo `cambios`); un número eliminado no se reutiliza. Nace DISPONIBLE, sin
  responsable, `requiere_supervision` en `false` y `requiere_pr` en `true` por defecto, `estado_pr` y datos de PR
  en `null`. `EN_PAUSA` no impide crear; `FINALIZADO` sí (lo decide `puede()`). Evento `TAREA_CREADA` con el
  cambio de estado `null` → DISPONIBLE (como la semilla); sin notificación (§8.1). Un contador inválido
  devuelve `ULTIMO_NUMERO_INVALIDO` con el mensaje de `domain/`.
- **Editar:** el formulario envía título, descripción y fecha límite; los textos se recortan y `diferencias`
  registra solo lo que cambió (si no cambia nada, también tras recortar, `SIN_CAMBIOS` y no se escribe). La
  etiqueta del evento usa el título **nuevo**; el anterior queda en `cambios`. Con `avisar_responsable`
  (EN_PROGRESO con responsable) se envía `TAREA_EDITADA_EN_PROGRESO` al responsable, con el mismo texto que la
  semilla.
- **Eliminar:** la tarea sale de `tareas` (única excepción a «nada se borra»), el evento `TAREA_ELIMINADA`
  guarda el cambio DISPONIBLE → `null` y el motivo recortado en `nota`, y `ultimo_numero_tarea` no cambia. Sin
  notificación.
- **Fecha límite:** `YYYY-MM-DD` y además un día que exista (`2026-02-30` no vale). El esquema de `data/` solo
  comprueba el formato, por eso no se reutiliza.
- Una tarea cuyo proyecto no existe (dato roto) responde `NO_ENCONTRADO`, igual que una tarea inexistente.

### Pruebas y mutaciones

- `comun.test.ts` (esquemas, carga del contexto, texto exigido y escritura) y `datosTarea.test.ts`; 50 pruebas
  en total. Con la semilla real y `crearEntornoDePrueba`, cubren: éxito con una sola escritura, evento (tipo,
  autor, etiqueta, `id_proyecto`, `cambios`, `nota` y la fecha de la marca) y notificaciones exactas; sin
  permiso (practicante, supervisor ajeno), proyecto FINALIZADO, usuario INACTIVO, inexistentes, datos inválidos
  por campo, motivo ausente, vacío o con solo espacios, `SIN_CAMBIOS`, y el orden de comprobación. Ninguna
  operación fallida escribe.
- **Mutaciones del agente (13, con `git add` previo y `git restore` después; todas detectadas y
  restauradas):** no exigir el texto ausente; Zod que rechaza el motivo vacío (rompe el orden, 5 pruebas); no
  guardar `ultimo_numero_tarea`; número desde `max(numero) + 1`; asignaciones de todos y no del actor;
  `SIN_CAMBIOS` antes que el permiso; editar sin avisar al responsable; eliminar sin quitar la tarea; fecha
  validada solo con regex; evento con el reloj y no con la marca; etiqueta con el título anterior; crear sin
  `puede()`; motivo guardado sin recortar.
- La mutación «crear sin `puede()`» dejó ver un título de prueba mal formado (mostraba el ID del actor en vez
  del código esperado); se corrigió antes del commit.

### Pendientes

- **5B:** las 7 transiciones y el puerto `github` en `Entorno` (D4). **5C:** opciones (D3, D5) y la prueba de
  flujo crear → tomar → enviar → aprobar.
- Ajustar a mano el plan §9, Fase 2, paso 6 (D3).
- Fase 4: señalar en el detalle de tarea el caso de D6 (responsable INACTIVO o con baja en una tarea
  EN_PROGRESO).

## 2026-11-17 — [A+B] Fase 2, paso 5B: las 7 transiciones de tarea y el puerto de GitHub simulado

- **Commit:** `2726b9a` (`feat: agrega las transiciones de tarea y el puerto de GitHub simulado (Fase 2, paso 5B)`). Verificación: 1092 pruebas en 47 archivos (82 nuevas), `tsc -b`, `eslint src/services`,
  `prettier --check src/services` y `build` OK; `git diff -- docs` vacío.

### Qué se construyó

- `src/services/github.ts`: `PuertoGitHub` (`consultarPullRequest(tarea): ConsultaGitHub`), `TareaConsultable`
  (`url_pull_request` y `estado_pr`), `consultaSimulada` y `GITHUB_SIMULADO`. El paso 6 amplía el mismo puerto
  con listar ramas, crear y cerrar.
- `src/services/entorno.ts`: `Entorno` gana `github: PuertoGitHub`; `ENTORNO.github = GITHUB_SIMULADO`.
  `crearEntornoDePrueba` acepta `github` (por defecto, la simulación).
- `src/services/tareas/transiciones.ts`: `tomarTarea`, `liberarTarea`, `enviarTareaASupervision`,
  `marcarTareaTerminada`, `aprobarTarea`, `devolverTarea` y `reabrirTarea` (entradas `EntradaTransicion`,
  `EntradaLiberar` con `motivo?` y `EntradaConNota` con `nota?`). Todas devuelven la `Tarea` resultante.
- Reexportaciones en `src/services/tareas/index.ts` y `src/services/index.ts`. Sin códigos nuevos en
  `MENSAJES`.

### Decisiones aprobadas en la propuesta de 5B

- **Simulación de GitHub (D4-A):** responde lo último que el sistema sabe del PR: CREADO → abierto sin
  conflictos; CON_CONFLICTOS → abierto con conflictos; FUSIONADO → fusionado; CERRADO → cerrado; PENDIENTE con
  URL (PR viejo ya fusionado y recalculado, S4) → fusionado. Una URL sin `estado_pr` es un dato imposible y
  lanza (`ERROR_INESPERADO`).
- **Puerto síncrono que recibe la tarea:** la operación de `ejecutarServicio` corre dentro de la transacción
  del almacén (síncrona) y S1 dice que el GitHub simulado siempre responde al recalcular. Recibe la tarea y no
  solo la URL porque la simulación necesita el último `estado_pr`. Con un backend real se reemplaza toda la
  capa `services/`.
- **`fecha_termino` no va en `cambios`**, como en la semilla: ya es igual a la fecha del evento.
- **`FALTA_CONSULTA_GITHUB` se devuelve como fallo** con el mensaje que ya tenía en `MENSAJES` (no como
  excepción) y no escribe nada. Es inalcanzable mientras el servicio consulte cuando `necesitaConsultaGitHub`
  lo pide.

### Decisiones de implementación

- **Un ayudante privado, `ejecutarTransicion`**, con el orden de 5A: Zod → `cargarContextoTarea` →
  `puedeTransicionar` (puede → estado → condición → texto vacío) → `exigirTexto` (texto ausente) → efecto
  propio → evento + aviso → una sola escritura con `conEfectos`. Las 7 funciones exportadas solo declaran su
  efecto (plan §4.4: una función por acción).
- **El ayudante pone y registra el cambio de `estado`** (siempre primero en `cambios`); el efecto devuelve la
  tarea nueva, los cambios extra (responsable, `estado_pr`), la `nota` y el aviso.
- **Mapeo (sigue la semilla):**

  | Servicio | Tarea | `cambios` | `nota` | Aviso (§8.1) |
  |---|---|---|---|---|
  | tomar | EN_PROGRESO, responsable = actor | estado; responsable `null` → nombre | — | ninguno |
  | liberar | DISPONIBLE, sin responsable; PR, URL y ramas se conservan | estado; responsable nombre → `null` | motivo recortado (opcional para el practicante) | `TAREA_LIBERADA` → responsable |
  | enviar | ESPERANDO_SUPERVISION, `estado_pr` recalculado | estado; + `estado_pr` si cambia | — | `TAREA_ENVIADA_A_SUPERVISION` → supervisor |
  | terminar | TERMINADA, `fecha_termino = marca.ahora`, `estado_pr` recalculado | estado; + `estado_pr` si cambia | — | ninguno |
  | aprobar | TERMINADA, `fecha_termino = marca.ahora` (sin recalcular PR, S5) | estado | — | `TAREA_APROBADA` → responsable |
  | devolver | EN_PROGRESO, mismo responsable (D6-A) | estado | nota recortada | `TAREA_DEVUELTA` → responsable |
  | reabrir | EN_PROGRESO, mismo responsable (D6-A), `fecha_termino = null` | estado | nota recortada | `TAREA_REABIERTA` → responsable |

- **El aviso va al responsable anterior a la transición.** `crearNotificaciones` descarta al autor, así que
  liberar la tarea propia no avisa a nadie, sin una regla aparte. Con D6-A, un responsable INACTIVO recibe el
  aviso igual (solo se exige que exista).
- **PR al llegar:** el puerto se consulta solo si `necesitaConsultaGitHub(tarea)` (requiere PR y ya hubo URL);
  sin URL, `domain/` da PENDIENTE sin consultar; sin «Requiere PR», `estado_pr` se conserva. El cambio de
  `estado_pr` va en el mismo evento de la transición (autor, el practicante), sin un
  `PULL_REQUEST_ESTADO_ACTUALIZADO` aparte. La URL y las ramas no se tocan.
- **La marca «Devuelta con observaciones»** se sigue derivando con `devolucionVigente`; no se guarda nada
  nuevo. Las pruebas comprueban que liberar y volver a tomar la conservan y que volver a enviar la apaga.
- **El texto se pasa siempre a `puedeTransicionar`** (pendiente de la Fase 1), aunque `exigirTexto` también
  rechaza el vacío: así la regla del texto queda en `domain/` y el servicio solo añade el caso «ausente».

### Pruebas y mutaciones

- `transiciones.test.ts`: éxito de cada una (tarea, una sola escritura, evento exacto y avisos exactos);
  condiciones de §6.2 (estado equivocado, tomar en EN_PAUSA, liberar/aprobar en EN_PAUSA permitidos, enviar sin
  supervisión, terminar con supervisión); quién (roles, supervisor ajeno, sin asignación, con baja, no
  responsable); textos ausentes, vacíos o con solo espacios; orden alcance → estado → texto; PR (primera
  llegada, sin «Requiere PR», las 4 respuestas de GitHub con un puerto inyectado que cuenta las llamadas,
  aprobar sin consultar); `fecha_termino` igual a la fecha del evento y en `null` al reabrir; D6-A; un caso
  real de la semilla (reabrir `PL2D-001`, con PR fusionado, y volver a terminar → PENDIENTE con la URL vieja); y
  una matriz común a las 7 (FINALIZADO, INACTIVO, inexistentes, ID vacío). La prueba del ciclo de la marca
  adelanta el reloj entre pasos para no depender del desempate de eventos con el mismo instante.
- `github.test.ts`: las 5 respuestas de la simulación, su efecto con `siguienteEstadoPR` y el dato imposible.
  `entorno.test.ts`: el puerto por defecto y que `crearEntorno` lo conserva o lo cambia.
- **Mutaciones del agente (11, con `git add` previo y `git restore` después):** 10 detectadas y restauradas
  (no pasar `github`; consultar siempre; aprobar recalcula el PR; `fecha_termino` con el reloj; reabrir no
  limpia `fecha_termino`; devolver quita al responsable; tomar no asigna al actor; no exigir el motivo ausente;
  la simulación responde abierto para PENDIENTE con URL; el aviso de liberar va al actor).
- La mutación «la simulación responde abierto para PENDIENTE con URL» pareció sobrevivir en la primera pasada
  porque el script solo corría `src/services/tareas`; sobre `src/services` la detectan 2 pruebas de
  `github.test.ts`.
- **Mutación equivalente:** quitar el texto de la llamada a `puedeTransicionar` no cambia ningún resultado,
  porque `exigirTexto` corre justo después y también rechaza el texto vacío (el orden estado → texto se
  mantiene). No se puede detectar con pruebas; se conserva el texto en la llamada por el pendiente acordado.
  La misma redundancia existe en `eliminarTarea` (5A).

### Pendientes

- **5C:** «Requiere supervisión» y «Requiere PR» (D3, D5, C1 con `siguienteEstadoPR` y el aviso al supervisor)
  y la prueba de flujo crear → tomar → enviar → aprobar.
- **Paso 6:** ampliar `PuertoGitHub` con listar ramas, crear y cerrar PR, y el caso de error preparado.
- **Semilla (opcional):** ninguna tarea EN_PROGRESO tiene un PR previo, así que el recálculo al volver a
  llegar no se ve en la demostración sin reabrir antes una tarea con PR.

## 2026-11-17 — [A+B] Fase 2, paso 5C: opciones de la tarea y prueba de flujo (cierra el paso 5)

- **Commit:** `98ead18` (`feat: agrega los servicios de opciones de tarea y la prueba de flujo (Fase 2, paso 5C)`). Verificación: 1125 pruebas en 49 archivos (33 nuevas), `tsc -b`, `eslint src/services`,
  `prettier --check src/services` y `build` OK; `git diff -- docs` vacío.

### Qué se construyó

- `src/services/tareas/opciones.ts`: `cambiarRequiereSupervision` (`EntradaRequiereSupervision`: `idActor`,
  `idTarea`, `valor`) y `cambiarRequierePR` (`EntradaRequierePR`: lo mismo más `motivo?`). `valor` es el valor
  deseado (`true` = activar). Devuelven la `Tarea` resultante.
- `src/services/tareas/flujo.test.ts`: flujo completo por código con servicios reales y la semilla real.
- Reexportaciones en `src/services/tareas/index.ts` y `src/services/index.ts`. Sin códigos nuevos (se
  reutilizan `SIN_CAMBIOS`, `TAREA_NO_EDITABLE`, `TAREA_YA_TIENE_PR` y `TEXTO_OBLIGATORIO`).

### Decisiones de implementación

- **Orden de `cambiarRequiereSupervision`:** Zod → contexto → `puedeCambiarRequiereSupervision` (`puede()` y
  estado: solo DISPONIBLE o EN_PROGRESO, si no `TAREA_NO_EDITABLE`) → `SIN_CAMBIOS` → escritura. Evento
  `TAREA_OPCIONES_CAMBIADAS` con el cambio en Sí/No; sin aviso (§8.1 no lo lista).
- **Orden de `cambiarRequierePR`:** Zod → contexto → `puedeCambiarRequierePR` (`puede()` → PR existente →
  motivo vacío) → `exigirTexto` (motivo ausente) → `SIN_CAMBIOS` → `siguienteEstadoPR` (C1) → escritura. Por
  ese orden, un practicante que intenta activar recibe `ROL_NO_PERMITIDO` aunque ya esté activo; un practicante
  que desactiva una tarea con PR sin motivo recibe `TAREA_YA_TIENE_PR`; y uno que desactiva algo ya desactivado
  sin motivo recibe `TEXTO_OBLIGATORIO`, no `SIN_CAMBIOS`.
- **C1 sobre la tarea original:** el evento `REQUIERE_PR_CAMBIADO` solo mira el estado de la tarea y
  `estado_pr`, no `requiere_pr`. Activar en ESPERANDO_SUPERVISION o TERMINADA con `estado_pr === null` →
  PENDIENTE, con el cambio de `estado_pr` en el mismo evento que el de `requiere_pr`; activar antes de llegar
  deja `null`; activar con un `estado_pr` ya calculado lo conserva; desactivar nunca lo cambia (la etiqueta la
  oculta `etiquetaPRVisible`).
- **Mapeo (D5-A):**

  | Caso | `TipoAccionHistorial` | `cambios` | `nota` | Aviso (§8.1) |
  |---|---|---|---|---|
  | Requiere supervisión | `TAREA_OPCIONES_CAMBIADAS` | `requiere_supervision` | — | ninguno |
  | Requiere PR, activar (Admin o Supervisor) | `TAREA_OPCIONES_CAMBIADAS` | `requiere_pr` (+ `estado_pr` si C1 lo cambia) | motivo si lo escribieron | ninguno |
  | Requiere PR, desactivar (Admin o Supervisor) | `PULL_REQUEST_NO_REQUERIDO` | `requiere_pr` | motivo si lo escribieron | ninguno |
  | Requiere PR, desactivar (practicante responsable) | `PULL_REQUEST_NO_REQUERIDO` | `requiere_pr` | motivo recortado (obligatorio) | `PULL_REQUEST_NO_REQUERIDO_POR_PRACTICANTE` → supervisor del proyecto |

- **El aviso se decide por el rol** (`actor.rol === 'PRACTICANTE'`) y no por `exige_texto`, para que se lea
  igual que §8.1; el practicante solo puede desactivar. El texto del aviso («{nombre} marcó «X» (PL2D-010) como
  «No requiere PR».») es nuevo: la semilla no tiene ninguno de este tipo.

### Prueba de flujo

- **Flujo principal:** el Supervisor crea una tarea con supervisión → el practicante demo la toma y la envía
  (llega en PENDIENTE) → el Supervisor la aprueba. Comprueba la tarea final (TERMINADA, `fecha_termino` igual
  al último evento, `ultimo_numero_tarea` + 1), el historial en orden (`TAREA_CREADA`, `TAREA_TOMADA`,
  `TAREA_ENVIADA_A_SUPERVISION`, `TAREA_APROBADA`, con autor, etiqueta e `id_proyecto`), exactamente 2 avisos
  nuevos en todo el sistema (el envío al Supervisor y la aprobación al practicante), y que los indicadores de
  `domain/` leen bien lo escrito: `tiempoCicloMs` igual al tiempo entre tomar y aprobar, `vecesDevuelta` 0,
  `devolucionVigente` falso y la etiqueta PENDIENTE.
- **Variante con devolución:** crear → tomar → enviar → devolver → enviar → aprobar: `vecesDevuelta` 1, la marca
  «Devuelta» se enciende al devolver y se apaga al reenviar, la nota de la devolución queda en el evento y llegan
  los 4 avisos esperados.
- **Variante «No requiere PR»:** el practicante lo marca mientras la tarea espera supervisión; la etiqueta deja
  de verse, `estado_pr` se conserva y el supervisor recibe el aviso.
- El reloj avanza un minuto entre pasos para que el historial quede en orden cronológico real.

### Pruebas y mutaciones

- `opciones.test.ts` (30 pruebas): los dos roles que pueden, los estados permitidos y prohibidos, C1 en sus
  cuatro casos (con dos casos reales de la semilla: `PL2D-002`, TERMINADA sin «Requiere PR», pasa a PENDIENTE;
  `PL2D-001`, con PR fusionado, responde `TAREA_YA_TIENE_PR`), desactivar con los tres roles, motivo ausente,
  vacío o con solo espacios, PR existente (también cerrado) antes que el texto, `SIN_CAMBIOS` y su orden,
  alcance, FINALIZADO, INACTIVO, inexistentes y `valor` inválido. `flujo.test.ts`: 3 pruebas.
- En la primera corrida falló una sola prueba, y era de la propia prueba (buscaba la primera devolución de todo
  el historial, que era de la semilla); se corrigió filtrando por la tarea.
- **Mutaciones del agente (11, con `git add` previo y `git restore` después):** 10 detectadas y restauradas
  (`SIN_CAMBIOS` antes que el permiso; sin `SIN_CAMBIOS` en «Requiere PR»; no llamar a `siguienteEstadoPR`;
  desactivar registra `TAREA_OPCIONES_CAMBIADAS`; avisar también si desactiva el Administrador; nunca avisar;
  no exigir el motivo ausente; `SIN_CAMBIOS` antes que `exigirTexto`; no guardar el motivo; aviso al responsable
  en vez de al supervisor).
- **Mutación equivalente (anticipada en la propuesta):** pasar a `siguienteEstadoPR` la tarea con
  `requiere_pr` ya cambiado da el mismo resultado, porque `REQUIERE_PR_CAMBIADO` no lee ese campo. No se puede
  detectar con pruebas; se usa la tarea original y un comentario lo explica en el código.

### Cierre del paso 5 (servicios de tareas)

- **Tres commits de código:** 5A `2c54c04` (crear, editar, eliminar), 5B `2726b9a` (las 7 transiciones y el
  puerto de GitHub) y 5C `98ead18` (opciones y prueba de flujo); docs `b6683dd` y `ed6a6bc`.
- **Doce servicios** en `src/services/tareas/` (`datosTarea.ts`, `transiciones.ts`, `opciones.ts`, con
  `comun.ts`), el puerto `github` en `Entorno` (`src/services/github.ts`) y 165 pruebas nuevas. Mutaciones:
  13 de 13 en 5A, 10 de 11 en 5B y 10 de 11 en 5C (las 2 restantes, equivalentes).
- **Pendientes del plan del paso 5 que quedan cumplidos:** guardar `numero` y `ultimo_numero_tarea` juntos;
  avisar al responsable al editar una tarea EN_PROGRESO; `fecha_termino` y el evento de cierre con la misma
  marca; pasar siempre `github` al volver a llegar; aplicar C1 al cambiar «Requiere PR»; avisar al supervisor
  cuando el practicante desactiva «Requiere PR»; y, en todos los servicios de tareas, pasar las asignaciones de
  quien actúa y rechazar el texto ausente.
- **Queda para los autores (a mano):** ajustar el plan §9, Fase 2, paso 6 (D3: «No requiere PR» ya está en el
  paso 5).
- **Queda para la Fase 4:** señalar en el detalle de tarea el caso de D6-A (responsable INACTIVO o con baja en
  una tarea EN_PROGRESO).

### Pendientes

- **Paso 6 (servicios de Pull Request):** crear el PR con ramas de ejemplo, el caso de error preparado (plan
  §8), detectar un PR existente, cerrar el PR y el recálculo, ampliando el mismo `PuertoGitHub`.

## 2026-11-17 — [A+B] Fase 2, paso 6A: listar ramas y crear Pull Request con GitHub simulado

- **Commit:** `59dc320` (`feat: agrega listar ramas y crear Pull Request con GitHub simulado (Fase 2, paso 6A)`). Verificación: 1161 pruebas en 50 archivos (36 nuevas), `tsc -b`, `eslint src/services`,
  `prettier --check src/services` y `build` OK; `git diff -- docs` vacío.

### Plan del paso 6 (aprobado por los autores, opción A en las siete decisiones)

- **P1 — Catálogo de ramas de ejemplo:** derivado del proyecto, sin datos nuevos: una
  `feature/<código>-NNN` por cada número de 1 a `ultimo_numero_tarea` (el formato de la semilla) más las dos
  ramas especiales de P2 y P5. La rama base no se lista. Sirve para cualquier proyecto, también los que se
  creen en la Fase 5. Descartados una lista escrita a mano por repositorio (los proyectos nuevos caerían en una
  genérica) y una colección de ramas en `data/` (cambia el contrato; el paso 2, D7, ya la descartó).
- **P2 — Caso de error preparado (plan §8):** «rama inexistente». La rama `feature/<código>-rama-eliminada`
  aparece en la lista pero GitHub la rechaza con `RAMA_INEXISTENTE` (simula una rama borrada entre listar y
  crear); una rama fuera del catálogo responde lo mismo. Determinista; la ventana no se cierra y al reintentar
  con otra rama funciona. Descartados «GitHub no disponible» siempre en un proyecto (bloquearía crear PR ahí) o
  solo en el primer intento (estado oculto, impredecible tras recargar).
- **P3 — PR que ya existía (§7.5):** se detecta en los datos. Si **otra** tarea del proyecto tiene un PR con la
  misma rama de origen y base: abierto (CREADO o CON_CONFLICTOS) → `EXISTENTE_ABIERTO`, se vincula su URL y
  conserva sus conflictos; FUSIONADO (o PENDIENTE con URL, un PR viejo ya fusionado) → `EXISTENTE_FUSIONADO`;
  CERRADO → no bloquea, como en GitHub. El PR anterior de la propia tarea no cuenta (tras «fusionado →
  PENDIENTE» las correcciones van en un PR nuevo, §7.4). Descartados una rama especial teatral con URL fija y no
  modelarlo (incumple §7.5).
- **P4 — Evento al vincular:** `PULL_REQUEST_CREADO` con la nota «Ya existía un PR para estas ramas; se
  vinculó.» y `vinculado: true` en el resultado, para que la pantalla muestre el aviso de §7.5. Descartado
  `PULL_REQUEST_ESTADO_ACTUALIZADO` (ese tipo se reserva a lo que informa GitHub, con autor Sistema).
- **P5 — Conflictos al crear (§7.5):** la rama `feature/<código>-con-conflictos` crea el PR y, en la misma
  operación, el Sistema lo pasa a CON_CONFLICTOS y avisa al practicante. Descartado no modelarlo.
- **P6 — Sin servicio de sincronización con GitHub** (fusión o cierre en GitHub, resolución de conflictos):
  con backend llega por webhooks (§7.6); la semilla trae tareas en cada etiqueta (§7.7) y el recálculo al
  volver a llegar ya está en 5B. Descartados un `sincronizarPullRequest` que con la simulación nunca cambiaría
  nada y controles de demostración (pantalla no definida).
- **P7 — Dos sub-pasos:** 6A (puerto, `ejecutarConsulta`, listar ramas y crear PR) y 6B (cerrar PR, flujo
  final y cierre del Bloque 2).
- **Riesgo aceptado (P3-A):** si dos tareas comparten un PR vinculado y una lo cierra, la otra conserva su
  etiqueta hasta que vuelva a llegar; sin webhooks no hay forma de propagarlo.

### Qué se construyó (sub-paso 6A)

- `src/services/github.ts`: `PuertoGitHub` con las cuatro operaciones de §7.6 (`consultarPullRequest`,
  `listarRamas`, `crearPullRequest`, `cerrarPullRequest`); tipos `RepositorioPR`, `PRConocido` (con la marca
  `propio`), `SolicitudPR` y `RespuestaCrearPR`; simulación `ramasSimuladas`, `ramaEliminada`,
  `ramaConConflictos` y `crearPullRequestSimulado`; `GITHUB_SIMULADO` con las cuatro (cerrar siempre acepta:
  §7.5 no define errores al cerrar). Sigue siendo síncrono y sin estado propio: todo llega por parámetro.
- `src/services/transaccional.ts`: `ejecutarConsulta(entorno, operacion)`, igual que `ejecutarServicio`
  (demora, datos vigentes, una marca, excepciones → `ERROR_INESPERADO`) pero la transacción siempre termina en
  `null`: nunca escribe. Lo reutilizarán las consultas con alcance del paso 11.
- `src/services/pullRequests/pullRequests.ts`: `listarRamasParaPullRequest` (`Resultado<string[]>`) y
  `crearPullRequest` (`Resultado<{ tarea, vinculado }>`), con `NOTA_PR_VINCULADO`; barril en
  `src/services/pullRequests/index.ts` y reexportación en `src/services/index.ts`.
- `src/services/resultado.ts`: código nuevo `RAMA_INEXISTENTE` («La rama elegida ya no existe en GitHub. Elige
  otra rama.»).

### Decisiones de implementación

- **Orden de crear:** Zod (rama y título no vacíos; descripción opcional) → contexto → `puedeCrearPullRequest`
  (responsable, alcance, FINALIZADO, etiqueta visible, PR en PENDIENTE o CERRADO) → `github.crearPullRequest`;
  si GitHub da error, se devuelve sin escribir nada y la etiqueta sigue igual (S3) → `siguienteEstadoPR`
  (`PR_CREADO`) → si hay conflictos, `siguienteEstadoPR` (`GITHUB_INFORMA`) → una sola escritura. GitHub no se
  consulta si el permiso falla (lo comprueba un puerto espía).
- **Listar** usa el mismo permiso que crear (solo quien puede abrir el modal) y `ejecutarConsulta`.
- **La rama base es siempre `proyecto.rama_base`**; la tarea guarda URL, `rama_origen`, `rama_base` y
  `estado_pr`. El título y la descripción solo van a GitHub (§11 no tiene esos campos en la tarea).
- **Numeración de la URL:** `…/pull/<mayor número conocido del proyecto + 1>`. El PR propio no cuenta como
  existente pero **sí** cuenta para numerar, así que nunca se repite un número (por eso `PRConocido` lleva
  `propio`).
- **Un PENDIENTE con URL cuenta como fusionado**, igual que en la consulta de 5B (es el PR viejo tras recalcular
  «fusionado → PENDIENTE»).
- **Eventos:** `PULL_REQUEST_CREADO` (autor, el practicante) con `diferencias` sobre `estado_pr`,
  `url_pull_request`, `rama_origen` y `rama_base` (solo lo que cambia: al crear de nuevo desde CERRADO con la
  misma rama solo aparecen el estado y la URL). Con conflictos, un segundo evento
  `PULL_REQUEST_ESTADO_ACTUALIZADO` con autor **Sistema** (CREADO → CON_CONFLICTOS) y el aviso
  `PULL_REQUEST_CON_CONFLICTOS` al practicante, también del Sistema: por eso le llega aunque él creó el PR (con
  su nombre de autor, `crearNotificaciones` lo descartaría). Sin aviso al crear (§8.1).
- Para que compilaran, los puertos de prueba de 5B (`entorno.test.ts`, `transiciones.test.ts`) parten ahora de
  `GITHUB_SIMULADO`; su lógica no cambió.

### Pruebas y mutaciones

- `github.test.ts`: catálogo (formato, especiales, sin la base, proyecto nuevo, número 1000), `RAMA_INEXISTENTE`
  (rama eliminada, fuera del catálogo y la base), URL siguiente (contando el PR propio), conflictos, las cuatro
  situaciones de un PR existente, abierto antes que fusionado y lo que no bloquea (cerrado, propio, otra base,
  otra rama). `transaccional.test.ts`: `ejecutarConsulta` (valor sin escritura, error tal cual, excepción y
  demora).
- `pullRequests.test.ts` (con la semilla real): estados de partida; listar (catálogo sin escritura y permiso
  sin consultar GitHub); crear nuevo (evento exacto, una sola escritura, sin aviso), desde CERRADO, PR propio
  fusionado no vinculado, recortes y rama base del proyecto; el error preparado con reintento; vincular abierto,
  fusionado y con conflictos; conflictos al crear (dos eventos y el aviso del Sistema); quién, estado, EN_PAUSA,
  FINALIZADO, INACTIVO, inexistentes y datos inválidos.
- **Mutaciones del agente (9, sobre `src/services` completo, con `git add` previo y `git restore` después; todas
  detectadas y restauradas):** escribir aunque GitHub dé error; no usar la rama base del proyecto; contar el PR
  propio como existente; que el PR cerrado bloquee; sin el segundo evento de conflictos; aviso de conflictos con
  el practicante como autor; URL que repite un número; listar sin comprobar el permiso; `ejecutarConsulta` que
  escribe.

### Pendientes

- **6B:** `cerrarPullRequest`, el flujo de la Fase 2 terminando en «crear PR» y el cierre del Bloque 2.
- **Ajustes a mano en `docs/`:** plan §9, Fase 2, paso 6 (D3: «No requiere PR» ya está en el paso 5) y plan §8
  (el caso de error preparado es «rama inexistente», con las ramas de ejemplo de P1 y P5).

## 2026-11-17 — [A+B] Fase 2, paso 6B: cerrar Pull Request y flujo de punta a punta (cierra el paso 6 y el Bloque 2)

- **Commit:** `9600f46` (`feat: agrega cerrar Pull Request y el flujo de punta a punta (Fase 2, paso 6B)`).
  Verificación: 1177 pruebas en 50 archivos (16 nuevas), `tsc -b`, `eslint src/services`,
  `prettier --check src/services` y `build` OK; `git diff -- docs` vacío.

### Qué se construyó

- `src/services/pullRequests/pullRequests.ts`: `cerrarPullRequest` (`EntradaCerrarPR`: `idActor`, `idTarea`,
  `motivo?`), que devuelve la `Tarea` resultante. Reexportado en `src/services/pullRequests/index.ts` y
  `src/services/index.ts`. Sin códigos nuevos.
- `src/services/tareas/flujo.test.ts`: flujo de punta a punta terminando en `crearPullRequest` y la variante
  cerrar → crear de nuevo. `valor()` pasa a ser genérico para leer el resultado de `crearPullRequest`.

### Decisiones de implementación

- **Orden de cerrar:** Zod → contexto → `puedeCerrarPullRequest` (`puede()`: responsable, Supervisor del
  proyecto o Administrador, alcance y FINALIZADO → etiqueta visible → PR en CREADO o CON_CONFLICTOS → motivo
  vacío) → `exigirTexto` (motivo ausente) → `github.cerrarPullRequest(url)` → `siguienteEstadoPR`
  (`PR_CERRADO_DESDE_SISTEMA`) → una sola escritura. Por ese orden, un PR FUSIONADO o PENDIENTE con motivo vacío
  responde `ESTADO_PR_NO_APLICA`, no `TEXTO_OBLIGATORIO`.
- **GitHub se llama solo después de los permisos y del motivo:** una solicitud rechazada nunca deja un PR
  cerrado en GitHub con la tarea sin cambios (lo comprueba un puerto espía en todos los casos de error).
- **Solo cambia `estado_pr` a CERRADO;** la URL y las ramas se conservan (§7.5: luego se puede «crear nuevo
  PR», y un cerrado no bloquea, P3-A). Una URL nula con el PR abierto es un dato roto: lanza y termina en
  `ERROR_INESPERADO` sin escribir.
- **Evento y aviso:** `PULL_REQUEST_CERRADO_DESDE_EL_SISTEMA` (autor, quien cierra) con `estado_pr` → CERRADO y
  el motivo recortado en `nota`; `PULL_REQUEST_CERRADO_POR_OTRA_PERSONA` al responsable con el texto de la
  semilla («Cerraron el Pull Request de «X» (ID).»), que `crearNotificaciones` descarta si lo cerró él mismo.
- **EN_PAUSA no impide cerrar** (como crear: `puede()` solo bloquea FINALIZADO).
- Las pruebas de flujo calculan la URL esperada desde los datos (mayor número conocido + 1), sin fijar números.

### Pruebas y mutaciones

- `pullRequests.test.ts` (14 pruebas de cerrar): el practicante cierra su PR (evento exacto, una escritura,
  sin aviso, el puerto recibe la URL), Supervisor y Administrador cierran uno ajeno (aviso exacto al
  responsable), desde CON_CONFLICTOS, crear de nuevo después de cerrar (URL siguiente), EN_PAUSA, motivo ausente
  / vacío / con solo espacios, FUSIONADO y PENDIENTE (también con motivo vacío), supervisor ajeno, otro
  practicante, practicante con baja, tarea EN_PROGRESO, sin «Requiere PR», FINALIZADO, INACTIVO, inexistentes y
  datos inválidos; en todos los errores ni se escribe ni se llama a GitHub.
- `flujo.test.ts` (2 pruebas): crear → tomar → enviar → aprobar → crear PR (tarea TERMINADA y CREADO, rama base
  del proyecto, 5 eventos en orden con la misma etiqueta y proyecto, y siguen siendo solo 2 avisos: crear un PR
  no avisa); y la variante con cierre por el Supervisor (aviso al practicante, nota del motivo) y un PR nuevo con
  el número siguiente.
- **Mutaciones del agente (4, sobre `src/services` completo, con `git add` previo y `git restore` después;
  todas detectadas y restauradas):** no exigir el motivo ausente; aviso de cierre al actor en vez del
  responsable; cerrar sin llamar al puerto; borrar la URL al cerrar.

### Cierre del paso 6 (servicios de Pull Request)

- **Dos commits de código:** 6A `59dc320` (puerto ampliado, `ejecutarConsulta`, listar ramas y crear PR) y 6B
  `9600f46` (cerrar PR y flujo de punta a punta); docs `465a147`. 52 pruebas nuevas; mutaciones 9 de 9 en 6A y
  4 de 4 en 6B.
- `PuertoGitHub` queda completo con las cuatro operaciones de §7.6 (consultar, listar ramas, crear y cerrar),
  simulado sin estado propio y determinista.
- Todos los eventos de §7.4 tienen servicio: llegar (5B), crear o detectar existente (6A), conflictos al crear
  (6A), cerrar desde el sistema (6B) y «Requiere PR» (5C). Lo que GitHub informa por su cuenta (fusión, cierre o
  resolución de conflictos en GitHub) queda para un backend con webhooks (P6-A).

### Cierre del Bloque 2 de la Fase 2 (pasos 5 y 6)

- **Cinco commits de código:** `2c54c04` (5A), `2726b9a` (5B), `98ead18` (5C), `59dc320` (6A) y `9600f46`
  (6B); docs `b6683dd`, `ed6a6bc`, `6c8e32f` y `465a147` (y el de este cierre). Rama
  `feat/fase2-servicios-tareas-pr`.
- **15 servicios:** 12 de tareas (crear, editar, eliminar, las 7 transiciones y las 2 opciones) y 3 de Pull
  Request (listar ramas, crear y cerrar), más el puerto de GitHub simulado y `ejecutarConsulta`. 217 pruebas
  nuevas (165 del paso 5 y 52 del paso 6).
- **Mutaciones:** 48 en total (13 en 5A, 11 en 5B, 11 en 5C, 9 en 6A y 4 en 6B): 46 detectadas y 2
  equivalentes (sin efecto observable, explicadas en 5B y 5C).
- **«Listo cuando» de la Fase 2:** queda cubierta por código la parte de tareas y PR del flujo (crear tarea →
  tomar → enviar → aprobar → crear PR), con historial y notificaciones coherentes. «Aprobar postulación →
  asignar» llega con los pasos 7 y 8 (Bloque 3).
- **Decisiones del bloque:** D1 a D7 (paso 5) y P1 a P7 (paso 6), todas en la opción A.

### Pendientes

- **Autores:** commit de documentación de este cierre y PR del Bloque 2 a `development`, revisado por ambos.
- **Ajustes a mano en `docs/`:** plan §9, Fase 2, paso 6 (D3) y plan §8 (caso de error «rama inexistente» y
  ramas de ejemplo, P1, P2 y P5).
- **Fase 4:** señalar en el detalle de tarea el caso de D6-A (responsable INACTIVO o con baja en una tarea
  EN_PROGRESO); la pantalla de «Crear Pull Request» usa `listarRamasParaPullRequest` y muestra el aviso de
  §7.5 cuando `vinculado` es `true`.
- **Riesgo aceptado (P3-A):** un PR vinculado y compartido por dos tareas, cerrado desde una, no se propaga a
  la otra hasta que vuelva a llegar.
- **Bloque 3 (pasos 7 a 11):** postulaciones, practicantes y supervisores, proyectos, cuenta y consultas con
  alcance por rol, en una sesión nueva desde `development`.

## 2026-11-18 — [A+B] Cierre de Fase 4, pasos 6–11, e integración del Bloque 2

### Alcance registrado

- Se completan los pasos 6 a 11 de Fase 4: detalle de tarea con acciones reales y señal D6-A; creación y cierre
  de Pull Requests; formulario conectado a crear/editar tarea; notificaciones desde el almacén; perfil y sesión
  conectados con la cuenta actual; limpieza de la página de desarrollo temporal para dejarla como contenedor
  de integración.
- El Bloque 2 de Fase 2 (pasos 5 y 6) queda registrado como terminado: servicios de tareas y Pull Request,
  puerto de GitHub simulado, y flujos con historial y notificaciones. El cierre no afirma que el PR del bloque
  se haya fusionado.
- La Fase 2, Bloque 3 no se declara cerrado en esta entrada.

### Decisiones de arquitectura aplicadas

- **Sesión validada contra el almacén actual:** el resumen persistido no basta para autorizar ni para mostrar el
  estado de cuenta. Se resuelve el usuario actual por ID y se exige que exista, esté ACTIVO y conserve el rol
  de la sesión. Si falta, está INACTIVO o cambió de rol, se cierra la sesión. Los cambios vigentes de nombre,
  correo y contraseña temporal se sincronizan al resumen de sesión.
- **Las acciones de cuenta pasan por `services/`:** el servicio resuelve al actor actual, aplica permisos de
  `domain/`, valida los datos y devuelve `Resultado<T>`. Las pantallas no escriben en el almacén. Las
  contraseñas no se incluyen en el historial ni en el resumen de sesión.
- **Persistencia de perfil:** las ediciones permitidas se guardan mediante las transacciones del almacén, que
  persiste en `localStorage`; el cambio de contraseña solo registra el evento de cuenta sin almacenar claves
  en historial o notificaciones.
- **Responsabilidades del perfil:** el practicante ve sus tareas no terminadas; el supervisor, las tareas no
  terminadas de sus proyectos no finalizados; el administrador, las tareas no terminadas de todos los proyectos
  no finalizados. El filtro por rol y permisos se aplica antes de presentar la lista.
- **Notificaciones:** la interfaz lee las notificaciones persistidas y filtra por destinatario; marcarlas como
  leídas usa el servicio correspondiente. Los eventos y avisos derivados de mutaciones siguen siendo
  responsabilidad de los servicios.
- **Paso 11 de Fase 4:** la página temporal deja de fabricar tareas o simular mutaciones; sirve únicamente para
  componer las vistas con estado global y servicios.

### Verificación

- `npm.cmd test`: **1,223 pruebas en 58 archivos**, todas aprobadas.
- `npx.cmd tsc -b`, Prettier y `npm.cmd run build`: correctos.
- ESLint: sin errores; permanece el aviso conocido de `react-refresh/only-export-components` en
  `src/compartido/ui/button.tsx`. La compilación conserva el aviso de Vite por el chunk principal mayor a
  500 kB.
- No se anotan hashes: esta actualización se hizo bajo la restricción expresa de no ejecutar comandos de Git.

