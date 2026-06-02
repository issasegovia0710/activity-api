const db = require('../config/db');

const DIAS_VALIDOS = ['L', 'M', 'MI', 'J', 'V', 'S', 'D'];
const DIAS_ORDEN_FECHA = ['D', 'L', 'M', 'MI', 'J', 'V', 'S'];

function obtenerUsuarioId(req) {
  return req.usuario?.id || null;
}

function limpiarTexto(valor) {
  if (valor === undefined || valor === null) {
    return '';
  }

  return String(valor).trim();
}

function normalizarHora(valor) {
  const texto = limpiarTexto(valor);

  if (!texto) {
    return null;
  }

  const partes = texto.split(':');

  if (partes.length < 2) {
    return null;
  }

  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);
  const segundos = partes.length >= 3 ? Number(partes[2]) : 0;

  if (
    Number.isNaN(horas) ||
    Number.isNaN(minutos) ||
    Number.isNaN(segundos) ||
    horas < 0 ||
    horas > 23 ||
    minutos < 0 ||
    minutos > 59 ||
    segundos < 0 ||
    segundos > 59
  ) {
    return null;
  }

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

function horaParaRespuesta(valor) {
  const hora = normalizarHora(valor);

  if (!hora) {
    return '07:00';
  }

  return hora.slice(0, 5);
}

