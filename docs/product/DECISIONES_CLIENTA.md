# Decisiones confirmadas por la clienta — Áureo

Última consolidación: 28 de agosto de 2026.

Esta es la referencia rápida para desarrolladores y asistentes de IA. Resume decisiones confirmadas; ante dudas se debe consultar también la especificación completa del eje.

## Principios permanentes

- Áureo tiene exactamente cinco ejes: Umbral, Mundos, Mi Balance, Núcleo y Edad Dorada.
- Conocimiento no existe como eje. Su ruta antigua solo redirige a Edad Dorada.
- La fuente oficial usa Vue 3, TypeScript, Vite, Pinia y Vue Router. Las referencias antiguas a Vanilla JS como arquitectura permanente están obsoletas.
- La experiencia debe sentirse como una aplicación continua, con fondo y navegación persistentes.
- Los efectos de iluminación de los espacios internos forman parte del fondo continuo; no se recortan en los límites de cada sección.
- La identidad general es Noche + Oro. El color zodiacal de la persona aparece como un matiz sutil en toda la experiencia sin reemplazar los colores base; Edad Dorada lo expresa con mayor presencia.
- Por ahora no existe distinción funcional entre versión gratuita y Premium: los cinco ejes permanecen accesibles.
- La IA queda fuera de la Fase 1 con 20 testers. Una futura IA reflejaría patrones; no será un chatbot ni dará consejos.
- No agregar productividad convencional, presión, juicio o funciones que intenten ordenar el caos personal.

## Cuentas, sincronización y privacidad

- Durante la etapa local vigente, la aplicación inicia una sesión persistente del dispositivo en `localStorage` y no solicita correo.
- La aplicación será multiusuario más adelante; el acceso por cuenta y la sincronización con Supabase quedan pausados mientras esté activo el modo local.
- Umbral, Mundos, Mi Balance y Edad Dorada conservan la arquitectura de sincronización remota, pero el arranque local no realiza llamadas a Supabase.
- Debe funcionar offline. Cuando se reactive el modo multiusuario, la sincronización podrá retomarse al recuperar conexión; durante el modo local vigente no se dispara.
- Los conflictos se resuelven de forma determinista mediante `client_updated_at` y `mutation_id`.
- Núcleo vive exclusivamente en el dispositivo. Nunca se envía a Supabase, analítica, copias remotas ni IA, ni siquiera cifrado.
- Se mantiene el prefijo histórico `aureo_`.
- Toda migración debe preservar datos y estar versionada.
- Supabase queda detrás de la interfaz de almacenamiento; las pantallas no se conectan directamente al proveedor.

## Onboarding

- Debe ser breve: bienvenida, privacidad, nombre, nacimiento, signo, melodía de tres notas y espacios opcionales. En la etapa local no incluye cuenta ni correo.
- No existe un paso para crear decretos.
- Al terminar se entra inmediatamente a Umbral.
- La melodía es la llave de Núcleo.
- Debe explicarse que Núcleo nunca sale del teléfono.
- El espacio opcional es Lo que cuido, que agrupa Compañeros y Plantas.

## Eje 1 — Umbral

- Es el inicio del día; no es un calendario ni una lista tipo Google Tasks.
- Muestra fecha, información lunar o simbólica, número, signo del día, arcano y palabra de poder.
- El arcano diario se conserva y se acumula en un mazo histórico consultable.
- El signo del día es universal, no el signo natal.
- M4 se llama **Lo que tengo en mente hoy**.
- El botón de guardar solo aparece cuando existe texto.
- Una intención completada desaparece y se transforma en un punto de luz.
- Estado vacío: “El día está en blanco. También es un lujo.”
- Incluye **Mi pulso de hoy**, con pregunta diaria y respuesta libre.
- Cultivo y Destellos dejan de mostrarse, pero sus datos se preservan.
- El símbolo de marca Luna + espiral Fibonacci sigue vigente.
- Existe captura rápida global para guardar algo para hoy o después; nunca aparece dentro de Núcleo.

## Eje 2 — Mundos

- Contiene Vínculos, Decretos, Lo que cuido, Hobbies y Travesías. Mi Balance no aparece aquí.
- Su entrada es una flor SVG de cinco pétalos; cada uno se ilumina cuando el submundo tiene contenido.
- Frase: “Todo lo que ya es tuyo.” El grid aparece como segunda capa mediante “Ver todos”.
- La portada no repite el título grande “Mundos”; el nombre permanece en la navegación y como encabezado semántico oculto.
- Compañeros y Plantas viven bajo **Lo que cuido**.
- Los recordatorios de cuidado son pequeños, poco invasivos y aparecen al entrar a Mundos.

### Vínculos

- Tipos: Amor, Familia, Amistad, Raíz y Guía.
- Estado vacío: “Cada persona que agregas enciende un punto.”
- Campos: “¿Cómo se llama?” y “¿Cuál es su signo?”.
- Mi Constelación muestra directamente el mapa orbital y su leyenda, sin una frase explicativa adicional antes de las órbitas.

### Decretos

- Categorías: Ser, Vivir y Tener. Acción: “Lo decreto”.
- La activación es un ritual de tres pulsaciones; su intensidad aumenta con el uso.
- Mantener presionado permite marcar “Esto ya es mío”.
- Siete activaciones pueden generar un nodo sin texto en Edad Dorada con origen `decreto_mundos`.

### Hobbies

- La metáfora es un jardín de sensaciones, no una lista administrativa.
- Entrada mínima: nombre y “¿Cómo te hace sentir?”. Estados: activo y pausa.
- La acción se llama “Lo viví hoy”.
- El flow máximo puede crear un nodo sin texto en Edad Dorada con origen `hobby_flow_total`.

