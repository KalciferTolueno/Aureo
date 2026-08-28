# Impeccable Audit — Áureo

Fecha: 2026-08-18

## Audit Health Score

| # | Dimensión | Puntaje | Hallazgo principal |
|---|---|---:|---|
| 1 | Accesibilidad | 2/4 | Los diálogos no gestionan foco, Escape ni aislamiento del fondo. |
| 2 | Rendimiento | 4/4 | Bundle pequeño, recursos locales y animaciones limitadas a transformaciones. |
| 3 | Responsive | 3/4 | Sin desbordamiento, pero varios controles táctiles miden menos de 44 px. |
| 4 | Temas | 3/4 | Tema claro/oscuro funcional; faltan algunos tokens y reacción al cambio del sistema. |
| 5 | Integridad de implementación | 4/4 | Sistema específico de Áureo; detector de Impeccable sin hallazgos. |
| **Total** |  | **16/20** | **Bueno — corregir accesibilidad antes de publicar.** |

## Veredicto de integridad

**Aprobado.** La implementación expresa una identidad propia mediante la paleta cósmica dorada, la tipografía editorial, los símbolos orbitales y una voz contemplativa consistente. El detector determinista de Impeccable devolvió cero hallazgos. La estructura no es intercambiable con un panel SaaS genérico.

## Resumen ejecutivo

- P0: 0
- P1: 2
- P2: 4
- P3: 1
- No se observaron errores de consola ni desbordamientos en 390 px y 1440 px.
- El build de producción y la PWA permanecen compactos.

## Hallazgos

### [P1] El diálogo no controla el foco ni el teclado

- **Ubicación:** `src/shared/components/AppDialog.vue`
- **Categoría:** Accesibilidad
- **Impacto:** al abrirse, el foco permanece en el botón situado detrás; Escape no cierra y el teclado puede recorrer contenido fuera del diálogo.
- **Estándar:** WCAG 2.4.3, 2.4.7 y patrón WAI-ARIA Dialog Modal.
- **Recomendación:** mover el foco al diálogo, atraparlo mientras esté abierto, cerrar con Escape, restaurarlo al cerrar y marcar el fondo como inerte.
- **Comando sugerido:** `$impeccable polish`

### [P1] Controles táctiles críticos demasiado pequeños

- **Ubicación:** `src/shared/styles/global.css`, `.remove-quiet` y `.week-dots button`
- **Categoría:** Accesibilidad / Responsive
- **Impacto:** eliminar una práctica mide aproximadamente 20×22 px y los días 38×38 px en móvil, provocando errores de toque.
- **Estándar:** WCAG 2.5.8; objetivo interno de 44×44 px.
- **Recomendación:** ampliar el área interactiva sin aumentar innecesariamente el peso visual.
- **Comando sugerido:** `$impeccable adapt`

### [P2] Estados seleccionados no se anuncian

- **Ubicación:** `BottomNav.vue`, `OnboardingView.vue`, `SettingsView.vue`
- **Categoría:** Accesibilidad
- **Impacto:** lectores de pantalla no conocen la ruta actual ni qué opción visual está seleccionada.
- **Recomendación:** añadir `aria-current`, `aria-pressed` y estados descriptivos.
- **Comando sugerido:** `$impeccable polish`

### [P2] El modo automático no reacciona a cambios del sistema

- **Ubicación:** `src/stores/ui.ts`
- **Categoría:** Temas
- **Impacto:** si el sistema cambia entre claro y oscuro con Áureo abierto, la interfaz permanece en el tema anterior.
- **Recomendación:** escuchar `matchMedia('(prefers-color-scheme: light)')` mientras la preferencia sea automática.
- **Comando sugerido:** `$impeccable harden`

### [P2] Foco visual incompleto

- **Ubicación:** `src/shared/styles/global.css`
- **Categoría:** Accesibilidad
- **Impacto:** `select` y algunos controles personalizados dependen del foco predeterminado del navegador.
- **Recomendación:** extender el anillo de foco y usar `:focus-visible` de forma consistente.
- **Comando sugerido:** `$impeccable polish`

### [P2] Movimiento reducido elimina toda retroalimentación

- **Ubicación:** `src/shared/styles/global.css`
- **Categoría:** Accesibilidad
- **Impacto:** la regla global de 1 ms desactiva incluso transiciones que comunican cambio de estado.
- **Recomendación:** detener la respiración decorativa y mantener cambios de estado instantáneos y legibles.
- **Comando sugerido:** `$impeccable animate`

### [P3] Algunos colores funcionales están codificados fuera de tokens

- **Ubicación:** `src/shared/styles/global.css`
- **Categoría:** Temas
- **Impacto:** dificulta ajustar contraste y coherencia entre temas.
- **Recomendación:** centralizar peligro, fondos superpuestos y foco en tokens semánticos.
- **Comando sugerido:** `$impeccable colorize`

## Aspectos positivos

- HTML con landmarks, encabezados y etiquetas de formulario en las rutas inspeccionadas.
- Áreas seguras de iPhone, tipografías locales y PWA con actualización controlada.
- No hay scroll horizontal en móvil ni escritorio.
- Las animaciones principales usan `transform` y respetan la preferencia de movimiento reducido.
- La jerarquía visual y la voz son consistentes con la identidad confirmada.
- El sistema de tokens ya cubre la mayoría de colores, espacios, radios y tiempos.

## Acciones acordadas

1. **[P1] `$impeccable polish`:** corregir diálogos, foco, estados accesibles y coherencia visual.
2. **[P1] `$impeccable adapt`:** ampliar objetivos táctiles y revisar navegación móvil.
3. **[P2] `$impeccable harden`:** reaccionar al tema del sistema y robustecer formularios.
4. **[Final] `$impeccable polish`:** verificación visual en móvil y escritorio.

## Resultado del pase Polish

Completado el 2026-08-18.

- Resueltos los dos hallazgos P1: gestión completa de foco/teclado en diálogos y objetivos táctiles mínimos de 44×44 px.
- Resueltos los estados accesibles de navegación, selección de tema, onboarding y prácticas.
- El tema automático ahora reacciona a cambios del sistema.
- Movimiento reducido conserva estados comprensibles sin animación decorativa.
- Los controles principales usan un sistema SVG compartido y los colores funcionales se centralizaron en tokens.
- Verificación posterior: 4 pruebas unitarias y 6 recorridos E2E aprobados en escritorio y móvil; build PWA correcto.
- Salud posterior estimada: **19/20 — Excelente, listo para validación funcional con la clienta.**
