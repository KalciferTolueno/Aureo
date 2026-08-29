# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Áureo está pensado para múltiples usuarios. Su usuaria principal es una mujer adulta, aproximadamente entre 28 y 38 años, en una transición personal o laboral y con interés en autoconocimiento, bienestar y organización personal. Busca un espacio íntimo para acompañar su vida cotidiana sin exigencias ni exposición; la edad orienta el diseño, pero no limita el acceso.

## Product Purpose

Áureo permite registrar intenciones, prácticas, vínculos, experiencias y aprendizajes personales dentro de distintos ejes de vida. Su propósito es ayudar a cada persona a observar su recorrido y cultivar su propia “Edad Dorada”. El éxito se mide por una experiencia clara, segura y útil que invite a volver de forma cotidiana.

## Positioning

Áureo organiza el crecimiento personal como un universo propio: Umbral, Mundos, Mi Balance, Núcleo y Edad Dorada. Combina registros cotidianos y reflexión personal dentro de una experiencia contemplativa, no clínica y no competitiva.

## Operating Context

La experiencia se usa principalmente como web o PWA personal, en sesiones breves desde móvil y también desde tablet o escritorio. Cada persona completa un onboarding, registra información en sus espacios y puede exportar o restaurar una copia de sus datos.

## Capabilities and Constraints

- La versión web/PWA es prioritaria; Android e iOS se empaquetarán con Capacitor después de estabilizarla.
- `aureo-web`, implementada con Vue 3 y TypeScript, es la única base fuente oficial. El prototipo vanilla recuperado es evidencia histórica y referencia de compatibilidad; no recibe funciones nuevas.
- La experiencia Tailwind de `aureo-web` es la superficie principal de trabajo desde el 27 de agosto de 2026. La presentación anterior se conserva como referencia y no recibe cambios paralelos salvo solicitud expresa.
- Las rutas y claves `aureo_*` recuperadas deben permanecer compatibles.
- El almacenamiento está abstraído para permitir una futura migración a IndexedDB o sincronización en línea.
- La aplicación debe preservar datos existentes mediante migraciones versionadas.
- En la etapa vigente el acceso es local y persistente por dispositivo, sin correo ni llamadas de sincronización. La arquitectura de Supabase se conserva para una futura activación multiusuario; Núcleo permanecerá siempre exclusivamente en el dispositivo.
- La inteligencia artificial queda fuera de la Fase 1. La arquitectura de datos puede admitir funciones futuras de reflejo de patrones, pero no se implementa un chatbot ni componentes de IA en esta validación.
- Los cinco ejes están disponibles sin distinción Free/Premium durante esta etapa.
- Ninguna pantalla se conecta directamente a Supabase: autenticación y persistencia remota se incorporan detrás de la interfaz de repositorios.

## Brand Commitments

- Nombre: Áureo.
- Voz íntima, serena, alentadora y contemplativa; evita lenguaje clínico, competitivo o imperativo.
- Conservar la identidad actual oscura, dorada y espiritual, con símbolos orbitales y una presencia editorial.
- Mejorar claridad, accesibilidad y adaptación móvil sin reemplazar la identidad ni realizar un rediseño total.
- El símbolo principal y los iconos recuperados son activos vinculantes del producto.

## Evidence on Hand

- Aplicación recuperada en `../aureo-comercial-vercel/` y copia estática histórica publicada en `../pagina de vercel/`.
- Símbolo original en `../aureo_simbolo_M6_fiel.png`.
- Documentación funcional y memorias de UX en la carpeta raíz `../`.
- No existen todavía testimonios, métricas de uso, precios ni afirmaciones comerciales verificadas; el producto no debe fabricarlos.

## Product Principles

1. Cada experiencia debe sentirse privada aunque el producto sirva a múltiples usuarios.
2. La serenidad nunca debe sacrificar claridad, legibilidad o control.
3. Los datos personales pertenecen a la persona y deben poder conservarse o migrarse.
4. La evolución funcional se basa en decisiones confirmadas con la clienta, no en supuestos.
5. Una misma base mantenible debe servir a web, PWA y futuras aplicaciones móviles.

## Accessibility & Inclusion

La aplicación debe funcionar con teclado, áreas táctiles cómodas, contraste suficiente, movimiento reducido y adaptación a móvil, tablet y escritorio. La experiencia no debe asumir conocimientos técnicos ni familiaridad previa con los conceptos internos de Áureo.