### Travesías

- Registra lugares visitados o decretados y el campo opcional “¿Qué viviste ahí?”.
- Las coordenadas son persistentes.
- La eliminación usa un diálogo interno, nunca `window.confirm()`.
- Travesías se representa sobre un mapa y conserva coordenadas reales junto con el recuerdo opcional “¿Qué viviste ahí?”.
- Por decisión del 29-08-2026, el mapa estático de Travesías se reemplaza por un mapa Leaflet interactivo: permite buscar cualquier lugar mediante OpenStreetMap o tocar el mapa. Las consultas de búsqueda son explícitas, no se muestran coordenadas ni mensajes redundantes, y los registros continúan guardándose mediante el repositorio existente.

## Eje 3 — Mi Balance

- Nombre visible: **Mi Balance**. No mostrar “Finanzas”.
- Registra ingresos, gastos y categorías; el saldo está oculto por defecto.
- Símbolos de privacidad: ojo, balanza o sello.
- Categorías: El nido, El cuerpo, El movimiento, El cuidado, Lo inesperado y Lo que construyo.
- Las metas son Darumas elegidos por color.
- La portada no repite el título grande “Mi Balance”; el nombre permanece en la navegación y en las vistas funcionales.
- La composición principal es un bonsái de cerezo que hace visible el peso relativo de las categorías mediante sus ramas; cada gasto abre una flor. No muestra una balanza flotante sobre el árbol.
- El bonsái aparece solo en la portada. La vista funcional no repite el árbol ni sus flores; los gastos se consultan en “Últimos movimientos”.
- Admite ingreso base y la marca de movimientos fijos mensuales.
- Cada Daruma admite aportes hasta completar su objetivo y comunica el significado de su color.
- Debe generar claridad, nunca ansiedad o juicio.
- Un Daruma completado puede enviarse voluntariamente a Edad Dorada.
- Solo se transfiere `timestamp`, `origen: daruma_balance` y `daruma_color`; nunca texto ni datos financieros.

## Eje 4 — Núcleo

- Es el espacio más privado de la persona y se abre con la melodía elegida.
- La portada no repite el título grande “Núcleo”; el nombre permanece en la navegación y como encabezado semántico oculto.
- La melodía se solicita una vez por franja: día, tarde y noche; la sesión vive en `sessionStorage`.
- Los pensamientos son destellos con posición persistente y tono asignado localmente.
- Tonos: Cosmos, Oro, Salvia, Ocaso, Ciruela y Marfil.
- Los pensamientos son permanentes; no ofrecer eliminación.
- Ningún dato sale del dispositivo.

## Eje 5 — Edad Dorada

- Reúne declaraciones, logros y momentos elegidos por la persona.
- La portada no repite el título grande “Edad Dorada”; el nombre permanece en la navegación y como encabezado semántico oculto.
- No es una línea temporal ni una lista: es una composición espacial tridimensional.
- Metáfora cerrada: **Kintsugi Invertido / La Resina de Oro**. Revela el caos como parte valiosa de la escultura; no lo repara.
- La superficie usa el color del signo como capa sobre `#080B11`.
- Entrada según última visita:
  - Primera vez: “Tu Edad Dorada ya está ocurriendo.”
  - Mismo día: “Sigues aquí.”
  - 2–6 días: “¿Cómo está tu Edad Dorada hoy?”
  - 7+ días: “Algo ha pasado. ¿Qué fue?”
- Declaración libre, sin categorías ni límite.
- Un nodo nuevo nace en el centro y desplaza los anteriores hacia afuera.
- Toque: pulso de luz. Pulsación larga: muestra temporalmente el texto.
- El modo contemplación retira toda la interfaz.
- Los ejes no se mezclan automáticamente. Los envíos admitidos deben respetar los gestos voluntarios documentados.

## Fuera del alcance actual

- IA, chatbot y funciones Premium dependientes de IA.
- Publicación en tiendas antes de estabilizar la PWA.
- Backend, analítica o respaldo remoto de Núcleo.
- Cambios que contradigan documentos cerrados sin nueva aprobación.

## Ideas aplazadas no confirmadas

No implementar sin una decisión posterior explícita:

- Exportar murales o composiciones a historias de Instagram.
- Integración de registros mediante WhatsApp.
- Generación automática de obras o imágenes para Hobbies.
- Notificaciones o resúmenes semanales de Mi Balance.
- Constructor de ejes personalizados o variantes visuales “dark”.
- Publicación inmediata en tiendas móviles.
- Traducción a otros idiomas.
- Sistema de “tres números únicos” en onboarding mientras no exista una regla de cálculo y uso aprobada.

## Fuentes completas

En `D:\Work - TIgrr\Aureo`:

- `umbral_eje1_aureo_v1.1.docx`
- `mundos_eje2_aureo_v1.2.docx`
- `ux_decisiones_mundos_v1.md`
- `memoria_sesion_eje3_finanzas_v2.md`
- `nucleo_eje4_aureo_v1.2.md`
- `memoria_sesion_eje4_nucleo_v2.md`
- `memoria_sesion_eje5_edad_dorada_v2.md`

## Instrucción para asistentes de IA

1. Leer este documento y la especificación completa del eje afectado antes de modificarlo.
2. Preservar datos históricos y compatibilidad de rutas.
3. No sincronizar ninguna clave o dato de Núcleo.
4. No inventar IA, automatizaciones entre ejes o gamificación.
5. Si hay contradicción, prevalece la decisión más reciente confirmada por la clienta y debe documentarse.
6. Si una decisión abierta cambia materialmente el producto, pedir confirmación en lugar de asumirla.
