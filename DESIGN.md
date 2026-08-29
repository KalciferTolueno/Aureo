---
name: Áureo
description: Aplicación Operate contemplativa Noche + Oro para cultivar un registro personal privado.
colors:
  noche: "#080b11"
  noche-suave: "#10151f"
  superficie: "rgba(18, 24, 35, 0.82)"
  superficie-fuerte: "#171d29"
  oro: "#c9a86a"
  oro-claro: "#ead6a7"
  oro-tenue: "rgba(201, 168, 106, 0.12)"
  marfil: "#f4efe5"
  marfil-suave: "#b9b3aa"
  cosmos: "#8173b7"
  salvia: "#7da797"
  ocaso: "#b86d5d"
  linea: "rgba(201, 168, 106, 0.2)"
typography:
  display:
    fontFamily: '"Aureo Serif", Georgia, "Times New Roman", serif'
    fontWeight: 200
    lineHeight: 0.96
    letterSpacing: "-0.03em"
  body:
    fontFamily: '"Aureo Serif", Georgia, "Times New Roman", serif'
    fontWeight: 300
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, sans-serif"
    fontWeight: 500
rounded:
  sm: "14px"
  md: "16px"
  lg: "16px"
  pill: "999px"
spacing:
  1: "0.375rem"
  2: "0.625rem"
  3: "1rem"
  4: "1.5rem"
  5: "2.25rem"
  6: "3.25rem"
components:
  action-primary:
    backgroundColor: "rgba(201,168,106,.14)"
    textColor: "{colors.oro-claro}"
    rounded: "{rounded.pill}"
    padding: ".75rem 1rem"
    height: "48px"
  axis-nav-active:
    backgroundColor: "color-mix(in srgb, var(--zodiac-color) 15%, transparent)"
    textColor: "{colors.oro-claro}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "3.25rem"
---

# Design System: Áureo

## Overview

**Creative North Star: "El Observatorio Íntimo"**

Áureo es una aplicación **Operate** contemplativa: el registro cotidiano debe seguir siendo claro y accionable, pero habita un campo continuo en vez de un conjunto de paneles administrativos. Noche sostiene la interfaz; oro y marfil guían la mirada; el color zodiacal personal aparece como un matiz de ambiente, nunca desplaza la identidad base.

La materia visual ya implementada combina capas ambientales, transparencias sobrias, halos y superficies orgánicas. Las acciones y la navegación se leen como cápsulas; los ejes conservan objetos-signatura (luna, flor, cerezo, plasma y Daruma) para que la aplicación se perciba como un universo único, incluso al entrar en una lectura o formulario. No se sustituye esa continuidad por una plantilla de dashboard rígida.

**Key Characteristics:**

- Fondo Noche continuo, reactivo y discretamente estelar.
- Oro reservado para orientación, foco, datos significativos y acción.
- Matiz zodiacal secundario que colorea halos, foco y capas de ambiente.
- Superficies translúcidas y radios asimétricos; cápsulas para acciones y navegación.
- Movimiento ambiental lento, nunca necesario para comprender o usar la interfaz.

## Colors

La paleta trabaja por profundidad y luz: Noche mantiene el campo; marfil conserva la legibilidad y oro marca los gestos elegidos.

### Primary

- **Oro de orientación** (`colors.oro`): acentos de navegación, líneas rituales, bordes de acción, grietas y puntos significativos.
- **Oro claro de foco** (`colors.oro-claro`): texto de acción, foco visible y los reflejos luminosos que requieren mayor contraste.

### Secondary

- **Cosmos** (`colors.cosmos`): aurora, plasma de Núcleo y una de las familias de Mundos.
- **Salvia** (`colors.salvia`): Travesías y Lo que cuido.
- **Ocaso** (`colors.ocaso`): Mi Balance y una de las órbitas de vínculos.

### Neutral

