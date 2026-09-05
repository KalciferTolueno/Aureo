---
document: aureo-ai-handoff
status: canonical
audience: coding-agents-and-maintainers
last_verified: 2026-09-05
workspace_root: D:\Work - TIgrr\Aureo
canonical_codebase: aureo-web
active_product_surface: tailwind
active_surface_route: /
supabase_project: msfitymrxblzgiqyjfse
---

# Áureo — contexto canónico para agentes de IA

Este documento permite que un agente nuevo retome Áureo sin depender del historial de conversación. Describe qué versión se modifica, qué material es solo referencia, cómo funciona la aplicación, qué cambios están implementados y qué reglas no deben romperse.

## Lectura obligatoria y autoridad

Antes de modificar el producto, leer en este orden:

1. `docs/AI_HANDOFF.md` — estado técnico y operativo vigente.
2. `docs/product/DECISIONES_CLIENTA.md` — decisiones funcionales vinculantes.
3. `PRODUCT.md` — propósito, público, voz y compromisos de marca.
4. `docs/product/AURA_CAMPO_CONTINUO.md` si el cambio toca workspace, header, animación de entrada, `filter`, `overflow` o `.workspace-aura`.
5. La especificación completa del eje afectado, ubicada en la raíz del workspace.
6. `docs/architecture/ADR-001-vue-3-source-of-truth.md` si el cambio afecta arquitectura o versiones.

Orden para resolver contradicciones:

1. La instrucción más reciente y explícita de la usuaria.
2. `docs/product/DECISIONES_CLIENTA.md`.
3. Este documento.
4. `PRODUCT.md` y los ADR aceptados.
5. Especificaciones y memorias históricas.
6. La versión publicada en Vercel y sus copias locales.

Si dos fuentes del mismo nivel se contradicen, no adivinar. Presentar la contradicción y pedir una decisión cuando cambie materialmente el producto.

## Mapa de versiones y terminología

Desde la v1.2 Áureo tiene una sola superficie de producto dentro de `aureo-web`: la experiencia Tailwind, servida en la ruta raíz. La presentación primaria no Tailwind fue eliminada.

| Nombre recomendado | Ubicación | URL habitual | Estado | Regla de edición |
| --- | --- | --- | --- | --- |
| Base fuente primaria o canónica | `aureo-web/` | No aplica | Única fuente oficial | Todo código productivo vive aquí |
| Experiencia Tailwind | `aureo-web/src/modules/experimental/` | `http://127.0.0.1:4175/#/` | Superficie activa y única de trabajo | Aplicar aquí los cambios de interfaz y UX |
| Vercel histórico en la web | <https://aureo-comercial.vercel.app/#/> | URL pública | Versión antigua | Solo comparar; nunca asumir que es la fuente vigente |
| Archivo estático de Vercel | `pagina de vercel/` | `http://127.0.0.1:4180/#/` | Copia descargada el 27-08-2026 | Solo lectura |
| Recuperación anterior de Vercel | `aureo-comercial-vercel/` | `http://127.0.0.1:4173/#/` | Build público recuperado | Evidencia histórica y compatibilidad |

### Cómo interpretar “versión primaria”

La expresión se refería antes a dos cosas: la base `aureo-web` y la presentación no Tailwind. Desde la v1.2 la presentación no Tailwind fue eliminada por completo; la única presentación vigente es la experiencia Tailwind.

Cuando la usuaria pida “la app” o un cambio nuevo, trabajar en la experiencia Tailwind. Las carpetas `pagina de vercel/` y `aureo-comercial-vercel/` son evidencia histórica de solo lectura y no se modifican.

## Estructura del workspace

```text
D:\Work - TIgrr\Aureo\
├── AGENTS.md                       Entrada corta para agentes
├── aureo-web\                     Base fuente canónica Vue 3
│   ├── docs\AI_HANDOFF.md         Este documento
│   ├── docs\CONTINUIDAD_IMPLEMENTACION.md
│   ├── docs\product\DECISIONES_CLIENTA.md
│   ├── src\modules\experimental\ Superficie Tailwind única y activa
│   ├── src\data\                  Persistencia, migraciones y sync
│   ├── supabase\migrations\       Fuente local del esquema remoto
│   └── tests\                     Vitest y Playwright
├── pagina de vercel\              Archivo estático histórico
├── aureo-comercial-vercel\        Recuperación histórica anterior
├── aureo_simbolo_M6_fiel.png       Símbolo vinculante
└── *.md / *.docx                   Especificaciones y memorias de producto
```

`aureo-web` es un repositorio Git. En la documentación del 28-08-2026 la rama activa era `v1.2` y los ajustes más recientes estaban todavía sin commit sobre `db35fed`. Preservar siempre los cambios existentes de la usuaria y revisar `git status` antes de editar.

## Arranque local y separación de orígenes

Requisitos: Node.js 22 y pnpm.

Desde `aureo-web`:

```bash
pnpm install
pnpm dev:tailwind
```

| Servicio | Comando | URL |
| --- | --- | --- |
| Experiencia Tailwind única | `pnpm dev:tailwind` | `http://127.0.0.1:4175/#/` |
| Archivo Vercel local | `python -m http.server 4180 --directory "pagina de vercel"` desde la raíz | `http://127.0.0.1:4180/#/` |

