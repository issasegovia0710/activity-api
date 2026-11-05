#!/usr/bin/env python3
"""Transforma un mysqldump MySQL 8 con datos a SQL importable en TiDB.
No requiere instalar paquetes. Ejemplo:
python database/convert_mysql_dump.py activitydaylife.sql
"""
import argparse
import re
from pathlib import Path

PRIORITY = (
    'usuario', 'nivel', 'ejercicios', 'actividades',
    'actividades_ejercicios', 'actividades_ejercicios_detalle',
    'actividades_ejercicios_logs', 'daily_activities', 'daily_activity_logs',
)


def find_insert_statements(sql):
    # Busca los INSERT sin cortar cadenas que contengan un punto y coma.
    pat = re.compile(r'INSERT\s+INTO\s+`([^`]+)`\s+VALUES\s*', re.I)
    output = {}
    for m in pat.finditer(sql):
        pos = m.start()
        i = m.end()
        quoted, escaped = False, False
        while i < len(sql):
            ch = sql[i]
            if escaped:
                escaped = False
            elif ch == '\\' and quoted:
                escaped = True
            elif ch == "'":
                if quoted and i + 1 < len(sql) and sql[i + 1] == "'":
                    i += 1
                else:
                    quoted = not quoted
            elif ch == ';' and not quoted:
                output.setdefault(m.group(1), []).append(sql[pos:i + 1])
                break
            i += 1
        else:
            raise ValueError(f'INSERT incompleto en tabla {m.group(1)}')
    return output


def convert(source, target):
    text = source.read_text(encoding='utf-8-sig')
    # Captura las 9 definiciones sin los SET @@GLOBAL.GTID_PURGED,
    # SQL_LOG_BIN, LOCK, ni los comentarios específicos de mysqldump.
    table_pattern = re.compile(
        r'CREATE\s+TABLE\s+`([^`]+)`\s*\([\s\S]*?\)\s*ENGINE=InnoDB[^;]*;', re.I
    )
    tables = {m.group(1): m.group(0) for m in table_pattern.finditer(text)}
    inserts = find_insert_statements(text)
    missing = set(PRIORITY) - set(tables)
    if missing:
        raise ValueError('El respaldo no contiene todas las tablas: ' + ', '.join(sorted(missing)))
    extra = (set(tables) | set(inserts)) - set(PRIORITY)
    if extra:
        raise ValueError('Se detectaron tablas nuevas: ' + ', '.join(sorted(extra)) + '. Actualiza el orden antes de importar.')

    parts = [
        '-- Respaldo MySQL convertido a TiDB. INCLUYE LOS INSERT ORIGINALES.',
        '-- Ejecutar solo sobre la base actvitydaylife vacía.',
        'CREATE DATABASE IF NOT EXISTS `actvitydaylife` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;',
        'USE `actvitydaylife`;',
    ]
    for name in PRIORITY:
        ddl = tables[name]
        ddl = re.sub(r'COLLATE=utf8mb4_0900_ai_ci', 'COLLATE=utf8mb4_general_ci', ddl, flags=re.I)
        parts.append(ddl)
    for name in PRIORITY:
        parts.extend(inserts.get(name, []))
    target.write_text('\n\n'.join(parts) + '\n', encoding='utf-8')
    print(f'Archivo generado: {target} ({target.stat().st_size} bytes)')
    print(f'Tablas: {len(tables)} | tablas con datos: {len(inserts)}')
    for name in PRIORITY:
        print(f'  {name}: {len(inserts.get(name, []))} sentencias INSERT')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path, help='mysqldump MySQL original')
    parser.add_argument('-o', '--output', type=Path, default=Path('database/activitydaylife_tiDB_COMPLETA.sql'))
    args = parser.parse_args()
    if not args.source.is_file():
        parser.error(f'No existe archivo de entrada: {args.source}')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    convert(args.source, args.output)
