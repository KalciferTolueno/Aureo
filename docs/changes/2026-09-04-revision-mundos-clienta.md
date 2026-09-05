# Cambios del 4 de septiembre de 2026 — revisión de entrega de Mundos

Estado: implementados en el árbol de trabajo de `aureo-web`.

La clienta revisó producción (`aureo.tigrr.cl`) con cinco documentos de entrega. Pedía dos rediseños de metáfora (Hobbies y Travesías) y ajustes cerrados en Decretos, Lo que cuido y Vínculos. Los estilos artísticos del mural (sumi-e / Ghibli / exportar) quedan fuera: ella misma los dejó pendientes.

## Qué cambió

### Hobbies

- Cada hobby es una espiral áurea de momentos (`HobbySpirals.vue`), no un jardín Activo/Pausa ni un racimo Vogel: se ve el brazo y los destellos recorren la curva.
- En escritorio, Hobbies y Travesías usan el mismo campo + formulario en dos columnas que Mi Constelación.
- Crear sigue siendo ¿Qué es? + ¿Cómo te hace sentir? + Agregar.
- Dentro: “Dejar un momento aquí” / “¿Qué pasó con esto, hoy?” / “Quedó guardado en tu espiral.”
- Migración de esquema v4: `momentos: []` en hobbies existentes. El campo histórico `estado` no se borra.

### Travesías

- El mapa Leaflet se retira. El pétalo es un baúl de postales (`JourneyTrunk.vue`).
- La búsqueda Nominatim se conserva; el resultado nace como postal. `lat`/`lng` siguen en datos y no se muestran.
- Estados de interfaz: Vivido / Por vivir. Borrado interno: “¿Quieres que esta postal se vaya?”

### Decretos

- Placeholders y ejemplos por dimensión; badges de color; “Lo que decretas, ya es.”
- El sello + abre la escritura; la lista ocupa el campo.
- Intensidad por opacidad, nunca por número.
- Primera visita: “Lo visualizo. Lo siento. Lo decreto.” (`decretos_bienvenida`, local).
- Ritual a pantalla completa y “Esto ya es mío” con texto en oro y fecha.

### Lo que cuido

- Foto opcional. Especie (compañero) e Interior/Exterior (planta).
- Notas de cuidado colapsadas. Memoriales en `locuidado_memoria`.
- Marco: destellos en esquinas e iniciales del perfil.

### Vínculos

- Pétalo: **Vínculos**. Encabezado interno: **Mi Constelación**.
- Tooltip de dos toques. Leyenda de anillos en fila horizontal.

## Qué no entra

Sumi-e, Ghibli y exportar el mural. Implican generación de imagen o un flujo de compartir que todavía no está cerrado.
