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
- Ajustar a mano el plan §9, Fase 2, paso 6 (D3). **Actualización (2026-11-18):** hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`).
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
  paso 5). **Actualización (2026-11-18):** hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`).
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
  (el caso de error preparado es «rama inexistente», con las ramas de ejemplo de P1 y P5). **Actualización (2026-11-18):** hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`).

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
  ramas de ejemplo, P1, P2 y P5). **Actualización (2026-11-18):** hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`).
- **Fase 4:** señalar en el detalle de tarea el caso de D6-A (responsable INACTIVO o con baja en una tarea
  EN_PROGRESO); la pantalla de «Crear Pull Request» usa `listarRamasParaPullRequest` y muestra el aviso de
  §7.5 cuando `vinculado` es `true`.
- **Riesgo aceptado (P3-A):** un PR vinculado y compartido por dos tareas, cerrado desde una, no se propaga a
  la otra hasta que vuelva a llegar.
- **Bloque 3 (pasos 7 a 11):** postulaciones, practicantes y supervisores, proyectos, cuenta y consultas con
  alcance por rol, en una sesión nueva desde `development`.

## 2026-11-17 — [A+B] Fase 2, paso 7A: evaluar, aprobar, rechazar y reconsiderar postulaciones

Commits de código: `42c0b25` (regla de decisión en `domain/`) y `debd47e` (servicios de 7A). El paso 7 se parte
en dos sub-pasos: 7A (este) y 7B (áreas técnicas, especialidades y criterios; propuesta aparte).

### Decisiones aprobadas (todas en la opción recomendada)

- **E1-A — el «modelo» es un puerto.** `Entorno.evaluador` (`PuertoEvaluador.juzgar`) con la simulación
  determinista `EVALUADOR_SIMULADO` (`src/services/evaluador.ts`): hash FNV-1a de `id_postulante|id_criterio`,
  cumple cerca del 70 % y usa las mismas observaciones de la semilla. Es repetible, como pide §10.1; las pruebas
  inyectan juicios fijos para llegar a los bordes 49/50/69/70 y al criterio obligatorio. Descartadas: función
  local sin puerto (pruebas de bordes incómodas) y juicio por palabras clave (frágil).
- **E2-A — contraseña temporal.** `Entorno.generarContrasena` (`src/services/contrasena.ts`): 10 caracteres de
  `crypto.getRandomValues`, sin 0/O/1/l/I, descartando los bytes que sesgarían el reparto; supera el mínimo de 8
  de §8.3. Se devuelve **una sola vez** en el resultado de `aprobarPostulacion` y se guarda tal cual en
  `Usuario.contrasena` (como la semilla); **nunca** va al historial. Descartadas: derivarla de `generarId`
  (predecible) y una fija `demo12345` (todas las cuentas nuevas compartirían clave).
- **E3-A — error de `calcularPuntaje`.** `evaluarPostulacion` devuelve el mismo `codigo` y `mensaje` de `domain/`
  y no escribe nada; la postulación queda sin evaluación y el Administrador puede aprobarla o rechazarla igual
  («decide siempre, con o sin marca»). Descartadas: bloquear las decisiones hasta que haya evaluación, e inventar
  una evaluación con puntaje 0 (contradice «explicable», §10.1).
- **E4-B — la regla de estado vive en `domain/`.** `src/domain/decisionPostulacion.ts`:
  `puedeDecidirPostulacion(estado, accion)` y `decisionesDisponibles(estado)`, con las únicas transiciones
  PENDIENTE→APROBADA, PENDIENTE→RECHAZADA y RECHAZADA→PENDIENTE. Servicio y pantalla (qué botón se ve) consultan
  la misma regla, como `transicionesDisponibles` en tareas. Trae su propio `mensaje`
  (`POSTULACION_NO_PENDIENTE`, `POSTULACION_NO_RECHAZADA`), así que no están en `MENSAJES`. No cambia ningún tipo.
- **E5-A — `evaluarPostulacion` es un proceso del sistema.** Sin actor y con autor `SISTEMA`; no hay una acción
  en la matriz de §4 que lo autorice a una persona. La semilla ya evalúa a las 42 postulaciones, así que hoy solo
  se dispara por código; **cómo se ve «Analizando…» se decide en la Fase 5.1** (p. ej. una postulación de la
  semilla sin evaluar). No se inventa ninguna pantalla.
- **Supuesto confirmado — `fecha_ingreso`.** Es el día de la aprobación en hora de Perú (`marca.hoy`), igual que
  la semilla; `fecha_fin_prevista` sale de `fechaFinPrevista(fecha_ingreso, PRACTICA_DURACION_MESES)`. El
  Administrador podrá cambiarlas luego (`editarDatosPractica`, paso 8). **Falta que los autores lo escriban en
  la propuesta §5.1/§5.2** (hoy no dice de dónde sale la fecha de ingreso).

### Qué se construyó

- `src/domain/decisionPostulacion.ts` (+ prueba) y su reexportación en `src/domain/index.ts`.
- `src/services/postulaciones/`: `comun.ts` (esquemas, contexto actor → postulante, lectura de la banda, la
  proporción y la duración vigentes con verificación de `tipo`), `evaluacion.ts` (`evaluarPostulacion` y
  `redactarJustificacion`), `decisiones.ts` (`aprobarPostulacion`, `rechazarPostulacion`,
  `reconsiderarPostulacion`) e `index.ts`.
- `src/services/evaluador.ts` y `src/services/contrasena.ts`; `Entorno` gana `evaluador` y `generarContrasena`
  (y `crearEntornoDePrueba` acepta un `evaluador` y numera las contraseñas: `Clave-t001`).
- Códigos nuevos en `MENSAJES`: `POSTULACION_YA_EVALUADA`, `CORREO_YA_REGISTRADO` y `CONFIGURACION_INVALIDA`
  (parámetro ausente o de otro `tipo`: dato roto, no error del usuario).

### Decisiones de implementación

- **Orden de las decisiones:** Zod → actor → postulante → `puede()` → estado (`puedeDecidirPostulacion`) → texto
  ausente (`exigirTexto`) → reglas propias → escritura. Por eso un Supervisor sobre una postulación aprobada
  recibe `ROL_NO_PERMITIDO`, y rechazar una aprobada sin motivo recibe `POSTULACION_NO_PENDIENTE`.
- **Aprobar** crea `Usuario` (PRACTICANTE, ACTIVO, `debe_cambiar_contrasena: true`, correo recortado) y
  `Practicante` (área y especialidad heredadas; Discord, GitHub y disponibilidad en `null`), pasa el postulante a
  APROBADA y registra `POSTULACION_APROBADA` y `PRACTICANTE_CREADO` con el mismo instante, todo en una escritura.
  **No asigna a ningún proyecto** (§5.1: es otra acción) y **no notifica a nadie** (§8.1).
- **Correo único:** se compara sin distinguir mayúsculas ni espacios (`CORREO_YA_REGISTRADO`). La duración
  inválida de Configuración devuelve `MESES_INVALIDOS` de `domain/` sin escribir.
- **Reconsiderar** conserva la evaluación y su desglose (no se recalcula, §5.1).
- **Evaluar:** el modelo solo ve los criterios activos del área (generales) y de la especialidad; la banda y la
  proporción se leen de Configuración en cada evaluación; una postulación ya evaluada responde
  `POSTULACION_YA_EVALUADA`. La justificación usa el mismo texto que la semilla (hay una prueba que lo exige).
- **Limitación conocida:** en rechazar y reconsiderar, un motivo o nota que no sea texto falla en el campo
  `texto` y no en `motivo` o `nota`; se ajusta con la pantalla de la Fase 5.1 si hace falta.

### Pruebas y mutaciones

- 110 pruebas nuevas (1.287 en 56 archivos en total): 12 de la regla de `domain/`; 25 de la evaluación; 51 de
  las decisiones (permisos y datos de las tres, rejilla estado × decisión, fechas con fin de mes, año bisiesto y
  cambio de año, duraciones de 1 a 24 y fuera de rango, correo repetido); flujo evaluar → rechazar →
  reconsiderar → aprobar; contraseña (alfabeto, longitud, bytes sesgados); evaluador (determinista, porcentaje).
- **Mutaciones del agente (17, con `git add` previo y `git restore` después; todas detectadas y restauradas):**
  aprobar sin `puede()`; aprobar desde RECHAZADA; reconsiderar desde APROBADA; sin `exigirTexto`;
  `debe_cambiar_contrasena: false`; 4 meses fijos; ingreso en UTC; contraseña en el historial; aviso al aprobar;
  banda fija; proporción fija; sin `POSTULACION_YA_EVALUADA`; sin comprobar el correo duplicado; correo sin
  normalizar; contraseña sin descartar bytes sesgados; evaluación firmada por una persona; reconsiderar que
  borra la evaluación.
- No se hizo una mutación de atomicidad: la escritura única la garantiza `transaccion` y todas las pruebas de
  error comprueban que el almacén queda idéntico.

### Pendientes

- **Fase 5.1:** cómo se muestra «Analizando…» (E5-A) y qué texto sale cuando la evaluación falla (E3-A: «No se
  pudo evaluar: <mensaje>»); mostrar la contraseña temporal una sola vez al aprobar.
