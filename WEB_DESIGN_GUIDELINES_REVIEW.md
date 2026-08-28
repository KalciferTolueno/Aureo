# Revisión Web Design Guidelines

Revisión aplicada el 19 de agosto de 2026 con la skill local `.agents/skills/web-design-guidelines/SKILL.md` y la versión vigente de las Web Interface Guidelines de Vercel.

## Corregido

- `src/App.vue:18` agrega un enlace de salto al contenido y un destino de foco estable.
- `src/shared/components/BottomNav.vue:18` usa enlaces reales, ruta activa y `aria-current` para la navegación principal.
- `src/shared/components/ModuleHeader.vue:10` usa un enlace real cuando el destino de regreso es conocido.
- `src/shared/components/CollectionView.vue:17` evita envíos duplicados y comunica el estado de guardado.
- `src/modules/onboarding/OnboardingView.vue:18` da contexto a cada acción, elimina el foco automático móvil y evita el doble guardado.
- `src/modules/onboarding/OnboardingView.vue:42` y `src/shared/components/CollectionView.vue:50` completan nombres y autocompletado de formularios.
- `src/modules/umbral/UmbralView.vue:33` convierte Ajustes en navegación semántica.
- `src/stores/ui.ts:10` sincroniza el color del navegador con el tema claro u oscuro.
- `src/shared/components/ReloadPrompt.vue:2` anuncia de forma accesible la actualización disponible.
- `src/shared/styles/global.css:21` mejora la respuesta táctil, el foco compuesto, el desbordamiento de texto y los estados hover solo donde existen.
- `src/shared/styles/global.css:76` contiene el desplazamiento de los diálogos.
- `index.html:10` precarga la tipografía local crítica.

## Decisiones deliberadas

- Se conserva la redacción española en estilo oración, aunque la guía original ejemplifica interfaces en inglés.
- No se agrega virtualización: las listas actuales son locales, pequeñas y editables; se evaluará cuando datos reales demuestren que es necesaria.
- No se agregan cuentas, sincronización o funciones nuevas mientras se esperan las definiciones de la clienta.

## Validación

- TypeScript estricto y compilación de producción: correctos.
- Vitest: 4 pruebas aprobadas.
- Playwright: 6 recorridos aprobados en escritorio y móvil.