El puerto canónico de trabajo es `4175`. Otros servidores o copias históricas pueden tener un origen y `localStorage` independientes; no usarlos como fuente vigente.

La ruta Tailwind admite navegación interna mediante query string:

```text
#/?axis=umbral
#/?axis=mundos
#/?axis=balance
#/?axis=nucleo
#/?axis=edad-dorada
```

Los detalles funcionales usan `detail`, por ejemplo `detail=world-vinculos` o `detail=edad-dorada`. En Mi Balance, `Registrar movimiento` y `Nueva meta` ya no deben añadir `detail` ni `action`: abren paneles flotantes sobre `axis=balance`.

### Despliegue con Docker

- `Dockerfile` compila la SPA con Node 22 y pnpm 11.20, y sirve `dist` con Nginx en el puerto `80`.
- En EasyPanel, configurar el puerto HTTP interno `80`; no hace falta comando de arranque adicional.
- `.dockerignore` excluye `.env.local`, dependencias, builds y logs del contexto de Docker. Las variables `VITE_*`, si se activan en el futuro, deben estar disponibles durante el build porque Vite las incorpora al bundle.

## Arquitectura vigente

- Vue 3 con Composition API.
- TypeScript estricto.
- Vite 8.
- Vue Router con hash history.
- Pinia para perfil, sesión local y estado compartido.
- Tailwind CSS 4 mediante `@tailwindcss/vite`; utilidades con prefijo `tw:` y sin Preflight global.
- Persistencia local detrás de `StorageDriver` y repositorios.
- Supabase detrás de servicios y repositorios; las vistas no llaman directamente al proveedor.
- Vitest para dominio/datos y Playwright para recorridos E2E.
- PWA mediante `vite-plugin-pwa` y Workbox.

Archivos de entrada:

- `src/main.ts`: inicialización.
- `src/App.vue`: shell general.
- `src/router/index.ts`: rutas, redirecciones y reglas de onboarding.
- `src/modules/experimental/TailwindPreviewView.vue`: portada, navegación y acciones rápidas Tailwind.
- `src/modules/experimental/tailwind/TailwindWorkspace.vue`: detalles funcionales Tailwind.
- `src/shared/styles/tailwind.css`: tokens/utilidades Tailwind aisladas.
- `src/shared/styles/tokens.css` y `global.css`: identidad compartida/original.

## Rutas y compatibilidad

| Ruta | Propósito |
| --- | --- |
| `/` | Experiencia Tailwind activa y única |
| `/laboratorio-tailwind` | Redirección compatible a `/` |
| Cualquier otra ruta | Redirección a `/` |

No eliminar redirecciones históricas sin una migración y una decisión explícita.

## Registro de la iteración más reciente

El sistema visual v1.4 (03-09-2026) está en `docs/changes/2026-09-03-sistema-visual-v14.md`. Leerlo antes de tocar tipografía, radios, espaciado, movimiento, áreas táctiles, el panel de configuración, la flor de Mundos o el encabezado de Mi Balance.

El inventario exacto de solicitudes, archivos modificados, contratos preservados y validaciones del 28-08-2026 está en `docs/changes/2026-08-28-ajustes-ui-y-acceso-local.md`. Leerlo antes de tocar títulos de portada, Mi Balance, auras, scrollbar o acceso local.

## Identidad visual y experiencia común

- Voz íntima, serena, contemplativa y no clínica.
- Identidad Noche + Oro; el diseño de interfaz sigue `.cursor/skills/aureo-design/SKILL.md` (no Impeccable).
- Paleta base: Noche, Marfil, Oro y Cosmos.
- El color zodiacal es una capa secundaria; no reemplaza el oro, el marfil ni la noche.
- Fondo estelar continuo, símbolos orbitales y jerarquía editorial.
- Navegación lateral en escritorio e inferior en móvil.
- No usar gamificación, presión, rankings, rachas punitivas ni lenguaje de productividad convencional.
- Respetar teclado, foco visible, áreas táctiles, contraste, anchuras móviles y `prefers-reduced-motion`.
- Desde la v1.4 el sistema visual vive en escalas con nombre dentro de `src/shared/styles/tokens.css`: tipografía (`--texto-1`…`--texto-9`, más `--texto-hero` y `--texto-display`), espaciado (`--espacio-0`…`--espacio-6`), radios (`--radio-pill` y `--radio-organico-1`…`-3`), movimiento (`--dur-1`…`--dur-4` sobre `--ease-out` y `--ease-in-out`) y área táctil (`--toque: 44px`). No introducir valores fuera de esas escalas; elegir el escalón más cercano antes de inventar uno.
- Los iconos se dibujan con `AppIcon`. No usar glifos Unicode ni emoji como iconografía.
- El serif se reserva para lo que se lee. Los rótulos de sección van en sans, versalitas y con `letter-spacing`.
- Ningún control por debajo de `--toque`. Si agrandarlo rompe la composición, ampliar el área con un pseudo-elemento en lugar de bajar el mínimo.
- Los paneles y lecturas flotantes deben permanecer en la misma sección cuando la usuaria lo haya pedido; no introducir navegación innecesaria.
- El aura compartida de los espacios internos se extiende fuera del encabezado y de la columna de contenido para integrarse con el fondo continuo hasta el borde móvil; ni la animación de entrada ni `.tw-workspace` deben recortarla. El límite exterior permanece en `.tailwind-lab`. Contrato: `docs/product/AURA_CAMPO_CONTINUO.md`.