- **Autores, a mano en `docs/`:** propuesta §5.1/§5.2: la fecha de ingreso de un practicante nuevo es el día de la
  aprobación (hora de Perú) y la de fin se calcula con la duración vigente. **Actualización (2026-11-18):** hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`).
- **Paso 8:** `editarDatosPractica` (fecha de ingreso y de fin), restablecer contraseña y asignar al proyecto.
- **7B:** áreas técnicas, especialidades y criterios (propuesta aparte).

---

## 2026-11-17 — [A+B] Fase 2, paso 7B: áreas técnicas, especialidades y criterios de evaluación (cierra el paso 7)

Commits de código: `3368603` (validación del bloque en `domain/`) y `5eb54a4` (servicios de 7B).

### Decisiones aprobadas (todas en la opción recomendada)

- **C1-B — el bloque se guarda completo.** `guardarCriteriosDeBloque` recibe el estado deseado de un bloque (el
  general de un área o el de una especialidad): crea los criterios sin `id`, edita los demás, activa o
  desactiva, y valida **una sola vez, al final**, que los criterios activos sean enteros mayores que 0 y sumen
  100. Así repartir 30/70 → 40/60 no pasa por una suma distinta de 100. Como nada se borra, la lista debe traer
  **todos** los criterios existentes del bloque: si falta alguno, `CRITERIOS_INCOMPLETOS` (nombra el que falta).
  Descartadas: validar en cada acción individual (impide cualquier reparto) y un CRUD libre que valide solo al
  evaluar (el bloque puede quedar roto sin que nadie lo vea y, con E3-A, las evaluaciones fallarían en silencio).
- **C2-B — áreas y especialidades nacen inactivas.** Solo se activan cuando su propio bloque de criterios activos
  es válido. Un bloque sin criterios activos solo se admite si su especialidad (o su área) está inactiva; con
  criterios activos siempre valen los 100 puntos. Descartado dejarlas nacer activas con un catálogo que no
  puede calcular.
- **C3 — la regla vive en `domain/`.** `validarBloqueCriterios(criterios, bloque)` (y `sumaPesosActivos`) en
  `src/domain/criteriosBloque.ts`, con los **mismos códigos y mensajes** que `calcularPuntaje`
  (`BLOQUE_SIN_CRITERIOS`, `PESO_INVALIDO`, `PESOS_NO_SUMAN_100`). La pantalla puede mostrar «Suma actual: N/100»
  con la misma regla. **No se modificó `puntaje.ts` ni ningún tipo**; una prueba compara las dos funciones sobre
  9 casos × 2 bloques para que no se separen.
- **Supuestos confirmados** (no están en los docs): nombres únicos por nivel (áreas entre sí; especialidades
  dentro de su área; criterios dentro de su bloque), sin distinguir mayúsculas ni espacios de más
  (`NOMBRE_DUPLICADO`); **sin cascadas** al desactivar; la especialidad no cambia de área; sin límite de largo
  en los nombres.
- **Activación independiente (confirmada tras la entrega):** activar una especialidad solo valida su propio
  bloque; **no** exige que su área esté activa, y activar un área no activa ni desactiva sus especialidades.

### Qué se construyó

- `src/domain/criteriosBloque.ts` (+ prueba) y su reexportación en `src/domain/index.ts`.
- `src/services/catalogoEvaluacion/`: `comun.ts` (permiso, bloques de un área o especialidad, normalización de
  nombres, evento del catálogo), `areas.ts` y `especialidades.ts` (`crear*`, `editar*` y `cambiarActivo*`),
  `criterios.ts` (`guardarCriteriosDeBloque`) e `index.ts`: **7 servicios**.
- `src/services/pruebas/almacen.ts` (solo para tests): `prepararPrueba` y `sinEscritura`.
- Códigos nuevos en `MENSAJES`: `NOMBRE_DUPLICADO`, `CRITERIOS_INCOMPLETOS`, `CRITERIO_DE_OTRO_BLOQUE` y
  `ESPECIALIDAD_DE_OTRA_AREA`; los de bloque pasan con el mensaje del dominio.

### Decisiones de implementación

- **Orden:** Zod → actor → `puede('GESTIONAR_CRITERIOS_EVALUACION')` (solo Administrador, sin texto) → entidades →
  reglas propias (nombre único, bloque válido) → «sin cambios» → una sola escritura. Ningún servicio notifica
  (§8.1).
- **Eventos:** `AREA_TECNICA_*`, `ESPECIALIDAD_*` y `CRITERIO_*`, con `id_proyecto` nulo. Al guardar un bloque,
  **un evento por cambio**: `CRITERIO_CREADO` (con nombre, tipo, peso, obligatorio y activo), `CRITERIO_EDITADO`
  (solo nombre, tipo, peso y obligatorio) y `CRITERIO_ACTIVADO` o `CRITERIO_DESACTIVADO`; un criterio editado y
  activado a la vez deja dos eventos, en ese orden, y todos comparten el instante.
- **La especialidad no cambia de área:** `editarEspecialidad` usa una entrada estricta (`z.strictObject`); un
  campo de área en la entrada da `DATOS_INVALIDOS`.
- **El peso se valida solo en los criterios activos** (como `calcularPuntaje`): un criterio inactivo puede
  conservar un peso que no sirva, y la regla vuelve a exigirse al activarlo.
- **Las evaluaciones ya hechas no se tocan:** guardar un bloque deja `evaluaciones` y `detalles_evaluacion`
  intactos (cada detalle guarda su copia del nombre y el peso); una evaluación posterior usa los pesos nuevos.
- Los criterios nuevos se agregan al final de la colección; los demás conservan su lugar.

### Pruebas y mutaciones

- 142 pruebas nuevas (1.429 en 61 archivos en total): 32 de `validarBloqueCriterios` y su contraste con
  `calcularPuntaje`; 110 de los servicios (permisos de los siete, nombres duplicados por nivel, activación con
  bloque válido e inválido, el reparto de pesos en una sola operación, un evento por cambio, criterios
  incompletos o de otro bloque, evaluaciones que no se recalculan y el flujo crear área → crear especialidad →
  configurar bloques → activar → evaluar).
- **Mutaciones del agente (17, con `git add` previo y `git restore` después; todas detectadas y restauradas):**
  sin `puede()`; suma ≤ 100 aceptada; peso 0; peso decimal; omitir criterios existentes; un solo evento por
  bloque; activar un área y una especialidad con el bloque inválido; área y especialidad que nacen activas;
  nombres sensibles a mayúsculas; guardar el bloque borrando el desglose de las evaluaciones; aceptar criterios
  de otro bloque; guardar aunque no sume 100; `CRITERIO_EDITADO` cuando solo cambió `activo`; entrada no
  estricta en especialidad; bloque vacío con el dueño activo; nombre de especialidad único en todo el catálogo;
  sin `SIN_CAMBIOS`.

### Cierre del paso 7 (postulaciones y catálogo de evaluación)

- **Cuatro commits de código:** `42c0b25` y `debd47e` (7A), `3368603` y `5eb54a4` (7B); docs `801a992` (7A).
- **11 servicios nuevos:** 4 de postulaciones (evaluar, aprobar, rechazar y reconsiderar) y 7 del catálogo; más
  dos funciones puras de `domain/` (`puedeDecidirPostulacion` y `validarBloqueCriterios`), el puerto `evaluador`
  y `generarContrasena` en `Entorno`. 252 pruebas nuevas y 34 mutaciones detectadas de 34.

### Pendientes

- **Fase 5.1:** el editor de criterios llama a `guardarCriteriosDeBloque` con el bloque completo (se desactiva,
  no se borra), muestra «Suma actual: N/100» y solo ofrece activar un área o especialidad con su bloque válido.
- **Paso 8:** practicantes y supervisores (propuesta aparte).

---

## 2026-11-17 — [A+B] Fase 2, paso 8A: asignar, quitar, finalizar y reactivar practicantes

Commits de código: `861c5f3` (reglas de reactivación en `domain/`) y `df57b0d` (servicios de 8A); docs del paso 7B
`752aad3`. El paso 8 se parte en dos sub-pasos: **8A** (este: practicantes) y **8B** (supervisores, contraseñas y
aviso de fin de práctica).

### Decisiones aprobadas del paso 8 (todas en la opción A)

- **F1-A — «reasignar proyectos» del supervisor va en el paso 9.** Necesita escribir `Proyecto.id_supervisor`, el
  evento `PROYECTO_SUPERVISOR_CAMBIADO` y el aviso al nuevo supervisor, que son del módulo de proyectos. Se
  construirá `reasignarProyectosDeSupervisor` (encadena el cambio y registra `SUPERVISOR_PROYECTOS_REASIGNADOS`) junto
  con «cambiar supervisor». Descartado: una versión provisional en 8B que duplicaría lógica.
- **F2-A — asignar es una lista de pares, todo o nada.** `asignarPracticantes({ idActor, asignaciones: [{ idPracticante,
  idProyecto }] })` cubre el atajo de «Sin proyecto», varios proyectos para una persona y varios practicantes para un
  proyecto con una sola confirmación; si un par falla, no se guarda ninguno y el error señala cuál. Descartado: un
  servicio por par (un lote podría quedar a medias).
- **F3-A — al quitar, el aviso de salida más uno por cada tarea liberada.** Sigue la tabla de §8.1 («salida del
  proyecto» y «tarea liberada por otra persona») y la semilla; un practicante con 5 tareas recibe 6 avisos.
  Descartado: solo el de salida con el número de tareas en el mensaje.
- **F4-A — reactivar conserva la fecha de fin prevista.** Si ya venció, el Administrador la edita después con
  `editarDatosPractica`. Descartado: exigir una fecha nueva al reactivar (no está en la propuesta).
- **F5-A — editar datos de la práctica:** cualquier especialidad **activa** y el área pasa a ser la de la especialidad;
  fechas reales de calendario; `fecha_fin_prevista >= fecha_ingreso` comprobado con los valores que quedarían
  (también si solo cambia uno); el servicio **nunca recalcula el fin**: la pantalla puede proponerlo con
  `fechaFinPrevista` y enviar ambas fechas. Descartado: solo especialidades de la misma área y recalcular el fin al
  cambiar el ingreso (pisaría una fecha ajustada a mano).
- **F6-A — aviso previo de fin de práctica (se construye en 8B).** `emitirAvisosFinDePractica` es un servicio del
  sistema, idempotente, que avisa el día exacto en que `dias_restantes === PRACTICA_AVISO_FIN_DIAS` (fiel a §5.2); el
  cableado al iniciar sesión llega en el paso 10. Si ese día nadie lo ejecuta, el aviso se pierde (riesgo aceptado).
  Descartados: «ponerse al día» (distinto de la regla textual) y dejarlo fuera del paso.
- **F7-A — formato del celular (se aplica en 8B y se reutiliza en Mi perfil, paso 10):** nueve dígitos que empiezan
  con 9, como la semilla. Descartado: de 7 a 15 dígitos con «+» opcional.
- **Supuestos menores confirmados:** (1) se pueden editar los datos de la práctica de un practicante **finalizado**
  (corregir el historial); (2) restablecer la contraseña solo funciona con personas activas, y con un practicante
  finalizado el mensaje dice que primero se reactive (`USUARIO_OBJETIVO_INACTIVO`, en 8B); (3) un correo cambiado
  mantiene la unicidad sin distinguir mayúsculas ni espacios (8B).
- **E4-B como precedente:** las reglas de reactivación viven en `domain/` (nuevo `reactivacion.ts`), sin tocar
  `cicloVida.ts`, para que servicio y pantalla consulten la misma regla.

### Qué se construyó

- `src/domain/reactivacion.ts` (+ prueba) y su reexportación en `src/domain/index.ts`: `reactivarPractica` (nota
  obligatoria) y `reactivarSupervisor` (sin texto, para 8B), con los códigos `PRACTICANTE_NO_FINALIZADO` y
  `SUPERVISOR_YA_ACTIVO`, que traen su mensaje. Orden: `puede()` → estado → texto.
- `src/services/practicantes/`: `comun.ts` (`cargarPersona` y `liberarTareasDe`, la liberación de tareas que comparten
  quitar y finalizar), `asignaciones.ts` (`asignarPracticantes` y `quitarPracticante`), `ciclo.ts`
  (`finalizarPractica` y `reactivarPractica`), `datosPractica.ts` (`editarDatosPractica`) e `index.ts`.
- `src/services/cicloVida.ts`: `denegarCicloVida`, que convierte el resultado negativo de `domain/cicloVida.ts` y de
  `domain/reactivacion.ts` en un fallo con mensaje. **Hallazgo:** los 11 códigos de `CODIGOS_CICLO_VIDA` solo traían
  código (y a veces `cantidad`), sin mensaje, y el comentario de `resultado.ts` decía lo contrario. Ahora sus mensajes
  están en `MENSAJES` y la función agrega la cantidad donde corresponde («El supervisor tiene 2 proyectos activos o
  en pausa: reasígnalos antes de desactivarlo.»). Lo reutilizarán 8B y el paso 9.
- Códigos nuevos en `MENSAJES`: los 11 de ciclo de vida, `ESPECIALIDAD_INACTIVA` y `FIN_ANTES_DE_INGRESO`.
  `PRACTICANTE_NO_FINALIZADO` y `SUPERVISOR_YA_ACTIVO` traen el mensaje desde `domain/`.

### Decisiones de implementación

- **Orden:** Zod → actor → proyecto o persona → regla de `domain/` (`puede()` incluido) → texto ausente (`exigirTexto`)
  → reglas propias → una sola escritura. Igual que en tareas y postulaciones.
- **Asignar:** cada par pasa por `puedeAsignarPracticante`; la `fecha_alta` es `marca.hoy` (hora de Perú); el evento
  `PRACTICANTE_ASIGNADO_A_PROYECTO` tiene como elemento a la persona (no al proyecto), con `id_proyecto` y el cambio
  `proyecto` null → código, como la semilla; el aviso `ASIGNADO_A_PROYECTO` va **solo al practicante** (el supervisor
  no recibe nada) con el proyecto como elemento. Un par repetido da `DATOS_INVALIDOS` (`asignaciones.N`); un proyecto o
  practicante inexistente, `NO_ENCONTRADO`. Un proyecto en pausa admite asignaciones; uno finalizado, no.
- **Quitar:** da `fecha_baja` a la asignación, libera las tareas `EN_PROGRESO` **de ese proyecto** y registra
  `PRACTICANTE_QUITADO_DE_PROYECTO` (primero) y un `TAREA_LIBERADA` por tarea; el motivo es opcional (la matriz no lo
  exige) y se guarda recortado. Las tareas `ESPERANDO_SUPERVISION` se quedan con su responsable (riesgo D6-A ya anotado).
  Devuelve `{ asignacion, tareas_liberadas }`.
- **`liberarTareasDe`:** produce el mismo evento que `liberarTarea` (cambios `estado` y `responsable`); una prueba
  compara ambos. Si no hay tareas que liberar, ni se escribe la colección `tareas`.
- **Finalizar:** una sola escritura con la baja de **todas** las asignaciones vigentes (también en un proyecto
  finalizado), las tareas liberadas, `Usuario.estado = INACTIVO`, un solo `PRACTICANTE_FINALIZADO` sin proyecto (como
  la semilla) y los `TAREA_LIBERADA` (nota = motivo). El aviso `PRACTICA_FINALIZADA_CON_TAREAS_LIBERADAS` va **a cada
  supervisor, una vez por proyecto afectado**, con el proyecto como elemento para que el enlace lleve a él; el mensaje
  trae la cantidad en singular o plural. **La persona finalizada no recibe nada** (su acceso queda bloqueado).
- **Acceso bloqueado:** lo que bloquea es `Usuario.estado = INACTIVO`; `puede()` ya responde `USUARIO_INACTIVO`. El
  bloqueo real de la entrada a la aplicación llega con el paso 10, cuando `iniciarSesion` lea de `data/`.
- **Reactivar:** `Usuario.estado = ACTIVO` con `PRACTICANTE_REACTIVADO` (nota recortada); no reactiva asignaciones (queda
  «Sin proyecto») y no cambia la fecha de fin.
- **Editar datos:** exige al menos un dato; si la especialidad es la misma que la actual no se vuelve a validar (puede
  estar inactiva); el evento registra `especialidad` y `area` por nombre, y las fechas; sin avisos (§8.1).

### Pruebas y mutaciones

- 127 pruebas nuevas (1.556 en 67 archivos en total): 19 de `domain/reactivacion`; 32 de asignar y 17 de quitar (en
  `asignaciones.test.ts`, con permisos, éxito, lotes, todo o nada y errores); finalizar y reactivar (`ciclo.test.ts`,
  incluidos practicantes en tres proyectos con dos supervisores, plural del aviso, tareas esperando, proyecto
  finalizado y sin tareas); editar datos (fechas, bisiesto, especialidad, área); `denegarCicloVida` y el flujo.
- **Mutaciones del agente (28, con `git add` previo y `git restore` después; todas detectadas y restauradas):** 4 en
  `domain/reactivacion` (sin `puede()`, reactivar a un activo, sin la nota vacía, supervisor ya activo) y 24 en
  `services` (asignar ignora las existentes, `fecha_alta` en UTC, lote que no es todo o nada, sin aviso, aviso también al
  supervisor, quitar sin liberar o liberando otros proyectos, un solo evento de liberación, sin baja, motivo sin recortar,
  finalizar sin baja, cuenta sin `INACTIVO`, liberar las que esperan supervisión, aviso a la persona finalizada, sin
  exigir el motivo, evento con proyecto, reactivar reactivando asignaciones, sin exigir la nota, editar sin permiso, fin
  antes del ingreso, especialidad inactiva, área que no sigue a la especialidad, fin recalculado y mensajes sin
  cantidad). Una comprobación defensiva (los pares ya creados en el mismo lote) es equivalente: el esquema ya rechaza antes
  los pares repetidos; no se contó.
- La mutación de «liberar las tareas de otros proyectos» obligó a reforzar una prueba (una tarea `EN_PROGRESO` también en
  RSV): sin ella, la mutación sobrevivía.

### Cierre del «Listo cuando» de la Fase 2 (flujo por código)

- `src/services/practicantes/flujo.test.ts` recorre **aprobar postulación → asignar → crear tarea → tomar → quitar
  (tarea liberada) → asignar de nuevo → tomar → finalizar práctica → reactivar**, con los 12 eventos en orden, los
  autores correctos y los avisos esperados; comprueba además que con la cuenta bloqueada ya no puede tomar tareas.
  Junto con `src/services/tareas/flujo.test.ts` (crear tarea → tomar → enviar → aprobar → crear PR) cubre el flujo
  completo que pide el plan §9. Quedan las pruebas por servicio de los pasos 8B a 11, el alcance por rol y los efectos
  en cascada de proyectos.

### Pendientes

- **8B:** supervisores (crear, editar, desactivar, reactivar), `restablecerContrasena` y `emitirAvisosFinDePractica`.
- **Paso 9:** `reasignarProyectosDeSupervisor` y «cambiar supervisor» (F1-A); `finalizarProyecto` con sus efectos.
- **Paso 10:** `iniciarSesion` lee de `data/` para que `INACTIVO` bloquee de verdad; `emitirAvisosFinDePractica` al
  iniciar sesión.
- **Fase 5.2:** «Asignar a proyecto» con una lista de pares; el aviso previo a finalizar («Tiene N tareas en progreso
  que serán liberadas») sale del dominio; una fecha de fin vencida tras reactivar aparece como alerta (F4-A).

---

## 2026-11-17 — [A+B] Fase 2, paso 8B: supervisores, contraseñas y aviso de fin de práctica (cierra el paso 8)

Commit de código: `a52fe0c` (solo `services/`; usa las reglas de `domain/` que ya existían). Docs de 8A: `14e94cb`.

### Decisiones del paso 8 que se aplican aquí

- **F6-A — aviso previo de fin de práctica.** `emitirAvisosFinDePractica` es un servicio del sistema (autor
  `SISTEMA`, sin actor), idempotente, que avisa **el día exacto** en que `dias_restantes === PRACTICA_AVISO_FIN_DIAS`
  (`situacionFinPractica`, día de Perú). Si ese día nadie lo ejecuta, el aviso se pierde (riesgo aceptado). El cableado
  al iniciar sesión es del paso 10.
- **F7-A — celular:** nueve dígitos que empiezan con 9 (`esquemaCelular`), como la semilla. Queda en
  `src/services/cuentas/validaciones.ts` junto con `esquemaCorreo` y `correoEnUso`, para que Mi perfil (paso 10) los
  reutilice.
- **F1-A (sin cambios):** `reasignarProyectosDeSupervisor` **no** se construyó aquí; va en el paso 9 junto con
  «cambiar supervisor». Mientras tanto, `desactivarSupervisor` solo responde `SUPERVISOR_CON_PROYECTOS`.
- **Supuestos menores confirmados:** (1) se puede editar a un supervisor **inactivo**, igual que los datos de un
  practicante finalizado; (2) `restablecerContrasena` solo funciona con personas **activas**
  (`USUARIO_OBJETIVO_INACTIVO`, con el mensaje «reactívala antes de restablecer su contraseña»); (3) el correo es único
  **sin distinguir mayúsculas ni espacios**, tanto al crear como al editar (la propia persona no choca consigo misma).
- **E4-B como precedente:** `domain/` no cambia en este sub-paso: `reactivarSupervisor` (8A) y `desactivarSupervisor`
  (paso 10 de la Fase 1) ya existían.

### Qué se construyó

- `src/services/supervisores/supervisores.ts` (+ `index.ts`): `crearSupervisor`, `editarSupervisor`,
  `desactivarSupervisor` y `reactivarSupervisor`.
- `src/services/cuentas/`: `restablecerContrasena.ts`, `validaciones.ts` e `index.ts`. El paso 10 sumará aquí el
  cambio de contraseña propia.
- `src/services/practicantes/avisoFin.ts`: `emitirAvisosFinDePractica`.
- `src/services/transaccional.ts`: `SalidaOperacion` admite ahora `cambios: null` («éxito sin nada que escribir»).
  `ejecutarServicio` ya devolvía lo que recibía a `transaccion`, que con `null` no escribe; solo cambió el tipo y su
  documentación (y una prueba).
- `src/services/resultado.ts`: `USUARIO_OBJETIVO_INACTIVO` (nuevo) y `CORREO_YA_REGISTRADO` pasa a un texto general
  («Ya existe una cuenta con ese correo.»), porque ya no es solo de postulaciones.
- `src/services/index.ts` reexporta todo lo anterior.

### Decisiones de implementación

- **Orden:** Zod → actor → persona → regla de `domain/` o `puede()` → reglas propias (correo, estado) → una sola
  escritura. Ninguna de estas acciones notifica a nadie (§8.1), salvo el aviso previo, que es del sistema.
- **`crearSupervisor`:** crea `Usuario` (rol SUPERVISOR, activo, `debe_cambiar_contrasena: true`) y el detalle
  `Supervisor` (Discord y GitHub en `null`), con `SUPERVISOR_CREADO` (cambios: nombre y correo). La contraseña temporal
  (`entorno.generarContrasena`) vuelve **una sola vez** en el resultado y nunca va al historial. Un supervisor nuevo no
  tiene proyectos (el estado vacío del panel).
- **`editarSupervisor`:** solo nombre y correo (una credencial que entrega la empresa); exige al menos uno; sin cambios
  reales responde `SIN_CAMBIOS`; el evento registra las diferencias con `diferencias(..., ['nombre', 'correo'])`, que
  nunca incluye contraseñas.
- **`desactivarSupervisor` y `reactivarSupervisor`:** usan las reglas del dominio y `denegarCicloVida`. El mensaje trae la
  cantidad de proyectos pendientes («1 proyecto activo o en pausa» / «2 proyectos activos o en pausa»); los proyectos
  finalizados no cuentan; un supervisor nunca se elimina. Reactivar no pide texto.
- **`restablecerContrasena`:** un solo servicio para practicantes y supervisores (el tipo de evento sale del rol);
  solo el Administrador; a un administrador responde `FUERA_DE_ALCANCE`; el permiso se comprueba antes que el estado de
  la persona. **El evento no lleva «cambios»:** el historial rechaza cualquier campo cuyo nombre contenga «contraseña»,
  también `debe_cambiar_contrasena`. No se compara con la contraseña anterior (con 10 caracteres aleatorios la
  coincidencia no se considera).
- **`emitirAvisosFinDePractica`:** recorre los practicantes **activos**; avisa al practicante, a los supervisores de sus
  proyectos con asignación vigente (sin repetir) y a los administradores, solo a cuentas activas; el mensaje es el de la
  semilla («La práctica de X finaliza el AAAA-MM-DD.») y lleva la fecha de fin, por lo que, si el Administrador mueve esa
  fecha, el aviso puede darse de nuevo. Un aviso con el mismo tipo, persona y mensaje no se repite. No deja eventos en el
  historial y, si no hay nada nuevo, **no escribe nada** (`cambios: null`), de modo que llamarlo en cada inicio de sesión
  no toca el almacenamiento del navegador. Una configuración rota responde `CONFIGURACION_INVALIDA` o `AVISO_INVALIDO`.
- **Hallazgo de la semilla:** `usr-pra-15` queda a 15 días de su fin; al día siguiente de cargar la semilla recibirá su
  aviso previo. Las pruebas lo tienen en cuenta.

### Pruebas y mutaciones

- 105 pruebas nuevas (1.661 en 71 archivos en total): permisos y datos de los cuatro servicios de supervisores (con tabla
  común), crear (cuenta, detalle, evento, contraseña ausente del historial, correo repetido con otras mayúsculas y con
  espacios, celular y nombre inválidos), editar (nombre, correo, ambos, sin cambios, propio correo, otro supervisor
  inactivo), desactivar (con proyectos activos, en pausa, finalizados, ya inactivo) y reactivar; restablecer contraseña
  (practicante, supervisor, inactivo, administrador, permiso antes que estado, contraseña fuera del historial);
  `emitirAvisosFinDePractica` (día exacto, un día antes y después, idempotencia, fecha movida, supervisores
  distintos, bajas, cuentas inactivas, configuración, hora de Perú, «sin escribir»); validaciones; y `cambios: null` en
  `ejecutarServicio`.
- **Mutaciones del agente (27, con `git add` previo y `git restore` después; todas detectadas y restauradas):** crear sin
  `puede()`, sin marcar la contraseña como temporal, con el rol equivocado, sin comprobar el correo, sin el detalle, con
  la contraseña en el historial; editar con el correo chocando consigo mismo, sin permiso y sin `SIN_CAMBIOS`; desactivar
  ignorando los proyectos y sin dejar la cuenta inactiva; reactivar sin dejarla activa; restablecer sin permiso, a
  personas inactivas, sin marcar el cambio obligatorio, sin cambiar la contraseña, con el evento equivocado y con la
  contraseña en el historial; aviso en cualquier día del periodo, sin evitar repetidos, sin el Administrador, a
  practicantes finalizados, a supervisores de proyectos ya dejados y escribiendo aunque no haya avisos; `cambios: null`
  que escribe igual; celular sin exigir el 9 y correo repetido sensible a mayúsculas. Se descartó la mutación «contraseña
  igual a la anterior» por lo dicho arriba.

### Cierre del paso 8 (practicantes y supervisores)

- **Tres commits de código:** `861c5f3` y `df57b0d` (8A), `a52fe0c` (8B); docs de 8A `14e94cb`.
- **11 servicios:** 5 de practicantes (asignar, quitar, finalizar, reactivar y editar datos de la práctica) y 6 de
  supervisores y cuentas (crear, editar, desactivar, reactivar, restablecer contraseña y aviso de fin de práctica), más
  las reglas de reactivación de `domain/` y `denegarCicloVida`. 232 pruebas nuevas y 55 mutaciones detectadas de 55.
- **Qué queda de lo que toca a personas:** `reasignarProyectosDeSupervisor` (paso 9), el bloqueo real del acceso y el
  aviso previo al iniciar sesión (paso 10) y las consultas con alcance por rol (paso 11).

### Pendientes

- **Paso 9:** servicios de proyectos, con «cambiar supervisor» y `reasignarProyectosDeSupervisor` (F1-A); la reactivación de
  un proyecto debe exigir un supervisor activo; `finalizarProyecto` con sus efectos y avisos al equipo.
- **Paso 10:** `iniciarSesion` lee de `data/` (así `INACTIVO` bloquea de verdad) y llama a `emitirAvisosFinDePractica`; Mi
  perfil reutiliza `esquemaCorreo`, `esquemaCelular` y `correoEnUso`; el cambio de contraseña propia va en
  `src/services/cuentas/` y no deja la contraseña en el historial.
- **Paso 11:** consultas con alcance por rol para las pantallas de practicantes y supervisores.
- **Fase 5.3:** «Nuevo supervisor» y «Restablecer contraseña» muestran la contraseña temporal una sola vez; desactivar
  muestra el mensaje con la cantidad de proyectos.

---

## 2026-11-18 — [A+B] Fase 2, paso 9A: crear y editar proyectos, reunión y enlaces

Commit de código: `30b27ab` (solo `services/`; `domain/` no cambia). Docs de 8B: `cdbbb26`. El paso 9 se parte en
dos sub-pasos: **9A** (este: datos del proyecto) y **9B** (ciclo de vida y supervisor, con una regla nueva de `domain/`).

### Decisiones aprobadas del paso 9 (todas en la opción A)

- **G1-A — forma de `repositorio_url`:** `https://github.com/{organización}/{repositorio}`, sin «/» final ni «.git»
  (`esquemaRepositorio`). La URL de cada Pull Request se arma con él (`${repositorio_url}/pull/N`, en `github.ts` y en
  la semilla), así que una dirección con «/» final o de otro sitio produciría PR mal formados. Descartado: cualquier
  URL http(s).
