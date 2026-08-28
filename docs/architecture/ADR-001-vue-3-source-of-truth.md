# ADR-001: Vue 3 es la base fuente oficial de Áureo

- Estado: Aceptada
- Fecha: 2026-08-19
- Alcance: web, PWA y futuras aplicaciones empaquetadas con Capacitor

## Contexto

Áureo fue recuperado desde una versión desplegada cuyo prototipo original estaba construido con JavaScript sin framework. Ese material permitió recuperar rutas, comportamiento, recursos visuales y claves `aureo_*`, pero no constituye una base fuente completa ni mantenible para continuar el producto.

Una nota funcional posterior indicaba conservar permanentemente el prototipo vanilla JS. Esta indicación queda expresamente reemplazada por la decisión técnica del responsable actual del proyecto: la aplicación mantenida y distribuida se desarrolla con Vue 3.

## Decisión

La única base fuente vigente de Áureo es `aureo-web`, construida con:

- Vue 3 y Composition API.
- TypeScript estricto.
- Vite.
- Pinia.
- Vue Router.
- Vitest y Playwright.
- PWA mediante Workbox y `vite-plugin-pwa`.

El directorio `../aureo-comercial-vercel/` se conserva solamente como evidencia del producto recuperado y referencia de compatibilidad. No se desarrollan funciones nuevas allí y no se copian cambios de regreso al prototipo.

## Por qué Vue es la opción adecuada para este proyecto

1. Áureo ya requiere una interfaz de aplicación con navegación persistente, estado entre vistas, componentes reutilizables y adaptación móvil/escritorio. Vue expresa estas necesidades de forma declarativa y consistente.
2. TypeScript estricto reduce errores al evolucionar modelos sensibles como intenciones, registros personales, Mi Balance, Núcleo y Edad Dorada.
3. Pinia centraliza sesión, perfil y estado compartido sin variables globales ni acoplamiento entre pantallas.
4. Vue Router conserva rutas recuperadas y permite transiciones, carga diferida, redirecciones de compatibilidad y protección de accesos.
5. La interfaz de repositorios existente permite incorporar Supabase como autenticación y persistencia remota sin conectar cada componente directamente al proveedor.
6. La misma aplicación puede publicarse como web/PWA y posteriormente empaquetarse con Capacitor para Android e iOS.
7. Vitest y Playwright permiten comprobar migraciones, almacenamiento, accesibilidad y recorridos completos antes de publicar.

La decisión no afirma que Vue sea universalmente superior a JavaScript nativo. Es la opción de menor riesgo y mayor mantenibilidad para el alcance concreto de Áureo.

## Compatibilidad que debe preservarse

- Mantener el prefijo `aureo_` en almacenamiento local y nomenclatura remota.
- Leer y migrar datos creados por versiones anteriores sin eliminarlos.
- Conservar rutas antiguas mediante redirecciones cuando cambie la nomenclatura visible.
- Preservar identidad, símbolos, contenido aprobado y comportamientos recuperados hasta que una especificación más reciente los reemplace.
- Mantener Núcleo exclusivamente en el dispositivo, separado de la sincronización remota.

## Consecuencias

- Toda implementación nueva se realiza en `aureo-web` con Vue y TypeScript.
- La experiencia Tailwind (`aureo-web/src/modules/experimental/`) es la única superficie de producto; la presentación no Tailwind fue eliminada en la v1.2.
- Supabase se añadirá detrás de la capa de repositorios actual.
- El prototipo vanilla no recibe mantenimiento productivo.
- Una eventual sustitución de Vue requerirá un nuevo ADR, una justificación técnica y un plan explícito de migración y compatibilidad de datos.
