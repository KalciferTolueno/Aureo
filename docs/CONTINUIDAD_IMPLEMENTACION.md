# Continuidad de implementación — Áureo

Última actualización: 28 de agosto de 2026.

> Nota de continuidad: para el inventario exacto de los cambios visuales y de acceso más recientes, leer `docs/changes/2026-08-28-ajustes-ui-y-acceso-local.md`. Ese registro, `docs/AI_HANDOFF.md` y `docs/product/DECISIONES_CLIENTA.md` prevalecen sobre las descripciones históricas de este documento.

Este documento permite retomar el trabajo sin depender del historial de conversación. Resume el estado comprobado del repositorio, las decisiones visuales tomadas, la integración de Supabase, el laboratorio Tailwind y la forma segura de continuar.

## Antes de modificar el producto

1. Leer `docs/product/DECISIONES_CLIENTA.md`.
2. Mantener `aureo-web` como única base fuente oficial.
3. No borrar ni renombrar claves históricas `aureo_*` sin una migración preservadora.
4. Núcleo nunca se sincroniza, ni siquiera cifrado.
5. No convertir Áureo en una aplicación convencional de productividad ni introducir presión, juicio o gamificación.

## Referencia histórica de Vercel

El 27 de agosto de 2026 se archivó la versión antigua publicada en <https://aureo-comercial.vercel.app/#/> dentro de `D:\Work - TIgrr\Aureo\pagina de vercel`.

Esta copia sirve únicamente como referencia visual y funcional para solicitudes futuras. Incluye la compilación estática y sus recursos PWA de primera parte. La fuente vigente sigue siendo `aureo-web`; no copiar ni fusionar automáticamente código de la versión archivada.

Las instrucciones para abrir la copia se encuentran en `D:\Work - TIgrr\Aureo\pagina de vercel\README.md`.

## Estado general

- Stack: Vue 3, TypeScript estricto, Vite, Pinia y Vue Router.
- La aplicación funciona como PWA, con caché offline y aviso de actualización.
- Los datos locales siguen detrás de repositorios y migraciones versionadas.
- Las rutas históricas continúan siendo compatibles; `finanzas` redirige a Mi Balance y `conocimiento` a Edad Dorada.
- Umbral, Mundos, Mi Balance y Edad Dorada conservan soporte de sincronización remota, actualmente pausado por el modo de acceso local.
- Núcleo permanece exclusivamente en `localStorage`/`sessionStorage` del dispositivo.

## Dirección de trabajo vigente

Decisión confirmada el 27 de agosto de 2026: todos los cambios nuevos de interfaz, UX y funciones visibles se realizarán sobre la versión Tailwind de `4175`.

La presentación no Tailwind fue eliminada en la v1.2. No mantener una segunda interfaz en paralelo; las copias de Vercel permanecen como referencias históricas de solo lectura.

## Servidores de desarrollo separados

La experiencia principal usa el siguiente origen:

| Interfaz | Comando | URL |
| --- | --- | --- |
| Experiencia principal Tailwind | `pnpm dev:tailwind` | `http://127.0.0.1:4175/#/` |

Las copias históricas ejecutadas en otros puertos tienen `localStorage` y service workers independientes. El origen `4175` abre la experiencia vigente y sus espacios funcionales.

El laboratorio ya no presenta controles para “salir del modo”, “volver a Áureo actual” ni “abrir el eje actual”. Debe sentirse como una interfaz independiente, no como una capa superpuesta.

## Supabase

Proyecto asociado: `msfitymrxblzgiqyjfse`.

### Estado remoto verificado

Verificación realizada mediante Supabase MCP el 20 de agosto de 2026:

- Migración remota: `20260820022323_initial_aureo_sync`.
- Tablas públicas: `aureo_profiles` y `aureo_records`.
- RLS habilitado en ambas tablas.
- Seis políticas RLS: lectura, inserción y actualización de datos propios para cada tabla.
- RPC `public.sync_aureo_records(jsonb)` presente.
- El RPC solo se concede a `authenticated`; `public` y `anon` no pueden ejecutarlo.
- La restricción de `aureo_records.axis` solo permite `umbral`, `mundos`, `balance` y `edad_dorada`.

Fuente de verdad local del esquema:

`supabase/migrations/202608190001_initial_aureo_sync.sql`

### Configuración local

`.env.local` existe y contiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. No copiar sus valores a documentación, respuestas, capturas o commits. `.env.example` conserva únicamente la forma esperada de la configuración.

