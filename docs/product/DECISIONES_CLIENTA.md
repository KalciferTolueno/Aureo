# Decisiones confirmadas por la clienta — Áureo

Última consolidación: 4 de septiembre de 2026.

Esta es la referencia rápida para desarrolladores y asistentes de IA. Resume decisiones confirmadas; ante dudas se debe consultar también la especificación completa del eje.

## Principios permanentes

- Áureo tiene exactamente cinco ejes: Umbral, Mundos, Mi Balance, Núcleo y Edad Dorada.
- Conocimiento no existe como eje. Su ruta antigua solo redirige a Edad Dorada.
- La fuente oficial usa Vue 3, TypeScript, Vite, Pinia y Vue Router. Las referencias antiguas a Vanilla JS como arquitectura permanente están obsoletas.
- La experiencia debe sentirse como una aplicación continua, con fondo y navegación persistentes.
- El scroll del documento es flotante: no reserva un gutter ni empuja el contenido al cambiar de eje.
- Los efectos de iluminación de los espacios internos forman parte del fondo continuo; no se recortan en los límites de cada sección. El aura no puede dibujar un recuadro junto al scrollbar. Contrato y regresiones: `docs/product/AURA_CAMPO_CONTINUO.md`.
- La identidad general es Noche + Oro. El color zodiacal de la persona aparece como un matiz sutil en toda la experiencia sin reemplazar los colores base; Edad Dorada lo expresa con mayor presencia.
- Por ahora no existe distinción funcional entre versión gratuita y Premium: los cinco ejes permanecen accesibles.
- La IA queda fuera de la Fase 1 con 20 testers. Una futura IA reflejaría patrones; no será un chatbot ni dará consejos.
- No agregar productividad convencional, presión, juicio o funciones que intenten ordenar el caos personal.

## Cuentas, sincronización y privacidad

- Durante la etapa local vigente, la aplicación inicia una sesión persistente del dispositivo en `localStorage`. El correo del onboarding se guarda solo en el perfil local y no abre cuenta ni sincronización.
- La aplicación será multiusuario más adelante; el acceso por cuenta y la sincronización con Supabase quedan pausados mientras esté activo el modo local.
- Umbral, Mundos, Mi Balance y Edad Dorada conservan la arquitectura de sincronización remota, pero el arranque local no realiza llamadas a Supabase.
- Debe funcionar offline. Cuando se reactive el modo multiusuario, la sincronización podrá retomarse al recuperar conexión; durante el modo local vigente no se dispara.
- Los conflictos se resuelven de forma determinista mediante `client_updated_at` y `mutation_id`.
- Núcleo vive exclusivamente en el dispositivo. Nunca se envía a Supabase, analítica, copias remotas ni IA, ni siquiera cifrado.
- Se mantiene el prefijo histórico `aureo_`.
- Toda migración debe preservar datos y estar versionada.
- Supabase queda detrás de la interfaz de almacenamiento; las pantallas no se conectan directamente al proveedor.

## Configuración

- Es una vista interna en `/configuracion`, no una tarjeta flotante. El encabezado es solo el título, en dos voces: «Configuración» y «de mi Áureo». Se sale por la navegación de ejes, no por un sello de volver.
- Las secciones (Tú, Color, Avisos, Espacio, Promesa, Copia) se recorren en un filete de nombres en una sola fila; el panel activo es una placa Noche (velo y filamento, no un recuadro). En Tú el nombre es el objeto.
- Se puede editar nombre, correo local y fecha de nacimiento. El correo no abre cuenta ni sincronización. Cambiar la fecha recalcula el signo y el número personal.
- El color de interfaz es el matiz zodiacal: doce destellos en un pozo. El oro y la Noche no se sustituyen. Elegir un destello cambia el `signo` del perfil.
- El interruptor de notificaciones guarda una preferencia local y, al activarse, pide permiso al navegador. No envía resúmenes semanales de Mi Balance (siguen aplazados). Núcleo nunca se nombra en un aviso.
- Se conservan Lo que cuido, copia/restauración y borrado con doble toque.

## Onboarding

- Debe ser breve: bienvenida, privacidad, nombre, nacimiento, signo, correo local, melodía de tres notas y espacios opcionales.
- El correo se pide después de revelar el signo y se guarda solo en el dispositivo. No inicia sesión remota ni llama a Supabase.
- No existe un paso para crear decretos.
- Al terminar se entra inmediatamente a Umbral.
- La melodía es la llave de Núcleo.
- Debe explicarse que Núcleo nunca sale del teléfono.
- El espacio opcional es Lo que cuido, que agrupa Compañeros y Plantas.

## Eje 1 — Umbral