### Regresión: borde del aura de entrada

Esto vuelve a romperse en cambios de CSS. Antes de tocar `TailwindWorkspace.vue` (entrada, overflow, filter, header, `.workspace-aura`):

- No aplicar `filter` a `.tw-workspace` ni a `@keyframes workspace-unveil`. El blur pinta el recuadro de la columna y deja una franja junto al scrollbar.
- No pinzar `.workspace-aura` a `width: 100%` ni a `inset` horizontal 0 en viewports estrechos (la regla de 420 px era el fallo).
- El aura sangra con `left/right: calc(50% - 50vw - 4rem)`. `.tw-workspace` mantiene `overflow: visible`.
- No duplicar el padding de la barra móvil: en un detalle el workspace ya reserva `4.75rem`; el `6.7rem` de la columna solo va en portada y configuración.
- Comprobar a ~390 px en Constelación y Lo que cuido. Pruebas: `aura cubre el fondo` y `no inventa barra de scroll` en `tests/e2e/routes.spec.ts`.

- El carril del scrollbar raíz usa el mismo fondo Noche (`--cosmos`, `--document-scroll-track: #080b11`) para que el borde derecho de la aplicación no revele una franja transparente.
- Con la superficie Tailwind u onboarding montados, el scrollbar nativo del documento se oculta (`scrollbar-width: none`) para no reservar gutter ni desplazar el contenido entre ejes. Un pulgar flotante (`OverlayScrollbar`) se superpone a la derecha, oro sobre noche, y solo aparece cuando hay overflow. La navegación móvil se ancla con `left` + `right`.
- El cambio entre ejes reemplaza los escenarios de forma superpuesta y breve: la sección saliente queda fuera del flujo durante 120 ms y la entrante define la altura inmediatamente. No reintroducir `mode="out-in"`, desenfoque o `clip-path` en `axis-ritual`, porque provocaban un colapso intermedio y parpadeo. El encabezado compartido no usa una clave reactiva y el cambio de eje vuelve arriba sin scroll animado.

## Estado actual de la experiencia Tailwind

### Onboarding y configuración

- Quien llega sin `onboarding_completo` recorre el ritual de junio: bienvenida M6, privacidad, nombre íntimo, origen, revelación del signo, correo local, llave musical de tres notas, Lo que cuido y transición a Umbral. No hay decreto ni botón intermedio “Esta es mi llave”.
- La melodía usa el mismo timbre seno y las mismas frecuencias que la copia histórica de Vercel. El hash `Do|Re|Mi` abre Núcleo. Las notas suenan al tocarlas; el acorde final pulsa al acertar.
- **Configuración de mi Áureo** se abre desde el perfil (escritorio) o el último ítem de la barra móvil (Áureo) como vista interna en `/configuracion`. Conserva el armazón y la navegación. El encabezado es «Configuración» + la frase «de mi Áureo» (como saludo y máxima de Umbral), con filete corto y un destello; no hay sello de volver. Las secciones se eligen con un filete de nombres en una fila (Tú, Color, Avisos, Espacio, Promesa, Copia). El panel activo es una placa Noche: velo y filamento izquierdo, sin recuadro; en Tú el nombre es el objeto y correo/fecha van en filete. Incluye edición de nombre, correo y fecha de nacimiento; un pozo de doce destellos para el matiz de interfaz; avisos locales (permiso del navegador, sin resúmenes semanales); Lo que cuido; copia/restauración y borrado con doble toque. No volver a convertirla en una página aislada.
- **Momento de apertura** aparece una vez al día al entrar a Umbral, con frase por signo. No cambia el fondo Noche.

### Renovación visual v1.3

- La experiencia conserva su identidad Noche + Oro, pero reemplaza el aspecto de paneles administrativos rígidos por una gramática de superficies orgánicas, halos y cápsulas de acción. Navegación, entradas, formularios, lecturas y estados vacíos comparten esta misma dirección en los cinco ejes.
- Aurora, Particles y Spotlight Card fueron retirados por decisión explícita de la usuaria porque su estética no se integraba con Áureo. No reintroducir componentes de React Bits o Vue Bits por defecto.
- `TailwindPreviewView.vue` y `TailwindWorkspace.vue` conservan raíces semánticas nativas, el fondo Noche + Oro y las animaciones propias de cada eje. `VueBitsLightRays` permanece únicamente en Umbral como efecto histórico ya integrado.
- Las portadas agrupan objeto-signatura y acciones. Mundos, Mi Balance, Núcleo y Edad Dorada centran ese grupo en el espacio libre sin estirar el objeto; Umbral conserva saludo, fecha, máxima y la carta con número y arcano visibles. Los títulos grandes de esos cuatro ejes siguen ocultos. Las animaciones respetan `prefers-reduced-motion`; las interacciones y el foco visible no dependen del movimiento.

