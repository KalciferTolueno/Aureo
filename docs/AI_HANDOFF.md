---
document: aureo-ai-handoff
status: canonical
audience: coding-agents-and-maintainers
last_verified: 2026-08-28
workspace_root: D:\Work - TIgrr\Aureo
canonical_codebase: aureo-web
active_product_surface: tailwind
active_surface_route: /
supabase_project: msfitymrxblzgiqyjfse
---

# Áureo — contexto canónico para agentes de IA

Este documento permite que un agente nuevo retome Áureo sin depender del historial de conversación. Describe qué versión se modifica, qué material es solo referencia, cómo funciona la aplicación, qué cambios están implementados y qué reglas no deben romperse.

## Lectura obligatoria y autoridad

Antes de modificar el producto, leer en este orden:

1. `docs/AI_HANDOFF.md` — estado técnico y operativo vigente.
2. `docs/product/DECISIONES_CLIENTA.md` — decisiones funcionales vinculantes.
3. `PRODUCT.md` — propósito, público, voz y compromisos de marca.
4. La especificación completa del eje afectado, ubicada en la raíz del workspace.
5. `docs/architecture/ADR-001-vue-3-source-of-truth.md` si el cambio afecta arquitectura o versiones.

Orden para resolver contradicciones:

1. La instrucción más reciente y explícita de la usuaria.
2. `docs/product/DECISIONES_CLIENTA.md`.
3. Este documento.
4. `PRODUCT.md` y los ADR aceptados.
5. Especificaciones y memorias históricas.
6. La versión publicada en Vercel y sus copias locales.

Si dos fuentes del mismo nivel se contradicen, no adivinar. Presentar la contradicción y pedir una decisión cuando cambie materialmente el producto.

## Mapa de versiones y terminología

Desde la v1.2 Áureo tiene una sola superficie de producto dentro de `aureo-web`: la experiencia Tailwind, servida en la ruta raíz. La presentación primaria no Tailwind fue eliminada.

| Nombre recomendado | Ubicación | URL habitual | Estado | Regla de edición |
| --- | --- | --- | --- | --- |
| Base fuente primaria o canónica | `aureo-web/` | No aplica | Única fuente oficial | Todo código productivo vive aquí |
| Experiencia Tailwind | `aureo-web/src/modules/experimental/` | `http://127.0.0.1:4175/#/` | Superficie activa y única de trabajo | Aplicar aquí los cambios de interfaz y UX |
| Vercel histórico en la web | <https://aureo-comercial.vercel.app/#/> | URL pública | Versión antigua | Solo comparar; nunca asumir que es la fuente vigente |
| Archivo estático de Vercel | `pagina de vercel/` | `http://127.0.0.1:4180/#/` | Copia descargada el 27-08-2026 | Solo lectura |
| Recuperación anterior de Vercel | `aureo-comercial-vercel/` | `http://127.0.0.1:4173/#/` | Build público recuperado | Evidencia histórica y compatibilidad |

### Cómo interpretar “versión primaria”

La expresión se refería antes a dos cosas: la base `aureo-web` y la presentación no Tailwind. Desde la v1.2 la presentación no Tailwind fue eliminada por completo; la única presentación vigente es la experiencia Tailwind.

Cuando la usuaria pida “la app” o un cambio nuevo, trabajar en la experiencia Tailwind. Las carpetas `pagina de vercel/` y `aureo-comercial-vercel/` son evidencia histórica de solo lectura y no se modifican.

## Estructura del workspace

```text
D:\Work - TIgrr\Aureo\
├── AGENTS.md                       Entrada corta para agentes
├── aureo-web\                     Base fuente canónica Vue 3
│   ├── docs\AI_HANDOFF.md         Este documento
│   ├── docs\CONTINUIDAD_IMPLEMENTACION.md
│   ├── docs\product\DECISIONES_CLIENTA.md
│   ├── src\modules\experimental\ Superficie Tailwind única y activa
│   ├── src\data\                  Persistencia, migraciones y sync
│   ├── supabase\migrations\       Fuente local del esquema remoto
│   └── tests\                     Vitest y Playwright
├── pagina de vercel\              Archivo estático histórico
├── aureo-comercial-vercel\        Recuperación histórica anterior
├── aureo_simbolo_M6_fiel.png       Símbolo vinculante
└── *.md / *.docx                   Especificaciones y memorias de producto
```