- **G2-A — reactivar un proyecto no avisa.** §8.1 no lo lista y no existe un tipo `PROYECTO_REACTIVADO`; no se
  reutiliza `PROYECTO_REANUDADO` ni se cambia el contrato de `domain/`. Los autores pueden sumar esa fila a §8.1 más
  adelante. (Se aplica en 9B.)
- **G3-A — reunión semanal:** se puede definir, cambiar y **quitar** (día y hora juntos, o los dos en `null`); cada
  cambio avisa al equipo, también al quitarla («quedó sin definir»). Descartado: no poder quitarla.
- **G4-A — `reasignarProyectosDeSupervisor` (9B):** una lista atómica (todo o nada) de proyectos no finalizados del
  supervisor; la pantalla propone todos los activos o en pausa. Descartado: exigir reasignar todos desde el servicio.
- **Supuestos menores confirmados:** (1) el nombre del proyecto es editable por el Administrador (el historial
  conserva la etiqueta anterior); (2) `fecha_fin_prevista ≥ fecha_inicio`; (3) la rama base no lleva espacios; (4) los
  enlaces se pueden quitar de verdad (el evento `PROYECTO_ENLACE_QUITADO` deja el rastro); (5) un nombre de proyecto
  repetido se permite (solo el código es único); (6) cambiar el repositorio no recalcula las URL de PR ya guardadas.
- **E4-B como precedente (para 9B):** la regla de estado de pausar, reanudar y reactivar va en un archivo nuevo de
  `domain/` (`estadoProyecto.ts`), sin tocar `cicloVida.ts` ni `reactivacion.ts`.

### Qué se construyó

- `src/services/proyectos/`:
  - `comun.ts`: `cargarContextoProyecto`, **`equipoDelProyecto`** (supervisor y practicantes **activos** con asignación
    vigente, sin repetidos; `crearNotificaciones` descarta después a quien hizo la acción), `textoReunion`
    («lunes a las 10:00»), `eventoDeProyecto` y `reemplazarProyecto`.
  - `esquemas.ts`: esquemas Zod reutilizables por los formularios de la Fase 5.4 (nombre, descripción, fechas de
    calendario, repositorio, rama base, día y hora de reunión, y enlaces) y `exigirReunionCompleta`.
  - `datos.ts`: `crearProyecto`, `editarDatosProyecto` y `cambiarRamaBase`; `reunion.ts`: `definirReunion`;
    `enlaces.ts`: `agregarEnlace`, `editarEnlace` y `quitarEnlace`; e `index.ts`.
- `src/services/resultado.ts`: `CODIGO_INMUTABLE` y `FIN_ANTES_DE_INICIO`. Los códigos de `validarCodigoProyecto` traen
  su mensaje desde `domain/`.
- `src/services/index.ts` reexporta los siete servicios, los esquemas y las dos piezas reutilizables.

### Decisiones de implementación

- **Orden:** Zod → actor → proyecto → `puede()` → reglas propias → «sin cambios» → una sola escritura.
- **`crearProyecto`** (solo el Administrador): el supervisor debe existir, ser SUPERVISOR y estar ACTIVO
  (`SUPERVISOR_NO_VALIDO`: «siempre con un supervisor activo», §5.4). El código se valida con **`validarCodigoProyecto`**
  contra los códigos de **todos** los proyectos (también los finalizados) y **tal como llega**: no se recorta ni se pasa
  a mayúsculas (`tmv` y ` TMV ` fallan; lo normaliza la pantalla); el error sale con el mensaje del dominio y en
  `campos.codigo`. El proyecto nace ACTIVO, sin equipo, con `ultimo_numero_tarea: 0` y `fecha_fin_real: null`; deja
  `PROYECTO_CREADO` (con el supervisor como cambio) y un aviso `ASIGNADO_A_PROYECTO` al supervisor («Te asignaron como
  supervisor del proyecto X.», como la semilla). Con reunión opcional (día y hora juntos) no hay aviso extra: el equipo
  está vacío.
- **`editarDatosProyecto`** (solo el Administrador, también con el proyecto FINALIZADO): nombre, descripción, fechas y
  repositorio. **El código no cambia nunca:** uno distinto da `CODIGO_INMUTABLE`; uno igual se ignora (un formulario puede
  mandarlo todo); si solo viene el código, `DATOS_INVALIDOS`. `fecha_fin_prevista ≥ fecha_inicio` se comprueba con los
  valores que quedarían (también si solo cambia una). Un cambio de nombre, descripción o fechas es `PROYECTO_EDITADO`
  y uno de repositorio, `PROYECTO_REPOSITORIO_CAMBIADO`, con el mismo instante. No avisa a nadie (§8.1) y no toca las
  tareas.
- **`cambiarRamaBase`** (Administrador y Supervisor del proyecto, también con el proyecto FINALIZADO):
  `PROYECTO_RAMA_BASE_CAMBIADA`; la misma rama es `SIN_CAMBIOS`.
- **`definirReunion`** (Administrador y Supervisor del proyecto, también con el proyecto FINALIZADO): el evento guarda
  el valor anterior y el nuevo como texto («lunes a las 10:00», `null` si no hay); el aviso `REUNION_SEMANAL_CAMBIADA`
  va al equipo sin quien lo hizo (si lo define el Supervisor, no se avisa a sí mismo; el Administrador no es del equipo).
- **Enlaces** (Administrador y Supervisor del proyecto, también con el proyecto FINALIZADO): nombre y dirección http(s)
  (`javascript:` y `ftp:` se rechazan); un enlace de otro proyecto es `NO_ENCONTRADO`; ninguno avisa a nadie. Quitar borra
  el enlace (es configuración; el evento deja el rastro).
- **Hallazgo de la semilla:** `pry-pl2d` ya tiene `ultimo_numero_tarea: 21` y rama base `develop`; las pruebas leen los
  valores de la semilla en vez de suponerlos.

### Pruebas y mutaciones

- 164 pruebas nuevas (1.825 en 75 archivos en total): esquemas (repositorio, rama, hora, día, fechas, enlaces y reunión
  completa); crear (éxito exacto, código repetido también contra un finalizado, sin normalizar, supervisor inexistente,
  inactivo o de otro rol, fechas, reunión incompleta, y que el proyecto nuevo ya sirve para asignar y crear una tarea
  `TMV-001`); editar (los dos eventos con el mismo instante, `CODIGO_INMUTABLE`, un proyecto finalizado, fechas con una
  sola cambiada); rama base; reunión (definir, cambiar, quitar, equipo sin bajas ni cuentas inactivas, autor excluido); y
  enlaces (permisos de los tres, otro proyecto, direcciones inválidas).
- **Mutaciones del agente (31, con `git add` previo y `git restore` después; todas detectadas y restauradas):** crear
  sin `puede()`, sin comprobar el código, normalizándolo, con supervisor inactivo o que no lo es, con el contador o el
  estado equivocados, sin avisar y con el fin antes del inicio; editar aceptando el código, sin permiso, sin el evento de
  repositorio, con el fin antes del inicio y sin `SIN_CAMBIOS`; rama base sin permiso y sin `SIN_CAMBIOS`; reunión sin
  permiso, avisando al autor, con practicantes dados de baja o cuentas inactivas en el equipo, sin avisar al quitarla y
  sin `SIN_CAMBIOS`; enlaces sin permiso y de otro proyecto (editar y quitar); y los esquemas (repositorio con «/» o
  «.git», hora 24:xx, rama con espacios, protocolo de enlace y reunión con día sin hora).

### Pendientes

- **9B:** reglas de estado en `domain/` (`estadoProyecto.ts`) y `cambiarSupervisor`, `reasignarProyectosDeSupervisor`,
  `pausarProyecto`, `reanudarProyecto`, `finalizarProyecto` y `reactivarProyecto` (exige supervisor activo, sin aviso).
- **Fase 5.4:** los formularios usan los esquemas de `esquemas.ts` y envían el código ya en mayúsculas y sin espacios;
  el error del código se muestra en su campo; editar no ofrece el código; la reunión se quita enviando día y hora vacíos.