Pulido de densidad (31-08-2026): se retiró el encabezado duplicado (frase, fecha y sigilo) en las portadas que ya nombran el eje en la navegación; Núcleo ya no coloca “Solo aquí” sobre el plasma; Tu sello, mente y pulso de Umbral se agrupan; Número flota a la derecha de la luna y Arcano a la izquierda; los campos de escritura bajan de escala. Identidad Noche + Oro, objetos-signatura y funciones intactas. En Mi Balance, el saldo va encima del bonsái y sin recuadro circular; en Edad Dorada el detalle no muestra título visible, sigilo ni el botón duplicado “Contemplar mi Daruma”. La barra móvil es más compacta (~48 px de toque) y el sello de captura se reancora encima.

Validación de la renovación v1.3 (29-08-2026): `pnpm typecheck`, `pnpm test` (3 archivos, 7 pruebas) y `pnpm build` correctos; detector de diseño sin hallazgos; revisión manual de escritorio y móvil aprobada. Los cuatro recorridos E2E focalizados de espacios y detalle de Balance pasan en escritorio y móvil. La pasada completa anterior cerró en 32/40 antes de corregir el recorte de los espacios; aún se debe repetir completa antes de una entrega externa para confirmar los cuatro escenarios restantes (dos esperan una acción ausente en el detalle de Balance y dos dependen del cierre temporizado de diálogos móviles).

Validación del ajuste de viewport y movimiento (29-08-2026): `pnpm typecheck`, `pnpm test`, `pnpm build` y el E2E focalizado de cambio de eje correctos en escritorio y móvil. La revisión visual confirmó el escenario a altura completa y las animaciones desactivadas con `prefers-reduced-motion`.

Validación tras retirar Aurora, Particles y Spotlight (29-08-2026): `pnpm typecheck`, `pnpm test` (7 pruebas), `pnpm build` y 6 recorridos E2E de arranque, semántica de Mundos y cambio de eje correctos en escritorio y móvil. La app vuelve a cargar en `4175` sin los canvases ni halos externos.

La densidad de escritorio y móvil se compactó el 31-08-2026: el contenido útil se limita a `72rem` desde `1024px`, los títulos editoriales y los objetos-signatura usan máximos menores, y las portadas agrupan objeto y acción sin forzar que el objeto llene el viewport. Validación en esta sesión: typecheck y 19 pruebas unitarias correctas; Mundos permanece en `sr-only` y más alto que Umbral al cambiar de eje; Registrar movimiento y captura de Núcleo visibles en portada.

### Umbral

- Portada orbital con el módulo **Carta del día**: número del día, tira de 8 fases lunares SVG, arcano y signo dentro de la carta abierta.
- Cabecera ritual en una sola fila: fecha a la izquierda, saludo al centro y selector ☉/☾ a la derecha. El fondo permanece `#080b11`; el selector solo cambia la luminosidad (luz de Vue Bits y luna). Sin elección, sigue la hora (día 06–20, noche el resto). La preferencia vive en `umbral_lumen` y no se sincroniza.
- **Tu sello** muestra la Palabra de Poder; al abrir el mazo aparece la frase editorial del arcano en oro cursiva.
- En Umbral, títulos y valores usan Fraunces 200–300 y etiquetas/cuerpo Spectral 300.
- **Mi pulso de hoy** aparece en la portada de Umbral; al guardar viaja silenciosamente a Edad Dorada (`origen: pulso_umbral`) sin feedback visible en Umbral.
- Captura rápida global mediante un sello flotante en todos los ejes excepto Núcleo, **Lo que cuido**, **Vínculos**, **Travesías**, **Hobbies** y **Decretos**. En esos mundos el destello cede su hueco al sello + (misma esquina, cruce lento `--dur-4`); al salir, el destello vuelve. El panel muestra un campo contenido y **Sellar** siempre visible (inactivo sin texto). Al guardar pregunta *¿Para hoy o para guardar?*; “para hoy” precarga M4 y “para guardar” sella el destello en `ideas`.
- Validación del 31-08-2026 (onboarding + configuración + Umbral): `pnpm typecheck`, `pnpm test` (5 archivos, 19 pruebas), `pnpm build` y E2E de arranque, onboarding y órbita correctos en escritorio y móvil (`--workers=1`).
- Umbral incorpora el efecto Light Rays de Vue Bits adaptado a la identidad Noche + Oro mediante `ogl`; solo renderiza mientras está visible y se desactiva con movimiento reducido.
- En móvil los detalles de cada eje (Vínculos, Decretos, Hobbies, Travesías, Cuidado, Balance, Núcleo y Edad Dorada) se abren como hoja flotante inferior (patrón app) con botón de cierre, en lugar de reemplazar toda la vista; en escritorio conservan la vista completa.
- En Núcleo, tocar un pensamiento muestra su texto como lectura flotante en la posición de la estrella (sin el texto central "Solo aquí"). En Edad Dorada, el daruma se muestra ampliado y el texto de cada grieta aparece en la posición de la grieta; se quitó la boca del daruma.
- Mi Balance conserva en portada el árbol, el total del día y los botones **Registrar movimiento** / **Nueva meta** (overlays). El detalle sigue siendo la gestión completa.
- La luna no tiene un círculo negro exterior innecesario.
- El Arcano flota a la derecha de la luna y el Número a la izquierda, a la altura del centro del Arcano; ambos quedan por encima de la tira de fases.
- En la cabecera, la fecha, el saludo y ☉/☾ comparten la misma altura: fecha a la izquierda, saludo al centro, ☉/☾ a la derecha.
- La portada y el detalle de Umbral compactan intenciones, pulso y títulos para que quepan juntos.
- Las órbitas se mantienen alejadas del centro lunar.
- El arcano se presenta como un mazo con animación de barajado y alternativa para movimiento reducido.
- **Abrir el mazo** (y el Número) abre una ventana flotante sobre Umbral, no un bloque que empuja sello, intenciones y pulso. El overlay vuelve a barajar, muestra la frase editorial y **Tu mazo diario** (últimos 7 días). Se cierra con el botón, `Escape` o el fondo.
- El arcano del día se persiste en `umbral_arcanos` y el resto del archivo permanece guardado.
- El detalle conserva intenciones; el pulso diario también se responde desde la portada.

