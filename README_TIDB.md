# Activity API - TiDB Cloud

- Se creó la base `actvitydaylife` (no usar `sys`).
- `src/config/db.js` utiliza mysql2 y TLS verificado.
- `.env` contiene la configuración local: NO SUBIRLO A GIT.
- En Vercel > Project > Settings > Environment Variables agrega DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME y, si es necesario, DB_CA_PATH.
- Copia los valores de `.env` a Vercel, sin publicar la contraseña en repositorios.
- Para importar la base usa el archivo `database/activitydaylife_tiDB_ESTRUCTURA.sql` (solo tablas) o `database/activitydaylife_tiDB_COMPLETA.sql` (tablas y datos; se genera con el convertidor) desde un cliente MySQL.
- Si necesitas regenerar la copia completa desde tu dump MySQL de Aiven, usa `python database/convert_mysql_dump.py ruta/al/archivo.sql`.
- La aplicación Flutter usa el mismo endpoint de la API. No debe conectarse directamente a TiDB.

**Seguridad:** dado que la contraseña apareció en una captura, conviene rotarla en TiDB después de completar la migración y actualizar las variables en Vercel.