- **Autores, a mano en `docs/`:** propuesta §5.4 con los supuestos del paso 9 (repositorio, rama base, reunión y enlaces
  editables en un proyecto finalizado, quitar la reunión avisa, reactivar no avisa). **Actualización (2026-11-18):** hecho por los autores en `3d6f019` (PR #27, fusionado en `6cdd2fb`). Lo de la reunión y los
  enlaces en un proyecto finalizado ya estaba escrito en §5.4.

---

## 2026-11-18 — [A+B] Fase 2, paso 9B: cambiar supervisor, pausar, reanudar, finalizar y reactivar proyectos (cierra el paso 9)

Commits de código: `e15e4f5` (reglas de estado en `domain/`) y `12efa20` (servicios de 9B). Docs de 9A: `a3b124f`.

### Decisiones del paso 9 que se aplican aquí

- **G2-A — reactivar un proyecto no avisa.** §8.1 no lo lista y no existe un tipo `PROYECTO_REACTIVADO`; no se reutiliza
  `PROYECTO_REANUDADO` ni se cambia el contrato de `domain/`. El equipo recupera su acceso porque las asignaciones nunca se
  cerraron. Los autores pueden sumar esa fila a §8.1.
- **G4-A — `reasignarProyectosDeSupervisor`:** una lista atómica (todo o nada) de pares `{ idProyecto, idNuevoSupervisor }`
  de proyectos **no finalizados** del supervisor indicado; el servicio no exige reasignar todos (la pantalla propone todos
  los activos y en pausa). Cumple F1-A: es el atajo que permite desactivar a un supervisor con proyectos.
- **E4-B como precedente:** la regla de estado vive en `domain/` (`estadoProyecto.ts`), en un archivo aparte y sin tocar
  `cicloVida.ts` ni `reactivacion.ts`, para que servicio y pantalla consulten la misma regla.

### Qué se construyó

- `src/domain/estadoProyecto.ts` (+ prueba) y su reexportación en `src/domain/index.ts`:
  - `puedePausarProyecto` (ACTIVO → EN_PAUSA), `puedeReanudarProyecto` (EN_PAUSA → ACTIVO) y
    `puedeReactivarProyecto(usuario, proyecto, supervisor, texto?)` (FINALIZADO → ACTIVO, exigiendo un supervisor
    SUPERVISOR y ACTIVO). Las tres piden una nota y siguen el orden `puede()` → estado → (reactivar) supervisor → nota.
  - `accionesDeEstadoDisponibles(estado)`: los botones que la pantalla puede mostrar (activo: pausar y finalizar; en
    pausa: reanudar y finalizar; finalizado: reactivar).
  - Códigos propios con su mensaje: `PROYECTO_NO_ACTIVO`, `PROYECTO_NO_EN_PAUSA`, `PROYECTO_NO_FINALIZADO` y
    `SUPERVISOR_DEL_PROYECTO_INACTIVO`. Finalizar sigue en `cicloVida.ts` (`finalizarProyecto`, del paso 10 de la Fase 1).
- `src/services/proyectos/estado.ts`: `pausarProyecto`, `reanudarProyecto`, `finalizarProyecto` y `reactivarProyecto`.
- `src/services/proyectos/supervisor.ts`: `cambiarSupervisor` y `reasignarProyectosDeSupervisor`.
- `src/services/cicloVida.ts`: `denegarCicloVida` acepta también los errores de estado de proyecto.
- `src/services/resultado.ts`: `PROYECTO_NO_ES_DEL_SUPERVISOR`. Los cuatro códigos de estado traen su mensaje desde `domain/`.

### Decisiones de implementación

- **Orden:** Zod → actor → proyecto → regla de `domain/` (`puede()` incluido) → nota ausente (`exigirTexto`) → una sola
  escritura. Solo el Administrador; las cuatro acciones de estado exigen **nota**.
- **Pausar y reanudar:** cambian el estado y dejan `PROYECTO_PAUSADO` o `PROYECTO_REANUDADO` con `estado` anterior y nuevo
  y la nota recortada; avisan al equipo (supervisor y practicantes activos con asignación vigente, sin quien actúa; el
  Administrador no es del equipo). No tocan tareas ni asignaciones.
- **Finalizar** (desde ACTIVO o EN_PAUSA, con `finalizarProyecto` de `domain/cicloVida.ts`): se bloquea con tareas
  ESPERANDO_SUPERVISION y el mensaje trae la cantidad («2 tareas esperando supervisión», «1 tarea…»); libera las
  EN_PROGRESO con un `TAREA_LIBERADA` por cada una (nota = la del cierre) y fija `fecha_fin_real` con el día de Perú
  (`marca.hoy`, vía el dominio). **No cierra las asignaciones.** Eventos: `PROYECTO_FINALIZADO` (cambios `estado` y
  `fecha_fin_real`) primero y luego las liberaciones. Avisos: `PROYECTO_FINALIZADO` al equipo y `TAREA_LIBERADA` a cada
  responsable (misma regla F3-A que al quitar a un practicante). No se escribe la colección `tareas` si no hay nada que
  liberar. Con el proyecto finalizado, `puede()` deniega las acciones de tareas a todos (`PROYECTO_FINALIZADO`).
- **Reactivar:** vuelve a ACTIVO y deja `fecha_fin_real` en `null`; evento `PROYECTO_REACTIVADO` con los dos cambios y la
  nota; **sin avisos** (G2-A). Un supervisor inactivo (un proyecto finalizado puede haberlo quedado, porque desactivar a un
  supervisor ignora los proyectos finalizados) da `SUPERVISOR_DEL_PROYECTO_INACTIVO`: hay que reactivar primero al
  supervisor. Las tareas liberadas al finalizar se quedan DISPONIBLES.
- **`cambiarSupervisor`:** `puedeCambiarSupervisor` (solo Administrador; no un proyecto finalizado; el nuevo debe ser un
  supervisor ACTIVO y distinto). El supervisor es un dato del proyecto, así que las tareas que esperan supervisión pasan al
  nuevo sin tocarlas. Evento `PROYECTO_SUPERVISOR_CAMBIADO` (supervisor anterior → nuevo, por nombre); avisos
  `ASIGNADO_A_PROYECTO` al nuevo y `QUITADO_DE_PROYECTO` al anterior (§8.1).
- **`reasignarProyectosDeSupervisor`:** comparte con `cambiarSupervisor` la pieza interna (`aplicarCambio`: evento y avisos
  por proyecto) y deja además un `SUPERVISOR_PROYECTOS_REASIGNADOS` sobre el supervisor saliente (con los códigos de los
  proyectos). Un proyecto repetido en la lista es `DATOS_INVALIDOS`; uno que no es del supervisor,
  `PROYECTO_NO_ES_DEL_SUPERVISOR` (con `campos` `reasignaciones.N`); el permiso y las reglas del dominio se comprueban antes
  que la pertenencia.
- **Hallazgo de las pruebas:** en las pruebas de «sin nota», un parámetro por defecto del ayudante convertía `undefined` en
  una nota válida; se corrigió y las cuatro pruebas pasaron a detectar la falta de nota.

### Pruebas y mutaciones

- 117 pruebas nuevas (1.942 en 79 archivos en total): 35 de la regla de `domain/` (rejilla estado × acción, nota, supervisor
  activo y botones) y 82 de los servicios (permisos de las cuatro acciones de estado con tabla común, éxito exacto de
  cada una, bloqueo con tareas esperando y su cantidad, finalizar desde la pausa, sin tareas en progreso, fecha real en
  hora de Perú, reactivar con supervisor inactivo, cambiar supervisor y reasignar, todo o nada); y la prueba de flujo
  **crear proyecto → asignar → tareas → pausar → finalizar → reasignar → desactivar al supervisor → reactivar el
  proyecto (falla) → reactivar al supervisor → reactivar el proyecto → el practicante vuelve a tomar la tarea**.
- **Mutaciones del agente (33, con `git add` previo y `git restore` después; todas detectadas y restauradas):** 11 en
  `domain/estadoProyecto` (pausar, reanudar y reactivar sin `puede()`; cada acción desde un estado que no corresponde;
  reactivar con el supervisor inactivo y con una cuenta que no es de supervisor; pausar sin exigir la nota vacía;
  estado nuevo equivocado y botones) y 22 en `services` (ignorar la regla del dominio, sin exigir la nota ausente en las
  cuatro acciones, sin avisar al equipo, finalizar sin liberar, cerrando las asignaciones, con la fecha real en UTC y sin
  avisar al equipo ni al responsable, reactivar sin limpiar la fecha real, avisando y mirando a la persona equivocada
  como supervisor, cambiar supervisor sin la regla, sin cambiar el supervisor y sin avisar al nuevo o al anterior, y
  reasignar que no es todo o nada, de otro supervisor, con el evento equivocado, sin el evento de cada proyecto y con el
  mismo proyecto dos veces). Una mutación sobre el autor del aviso de pausar y reanudar no se contó: el Administrador nunca
  es del equipo, así que no tiene efecto observable (el autor excluido sí se prueba en `definirReunion`).

### Cierre del paso 9 (servicios de proyectos)

- **Tres commits de código:** `30b27ab` (9A), `e15e4f5` y `12efa20` (9B); docs de 9A `a3b124f`.
- **13 servicios:** 7 de datos (crear, editar, rama base, reunión y tres de enlaces) y 6 de estado y supervisor (cambiar
  supervisor, reasignar, pausar, reanudar, finalizar y reactivar), más la regla de `domain/estadoProyecto.ts`, los esquemas
  reutilizables para la Fase 5.4 y `equipoDelProyecto`. 281 pruebas nuevas y 64 mutaciones detectadas de 64.
- **Pendientes del plan que se cierran:** `reasignarProyectosDeSupervisor` (F1-A), `finalizarProyecto` con sus efectos y
  avisos, `reactivarProyecto` exigiendo supervisor activo y el uso de `validarCodigoProyecto` en el servicio (9A).
- **Con esto terminan los servicios de los módulos de negocio del Bloque 3** (postulaciones, catálogo de evaluación,
  practicantes, supervisores y proyectos). Quedan el paso 10 (cuenta y configuración) y el 11 (consultas con alcance por rol).

### Pendientes

- **Paso 10:** `iniciarSesion` lee de `data/` (así `INACTIVO` bloquea de verdad) y llama a `emitirAvisosFinDePractica`; Mi
  perfil reutiliza `esquemaCorreo`, `esquemaCelular` y `correoEnUso`; el cambio de contraseña propia va en
  `src/services/cuentas/` y no deja la contraseña en el historial; marcar insight revisado, notificar desde un insight,
  marcar notificaciones leídas y la configuración.
- **Paso 11:** consultas con alcance por rol para las pantallas (proyectos, tareas, practicantes, supervisores e insights).
- **Fase 5.3:** la pantalla propone reasignar todos los proyectos activos o en pausa del supervisor antes de desactivarlo.
- **Fase 5.4:** los botones de estado salen de `accionesDeEstadoDisponibles`; reactivar avisa que primero hay que reactivar
  al supervisor si está inactivo; finalizar muestra el bloqueo por tareas esperando o la cantidad de tareas que se liberan;
  reactivar no avisa al equipo (G2-A).

## 2026-11-18 — [A+B] Fase 2, paso 10: cuenta propia, seguimiento y configuración (cierra los servicios de la Fase 2)

Paso partido en tres sub-pasos, cada uno con su parada y su commit: **10A** (acceso, Mi perfil y contraseña propia),
**10B** (insights y notificaciones) y **10C** (configuración y datos de demostración, en dos commits: la regla en
`domain/` y los servicios). Commits de código: `d8f89b4`, `84c438d`, `185c6ae` y `66ff605`.

### Decisiones del plan (aprobadas por los autores)

- **Partición en tres sub-pasos** (la alternativa era dos, mezclando cuenta, acceso y seguimiento en el primero; se descartó
  por el tamaño del diff).
- **Marcar notificaciones como leídas, sin acción nueva en `puede()`:** la matriz de §4 no tiene una fila para esto, así que
  la matriz de las 55 acciones de la Fase 1 no cambia. El servicio exige que quien actúa exista y esté ACTIVO
  (`USUARIO_INACTIVO` si no) y que la notificación sea suya; una ajena responde `NO_ENCONTRADO`, igual que una
  inexistente, para no revelar que está. Son idempotentes: si ya estaba leída, o no había nada pendiente, devuelven éxito
  con `cambios: null` (sin escribir, ni siquiera en el navegador). Se descartó agregar `MARCAR_NOTIFICACION_LEIDA` a
  `puede()`: cumpliría «toda acción pasa por `domain/permisos`», pero cambiaría un contrato probado que la propuesta no pide.
- **Discord y GitHub en Mi perfil:** §8.2 dice que «se escriben como nombre de usuario» sin más formato. Se valida solo que
  no tengan espacios y un largo máximo de **32** (Discord) y **39** (GitHub); vacío o `null` quita el dato. No se inventan
  las reglas estrictas de cada plataforma (se descartaron por no estar en la propuesta).
- **«Notificar» desde un insight:** el aviso lleva un **texto automático** (`título. motivo` del insight) y no hay un campo
  libre, porque §8.1 y §5.6 no lo definen. Inactividad avisa al practicante (el aviso apunta a su usuario); supervisión
  demorada avisa al supervisor del proyecto de la tarea y el aviso apunta a la **tarea** (elemento `TAREA`). Se puede avisar
  más de una vez por el mismo insight (la propuesta no pone un límite) y también uno ya revisado.
- **Proporción de la nota (`100/0` y `0/100`):** se aceptan enteros de **0 a 100 que sumen 100**, como ya dejaba escrito el
  paso 7. No se impone un mínimo mayor que 0 porque la propuesta no lo define; si lo quieren, es una decisión de los autores.
- **Desacople de la sesión al restablecer los datos:** `restablecerDatosDemostracion` devuelve `{ usuario: SesionUsuario |
  null }` y la pantalla lo aplica; `services/` no importa el almacén de sesión. `usuario` es la copia del actor en la semilla
  nueva si sigue existiendo y está ACTIVO; si no, `null` y la pantalla cierra la sesión. Cumple el contrato que dejó el paso 3.

### Qué se construyó

- **10A, `src/services/cuentas/`:**
  - `sesion.ts`: `iniciarSesion`, `accesoRapido` y `aSesionUsuario` (el tipo `SesionUsuario`, sin contraseña, estado ni
    celular). Reemplazan a `CUENTAS_DEMO`, `auth/usuariosDemo.ts` y `auth/iniciarSesion.ts`, que se retiraron.
    `src/data/index.ts` exporta `ID_ADMIN`, `ID_SUPERVISOR_DEMO`, `ID_PRACTICANTE_DEMO` y `CONTRASENA_DEMO`;
    `auth/sesionDePrueba.ts` es solo para tests.
  - `perfil.ts`: `editarMiPerfil`. `contrasenaPropia.ts`: `cambiarMiContrasena` y `LARGO_MINIMO_CONTRASENA`.
  - Códigos nuevos: `CREDENCIALES_INVALIDAS`, `CONTRASENA_ACTUAL_INCORRECTA` y `CONTRASENA_IGUAL_A_LA_ACTUAL`.
  - `PaginaAcceso` llama a los servicios (su demora propia de 300 ms se retiró; sus pruebas esperan hasta 3 s porque el
    servicio simula 600 ms).
- **10B, `src/services/seguimiento/`:** `comun.ts` (`umbralesDe` y `calcularInsightsVigentes`), `insights.ts`
  (`marcarInsightRevisado` y `notificarDesdeInsight`) y `notificaciones.ts` (`marcarNotificacionLeida` y
  `marcarTodasLeidas`). Código nuevo: `INSIGHT_YA_REVISADO`.
- **10C parte 1, `src/domain/configuracionValidacion.ts`:** `validarSeccionConfiguracion`, `clavesDeSeccion` y los códigos
  `PARAMETRO_INVALIDO`, `VALOR_NO_ENTERO`, `VALOR_FUERA_DE_RANGO`, `BANDA_MINIMO_NO_MENOR` y `PROPORCION_NO_SUMA_100`
  (los de Seguimiento siguen siendo `UMBRAL_INVALIDO`, de `validarUmbrales`).
- **10C parte 2, `src/services/configuracion/`:** `comun.ts` (`aplicarSeccion`, el núcleo), `configuracion.ts`
  (`guardarConfiguracionSeccion` y `restaurarSeccionConfiguracion`) y `restablecer.ts` (`restablecerDatosDemostracion`).
  `AlmacenServicio` pasó a exponer `restablecer` además de `transaccion`, y `etiquetas.ts` ganó `etiquetaParametro`.

### Decisiones de implementación

- **Acceso (10A):** el correo se compara normalizado en los dos lados (antes se comparaba exacto, y un correo guardado con
  mayúsculas no habría entrado). Primero las credenciales y **después** el estado: una cuenta INACTIVO con la contraseña
  correcta recibe `USUARIO_INACTIVO`; con una contraseña falsa recibe el mensaje genérico de siempre. Tras un acceso
  correcto se llama a `emitirAvisosFinDePractica` con la demora en 0 (para no sumar otra espera); si falla, queda un
  `console.warn` y el acceso sigue. No se registra el inicio de sesión (§5.7). `accesoRapido` entra por los ID de
  demostración de la semilla y respeta INACTIVO.
- **Mi perfil (10A):** un `puede()` por campo (`EDITAR_*_PROPIO`); un campo que el rol no puede editar **se rechaza** con el
  código del permiso (no se ignora) y el permiso se comprueba antes que el correo repetido. El correo es único sin
  distinguir mayúsculas ni espacios, y escribir otra vez el propio no es un duplicado. Solo nombre y correo van al
  historial (`CUENTA_NOMBRE_CAMBIADO` y `CUENTA_CORREO_CAMBIADO`, un evento por cada uno); celular, Discord, GitHub y
  disponibilidad no dejan evento. La disponibilidad es un entero mayor que 0 o `null`. Devuelve la `SesionUsuario` nueva
  para que la pantalla refresque la sesión.
- **Contraseña propia (10A):** orden Zod → actor → permiso → contraseña actual → distinta de la actual; la actual se
  comprueba **antes**, así que con la actual mal no se dice que la nueva se repite. Las contraseñas **no se recortan** (los
  espacios cuentan; ocho espacios es válida). El evento `CUENTA_CONTRASENA_CAMBIADA` no lleva «cambios»: el historial no
  guarda ninguna contraseña, ni el marcador `debe_cambiar_contrasena`.
- **Insights (10B):** un insight no se guarda, así que se identifica por `tipo_regla` y `elemento` y se **recalcula** al actuar;
  si la condición ya no se cumple, `NO_ENCONTRADO`. Primero se resuelve el insight y después `puede()` decide por rol y
  alcance (el Supervisor no ve «postulaciones sin decidir» ni «fin de práctica»: `ROL_NO_PERMITIDO`; uno de otro proyecto:
  `FUERA_DE_ALCANCE`). Marcar como revisado guarda una `InsightRevision` del actor con la severidad actual, la fecha de la
  marca y la nota recortada o `null`; es independiente por persona; un insight ya revisado (y que no reapareció) da
  `INSIGHT_YA_REVISADO`. Ni revisar ni notificar dejan evento de historial (§5.7 no los lista).
- **«Notificar» (10B):** un destinatario inactivo da `USUARIO_OBJETIVO_INACTIVO` y uno que ya no existe, `NO_ENCONTRADO`. Con
  `calcularInsightsVigentes` se arma una sola receta de cálculo para este paso y para las consultas del paso 11.
- **Configuración (10C):** el servicio **mezcla** lo recibido con los valores vigentes de la sección y valida la sección
  **completa** con `domain/` antes de escribir (un valor bueno que choca con uno vigente, como atención en 20 días con
  crítico en 14, se rechaza). Escribe solo lo que cambió y deja un `PARAMETRO_CONFIGURACION_CAMBIADO` por parámetro, con los
  campos que cambiaron (`minimo`/`maximo`, `area`/`especialidad` o `valor`); sin cambios, `SIN_CAMBIOS`. Un parámetro de otra
  sección se **rechaza** con `DATOS_INVALIDOS` (`domain/` lo ignoraría; el servicio no calla algo que la pantalla pudo
  enviar por error). Los errores traen `campos` con la clave del parámetro (`CLAVE` o `CLAVE.campo`, como
  `EVALUACION_BANDA_AMBIGUA.minimo`). Restaurar usa `valor_predeterminado` y también valida (un predeterminado guardado
  inválido da el error de `domain/` sin escribir). No recalcula evaluaciones ni toca practicantes, y no avisa a nadie.
- **Restablecer datos (10C):** no usa `ejecutarServicio`, porque su operación solo sabe escribir devolviendo colecciones desde
  `transaccion`; duplicar la semilla ahí sería peor. El permiso se comprueba con `ejecutarConsulta` (con demora), se llama a
  `almacen.restablecer(entorno.ahora())` (una sola escritura) y se lee al actor otra vez, sin demora. No deja evento de
  historial. Si algo lanza, `ERROR_INESPERADO` y los datos quedan como estaban.

### Pruebas y mutaciones

- **Pruebas:** 306 netas (1.942 → 2.248 en 87 archivos): 10A 70 netas (se retiraron las 8 de `auth/iniciarSesion`; 23 de
  `sesion`, la de perfil y la de contraseña propia, más las de `PaginaAcceso` y la semilla actualizadas), 10B 73, 10C
  parte 1 93 (todas en `domain/`) y 10C parte 2 70.
- **Mutaciones del agente (80, con `git add` previo y `git restore` después de cada una; todas detectadas y
  restauradas):** 20 en 10A (entrar a un INACTIVO, revelar INACTIVO antes de la contraseña, no normalizar el correo, avisos
  de fin de práctica con y sin acceso correcto, omitir el correo único o su excepción para el propio correo, editar un campo
  no autorizado, el evento de correo con el celular, aceptar espacios en Discord o disponibilidad 0, contraseña igual a la
  actual, sin comprobar la actual, sin limpiar la marca temporal, mínimo de 7, contraseña en el historial, INACTIVO que
  cambia la contraseña y recorte de espacios), 20 en 10B (permisos y alcance de revisar y notificar, marcar dos veces,
  revisión a nombre de otro usuario, nota sin recortar o descartada, severidad fija, tipo de elemento, supervisor del
  proyecto, destinatario inactivo, texto y elemento del aviso, notificación ajena, no idempotencia, INACTIVO, `marcarTodas`
  de otros o escribiendo sin pendientes, y los umbrales), 20 en la regla de `domain/` (topes y pisos de la banda y de la
  proporción, mínimo igual al máximo, suma de 100, enteros, rango abierto en cada extremo, duración y aviso, reutilizar
  `validarUmbrales`, forma y orden) y 20 en los servicios de configuración (permisos, otra sección, sin validar, sin
  mezclar, todos como cambiados, sin `SIN_CAMBIOS`, comparaciones de rango y número, eventos, valor predeterminado,
  restaurar al valor vigente, `campos`, y el reinicio: permiso, no reiniciar, reloj y actor INACTIVO).
- **Hallazgo de las mutaciones:** la mutación «devolver al actor aunque quede INACTIVO» habría quedado sin detectar, porque
  la semilla de prueba siempre trae al administrador activo. Se agregó una prueba (con un `restablecer` envuelto que lo deja
  inactivo) **antes** de correr las 20 mutaciones de esa parte.

### Cierre del paso 10

- **Cuatro commits de código:** `d8f89b4` (10A), `84c438d` (10B), `185c6ae` (10C, `domain/`) y `66ff605` (10C, servicios).
- **11 servicios nuevos** (`iniciarSesion`, `accesoRapido`, `editarMiPerfil`, `cambiarMiContrasena`, `marcarInsightRevisado`,
  `notificarDesdeInsight`, `marcarNotificacionLeida`, `marcarTodasLeidas`, `guardarConfiguracionSeccion`,
  `restaurarSeccionConfiguracion` y `restablecerDatosDemostracion`, más los ayudantes `calcularInsightsVigentes` y
  `umbralesDe`) y la regla pura de Configuración. 306 pruebas netas y 80 mutaciones detectadas de 80.
- **Pendientes del plan que se cierran:** el bloqueo real del acceso a un INACTIVO, el aviso previo de fin de práctica al
  iniciar sesión, retirar las `CUENTAS_DEMO`, los servicios de Mi perfil, de insights, de notificaciones y de
  configuración, y el contrato de la sesión activa al restablecer datos.
- **Con esto terminan todos los servicios de la Fase 2.** Queda el paso 11 (consultas con alcance por rol).

### Divergencias con `docs/` (para que los autores las actualicen a mano)

- **§8.2:** Discord y GitHub sin espacios, hasta 32 y 39 caracteres; vacío quita el dato; la disponibilidad puede quitarse.
- **§8.1 y §4:** marcar una notificación como leída no tiene fila en la matriz; el aviso de «Notificar» lleva el texto del
  insight (sin campo libre) y el de supervisión demorada apunta a la tarea.
- **§5.8:** la proporción de la nota admite `100/0` y `0/100` (enteros de 0 a 100 que suman 100).

**Actualización (2026-11-18):** las tres divergencias (§8.2, §8.1 y §5.8) las escribieron los autores a mano en `3d6f019`
(PR #27, fusionado en `6cdd2fb`). Con esto ya no hay divergencia entre el código y `docs/` para el paso 10.

### Pendientes

- **Sesión abierta:** `GuardaRuta` no revalida la sesión guardada; quien queda INACTIVO con la sesión abierta sigue viendo las
  pantallas hasta cerrarla (los servicios sí lo deniegan). Decidir en la fase de interfaz.
- **Fase 4 (Mi perfil y campana):** las pantallas aplican la `SesionUsuario` que devuelven `editarMiPerfil` y
  `cambiarMiContrasena`, muestran los errores por campo y llaman a `marcarNotificacionLeida` y `marcarTodasLeidas`.
- **Fases 5.6 y 6.4 (Reportes):** usan `marcarInsightRevisado` (`INSIGHT_YA_REVISADO` desactiva el botón) y
  `notificarDesdeInsight`.
- **Fase 5.8 (Configuración):** formularios por sección con los errores `CLAVE` o `CLAVE.campo`; «Restablecer datos» aplica el
  `{ usuario }` del servicio y vuelve al inicio.
- **Paso 11:** consultas con alcance por rol; las de insights reutilizan `calcularInsightsVigentes`,
  `filtrarInsightsPorAlcance` y `aplicarRevisiones`.

## 2026-11-18 — [A+B] Fase 2, paso 11: consultas con alcance por rol (cierra la Fase 2)

Paso partido en cinco sub-pasos, cada uno con su parada y su commit: **11A** (permisos de lectura en `domain/`, la base
común y las consultas de proyectos; dos commits), **11B** (tareas y vistas del practicante), **11C** (practicantes,
supervisores, postulaciones, catálogo y Configuración), **11D** (insights, indicadores, historial, líneas de tiempo y
notificaciones) y **11E** (los tres resúmenes de entrada). Commits de código: `3bd4460`, `5821b99`, `b6a0d1b`, `6d6b79a`,
`31d127d` y `006022d`.

### Decisiones del plan (aprobadas por los autores)

- **Q1, alcance del paso:** consultas de **todos** los módulos, «livianas» (entidades de `domain/` más los campos derivados que
  hoy se calcularían en pantalla), en cinco sub-pasos. Se descartó dejar postulaciones, supervisores y Configuración para sus
  módulos de la Fase 5: la Fase 2 habría quedado con la lectura incompleta.
- **Q2, módulos solo del Administrador:** tres acciones nuevas de `puede()` (`VER_POSTULACIONES`, `VER_SUPERVISORES` y
  `VER_DIRECTORIO_PRACTICANTES`, de ámbito global) y `puedeEnRol(usuario, accion)`, que aplica solo los pasos 1 y 2 de `puede()`
  (usuario activo y rol) para el **permiso de módulo**, donde todavía no hay un proyecto que dar de contexto (un supervisor
  sin proyectos igual tiene permiso de módulo). La matriz pasó de 55 a **58 acciones** y de 16 a 19 globales. Se descartaron
  comprobar el rol dentro de las consultas (rompe «toda acción pasa por `domain/permisos`») y reutilizar acciones existentes
  (funciona hoy y miente mañana).
- **Q3, recurso inexistente o ajeno:** igual que los servicios de escritura: `NO_ENCONTRADO` si no existe y `FUERA_DE_ALCANCE`
  si es ajeno. Se descartó unificar ambos en `NO_ENCONTRADO` para no revelar que el id existe (en un prototipo los ids no
  son secretos).
- **Q4, una vista por rol:** cuando los campos visibles cambian con el rol, el tipo de retorno es distinto (o una unión con
  `vista`, cuyo valor lo fija el rol de quien consulta, nunca la entrada), de modo que el tipo del Supervisor **no tiene** el
  campo del área técnica ni la postulación de origen y no puede filtrarlos por descuido.
- **Q5, filtros:** cada listado entrega el conjunto completo del alcance con sus campos derivados y los **contadores por
  pestaña**; la pantalla filtra pestañas y búsqueda en memoria. Excepciones: `listarHistorial` y `obtenerIndicadores` reciben
  filtros, porque cambian el cálculo o el tamaño de lo que se lee.
- **Q6, alertas de los Dashboards:** orden de `ordenarInsights` (Crítico, Atención, Informativo), sin los `revisado` y con
  tope 5; los Informativos («Fin de práctica») entran si sobra lugar. Resuelve la contradicción de §5.9 («críticos y luego
  atención» frente a «incluyen los practicantes próximos a finalizar») y cierra la pregunta que estaba abierta en
  `PROGRESO.md`.
- **Q7, postulaciones en Indicadores:** «decidida en el periodo» es una postulación hoy APROBADA o RECHAZADA cuya última decisión
  (`POSTULACION_APROBADA` o `POSTULACION_RECHAZADA`) cae en el periodo, con los dos extremos incluidos; el «puntaje promedio por
  área» es el promedio del puntaje final de esas postulaciones, con la evaluación más reciente de cada una, **sin** las que no
  tienen evaluación (cuentan como decididas, no en el promedio), con **un decimal**, mitades hacia arriba y sin coma
  flotante, y `null` («Sin datos») si no hay ninguna. Función pura en `domain/` (`indicadoresDePostulaciones`).
- **Q8, privacidad:** el `ids_proyecto` de un insight del Supervisor se **recorta** a sus proyectos (un practicante compartido
  con otro supervisor no revela el proyecto ajeno); los **permisos** se deciden con el insight completo y solo después se
  recorta lo que se entrega. «Lo suyo» del Practicante en una línea de tiempo son los eventos de los que es **autor**. Los
  eventos `CUENTA_*` de otra persona **nunca** salen para el Supervisor ni el Practicante (sí los propios y, para el
  Administrador, todos). El `motivo` de «Carga desbalanceada» se deja como lo define §5.6 (cuenta todos los proyectos de la
  persona); recalcularlo cambiaría una regla cerrada en el paso 8.
- **Q9, supuestos menores (los seis confirmados):** el actor INACTIVO recibe `USUARIO_INACTIVO` también en los listados;
  «Requieren revisión» son las pendientes con la marca; «demasiado tiempo» esperando supervisión es el parámetro de
  Supervisión demorada y no un 3 fijo; el enlace de una notificación está activo si el elemento existe **y** quien mira puede
  abrirlo; «próximas reuniones» van por la próxima ocurrencia desde hoy en hora de Perú; y las pantallas de ejemplo no se
  tocan en este paso.

### Qué se construyó

- **11A, `domain/` (`3bd4460`):**
  - `permisos.ts`: las tres acciones `VER_*` y `puedeEnRol`.
  - `accionesTarea.ts`: `accionesDeTarea(tarea, usuario, contexto)` reúne las siete transiciones, editar, cambiar las dos
    opciones, crear y cerrar el PR y eliminar, cada una con el texto que exige (`MOTIVO` o `NOTA`). Reemplaza la lógica que
    `src/app/ejemplos/accionesDeTarea.ts` tenía en la capa de pantalla.
  - `consultas.ts`: `terminadasRecientes` y `ordenarTerminadas` (la columna «Terminada», 5), `ordenarTareasEnCurso`,
    `prPorAtender`, `situacionPracticante`, `proximaReunion` y `ordenarReuniones`. Después, en 11B, `observacionDevolucionVigente`.
- **11A, `src/services/consultas/` (`5821b99`):** `comun.ts` (`cargarActorActivo`, `exigirRol`, `proyectosVisibles`,
  `cargarProyectoConPermiso`, `conAutor`, `aTareaDeTablero`, entre otros) y `proyectos.ts`: `listarProyectos`,
  `listarMisProyectos`, `obtenerProyecto`, `obtenerEquipoProyecto`, `obtenerTableroProyecto`, `listarTerminadasDeProyecto` y
  `obtenerResumenProyectoAnterior`.
- **11B (`b6a0d1b`), `tareas.ts`:** `listarTareas`, `obtenerTarea`, `listarMiHistorial`, `listarMisTareasEnCurso` y
  `listarPullRequestsPorAtender`.
- **11C (`6d6b79a`):** `practicantes.ts` (`listarPracticantes`, `obtenerPracticante`, `listarPracticantesACargo` y
  `obtenerPracticanteACargo`), `supervisores.ts` (`listarSupervisores` y `obtenerSupervisor`) y `postulaciones.ts`
  (`listarPostulaciones`, `obtenerPostulacion`, `listarCatalogoEvaluacion` y `obtenerConfiguracion`).
- **11D (`31d127d`):** `domain/indicadoresPostulaciones.ts`; `reportes.ts` (`listarInsights`, `obtenerIndicadores` y
  `practicantesPorArea`), `historial.ts` (`listarHistorial` y `obtenerLineaDeTiempo`) y `notificaciones.ts`
  (`listarNotificaciones`).
- **11E (`006022d`), `dashboards.ts`:** `obtenerDashboardAdministrador`, `obtenerDashboardSupervisor` y
  `obtenerInicioPracticante`. Para no duplicar cálculos se extrajeron de consultas anteriores `insightsVisibles`,
  `filasDePostulaciones`, `practicantesACargoDe`, `aTareaListado`, `porMasTiempoEsperando`, `tareasEnCursoDe` y `prsPorAtenderDe`,
  sin cambiar su comportamiento (las 423 pruebas anteriores siguieron pasando).

### Decisiones de implementación

- **Orden de comprobación (todas las consultas):** Zod, actor inexistente (`NO_ENCONTRADO`), actor INACTIVO
  (`USUARIO_INACTIVO`), vista del rol (`ROL_NO_PERMITIDO`) o permiso de módulo, recurso inexistente (`NO_ENCONTRADO`),
  `puede()` sobre el recurso (`FUERA_DE_ALCANCE`) y, al final, la proyección. Los listados filtran el alcance en silencio y un
  listado vacío es un éxito (alimenta el estado vacío). Todas usan `ejecutarConsulta`: no escriben, ni en `data/` ni en el
  navegador (una prueba lo comprueba en cada una).
- **Elegir la vista por rol (`exigirRol`):** `listarProyectos` y `listarMisProyectos`, `listarPracticantes` y
  `listarPracticantesACargo`, y los tres resúmenes eligen la proyección de cada rol con una comprobación de rol, porque
  `puede()` con alcance de proyecto no tiene contexto para un listado. Qué proyectos o tareas entran en esa vista lo sigue
  decidiendo `puede()` con cada recurso.
- **Proyectos (11A):** vigente es una asignación vigente en un proyecto que no está FINALIZADO (`VER_PROYECTO`). Un proyecto con
  baja sale como «Ya no participas»; sin baja y finalizado, como «Finalizado»; si volvió, una sola vez con la asignación más
  reciente. El Resumen, el Equipo y el Tablero tienen una variante `GESTION` y otra `PRACTICANTE`: la del Practicante no trae
  actividad ni conteos del equipo, ni correo ni celular de nadie, ni compañeros anteriores, y solo ve la marca «Devuelta» en
  sus tareas. La carga del equipo es la de **ese** proyecto. «Mis tareas» del Resumen son las suyas todavía abiertas.
- **Tareas (11B):** `obtenerTarea` trae `acciones` (de `domain/`) y `solo_lectura` (sin acciones). La marca «Devuelta» y su
  nota se ocultan en la tarea de un compañero, pero la nota sigue en su línea de tiempo (§6.7: se ve completa en cualquier
  detalle que pueda abrir). Con la etiqueta de PR «Pendiente» no se ofrece la URL de un PR anterior. «Mis tareas en curso» y
  «Pull Requests por atender» cuentan solo proyectos vigentes; una tarea devuelta que quedó a nombre de quien ya salió del
  proyecto (D6-A) sigue visible en `listarTareas` y `obtenerTarea`, no en el Inicio. Mi historial excluye las liberadas y
  filtra por un proyecto en el que estuvo (`VER_RESUMEN_PROYECTO_ANTERIOR`).
- **Personas (11C):** «Activos» incluye a los «Sin proyecto» (y estos incluyen a quien sigue asignado a un proyecto
  finalizado); un finalizado nunca está «sin proyecto» y no trae estado de fin. Para el Supervisor, «Activo» es quien tiene
  una asignación vigente en alguno de sus proyectos y cuenta activa; la carga, «esperando mi revisión» y la última actividad
  cuentan solo sus proyectos; una persona en dos proyectos suyos sale en **una** fila. «A cargo» de un supervisor son los
  proyectos activos o en pausa, la misma regla que bloquea desactivarlo. Las postulaciones van por puntaje de mayor a menor
  (a igual puntaje, la más antigua primero; las sin evaluar, al final) y el desglose es el guardado, no el del catálogo actual.
- **Seguimiento (11D):** `listarInsights` calcula con `calcularInsightsVigentes` y aplica el alcance y las revisiones de quien
  mira; `puede_marcar_revisado` exige además que no esté ya revisado, y `puede_notificar` es solo `puede()`. El historial
  global filtra por días de calendario de Perú, con los dos extremos incluidos; el texto busca sin distinguir mayúsculas ni
  tildes (`\p{M}`) en la etiqueta, el id, la acción, la nota y el autor. `obtenerLineaDeTiempo` aplica un filtro final
  de eventos de cuenta para el Supervisor y el Practicante. Las notificaciones traen solo las propias, con `no_leidas` (de
  todas las suyas), `total` (antes del límite) y `destino`: `DETALLE`, `RESUMEN_PROYECTO_ANTERIOR` o `null`.
- **Resúmenes (11E):** no calculan nada propio. El estado vacío total es un éxito con `{ vacio: true }` y sin tarjetas: para el
  Supervisor, no tener ningún proyecto; para el Practicante, no tener un proyecto vigente. Las reuniones y el avance incluyen
  los proyectos en pausa («todo lo demás sigue igual», §5.4) y excluyen los finalizados; «disponibles» del Inicio no cuenta
  los proyectos en pausa. El Dashboard del Administrador devuelve además «por revisar», reuniones y avance (no están en §5.9).

### Pruebas y mutaciones

- **Pruebas:** 588 nuevas (2.248 → 2.836 en 99 archivos): 11A parte 1, 79 (en `domain/`); 11A parte 2, 99; 11B, 92 (9 en
  `domain/`); 11C, 133; 11D, 125 (17 en `domain/`); y 11E, 60. Cada consulta se prueba con éxito, actor inexistente, INACTIVO
  en los tres roles, entrada vacía, rol denegado y «no escribe nada»; además cada combinación de rol y alcance (supervisor
  propio, ajeno y sin proyectos; practicante con asignación vigente, con baja, sin asignación, con proyecto finalizado y con
  proyecto en pausa) y la **privacidad por campo**: el Practicante nunca recibe correo ni celular, el Supervisor nunca recibe
  el área técnica ni la postulación de origen, y ninguna vista trae contraseñas.
- **Mutaciones del agente (253, con `git add` previo y `git restore` después de cada una; 252 detectadas y 1 equivalente):**
  28 en 11A parte 1 (las tres acciones y su ámbito, `puedeEnRol`, las acciones de la tarea y los ayudantes), 40 en 11A parte 2,
  30 en 11B, 47 en 11C, 67 en 11D y 41 en 11E. Cubren permisos de módulo y de vista, alcance por proyecto, privacidad de
  campos, deduplicación, recortes, ordenamientos, topes de 5, comparaciones de extremos, estados vacíos, proyectos en pausa y
  finalizados, y los cálculos de `domain/`.
- **Hallazgos de las mutaciones** (cada uno se resolvió antes de dar el sub-paso por bueno):
  - *Código muerto retirado:* en 11A, el criterio «vencidas» de `ordenarTareasEnCurso` nunca cambiaba el orden (una vencida
    tiene la fecha límite anterior a hoy), así que se quitó junto con el parámetro `hoy`; en 11C, un filtro de tareas del
    detalle del Supervisor repetía lo que ya hacía `conProyecto`; en 11D, el guard `texto === ''` era redundante.
  - *Pruebas que faltaban (se agregaron):* el tope de «mi actividad» (11A), la devolución propia frente a la de otra tarea (11B),
    una cuenta inactiva con asignación vigente, la última actividad con un proyecto de otro supervisor y la de la lista de
    supervisores (11C), y las asignaciones con baja en el gráfico por área (11D).
  - *Equivalentes:* en 11D, `no_leidas` calculado sobre la lista filtrada da lo mismo que sobre la completa (la lista filtrada
    solo quita leídas); en 11E, el chequeo explícito del parámetro de Supervisión demorada en el Dashboard del Administrador
    lo repite `alertasDe` con el mismo error (se conserva porque el tipo `Resultado` lo exige).
  - *Hallazgo en el código:* al escribir el regex de tildes con `̀-ͯ` quedaron caracteres combinantes literales en el
    archivo; se cambió por `\p{M}`, que se lee y se prueba igual.
  - *Hallazgo de privacidad (documentado, no corregido):* la nota de una devolución es visible para el Practicante en la línea de
    tiempo de la tarea de un compañero aunque el campo `observacion` del detalle se oculte; sigue lo aprobado en Q8 y §6.7.

### Cierre del paso 11 y de la Fase 2

- **Seis commits de código:** `3bd4460` (11A, `domain/`), `5821b99` (11A, consultas), `b6a0d1b` (11B), `6d6b79a` (11C),
  `31d127d` (11D) y `006022d` (11E).
- **30 consultas** con alcance por rol, `puedeEnRol`, tres acciones de `puede()`, `accionesDeTarea`, ocho ayudantes puros de
  consulta e `indicadoresDePostulaciones`. 588 pruebas netas y 252 mutaciones detectadas de 253 (la restante es equivalente).
- **Con esto termina la Fase 2.** Del «Listo cuando» del plan §9: el flujo completo por código está cubierto (aprobar
  postulación, asignar, crear tarea, tomar, enviar, aprobar y crear PR), los servicios se prueban con caso exitoso, sin
  permiso, datos inválidos e inexistente, el alcance por rol está probado campo por campo y restablecer la semilla deja el
  sistema consistente.
- **Pendientes del plan que se cierran:** las consultas con alcance por rol (proyectos, tareas, practicantes, supervisores e
  insights), la exclusión de los insights revisados en los Dashboards, y las acciones disponibles de la tarea, que dejan de
  vivir en la capa de pantalla.

### Divergencias con `docs/` (para que los autores las actualicen a mano)

- **§4 (matriz):** filas «Ver postulaciones», «Ver supervisores» y «Ver el directorio de practicantes» (solo Administrador).
- **§5.1:** «Requieren revisión» son las pendientes con la marca de revisión manual.
- **§5.2:** «Activos» incluye a los «Sin proyecto»; «Sin proyecto» incluye a quien solo sigue asignado a un proyecto finalizado.
- **§5.6:** definición de «postulaciones decididas» y de «puntaje promedio por área» (un decimal; sin las no evaluadas); el
  gráfico «practicantes por área» cuenta a los activos y, con filtro de proyecto, a los asignados.
- **§5.9:** alertas de Crítico a Informativo, sin revisadas y hasta cinco; «demasiado tiempo» es el parámetro de Supervisión
  demorada; y el Dashboard del Administrador devuelve además «por revisar», reuniones y avance (decidir si se muestran).
- **§9.1.2:** «Activo» y los datos del detalle del practicante a cargo (fecha de fin sí; área y postulación no).
- **§9.1.5 y §9.2.3:** el estado vacío total es no tener ningún proyecto (Supervisor) o ningún proyecto vigente (Practicante);
  reuniones y avance incluyen los proyectos en pausa.
- **§9.2.1:** «Ya no participas» cuando hay baja, aunque el proyecto además esté finalizado.
- **§8.1:** el enlace de una notificación está activo solo si el elemento existe y quien mira puede abrirlo.
- **§6.7:** la línea de tiempo de una tarea ajena trae todos sus eventos, también la nota de una devolución.

**Actualización (2026-11-18):** las divergencias las escribieron los autores a mano en `3d6f019` (PR #27, fusionado en
`6cdd2fb`): propuesta §4, §5.1, §5.2, §5.6, §5.9, §6.7, §8.1, §9.1.2, §9.1.5, §9.2.1 y §9.2.3, y plan §9 (Fase 2, paso 11). En
§5.9 decidieron **documentar** también «por revisar», próximas reuniones y avance en el Dashboard del Administrador, así que
esos bloques se quedan. Con esto ya no hay divergencia entre el código y `docs/` para el paso 11.

### Pendientes

- **Conectar las pantallas y retirar `src/app/ejemplos/`:** cada pantalla llama a `services/` para actuar y a
  `services/consultas/` para leer, sin filtrar ni decidir. Se retiran `accionesDeTarea.ts`, `almacenNotificaciones.ts`,
  `datos.ts`, `PaginaDesarrollo.tsx` y `PaginaPerfil.tsx`.
- **Adaptadores de la interfaz:** las consultas devuelven la forma de `domain/` (snake_case y fechas ISO); un adaptador convierte
  a los tipos de los componentes compartidos, con `parseISO` en el borde.
- **Campana y notificaciones:** `limite: 8` para la campana; `destino` y `enlace_activo` deciden el enlace.
- **Reportes y Dashboards:** la pantalla muestra lo que devuelven `listarInsights`, `obtenerIndicadores` y los resúmenes; los
  filtros de pestaña, tipo y estado de los insights se aplican en memoria (Q5).
- **Sesión abierta** (pendiente desde el paso 10): decidir en la fase de interfaz si `GuardaRuta` revalida la sesión guardada.
- **Cierre de la rama:** PR de `feat/fase2-cuenta-consultas` a `development`, revisado por ambos autores, y después
  `development` → `main` con la etiqueta `fase-2-completa` (plan §11).

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


## 2026-11-18 — [A+B] Conexión de pantallas, sub-paso 0: servicios unificados y acceso

- **Commit:** `83b1315` (`refactor: unifica el acceso, Mi perfil y las notificaciones en los servicios de la Fase 2`).
- **Por qué.** La fusión `48abbbc` dejó dos implementaciones de lo mismo y la interfaz usaba las de la Fase 4:
  `services/cuenta.ts` frente a `cuentas/perfil.ts` y `cuentas/contrasenaPropia.ts`; `marcar*` de `services/notificaciones.ts` frente
  a `seguimiento/notificaciones.ts`; y `services/autenticacion.ts` con `auth/iniciarSesion.ts` frente a `cuentas/sesion.ts`.
  Las de la Fase 4 validaban menos (celular con formato laxo, sin un `puede()` por campo) y el acceso no llamaba a
  `emitirAvisosFinDePractica`: el aviso previo de fin de práctica (F6-A) dejó de emitirse (regresión H2).
- **Decisión (D1-A).** La interfaz adopta los servicios de la Fase 2 y se retiran los duplicados: `services/cuenta.ts`,
  `services/autenticacion.ts`, `marcarNotificacionLeida` y `marcarTodasNotificacionesLeidas` de `services/notificaciones.ts` (que
  conserva `crearNotificaciones` y `agregarNotificaciones`) y `auth/iniciarSesion.ts`, con sus pruebas. Antes de retirarlas se
  comprobó caso por caso que las pruebas de `cuentas/` y `seguimiento/` cubren todo lo que probaban. Alternativas descartadas:
  conservar ambas (dos validaciones del mismo dato y el login sin avisos) o arreglar solo el login.
- **Acceso.** `PaginaAcceso` llama a `iniciarSesion` y `accesoRapido` de `cuentas/`: con contraseña correcta una cuenta inactiva
  recibe «Tu cuenta está inactiva…»; con una falsa, el mensaje genérico, sin revelar que la cuenta existe (decisión de 10A).
- **Mi perfil.** `PaginaPerfil` envía solo los campos editables del rol que cambiaron, porque el servicio rechaza un campo
  prohibido aunque no cambie. Los errores del servicio (`cuenta_github`, `disponibilidad_horaria`, `contrasenaActual`,
  `contrasenaNueva`) se renombran a los del formulario. Sin cambios devuelve `SIN_CAMBIOS`. La `SesionUsuario` devuelta se
  aplica con `abrirSesion`. `PerfilUsuario` acepta `Resultado<unknown>` y deja de reemplazar el formulario con el valor devuelto:
  los valores se derivan del almacén.
- **Pruebas.** 2.890 → 2.871 en 104 archivos: 23 retiradas por duplicadas y 4 nuevas (contraseña falsa sin revelar la cuenta
  inactiva y tres de Mi perfil). Dos pruebas de `PaginaAcceso` se ajustaron al mensaje de 10A.
- **Abierto.** H3: `esquemasPerfil.ts` conserva la regex laxa del celular; el servicio ya aplica la regla real. Se resuelve en el
  sub-paso d). `ACCESO_RAPIDO_NO_DISPONIBLE` quedó sin uso real.
- **Sesión (cierre de pendiente).** `GuardaRuta` ya revalida la sesión contra el almacén (existe, ACTIVO, mismo rol) desde `a4d2e54`.
- **Plan de la conexión.** Sub-pasos a) adaptadores en `src/app/adaptadores/`, b) campana y «Ver todas», c) detalle de tarea y
  Kanban, d) Mi perfil y sesión, e) retirar `src/app/ejemplos/`. Decisiones de los autores: `PaginaDesarrollo` se conserva como contenedor
  de integración, sin simulaciones, hasta la Fase 7 (D2-B); la señal D6-A pasará a una consulta (D3-A); el enlace de una
  notificación usa una tabla de destino a ruta del panel mientras no existan los módulos (D4-A); se conecta solo «editar» de
  `FormularioTarea` (D6-A); se retira el bloque «Asignaciones y responsabilidades» de Mi perfil, que no está en §8.2 (D7-A); y se
  ocultan Discord, GitHub y disponibilidad a quien su rol no los edita (D8-A).