`aureo-web` es un repositorio Git. En la documentación del 28-08-2026 la rama activa era `v1.2` y los ajustes más recientes estaban todavía sin commit sobre `db35fed`. Preservar siempre los cambios existentes de la usuaria y revisar `git status` antes de editar.

## Arranque local y separación de orígenes

Requisitos: Node.js 22 y pnpm.

Desde `aureo-web`:

```bash
pnpm install
pnpm dev:tailwind
```

| Servicio | Comando | URL |
| --- | --- | --- |
| Experiencia Tailwind única | `pnpm dev:tailwind` | `http://127.0.0.1:4175/#/` |
| Archivo Vercel local | `python -m http.server 4180 --directory "pagina de vercel"` desde la raíz | `http://127.0.0.1:4180/#/` |

El puerto canónico de trabajo es `4175`. Otros servidores o copias históricas pueden tener un origen y `localStorage` independientes; no usarlos como fuente vigente.

La ruta Tailwind admite navegación interna mediante query string:

```text
#/?axis=umbral
#/?axis=mundos
#/?axis=balance
#/?axis=nucleo
#/?axis=edad-dorada
```

Los detalles funcionales usan `detail`, por ejemplo `detail=world-vinculos` o `detail=edad-dorada`. En Mi Balance, `Registrar movimiento` y `Nueva meta` ya no deben añadir `detail` ni `action`: abren paneles flotantes sobre `axis=balance`.

## Arquitectura vigente

- Vue 3 con Composition API.
- TypeScript estricto.
- Vite 8.
- Vue Router con hash history.
- Pinia para perfil, sesión local y estado compartido.
- Tailwind CSS 4 mediante `@tailwindcss/vite`; utilidades con prefijo `tw:` y sin Preflight global.
- Persistencia local detrás de `StorageDriver` y repositorios.
- Supabase detrás de servicios y repositorios; las vistas no llaman directamente al proveedor.
- Vitest para dominio/datos y Playwright para recorridos E2E.
- PWA mediante `vite-plugin-pwa` y Workbox.

Archivos de entrada:

- `src/main.ts`: inicialización.
- `src/App.vue`: shell general.
- `src/router/index.ts`: rutas, redirecciones y reglas de onboarding.
- `src/modules/experimental/TailwindPreviewView.vue`: portada, navegación y acciones rápidas Tailwind.
- `src/modules/experimental/tailwind/TailwindWorkspace.vue`: detalles funcionales Tailwind.
- `src/shared/styles/tailwind.css`: tokens/utilidades Tailwind aisladas.
- `src/shared/styles/tokens.css` y `global.css`: identidad compartida/original.

## Rutas y compatibilidad

| Ruta | Propósito |
| --- | --- |
| `/` | Experiencia Tailwind activa y única |
| `/laboratorio-tailwind` | Redirección compatible a `/` |
| Cualquier otra ruta | Redirección a `/` |

No eliminar redirecciones históricas sin una migración y una decisión explícita.

## Registro de la iteración más reciente

El inventario exacto de solicitudes, archivos modificados, contratos preservados y validaciones del 28-08-2026 está en `docs/changes/2026-08-28-ajustes-ui-y-acceso-local.md`. Leerlo antes de tocar títulos de portada, Mi Balance, auras, scrollbar o acceso local.

## Identidad visual y experiencia común