function obtenerFechaHoyMysql() {
  const fecha = new Date();

  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function obtenerCodigoDiaHoy() {
  const fecha = new Date();

  return DIAS_ORDEN_FECHA[fecha.getDay()];
}

function normalizarFechaHoraMysql(valor) {
  if (!valor) {
    return null;
  }

  const fecha = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const hours = String(fecha.getHours()).padStart(2, '0');
  const minutes = String(fecha.getMinutes()).padStart(2, '0');
  const seconds = String(fecha.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function normalizarDias(valor) {
  let lista = [];

  if (Array.isArray(valor)) {
    lista = valor;
  } else if (typeof valor === 'string') {
    const texto = valor.trim();

    if (!texto) {
      lista = [];
    } else {
      try {
        const parsed = JSON.parse(texto);

        if (Array.isArray(parsed)) {
          lista = parsed;
        } else {
          lista = texto.split(',');
        }
      } catch (_) {
        lista = texto.split(',');
      }
    }
  }

  const setDias = new Set();

  for (const item of lista) {
    const dia = String(item || '').trim().toUpperCase();

    if (DIAS_VALIDOS.includes(dia)) {
      setDias.add(dia);
    }
  }

  return DIAS_VALIDOS.filter((dia) => setDias.has(dia));
}

function parsearDiasDesdeBD(valor) {
  if (Array.isArray(valor)) {
    return normalizarDias(valor);
  }

  if (valor === undefined || valor === null) {
    return [];
  }

  if (typeof valor === 'object') {
    return normalizarDias(valor);
  }

  return normalizarDias(String(valor));
}

function normalizarBooleano(valor, fallback = true) {
  if (valor === undefined || valor === null || valor === '') {
    return fallback;
  }

  if (typeof valor === 'boolean') {
    return valor;
  }

  if (typeof valor === 'number') {
    return valor === 1;
  }

  const texto = String(valor).trim().toLowerCase();

  if (
    texto === '1' ||
    texto === 'true' ||
    texto === 'si' ||
    texto === 'sí' ||
    texto === 'activo' ||
    texto === 'activa'
  ) {
    return true;
  }

  if (
    texto === '0' ||
    texto === 'false' ||
    texto === 'no' ||
    texto === 'inactivo' ||
    texto === 'inactiva' ||
    texto === 'pausado' ||
    texto === 'pausada'
  ) {
    return false;
  }

  return fallback;
}

function toInt(valor, fallback = 0) {
  if (valor === undefined || valor === null || valor === '') {
    return fallback;
  }

  if (typeof valor === 'number') {
    if (Number.isNaN(valor)) {
      return fallback;
    }

    return Math.round(valor);
  }

  const convertido = Number(valor);

  if (Number.isNaN(convertido)) {
    return fallback;
  }

  return Math.round(convertido);
}

function obtenerCampo(body, nombres) {
  for (const nombre of nombres) {
    if (Object.prototype.hasOwnProperty.call(body, nombre)) {
      return body[nombre];
    }
  }

  return undefined;
}

function formatearEjercicio(row) {
  return {
    id: Number(row.id),
    usuario_id: row.usuario_id === null || row.usuario_id === undefined
      ? null
      : Number(row.usuario_id),
    nombre: row.nombre,
    descripcion: row.descripcion,
    grupo_muscular: row.grupo_muscular,
    tipo: row.tipo,
    duracion_minutos: Number(row.duracion_minutos || 0),
    valor_exp: Number(row.valor_exp || 0),
    activo: Number(row.activo || 0) === 1,
    es_global: row.usuario_id === null || row.usuario_id === undefined,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function formatearDetalle(row) {
  return {
    id: Number(row.id),
    actividad_ejercicio_id: Number(row.actividad_ejercicio_id),
    ejercicio_id: Number(row.ejercicio_id),
    orden: Number(row.orden || 1),
    nombre: row.ejercicio_nombre || row.nombre || 'Ejercicio',
    descripcion: row.ejercicio_descripcion || null,
    grupo_muscular: row.grupo_muscular || null,
    tipo: row.tipo || null,
    series: Number(row.series || 0),
    repeticiones: row.repeticiones || null,
    duracion_minutos: Number(row.duracion_minutos || 0),
    descanso_segundos: Number(row.descanso_segundos || 0),
    valor_exp: Number(row.valor_exp || 0),
  };
}

function formatearRutina(row, detalles = []) {
  return {
    id: Number(row.id),
    usuario_id: Number(row.usuario_id),
    nombre: row.nombre,
    descripcion: row.descripcion,
    dias: parsearDiasDesdeBD(row.dias),
    hora_inicio: horaParaRespuesta(row.hora_inicio),
    duracion_minutos: Number(row.duracion_minutos || 0),
    valor_exp_total: Number(row.valor_exp_total || 0),
    activa: Number(row.activa || 0) === 1,
    completada_hoy: row.log_id !== undefined && row.log_id !== null,
    completed_at: row.completada_at
      ? normalizarFechaHoraMysql(row.completada_at)
      : null,
    exp_ganada: row.exp_ganada === undefined || row.exp_ganada === null
      ? null
      : Number(row.exp_ganada),
    ejercicios: detalles,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

async function buscarEjercicioPorIdYUsuario(id, usuarioId, connection = db) {
  const [resultados] = await connection.query(
    `
      SELECT
        id,
        usuario_id,
        nombre,
        descripcion,
        grupo_muscular,
        tipo,
        duracion_minutos,
        valor_exp,
        activo,
        created_at,
        updated_at,
        deleted_at
      FROM ejercicios
      WHERE id = ?
        AND deleted_at IS NULL
        AND (
          usuario_id = ?
          OR usuario_id IS NULL
        )
      LIMIT 1
    `,
    [
      Number(id),
      Number(usuarioId),
    ]
  );

  if (!resultados || resultados.length === 0) {
    return null;
  }

  return resultados[0];
}

async function buscarRutinaPorIdYUsuario(id, usuarioId, connection = db) {
  const [resultados] = await connection.query(
    `
      SELECT
        id,
        usuario_id,
        nombre,
        descripcion,
        dias,
        hora_inicio,
        duracion_minutos,
        valor_exp_total,
        activa,
        created_at,
        updated_at,
        deleted_at
      FROM actividades_ejercicios
      WHERE id = ?
        AND usuario_id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [
      Number(id),
      Number(usuarioId),
    ]
  );

  if (!resultados || resultados.length === 0) {
    return null;
  }

  return resultados[0];
}

async function obtenerDetallesDeRutinas(rutinaIds, connection = db) {
  if (!Array.isArray(rutinaIds) || rutinaIds.length === 0) {
    return {};
  }

  const idsLimpios = rutinaIds
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));

  if (idsLimpios.length === 0) {
    return {};
  }

  const placeholders = idsLimpios.map(() => '?').join(',');

  const [detalles] = await connection.query(
    `
      SELECT
        aed.id,
        aed.actividad_ejercicio_id,
        aed.ejercicio_id,
        aed.orden,
        aed.series,
        aed.repeticiones,
        aed.duracion_minutos,
        aed.descanso_segundos,
        aed.valor_exp,
        e.nombre AS ejercicio_nombre,
        e.descripcion AS ejercicio_descripcion,
        e.grupo_muscular,
        e.tipo
      FROM actividades_ejercicios_detalle aed
      INNER JOIN ejercicios e
        ON e.id = aed.ejercicio_id
      WHERE aed.actividad_ejercicio_id IN (${placeholders})
      ORDER BY aed.actividad_ejercicio_id ASC, aed.orden ASC, aed.id ASC
    `,
    idsLimpios
  );

  const mapa = {};

  for (const detalle of detalles) {
    const rutinaId = Number(detalle.actividad_ejercicio_id);

    if (!mapa[rutinaId]) {
      mapa[rutinaId] = [];
    }

    mapa[rutinaId].push(formatearDetalle(detalle));
  }

  return mapa;
}

async function prepararDetallesRutina(ejerciciosRecibidos, usuarioId, connection = db) {
  if (!Array.isArray(ejerciciosRecibidos) || ejerciciosRecibidos.length === 0) {
    throw new Error('Selecciona al menos un ejercicio para la rutina');
  }

  const detalles = [];
  let valorExpTotal = 0;
  let duracionTotal = 0;

  for (let index = 0; index < ejerciciosRecibidos.length; index += 1) {
    const item = ejerciciosRecibidos[index] || {};
    const ejercicioId = toInt(
      item.ejercicio_id ?? item.ejercicioId ?? item.id,
      0
    );

    if (!ejercicioId) {
      throw new Error('Cada ejercicio debe tener ejercicio_id');
    }

    const ejercicio = await buscarEjercicioPorIdYUsuario(
      ejercicioId,
      usuarioId,
      connection
    );

    if (!ejercicio) {
      throw new Error(`El ejercicio ${ejercicioId} no existe o no pertenece al usuario`);
    }

    const series = toInt(item.series, 3);
    const repeticiones = limpiarTexto(item.repeticiones ?? item.reps);
    const duracionMinutos = toInt(
      item.duracion_minutos ?? item.duracionMinutos,
      Number(ejercicio.duracion_minutos || 5)
    );
    const descansoSegundos = toInt(
      item.descanso_segundos ?? item.descansoSegundos,
      60
    );
    const valorExp = toInt(
      item.valor_exp ?? item.valorExp ?? item.exp,
      Number(ejercicio.valor_exp || 10)
    );

    const detalle = {
      ejercicio_id: Number(ejercicioId),
      orden: toInt(item.orden, index + 1),
      series,
      repeticiones: repeticiones || null,
      duracion_minutos: duracionMinutos,
      descanso_segundos: descansoSegundos,
      valor_exp: valorExp,
    };

    detalles.push(detalle);

    valorExpTotal += valorExp;
    duracionTotal += duracionMinutos;
  }

  return {
    detalles,
    valorExpTotal,
    duracionTotal,
  };
}

async function insertarDetallesRutina(
  actividadEjercicioId,
  detalles,
  connection = db
) {
  for (const detalle of detalles) {
    await connection.query(
      `
        INSERT INTO actividades_ejercicios_detalle (
          actividad_ejercicio_id,
          ejercicio_id,
          orden,
          series,
          repeticiones,
          duracion_minutos,
          descanso_segundos,
          valor_exp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(actividadEjercicioId),
        Number(detalle.ejercicio_id),
        Number(detalle.orden),
        Number(detalle.series),
        detalle.repeticiones || null,
        Number(detalle.duracion_minutos),
        Number(detalle.descanso_segundos),
        Number(detalle.valor_exp),
      ]
    );
  }
}

exports.verEjerciciosDelUsuario = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);

    if (!usuarioId) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const [resultados] = await db.query(
      `
        SELECT
          id,
          usuario_id,
          nombre,
          descripcion,
          grupo_muscular,
          tipo,
          duracion_minutos,
          valor_exp,
          activo,
          created_at,
          updated_at
        FROM ejercicios
        WHERE deleted_at IS NULL
          AND activo = 1
          AND (
            usuario_id = ?
            OR usuario_id IS NULL
          )
        ORDER BY usuario_id IS NULL DESC, grupo_muscular ASC, nombre ASC
      `,
      [Number(usuarioId)]
    );

    const ejercicios = resultados.map(formatearEjercicio);

    return res.status(200).json({
      status: 'ok',
      total: ejercicios.length,
      ejercicios,
    });
  } catch (error) {
    console.error('Error al consultar ejercicios:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al consultar ejercicios',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.verEjercicioPorId = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!usuarioId) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const ejercicio = await buscarEjercicioPorIdYUsuario(id, usuarioId);

    if (!ejercicio) {
      return res.status(404).json({
        status: 'error',
        mensaje: 'Ejercicio no encontrado',
      });
    }

    return res.status(200).json({
      status: 'ok',
      ejercicio: formatearEjercicio(ejercicio),
    });
  } catch (error) {
    console.error('Error al consultar ejercicio:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al consultar ejercicio',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.agregarEjercicio = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);

    if (!usuarioId) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const nombre = limpiarTexto(obtenerCampo(req.body, ['nombre', 'name']));
    const descripcion = limpiarTexto(obtenerCampo(req.body, ['descripcion', 'description']));
    const grupoMuscular = limpiarTexto(obtenerCampo(req.body, ['grupo_muscular', 'grupoMuscular']));
    const tipo = limpiarTexto(obtenerCampo(req.body, ['tipo', 'type']));
    const duracionMinutos = toInt(obtenerCampo(req.body, ['duracion_minutos', 'duracionMinutos']), 5);
    const valorExp = toInt(obtenerCampo(req.body, ['valor_exp', 'valorExp', 'exp']), 10);
    const activo = normalizarBooleano(obtenerCampo(req.body, ['activo', 'active']), true);

    if (!nombre) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Falta el nombre del ejercicio',
      });
    }

    if (duracionMinutos <= 0) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'La duración debe ser mayor a 0 minutos',
      });
    }

    if (valorExp <= 0) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'El valor de experiencia debe ser mayor a 0',
      });
    }

    const [resultado] = await db.query(
      `
        INSERT INTO ejercicios (
          usuario_id,
          nombre,
          descripcion,
          grupo_muscular,
          tipo,
          duracion_minutos,
          valor_exp,
          activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(usuarioId),
        nombre,
        descripcion || null,
        grupoMuscular || null,
        tipo || null,
        Number(duracionMinutos),
        Number(valorExp),
        activo ? 1 : 0,
      ]
    );

    const ejercicio = {
      id: resultado.insertId,
      usuario_id: Number(usuarioId),
      nombre,
      descripcion: descripcion || null,
      grupo_muscular: grupoMuscular || null,
      tipo: tipo || null,
      duracion_minutos: Number(duracionMinutos),
      valor_exp: Number(valorExp),
      activo: activo ? 1 : 0,
      created_at: null,
      updated_at: null,
    };

    return res.status(201).json({
      status: 'ok',
      mensaje: 'Ejercicio agregado correctamente',
      id: resultado.insertId,
      ejercicio: formatearEjercicio(ejercicio),
    });
  } catch (error) {
    console.error('Error al agregar ejercicio:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al agregar ejercicio',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.editarEjercicio = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!usuarioId) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const [previos] = await db.query(
      `
        SELECT *
        FROM ejercicios
        WHERE id = ?
          AND usuario_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [
        Number(id),
        Number(usuarioId),
      ]
    );

    if (!previos || previos.length === 0) {
      return res.status(404).json({
        status: 'error',
        mensaje: 'Ejercicio no encontrado o no editable',
      });
    }

    const ejercicioPrevio = previos[0];

    const nombre = obtenerCampo(req.body, ['nombre', 'name']) === undefined
      ? ejercicioPrevio.nombre
      : limpiarTexto(obtenerCampo(req.body, ['nombre', 'name']));

    const descripcion = obtenerCampo(req.body, ['descripcion', 'description']) === undefined
      ? ejercicioPrevio.descripcion
      : limpiarTexto(obtenerCampo(req.body, ['descripcion', 'description'])) || null;

    const grupoMuscular = obtenerCampo(req.body, ['grupo_muscular', 'grupoMuscular']) === undefined
      ? ejercicioPrevio.grupo_muscular
      : limpiarTexto(obtenerCampo(req.body, ['grupo_muscular', 'grupoMuscular'])) || null;

    const tipo = obtenerCampo(req.body, ['tipo', 'type']) === undefined
      ? ejercicioPrevio.tipo
      : limpiarTexto(obtenerCampo(req.body, ['tipo', 'type'])) || null;

    const duracionMinutos = obtenerCampo(req.body, ['duracion_minutos', 'duracionMinutos']) === undefined
      ? Number(ejercicioPrevio.duracion_minutos || 5)
      : toInt(obtenerCampo(req.body, ['duracion_minutos', 'duracionMinutos']), 5);

    const valorExp = obtenerCampo(req.body, ['valor_exp', 'valorExp', 'exp']) === undefined
      ? Number(ejercicioPrevio.valor_exp || 10)
      : toInt(obtenerCampo(req.body, ['valor_exp', 'valorExp', 'exp']), 10);

    const activo = obtenerCampo(req.body, ['activo', 'active']) === undefined
      ? Number(ejercicioPrevio.activo || 0) === 1
      : normalizarBooleano(obtenerCampo(req.body, ['activo', 'active']), true);

    if (!nombre) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Falta el nombre del ejercicio',
      });
    }

    if (duracionMinutos <= 0) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'La duración debe ser mayor a 0 minutos',
      });
    }

    if (valorExp <= 0) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'El valor de experiencia debe ser mayor a 0',
      });
    }

    await db.query(
      `
        UPDATE ejercicios
        SET
          nombre = ?,
          descripcion = ?,
          grupo_muscular = ?,
          tipo = ?,
          duracion_minutos = ?,
          valor_exp = ?,
          activo = ?
        WHERE id = ?
          AND usuario_id = ?
          AND deleted_at IS NULL
      `,
      [
        nombre,
        descripcion,
        grupoMuscular,
        tipo,
        Number(duracionMinutos),
        Number(valorExp),
        activo ? 1 : 0,
        Number(id),
        Number(usuarioId),
      ]
    );

    const actualizado = {
      ...ejercicioPrevio,
      nombre,
      descripcion,
      grupo_muscular: grupoMuscular,
      tipo,
      duracion_minutos: Number(duracionMinutos),
      valor_exp: Number(valorExp),
      activo: activo ? 1 : 0,
    };

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Ejercicio editado correctamente',
      ejercicio: formatearEjercicio(actualizado),
    });
  } catch (error) {
    console.error('Error al editar ejercicio:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al editar ejercicio',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.eliminarEjercicio = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!usuarioId) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const [resultado] = await db.query(
      `
        UPDATE ejercicios
        SET deleted_at = NOW(),
            activo = 0
        WHERE id = ?
          AND usuario_id = ?
          AND deleted_at IS NULL
      `,
      [
        Number(id),
        Number(usuarioId),
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        mensaje: 'Ejercicio no encontrado o no editable',
      });
    }

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Ejercicio eliminado correctamente',
      id: Number(id),
    });
  } catch (error) {
    console.error('Error al eliminar ejercicio:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al eliminar ejercicio',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.verRutinasEjercicioDelUsuario = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);

    if (!usuarioId) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const [resultados] = await db.query(
      `
        SELECT
          id,
          usuario_id,
          nombre,
          descripcion,
          dias,
          hora_inicio,
          duracion_minutos,
          valor_exp_total,
          activa,
          created_at,
          updated_at
        FROM actividades_ejercicios
        WHERE usuario_id = ?
          AND deleted_at IS NULL
        ORDER BY activa DESC, hora_inicio ASC, id DESC
      `,
      [Number(usuarioId)]
    );

    const rutinaIds = resultados.map((item) => Number(item.id));
    const detallesPorRutina = await obtenerDetallesDeRutinas(rutinaIds);

    const rutinas = resultados.map((row) => {
      return formatearRutina(row, detallesPorRutina[Number(row.id)] || []);
    });

    return res.status(200).json({
      status: 'ok',
      total: rutinas.length,
      rutinas,
    });
  } catch (error) {
    console.error('Error al consultar rutinas de ejercicio:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al consultar rutinas de ejercicio',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.verRutinasEjercicioHoy = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);

    if (!usuarioId) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const fechaHoy = obtenerFechaHoyMysql();
    const diaHoy = obtenerCodigoDiaHoy();

    const [resultados] = await db.query(
      `
        SELECT
          ae.id,
          ae.usuario_id,
          ae.nombre,
          ae.descripcion,
          ae.dias,
          ae.hora_inicio,
          ae.duracion_minutos,
          ae.valor_exp_total,
          ae.activa,
          ae.created_at,
          ae.updated_at,
          ael.id AS log_id,
          ael.completada_at,
          ael.exp_ganada
        FROM actividades_ejercicios ae
        LEFT JOIN actividades_ejercicios_logs ael
          ON ael.actividad_ejercicio_id = ae.id
          AND ael.usuario_id = ae.usuario_id
          AND ael.fecha = ?
        WHERE ae.usuario_id = ?
          AND ae.deleted_at IS NULL
          AND ae.activa = 1
          AND JSON_CONTAINS(ae.dias, JSON_QUOTE(?))
        ORDER BY ae.hora_inicio ASC, ae.id DESC
      `,
      [
        fechaHoy,
        Number(usuarioId),
        diaHoy,
      ]
    );

    const rutinaIds = resultados.map((item) => Number(item.id));
    const detallesPorRutina = await obtenerDetallesDeRutinas(rutinaIds);

    const rutinas = resultados.map((row) => {
      return formatearRutina(row, detallesPorRutina[Number(row.id)] || []);
    });

    return res.status(200).json({
      status: 'ok',
      fecha: fechaHoy,
      dia: diaHoy,
      total: rutinas.length,
      rutinas,
    });
  } catch (error) {
    console.error('Error al consultar rutinas de ejercicio de hoy:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al consultar rutinas de ejercicio de hoy',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.verRutinaEjercicioPorId = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!usuarioId) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const rutina = await buscarRutinaPorIdYUsuario(id, usuarioId);

    if (!rutina) {
      return res.status(404).json({
        status: 'error',
        mensaje: 'Rutina de ejercicio no encontrada',
      });
    }

    const detallesPorRutina = await obtenerDetallesDeRutinas([Number(id)]);

    return res.status(200).json({
      status: 'ok',
      rutina: formatearRutina(
        rutina,
        detallesPorRutina[Number(id)] || []
      ),
    });
  } catch (error) {
    console.error('Error al consultar rutina de ejercicio:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al consultar rutina de ejercicio',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.agregarRutinaEjercicio = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const usuarioId = obtenerUsuarioId(req);

    if (!usuarioId) {
      await connection.rollback();

      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const nombre = limpiarTexto(obtenerCampo(req.body, ['nombre', 'name']));
    const descripcion = limpiarTexto(obtenerCampo(req.body, ['descripcion', 'description']));
    const dias = normalizarDias(obtenerCampo(req.body, ['dias', 'repeat_days', 'repeatDays']));
    const horaInicio = normalizarHora(obtenerCampo(req.body, ['hora_inicio', 'horaInicio', 'hora']));
    const duracionRecibida = obtenerCampo(req.body, ['duracion_minutos', 'duracionMinutos']);
    const activa = normalizarBooleano(obtenerCampo(req.body, ['activa', 'is_active', 'active']), true);
    const ejercicios = obtenerCampo(req.body, ['ejercicios', 'exercises', 'detalle', 'detalles']);

    if (!nombre) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'Falta el nombre de la rutina',
      });
    }

    if (dias.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'Selecciona al menos un día válido para la rutina',
        dias_validos: DIAS_VALIDOS,
      });
    }

    if (!horaInicio) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'La hora de inicio no es válida. Usa formato HH:mm',
      });
    }

    const preparado = await prepararDetallesRutina(
      ejercicios,
      usuarioId,
      connection
    );

    const duracionMinutos = duracionRecibida === undefined ||
      duracionRecibida === null ||
      duracionRecibida === ''
      ? preparado.duracionTotal
      : toInt(duracionRecibida, preparado.duracionTotal);

    if (duracionMinutos < 40 || duracionMinutos > 60) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'La rutina debe durar entre 40 y 60 minutos',
      });
    }

    const [resultado] = await connection.query(
      `
        INSERT INTO actividades_ejercicios (
          usuario_id,
          nombre,
          descripcion,
          dias,
          hora_inicio,
          duracion_minutos,
          valor_exp_total,
          activa
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(usuarioId),
        nombre,
        descripcion || null,
        JSON.stringify(dias),
        horaInicio,
        Number(duracionMinutos),
        Number(preparado.valorExpTotal),
        activa ? 1 : 0,
      ]
    );

    await insertarDetallesRutina(
      resultado.insertId,
      preparado.detalles,
      connection
    );

    const rutinaCreada = await buscarRutinaPorIdYUsuario(
      resultado.insertId,
      usuarioId,
      connection
    );

    const detallesPorRutina = await obtenerDetallesDeRutinas(
      [Number(resultado.insertId)],
      connection
    );

    await connection.commit();

    return res.status(201).json({
      status: 'ok',
      mensaje: 'Rutina de ejercicio agregada correctamente',
      id: resultado.insertId,
      rutina: formatearRutina(
        rutinaCreada,
        detallesPorRutina[Number(resultado.insertId)] || []
      ),
    });
  } catch (error) {
    await connection.rollback();

    console.error('Error al agregar rutina de ejercicio:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: error.message || 'Error al agregar rutina de ejercicio',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    connection.release();
  }
};

exports.editarRutinaEjercicio = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const usuarioId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!usuarioId) {
      await connection.rollback();

      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const rutinaPrevia = await buscarRutinaPorIdYUsuario(
      id,
      usuarioId,
      connection
    );

    if (!rutinaPrevia) {
      await connection.rollback();

      return res.status(404).json({
        status: 'error',
        mensaje: 'Rutina de ejercicio no encontrada',
      });
    }

    const nombre = obtenerCampo(req.body, ['nombre', 'name']) === undefined
      ? rutinaPrevia.nombre
      : limpiarTexto(obtenerCampo(req.body, ['nombre', 'name']));

    const descripcion = obtenerCampo(req.body, ['descripcion', 'description']) === undefined
      ? rutinaPrevia.descripcion
      : limpiarTexto(obtenerCampo(req.body, ['descripcion', 'description'])) || null;

    const dias = obtenerCampo(req.body, ['dias', 'repeat_days', 'repeatDays']) === undefined
      ? parsearDiasDesdeBD(rutinaPrevia.dias)
      : normalizarDias(obtenerCampo(req.body, ['dias', 'repeat_days', 'repeatDays']));

    const horaInicio = obtenerCampo(req.body, ['hora_inicio', 'horaInicio', 'hora']) === undefined
      ? normalizarHora(rutinaPrevia.hora_inicio)
      : normalizarHora(obtenerCampo(req.body, ['hora_inicio', 'horaInicio', 'hora']));

    const activa = obtenerCampo(req.body, ['activa', 'is_active', 'active']) === undefined
      ? Number(rutinaPrevia.activa || 0) === 1
      : normalizarBooleano(obtenerCampo(req.body, ['activa', 'is_active', 'active']), true);

    const ejercicios = obtenerCampo(req.body, ['ejercicios', 'exercises', 'detalle', 'detalles']);

    if (!nombre) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'Falta el nombre de la rutina',
      });
    }

    if (dias.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'Selecciona al menos un día válido para la rutina',
        dias_validos: DIAS_VALIDOS,
      });
    }

    if (!horaInicio) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'La hora de inicio no es válida. Usa formato HH:mm',
      });
    }

    let valorExpTotal = Number(rutinaPrevia.valor_exp_total || 0);
    let duracionCalculada = Number(rutinaPrevia.duracion_minutos || 45);

    if (ejercicios !== undefined) {
      const preparado = await prepararDetallesRutina(
        ejercicios,
        usuarioId,
        connection
      );

      await connection.query(
        `
          DELETE FROM actividades_ejercicios_detalle
          WHERE actividad_ejercicio_id = ?
        `,
        [Number(id)]
      );

      await insertarDetallesRutina(
        Number(id),
        preparado.detalles,
        connection
      );

      valorExpTotal = preparado.valorExpTotal;
      duracionCalculada = preparado.duracionTotal;
    }

    const duracionMinutos = obtenerCampo(req.body, ['duracion_minutos', 'duracionMinutos']) === undefined
      ? duracionCalculada
      : toInt(obtenerCampo(req.body, ['duracion_minutos', 'duracionMinutos']), duracionCalculada);

    if (duracionMinutos < 40 || duracionMinutos > 60) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'La rutina debe durar entre 40 y 60 minutos',
      });
    }

    await connection.query(
      `
        UPDATE actividades_ejercicios
        SET
          nombre = ?,
          descripcion = ?,
          dias = ?,
          hora_inicio = ?,
          duracion_minutos = ?,
          valor_exp_total = ?,
          activa = ?
        WHERE id = ?
          AND usuario_id = ?
          AND deleted_at IS NULL
      `,
      [
        nombre,
        descripcion,
        JSON.stringify(dias),
        horaInicio,
        Number(duracionMinutos),
        Number(valorExpTotal),
        activa ? 1 : 0,
        Number(id),
        Number(usuarioId),
      ]
    );

    const rutinaActualizada = await buscarRutinaPorIdYUsuario(
      id,
      usuarioId,
      connection
    );

    const detallesPorRutina = await obtenerDetallesDeRutinas(
      [Number(id)],
      connection
    );

    await connection.commit();

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Rutina de ejercicio editada correctamente',
      rutina: formatearRutina(
        rutinaActualizada,
        detallesPorRutina[Number(id)] || []
      ),
    });
  } catch (error) {
    await connection.rollback();

    console.error('Error al editar rutina de ejercicio:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: error.message || 'Error al editar rutina de ejercicio',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    connection.release();
  }
};

exports.cambiarEstadoRutinaEjercicio = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const usuarioId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!usuarioId) {
      await connection.rollback();

      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const rutinaPrevia = await buscarRutinaPorIdYUsuario(
      id,
      usuarioId,
      connection
    );

    if (!rutinaPrevia) {
      await connection.rollback();

      return res.status(404).json({
        status: 'error',
        mensaje: 'Rutina de ejercicio no encontrada',
      });
    }

    const activaActual = Number(rutinaPrevia.activa || 0) === 1;
    const activaRecibida = obtenerCampo(req.body, ['activa', 'is_active', 'active']);
    const activaNueva = activaRecibida === undefined
      ? !activaActual
      : normalizarBooleano(activaRecibida, activaActual);

    await connection.query(
      `
        UPDATE actividades_ejercicios
        SET activa = ?
        WHERE id = ?
          AND usuario_id = ?
          AND deleted_at IS NULL
      `,
      [
        activaNueva ? 1 : 0,
        Number(id),
        Number(usuarioId),
      ]
    );

    const rutinaActualizada = {
      ...rutinaPrevia,
      activa: activaNueva ? 1 : 0,
    };

    const detallesPorRutina = await obtenerDetallesDeRutinas(
      [Number(id)],
      connection
    );

    await connection.commit();

    return res.status(200).json({
      status: 'ok',
      mensaje: activaNueva
        ? 'Rutina de ejercicio activada correctamente'
        : 'Rutina de ejercicio pausada correctamente',
      rutina: formatearRutina(
        rutinaActualizada,
        detallesPorRutina[Number(id)] || []
      ),
    });
  } catch (error) {
    await connection.rollback();

    console.error('Error al cambiar estado de rutina:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al cambiar estado de rutina',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    connection.release();
  }
};

exports.completarRutinaEjercicioHoy = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const usuarioId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!usuarioId) {
      await connection.rollback();

      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const rutina = await buscarRutinaPorIdYUsuario(
      id,
      usuarioId,
      connection
    );

    if (!rutina) {
      await connection.rollback();

      return res.status(404).json({
        status: 'error',
        mensaje: 'Rutina de ejercicio no encontrada',
      });
    }

    if (Number(rutina.activa || 0) !== 1) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'Esta rutina de ejercicio está pausada',
      });
    }

    const fechaHoy = obtenerFechaHoyMysql();
    const diaHoy = obtenerCodigoDiaHoy();
    const diasRutina = parsearDiasDesdeBD(rutina.dias);

    if (!diasRutina.includes(diaHoy)) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'Esta rutina no corresponde al día de hoy',
        dia_hoy: diaHoy,
        dias_rutina: diasRutina,
      });
    }

    const [logsPrevios] = await connection.query(
      `
        SELECT id
        FROM actividades_ejercicios_logs
        WHERE actividad_ejercicio_id = ?
          AND usuario_id = ?
          AND fecha = ?
        LIMIT 1
      `,
      [
        Number(id),
        Number(usuarioId),
        fechaHoy,
      ]
    );

    if (logsPrevios && logsPrevios.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        status: 'error',
        mensaje: 'Esta rutina de ejercicio ya fue completada hoy',
      });
    }

    const expGanada = Number(rutina.valor_exp_total || 0);
    const duracionReal = toInt(
      obtenerCampo(req.body, ['duracion_real_minutos', 'duracionRealMinutos']),
      Number(rutina.duracion_minutos || 0)
    );

    const [resultadoLog] = await connection.query(
      `
        INSERT INTO actividades_ejercicios_logs (
          actividad_ejercicio_id,
          usuario_id,
          fecha,
          duracion_real_minutos,
          exp_ganada
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        Number(id),
        Number(usuarioId),
        fechaHoy,
        duracionReal || null,
        expGanada,
      ]
    );

    await connection.query(
      `
        UPDATE usuario
        SET exp = exp + ?
        WHERE id = ?
      `,
      [
        expGanada,
        Number(usuarioId),
      ]
    );

    const [usuarioActualizadoRows] = await connection.query(
      `
        SELECT id, nombre_usuario, correo, exp, status, alta, nivel
        FROM usuario
        WHERE id = ?
        LIMIT 1
      `,
      [Number(usuarioId)]
    );

    const detallesPorRutina = await obtenerDetallesDeRutinas(
      [Number(id)],
      connection
    );

    await connection.commit();

    const rutinaRespuesta = {
      ...formatearRutina(
        {
          ...rutina,
          log_id: resultadoLog.insertId,
          completada_at: new Date(),
          exp_ganada: expGanada,
        },
        detallesPorRutina[Number(id)] || []
      ),
      completada_hoy: true,
      completed_at: normalizarFechaHoraMysql(new Date()),
      exp_ganada: expGanada,
    };

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Rutina de ejercicio completada correctamente',
      log_id: resultadoLog.insertId,
      fecha: fechaHoy,
      dia: diaHoy,
      exp_ganada: expGanada,
      rutina: rutinaRespuesta,
      usuario: usuarioActualizadoRows[0] || null,
    });
  } catch (error) {
    await connection.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        status: 'error',
        mensaje: 'Esta rutina de ejercicio ya fue completada hoy',
      });
    }

    console.error('Error al completar rutina de ejercicio:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al completar rutina de ejercicio',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    connection.release();
  }
};

exports.eliminarRutinaEjercicio = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!usuarioId) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const [resultado] = await db.query(
      `
        UPDATE actividades_ejercicios
        SET deleted_at = NOW(),
            activa = 0
        WHERE id = ?
          AND usuario_id = ?
          AND deleted_at IS NULL
      `,
      [
        Number(id),
        Number(usuarioId),
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        mensaje: 'Rutina de ejercicio no encontrada',
      });
    }

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Rutina de ejercicio eliminada correctamente',
      id: Number(id),
    });
  } catch (error) {
    console.error('Error al eliminar rutina de ejercicio:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al eliminar rutina de ejercicio',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};