## 2026-11-18 — [A+B] Conexión de pantallas, sub-paso a): adaptadores de las consultas

- **Commit:** `0ed86c9` (adaptadores de las consultas a los componentes compartidos).
- **Qué se construyó.** Funciones puras en `src/app/adaptadores/`, una por modelo de presentación, con sus pruebas (44 en 4
  archivos): `aTareaDetalle` (`TareaDetalleVista` → `TareaDetalle`), `aTareaTablero` y `aTareasDelTablero` (`TareaDeTablero` y
  `TableroProyecto` → `TareaTablero`), `aEventosLinea` (`EventoConAutor` → `EventoLinea`) y `aNotificacionItem` con
  `rutaDeNotificacion` (`NotificacionVista` → `NotificacionItem`). Aún no los usa ningún componente: se conectan en b) y c).
- **Decisión: los cuatro tipos se conservan.** `TareaDetalle`, `TareaTablero`, `EventoLinea` y `NotificacionItem` dejan de llamarse
  «provisionales» y quedan como el modelo de presentación de los componentes; el contrato con las consultas son los adaptadores.
  Alternativa descartada: que los componentes reciban directamente la forma de las consultas (snake_case e ISO), que los
  acoplaría a ella.
- **Decisión: los adaptadores no calculan reglas.** Renombran, aplanan y convierten fechas con `parseISO` en el borde. La etiqueta
  de PR visible, la marca «Devuelta», la observación, `vencida` y las acciones ya vienen decididas por la consulta. Mientras tanto
  `DetalleTarea` y `TableroKanban` siguen recalculando `etiquetaPRVisible` y `estaVencida`; se retira en el sub-paso c).