### Autenticación y sincronización

- Decisión del 28 de agosto de 2026: el acceso vigente crea y reutiliza `aureo_local_session` mediante `src/stores/auth.ts`; no solicita correo.
- `src/App.vue` no inicializa autenticación de Supabase ni dispara sincronización remota durante esta etapa local.
- El OTP por correo y la sincronización multiusuario quedan aplazados; sus servicios se conservan desacoplados para reactivarlos más adelante.
- El perfil se sincroniza mediante `src/data/supabase/profile.ts`.
- Las pantallas no llaman directamente a Supabase.
- `src/data/sync/service.ts` empuja mutaciones pendientes, invoca el RPC y vuelve a mezclar los registros remotos en el almacenamiento local.
- Cada cambio sincronizable usa `sync_id`, `device_id`, `mutation_id` y `updated_at`.
- Los borrados viajan como tombstones con `deleted_at`.
- El conflicto remoto se resuelve determinísticamente por `(client_updated_at, mutation_id)`.
- El catálogo sincronizable vive en `src/data/sync/catalog.ts`.

### Garantía de Núcleo

`nucleo_pensamientos` no figura en el catálogo remoto. `remoteAxisFor('nucleo_pensamientos')` devuelve `null`, y existe una prueba automática que comprueba que ninguna colección cuyo nombre empiece por `nucleo` sea sincronizable. La versión Tailwind presenta Núcleo como una sola pantalla: el campo de escritura vive debajo del plasma, cada pensamiento nuevo aparece como un punto luminoso y al pulsarlo abre una tarjeta flotante sin cambiar de sección. No debe reintroducirse una portada o navegación intermedia.

La base remota también rechaza `axis = 'nucleo'`. Esta defensa doble —cliente y base de datos— no debe retirarse.

## Trabajo visual preservado en la presentación original

### Umbral

- Se conservó la composición nocturna y orbital.
- Las órbitas se alejaron progresivamente del centro para que no tocaran la fase lunar.
- El centro “Creciente” representa la fase o estado simbólico del día.
- Se mantuvo el lenguaje contemplativo y el fondo continuo, sin convertirlo en una tarjeta genérica.

### Mundos

- La portada no repite el título grande del eje; conserva `Mundos` en la navegación y como encabezado semántico oculto.
- Se consolidó una flor SVG de cinco pétalos como acceso principal.
- Los pétalos usan volumen, brillo y color propios.
- Los textos siguen la dirección radial desde el centro hacia afuera.
- Correspondencia visual preservada: Mi Constelación, Decretos, Hobbies, Travesías y Lo que cuido.
- Mi Constelación Tailwind recupera los tres anillos confirmados por la clienta: Amor en el centro, Familia en la órbita media y Amistad, Raíz y Guía en la exterior. Cada vínculo se representa como una estrella interactiva sin abandonar la vista.
- La vista entra directamente al mapa de Mi Constelación, sin texto explicativo previo a las órbitas.
- Se mantuvo la frase “Todo lo que ya es tuyo.”

### Núcleo

- La portada no repite el título grande del eje; conserva `Núcleo` en la navegación y como encabezado semántico oculto.
- La metáfora visual es una tela o espacio circular oscuro e íntimo.
- Los pensamientos aparecen como puntos de luz locales.
- Se añadió movimiento sutil de respiración, respetando `prefers-reduced-motion`.
- La interfaz explica que los pensamientos no salen del dispositivo.
- En la experiencia Tailwind, el texto de cada pensamiento reconoce una familia emocional con nombre y color: reflexión, alegría, calma, intensidad, sensibilidad o emoción abierta.
- Los pensamientos de una misma familia se agrupan visualmente sin modificar sus datos guardados; un plasma del mismo color hace visible cada agrupación.
- Al pulsar un punto, el pensamiento se despliega en una lectura flotante con emoción, fecha y símbolo. Puede cerrarse mediante el botón, el fondo o la tecla Escape.

### Edad Dorada

- La portada no repite el título grande del eje; conserva `Edad Dorada` en la navegación y como encabezado semántico oculto.
- Se reforzó la metáfora aprobada de Resina de Oro / Kintsugi Invertido.
- La pieza central Tailwind es un Daruma de resina, con el color zodiacal como capa visual. Cada declaración conservada forma una grieta dorada accesible; la más reciente nace en el centro y las anteriores se desplazan hacia afuera.
- Pulsar o enfocar una grieta revela lo que representa sin abandonar la composición. El modo contemplación oculta toda la navegación y deja únicamente el Daruma en la noche.
- No se presenta como lista ni línea temporal.

