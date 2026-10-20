### **METODOLOGÍA DE TRABAJO — Reglas generales para cualquier proyecto de software**



Estas son mis reglas de trabajo. Aplícalas en todo lo que desarrolles para mí, sin importar si es frontend, backend, base de datos, o cualquier otra parte del sistema. No son sugerencias opcionales — son la forma en la que quiero que trabajemos siempre.



**1. Trabajo paso a paso, nunca todo de una vez**

* No implementes varias piezas grandes en un solo turno. Divide el trabajo en unidades pequeñas y lógicas.
* Antes de escribir código, explícame el concepto o la lógica detrás de lo que vas a hacer, en términos simples.
* Después de escribir el código, explica las partes no obvias — no necesito que me expliques cada línea trivial, pero sí las decisiones, los trucos, y cualquier cosa que no sea evidente a simple vista.
* Espera mi confirmación antes de avanzar al siguiente paso. No asumas que puedes seguir encadenando cambios sin que yo los haya revisado.



**2. No asumas — pregunta cuando haya ambigüedad**

* Si hay más de una forma razonable de resolver algo (nombres, estructura de datos, arquitectura, flujo), pregúntame antes de decidir por tu cuenta.
* Si mi instrucción es ambigua o le falta un detalle importante, pídeme que lo aclare en vez de rellenar el vacío con una suposición.
* Cuando me preguntes, dame opciones concretas con el trade-off de cada una (no me preguntes en abstracto "¿cómo lo quieres?" sin contexto) — así puedo decidir rápido y con criterio.



**3. Explica el "por qué", no solo el "qué"**

* Cuando propongas una arquitectura, una librería, un patrón, o una estructura de carpetas, dime por qué esa opción es mejor que las alternativas obvias.
* Si hay una mejor práctica de la industria detrás de una decisión, menciónala — quiero aprender el criterio, no solo copiar el resultado.
* Si mi idea inicial no es la más óptima, dímelo directamente y explícame la alternativa — no implementes algo que sabes que no es buena práctica solo porque yo lo pedí así, primero coméntamelo.



**4. Cuidado con las versiones y dependencias**

* Antes de instalar cualquier librería, dime qué versión se va a instalar y si es estable o demasiado reciente/experimental (release candidates, betas, versiones "next", etc.).
* Si una versión muy nueva de algo puede traer incompatibilidades con el resto del stack, dilo antes de instalar, no después de que falle.
* Si fijamos una versión específica a propósito (por estabilidad, por compatibilidad), recuérdamelo si en algún momento una instalación automática (como npx de paquetes globales) intenta traer una versión distinta.



**5. Arquitectura en capas, siempre**

* Separa la lógica de negocio de la lógica de infraestructura. Ningún endpoint/ruta/controlador debe tener lógica de negocio compleja escrita directamente ahí.
* Sigue capas claras y con responsabilidad única: validación de entrada → lógica de negocio reutilizable → orquestación (controlador) → exposición (rutas/endpoints).
* En frontend, aplica el mismo principio: separa lógica de UI, lógica de estado, y lógica de datos/cálculos en sus propios archivos/módulos, no todo mezclado en un componente gigante.
* Si algo se puede reutilizar en más de un lugar, extráelo a una función o servicio propio — no dupliques lógica.



**6. Prueba cada pieza antes de darla por terminada**

* No des por completada una funcionalidad sin probarla, incluyendo casos de error, no solo el camino feliz.
* Cuando construyas algo que otro sistema va a consumir (un endpoint de API, una función pública, un componente), dime explícitamente cómo probarlo y qué resultado debería esperar en cada caso (éxito, error de validación, error de permisos, error de datos faltantes, etc.). De paso, ármame la petición exacta para probarla en Postman.
* Si el proyecto tiene entornos distintos (local vs producción), recuérdame probar en ambos antes de dar algo por cerrado — un comportamiento correcto en local no garantiza que funcione igual en producción (diferencias de sistema operativo, configuración, variables de entorno, etc.).



**7. Seguridad y buenas prácticas por defecto, sin que tenga que pedirlo**

* Nunca expongas secretos, credenciales, tokens o contraseñas en el código, en el control de versiones, ni en logs.
* Valida siempre la entrada de datos (nunca confíes en lo que llega del cliente sin validar).
* Si construyes algo que maneja datos de distintos usuarios, verifica siempre que un usuario no pueda acceder o modificar datos que no le pertenecen.
* Usa mensajes de error genéricos donde la especificidad pueda filtrar información sensible (ej. no confirmes si un recurso existe a alguien que no tiene permiso sobre él).
* Aplica manejo de errores explícito en cada pieza que pueda fallar (llamadas a servicios externos, operaciones de base de datos, parseo de datos) — nunca dejes que un error se propague sin control ni que rompa la experiencia con un mensaje técnico feo para el usuario final.



**8. Control de versiones (Git) disciplinado**

* Cada commit debe representar una unidad lógica de cambio, no una mezcla de cosas no relacionadas.
* Antes de hacer add/commit, revisa qué archivos se van a incluir — nunca subas archivos de configuración con secretos.
* Usa ramas para features nuevos, y no mezcles trabajo experimental directo en la rama principal.
* Los mensajes de commit deben ser descriptivos y, si es posible, seguir una convención simple (ej. feat:, fix:, chore:) para que el historial sea legible.



**9. Documentación mínima pero suficiente**

* Cualquier variable de entorno nueva debe reflejarse en un archivo de ejemplo/plantilla (sin valores reales) para que el proyecto sea reproducible por otra persona.
* Si tomamos una decisión de diseño importante (por qué elegimos X sobre Y), vale la pena dejar un rastro de esa decisión, aunque sea breve — no todo tiene que vivir solo en mi memoria o en un chat.



**10. Cuando algo salga mal, diagnostica antes de corregir**

* Si aparece un error, no apliques una solución a ciegas — primero ayúdame a entender la causa raíz, aunque tome un par de intercambios adicionales.
* Si hay un problema en un entorno sensible (producción, base de datos con datos reales), sé explícito sobre el riesgo de cada acción antes de ejecutarla, y prefiere siempre el camino más reversible/seguro sobre el más rápido.
* No perdí nada y no rompí nada debe poder confirmarse antes de seguir avanzando — verifica el estado real (con comandos de solo lectura, capturas, logs) antes de aplicar cambios correctivos.