### Mundos

- La portada no repite el título grande `Mundos`; conserva el nombre en la navegación y un encabezado semántico oculto para accesibilidad.
- Entrada mediante flor de cinco pétalos de Noche: punta (no pastilla), filamento si el mundo tiene contenido, destello (halo + anillo + semilla) en el corazón. Sin `filter` sobre el SVG. El pétalo vacío queda en sombra, sin filamento. Detrás de la flor hay un cielo de destellos (`MundosNightSky.vue`, ogl ya presente): oro, sin ratón, recortado al pozo; se apaga con `prefers-reduced-motion`. No es el canvas Galaxy/Particles a página completa.
- Etiquetas radiales orientadas desde el centro hacia cada pétalo. Travesías, Decretos y Hobbies se voltean para no quedar boca abajo. «Lo que cuido» se lee en dos voces para caber en la punta.
- Cada pétalo conserva su color y abre su mundo sin salir a la interfaz original.

Submundos destacados:

- **Vínculos**: el pétalo se llama Vínculos; adentro el encabezado sigue siendo Mi Constelación. Tres órbitas (Amor al centro; Familia en la media; Amistad, Raíz y Guía en la exterior) como hilos de luz, no anillos punteados. El tooltip de la estrella muestra nombre, categoría · signo y nota truncada; el segundo toque expande la nota. Leyenda de anillos en fila horizontal también a 380 px. El sello + flota en el hueco del destello (pétalo oro) y abre una placa Noche (filamento, destello y filete, como Configuración) para encender un vínculo; el mapa ocupa el campo.
- Mi Constelación guarda y muestra el signo opcional de cada vínculo.
- Mi Constelación entra directamente al mapa orbital; el vacío dice “Tu constelación te espera. Cada vínculo que agregas enciende un punto.”
- En los detalles, **Volver** es un pozo circular de solo icono (sin la palabra); el `aria-label` conserva el destino. En los cinco mundos el título serif queda centrado (el sello de volver flota a la izquierda), también a 390 px, y llega palabra a palabra con desenfoque (`BlurText.vue`). Debajo, un destello en el centro y un filete que se apaga a ambos lados, no una raya que nace a la izquierda. Los títulos de mundo (Mi Constelación, Lo que cuido) permanecen en una sola línea.
- **Lo que cuido**: mural editorial de afiches con un recorte orgánico leve (`--radio-organico-1`). En móvil cada columna empaca sola (4:5, 1:1, 5:4) para que no queden huecos entre afiches. Un toque abre el afiche en un campo Noche a pantalla (carrusel a ancho completo: deslizar en móvil, sellos a los lados en escritorio; Escape o la X cierran). El sello + flota en el hueco del destello (pétalo ciruela, no oro) y abre la carga de imagen; las preguntas (compañero/planta, nombre, frase) aparecen entonces en una tarjeta flotante con la preview. Si existe foto, se limita a 12 MB y se optimiza localmente a JPEG (lado máximo 1400 px en el mural, 400 px en memoriales).
- Compañero elige especie con `AppIcon` (Perro, Gato, Ave, Hámster, Otra mascota). Planta elige Interior o Exterior. Las notas de cuidado (nacimiento y próximo control) van colapsadas; la equivalencia en años humanos solo aparece para perro y gato.
- **En mi corazón** (`locuidado_memoria` → `aureo_locuidado_memoria`) guarda memoriales. Los estilos sumi-e / Ghibli no están implementados.
- Identidad Noche + Oro; objetos-signatura (flor, constelación, cerezo, plasma, Daruma). El diseño de interfaz usa `.cursor/skills/aureo-design/SKILL.md`, no Impeccable.
- Travesías es un baúl de postales (`JourneyTrunk.vue`): se mira dentro de un pozo circular de la misma familia que Constelación, disuelto en Noche (sin disco recortado ni sombra exterior). Las vividas son papeles apilados en el pozo; las por vivir se apoyan en el borde; el sello usa los pétalos en punta de Mundos, no elipses. El sello + flota en el hueco del destello (pétalo salvia) y abre una tarjeta flotante para guardar una postal; el baúl ocupa el campo. La búsqueda Nominatim se conserva; el resultado nace como postal. Los estados de datos siguen `visitado` | `decretado`; la interfaz dice Vivido / Por vivir. Las coordenadas no se muestran. El mapa Leaflet se retiró (sustituye la decisión del 29-08-2026).
- Decretos usa un ritual de tres pulsaciones a pantalla completa; la séptima crea voluntariamente un nodo sin texto en Edad Dorada. La intensidad se lee en opacidad, nunca en un número. La frase es el objeto (serif, sin chip ni fila admin); Ser / Vivir / Tener es un filete de palabras de color, no un select «Dimensión». En la lista, la dimensión y Activar comparten una línea quieta; la frase va debajo, centrada y compacta, para que varios decretos no se apilen como fichas. El sello + flota en el hueco del destello (pétalo lavanda) y abre una placa Noche («Escribir» / «un decreto») para el filete; la lista ocupa el campo. Primera visita: `decretos_bienvenida`.
- Hobbies es una espiral áurea por práctica (`HobbySpirals.vue`): pozo circular, filamento de oro y destellos con anillo (más nuevo, más afuera, recorriendo el brazo). El sello + flota en el hueco del destello (pétalo oro) y abre una tarjeta flotante para sumar una espiral; el jardín ocupa el campo. Al tocar una espiral, la sensación y “Dejar un momento aquí” aparecen debajo de esa práctica. No hay pausa, reactivar ni “Lo viví hoy”.
- En desarrollo se muestran cinco imágenes de prueba desde `src/assets/care-demo/`; están marcadas como `Muestra`, no se guardan ni sincronizan y no forman parte del build productivo.