### Mi Balance

- Se preservó la privacidad del saldo por defecto.
- La composición usa balanza, sello y órbitas, sin lenguaje de juicio financiero.
- “Registrar movimiento” y “Nueva meta” tienen dimensiones equivalentes.

## Experiencia principal Tailwind

Ruta fuente: `src/modules/experimental/TailwindPreviewView.vue`.

### Objetivo vigente

Evolucionar Áureo desde esta implementación con un sistema de interfaz consistente sin sustituir su identidad. Tailwind organiza espaciado, estados, adaptación y controles; la personalidad sigue viniendo de las metáforas visuales del producto.

### Integración técnica

- Tailwind CSS 4 se integra mediante `@tailwindcss/vite`.
- Los estilos se cargan desde `src/shared/styles/tailwind.css`.
- Las utilidades usan prefijo `tw:`.
- Preflight no se carga, para no alterar la interfaz vigente.
- La paleta Noche + Oro se conserva mediante tokens semánticos.
- Se instaló en el proyecto la skill `tailwind-design-system` en `.agents/skills/tailwind-design-system`.

### Composición actual

- La llegada abre en Umbral y recuerda el último eje elegido durante la sesión.
- Navegación lateral en escritorio y navegación inferior en móvil.
- Umbral: sistema orbital amplio con datos simbólicos del día.
- Mundos: flor tridimensional de cinco pétalos con etiquetas radiales.
- Mi Balance: campo orbital, sello de privacidad y acciones iguales de 56 px.
- Núcleo: tela circular con luces locales.
- Edad Dorada: esfera de resina cálida con vetas doradas.
- Fondo estelar continuo y jerarquía editorial.
- Las auras de los espacios internos se funden con ese fondo y no quedan recortadas por la animación de entrada.
- Adaptación móvil sin desbordamiento horizontal.
- Movimiento desactivable mediante preferencias de movimiento reducido.

### Funciones y seguridad de datos del laboratorio

La experiencia Tailwind es funcional e independiente. Sus acciones permanecen en la ruta raíz y abren espacios internos con el mismo lenguaje visual:

- Los pétalos de Mundos abren Constelación, Decretos, Hobbies, Travesías y Cuidado.
- “Registrar movimiento” y “Nueva meta” abren Mi Balance con el formulario correspondiente.
- Núcleo permite crear y abrir pensamientos locales.
- Edad Dorada permite crear y revelar declaraciones.
- Umbral permite registrar intenciones y el pulso del día sin salir de la experiencia.
- La navegación de retorno mantiene a la persona dentro de la experiencia Tailwind y conserva el eje en la URL.

Las escrituras solo ocurren después de confirmar los formularios funcionales. Como `4175` es un origen independiente, estas pruebas no modifican los datos locales existentes en `4174`. Núcleo continúa exclusivamente local y no forma parte del catálogo de sincronización remota.

### Pase de pulido integral

Completado el 20 de agosto de 2026:

- Se retiraron del producto visible las etiquetas “Tailwind”, “experimental” y los conteos internos en cero.
- La experiencia abre en Umbral y recuerda el último eje elegido durante la sesión.
- La selección de navegación se expresa mediante luz, símbolo y un indicador fino; no mediante una tarjeta genérica.
- Los estados de foco tienen tratamiento propio para escritorio y móvil.
- Los elementos centrales y pétalos abren espacios funcionales internos, con soporte de teclado y sin saltos a la interfaz vigente.
- Los espacios internos abandonan el patrón de formulario genérico: usan hilos rituales, sigilos orbitales, acentos propios por eje y controles recortados dentro de la misma paleta.
- La flor respira y suspende sus pétalos; Balance rota su campo celeste; Núcleo mueve tela y destellos; Edad Dorada hace circular luz por la resina y sus vetas.
- La apertura de un espacio usa máscara y desenfoque para conservar continuidad. `prefers-reduced-motion` elimina órbitas y bucles, pero conserva una confirmación breve de aparición.
- Las transiciones entre ejes usan máscara, desenfoque y una curva de salida; `prefers-reduced-motion` las reduce a un cambio inmediato.
- Edad Dorada toma el color del signo de la persona y usa una silueta orgánica de resina.
- Núcleo adopta una silueta de tela ligeramente orgánica.
- Umbral calcula su número con la fecha local y nombra explícitamente el “Signo del día”.
- El aviso global de actualización PWA no interrumpe el laboratorio durante la comparación visual.
- Se tematizaron selección de texto, foco, caret y barras de desplazamiento.

