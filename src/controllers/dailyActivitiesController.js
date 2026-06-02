const db = require('../config/db');

const DIAS_VALIDOS = ['L', 'M', 'MI', 'J', 'V', 'S', 'D'];

const MAP_PRIORIDAD_ES_A_EN = {
  baja: 'low',
  media: 'medium',
  alta: 'high',
};

const MAP_PRIORIDAD_EN_A_ES = {
  low: 'baja',
  medium: 'media',
  high: 'alta',
};

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
    return '08:00';
  }

  return hora.slice(0, 5);
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

function normalizarPrioridad(valor) {
  const texto = limpiarTexto(valor).toLowerCase();

  if (!texto) {
    return 'medium';
  }

  if (MAP_PRIORIDAD_ES_A_EN[texto]) {
    return MAP_PRIORIDAD_ES_A_EN[texto];
  }

  if (texto === 'low' || texto === 'medium' || texto === 'high') {
    return texto;
  }

  return 'medium';
}

function prioridadParaRespuesta(valor) {
  const prioridad = normalizarPrioridad(valor);

  return MAP_PRIORIDAD_EN_A_ES[prioridad] || 'media';
}

function expPorPrioridad(prioridad) {
  const prioridadNormalizada = normalizarPrioridad(prioridad);

  if (prioridadNormalizada === 'low') {
    return 5;
  }

  if (prioridadNormalizada === 'high') {
    return 25;
  }

  return 15;
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

function obtenerCampo(body, nombres) {
  for (const nombre of nombres) {
    if (Object.prototype.hasOwnProperty.call(body, nombre)) {
      return body[nombre];
    }
  }

  return undefined;
}

function formatearActividadDiaria(row) {
  const dias = parsearDiasDesdeBD(row.repeat_days);

  return {
    id: Number(row.id),
    usuario_id: Number(row.user_id),

    nombre: row.name,
    descripcion: row.description,

    dias,
    hora: horaParaRespuesta(row.scheduled_time),

    prioridad: prioridadParaRespuesta(row.priority),
    valor_exp: Number(row.exp_value || 0),

    activa: Number(row.is_active || 0) === 1,

    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

async function buscarActividadDiariaPorIdYUsuario(id, usuarioId, connection = db) {
  const [resultados] = await connection.query(
    `
      SELECT
        id,
        user_id,
        name,
        description,
        repeat_days,
        scheduled_time,
        priority,
        exp_value,
        is_active,
        created_at,
        updated_at,
        deleted_at
      FROM daily_activities
      WHERE id = ?
        AND user_id = ?
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

exports.verActividadesDiariasDelUsuario = async (req, res) => {
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
          user_id,
          name,
          description,
          repeat_days,
          scheduled_time,
          priority,
          exp_value,
          is_active,
          created_at,
          updated_at
        FROM daily_activities
        WHERE user_id = ?
          AND deleted_at IS NULL
        ORDER BY is_active DESC, scheduled_time ASC, id DESC
      `,
      [Number(usuarioId)]
    );

    const actividades = resultados.map(formatearActividadDiaria);

    return res.status(200).json({
      status: 'ok',
      total: actividades.length,
      actividades,
    });
  } catch (error) {
    console.error('Error al consultar actividades diarias:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al consultar actividades diarias',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.verActividadDiariaPorId = async (req, res) => {
  try {
    const usuarioId = obtenerUsuarioId(req);
    const { id } = req.params;

    if (!usuarioId) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const actividad = await buscarActividadDiariaPorIdYUsuario(id, usuarioId);

    if (!actividad) {
      return res.status(404).json({
        status: 'error',
        mensaje: 'Actividad diaria no encontrada',
      });
    }

    return res.status(200).json({
      status: 'ok',
      actividad: formatearActividadDiaria(actividad),
    });
  } catch (error) {
    console.error('Error al consultar actividad diaria:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al consultar actividad diaria',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.agregarActividadDiaria = async (req, res) => {
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
    const diasRecibidos = obtenerCampo(req.body, ['dias', 'repeat_days', 'repeatDays']);
    const horaRecibida = obtenerCampo(req.body, ['hora', 'scheduled_time', 'scheduledTime']);
    const prioridadRecibida = obtenerCampo(req.body, ['prioridad', 'priority']);
    const valorExpRecibido = obtenerCampo(req.body, ['valor_exp', 'exp_value', 'expValue']);
    const activaRecibida = obtenerCampo(req.body, ['activa', 'is_active', 'isActive', 'active']);

    if (!nombre) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Falta el nombre de la actividad diaria',
      });
    }

    const dias = normalizarDias(diasRecibidos);

    if (dias.length === 0) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Selecciona al menos un día válido',
        dias_validos: DIAS_VALIDOS,
      });
    }

    const hora = normalizarHora(horaRecibida);

    if (!hora) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'La hora no es válida. Usa formato HH:mm',
      });
    }

    const prioridad = normalizarPrioridad(prioridadRecibida);

    const valorExp =
      valorExpRecibido === undefined ||
      valorExpRecibido === null ||
      valorExpRecibido === '' ||
      Number.isNaN(Number(valorExpRecibido))
        ? expPorPrioridad(prioridad)
        : Number(valorExpRecibido);

    const activa = normalizarBooleano(activaRecibida, true);

    const [resultado] = await db.query(
      `
        INSERT INTO daily_activities (
          user_id,
          name,
          description,
          repeat_days,
          scheduled_time,
          priority,
          exp_value,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(usuarioId),
        nombre,
        descripcion || null,
        JSON.stringify(dias),
        hora,
        prioridad,
        valorExp,
        activa ? 1 : 0,
      ]
    );

    const actividadCreada = {
      id: resultado.insertId,
      user_id: Number(usuarioId),
      name: nombre,
      description: descripcion || null,
      repeat_days: dias,
      scheduled_time: hora,
      priority: prioridad,
      exp_value: valorExp,
      is_active: activa ? 1 : 0,
      created_at: null,
      updated_at: null,
    };

    const actividadRespuesta = formatearActividadDiaria(actividadCreada);

    const io = req.app.get('socketio');

    if (io) {
      io.emit('actividad_diaria_creada', actividadRespuesta);
    }

    return res.status(201).json({
      status: 'ok',
      mensaje: 'Actividad diaria agregada correctamente',
      id: resultado.insertId,
      actividad: actividadRespuesta,
    });
  } catch (error) {
    console.error('Error al agregar actividad diaria:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al agregar actividad diaria',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.editarActividadDiaria = async (req, res) => {
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

    const actividadPrevia = await buscarActividadDiariaPorIdYUsuario(
      id,
      usuarioId,
      connection
    );

    if (!actividadPrevia) {
      await connection.rollback();

      return res.status(404).json({
        status: 'error',
        mensaje: 'Actividad diaria no encontrada',
      });
    }

    const nombreRecibido = obtenerCampo(req.body, ['nombre', 'name']);
    const descripcionRecibida = obtenerCampo(req.body, ['descripcion', 'description']);
    const diasRecibidos = obtenerCampo(req.body, ['dias', 'repeat_days', 'repeatDays']);
    const horaRecibida = obtenerCampo(req.body, ['hora', 'scheduled_time', 'scheduledTime']);
    const prioridadRecibida = obtenerCampo(req.body, ['prioridad', 'priority']);
    const valorExpRecibido = obtenerCampo(req.body, ['valor_exp', 'exp_value', 'expValue']);
    const activaRecibida = obtenerCampo(req.body, ['activa', 'is_active', 'isActive', 'active']);

    const nombre =
      nombreRecibido === undefined
        ? actividadPrevia.name
        : limpiarTexto(nombreRecibido);

    if (!nombre) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'Falta el nombre de la actividad diaria',
      });
    }

    const descripcion =
      descripcionRecibida === undefined
        ? actividadPrevia.description
        : limpiarTexto(descripcionRecibida) || null;

    const dias =
      diasRecibidos === undefined
        ? parsearDiasDesdeBD(actividadPrevia.repeat_days)
        : normalizarDias(diasRecibidos);

    if (dias.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'Selecciona al menos un día válido',
        dias_validos: DIAS_VALIDOS,
      });
    }

    const hora =
      horaRecibida === undefined
        ? normalizarHora(actividadPrevia.scheduled_time)
        : normalizarHora(horaRecibida);

    if (!hora) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'La hora no es válida. Usa formato HH:mm',
      });
    }

    const prioridad =
      prioridadRecibida === undefined
        ? normalizarPrioridad(actividadPrevia.priority)
        : normalizarPrioridad(prioridadRecibida);

    const valorExp =
      valorExpRecibido === undefined ||
      valorExpRecibido === null ||
      valorExpRecibido === ''
        ? Number(actividadPrevia.exp_value || expPorPrioridad(prioridad))
        : Number(valorExpRecibido);

    if (Number.isNaN(valorExp)) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'valor_exp debe ser numérico',
      });
    }

    const activa =
      activaRecibida === undefined
        ? Number(actividadPrevia.is_active || 0) === 1
        : normalizarBooleano(
            activaRecibida,
            Number(actividadPrevia.is_active || 0) === 1
          );

    const [resultado] = await connection.query(
      `
        UPDATE daily_activities
        SET
          name = ?,
          description = ?,
          repeat_days = ?,
          scheduled_time = ?,
          priority = ?,
          exp_value = ?,
          is_active = ?
        WHERE id = ?
          AND user_id = ?
          AND deleted_at IS NULL
      `,
      [
        nombre,
        descripcion,
        JSON.stringify(dias),
        hora,
        prioridad,
        valorExp,
        activa ? 1 : 0,
        Number(id),
        Number(usuarioId),
      ]
    );

    const actividadActualizada = {
      ...actividadPrevia,
      id: Number(id),
      user_id: Number(usuarioId),
      name: nombre,
      description: descripcion,
      repeat_days: dias,
      scheduled_time: hora,
      priority: prioridad,
      exp_value: valorExp,
      is_active: activa ? 1 : 0,
    };

    await connection.commit();

    const actividadRespuesta = formatearActividadDiaria(actividadActualizada);

    const io = req.app.get('socketio');

    if (io) {
      io.emit('actividad_diaria_editada', actividadRespuesta);
    }

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Actividad diaria editada correctamente',
      actividad: actividadRespuesta,
      affectedRows: resultado.affectedRows,
    });
  } catch (error) {
    await connection.rollback();

    console.error('Error al editar actividad diaria:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al editar actividad diaria',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    connection.release();
  }
};

exports.cambiarEstadoActividadDiaria = async (req, res) => {
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

    const actividadPrevia = await buscarActividadDiariaPorIdYUsuario(
      id,
      usuarioId,
      connection
    );

    if (!actividadPrevia) {
      await connection.rollback();

      return res.status(404).json({
        status: 'error',
        mensaje: 'Actividad diaria no encontrada',
      });
    }

    const activaRecibida = obtenerCampo(req.body, [
      'activa',
      'is_active',
      'isActive',
      'active',
    ]);

    const activaActual = Number(actividadPrevia.is_active || 0) === 1;

    const activaNueva =
      activaRecibida === undefined
        ? !activaActual
        : normalizarBooleano(activaRecibida, activaActual);

    const [resultado] = await connection.query(
      `
        UPDATE daily_activities
        SET is_active = ?
        WHERE id = ?
          AND user_id = ?
          AND deleted_at IS NULL
      `,
      [
        activaNueva ? 1 : 0,
        Number(id),
        Number(usuarioId),
      ]
    );

    const actividadActualizada = {
      ...actividadPrevia,
      is_active: activaNueva ? 1 : 0,
    };

    await connection.commit();

    const actividadRespuesta = formatearActividadDiaria(actividadActualizada);

    const io = req.app.get('socketio');

    if (io) {
      io.emit('actividad_diaria_estado_editado', actividadRespuesta);
      io.emit('actividad_diaria_editada', actividadRespuesta);
    }

    return res.status(200).json({
      status: 'ok',
      mensaje: activaNueva
        ? 'Actividad diaria activada correctamente'
        : 'Actividad diaria pausada correctamente',
      actividad: actividadRespuesta,
      affectedRows: resultado.affectedRows,
    });
  } catch (error) {
    await connection.rollback();

    console.error('Error al cambiar estado de actividad diaria:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al cambiar estado de actividad diaria',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    connection.release();
  }
};

exports.eliminarActividadDiaria = async (req, res) => {
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
        UPDATE daily_activities
        SET deleted_at = NOW(),
            is_active = 0
        WHERE id = ?
          AND user_id = ?
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
        mensaje: 'Actividad diaria no encontrada',
      });
    }

    const io = req.app.get('socketio');

    if (io) {
      io.emit('actividad_diaria_eliminada', {
        id: Number(id),
        usuario_id: Number(usuarioId),
      });
    }

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Actividad diaria eliminada correctamente',
      id: Number(id),
    });
  } catch (error) {
    console.error('Error al eliminar actividad diaria:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al eliminar actividad diaria',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

function obtenerFechaHoyMysql() {
  const fecha = new Date();

  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function obtenerCodigoDiaHoy() {
  const dias = ['D', 'L', 'M', 'MI', 'J', 'V', 'S'];
  const fecha = new Date();

  return dias[fecha.getDay()];
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

function formatearActividadDiariaHoy(row) {
  const actividad = formatearActividadDiaria(row);

  return {
    ...actividad,
    completada_hoy: row.log_id !== null && row.log_id !== undefined,
    completed_at: row.completed_at ? normalizarFechaHoraMysql(row.completed_at) : null,
    exp_awarded: row.exp_awarded === null || row.exp_awarded === undefined
      ? null
      : Number(row.exp_awarded),
  };
}

exports.verActividadesDiariasDeHoy = async (req, res) => {
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
          da.id,
          da.user_id,
          da.name,
          da.description,
          da.repeat_days,
          da.scheduled_time,
          da.priority,
          da.exp_value,
          da.is_active,
          da.created_at,
          da.updated_at,
          dal.id AS log_id,
          dal.completed_at,
          dal.exp_awarded
        FROM daily_activities da
        LEFT JOIN daily_activity_logs dal
          ON dal.daily_activity_id = da.id
          AND dal.user_id = da.user_id
          AND dal.completed_date = ?
        WHERE da.user_id = ?
          AND da.deleted_at IS NULL
          AND da.is_active = 1
          AND JSON_CONTAINS(da.repeat_days, JSON_QUOTE(?))
        ORDER BY da.scheduled_time ASC, da.id DESC
      `,
      [
        fechaHoy,
        Number(usuarioId),
        diaHoy,
      ]
    );

    const actividades = resultados.map(formatearActividadDiariaHoy);

    return res.status(200).json({
      status: 'ok',
      fecha: fechaHoy,
      dia: diaHoy,
      total: actividades.length,
      actividades,
    });
  } catch (error) {
    console.error('Error al consultar actividades diarias de hoy:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al consultar actividades diarias de hoy',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.completarActividadDiariaHoy = async (req, res) => {
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

    const actividadPrevia = await buscarActividadDiariaPorIdYUsuario(
      id,
      usuarioId,
      connection
    );

    if (!actividadPrevia) {
      await connection.rollback();

      return res.status(404).json({
        status: 'error',
        mensaje: 'Actividad diaria no encontrada',
      });
    }

    if (Number(actividadPrevia.is_active || 0) !== 1) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'Esta actividad diaria está pausada',
      });
    }

    const fechaHoy = obtenerFechaHoyMysql();
    const diaHoy = obtenerCodigoDiaHoy();
    const diasActividad = parsearDiasDesdeBD(actividadPrevia.repeat_days);

    if (!diasActividad.includes(diaHoy)) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'Esta misión diaria no corresponde al día de hoy',
        dia_hoy: diaHoy,
        dias_actividad: diasActividad,
      });
    }

    const [logsPrevios] = await connection.query(
      `
        SELECT id
        FROM daily_activity_logs
        WHERE daily_activity_id = ?
          AND user_id = ?
          AND completed_date = ?
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
        mensaje: 'Esta misión diaria ya fue completada hoy',
      });
    }

    const expGanada = Number(actividadPrevia.exp_value || 0);

    const [resultadoLog] = await connection.query(
      `
        INSERT INTO daily_activity_logs (
          daily_activity_id,
          user_id,
          completed_date,
          exp_awarded
        ) VALUES (?, ?, ?, ?)
      `,
      [
        Number(id),
        Number(usuarioId),
        fechaHoy,
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

    await connection.commit();

    const actividadRespuesta = {
      ...formatearActividadDiaria(actividadPrevia),
      completada_hoy: true,
      completed_at: normalizarFechaHoraMysql(new Date()),
      exp_awarded: expGanada,
    };

    const io = req.app.get('socketio');

    if (io) {
      io.emit('actividad_diaria_completada_hoy', {
        actividad: actividadRespuesta,
        usuario: usuarioActualizadoRows[0] || null,
      });
    }

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Misión diaria completada correctamente',
      log_id: resultadoLog.insertId,
      fecha: fechaHoy,
      dia: diaHoy,
      exp_ganada: expGanada,
      actividad: actividadRespuesta,
      usuario: usuarioActualizadoRows[0] || null,
    });
  } catch (error) {
    await connection.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        status: 'error',
        mensaje: 'Esta misión diaria ya fue completada hoy',
      });
    }

    console.error('Error al completar actividad diaria de hoy:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al completar actividad diaria de hoy',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    connection.release();
  }
};