- Es el inicio del día; no es un calendario ni una lista tipo Google Tasks.
- El saludo usa *El día es tuyo / La tarde es tuya / La noche es tuya*, centrado en la misma fila que la fecha (izquierda) y el selector ☉/☾ (derecha), con una máxima filosófica rotatoria debajo.
- Palabra de poder se muestra como **Tu sello**.
- La carta abierta incluye la frase editorial del arcano en oro cursiva.
- El **Arcano** flota a la derecha de la luna y el **Número** a la izquierda, a la altura del centro del Arcano, sin tapar la tira de fases.
- En la cabecera de Umbral, la fecha queda a la izquierda, el saludo al centro y el selector ☉/☾ a la derecha, todos a la misma altura. Cambia solo la luminosidad; el fondo permanece `#080B11` en ambos modos. Sin elección, sigue la hora del sistema.
- La portada se llama **Carta del día** y muestra la tira completa de 8 fases lunares SVG.
- El arcano diario se conserva y se acumula en un mazo histórico consultable. **Abrir el mazo** abre una ventana flotante; en **Tu mazo diario** se muestran únicamente los últimos 7 días (fecha + nombre); el resto permanece guardado y no se borra.
- El signo del día es universal, no el signo natal.
- M4 se llama **Lo que tengo en mente hoy**.
- El botón de guardar solo aparece cuando existe texto.
- Una intención completada desaparece y se transforma en un punto de luz.
- Estado vacío: “El día está en blanco. También es un lujo.”
- Incluye **Mi pulso de hoy** en la portada de Umbral, con pregunta diaria y respuesta libre. El registro viaja silenciosamente a Edad Dorada, sin feedback visible en Umbral.
- Cultivo y Destellos dejan de mostrarse, pero sus datos se preservan.
- El símbolo de marca Luna + espiral Fibonacci sigue vigente.
- Existe captura rápida global para guardar algo para hoy o después; nunca aparece dentro de Núcleo. En **Un destello**, el campo va en una caja y **Sellar** permanece visible.

## Eje 2 — Mundos

- Contiene Vínculos, Decretos, Lo que cuido, Hobbies y Travesías. Mi Balance no aparece aquí.
- Su entrada es una flor SVG de cinco pétalos; cada uno se ilumina cuando el submundo tiene contenido.
- Frase: “Todo lo que ya es tuyo.” El grid aparece como segunda capa mediante “Ver todos”.
- La portada no repite el título grande “Mundos”; el nombre permanece en la navegación y como encabezado semántico oculto.
- Compañeros y Plantas viven bajo **Lo que cuido**.
- Los recordatorios de cuidado son pequeños, poco invasivos y aparecen al entrar a Mundos.

### Vínculos

- El pétalo y el grid se llaman **Vínculos**. El encabezado interno permanece **Mi Constelación**.
- Tipos: Amor, Familia, Amistad, Raíz y Guía.
- Estado vacío: “Tu constelación te espera. Cada vínculo que agregas enciende un punto.”
- Campos: “¿Cómo se llama?” y “¿Cuál es su signo?”.
- Mi Constelación muestra directamente el mapa orbital y su leyenda horizontal, sin una frase explicativa adicional antes de las órbitas.
- Al tocar una estrella aparece un tooltip anclado: nombre, categoría · signo, y nota truncada. Un segundo toque en la misma estrella abre la nota completa. Cierra al tocar fuera u otra estrella.

### Decretos

- Categorías: Ser, Vivir y Tener. Acción: “Lo decreto”.
- Placeholders: Soy… / Disfruto de... / Tengo... El vacío muestra un ejemplo en cursiva al 35% según la dimensión.
- El sello + flota en el hueco del destello (pétalo lavanda) y abre una placa Noche para escribir; la lista de frases ocupa el campo.
- La línea de apertura es “Lo que decretas, ya es.”
- La primera visita muestra una sola vez “Lo visualizo. Lo siento. Lo decreto.” (`decretos_bienvenida`, local, no se sincroniza). Con decretos propios, al entrar aparece uno al azar antes de la lista.
- La activación es un ritual a pantalla completa `#080B11`: tres pulsaciones, haptic 10 ms, “Decretado.” y cierre solo. Nunca se muestra el número de activaciones; la intensidad se lee en opacidad 50/70/85/100 y un brillo dorado desde la séptima.
- Badges: Ser `#7A6AAA`, Vivir `#5DB389`, Tener `#C9A86A`.
- Mantener presionado permite marcar “Esto ya es mío”: el texto pasa a oro y queda una fecha discreta.
- Siete activaciones pueden generar un nodo sin texto en Edad Dorada con origen `decreto_mundos`.

### Hobbies

- La metáfora es una espiral áurea de momentos por hobby (ángulo 137,5°, lenguaje M6). Cada momento es un destello aparte; el más nuevo es más grande y luminoso.
- Frase editorial: “Lo que te devuelve a ti — ya sea viviéndolo, o extrañándolo.”
- Entrada mínima: “¿Qué es?” y “¿Cómo te hace sentir?”. Acción de creación: “Agregar”.
- El sello + flota en el hueco del destello (pétalo oro) y abre una tarjeta flotante para sumar una espiral; el jardín ocupa el campo.
- Dentro del hobby, un solo gesto: “Dejar un momento aquí”, con “¿Qué pasó con esto, hoy?”. Confirmación: “Quedó guardado en tu espiral.”
- No hay estados Activo/Pausa, ni “Lo viví hoy”, ni reactivar. Los hobbies no se eliminan. El orden es por último momento, descendente.
- El campo histórico `estado` se conserva en datos; deja de usarse en la interfaz.

