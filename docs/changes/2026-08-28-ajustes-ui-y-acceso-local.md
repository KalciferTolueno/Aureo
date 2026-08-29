# Cambios del 28 de agosto de 2026 — ajustes visuales y acceso local

Estado: implementados en el árbol de trabajo de la rama `v1.2`, todavía sin commit al momento de documentarlos.

Este registro traduce las correcciones solicitadas sobre la aplicación abierta en `http://127.0.0.1:4175/#/` a decisiones verificables para que otra IA pueda reconocer qué cambió, dónde y por qué. La fuente oficial sigue siendo `aureo-web`; las copias de Vercel son solo referencia.

## Resumen funcional

1. La portada de Mi Balance ya no muestra la balanza circular flotante sobre el cerezo.
2. Las portadas de Mundos, Mi Balance, Núcleo y Edad Dorada ya no repiten su título grande. El nombre sigue disponible en la navegación y en un `h1` visualmente oculto para conservar la estructura accesible.
3. El detalle de Mi Balance ya no repite el cerezo ni las flores. Los gastos continúan visibles en `Últimos movimientos`; el ingreso base, los movimientos y las metas siguen funcionando.
4. Mi Constelación ya no muestra el texto “Cada vínculo encuentra su distancia…”. La vista entra directamente al mapa orbital.
5. Las auras e iluminaciones de los espacios internos ya no se cortan en la parte superior ni en el borde derecho móvil. El contenedor interno permite que el aura sobresalga y el contenedor exterior de la aplicación sigue controlando el desbordamiento de la página.
6. El carril de la barra de desplazamiento usa el fondo Noche en la aplicación Tailwind para evitar la franja clara o transparente del borde derecho.
7. El acceso dejó de pedir correo. La aplicación crea una sesión local persistente por dispositivo y no intenta autenticar ni sincronizar con Supabase durante esta etapa.

## Cambios por archivo

### `src/modules/experimental/TailwindPreviewView.vue`

- Reemplaza los títulos visuales de `mundos`, `balance`, `nucleo` y `edad-dorada` por encabezados `tw:sr-only`.
- Mantiene visible el saludo editorial de Umbral.
- Elimina el elemento `.balance-home-scale`, sus estilos, sus órbitas decorativas y sus excepciones de movimiento reducido.
- Conserva el cerezo como entrada principal de Mi Balance y las flores generadas por gastos reales.

### `src/modules/experimental/tailwind/TailwindWorkspace.vue`

- Elimina el párrafo `.constellation-copy` y su CSS.
- Elimina del detalle de Balance el bloque duplicado de saldo/acciones y toda la sección `.balance-grove` con el segundo cerezo.
- Elimina el estado y los cálculos que solo servían al cerezo duplicado: saldo oculto, flores del detalle, selección de flor, pesos visuales de ramas y persistencia asociada a ese bloque.
- Mantiene `balance_ingreso_base`, formularios, historial de movimientos, metas Daruma, aportes y transferencia voluntaria a Edad Dorada.
- Quita `overflow-x: clip` de `.tw-workspace` en móvil.
- Cambia la entrada del workspace para no usar una máscara `clip-path` que recortaba el aura; conserva aparición por opacidad, desenfoque y desplazamiento.
- Mantiene `.tailwind-lab` como límite exterior del desbordamiento horizontal.

### `src/shared/styles/global.css`

- Añade `--document-scroll-track`.
- Cuando existe `.tailwind-lab`, aplica `#080b11` al fondo raíz y al carril del scrollbar.
- Conserva el carril transparente fuera de la superficie Tailwind.

### `src/stores/auth.ts`

- Sustituye el OTP de Supabase por `LocalSession` con `id`, `created_at` y `mode: 'local'`.
- Usa `StorageDriver` con la clave lógica `local_session`, guardada físicamente como `aureo_local_session`.
- Reutiliza una sesión local válida; si no existe, crea una mediante `crypto.randomUUID()`.
- `signOut()` elimina solo la sesión local. No borra datos de los ejes.
- Los clientes y servicios Supabase permanecen en el repositorio para una etapa multiusuario futura.

### `src/App.vue`

- Continúa cargando perfil, preferencias de UI y sesión local al montar.
- Ya no inicia sincronización remota, no intenta mezclar el perfil remoto y no registra un listener de reconexión para Supabase.

### `tests/e2e/routes.spec.ts`

- Comprueba que no existe un campo de correo.
- Comprueba que `aureo_local_session` se crea con `mode: 'local'` y sobrevive una recarga.
- Comprueba que el carril del scrollbar Tailwind es `#080b11`.
- Comprueba que el título Mundos permanece semánticamente como encabezado oculto de 1 × 1 px.
- Comprueba que el workspace no recorta horizontalmente el aura.
- Comprueba que el detalle de Balance no contiene `.balance-grove` y que el gasto sigue en `Últimos movimientos`.

