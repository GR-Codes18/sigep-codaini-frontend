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
