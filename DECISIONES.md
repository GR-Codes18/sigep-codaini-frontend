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

## 2026-10-22 — [B] @hookform/resolvers baja de 6.0.0 a 5.2.2 (Fase 3, paso 1)

- **Qué cambia:** `@hookform/resolvers` pasa de `6.0.0` (decidido en la Fase 0, paso 1) a `5.2.2`, exacta.
- **Por qué:** la 6.0.0 nunca se había instalado. Al instalarla, `npm install` falla con `ERESOLVE`: sus peers opcionales (`effect@^4`, `@typeschema/main`) arrastran `@effect/schema@0.71.4`, que pide `effect@^3`. Se descartaron `--force` y `--legacy-peer-deps` porque instalan un árbol roto u ocultan conflictos futuros.
- **Por qué 5.2.2:** última 5.x; su único peer es `react-hook-form@^7.55.0` y usa Standard Schema, así que `zodResolver` funciona con Zod 4.
- **Alternativas descartadas:** mantener 6.0.0 con `--legacy-peer-deps` en `.npmrc` (afecta a todo el proyecto) o con `overrides` (parche a mantener).
- **Además:** `zod` 4.6.7 pasa a estar declarado en `dependencies` (antes llegaba solo como transitiva de `shadcn`).
- **Reabrir cuando:** una 6.x instale sin conflicto de peers.