- **Autor no resuelto.** La consulta devuelve el ID como nombre cuando la cuenta del autor no se encuentra; el adaptador lo detecta
  (`autor_rol` nulo con autor de tipo `USUARIO`) y muestra «Usuario desconocido», nunca un ID.
- **Enlaces de las notificaciones (D4-A).** `RUTA_DE_MODULO` es una constante de datos con la página del módulo por rol y tipo de
  elemento; un aviso de la propia cuenta lleva a `/<panel>/perfil`; un tipo sin entrada cae al inicio del rol; y si la consulta
  dice `destino: null`, no hay ruta y el enlace queda desactivado. Qué puede abrir cada persona sigue decidiéndolo la consulta.
  Una prueba comprueba que toda ruta de la tabla exista en el menú de su rol. Cuando los módulos tengan detalle, se afina en este
  archivo sin tocar los componentes.
- **Etiqueta de acciones.** El mapa de etiquetas de la línea de tiempo (los 15 tipos de tarea y de Pull Request) se migró de
  `src/app/ejemplos/datos.ts`; un tipo sin etiqueta muestra su código.
- **Pruebas.** 2.871 → 2.915 en 108 archivos (+44 en 4 archivos nuevos).

## 2026-11-18 — [A+B] Conexión de pantallas, sub-paso b): campana y «Ver todas»

- **Commit:** `7269ba6` (campana y «Ver todas» conectadas a `listarNotificaciones`).
- **Qué se construyó.** El hook `useNotificaciones({ limite, soloNoLeidas })` (`src/app/layout/useNotificaciones.ts`) llama a
  `listarNotificaciones`, adapta con `aNotificacionItem` y devuelve `{ items, noLeidas, total, cargando, error }`. La campana pide
  las últimas 8; «Ver todas» hace dos consultas (todas y solo no leídas). `CampanaNotificaciones` recibe `noLeidas` por prop y ya no
  cuenta, ordena ni recorta. Se retiró `notificacionVista.ts`, que decidía en la pantalla la existencia y la ruta de cada aviso
  (y tenía el caso especial `pry-pl2d`).
- **Decisión (recarga, opción A).** El hook vuelve a consultar al montarse y cada vez que cambia la lista de notificaciones del
  almacén, que se usa solo como señal de cambio y no sale del hook: los componentes no leen el almacén. Alternativa descartada:
  consultar solo al montar y tras las acciones propias, porque un aviso nuevo en la misma sesión no aparecería hasta navegar.
- **Por qué `noLeidas` va aparte.** Con `limite: 8` la lista ya no trae todos los avisos; contar sobre ella daría un punto verde
  equivocado. `no_leidas` de la consulta cuenta siempre todos los del usuario.
- **Comportamiento.** Mientras llega una respuesta nueva se conserva la anterior (sin parpadeo); una respuesta que llega tarde no
  pisa a otra más reciente; la respuesta de otra persona (cambio de sesión) no se muestra. Cada consulta conserva la demora de red
  simulada de 600 ms, así que tras marcar un aviso el contador baja con ese retraso.
- **Consecuencia de D4-A (divergencia temporal con §8.1).** Un aviso de una tarea lleva a la página vacía del módulo
  (`/<panel>/tareas` o `/proyectos`) y ya no a `/desarrollo`: «se abre el elemento relacionado» se cumple cuando los módulos tengan
  detalle. Mientras tanto, la única forma de abrir una tarea es `PaginaDesarrollo`.
- **Pruebas.** 2.915 → 2.937 en 109 archivos: +23 (hook 9, campana conectada 6, «Ver todas» 6 más, `CampanaNotificaciones` 2 más) y
  −1 (la de `notificacionVista`). Sin cobertura propia: el aviso de error de «Ver todas» (el hook sí lo prueba).

## 2026-11-18 — [A+B] Conexión de pantallas, sub-paso c): detalle de tarea, Kanban y «Ver todas las terminadas»

- **Commit:** `7354f39` (detalle de tarea, tablero y «Ver todas las terminadas» conectados a las consultas; incluye la regla D6-A de
  `domain/` y los campos de `obtenerTarea`).
- **Partición.** El sub-paso se planeó en tres commits (c1 dominio y consulta, c2 detalle y tablero, c3 listado y edición) y los
  autores pidieron unirlos en uno solo para no multiplicar commits; el contenido es el mismo.
- **Señal D6-A (D3-A).** Devolver o reabrir conserva al responsable, así que una tarea puede quedar EN_PROGRESO a nombre de alguien que
  ya no puede trabajarla. La regla pura `motivosDeAtencionDelResponsable` (`src/domain/responsableTarea.ts`) devuelve los motivos
  `CUENTA_INACTIVA`, `CUENTA_NO_ENCONTRADA` y `SIN_ASIGNACION_VIGENTE` (pueden darse varios, en ese orden; `[]` si no hay nada que
  señalar). Solo aplica con la tarea EN_PROGRESO y con responsable. `obtenerTarea` la expone como `atencion_responsable`, que
  **solo reciben el Administrador y el Supervisor** (quienes liberan la tarea); para el Practicante es `[]`, para que no se entere del
  estado de la cuenta de un compañero. Se eligió un arreglo de motivos y no un booleano porque la interfaz distingue tres mensajes. 13
  mutaciones detectadas de 13 (10 sobre la regla y 3 sobre la consulta); se aplicaron con un script que restaura el archivo, sin Git.
- **Rama base del proyecto.** `obtenerTarea` trae `proyecto.rama_base`: el modal de «Crear Pull Request» la necesita aunque aún no
  exista el PR (`pull_request.rama_base` es `null` hasta entonces). Antes se leía del almacén.
- **Mapeador de acciones.** `src/app/tareas/accionesDelDetalle.ts` convierte las `AccionDisponible` que entrega la consulta en las
  acciones de `DetalleTarea`: clave, etiqueta, si es destructiva, el texto que se pide (`MOTIVO` o `NOTA`) y el servicio al que
  llama. No consulta permisos ni estados. La tabla está tipada `Record<AccionDeTarea, …>`, así que una acción nueva del dominio no
  compila hasta describirla. Crear un PR y editar no llaman a un servicio: los resuelve la página (modal de PR y formulario).
- **Componentes sin reglas.** `DetalleTarea` ya no lee el almacén ni recalcula la etiqueta de PR (llega decidida por la consulta, y
  con «Pendiente» la consulta no trae URL). `TableroKanban` ya no usa `estaVencida` ni `hoy` (usa `vencida` de la consulta) ni
  recorta o reordena las terminadas: recibe las 5 más recientes y `totalTerminadas` para el contador y el enlace «Ver todas».
- **`useConsulta`.** Hook genérico (`src/app/useConsulta.ts`) con el patrón de `useNotificaciones`: vuelve a consultar cuando cambia
  el almacén (usado solo como señal de cambio), conserva la respuesta anterior mientras llega la nueva, no muestra el valor de otra
  consulta ni deja que una respuesta tardía pise a una reciente.
- **«Ver todas las terminadas» (§6.8).** Vista dentro de `PaginaDesarrollo` (`ListadoTerminadas`): lista completa, búsqueda por título o
  ID en memoria, clic al detalle y «Volver al listado» o «Volver al tablero». La búsqueda es un filtro de presentación sobre datos ya
  limitados por la consulta.
- **Selector de proyecto.** `PaginaDesarrollo` ya no está fijada a `pry-pl2d`: el Administrador y el Supervisor usan `listarProyectos`
  y el Practicante, `listarMisProyectos` (solo los vigentes); por defecto, el primero. No hizo falta ajustar ninguna consulta.
- **Editar tarea (D6-A).** Solo «editar» se conecta a `FormularioTarea`, desde el detalle y cuando la consulta ofrece `EDITAR_DATOS`.
  Crear tarea no tiene todavía pantalla anfitriona: espera a los módulos 5.4 y 5.5.
- **Retiros.** `ejemplos/accionesDeTarea.ts` y `ejemplos/datos.ts`, con sus pruebas. `PaginaDesarrollo` se conserva como contenedor
  de integración hasta la Fase 7 (D2-B).
- **Pruebas.** 2.937 → 3.017 en 112 archivos (+80 netas): la regla D6-A y la consulta, el mapeador, `useConsulta`, el listado de
  terminadas, el detalle, el tablero, los adaptadores y `PaginaDesarrollo` reescrita (15). Las pruebas de la página usan un entorno sin
  demora de red para no esperar 600 ms por consulta.
- **Divergencias con `docs/` (para que los autores las actualicen a mano).** (1) §6.5 y plan §5: la señal D6-A y quién la ve no están
  documentadas. (2) §6.8 describe «Ver todas las terminadas» como un listado con búsqueda; hoy es una vista del contenedor temporal
  hasta los módulos de las Fases 5 a 7. (3) «Solo mis tareas» actúa sobre las terminadas que muestra el tablero (las 5 más recientes):
  conviene decidir si debe actuar sobre todas.

