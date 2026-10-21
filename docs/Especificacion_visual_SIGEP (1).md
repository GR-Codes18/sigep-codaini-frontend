# Especificación visual — SIGEP CODAINI (v0.2)

> Estado: **paleta A cerrada** (tema claro y oscuro validados con Google Stitch). Esta es la fuente única de estilos para el desarrollo. La Paleta B (barra lateral azul profundo) se descartó.

## 1. Principios

- Interfaz **sobria, clara y densa en información**: es una herramienta de trabajo, no una landing.
- Jerarquía por **tamaño, peso, espacio y capas de tono**, no por efectos.
- Un solo color de acción (verde esmeralda). El resto es neutro; los colores de estado se usan **solo** para estados.
- **Prohibido:** neón/cian brillante, degradados, brillos o "glow", glassmorphism, sombras fuertes, emojis como iconos, textos de relleno (lorem ipsum), negro puro `#000000`.
- Todo componente debe funcionar en **tema claro y oscuro** usando únicamente los tokens de abajo (nunca colores escritos a mano en los componentes).

## 2. Colores base

Tres capas de tono: **fondo** (la más oscura en tema oscuro), **superficie** (sidebar, barra superior, tarjetas, tablas) y **superficie 2** (hover, cabecera de tablas, campos).

| Token | Tema claro | Tema oscuro |
|---|---|---|
| `--bg` (fondo de la app) | `#F7F9FC` | `#0F141B` |
| `--surface` (sidebar, barra superior, tarjetas, tablas) | `#FFFFFF` | `#181E27` |
| `--surface-2` (hover, cabecera de tabla, inputs) | `#F0F3F8` | `#1F2733` |
| `--border` | `#E1E6EF` | `#283241` |
| `--text` | `#0A192F` | `#E6E9EF` |
| `--text-2` (secundario) | `#5B6785` | `#9BA3B2` |
| `--primary` (botón principal) | `#58C481` | `#58C481` |
| `--primary-hover` | `#4AB574` | `#6BD093` |
| `--on-primary` (texto sobre botón) | `#0A192F` | `#0F141B` |
| `--link` (texto/enlaces verdes) | `#137A4A` | `#7FD9A3` |
| `--active-bg` (ítem activo del menú) | `#58C481` al 14 % | `#58C481` al 14 % |
| `--active-text` | `#137A4A` | `#7FD9A3` |
| `--focus` | `#58C481` | `#58C481` |
| `--danger` | `#D64545` | `#D64545` |

Notas:
- Los valores del fondo y la superficie oscuros salen de una interfaz de referencia; `--surface-2` y `--border` oscuros son derivados y se pueden ajustar al implementar.
- `#58C481` **no** se usa como color de texto sobre fondo claro; para eso existe `--link`.
- El gris pizarra `#8892B0` se usa solo en iconos y detalles, no en texto pequeño.
- Verificar contraste (mínimo 4,5:1 en texto) antes de dar por final.

## 3. Colores de estado

Cada estado se muestra como **badge**: fondo suave + texto oscuro (tema claro) o texto claro sobre el color base al ~16 % de opacidad (tema oscuro). El color base se usa para el borde superior de la columna Kanban y el punto del badge.

### Tareas (Kanban)

| Estado | Base | Badge claro (fondo / texto) | Texto en tema oscuro |
|---|---|---|---|
| Disponible | `#8892B0` | `#EEF1F7` / `#4A5578` | `#B4BDD6` |
| En progreso | `#3B7DDD` | `#E8F0FD` / `#1B4FA8` | `#8DB4F5` |
| Esperando supervisión | `#F2B01E` | `#FFF4D6` / `#8A5A00` | `#F5C85C` |
| Terminada | `#58C481` | `#E4F6EC` / `#137A4A` | `#7FD9A3` |
| Devuelta con observaciones (marca sobre una tarea "En progreso") | `#D64545` | `#FDE8E8` / `#A12626` | `#F59A9A` |

### Postulaciones

| Estado | Color |
|---|---|
| Pendiente | Azul (como "En progreso") |
| Requiere revisión manual | Ámbar (como "Esperando supervisión") |
| Aprobada | Verde (como "Terminada") |
| Rechazada | Rojo |