- **Noche** (`colors.noche`) y **Noche suave** (`colors.noche-suave`): campo fijo, navegación y profundidad detrás de todas las escenas.
- **Superficie** (`colors.superficie`) y **Superficie fuerte** (`colors.superficie-fuerte`): lecturas, formularios y capas que necesitan separarse sin quedar opacas ni planas.
- **Marfil** (`colors.marfil`) y **Marfil suave** (`colors.marfil-suave`): contenido principal y contenido secundario respectivamente.
- **Línea dorada** (`colors.linea`): divisores y bordes de baja prioridad.

El matiz zodiacal se resuelve en ejecución desde el signo del perfil y se usa para halos, Spotlight y la capa de resina. Es un color de acompañamiento, no una sustitución del oro, el marfil o la Noche.

**The Noche + Oro Rule.** La Noche es la base de toda vista; el oro concentra orientación, estado y acción. Las capas zodiacales se mezclan con esa base en porcentajes bajos para conservar la jerarquía común.

## Typography

**Display Font:** Aureo Serif, Georgia y Times New Roman como respaldo.

**Body Font:** Aureo Serif, Georgia y Times New Roman como respaldo.

**Label/Mono Font:** system-ui, sans-serif.

**Character:** La serif de peso muy ligero hace que los encabezados y lecturas se sientan editoriales y personales. La sans del sistema se reserva para etiquetas, metadatos, recuentos y controles cortos, donde la lectura rápida importa más que el gesto editorial.

### Hierarchy

- **Display** (`typography.display`): encabezados de ejes y frases de presencia; su tamaño usa `clamp()` según el contexto para no perder carácter en móvil.
- **Body** (`typography.body`): reflexión, explicación y texto de registro con interlineado amplio.
- **Label** (`typography.label`): etiquetas, fechas, navegación y metadatos; suele emplear tamaños compactos, peso medio, mayúsculas y espaciado en controles rituales.

**The Editorial Utility Rule.** La serif porta la voz contemplativa; no usarla para condensar controles, contadores o etiquetas que el código ya trata con sans de sistema.

## Layout

El marco principal alcanza `1600px` y, en escritorio, distribuye una barra lateral de `17rem` junto al área de trabajo. El contenido de la portada se contiene a `max-w-5xl`; la navegación se desplaza a una barra inferior fija de cinco ejes en móvil y respeta los safe areas.

Los detalles se presentan dentro del mismo campo espacial mediante `TailwindWorkspace`: las grillas funcionales usan dos columnas cuando hay ancho y pasan a una columna bajo `760px`. Formularios y lecturas no fuerzan una ruta nueva cuando el flujo requiere una capa flotante; en móvil, las hojas y lecturas se anclan al borde inferior por encima de la navegación. El espaciado reutiliza la escala `spacing` y las composiciones especiales mantienen su propio espacio negativo —órbitas, flor, cerezo, plasma y Daruma— sin convertirlos en tarjetas genéricas.

## Elevation & Depth

La profundidad es tonal y atmosférica: gradientes radiales, fondos semitransparentes, `backdrop-filter: blur()` y sombras difusas separan una lectura del campo Noche. Las sombras reutilizables son `--sombra` para diálogos y `--sombra-suave` para lecturas menores; las superficies no usan elevación dura por defecto. Aurora, Particles y Spotlight Card añaden luz espacial por encima del fondo, sin recibir puntero ni competir con el contenido.

**The Quiet Depth Rule.** La elevación debe sentirse como una capa de aire y luz. Usar borde de baja opacidad, transparencia y halo antes que una pila de tarjetas con sombra marcada.

## Shapes

El sistema combina círculos y elipses para señales, órbitas y objetos celestes con superficies de esquinas no uniformes. Las áreas de trabajo, formularios, lecturas y estados vacíos usan radios orgánicos de cuatro valores; las acciones principales, navegación y controles de salida se reducen a cápsulas (`rounded.pill`). Los bordes dorados de baja opacidad y los halos suaves sustituyen divisiones rectangulares pesadas.