### Documentación de producto

- `PRODUCT.md`: declara el acceso local sin correo ni llamadas de sincronización como comportamiento vigente.
- `docs/product/DECISIONES_CLIENTA.md`: registra como vinculantes las eliminaciones visuales, la continuidad del aura y la pausa temporal del acceso multiusuario.
- `docs/AI_HANDOFF.md`: describe el estado técnico vigente y enlaza este registro.
- `docs/CONTINUIDAD_IMPLEMENTACION.md`: queda como memoria extensa; ante contradicción prevalecen `DECISIONES_CLIENTA.md`, `AI_HANDOFF.md` y este registro reciente.

## Persistencia y privacidad

- No se borró ninguna colección ni se renombró ninguna clave `aureo_*` existente.
- No se ejecutaron migraciones de datos ni de Supabase.
- `aureo_local_session` no contiene correo.
- Núcleo sigue siendo exclusivamente local y continúa excluido del catálogo remoto, de analítica, backups remotos e IA.
- Cerrar la sesión local no equivale a eliminar el contenido personal guardado.

## Validación efectuada

- `pnpm build`: correcto.
- `pnpm test`: 3 archivos y 7 pruebas correctas.
- E2E focalizado `abre la superficie Tailwind sin errores visibles`: correcto en escritorio y móvil (2/2); cubre ausencia de correo, creación de `aureo_local_session`, persistencia tras recarga y carril Noche del scrollbar.
- E2E focalizado de la portada Mundos: correcto en escritorio y móvil (2/2); confirma que el `h1` existe para accesibilidad pero queda visualmente oculto.
- E2E focalizados de aura móvil y detalle de Balance: correctos en escritorio y móvil (4/4); confirman `overflow-x: visible`, ausencia de `clip-path`, aura extendida sobre el encabezado, ausencia del cerezo duplicado y continuidad de los movimientos.
- E2E focalizados del carril raíz del scrollbar: correctos en escritorio y móvil (2/2).
- Revisión visual en navegador a ancho móvil: Umbral visible sin campo de correo antes y después de recargar; auras sin corte lateral y títulos eliminados según lo solicitado.
- Detector de diseño aplicado a los componentes modificados: sin hallazgos.

No declarar que la suite E2E completa fue ejecutada después de estos cambios. Un recorrido E2E integral anterior se interrumpió por una espera inestable en una interacción posterior no relacionada; antes de una entrega externa debe repetirse `pnpm test:e2e` completo.

## Estado Git al documentar

- Rama: `v1.2`.
- Commit base observado: `db35fed` (`Show Mi Balance summary on home and refine Edad Dorada/Balance detail`).
- Los cambios de esta iteración están en el árbol de trabajo y no deben descartarse ni sobrescribirse.
- `dev-server.log` y `preview.log` son archivos locales de ejecución, no cambios funcionales del producto.

## Cómo reconocer el resultado en la interfaz

- URL canónica local: `http://127.0.0.1:4175/#/`.
- Ejes mediante query string: `#/?axis=mundos`, `#/?axis=balance`, `#/?axis=nucleo` y `#/?axis=edad-dorada`.
- Detalles mediante `detail`, por ejemplo `#/?axis=balance&detail=balance` o `#/?axis=mundos&detail=world-vinculos`.
- En Balance debe existir un solo cerezo, en la portada.
- En las cuatro portadas ajustadas no debe verse el nombre grande del eje.
- Al recargar no debe aparecer un formulario de correo y debe mantenerse la misma sesión local.

## Contratos que no deben sufrir regresiones

- No volver a mostrar los cuatro títulos de portada como encabezados visuales; conservar el `h1` oculto para lectores de pantalla.
- No volver a insertar la balanza circular sobre el cerezo ni un segundo cerezo en el detalle de Balance.
- No restaurar `.constellation-copy` antes del mapa orbital.
- No aplicar `overflow-x: clip` ni una animación con `clip-path` a `.tw-workspace`; el recorte exterior corresponde a `.tailwind-lab`.
- No hacer transparente el carril del scrollbar mientras la superficie Tailwind esté montada.
- No reactivar OTP, correo, listeners de reconexión ni sincronización remota sin una nueva decisión explícita.
- No borrar `aureo_local_session` junto con los datos personales ni alterar otras claves `aureo_*` al cerrar la sesión local.
- Núcleo continúa fuera de Supabase, analítica, respaldos remotos e IA en cualquier modo futuro.