### Travesías

- La metáfora es un baúl de postales, no un mapa. Esto sustituye la decisión del 29-08-2026 de Leaflet interactivo.
- Estados persistidos: `visitado` | `decretado`. En interfaz: **Vivido** / **Por vivir**.
- La búsqueda de lugar se mantiene (Nominatim/OpenStreetMap); el resultado nace como postal, no como pin. Las coordenadas se conservan y no se muestran.
- “¿Qué viviste ahí?” se habilita al vivir la postal. La eliminación usa el diálogo interno “¿Quieres que esta postal se vaya?” / “Sí, que se vaya” / “No, quedarse.”
- El sello del baúl es la flor de cinco pétalos de Mundos.
- El sello + flota en el hueco del destello (pétalo salvia) y abre una tarjeta flotante para guardar una postal; el baúl ocupa el campo.

### Lo que cuido

- Compañeros y Plantas viven bajo este mural. La foto es opcional.
- Estado vacío: “Lo que cuido, también me cuida.”
- Compañero: selector táctil Perro, Gato, Ave, Hámster, Otra mascota (`AppIcon`, sin emoji). Planta: Interior / Exterior.
- Cuidado colapsado: nacimiento y próximo control. La equivalencia en años humanos solo para perro y gato: “~ N en años de los tuyos.”
- Marco: destellos dorados en dos esquinas y sello con las iniciales del perfil.
- **En mi corazón** guarda memoriales en `locuidado_memoria` (clave `aureo_locuidado_memoria`). Foto opcional, nombre y frase con placeholder “Lo que se queda de vos.”
- Los estilos artísticos sumi-e / Ghibli y el export del mural quedan pendientes; no implementarlos sin cierre explícito.

## Eje 3 — Mi Balance

- Nombre visible: **Mi Balance**. No mostrar “Finanzas”.
- Registra ingresos, gastos y categorías; el saldo está oculto por defecto.
- Símbolos de privacidad: ojo, balanza o sello.
- Categorías: El nido, El cuerpo, El movimiento, El cuidado, Lo inesperado y Lo que construyo.
- Las metas son Darumas elegidos por color.
- La portada no repite el título grande “Mi Balance”; el nombre permanece en la navegación y en las vistas funcionales.
- La composición principal es un bonsái de cerezo que hace visible el peso relativo de las categorías mediante sus ramas; cada gasto abre una flor. No muestra una balanza flotante sobre el árbol.
- En la portada, “Lo que tengo hoy” y el saldo van encima del bonsái, sin recuadro circular. “Cada gasto abre una flor.” aparece debajo de Registrar movimiento y Nueva meta. No se muestra la frase vacía “Tu cerezo espera su primera flor.”
- El bonsái aparece solo en la portada. La vista funcional no repite el árbol ni sus flores; los gastos se consultan en “Últimos movimientos”.
- Admite ingreso base y la marca de movimientos fijos mensuales.
- En meta y movimiento, los campos cortos van al lado de su pregunta. Meta, monto e ingreso base muestran el signo `$`.
- El ingreso base forma parte de **Lo que tengo hoy**. Se edita con el ícono a la derecha del campo corto; al guardar confirma con «Guardado».
- El detalle de Mi Balance se divide en pestañas centradas **Mi Balance** (flujo) y **Lo que construyo** (Darumas), con el mismo tamaño. Lo que construyo se presenta como herramienta compacta: crear una meta y ver las existentes, sin inflar el formulario.
- En el detalle, Entra / Sale abre el formulario de movimiento; los campos no quedan expuestos de antemano.
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
- El detalle de Edad Dorada es el espacio contemplativo: Daruma, grietas y las frases de presencia debajo de la figura, con Volver. Declarar se hace en la portada. La indicación “Toca el daruma para contemplar sus grietas” vive debajo de ¿Qué reconoces hoy?; no hay un segundo botón ni un modo que retire la navegación.
- El detalle no repite el título visible “Edad Dorada” ni el sigilo circular del encabezado; el nombre permanece en la navegación y como encabezado semántico oculto.
- Los ejes no se mezclan automáticamente. Los envíos admitidos deben respetar los gestos voluntarios documentados.

## Fuera del alcance actual

- IA, chatbot y funciones Premium dependientes de IA.
- Publicación en tiendas antes de estabilizar la PWA.
- Backend, analítica o respaldo remoto de Núcleo.
- Cambios que contradigan documentos cerrados sin nueva aprobación.

## Ideas aplazadas no confirmadas

No implementar sin una decisión posterior explícita:

- Exportar murales o composiciones a historias de Instagram.
- Estilos artísticos sumi-e / Ghibli del mural de Lo que cuido, y si aplican dentro de la app o solo al compartir.
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