La forma tiene significado: la luna, pétalos, flores, puntos de plasma, anillos de constelación y grietas son elementos interactivos y semánticos. Mantener sus áreas táctiles y su foco visible aunque la figura visual sea pequeña.

## Components

### Fondo y superficies Spotlight

**Campo reactivo, no decoración independiente.** Aurora y Particles ocupan todo el marco como capas fijas sin interacción. Spotlight Card muestra un gradiente radial al puntero o al foco dentro de la portada y los detalles. Light Rays se usa solo en Umbral. Estas capas se pausan durante la contemplación y quedan estáticas o se ocultan con movimiento reducido.

### Navigation

**Navegación continua en cápsula.** En escritorio los cinco ejes viven en una barra lateral translúcida; el eje activo suma una línea vertical y un halo con el matiz zodiacal. En móvil pasan a una barra inferior flotante, con icono circular y punto de estado. Todos los destinos tienen etiqueta textual y estado `aria-pressed`.

### Buttons

**Acciones suaves y explícitas.** La acción primaria usa `components.action-primary`: oro en transparencia, texto oro claro, altura táctil de al menos `48px` y forma de cápsula. La activación eleva apenas el control y amplía su halo; los controles secundarios conservan el campo oscuro, un borde bajo y la misma silueta redondeada.

### Inputs / Fields

**Campos como líneas de escritura dentro de una lectura.** Los formularios rituales se apoyan en superficie transparente y borde con el acento del eje. Los campos comunes tienen fondo Noche translúcido y esquinas orgánicas; las entradas de Umbral, Edad Dorada y el mural usan fondo transparente con una línea inferior que cambia a oro claro al enfocar. No reemplazar el foco por movimiento: el anillo visible de oro claro es obligatorio.

### Cards / Containers

**Lecturas de materia, no módulos administrativos.** `TailwindWorkspace`, formularios, vacíos, paneles de Balance y lecturas de Núcleo comparten un gradiente oscuro translúcido, halo local, borde tenue y radio asimétrico. Los registros persistentes se organizan como líneas con punto luminoso y divisor, no como una pila de tarjetas.

### Overlays and readings

**Capas que conservan el eje.** Diálogos y lecturas usan velo Noche con desenfoque, botón de cierre de `44px`, foco visible y salida con Escape. En móvil se convierten en hoja inferior o lectura anclada; la navegación permanece fuera de la capa cuando corresponde.

### Signature components

**Objetos que orientan cada eje.** Umbral organiza su acceso en torno a la luna y órbitas; Mundos usa una flor SVG de cinco pétalos; Mi Balance usa un bonsái de cerezo cuyas flores representan gastos; Núcleo agrupa pensamientos como puntos y plasma; Edad Dorada muestra un Daruma cuyas grietas de oro son declaraciones seleccionables. Son patrones implementados, no iconos intercambiables.

## Do's and Don'ts

### Do:

- **Do** mantener el fondo Noche y las capas de ambiente detrás de navegación, portada y detalle para que el cambio de eje siga sintiéndose continuo.
- **Do** usar oro claro para el foco visible y conservar controles táctiles de al menos `44px` donde el código los aplica.
- **Do** aplicar el acento del eje o el matiz zodiacal como halo, borde, Spotlight o mezcla de baja opacidad sobre la base Noche.
- **Do** ofrecer el mismo contenido y acciones con movimiento reducido: detener o simplificar Aurora, Particles, Light Rays, órbitas, plasma, resina y transiciones.
- **Do** conservar texto, etiquetas accesibles y estados de foco en los objetos visuales interactivos.

### Don't:

- **Don't** convertir los ejes, formularios o lecturas en paneles administrativos rectangulares y opacos.
- **Don't** usar el color zodiacal como color dominante ni reemplazar Noche, Oro o Marfil con él.
- **Don't** depender de animación, halo al puntero o color por sí solos para comunicar foco, selección o acceso.
- **Don't** introducir sombras duras, bordes de alto contraste o acumulaciones de tarjetas que rompan la profundidad silenciosa del campo.
