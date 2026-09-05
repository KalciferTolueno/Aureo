# Aura: campo continuo, nunca un recuadro

**Regresión recurrente.** Cualquier IA que toque `TailwindWorkspace.vue`, encabezados, animaciones de entrada, `overflow`, `filter`, `clip-path` o `.workspace-aura` debe leer esto antes de editar.

La clienta lo ha señalado más de una vez: al entrar a un espacio (Lo que cuido, Mi Constelación, etc.) aparece un **borde vertical** junto al scrollbar. El velo de la animación no cubre todo el fondo. Eso no es un detalle: el campo Noche es continuo.

## Síntoma

Una costura a la derecha del título (a veces solo “ón” de Constelación). El aura o el blur de entrada dibujan el rectángulo de la columna de contenido y dejan una franja más oscura hasta el pulgar del scroll.

Suele reaparecer después de un cambio “inofensivo” de CSS (media query móvil, `filter` en la entrada, `overflow` para “evitar scroll horizontal”).

## Qué está prohibido

En `.tw-workspace` y `.workspace-aura`:

- `filter: blur(...)` (también `blur(0)` con `animation-fill-mode: both`) en el workspace o en `workspace-unveil`. El filtro recorta el aura al caja del contenido y pinta un marco.
- Pinzar el aura a la columna: `width: 100%`, `inset: … 0`, `right: 0` / `left: 0` sin bleed, sobre todo en `@media (max-width: 420px)`.
- `overflow: hidden` / `clip` en `.tw-workspace`. El overflow visible es parte del contrato; el recorte exterior es `.tailwind-lab`.
- `clip-path` en `.tw-workspace`.

El aura **puede** animarse (`aura-drift`), pero el bloque tiene que ser más ancho que el viewport para que el translate no descubra el borde.

## Qué debe mantenerse

- `.tw-workspace { overflow: visible }` y sin `filter` en la entrada. `workspace-unveil` solo usa opacidad y `translateY`.
- `.workspace-aura` sangra a pantalla completa, no al ancho del título:

  `left: calc(50% - 50vw - 4rem); right: calc(50% - 50vw - 4rem);`

  Los `4rem` extra absorben el drift. `.tailwind-lab { overflow-x: clip }` es el límite horizontal. No recortar `.tw-workspace`.
- En viewports estrechos (~390 px) el aura sigue cubriendo hasta `innerWidth`, incluido el carril del `OverlayScrollbar`. No reintroducir la regla de 420 px que la dejaba a `width: 100%`.
- No duplicar el padding inferior de la barra móvil. `.tw-workspace` ya reserva `4.75rem` en <1024 px. El `padding-bottom: 6.7rem` de la columna solo aplica en portadas y configuración (`clears-mobile-nav`). Si se pone en los dos, Constelación inventa una barra de scroll sobre fondo vacío.

Blur de **palabras** (`BlurText.vue`) no es este problema: va en los spans del título, no en el workspace. Ahí el blur debe apagarse **antes** de que la palabra aterrice; no mover ese filtro al contenedor. El `h1` reserva la línea final desde el primer frame (`display: block`, sin `filter` en reposo): si el título es flex o las palabras esperan con blur, “Lo” queda flotando hasta que aterriza la última palabra.

## Cómo comprobarlo

1. Abrir `#/?axis=mundos&detail=world-vinculos` y `world-cuidado` a ~390 px.
2. El fondo detrás del encabezado no puede tener una línea vertical antes del scrollbar.
3. En Constelación, si el mapa y la leyenda ya caben, no debe aparecer el pulgar de scroll (el padding de la barra móvil no se duplica).
4. Pruebas: `aura cubre el fondo` y `no inventa barra de scroll` en `tests/e2e/routes.spec.ts`.
