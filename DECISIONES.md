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