### Mi Balance

- La portada no repite el título grande `Mi Balance`; conserva el nombre en la navegación y un encabezado semántico oculto para accesibilidad.
- La portada usa un bonsái de cerezo como objeto principal, sin la antigua balanza circular flotante sobre el árbol; el saldo aparece censurado con asteriscos y un botón de ojo lo revela. La preferencia vive en `balance_oculto`. “Lo que tengo hoy” y el monto van encima del bonsái, sin recuadro circular. “Cada gasto abre una flor.” queda debajo de Registrar movimiento / Nueva meta. No se muestra “Tu cerezo espera su primera flor.”
- Cada gasto real genera una flor. Los ingresos afectan el saldo y el historial, pero no se representan como flores.
- La portada muestra hasta doce flores recientes. El detalle funcional no repite el cerezo ni sus flores; los gastos permanecen disponibles en `Últimos movimientos`.
- Tocar el árbol abre el espacio completo de Mi Balance.
- `Registrar movimiento` y `Nueva meta` abren paneles flotantes mediante `Teleport`; no cambian de ruta.
- Esos paneles (y los formularios compactos del detalle) usan campos cortos al lado de su pregunta, tipografía más contenida y el prefijo `$` en Meta, Monto e ingreso base.
- Guardar un gasto actualiza el cerezo inmediatamente.
- Los paneles se cierran con el botón, `Escape` o el fondo y se muestran por encima de la navegación móvil.
- El detalle de Mi Balance se divide en pestañas centradas **Mi Balance** / **Lo que construyo**, del mismo tamaño. **Lo que construyo** es un compositor denso (nombre, meta, color y crear) y un listado compacto de Darumas con aporte en la misma fila.
- El ingreso base se suma a **Lo que tengo hoy**. Se edita con el lápiz a la derecha del campo corto y confirma con «Guardado».
- Entra / Sale del detalle abre el formulario de movimiento; los campos permanecen plegados hasta elegir.
- Se conserva el historial y las metas Daruma existentes.
- Mi Balance admite ingreso base y movimientos fijos mensuales; las ramas reflejan el peso relativo de las categorías.
- Los Darumas muestran colores con significado, reciben aportes y, al completarse, pueden enviarse voluntariamente a Edad Dorada sin texto ni datos financieros.

### Núcleo

- Es una única pantalla local; no debe reintroducirse una portada o detalle intermedio.
- La portada no repite el título grande `Núcleo`; conserva el nombre en la navegación y un encabezado semántico oculto para accesibilidad.
- La melodía se solicita una vez por franja. Si se olvida, **Recordar mi melodía** ilumina el orden correcto en las notas, sin persistir la secuencia en texto.
- Cada pensamiento se guarda como destello en el paño: núcleo luminoso y anillo. El más reciente es más grande y el anillo se ve en reposo.
- El paño es la escena (pozo Noche de la misma familia que Constelación y las espirales). No lleva hilo vertical ni anillos concéntricos de astrolabio. El pozo se ve; el borde se suaviza hacia la Noche, sin recorte de navaja ni viñeta que lo apague.
- El texto se clasifica localmente en una familia emocional con nombre y color. Marfil es crema cálida, no un punto blanco.
- Emociones afines se agrupan y tiñen el paño con zonas de plasma. Los destellos de una misma familia se separan lo bastante para tocarlos (no se acoplan).
- La invitación **Escríbelo. Nadie más lo verá.** va centrada encima del paño. El filete de escritura queda debajo, sin caja de vidrio.
- Tocar un punto abre una tarjeta flotante con texto, emoción, fecha y símbolo; no navega a otra sección.
- Núcleo nunca se sincroniza, ni siquiera cifrado.

### Edad Dorada

- La portada no repite el título grande `Edad Dorada`; conserva el nombre en la navegación y un encabezado semántico oculto para accesibilidad.
- El Daruma de kintsugi reemplaza la antigua esfera rosada.
- El Daruma es el acceso principal: tocar la figura abre el detalle. Debajo de **¿Qué reconoces hoy?** aparece la indicación **Toca el daruma para contemplar sus grietas**; no cubre la figura ni es un segundo botón.
- Declarar ocurre solo en la portada (**¿Qué reconoces hoy?**). El detalle conserva el Daruma con grietas y las frases de presencia **debajo** de la figura; no repite el formulario.
- Cada declaración crea una grieta dorada accesible.
- La grieta seleccionada revela su significado sin abandonar la composición.
- El detalle no repite el título visible ni el sigilo circular; el Daruma y las grietas son el espacio contemplativo. No hay un segundo botón de contemplar ni un modo que oculte la navegación.
- El color zodiacal aparece como capa sobre la identidad base.