## 2026-11-18 — [A+B] Conexión de pantallas, sub-paso d): Mi perfil y sesión

- **Commit:** `f2bb209` (Mi perfil conectado a `obtenerMiPerfil` y a los servicios de cuentas).
- **Consulta nueva `obtenerMiPerfil`.** Hasta ahora ninguna consulta daba a una persona sus propios datos (`obtenerPracticante` es solo del
  Administrador), así que `PaginaPerfil` leía el almacén. Se amplió `services/consultas/` (Fase 2): cada persona recibe **solo su cuenta**,
  sea cual sea su rol, sin parámetro para pedir la de otra. Trae los bloques de lectura de §8.2: rol, estado y fecha de alta; para el
  Practicante, área, especialidad y fechas de práctica; los datos personales; y los campos del formulario. Nunca devuelve la contraseña
  ni la postulación de origen. Un usuario INACTIVO recibe `USUARIO_INACTIVO`, y un Practicante o Supervisor sin su detalle (o sin su
  área o especialidad) recibe `NO_ENCONTRADO` en vez de un perfil a medias.
- **Regla `camposDelPerfil` en `domain/` (`src/domain/perfil.ts`).** Decide qué campos **existen** para el rol y cuáles son **editables**, con
  `puede(EDITAR_*_PROPIO)`; antes era una tabla escrita a mano en la pantalla que duplicaba los permisos. Practicante: los seis campos,
  todos editables. Supervisor: nombre y correo de solo lectura («los fija el Administrador», §8.2) y celular, Discord y GitHub editables.
  Administrador: nombre, correo y celular. Un usuario INACTIVO conserva sus campos pero no edita ninguno. Alternativa descartada: la
  tabla en la página.
- **Discord, GitHub y disponibilidad del Administrador (D8-A).** No se muestran: no existen en su modelo (no tiene registro de practicante
  ni de supervisor). Mostrarlos bloqueados y vacíos hacía pensar en un error. Cierra la pregunta pendiente de «Decisiones pendientes».
  Alternativa descartada: dejarlos bloqueados.
- **Validación en el formulario (H3).** El correo y el celular reutilizan `esquemaCorreo` y `esquemaCelular` del servicio (9 dígitos que
  empiezan con 9, F7-A), y el mínimo de la contraseña usa `LARGO_MINIMO_CONTRASENA`: desaparece la regex laxa del celular que dejaba pasar
  números que el servicio rechazaba. Discord, GitHub y disponibilidad los valida el servicio y su error sale junto al campo. Solo se
  validan los campos editables, así que un dato de solo lectura no bloquea guardar los demás.
- **Formulario.** Todos los campos son texto con los nombres de los datos (`cuenta_github`, `disponibilidad_horaria`), así los errores del
  servicio llegan al campo sin renombrar (solo se renombran los de la contraseña). La página envía únicamente los campos editables que
  cambiaron (el servicio rechaza uno prohibido aunque no cambie); sin cambios devuelve `SIN_CAMBIOS`; vaciar Discord, GitHub o la
  disponibilidad quita el dato. `PerfilUsuario` ya no reinicia el formulario cuando llegan los mismos valores en un objeto nuevo
  (una consulta repetida no borra lo que se está escribiendo) y sí lo reinicia cuando cambian de verdad. Un `null` se muestra como vacío,
  nunca como «null».
- **Sesión.** `editarMiPerfil` y `cambiarMiContrasena` devuelven la `SesionUsuario` y la página la aplica con `abrirSesion`: la barra
  superior y la franja de contraseña temporal se refrescan. `GuardaRuta` ya revalidaba la cuenta contra el almacén (`a4d2e54`).
- **«Asignaciones y responsabilidades» (D7-A).** Se retiró: §8.2 define tres bloques y ese no estaba (regla de oro del plan §1). Con ello
  salen `responsabilidadesPerfil.ts` y su cálculo de alcance en la pantalla.
- **Ubicación.** `PaginaPerfil` pasa de `src/app/ejemplos/` a `src/app/perfil/`.
- **Mutaciones.** 19 mutaciones, 18 detectadas y 1 equivalente (la disponibilidad usa el permiso del celular: el único rol que tiene ese
  campo es el Practicante y para él ambos permisos dan el mismo resultado). Aplicadas con un script que restaura los archivos, sin Git.
- **Pruebas.** 3.017 → 3.068 en 114 archivos (+51 netas): regla de `domain/` (9), consulta (12), adaptador (6), formulario (18) y página (19),
  menos las de `PaginaPerfil` y `responsabilidadesPerfil` de `ejemplos/`.
- **Divergencias con `docs/` (para que los autores las actualicen a mano).** §8.2 no dice que el Supervisor ve su nombre y correo en solo
  lectura dentro del formulario (hoy son campos bloqueados); conviene aclararlo. El resto de §8.2 coincide con lo implementado.

## 2026-11-18 — [A+B] Conexión de pantallas, sub-paso e) y cierre de la Fase 4

- **Commit:** `9ea9835` (mueve `PaginaDesarrollo` a `src/app/desarrollo/`, elimina `src/app/ejemplos/` y retira `ACCESO_RAPIDO_NO_DISPONIBLE`).
- **`PaginaDesarrollo`.** Se movió con su prueba, sin cambios de comportamiento y con la misma ruta (`/<panel>/desarrollo`). La carpeta se llama
  `desarrollo` porque la página es un contenedor temporal de integración y no un «ejemplo»; se elimina al terminar la Fase 7 (plan §9, D2-B).
  No está en ningún menú: se llega escribiendo la URL.
- **Código muerto.** `ACCESO_RAPIDO_NO_DISPONIBLE` (mensaje en `services/resultado.ts` y su entrada en `resultado.test.ts`) quedó sin uso
  cuando el acceso pasó a los servicios de la Fase 2 (sub-paso 0, `83b1315`); se retira ahora y no en la limpieza de la Fase 8.
- **Pendientes cerrados.** `src/app/ejemplos/` ya no existe. El pendiente de migrar los formateos de ID a `formatearIdLegible` dejó de aplicar: el
  único código de la interfaz que formateaba IDs (`ejemplos/datos.ts`) se retiró en `7354f39`, y las consultas entregan `id_legible`.
- **Pruebas.** Sin cambios en el total (3.068 en 114 archivos): se movieron las 15 de `PaginaDesarrollo` y se quitó un elemento de una lista.

### Cierre de la Fase 4 (componentes compartidos)

- **Qué quedó.** Los componentes compartidos de los pasos 1 a 11 están construidos, probados y conectados. Las pantallas llaman a `services/`
  para actuar y a `services/consultas/` para leer, mediante adaptadores (`src/app/adaptadores/`) y los hooks `useConsulta` y
  `useNotificaciones`. Ni las pantallas ni los componentes compartidos leen el almacén ni deciden reglas: el almacén solo se usa dentro de esos
  dos hooks, como señal de cambio. El recorrido fue: 0 unificar servicios y acceso (`83b1315`), a adaptadores (`0ed86c9`), b campana y «Ver
  todas» (`7269ba6`), c detalle, Kanban y terminadas (`7354f39`), d Mi perfil (`f2bb209`) y e retiro de `ejemplos/` (`9ea9835`).
- **Salvedad.** `FormularioTarea` solo tiene pantalla anfitriona para **editar** (desde el detalle). Su modo **crear** no se aloja en ninguna
  pantalla hasta los módulos 5.4 (Proyectos) y 5.5 (Tareas), que son quienes lo usan.
- **Ampliaciones a la Fase 2 hechas durante la conexión** (aditivas, con sus pruebas): la regla `motivosDeAtencionDelResponsable` y los campos
  `atencion_responsable` y `proyecto.rama_base` de `obtenerTarea`; la regla `camposDelPerfil` y la consulta `obtenerMiPerfil`.
- **Siguiente.** Fase 5, módulo 5.1 (Postulaciones). Para cerrar la fase, los autores revisan el PR de esta rama a `development`; el cierre en
  `main` con su etiqueta sigue el plan §11.
- **Divergencias con `docs/` (consolidadas, para que los autores las actualicen a mano).**
  1. §8.1 «se abre el elemento relacionado»: hoy el aviso lleva a la página del módulo, vacía hasta las Fases 5 a 7 (D4-A, temporal).
  2. §6.5 y plan §5: no está documentada la señal D6-A (tarea EN_PROGRESO a cargo de alguien con la cuenta inactiva, sin cuenta o sin
     asignación vigente) ni que solo la ven el Administrador y el Supervisor.
  3. §6.8: «Ver todas las terminadas» es una vista dentro de `PaginaDesarrollo` mientras no existan los módulos.
  4. §9.2.1: «Solo mis tareas» actúa sobre las 5 terminadas visibles del tablero; decidir si debe actuar sobre todas.
  5. §8.2: aclarar que el Supervisor ve su nombre y correo en el formulario como campos de solo lectura.

## 2026-11-18 — [A+B] Fase 5, módulo 5.1 (Postulaciones), bloque 1: lectura

- **Commit:** `61f368a` (listado y detalle de postulaciones del Administrador).
- **Partición (decisión 5-A).** El módulo se hace en tres commits: 1) lectura (este), 2) decisiones y «Analizando…», 3) criterios, áreas y especialidades.
- **URLs (decisión 1-A; la propuesta no las define).** `/administrador/postulaciones`, `/administrador/postulaciones/:idPostulante` y, en el
  bloque 3, `/administrador/postulaciones/criterios`. Permiten enlaces directos, como el de una notificación. Alternativa descartada: el detalle
  como panel lateral sin ruta propia. Las rutas cuelgan del módulo, así que `puedeVerRuta` ya las limita al Administrador, y la barra superior
  resuelve el título por prefijo (`etiquetaDeRuta` respeta el límite del segmento: `postulacionesX` no es «Postulaciones»).
- **Cambio aditivo a la Fase 2.** `obtenerPostulacion` trae `decisiones: AccionDecisionPostulacion[]` calculado con `decisionesDisponibles(estado)`
  de `domain/`, igual que el detalle de tarea trae `acciones`: la pantalla no deduce qué se puede decidir a partir del estado. No hay regla nueva
  en `domain/`.
- **Listado.** Abre en «Pendientes» y por puntaje (el ranking de la consulta). Pestañas con los contadores de la consulta («Requieren revisión»
  son las pendientes con la marca, resaltada en ámbar si hay), filtros por área, especialidad y rango de fechas, búsqueda por nombre o correo sin
  distinguir mayúsculas ni tildes, y orden por puntaje o por fecha (más reciente primero, desempate por ID). Todo se aplica en memoria sobre lo que
  entrega la consulta (Q5) con funciones puras (`filtros.ts`). El rango de fechas usa el día de Perú de la postulación (`hoyEn`), con los dos
  extremos incluidos. Sin acciones en las filas: un clic abre el detalle. Estados vacíos distintos para «sin postulaciones», «sin coincidencias
  con los filtros» y cada pestaña vacía.
- **Detalle.** Datos del postulante, evaluación de la IA (puntaje final, justificación, marca de revisión, nota fija «El puntaje es una ayuda…» y
  el desglose en los dos bloques, el guardado: un cambio posterior de criterios no lo altera), CV e historial. Una aprobada dice qué cuenta de
  practicante nació de ella. Sin evaluación dice que todavía no la tiene (el flujo «Analizando…» llega en el bloque 2).
- **CV (decisión 3-A).** La semilla apunta a `/cv-ejemplo/<slug>.pdf` y esos archivos no existen: el detalle muestra el nombre del archivo, dice que el
  prototipo no incluye el documento y deja «Descargar» desactivado. No se inventa contenido de CV. Alternativa descartada: generar un archivo al vuelo.
- **Aviso sobre el uso del CV (decisión 4).** Texto de los autores: «El CV se usa únicamente para evaluar esta postulación y no para otros fines.»
  (plan §9, módulo 5.1; propuesta §10.1).
- **Notificaciones.** El aviso de una postulación lleva a su detalle: nueva tabla `RUTA_DE_DETALLE` (afina D4-A). Los demás elementos siguen yendo a
  la página de su módulo hasta que tengan detalle.
- **Motivos de la marca de revisión.** Se muestra solo la marca: los motivos (criterio obligatorio o banda ambigua) no se guardan (P7 del paso 7).
- **Estructura.** `src/paneles/administrador/postulaciones/` (empieza dentro del panel, §14.2); la barra de puntaje subirá a `compartido/` cuando
  el Dashboard (5.9) la use. `rutas.tsx` tiene ahora un mapa de módulos con pantalla (los demás siguen con su página vacía) y otro de páginas internas.
- **Pruebas y mutaciones.** 3.068 → 3.174 en 120 archivos (+106). 17 mutaciones detectadas de 17 (pestañas, extremos del rango de fechas, tildes y
  mayúsculas de la búsqueda, orden por fecha y su desempate, filtros de área y especialidad, opciones por área, prefijo del título, enlace de la
  notificación y `decisiones`), con el script que restaura los archivos, sin Git.
- **Divergencias con `docs/` (para que los autores las actualicen a mano).** (1) La propuesta no define las URLs del módulo. (2) No fija cómo se ve el
  CV en el prototipo ni el texto del aviso de uso. (3) Los motivos de la marca de revisión no se guardan, así que la pantalla muestra solo la marca.

## 2026-11-18 — [A+B] Fase 5, módulo 5.1 (Postulaciones), bloque 2: decisiones y «Analizando…»

- **Commit:** `f8baf90` (aprobar, rechazar, reconsiderar y evaluación al abrir).
- **Botones.** Salen de `decisiones` (la consulta, que usa `decisionesDisponibles` de `domain/`), no del estado: una pendiente ofrece Aprobar y
  Rechazar, una rechazada Reconsiderar y una aprobada nada (no se revierte aquí). Quien no es Administrador no recibe las decisiones porque
  la consulta le devuelve el error.
- **Aprobar.** Con confirmación. Al confirmar, `aprobarPostulacion` crea la cuenta (PRACTICANTE, ACTIVO, con contraseña temporal) y la pantalla
  muestra esa contraseña **una sola vez** en un modal (`ModalContrasenaTemporal`): usuario (el correo), contraseña, aviso de «una sola vez» y de
  que se entrega por fuera del sistema (WhatsApp o Discord) y un botón «Copiar contraseña» (si el portapapeles falla, pide copiarla a mano).
  El modal solo se cierra con «Entendido»: Escape y el clic fuera no cierran (`onOpenChange` ignora todo intento), y no hay «X». La contraseña
  vive solo en el estado del componente: no se persiste, no va al historial ni a las notificaciones y desaparece del documento al cerrar.
  `AccionesDePostulacion` sigue montado aunque la página se refresque y los botones desaparezcan, para que la contraseña no se pierda antes
  de que se vea (una prueba y una mutación lo vigilan).
- **Rechazar y reconsiderar.** Reusan `ModalConfirmacion`: el motivo (rechazar) y la nota (reconsiderar) son obligatorios; vacío o solo espacios no
  se puede confirmar, y el servicio vuelve a exigirlo. Un error del servicio llega como excepción: el modal sigue abierto con el mensaje y no se
  escribe nada. Al reconsiderar, la evaluación se conserva (§5.1).
- **«Analizando…» (E5-A, decisión 2-A).** Al abrir una postulación sin evaluación, la pantalla llama a `evaluarPostulacion` una sola vez por
  postulación y muestra «Analizando…» hasta que la consulta trae la evaluación. La semilla evalúa a las 42, así que en la demostración no se
  ve salvo que se quite una evaluación; se cubre con pruebas. Alternativa descartada: dejar una pendiente sin evaluar en la semilla (cambia la
  semilla y sus pruebas).
- **Error de evaluación (E3-A).** Si el catálogo no permite calcular el puntaje, la pantalla dice «No se pudo evaluar: <mensaje> Puedes decidir
  igualmente.» y las decisiones siguen disponibles («el Administrador decide siempre, con o sin marca»). No se reintenta en ciclo. Si otra
  pestaña ya la había evaluado (`POSTULACION_YA_EVALUADA`), no se dice nada: la consulta traerá la evaluación.
- **Código redundante retirado.** Se quitaron `onInteractOutside` y `onEscapeKeyDown` del modal de la contraseña: dos mutaciones sobrevivían
  porque `onOpenChange` vacío ya impide cualquier cierre. La protección real se vigila con una mutación sobre `onOpenChange` y otra sobre la «X».
- **Pruebas y mutaciones.** 3.174 → 3.214 en 123 archivos (+40 netas): modal de la contraseña (8), acciones (19), evaluación y decisiones en el
  detalle (14) y una del bloque 1 que quedó superada. 17 mutaciones detectadas de 17, con el script que restaura los archivos, sin Git.
- **Divergencias con `docs/` (para que los autores las actualicen a mano).** La propuesta no describe «Analizando…» (evaluar al abrir una
  postulación sin evaluación) ni el texto «No se pudo evaluar: …»; son las decisiones E5-A y E3-A del paso 7A y conviene pasarlas a §5.1 o §10.1.

## 2026-11-18 — [A+B] Fase 5, módulo 5.1 (Postulaciones), bloque 3: criterios, áreas y especialidades

- **Commit:** `b47d571` (página de criterios, áreas y especialidades del Administrador).
- **Ruta.** `/administrador/postulaciones/criterios` (decisión 1-A del bloque 1), con el enlace «Criterios de evaluación» en el listado y
  «Volver a postulaciones». La ruta fija gana a `:idPostulante` porque React Router da prioridad a los segmentos estáticos.
- **Lectura y escritura.** Lee con `listarCatalogoEvaluacion` y escribe con los siete servicios del paso 7B (`crearAreaTecnica`,
  `editarAreaTecnica`, `cambiarActivoAreaTecnica`, `crearEspecialidad`, `editarEspecialidad`, `cambiarActivoEspecialidad` y
  `guardarCriteriosDeBloque`). No hay cambios en `domain/` ni en `services/`. El adaptador `src/app/adaptadores/catalogo.ts` solo renombra
  los campos de la consulta (`suma_actual`, `valido`, `mensaje_invalido`) al modelo de la pantalla.
