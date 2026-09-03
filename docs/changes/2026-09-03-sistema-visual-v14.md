# Cambios del 3 de septiembre de 2026 — sistema visual v1.4

Estado: implementados en la rama `v1.4`.

La usuaria pidió que la interfaz dejara de parecer una aplicación genérica y se leyera como obra de un equipo de frontend de primer nivel: botones, títulos, textos, animaciones y disposición de elementos. Este registro documenta qué se midió, qué se decidió y qué cambió, para que otro agente pueda continuar sin depender del historial de conversación.

## Diagnóstico medido

Se instrumentó la superficie Tailwind con Playwright sobre diez rutas (portada y detalle de cada eje) en dos anchos (390 y 1440). El estado previo mostraba:

| Señal | Antes | Después |
| --- | --- | --- |
| Tamaños de fuente distintos | 52 en total, hasta 20 por ruta | 4 a 9 por ruta, todos sobre la escala |
| Radios distintos | 24 valores ad hoc | 4 presets con nombre |
| Valores de espaciado | 43 | 7 escalones |
| Duraciones de movimiento | 20 valores en `ms` | 4 escalones |
| Textos bajo el contraste AA | varios por ruta | 0 en las veinte rutas |
| Controles bajo 44 px | varios por ruta | 0 reales |
| Desbordamiento horizontal | ninguno | ninguno |

Las mediciones residuales que aún reporta el detector son falsos positivos verificados uno a uno: los grupos SVG (`g.lab-world-petal`, `g.daruma-crack`) sí tienen indicador de foco mediante el trazo de sus hijos, y el número del día amplía su área de toque con un pseudo-elemento de 44 px que el rectángulo de contorno no refleja pero el navegador sí usa al impactar.

## Fundamento: `src/shared/styles/tokens.css`

El sistema pasó de valores por componente a escalas con nombre. Cualquier valor nuevo debe elegir un escalón existente antes de inventar uno.

- **Tipografía.** Nueve escalones (`--texto-1` a `--texto-9`) más `--texto-hero` y `--texto-display` para lo decorativo. Nada por debajo de `--texto-1`.
- **Espaciado.** Siete escalones (`--espacio-0` a `--espacio-6`).
- **Radios.** `--radio-pill` para cápsulas y tres presets orgánicos (`--radio-organico-1` a `--radio-organico-3`). Los radios en porcentaje siguen siendo geometría propia de pétalos y plasma, y no se tocan.
- **Movimiento.** Cuatro duraciones (`--dur-1` 120 ms, `--dur-2` 220 ms, `--dur-3` 420 ms, `--dur-4` 800 ms) sobre dos curvas (`--ease-out`, `--ease-in-out`). Los alias `--respuesta`, `--transicion` y `--capa` apuntan a esos escalones.
- **Toque.** `--toque: 44px` es el mínimo de cualquier control.

El mapeo se hizo con codemods reproducibles: 160 declaraciones de `font-size`, 56 radios y 20 duraciones quedaron sobre los tokens.

## Composición

- **Umbral en escritorio** ocupa el alto completo (`minmax(0,1fr)` central) y centra su composición en lugar de apilarla en el 60 % superior. La luna escala a 7 rem y las tarjetas del día se reparten en dos columnas iguales, sin el filete divisorio suelto que sobraba.
- **Flor de Mundos.** El `viewBox` creció y las etiquetas de pétalo se contrarrotan sobre su propio punto: quedan horizontales, en sans, con halo oscuro (`paint-order: stroke`) para leerse sobre cualquier pétalo. El foco engrosa el contorno del pétalo a 3,5 px en marfil.
- **Máxima de Umbral.** Reserva alto para dos líneas, así rotar la frase ya no desplaza la fecha ni los botones de claridad.
- **Claridad día/noche.** Los glifos Unicode `☉` y `☾` se reemplazaron por `AppIcon` (`sun`, `moon`), con área de 44 px y estado presionado legible.

## Familia de controles

- Un solo tratamiento de campo: filete inferior, foco que engrosa el trazo y deja un halo suave. Se eliminaron los marcos anidados de la hoja de captura, del ingreso base y de Núcleo.
- **Mi Balance** encabeza su detalle con la cifra del saldo, enmascarada por defecto (`$•••••`) y con conmutador de visibilidad. Esto concilia la decisión de la clienta de no exponer dinero de entrada con su pedido de ver el saldo como elemento principal. `Entra` y `Sale` quedan bajo la etiqueta explícita `Registrar un movimiento`.
- **Mi Constelación** apila la etiqueta sobre el campo, con una sola posición de etiqueta en todo el formulario y sin truncado.
- Los círculos de color de metas alcanzan 44 px sin crecer visualmente, mediante `background-clip: content-box`.

## Configuración de mi Áureo

Se reconstruyó como vista interna en `/configuracion`: mantiene el armazón y la navegación lateral/inferior de Áureo y reemplaza únicamente el área de contenido, como cualquier detalle de eje. La promesa de privacidad se presenta como texto con filete lateral en vez de caja dentro de caja, `Lo que cuido` es un interruptor real (`role="switch"`), y **Borrar este Áureo** dejó de ser un botón rojo a ancho completo: es un enlace de texto al final, con confirmación en dos toques.

## Movimiento

Con `prefers-reduced-motion: reduce` no sobrevive ninguna animación decorativa ni en bucle. Queda un reemplazo deliberado de 120 ms al entrar a un espacio interno, y un tope general (`.tailwind-lab *`, `.tw-workspace *`) que recorta cualquier transición al primer escalón.

## Verificación

- `pnpm typecheck` y `pnpm test` (22 pruebas) en verde.
- `pnpm exec playwright test`: 31 pasan, 13 fallan. Los trece fallos se reprodujeron idénticos en `HEAD` sin estos cambios, así que son previos y no regresiones. Están pendientes de resolver aparte.
- Medición Playwright de las veinte rutas: sin desbordamiento, sin fallos de contraste, sin controles reales bajo 44 px, sin errores de consola.

## Reglas que este trabajo deja instaladas

- No introducir un tamaño de fuente, un radio, un espaciado o una duración fuera de las escalas de `tokens.css`.
- Ningún control por debajo de `--toque`. Si crecer rompe la composición, ampliar el impacto con un pseudo-elemento, no reducir el mínimo.
- El foco debe verse: contorno, trazo o halo. Un cambio de color de 1 px no cuenta.
- Los iconos se dibujan con `AppIcon`; no volver a usar glifos Unicode como iconografía.
- El serif es para lo que se lee; los rótulos de sección van en sans, en versalitas.
