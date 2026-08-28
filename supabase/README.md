# Supabase de Áureo

El proyecto temporal asociado es `msfitymrxblzgiqyjfse`. Las migraciones de esta carpeta son la fuente de verdad del esquema remoto y deben aplicarse en orden.

## Límites de privacidad

- Se sincronizan Umbral, Mundos, Mi Balance y Edad Dorada.
- Núcleo nunca se representa en tablas remotas. La restricción `aureo_records_axis_check` rechaza cualquier intento de insertar `nucleo`.
- Todas las tablas tienen RLS y cada cuenta solo puede leer o modificar sus propios registros.
- Las pantallas no usan Supabase directamente; acceden mediante los servicios y repositorios de `src/data`.

## Conflictos y trabajo sin conexión

Cada cambio lleva `client_updated_at`, `mutation_id` y `device_id`. El RPC `sync_aureo_records` mezcla registros diferentes y, cuando dos dispositivos modifican el mismo registro, conserva la mutación con el par más reciente `(client_updated_at, mutation_id)`. Los borrados se sincronizan como tombstones mediante `deleted_at`.

La hora del dispositivo participa en esta política. La aplicación debe advertir si detecta una diferencia importante entre la hora local y la del servidor.