### Adaptación móvil integral

Completada el 20 de agosto de 2026:

- Los espacios internos usan columnas fluidas con `minmax(0, 1fr)` y pasan a una sola columna en móvil.
- Encabezados, sigilos, formularios, registros y acciones se repliegan sin perder jerarquía ni áreas táctiles.
- La tela de Núcleo, la flor de Mundos, las órbitas y la resina de Edad Dorada ajustan su escala al ancho y a pantallas horizontales de poca altura.
- Las declaraciones seleccionadas de Edad Dorada se leen debajo de la pieza en móvil para evitar globos cortados dentro de la escultura.
- Los botones largos de registros y las acciones de Balance ocupan el ancho disponible en pantallas estrechas.
- Se conserva desplazamiento vertical cuando el contenido necesita más altura; no hay desplazamiento horizontal ni controles inaccesibles.
- La navegación inferior respeta el ancho completo del viewport y las áreas seguras del dispositivo.
- El recorrido E2E visita todos los ejes, detalles y formularios a 320 × 568, en un dispositivo móvil emulado y a 568 × 320, comprobando el ancho del documento y de cada control visible.

### Recuperación de la personalidad original

Completada el 20 de agosto de 2026 sobre la experiencia Tailwind:

- Umbral vuelve a abrir con el saludo personal y “El día en números”, como en la interfaz original, en lugar de presentar primero el nombre técnico del eje.
- Los datos simbólicos dejaron la distribución uniforme de tablero: Número, Signo del día y Arcano flotan como objetos distintos dentro del cielo orbital.
- Se recuperaron las constelaciones de fondo y la combinación de líneas finas, placas oscuras y luz dorada de la composición original.
- El centro de Umbral usa una luna SVG propia: calcula ocho fases, cambia la iluminación del disco y conserva el nombre de la fase como texto y etiqueta accesible.
- El Arcano del día se presenta como un mazo de tres cartas: se baraja una vez al entrar, recompone el mazo y revela la carta vigente. Con movimiento reducido, las cartas aparecen directamente en su estado final.
- La portada muestra antes de entrar dos huellas cotidianas útiles: Palabra de poder y el estado de “Lo que tengo en mente hoy”. Ambas abren el Umbral funcional.
- La navegación inferior vuelve a ser un objeto oscuro flotante con borde dorado y esquinas superiores suaves, manteniendo las áreas táctiles y la adaptación móvil de Tailwind.
- Se eliminó la barra contextual superior: la fecha comparte el encabezado del eje, alineada al extremo derecho del saludo, y se abrevia en pantallas estrechas.
- Se conservaron las funciones independientes, la paleta vigente, el movimiento reducido y la privacidad local de Núcleo.

### Umbral interior con comportamiento de aplicación

Completado el 20 de agosto de 2026 en el detalle funcional Tailwind:

- La cabecera móvil se compactó en una barra de contexto con regreso circular, título y sigilo; ya no ocupa la pantalla como el encabezado de una página web.
- “Lo que tengo en mente hoy” y “Mi pulso de hoy” forman un recorrido vertical continuo, separado por ritmo y una línea ritual, no por tarjetas rectangulares.
- Los campos se integraron al lienzo mediante líneas de escritura, tipografía editorial y fondos transparentes; se conservaron sus etiquetas, foco visible y áreas táctiles.
- Cada momento del recorrido tiene un sello circular propio y la órbita permanece como profundidad sutil de fondo.
- Las acciones aparecen solo cuando existe contenido, conservan las funciones y repositorios anteriores y no modifican datos locales existentes.
- La vista fue revisada directamente a 593 × 928 y el recorrido automático confirmó que todos los controles permanecen dentro del ancho móvil.

## Skills y criterios de diseño usados

- `find-skills` se instaló para localizar capacidades de diseño reutilizables.
- `tailwind-design-system` se instaló y se aplicó al sistema experimental.
- `impeccable` se usó para revisar jerarquía, originalidad, accesibilidad, adaptación y pulido.
- El detector de Impeccable terminó sin hallazgos en la última revisión completa.

La dirección acordada es evitar patrones reconocibles de “dashboard generado por IA”: paneles genéricos, exceso de tarjetas, métricas decorativas o gradientes sin propósito.

## Pruebas y calidad

Comandos de validación:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Último pase completo previo a esta documentación:

- Typecheck correcto.
- 3 archivos de pruebas unitarias, 6 pruebas aprobadas.
- Build de producción correcto.
- 18 recorridos E2E aprobados: 9 en escritorio y 9 en móvil.
- E2E incluye rutas, navegación adaptable, datos del día, conservación de estado, creación local, funcionamiento offline y recorrido de teclado.
- La portada Tailwind tiene un recorrido funcional adicional en escritorio y móvil que crea y consulta datos efímeros de Balance, Núcleo y Edad Dorada, además de abrir un mundo.

Revalidación del ajuste interior de Umbral, 20 de agosto de 2026:

- Typecheck, 6 pruebas unitarias y build de producción correctos.
- Detector de diseño sin hallazgos.
- El control E2E de ancho del laboratorio pasó en escritorio emulando 320 × 568 y en móvil iPhone 13, incluida la ruta `detail=umbral`.
- El recorrido E2E completo aprobó 17 de 18 casos. El único caso pendiente agotó el tiempo esperando estabilidad del botón animado “Entrar a Edad Dorada” en móvil; el mismo recorrido pasó en escritorio y no corresponde a la vista de Umbral modificada.

Antes de reactivar el modo multiusuario conviene repetir un smoke test remoto con dos correos reales para validar OTP, propagación y conflictos. Mientras siga vigente el acceso local, esas pruebas no forman parte del arranque normal.

## Archivos clave

### Edad Dorada en la portada Tailwind

- El Daruma de kintsugi reemplaza por completo la antigua esfera de resina rosada como acceso a Edad Dorada.
- Todo el Daruma es el control táctil que abre el detalle; no existe un botón u objeto intermedio.
- La declaración se escribe y forma directamente en la portada de Edad Dorada; abrir el detalle ya no es un requisito. El acceso secundario “Contemplar mis grietas” queda para recorrer y leer lo guardado.
- Las grietas visibles en la portada corresponden a las declaraciones locales guardadas, hasta doce trazos distintos, y comparten el mismo patrón visual con el Daruma interior.
- Su respiración visual solo modifica luz y saturación: no desplaza el área interactiva y respeta `prefers-reduced-motion`.

### Capa cromática zodiacal

- Noche, marfil, oro y cosmos continúan siendo la identidad base de Áureo.
- El signo del perfil aporta un matiz secundario propio mediante `--zodiac-color` y `--sign-color`; nunca sustituye los colores de acción, texto o superficie.
- El matiz aparece con dosis baja en la atmósfera, el sello del eje, el foco, la navegación activa, Balance y el Daruma. Las acciones principales permanecen doradas y el contenido permanece marfil.
- Los doce signos tienen un matiz diferenciado y el perfil identifica el activo con texto y muestra de color, evitando que la información dependa solamente del color.

### Mural de Lo que cuido

- La versión Tailwind reemplaza el formulario/listado de `world-cuidado` por un mural editorial de afiches fotográficos.
- Cada afiche conserva nombre, categoría y frase; los registros históricos sin fotografía siguen visibles como afiches tipográficos.
- Las imágenes se aceptan desde el dispositivo o mediante arrastre, se limitan a 12 MB y se optimizan localmente a un máximo de 1400 px antes de guardarse como JPEG.
- La creación y la visualización funcionan offline sobre las colecciones existentes `companeros` y `plantas`; no se elimina ni migra destructivamente ningún dato anterior.
- En desarrollo se muestran cinco afiches fotográficos identificados como `Muestra` para evaluar la composición. Se cargan desde `src/assets/care-demo`, no se escriben en las colecciones ni se sincronizan y desaparecen automáticamente del build de producción.

### Bonsái de cerezo de Mi Balance