- Voz íntima, serena, contemplativa y no clínica.
- Paleta base: Noche, Marfil, Oro y Cosmos.
- El color zodiacal es una capa secundaria; no reemplaza el oro, el marfil ni la noche.
- Fondo estelar continuo, símbolos orbitales y jerarquía editorial.
- Navegación lateral en escritorio e inferior en móvil.
- No usar gamificación, presión, rankings, rachas punitivas ni lenguaje de productividad convencional.
- Respetar teclado, foco visible, áreas táctiles, contraste, anchuras móviles y `prefers-reduced-motion`.
- Los paneles y lecturas flotantes deben permanecer en la misma sección cuando la usuaria lo haya pedido; no introducir navegación innecesaria.
- El aura compartida de los espacios internos se extiende fuera del encabezado y de la columna de contenido para integrarse con el fondo continuo hasta el borde móvil; ni la animación de entrada ni `.tw-workspace` deben recortarla. El límite exterior permanece en `.tailwind-lab`.
- El carril del scrollbar raíz usa el mismo fondo Noche (`--cosmos`) para que el borde derecho de la aplicación no revele una franja transparente.

## Estado actual de la experiencia Tailwind

### Umbral

- Portada orbital con fecha integrada en el encabezado, número del día, signo, arcano y fase lunar SVG.
- Umbral incorpora el efecto Light Rays de Vue Bits adaptado a la identidad Noche + Oro mediante `ogl`; solo renderiza mientras está visible y se desactiva con movimiento reducido.
- En móvil los detalles de cada eje (Vínculos, Decretos, Hobbies, Travesías, Cuidado, Balance, Núcleo y Edad Dorada) se abren como hoja flotante inferior (patrón app) con botón de cierre, en lugar de reemplazar toda la vista; en escritorio conservan la vista completa.
- En Núcleo, tocar un pensamiento muestra su texto como lectura flotante en la posición de la estrella (sin el texto central "Solo aquí"). En Edad Dorada, el daruma se muestra ampliado y el texto de cada grieta aparece en la posición de la grieta; se quitó la boca del daruma.
- Mi Balance quedó sin botones duplicados en la portada: el árbol es la entrada y la gestión vive en la tarjeta flotante del detalle. La interfaz móvil se compactó (menos padding, botones y títulos más pequeños) para adaptarse mejor a la pantalla.
- La luna no tiene un círculo negro exterior innecesario.
- Las órbitas se mantienen alejadas del centro lunar.
- El arcano se presenta como un mazo con animación de barajado y alternativa para movimiento reducido.
- El arcano del día se persiste en `umbral_arcanos` y el mazo permite consultar los registros diarios anteriores.
- El detalle conserva intenciones y pulso diario.

### Mundos

- La portada no repite el título grande `Mundos`; conserva el nombre en la navegación y un encabezado semántico oculto para accesibilidad.
- Entrada mediante flor tridimensional de cinco pétalos.
- Etiquetas radiales orientadas desde el centro hacia cada pétalo.
- Cada pétalo conserva su color y abre su mundo sin salir a la interfaz original.

Submundos destacados:

- **Mi Constelación**: vínculos distribuidos en tres órbitas. Amor al centro; Familia en la órbita media; Amistad, Raíz y Guía en la exterior. Las estrellas abren lecturas flotantes.
- Mi Constelación guarda y muestra el signo opcional de cada vínculo.
- Mi Constelación entra directamente al mapa orbital; no presenta una frase explicativa entre el encabezado y las órbitas.
- **Lo que cuido**: mural editorial de afiches fotográficos. Permite elegir o arrastrar imágenes, limita archivos a 12 MB y optimiza localmente a JPEG con lado máximo de 1400 px.
- Registros históricos de Compañeros y Plantas sin imagen siguen visibles como afiches tipográficos.
- Travesías usa un mapa SVG local, guarda latitud/longitud y admite el recuerdo opcional “¿Qué viviste ahí?”.
- Decretos usa un ritual de tres pulsaciones por activación; la séptima crea voluntariamente un nodo sin texto en Edad Dorada.
- Hobbies permite pausar y retomar actividades y vuelve a hacer visible el jardín dormido sin notificaciones.
- En desarrollo se muestran cinco imágenes de prueba desde `src/assets/care-demo/`; están marcadas como `Muestra`, no se guardan ni sincronizan y no forman parte del build productivo.