- **Editor de bloque.** Crea, edita y activa o desactiva criterios (nombre, tipo, peso entero, obligatorio, activo) y guarda **el bloque completo**
  en una sola operación, así pasar de 30/70 a 40/60 no pasa por una suma distinta de 100. «Suma actual: N/100» y el mensaje de validez salen de
  `sumaPesosActivos` y `validarBloqueCriterios` de `domain/`, las mismas funciones que usa el servicio; el servicio decide siempre y su error se
  muestra en la pantalla (por campo, con `criterios.<posición>.<campo>`). Un peso sin escribir no suma; un criterio **activo** sin peso no se envía.
- **Los criterios no se borran.** Los guardados solo se desactivan; «Quitar» existe solo para los nuevos que aún no se guardaron.
- **Activar solo con bloque válido.** Áreas y especialidades nacen inactivas; «Activar» está deshabilitado mientras los criterios activos de su
  bloque no sumen 100 y se explica por qué. Desactivar no arrastra a las demás. El servicio vuelve a comprobarlo y un error se muestra con un aviso.
- **Borrador.** Si lo guardado cambia de verdad el borrador se reinicia; si llega lo mismo en un objeto nuevo se conserva lo que se está escribiendo
  (se compara por una huella, no por identidad). «Descartar cambios» y «Guardar criterios» solo se habilitan con cambios.
- **Evaluaciones anteriores.** Cambiar criterios no recalcula las evaluaciones guardadas (§5.1); la pantalla lo dice en su texto.
- **Insignia y notificaciones.** `Insignia` gana el tipo `catalogo` («Activa» en verde, «Inactiva» en gris). Los avisos de área, especialidad y
  criterio llevan a `/postulaciones/criterios`.
- **Estructura.** `PaginaCriterios`, `SeccionDeArea` (con sus filas de especialidad y el botón de activar), `EditorBloqueCriterios` y
  `FormularioNombre` en `src/paneles/administrador/postulaciones/`. `SeccionDeArea` no tiene prueba propia: se cubre desde `PaginaCriterios`.
- **Pruebas y mutaciones.** 3.214 → 3.276 en 127 archivos (+62 y +4 archivos). `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores,
  con el aviso conocido en `button.tsx`. No se hicieron pruebas de mutación en este bloque.
- **Divergencias con `docs/` (para que los autores las actualicen a mano).** La propuesta no define la URL de esta sub-sección ni dice que un bloque
  se guarda completo de una vez; conviene pasarlas a §5.1.

## 2026-11-18 — [A+B] Fase 5, módulo 5.2 (Practicantes), Administrador

- **Commit:** `2f3a4c9` (módulo completo en un solo commit: lectura, acciones y ciclo de vida; rama `feat/fase5-practicantes`).
- **URLs.** `/administrador/practicantes` y `/administrador/practicantes/:idPracticante`, con el mismo patrón del 5.1 (rutas por prefijo,
  `useConsulta`, filtros puros en memoria, adaptadores en `src/app/adaptadores/`).
- **Cambios aditivos a la Fase 2 (consultas), sin tocar `domain/`.** `obtenerPracticante` trae `acciones` (editar datos, restablecer
  contraseña, finalizar, reactivar) y `tareas_a_liberar`. Salen de `puede()` y de las reglas de ciclo de vida de `domain/`
  (`finalizarPractica` y `reactivarPractica` llamadas sin texto: solo dicen si es posible y qué efectos tendría). La pantalla no deduce
  botones ni cuenta tareas. Consulta nueva `listarProyectosAsignables` (Administrador), que usa `puedeAsignarPracticante`: excluye los
  proyectos finalizados y aquellos donde ya hay una asignación vigente; con la práctica finalizada, la lista viene vacía.
- **Listado.** Abre en «Activos» (incluye a «Sin proyecto»; un finalizado nunca está en «Sin proyecto»). Columnas de §5.2: practicante, área y
  especialidad, proyectos activos, carga, última actividad, fin previsto (con «Vencida hace N días» o «Termina hoy» según la situación que
  calcula la consulta), estado (con la marca «Sin proyecto») y detalle. Filtros por área y proyecto; búsqueda por nombre o correo sin tildes.
  `Insignia` gana el tipo `practicante` (Activo, Finalizado y la marca ámbar «Sin proyecto»).
- **«Asignar a proyecto».** Atajo solo en la pestaña «Sin proyecto» (no en las demás ni en el detalle). Es un diálogo con casillas, uno o
  varios proyectos, y el propio diálogo es la confirmación; aplica `asignarPracticantes` con una lista de pares, todo o nada. El estado vive
  en la página y no en la fila, porque al asignar la persona sale de «Sin proyecto» y su fila desaparece. El error del servicio se muestra sin
  cerrar el diálogo.
- **Editar datos de la práctica (F5-A).** Especialidad (solo activas, más la actual aunque esté inactiva; el área sigue a la especialidad),
  ingreso y fin. Al cambiar el ingreso se propone el fin con `fechaFinPrevista` de `domain/` y la duración de `PRACTICA_DURACION_MESES`
  (leída con `obtenerConfiguracion`), y se envían las dos fechas. Si el fin se escribió a mano, no se pisa. Que el fin no sea anterior al
  ingreso lo comprueba el servicio y su mensaje sale en el campo.
- **Restablecer contraseña.** Confirmación y modal de una sola vez. Se reutiliza `ModalContrasenaTemporal` (de `postulaciones/`, sin moverlo
  a `compartido/` para no tocar el 5.1) con un título opcional («Contraseña restablecida»). No llega al historial ni a las notificaciones.
  No se ofrece a un practicante con la práctica finalizada (el servicio ya lo exige).
- **Finalizar.** Motivo obligatorio y el aviso «Tiene N tareas en progreso que serán liberadas» (singular y «No tiene tareas en progreso»)
  antes de confirmar, con N de `tareas_a_liberar`. Dice que las tareas que esperan supervisión no se liberan.
- **Reactivar.** Nota obligatoria; explica que las asignaciones antiguas no se reactivan (queda en «Sin proyecto») y que la fecha de fin
  prevista no cambia (F4-A), por lo que puede quedar vencida.
- **Línea de tiempo y avisos.** `eventos.ts` gana las etiquetas de los seis eventos de practicante y no muestra el resumen
  «ACTIVO → INACTIVO» en finalizar y reactivar (la acción ya lo dice). El aviso de un usuario para el Administrador lleva al detalle del
  practicante (`RUTA_DE_DETALLE.ADMINISTRADOR.USUARIO`, afina D4-A); por eso `notificacion.test.ts` cambió su expectativa a
  `/administrador/practicantes/<id>`. El Supervisor sigue yendo a la página del módulo.
- **Pruebas.** 3.276 → 3.380 en 134 archivos (+104 y +7 archivos). `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con
  el aviso conocido en `button.tsx`; `git diff -- docs` vacío. No se hicieron pruebas de mutación en este módulo.
- **Divergencias con `docs/` (para que los autores las actualicen a mano).** La propuesta no define las URLs del módulo, ni cómo es el
  atajo «Asignar a proyecto» (diálogo con selección múltiple), ni el texto en singular del aviso de tareas, ni la propuesta automática de la
  fecha de fin que no pisa una edición a mano. Conviene pasarlos a §5.2.
- **Siguiente paso.** Módulo 5.3 (Supervisores).

## 2026-11-19 — [A+B] Fase 5, módulo 5.3 (Supervisores), Administrador

- **Commits:** `b0d150f` (bloque 1, lectura), `97fda22` (bloque 2a, `ModalContrasenaTemporal` a `compartido/`), `16b67b6` (bloque 2b, cuenta) y
  `c5d5e0d` (bloque 3, ciclo de vida); rama `feat/fase5-supervisores`. Mismo patrón del 5.2 (rutas por prefijo, `useConsulta`, filtros puros
  en memoria, adaptadores en `src/app/adaptadores/`).
- **URLs.** `/administrador/supervisores` y `/administrador/supervisores/:idSupervisor`.
- **Indicador de sobrecarga (decisión de los autores, opción A).** §5.3 dice que la sobrecarga «se ve como indicador en el listado» pero no define
  umbral ni forma. No se inventa ninguno: el listado muestra los números y resalta en ámbar «Tareas por revisar» cuando es mayor que 0.
  Descartadas: reutilizar un umbral de Configuración (B) y definir uno nuevo, que tocaría Configuración y `domain/` (C).
- **Bloque 1 (lectura).** Listado con pestañas Activos (abre ahí), Inactivos y Todos con los contadores de la consulta, y búsqueda por nombre o
  correo sin tildes; columnas de §5.3. Detalle de solo lectura: contacto, proyectos a cargo con la reunión semanal (`textoReunion`, «Sin definir»
  si falta) y cuántos practicantes tienen, tareas por revisar con los días que llevan esperando, proyectos anteriores y línea de tiempo.
  `Insignia` gana el tipo `supervisor` (Activo y Inactivo). `eventos.ts` gana las etiquetas de los eventos `SUPERVISOR_*` y de
  `PROYECTO_SUPERVISOR_CAMBIADO`, y desactivar y reactivar no muestran el resumen «ACTIVO → INACTIVO». Los avisos al Administrador sobre un usuario
  son siempre de practicantes, así que `RUTA_DE_DETALLE` no cambia.
- **Bloque 2a (`ModalContrasenaTemporal` a `compartido/`, decisión de los autores).** Pasa a usarse en 5.1, 5.2 y 5.3; se mueve con su prueba y se
  ajustan los imports de `AccionesDePostulacion` y `AccionesDePracticante`. Cambio mecánico, en su propio commit.
- **Bloque 2b (cuenta).** «Nuevo supervisor» es un diálogo con nombre, correo y celular; el correo y el celular reutilizan `esquemaCorreo` y
  `esquemaCelular` del servicio y el servicio vuelve a validar. Muestra la contraseña temporal una sola vez («Cuenta de supervisor creada»); no llega
  al historial ni a las notificaciones. Editar nombre y correo envía solo lo que cambió; el celular, Discord y GitHub los edita el propio
  supervisor. Restablecer contraseña: confirmación y modal de una sola vez («Contraseña restablecida»), no se ofrece a una cuenta inactiva.
  Si el error ya salió junto a un campo (por ejemplo, el correo repetido), la alerta general no lo repite.
- **Bloque 3 (ciclo de vida).**
  - **Consulta ampliada, aditiva y sin tocar `domain/`.** `obtenerSupervisor` trae `acciones` (editar, restablecer, reasignar, desactivar y reactivar),
    `proyectos_pendientes` (la cantidad que da la regla `desactivarSupervisor`) y `supervisores_destino` (filtrados con `puedeCambiarSupervisor`:
    activos, distintos y con algún proyecto a cargo que no esté finalizado). «Desactivar» se ofrece también con proyectos pendientes para poder
    explicar el bloqueo; con la cuenta inactiva no.
  - **Desactivar.** Con proyectos pendientes abre «No se puede desactivar» con «Tiene N proyectos pendientes: reasígnalos primero.» (singular:
    «Tiene 1 proyecto pendiente: reasígnalo primero.») y ofrece ir a reasignar; el N lo trae la consulta, la pantalla no cuenta. Los proyectos
    finalizados no cuentan y uno en pausa sí. Sin pendientes, confirmación simple (el servicio no pide motivo). Si cambian los datos con la
    confirmación abierta, la pantalla se actualiza sola y pasa al aviso de bloqueo.
  - **Reactivar.** Confirmación simple; no recupera los proyectos que tenía.
  - **Reasignar proyectos (G4-A y F1-A).** Diálogo con un selector por proyecto activo o en pausa; «Reasignar» solo se habilita cuando todos tienen
    supervisor elegido (aunque el servicio no lo exija). Se aplica todo o nada con `reasignarProyectosDeSupervisor` y, si el servicio rechaza algún
    proyecto, el mensaje queda en el diálogo sin escribir nada. Las tareas que esperan supervisión siguen al proyecto (lo hace el servicio).
- **Pruebas.** 3.380 → 3.477 en 141 archivos (+97 y +7 archivos). `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el aviso
  conocido en `button.tsx`; `git diff -- docs` vacío. No se hicieron pruebas de mutación. Con el equipo lento algunas pruebas pesadas de 5.1 a 5.3
  superan el límite de 5 s y pasan con `--testTimeout=60000`; no cambia ninguna lógica.
- **Divergencias con `docs/` (para que los autores las actualicen a mano).** La propuesta no define las URLs del módulo, ni «Nuevo supervisor»
  como diálogo, ni el diálogo de reasignación con un selector por proyecto, ni el texto del bloqueo al desactivar (singular incluido). La
  sobrecarga queda sin umbral: solo el resalte en ámbar. Conviene pasarlos a §5.3.
- **Siguiente paso.** Módulo 5.4 (Proyectos).

## 2026-11-19 — [A+B] Fase 5, módulo 5.4 (Proyectos), bloques 1 y 2: lectura y tablero

- **Commits:** `5431b8a` (bloque 1, lectura) y `da41753` (bloque 2, tablero). Rama de trabajo del módulo; quedan los bloques 3 (datos del proyecto:
  crear, editar, reunión y enlaces) y 4 (equipo y ciclo de vida).
- **Partición (decisión de los autores).** Cuatro bloques: 1) lectura, 2) tablero y detalle de tarea, 3) datos del proyecto y 4) equipo y ciclo de
  vida. Mismo patrón de 5.1 a 5.3: rutas por prefijo, `useConsulta`, filtros puros en memoria y adaptadores en `src/app/adaptadores/`.
- **URLs.** `/administrador/proyectos`, `/administrador/proyectos/:idProyecto` y `/administrador/proyectos/:idProyecto/tareas/:idTarea`. Las pestañas
  del detalle van en `?pestana=resumen|tablero|equipo` (decisión de los autores: un solo componente de detalle, y la pestaña se puede enlazar);
  una pestaña desconocida abre «Resumen», y «Equipo» y «Tablero» solo piden sus datos cuando se abren.
- **Bloque 1 (lectura).** Listado con pestañas Activos (abre ahí), En pausa, Finalizados y Todos con los contadores de la consulta, filtro por
  supervisor y búsqueda **por nombre** (no por código, como dice §5.4). Columnas de §5.4: avance como «N de M · P %» o «Sin tareas», tareas esperando
  supervisión resaltadas en ámbar cuando hay alguna, y próxima reunión como fecha y hora en Perú o «Sin definir». Resumen: datos del proyecto, avance,
  tareas por estado en el orden del flujo, vencidas, enlaces (solo lectura) y actividad reciente; el repositorio es un enlace que abre en otra
  pestaña. Equipo: activos con su carga en el proyecto y anteriores con alta y baja. `eventos.ts` gana las etiquetas de los 12 eventos de proyecto y
  pausar, reanudar, finalizar y reactivar no muestran el resumen de estado crudo. El aviso de un proyecto lleva al Administrador a su detalle
  (`RUTA_DE_DETALLE.ADMINISTRADOR.PROYECTO`, afina D4-A). Sin ampliar consultas.
- **Bloque 2 (tablero).**
  - **Detalle de tarea (decisión de los autores, opción A).** Se extrae el contenedor del detalle de tarea de `PaginaDesarrollo` a
    `src/app/tareas/DetalleDeTarea.tsx`, con el mapeador de acciones, el formulario de edición y `ModalCrearPR`; lo reutilizará el módulo 5.5 en
    `/administrador/tareas/:idTarea`. `PaginaDesarrollo` pasa a usar el mismo componente. Una tarea de otro proyecto no se muestra por la dirección de
    un proyecto («No se encontró la tarea en este proyecto.»). «Volver al tablero» regresa a `?pestana=tablero`.
  - **«Nueva tarea» en el Tablero del 5.4 (decisión de los autores).** Diálogo con `FormularioTarea` en modo «crear» y el proyecto ya fijado; el 5.5
    lo reutilizará. Se ofrece en un proyecto activo o en pausa (§5.4: en pausa solo se bloquea tomar tareas) y no en uno finalizado.
  - **Ampliación aditiva de la Fase 2.** `obtenerTableroProyecto` trae `puede_crear_tarea`, calculado con `puede('CREAR_TAREA')` de `domain/`: la
    pantalla no decide cuándo ofrecer «Nueva tarea». `FormularioTarea` recibe un `entorno` opcional, como los demás formularios (sin él las pruebas
    esperaban la demora simulada).
  - **Avisos del tablero.** Finalizado: «el tablero es de solo lectura»; en pausa: «nadie puede tomar tareas nuevas». Los servicios son los que lo
    hacen cumplir; la pantalla solo lo dice. Ninguna acción se ejecuta desde una tarjeta (§6.7).
  - **Avisos de tarea.** Un aviso de `TAREA` sigue yendo a la página del módulo: sin el ID del proyecto no se puede armar la dirección del detalle
    dentro del proyecto. Se afina en el 5.5.
- **Pruebas.** 3.477 → 3.571 en 147 archivos (+94 y +6 archivos de prueba). `tsc -b`, Prettier y `npm run build` correctos; ESLint sin errores, con el
  aviso conocido en `button.tsx`; `git diff -- docs` vacío. No se hicieron pruebas de mutación. Se ajustaron pruebas existentes por los campos nuevos
  (`tablero`, `FormularioTarea`, una consulta de `proyectos` y `notificacion`) y el ejemplo de «evento sin etiqueta» de `eventos.test.ts` pasó de
  `PROYECTO_PAUSADO` a `AREA_TECNICA_CREADA`.
- **Divergencias con `docs/` (para que los autores las actualicen a mano).** La propuesta no define las URLs del módulo, ni que las pestañas vayan en
  `?pestana=`, ni la dirección del detalle de tarea dentro del proyecto, ni dónde vive «Nueva tarea» entre 5.4 y 5.5, ni los textos de los avisos
  del tablero. Conviene pasarlos a §5.4.