- La portada Tailwind de Mi Balance no repite el título grande del eje; conserva el nombre en la navegación y como encabezado semántico oculto. Reemplaza el antiguo bloque de saldo oculto por un bonsái de cerezo, sin la antigua balanza circular flotante sobre el árbol y conservando el sello de privacidad y las órbitas como atmósfera de fondo. El árbol completo abre la vista funcional.
- El bonsái y sus flores viven únicamente en la portada. La vista funcional evita repetirlos y conserva el acceso a los gastos mediante `Últimos movimientos`.
- Solo la portada representa los gastos como flores; los ingresos permanecen en el saldo y el historial, pero no se confunden visualmente con flores.
- Cada flor corresponde a un movimiento real de tipo `gasto`. Al tocarla se abre una lectura flotante con monto, categoría, nota y fecha, sin navegar a otra sección.
- La portada muestra hasta doce gastos recientes como flores. El detalle conserva el historial de movimientos y las metas existentes sin repetir el árbol.
- En la portada, `Registrar movimiento` y `Nueva meta` abren paneles flotantes accesibles sobre la misma pantalla. Guardan mediante los repositorios existentes, no añaden `detail` ni `action` a la URL y el bonsái se actualiza inmediatamente al registrar un gasto.
- La implementación consume `balance_movimientos` sin cambiar el esquema ni migrar datos locales. Respeta teclado, áreas táctiles, móvil y `prefers-reduced-motion`.
- El ingreso base se conserva en `aureo_balance_ingreso_base`; los movimientos pueden marcarse como fijos mensuales y las ramas expresan el peso relativo de las categorías.
- Los Darumas admiten aportes y transferencia voluntaria a Edad Dorada al completarse. El nodo remoto no contiene texto ni montos.

### Decisiones del 28 de agosto

- Umbral persiste el arcano diario en `umbral_arcanos` y expone el mazo histórico.
- Mi Constelación conserva el signo opcional de cada vínculo.
- Travesías presenta un mapa SVG local y guarda coordenadas reales y “¿Qué viviste ahí?”.
- La séptima activación ritual de un Decreto crea un nodo sin texto en Edad Dorada.
- Núcleo exige la melodía de la franja actual en la misma pantalla, sin reintroducir una portada intermedia.
- Durante el modo de acceso local, recuperar conexión no dispara sincronización. Ese comportamiento queda aplazado junto con Supabase.
- No hay distinción funcional Free/Premium en esta etapa.
- Permanecen aplazadas y no confirmadas la exportación social, WhatsApp, imágenes generadas, notificaciones o resúmenes semanales, ejes personalizados, tiendas, traducciones y los “tres números únicos” del onboarding.

Validación histórica anterior a la última iteración: typecheck y build correctos; 7 pruebas unitarias y 42 recorridos E2E aprobados en escritorio y móvil; detector de diseño sin hallazgos.

Validación del árbol de trabajo posterior a los ajustes visuales y al acceso local del 28 de agosto de 2026: build correcto; 3 archivos y 7 pruebas unitarias correctas; E2E focalizados de sesión local, portada Mundos y scrollbar correctos 2/2 cada uno; E2E focalizados de aura móvil y Balance correctos 4/4; detector de diseño sin hallazgos. La suite E2E completa todavía debe repetirse y los 42 recorridos históricos no describen el estado exacto de este árbol.

- `docs/product/DECISIONES_CLIENTA.md`: decisiones vinculantes de producto.
- `PRODUCT.md`: contexto durable de diseño.
- `src/modules/experimental/TailwindPreviewView.vue`: laboratorio Tailwind.
- `src/modules/experimental/tailwind/TailwindWorkspace.vue`: formularios, registros y rituales funcionales independientes.
- `src/shared/styles/tailwind.css`: tokens y utilidades Tailwind aisladas.
- `src/router/index.ts`: rutas y excepción de onboarding del laboratorio.
- `src/data/storage.ts`: almacenamiento local.
- `src/data/repositories.ts`: acceso a colecciones.
- `src/data/sync/catalog.ts`: lista explícita de colecciones remotas.
- `src/data/sync/service.ts`: sincronización y mezcla.
- `src/stores/auth.ts`: sesión local persistente sin correo.
- `supabase/migrations/202608190001_initial_aureo_sync.sql`: esquema remoto.
- `tests/e2e/routes.spec.ts`: recorridos de aplicación y laboratorio.

## Cómo retomar

1. Iniciar `pnpm dev:tailwind`.
2. Trabajar y validar primero en la experiencia Tailwind de `4175`.
3. Usar las copias históricas únicamente para comparar identidad, contenido o comportamientos anteriores.
4. Probar desde la portada Tailwind los accesos a Mundos, Mi Balance, Núcleo y Edad Dorada.
5. Ejecutar las cuatro validaciones antes de cerrar cualquier nueva iteración.
6. Si se modifica sincronización, repetir la verificación remota de tablas, RLS, RPC y exclusión de Núcleo.

## Decisiones pendientes

- Definir cuándo retirar definitivamente la redirección compatible `/laboratorio-tailwind`; la experiencia principal ya usa `/`.
- Repetir pruebas remotas multiusuario antes de liberar la sincronización a testers.