### Mi Balance

- La portada no repite el título grande `Mi Balance`; conserva el nombre en la navegación y un encabezado semántico oculto para accesibilidad.
- La portada usa un bonsái de cerezo como objeto principal, sin la antigua balanza circular flotante sobre el árbol; conserva el sello `Privado por defecto` y las órbitas al fondo.
- Cada gasto real genera una flor. Los ingresos afectan el saldo y el historial, pero no se representan como flores.
- La portada muestra hasta doce flores recientes. El detalle funcional no repite el cerezo ni sus flores; los gastos permanecen disponibles en `Últimos movimientos`.
- Tocar el árbol abre el espacio completo de Mi Balance.
- `Registrar movimiento` y `Nueva meta` abren paneles flotantes mediante `Teleport`; no cambian de ruta.
- Guardar un gasto actualiza el cerezo inmediatamente.
- Los paneles se cierran con el botón, `Escape` o el fondo y se muestran por encima de la navegación móvil.
- Se conserva el historial y las metas Daruma existentes.
- Mi Balance admite ingreso base y movimientos fijos mensuales; las ramas reflejan el peso relativo de las categorías.
- Los Darumas muestran colores con significado, reciben aportes y, al completarse, pueden enviarse voluntariamente a Edad Dorada sin texto ni datos financieros.

### Núcleo

- Es una única pantalla local; no debe reintroducirse una portada o detalle intermedio.
- La portada no repite el título grande `Núcleo`; conserva el nombre en la navegación y un encabezado semántico oculto para accesibilidad.
- El campo de escritura aparece debajo del plasma.
- Cada pensamiento se guarda como punto luminoso.
- El texto se clasifica localmente en una familia emocional con nombre y color.
- Emociones afines se agrupan y forman zonas de plasma animado.
- Tocar un punto abre una tarjeta flotante con texto, emoción, fecha y símbolo; no navega a otra sección.
- Núcleo nunca se sincroniza, ni siquiera cifrado.

### Edad Dorada

- La portada no repite el título grande `Edad Dorada`; conserva el nombre en la navegación y un encabezado semántico oculto para accesibilidad.
- El Daruma de kintsugi reemplaza la antigua esfera rosada.
- El Daruma es el acceso principal y también permite declarar desde la portada.
- Cada declaración crea una grieta dorada accesible.
- La grieta seleccionada revela su significado sin abandonar la composición.
- El modo contemplación retira navegación y controles.
- El color zodiacal aparece como capa sobre la identidad base.

## Modelo de datos local

`LocalStorageDriver` agrega automáticamente el prefijo `aureo_`. El código de dominio usa nombres sin prefijo; el navegador guarda claves como `aureo_balance_movimientos`.

Reglas permanentes:

- No borrar datos existentes para corregir una interfaz.
- No renombrar claves históricas sin migración preservadora.
- Toda migración debe ser versionada en `src/data/migrations.ts`.
- Versión local de esquema vigente: `CURRENT_SCHEMA_VERSION = 3`.
- El backup vigente usa versión 2 y excluye `device_secret`.
- Los campos privados de nacimiento del perfil se cifran localmente.
- Los borrados sincronizables se conservan como tombstones mediante `deleted_at`.

Colecciones sincronizables:

| Eje remoto | Colecciones locales |
| --- | --- |
| `umbral` | `intenciones`, `pulso`, `ideas`, `cultivo`, `umbral_arcanos` |
| `mundos` | `vinculos`, `companeros`, `decretos`, `plantas`, `hobbies`, `travesias` |
| `balance` | `balance_movimientos`, `balance_categorias`, `balance_darumas` |
| `edad_dorada` | `edad_dorada_declaraciones` |

Datos deliberadamente locales incluyen:

- `nucleo_pensamientos` y cualquier clave cuyo nombre empiece por `nucleo`.
- `balance_oculto`, preferencias visuales y estado de sesión.
- La sesión de acceso local en `aureo_local_session`; se crea una vez por dispositivo y no contiene correo.
- `device_secret`.
- La selección del eje Tailwind en `sessionStorage` (`aureo_tailwind_axis`).

## Supabase

Proyecto: `msfitymrxblzgiqyjfse`.

Fuente local del esquema:

```text
supabase/migrations/202608190001_initial_aureo_sync.sql
```

Estado remoto documentado y verificado previamente:

- Tablas `public.aureo_profiles` y `public.aureo_records`.
- RLS habilitado en ambas.
- Políticas de selección, inserción y actualización para registros propios.
- RPC `public.sync_aureo_records(jsonb)`.
- El RPC solo se concede a `authenticated`; `public` y `anon` no pueden ejecutarlo.
- `aureo_records.axis` admite solamente `umbral`, `mundos`, `balance` y `edad_dorada`.
- Conflictos resueltos por el par `(client_updated_at, mutation_id)`.

Configuración local:

- `.env.local` contiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` cuando está configurado.
- `.env.local` está ignorado.
- `.env.example` puede contener la URL pública y deja vacía la clave.
- La clave anon es pública para el cliente, pero no debe copiarse a respuestas, capturas ni documentación.
- Nunca registrar `service_role` en código cliente.

Autenticación:

- `src/stores/auth.ts` usa temporalmente una sesión local persistente mediante `StorageDriver`; no pide correo ni inicializa Supabase.
- `src/App.vue` no ejecuta sincronización remota al arrancar ni al recuperar conexión mientras esté vigente el modo local.
- Los clientes y servicios de Supabase permanecen en el repositorio para una activación multiusuario posterior, pero no forman parte del flujo de acceso actual.
- Perfil remoto en `src/data/supabase/profile.ts`.
- Sincronización en `src/data/sync/service.ts`.
- Catálogo remoto en `src/data/sync/catalog.ts`.

### Garantía innegociable de Núcleo

La exclusión se aplica en dos niveles:

1. Cliente: `remoteAxisFor('nucleo_pensamientos')` devuelve `null`; el catálogo no contiene ninguna clave `nucleo*`.
2. Base de datos: la restricción de `axis` no permite `nucleo`.

No ampliar el catálogo, la RPC ni la base para incluir Núcleo. No enviar Núcleo a analítica, backups remotos o futuras funciones de IA.

## Pruebas y verificación

Comandos estándar:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Configuración Playwright:

- Proyecto `desktop`: Desktop Chrome.
- Proyecto `mobile`: iPhone 13.
- El runner compila y sirve la aplicación en `4174`; la ruta Tailwind sigue disponible dentro del mismo build.

Cobertura E2E relevante:

- Rutas históricas y redirecciones.
- Funciones reales de cada eje Tailwind.
- Anchura y adaptación móvil.
- Cerezo de gastos y flores interactivas.
- Paneles flotantes de movimiento y meta sin cambio de ruta.
- Matiz zodiacal.
- Mural fotográfico.
- Tarot animado y movimiento reducido.
- Plasma y lecturas flotantes de Núcleo.
- Órbitas de Mi Constelación.
- Daruma y grietas de Edad Dorada.
- Navegación adaptable, estado, persistencia local, offline y teclado.

Última verificación completa conocida antes de los ajustes de esta iteración:

- `pnpm typecheck`: correcto.
- `pnpm test`: 3 archivos, 7 pruebas correctas.
- `pnpm build`: correcto.
- `pnpm test:e2e`: 42 recorridos correctos en escritorio y móvil, incluidos melodía de Núcleo, signo de Vínculos, ritual de Decretos, mapa de Travesías y transferencia segura de Daruma.
- Detector de diseño de los componentes modificados: sin hallazgos.

Validación posterior a los ajustes documentados del 28-08-2026:

- `pnpm build`: correcto.
- `pnpm test`: 3 archivos y 7 pruebas correctas.
- E2E focalizados de arranque/sesión local, portada Mundos y carril raíz: 2/2 correctos cada uno en escritorio y móvil.
- E2E focalizados de aura móvil y detalle de Balance: 4/4 correctos en escritorio y móvil.
- Detector de diseño de los archivos de interfaz modificados: sin hallazgos.
- La suite E2E completa queda pendiente de repetición; no atribuir los 42 recorridos anteriores al último árbol de trabajo.

Antes de una entrega externa ejecutar nuevamente la suite E2E completa. Las pruebas remotas multiusuario con dos correos reales y conflictos concurrentes deben repetirse antes de liberar sincronización a testers.

## Flujo seguro para cambios futuros

1. Identificar la versión solicitada usando el mapa de versiones.
2. Leer las decisiones del eje afectado.
3. Inspeccionar los datos y la implementación existente antes de editar.
4. Trabajar por defecto en Tailwind sin duplicar el cambio en la presentación original.
5. Usar repositorios; no escribir directamente a `localStorage` desde nuevas vistas salvo estado efímero justificado.
6. No conectar componentes directamente a Supabase.
7. Preservar datos locales, rutas y nombres históricos.
8. Verificar escritorio y móvil en una ronda acotada.
9. Ejecutar typecheck, pruebas proporcionales y build.
10. Actualizar este documento si cambia una decisión, una versión, una ruta, un contrato de datos o una función visible relevante.

## Acciones prohibidas sin autorización explícita

- Borrar o reinicializar datos locales.
- Ejecutar migraciones destructivas.
- Sincronizar Núcleo.
- Copiar código compilado desde Vercel hacia la base canónica como si fuera fuente.
- Mantener Tailwind y la presentación original en paralelo por defecto.
- Cambiar la identidad Noche + Oro por una plantilla genérica.
- Introducir IA, chatbot, consejos automáticos, analítica de Núcleo o gamificación.
- Exponer claves, tokens, correos de prueba o secretos de Supabase.
- Publicar, desplegar o modificar la versión web histórica sin solicitud explícita.

## Decisiones aún abiertas

- Cuándo retirar definitivamente la redirección compatible `/laboratorio-tailwind`; la experiencia ya vive en `/`.
- Cuándo promover la experiencia Tailwind al puerto/ruta principal de producción.
- Validación remota final con múltiples usuarios y conflictos reales.
- Momento de incorporar Capacitor para Android/iOS, después de estabilizar la PWA.

Ideas no confirmadas y aplazadas: exportación a Instagram, integración por WhatsApp, imágenes generadas para Hobbies, notificaciones o resúmenes semanales, constructor de ejes, publicación inmediata en tiendas, traducciones y los “tres números únicos” del onboarding. No implementarlas sin decisión explícita.

## Fuentes históricas y de producto

En la raíz `D:\Work - TIgrr\Aureo`:

- `umbral_eje1_aureo_v1.1.docx`
- `mundos_eje2_aureo_v1.2.docx`
- `ux_decisiones_mundos_v1.md`
- `memoria_sesion_eje3_finanzas_v2.md`
- `nucleo_eje4_aureo_v1.2.md`
- `memoria_sesion_eje4_nucleo_v2.md`
- `memoria_sesion_eje5_edad_dorada_v2.md`
- `aureo_simbolo_M6_fiel.png`

## Protocolo de mantenimiento documental

Al cerrar una modificación significativa:

- Actualizar `last_verified` en el encabezado de este archivo.
- Añadir o corregir el estado funcional del eje afectado.
- Actualizar `docs/CONTINUIDAD_IMPLEMENTACION.md` si el cambio necesita relato cronológico.
- Actualizar `docs/product/DECISIONES_CLIENTA.md` solo cuando exista una decisión nueva confirmada por la usuaria.
- No convertir resultados transitorios de una prueba en decisiones permanentes.
- No incluir secretos ni valores de `.env.local`.