- El texto rojo usa --danger-text (#A12626 claro / #F59A9A oscuro). --danger (#D64545) se reserva solo para fondos, bordes e íconos

### Proyectos

| Estado | Color |
|---|---|
| Activo | Verde |
| En pausa | Ámbar |
| Finalizado | Gris pizarra |

### Uso del rojo (`--danger`)

No existe un "estado de error" en las tareas. El rojo se reserva para:
1. Acciones destructivas o de rechazo (Rechazar postulación, Eliminar).
2. Errores de formulario y fallos de una acción.
3. Alertas de atraso (fecha límite vencida, proyecto con posible atraso).
4. La marca "Devuelta con observaciones" del Kanban.

## 4. Tipografía

- **Títulos y marca:** Montserrat SemiBold / Bold.
- **Cuerpo, tablas, formularios, botones:** Inter 400 / 500 / 600, con números tabulares en tablas. Las fechas van en Inter, no en monoespaciada.
- Escala: H1 24 px · H2 18 px · H3 16 px · cuerpo 14 px · tablas 13–14 px · texto auxiliar 12 px.
- No usar Montserrat Light ni tamaños menores a 12 px.

## 5. Forma y espaciado

- Espaciado en múltiplos de 4 px.
- Radio: 6 px en botones, inputs y ítem activo del menú; 10 px en tarjetas y modales.
- Bordes de 1 px (`--border`) en lugar de sombras. Como máximo una sombra muy suave en menús desplegables y modales.
- Iconos: Lucide, trazo de 1,5 px, tamaño 16–20 px.
- Tablas compactas: filas de ~44 px, cabecera en `--surface-2`.
- Foco visible en todos los elementos interactivos.

## 6. Estructura de la interfaz (validada)

- **Sidebar** en `--surface`, borde derecho de 1 px. Dashboard arriba sin grupo; luego grupos con etiqueta pequeña en mayúsculas (`--text-2`):
  - GESTIÓN: Postulaciones, Practicantes, Supervisores.
  - PROYECTOS: Proyectos, Tareas.
  - ANÁLISIS: Reportes.
  - SISTEMA: Configuración.
  - (Borrador: los módulos definitivos de cada panel se fijan en la siguiente etapa.)
- **Ítem activo:** fondo `--active-bg`, texto `--active-text`, esquinas de 6 px, sin barra lateral.
- **Barra superior** en `--surface`: ruta de navegación a la izquierda; a la derecha botón de tema, campana de notificaciones (con punto verde si hay nuevas) y menú de usuario.
- **Tarjetas de métricas:** número grande, título, una sola línea de apoyo corta (que no se corte ni se parta). Icono pequeño en cuadrado de 32 px con esquinas de 8 px en **gris neutro**; solo la tarjeta que requiere atención lleva color (ámbar o rojo).
- Pie del sidebar: usuario o estado de conexión (opcional).

## 7. Logo

- Isotipo de CODAINI: círculo con arcos concéntricos en forma de "C", **negro**.
- **Decisión:** el logo se muestra siempre dentro de un **recuadro blanco pequeño** (esquinas de 6 px, con aire alrededor), en ambos temas, para no alterar la identidad.
- Se muestra **una sola vez**, arriba del sidebar. Si el recuadro ya incluye el nombre, no repetirlo al lado.

## 8. Variables CSS de referencia

```css
:root, [data-theme="light"] {
  --bg:#F7F9FC; --surface:#FFFFFF; --surface-2:#F0F3F8; --border:#E1E6EF;
  --text:#0A192F; --text-2:#5B6785;
  --primary:#58C481; --primary-hover:#4AB574; --on-primary:#0A192F;
  --link:#137A4A; --active-text:#137A4A; --focus:#58C481; --danger:#D64545;
  --danger-text:#A12626;
  --active-bg:rgba(88,196,129,.14);
}
[data-theme="dark"] {
  --bg:#0F141B; --surface:#181E27; --surface-2:#1F2733; --border:#283241;
  --text:#E6E9EF; --text-2:#9BA3B2;
  --primary:#58C481; --primary-hover:#6BD093; --on-primary:#0F141B;
  --link:#7FD9A3; --active-text:#7FD9A3; --focus:#58C481; --danger:#D64545;
  --danger-text: #F59A9A;
  --active-bg:rgba(88,196,129,.14);
}
```

## 9. Correcciones pendientes respecto a las pantallas de Stitch

Las capturas de Stitch son **referencia de color y estilo**, no de contenido. Al construir las pantallas reales:

**Maquetación**
- Tarjetas de métricas: textos que se cortan con "…"; acortar o dar más espacio.
- Tabla de postulaciones: columna "Acción" cortada, fechas en dos líneas y en monoespaciada, "Ver detalle" partido. Sidebar más angosto o menos columnas.
- Logo repetido dentro del sidebar (recuadro con nombre + texto al lado).
- Títulos de página pegados a la barra superior; más espacio.
- Kanban: no repetir en cada tarjeta el estado de su columna ("En desarrollo", "Aprobada", "Pendiente revisión"); dejar solo las excepciones (Devuelta con observaciones, fecha vencida).
- Iconos de tarjetas en gris neutro (ver sección 6). No mostrar a la vez un aviso rojo y otro ámbar para lo mismo.

**Contenido**
- La tabla de postulaciones debe usar estados de **postulación** (Pendiente, Requiere revisión manual, Aprobada, Rechazada), no de tareas.
- Fechas de 2026, no 2024.
- Rol "Administrador" (no "Super Administrador").

**Elementos inventados por Stitch que NO existen en el modelo (no construir salvo que se decida)**
- Sprints ("Sprint Activo 04", "Configurar sprint", "tareas bloqueadas en Sprint 2").
- Prioridad de tareas (Alta/Media/Baja).
- "Gestionar cupos", "Capacidad asignada", "Convocatoria 2024-II".
- "Motor de Evaluación IA v1.8", "Recalcular matriz", estado "Apto para entrevista técnica".
- Versión del sistema ("SIGEP v2.4") y lugar de la reunión ("Virtual - Sala 2").
- Por decidir: "Exportar reporte" y el filtro "Últimos 30 días".
