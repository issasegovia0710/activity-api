# Importación de Activity Day Life a TiDB

## Lo que contiene este paquete

- `activitydaylife_tiDB_ESTRUCTURA.sql`: crea `actvitydaylife` y sus 9 tablas. **No incluye registros**.
- `convert_mysql_dump.py`: transforma `activitydaylife.sql` (mysqldump de Aiven, 29/09/2026) en `activitydaylife_tiDB_COMPLETA.sql` preservando los `INSERT` originales.

El respaldo original `activitydaylife.sql` se localizó en la biblioteca de archivos del proyecto, pero no pudo exportarse como archivo binario desde esta sesión. Por eso el `.sql` COMPLETO no viene pre-generado. El convertidor puede trabajar con ese archivo una vez descargado.

### Generar el SQL completo (desde la carpeta de backend)

1. Coloca `activitydaylife.sql` en la raíz del backend.
2. Ejecuta:

```bash
python database/convert_mysql_dump.py activitydaylife.sql
```

Resultado: `database/activitydaylife_tiDB_COMPLETA.sql`, con tablas y datos. Ejecutarlo **solo en una base nueva/vacía**, porque es un volcado histórico.

### Importar en TiDB Cloud

En el SQL Editor de TiDB Cloud, abre `activitydaylife_tiDB_COMPLETA.sql` y ejecútalo si el editor soporta el tamaño del script; o con MySQL CLI:

```bash
mysql --host=gateway01.ap-northeast-1.prod.aws.tidbcloud.com --port=4000 --user=Ko35uhQbzxqo8Ps.root --ssl-mode=REQUIRED --password < database/activitydaylife_tiDB_COMPLETA.sql
```

Solicitará la contraseña de TiDB. **No** es necesario insertarla en el SQL.

**Nota:** para verificación de identidad del servidor mediante MySQL CLI, descargue el certificado CA de TiDB si la configuración lo requiere y use `--ssl-mode=VERIFY_IDENTITY --ssl-ca=RUTA_CA`. El backend `mysql2` usa la validación TLS del sistema.

### Comprobar

```sql
USE actvitydaylife;
SHOW TABLES;
SELECT COUNT(*) FROM usuario;
SELECT COUNT(*) FROM actividades;
SELECT COUNT(*) FROM ejercicios;
```

Este respaldo del 29 de septiembre de 2026 **no contiene las modificaciones posteriores**.