## Modelo de datos local

`LocalStorageDriver` agrega automáticamente el prefijo `aureo_`. El código de dominio usa nombres sin prefijo; el navegador guarda claves como `aureo_balance_movimientos`.

Reglas permanentes:

- No borrar datos existentes para corregir una interfaz.
- No renombrar claves históricas sin migración preservadora.
- Toda migración debe ser versionada en `src/data/migrations.ts`.
- Versión local de esquema vigente: `CURRENT_SCHEMA_VERSION = 4` (añade `momentos: []` a hobbies existentes; no borra el campo histórico `estado`).
- El backup vigente usa versión 2 y excluye `device_secret`.
- Los campos privados de nacimiento del perfil se cifran localmente.
- Los borrados sincronizables se conservan como tombstones mediante `deleted_at`.

Colecciones sincronizables:

| Eje remoto | Colecciones locales |
| --- | --- |
| `umbral` | `intenciones`, `pulso`, `ideas`, `cultivo`, `umbral_arcanos` |
| `mundos` | `vinculos`, `companeros`, `decretos`, `plantas`, `hobbies`, `travesias`, `locuidado_memoria` |
| `balance` | `balance_movimientos`, `balance_categorias`, `balance_darumas` |
| `edad_dorada` | `edad_dorada_declaraciones` |

Datos deliberadamente locales incluyen:

- `nucleo_pensamientos` y cualquier clave cuyo nombre empiece por `nucleo`.
- `balance_oculto`, `umbral_lumen`, `decretos_bienvenida`, preferencias visuales y estado de sesión.
- La sesión de acceso local en `aureo_local_session`; se crea una vez por dispositivo y no contiene correo.
- `device_secret`.
- La selección del eje Tailwind en `sessionStorage` (`aureo_tailwind_axis`).

## Supabase

Proyecto: `msfitymrxblzgiqyjfse`.

Fuente local del esquema:

```text
supabase/migrations/202608190001_initial_aureo_sync.sql
```

Estado remoto documentado y verificado previamente:

- Tablas `public.aureo_profiles` y `public.aureo_records`.
- RLS habilitado en ambas.
- Políticas de selección, inserción y actualización para registros propios.
- RPC `public.sync_aureo_records(jsonb)`.
- El RPC solo se concede a `authenticated`; `public` y `anon` no pueden ejecutarlo.
- `aureo_records.axis` admite solamente `umbral`, `mundos`, `balance` y `edad_dorada`.
- Conflictos resueltos por el par `(client_updated_at, mutation_id)`.

Configuración local:

- `.env.local` contiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` cuando está configurado.
- `.env.local` está ignorado.
- `.env.example` puede contener la URL pública y deja vacía la clave.
- La clave anon es pública para el cliente, pero no debe copiarse a respuestas, capturas ni documentación.
- Nunca registrar `service_role` en código cliente.

Autenticación:

- `src/stores/auth.ts` usa temporalmente una sesión local persistente mediante `StorageDriver`; no pide correo ni inicializa Supabase.
- `src/App.vue` no ejecuta sincronización remota al arrancar ni al recuperar conexión mientras esté vigente el modo local.
- Los clientes y servicios de Supabase permanecen en el repositorio para una activación multiusuario posterior, pero no forman parte del flujo de acceso actual.
- Perfil remoto en `src/data/supabase/profile.ts`.
- Sincronización en `src/data/sync/service.ts`.
- Catálogo remoto en `src/data/sync/catalog.ts`.

### Garantía innegociable de Núcleo

La exclusión se aplica en dos niveles:

1. Cliente: `remoteAxisFor('nucleo_pensamientos')` devuelve `null`; el catálogo no contiene ninguna clave `nucleo*`.
2. Base de datos: la restricción de `axis` no permite `nucleo`.

No ampliar el catálogo, la RPC ni la base para incluir Núcleo. No enviar Núcleo a analítica, backups remotos o futuras funciones de IA.

## Pruebas y verificación

Comandos estándar:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Configuración Playwright:

- Proyecto `desktop`: Desktop Chrome.
- Proyecto `mobile`: iPhone 13.
- El runner compila y sirve la aplicación en `4174`; la ruta Tailwind sigue disponible dentro del mismo build.

Cobertura E2E relevante:

- Rutas históricas y redirecciones.
- Funciones reales de cada eje Tailwind.
- Anchura y adaptación móvil.
- Cerezo de gastos y flores interactivas.
- Paneles flotantes de movimiento y meta sin cambio de ruta.
- Matiz zodiacal.
- Mural fotográfico.
- Tarot animado y movimiento reducido.
- Plasma y lecturas flotantes de Núcleo.
- Órbitas de Mi Constelación y tooltip de dos toques.
- Baúl de postales de Travesías (búsqueda Nominatim sin mapa).
- Ritual de Decretos, bienvenida y “Esto ya es mío”.
- Espirales de Hobbies y registro de momentos.
- Daruma y grietas de Edad Dorada.
- Navegación adaptable, estado, persistencia local, offline y teclado.

Última verificación completa conocida antes de los ajustes de esta iteración:

- `pnpm typecheck`: correcto.
- `pnpm test`: 3 archivos, 7 pruebas correctas.
- `pnpm build`: correcto.
- `pnpm test:e2e`: 42 recorridos correctos en escritorio y móvil, incluidos melodía de Núcleo, signo de Vínculos, ritual de Decretos, mapa de Travesías y transferencia segura de Daruma.
- Detector de diseño de los componentes modificados: sin hallazgos.

Validación posterior a los ajustes documentados del 28-08-2026:

- `pnpm build`: correcto.
- `pnpm test`: 3 archivos y 7 pruebas correctas.
- E2E focalizados de arranque/sesión local, portada Mundos y carril raíz: 2/2 correctos cada uno en escritorio y móvil.
- E2E focalizados de aura móvil y detalle de Balance: 4/4 correctos en escritorio y móvil.
- E2E `cambia de eje sin colapsar temporalmente el escenario`: correcto en escritorio y móvil. El runner continuó con la suite amplia y se interrumpió al quedar detenido en un recorrido posterior no relacionado; no declarar una nueva pasada completa.
- Detector de diseño de los archivos de interfaz modificados: sin hallazgos.
- La suite E2E completa queda pendiente de repetición; no atribuir los 42 recorridos anteriores al último árbol de trabajo.

Antes de una entrega externa ejecutar nuevamente la suite E2E completa. Las pruebas remotas multiusuario con dos correos reales y conflictos concurrentes deben repetirse antes de liberar sincronización a testers.

## Flujo seguro para cambios futuros

1. Identificar la versión solicitada usando el mapa de versiones.
2. Leer las decisiones del eje afectado.
3. Inspeccionar los datos y la implementación existente antes de editar.
4. Trabajar por defecto en Tailwind sin duplicar el cambio en la presentación original.
5. Usar repositorios; no escribir directamente a `localStorage` desde nuevas vistas salvo estado efímero justificado.
6. No conectar componentes directamente a Supabase.
7. Preservar datos locales, rutas y nombres históricos.
8. Verificar escritorio y móvil en una ronda acotada.
9. Ejecutar typecheck, pruebas proporcionales y build.
10. Actualizar este documento si cambia una decisión, una versión, una ruta, un contrato de datos o una función visible relevante.

## Acciones prohibidas sin autorización explícita

- Borrar o reinicializar datos locales.
- Ejecutar migraciones destructivas.
- Sincronizar Núcleo.
- Copiar código compilado desde Vercel hacia la base canónica como si fuera fuente.
- Mantener Tailwind y la presentación original en paralelo por defecto.
- Cambiar la identidad Noche + Oro por una plantilla genérica.
- Recortar el aura de los espacios internos al recuadro del contenido (`filter` en `.tw-workspace`, `.workspace-aura` a `width: 100%`, overflow hidden en el workspace). Ver `docs/product/AURA_CAMPO_CONTINUO.md`.
- Introducir IA, chatbot, consejos automáticos, analítica de Núcleo o gamificación.
- Exponer claves, tokens, correos de prueba o secretos de Supabase.
- Publicar, desplegar o modificar la versión web histórica sin solicitud explícita.

## Decisiones aún abiertas

- Cuándo retirar definitivamente la redirección compatible `/laboratorio-tailwind`; la experiencia ya vive en `/`.
- Cuándo promover la experiencia Tailwind al puerto/ruta principal de producción.
- Validación remota final con múltiples usuarios y conflictos reales.
- Momento de incorporar Capacitor para Android/iOS, después de estabilizar la PWA.

- Estilos artísticos sumi-e / Ghibli del mural de Lo que cuido, y si se ven dentro de la app o solo al compartir.

Ideas no confirmadas y aplazadas: exportación a Instagram, integración por WhatsApp, imágenes generadas para Hobbies, notificaciones o resúmenes semanales, constructor de ejes, publicación inmediata en tiendas, traducciones y los “tres números únicos” del onboarding. No implementarlas sin decisión explícita.

## Fuentes históricas y de producto

En la raíz `D:\Work - TIgrr\Aureo`:

- `umbral_eje1_aureo_v1.1.docx`
- `mundos_eje2_aureo_v1.2.docx`
- `ux_decisiones_mundos_v1.md`
- `memoria_sesion_eje3_finanzas_v2.md`
- `nucleo_eje4_aureo_v1.2.md`
- `memoria_sesion_eje4_nucleo_v2.md`
- `memoria_sesion_eje5_edad_dorada_v2.md`
- `aureo_simbolo_M6_fiel.png`

## Protocolo de mantenimiento documental

Al cerrar una modificación significativa:

- Actualizar `last_verified` en el encabezado de este archivo.
- Añadir o corregir el estado funcional del eje afectado.
- Actualizar `docs/CONTINUIDAD_IMPLEMENTACION.md` si el cambio necesita relato cronológico.
- Actualizar `docs/product/DECISIONES_CLIENTA.md` solo cuando exista una decisión nueva confirmada por la usuaria.
- No convertir resultados transitorios de una prueba en decisiones permanentes.
- No incluir secretos ni valores de `.env.local`.
