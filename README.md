# Áureo Web

La referencia consolidada de requisitos confirmados por la clienta está en [`docs/product/DECISIONES_CLIENTA.md`](docs/product/DECISIONES_CLIENTA.md). Debe revisarse antes de modificar comportamientos del producto.

El estado técnico y visual para retomar el trabajo está documentado en [`docs/CONTINUIDAD_IMPLEMENTACION.md`](docs/CONTINUIDAD_IMPLEMENTACION.md).

Reconstrucción mantenible de la aplicación recuperada. Conserva las rutas y las claves `aureo_*` de `localStorage`, añade migraciones versionadas y mantiene el acceso a datos detrás de repositorios. Supabase se integra mediante esa capa para sincronizar Umbral, Mundos, Mi Balance y Edad Dorada; Núcleo sigue siendo exclusivamente local.

## Desarrollo

Requiere Node.js 22 y pnpm.

```bash
pnpm install
pnpm dev
```

La aplicación queda disponible en `http://127.0.0.1:4174`.

El laboratorio Tailwind se ejecuta por separado en `http://127.0.0.1:4175/#/laboratorio-tailwind`:

```bash
pnpm dev:tailwind
```

Para validar:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## Decisiones vigentes

- Vue 3, TypeScript estricto, Vite, Pinia y Vue Router.
- [`ADR-001`](docs/architecture/ADR-001-vue-3-source-of-truth.md) establece que `aureo-web` es la única base fuente oficial. La versión vanilla recuperada es referencia histórica y de compatibilidad, no una aplicación que deba seguir desarrollándose.
- PWA instalable con recursos y tipografías locales, caché versionada y aviso de actualización.
- Los campos privados de identidad conservan el cifrado local de la versión recuperada.
- Exportación y restauración desde Ajustes.
- Mi Balance, Núcleo y Edad Dorada se desarrollan según sus especificaciones aprobadas, manteniendo redirecciones para las rutas históricas cuando sea necesario.
- Capacitor no se agrega todavía; se incorporará una vez estabilizada y aprobada la web.

## Contexto y calidad de diseño

- `PRODUCT.md` registra el contexto durable confirmado para Impeccable.
- `.impeccable/config.json` mantiene el flujo `code-first` elegido para módulos futuros.
- `IMPECCABLE_AUDIT.md` contiene la auditoría técnica, los hallazgos y el resultado del pase de pulido.
- `.agents/skills/web-design-guidelines/SKILL.md` deja instalada en el proyecto la guía de interfaces de Vercel para reutilizarla en módulos futuros.
- `WEB_DESIGN_GUIDELINES_REVIEW.md` registra su aplicación y las decisiones deliberadas de localización y producto.

## Datos

Antes de probar con información real, exporta una copia. Las migraciones nunca borran datos y el borrado completo requiere confirmación explícita desde Ajustes.
