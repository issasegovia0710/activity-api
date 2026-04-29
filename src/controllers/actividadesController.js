const db = require('../config/db');

const DIAS_ORDEN = ['D', 'L', 'M', 'MI', 'J', 'V', 'S'];
const DIAS_TODOS = ['L', 'M', 'MI', 'J', 'V', 'S', 'D'];
const DIAS_LV = ['L', 'M', 'MI', 'J', 'V'];
const DIAS_SD = ['S', 'D'];

function normalizarHora(hora) {
  const horaTexto = String(hora || '').trim();

  if (!horaTexto) {
    return null;
  }

  const partes = horaTexto.split(':');

  if (partes.length < 2) {
    return null;
  }

  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);

  if (
    Number.isNaN(horas) ||
    Number.isNaN(minutos) ||
    horas < 0 ||
    horas > 23 ||
    minutos < 0 ||
    minutos > 59
  ) {
    return null;
  }

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

function crearFechaLocal(year, month, day, hours, minutes, seconds = 0) {
  const fecha = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds),
    0
  );

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  return fecha;
}

function fechaMysqlADate(valor) {
  if (!valor) {
    return null;
  }

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) {
      return null;
    }

    return valor;
  }

  const textoOriginal = String(valor).trim();

  if (!textoOriginal) {
    return null;
  }

  const texto = textoOriginal.replace('T', ' ').replace('Z', '').trim();

  const matchMysql = texto.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/
  );

  if (matchMysql) {
    return crearFechaLocal(
      matchMysql[1],
      matchMysql[2],
      matchMysql[3],
      matchMysql[4],
      matchMysql[5],
      matchMysql[6] || 0
    );
  }

  const matchDateOnly = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (matchDateOnly) {
    return crearFechaLocal(
      matchDateOnly[1],
      matchDateOnly[2],
      matchDateOnly[3],
      0,
      0,
      0
    );
  }

  const fecha = new Date(textoOriginal);

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  return fecha;
}

function normalizarFechaMysql(valor) {
  const fecha = fechaMysqlADate(valor);

  if (!fecha) {
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

function sumarHoras(fechaInicio, duracionHoras) {
  const fecha = fechaMysqlADate(fechaInicio);

  if (!fecha) {
    return null;
  }

  const duracion = Number(duracionHoras);

  if (Number.isNaN(duracion) || duracion <= 0) {
    return normalizarFechaMysql(fecha);
  }

  const minutos = Math.round(duracion * 60);

  fecha.setMinutes(fecha.getMinutes() + minutos);

  return normalizarFechaMysql(fecha);
}

function sumarUnaHora(fechaBase) {
  const fecha = fechaMysqlADate(fechaBase);

  if (!fecha) {
    return null;
  }

  fecha.setHours(fecha.getHours() + 1);

  return normalizarFechaMysql(fecha);
}

function leerAuxiliar(auxiliar) {
  if (!auxiliar) {
    return {};
  }

  try {
    const parsed = JSON.parse(auxiliar);

    if (parsed && typeof parsed === 'object') {
      return parsed;
    }

    return {};
  } catch (error) {
    return {};
  }
}

function obtenerCodigoDia(fecha) {
  const f = fechaMysqlADate(fecha);

  if (!f) {
    return null;
  }

  return DIAS_ORDEN[f.getDay()];
}

function obtenerHoraDeFecha(fecha) {
  const f = fechaMysqlADate(fecha);

  if (!f) {
    return '08:00';
  }

  const horas = String(f.getHours()).padStart(2, '0');
  const minutos = String(f.getMinutes()).padStart(2, '0');

  return `${horas}:${minutos}`;
}

function aplicarHoraAFecha(fechaBase, horaTexto) {
  const horaNormalizada = normalizarHora(horaTexto);

  if (!horaNormalizada) {
    return null;
  }

  const fecha = fechaMysqlADate(fechaBase);

  if (!fecha) {
    return null;
  }

  const [horas, minutos] = horaNormalizada.split(':').map(Number);

  fecha.setHours(horas, minutos, 0, 0);

  return fecha;
}

function parsearDiasPersonalizados(repetecion) {
  if (!repetecion) {
    return [];
  }

  return String(repetecion)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const partes = item.split('-');

      return {
        dia: String(partes[0] || '').trim(),
        hora: normalizarHora(partes[1]),
      };
    })
    .filter((item) => item.dia && item.hora);
}

function obtenerDiasPermitidosPorRepeticion(repetecion) {
  const texto = String(repetecion || '').trim().toLowerCase();

  if (texto === 'diario') {
    return DIAS_TODOS;
  }

  if (texto === 'lunes a viernes') {
    return DIAS_LV;
  }

  if (texto === 'sabado domingo' || texto === 'sábado domingo') {
    return DIAS_SD;
  }

  return null;
}

function buscarProximaFechaDesdeAhora(diasPermitidos, horaTexto) {
  const horaNormalizada = normalizarHora(horaTexto);

  if (!horaNormalizada || !Array.isArray(diasPermitidos) || diasPermitidos.length === 0) {
    return null;
  }

  const ahora = new Date();

  for (let i = 0; i <= 21; i += 1) {
    const base = new Date(ahora);
    base.setDate(ahora.getDate() + i);

    const codigoDia = obtenerCodigoDia(base);

    if (!diasPermitidos.includes(codigoDia)) {
      continue;
    }

    const candidata = aplicarHoraAFecha(base, horaNormalizada);

    if (!candidata) {
      continue;
    }

    if (candidata > ahora) {
      return normalizarFechaMysql(candidata);
    }
  }

  return null;
}

function calcularFechaInicioSegura(fechaInicioRecibida, repetecion) {
  const textoRepeticion = String(repetecion || '').trim().toLowerCase();

  if (!textoRepeticion || textoRepeticion === 'una vez') {
    return normalizarFechaMysql(fechaInicioRecibida);
  }

  const fechaRecibida = fechaMysqlADate(fechaInicioRecibida);

  if (!fechaRecibida) {
    return null;
  }

  const horaBase = obtenerHoraDeFecha(fechaRecibida);
  const ahora = new Date();

  const diasFijos = obtenerDiasPermitidosPorRepeticion(textoRepeticion);

  if (diasFijos) {
    const fechaConHora = aplicarHoraAFecha(fechaRecibida, horaBase);
    const codigoFechaRecibida = obtenerCodigoDia(fechaRecibida);

    if (
      fechaConHora &&
      fechaConHora > ahora &&
      diasFijos.includes(codigoFechaRecibida)
    ) {
      return normalizarFechaMysql(fechaConHora);
    }

    return buscarProximaFechaDesdeAhora(diasFijos, horaBase);
  }

  const personalizados = parsearDiasPersonalizados(repetecion);

  if (personalizados.length > 0) {
    const candidatas = [];

    for (const item of personalizados) {
      const proximaFecha = buscarProximaFechaDesdeAhora([item.dia], item.hora);

      if (proximaFecha) {
        const fechaCandidata = fechaMysqlADate(proximaFecha);

        if (fechaCandidata) {
          candidatas.push({
            fecha: proximaFecha,
            timestamp: fechaCandidata.getTime(),
          });
        }
      }
    }

    if (candidatas.length === 0) {
      return null;
    }

    candidatas.sort((a, b) => a.timestamp - b.timestamp);

    return candidatas[0].fecha;
  }

  return normalizarFechaMysql(fechaInicioRecibida);
}

function calcularSiguienteFechaInicio(actividad) {
  const repetecion = String(actividad.repetecion || '').trim().toLowerCase();

  if (!repetecion || repetecion === 'una vez') {
    return null;
  }

  const fechaBase = fechaMysqlADate(actividad.fecha_inicio);

  if (!fechaBase) {
    return null;
  }

  const diasFijos = obtenerDiasPermitidosPorRepeticion(repetecion);

  if (diasFijos) {
    const horaBase = obtenerHoraDeFecha(actividad.fecha_inicio);

    for (let i = 1; i <= 21; i += 1) {
      const candidataBase = new Date(fechaBase);
      candidataBase.setDate(fechaBase.getDate() + i);

      const codigoDia = obtenerCodigoDia(candidataBase);

      if (!diasFijos.includes(codigoDia)) {
        continue;
      }

      const candidata = aplicarHoraAFecha(candidataBase, horaBase);

      if (candidata) {
        return normalizarFechaMysql(candidata);
      }
    }

    return null;
  }

  const personalizados = parsearDiasPersonalizados(actividad.repetecion);

  if (personalizados.length > 0) {
    const candidatas = [];

    for (const item of personalizados) {
      for (let i = 1; i <= 21; i += 1) {
        const candidataBase = new Date(fechaBase);
        candidataBase.setDate(fechaBase.getDate() + i);

        const codigoDia = obtenerCodigoDia(candidataBase);

        if (codigoDia !== item.dia) {
          continue;
        }

        const candidata = aplicarHoraAFecha(candidataBase, item.hora);

        if (candidata) {
          candidatas.push({
            fecha: normalizarFechaMysql(candidata),
            timestamp: candidata.getTime(),
          });
        }

        break;
      }
    }

    if (candidatas.length === 0) {
      return null;
    }

    candidatas.sort((a, b) => a.timestamp - b.timestamp);

    return candidatas[0].fecha;
  }

  return null;
}

async function crearSiguienteActividadSiAplica(connection, actividad) {
  const siguienteFechaInicio = calcularSiguienteFechaInicio(actividad);

  if (!siguienteFechaInicio) {
    return null;
  }

  const siguienteFechaFin = sumarHoras(siguienteFechaInicio, actividad.duracion_horas);
  const plantillaId = actividad.plantilla_id || actividad.id;

  const [duplicadas] = await connection.query(
    `
      SELECT id
      FROM actividades
      WHERE usuario_id = ?
        AND fecha_inicio = ?
        AND (
          plantilla_id = ?
          OR id = ?
        )
      LIMIT 1
    `,
    [
      Number(actividad.usuario_id),
      siguienteFechaInicio,
      Number(plantillaId),
      Number(plantillaId),
    ]
  );

  if (duplicadas && duplicadas.length > 0) {
    return duplicadas[0].id;
  }

  const sql = `
    INSERT INTO actividades (
      usuario_id,
      nombre,
      descripcion,
      tipo,
      prioridad,
      valor_exp,
      duracion_horas,
      fecha_inicio,
      fecha_fin,
      actividad_autoacompletable,
      plantilla_id,
      repetecion,
      estatus,
      auxiliar
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const valores = [
    Number(actividad.usuario_id),
    actividad.nombre,
    actividad.descripcion || null,
    actividad.tipo || null,
    actividad.prioridad || null,
    Number(actividad.valor_exp || 0),
    actividad.duracion_horas === undefined ||
    actividad.duracion_horas === null ||
    actividad.duracion_horas === ''
      ? null
      : Number(actividad.duracion_horas),
    siguienteFechaInicio,
    siguienteFechaFin,
    Number(actividad.actividad_autoacompletable || 0),
    Number(plantillaId),
    actividad.repetecion || null,
    'pendiente',
    null,
  ];

  const [resultado] = await connection.query(sql, valores);

  return resultado.insertId;
}

exports.verTiposDelUsuario = async (req, res) => {
  try {
    const usuario_id = req.usuario?.id;

    if (!usuario_id) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const sql = `
      SELECT DISTINCT tipo
      FROM actividades
      WHERE usuario_id = ?
        AND tipo IS NOT NULL
        AND tipo <> ''
      ORDER BY tipo ASC
    `;

    const [resultados] = await db.query(sql, [Number(usuario_id)]);

    const tipos = resultados.map((item, index) => ({
      id: index + 1,
      nombre: item.tipo,
    }));

    return res.status(200).json({
      status: 'ok',
      total: tipos.length,
      tipos,
    });
  } catch (error) {
    console.error('Error al consultar tipos:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al consultar tipos',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.verActividadesDelUsuario = async (req, res) => {
  try {
    const usuario_id = req.usuario?.id;

    if (!usuario_id) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const sql = `
      SELECT
        id,
        usuario_id,
        nombre,
        descripcion,
        tipo,
        prioridad,
        valor_exp,
        duracion_horas,
        fecha_inicio,
        fecha_fin,
        actividad_autoacompletable,
        plantilla_id,
        repetecion,
        estatus,
        auxiliar
      FROM actividades
      WHERE usuario_id = ?
      ORDER BY fecha_inicio ASC, id DESC
    `;

    const [resultados] = await db.query(sql, [Number(usuario_id)]);

    return res.status(200).json({
      status: 'ok',
      total: resultados.length,
      actividades: resultados,
    });
  } catch (error) {
    console.error('Error al consultar actividades:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al consultar actividades',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.verActividadPorId = async (req, res) => {
  try {
    const usuario_id = req.usuario?.id;
    const { id } = req.params;

    if (!usuario_id) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const sql = `
      SELECT
        id,
        usuario_id,
        nombre,
        descripcion,
        tipo,
        prioridad,
        valor_exp,
        duracion_horas,
        fecha_inicio,
        fecha_fin,
        actividad_autoacompletable,
        plantilla_id,
        repetecion,
        estatus,
        auxiliar
      FROM actividades
      WHERE id = ?
        AND usuario_id = ?
      LIMIT 1
    `;

    const [resultados] = await db.query(sql, [Number(id), Number(usuario_id)]);

    if (!resultados || resultados.length === 0) {
      return res.status(404).json({
        status: 'error',
        mensaje: 'Actividad no encontrada',
      });
    }

    return res.status(200).json({
      status: 'ok',
      actividad: resultados[0],
    });
  } catch (error) {
    console.error('Error al consultar actividad:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al consultar la actividad',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.agregarActividad = async (req, res) => {
  try {
    const usuario_id = req.usuario?.id;

    const {
      nombre,
      descripcion,
      tipo,
      prioridad,
      valor_exp,
      duracion_horas,
      fecha_inicio,
      actividad_autoacompletable,
      repetecion,
      estatus,
      auxiliar,
    } = req.body;

    if (!usuario_id) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Falta el nombre de la actividad',
      });
    }

    if (valor_exp === undefined || valor_exp === null || Number.isNaN(Number(valor_exp))) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Falta valor_exp o no es numérico',
      });
    }

    if (!fecha_inicio) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Falta fecha_inicio',
      });
    }

    const fechaInicioMysql = calcularFechaInicioSegura(fecha_inicio, repetecion);

    if (!fechaInicioMysql) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'No se pudo calcular una fecha_inicio válida',
        body_recibido: req.body,
      });
    }

    const fechaFinMysql = sumarHoras(fechaInicioMysql, duracion_horas);

    const sql = `
      INSERT INTO actividades (
        usuario_id,
        nombre,
        descripcion,
        tipo,
        prioridad,
        valor_exp,
        duracion_horas,
        fecha_inicio,
        fecha_fin,
        actividad_autoacompletable,
        plantilla_id,
        repetecion,
        estatus,
        auxiliar
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valores = [
      Number(usuario_id),
      String(nombre).trim(),
      descripcion && String(descripcion).trim() ? String(descripcion).trim() : null,
      tipo && String(tipo).trim() ? String(tipo).trim() : null,
      prioridad && String(prioridad).trim() ? String(prioridad).trim() : null,
      Number(valor_exp),
      duracion_horas === undefined ||
      duracion_horas === null ||
      duracion_horas === ''
        ? null
        : Number(duracion_horas),
      fechaInicioMysql,
      fechaFinMysql,
      Number(actividad_autoacompletable || 0),
      null,
      repetecion && String(repetecion).trim() ? String(repetecion).trim() : null,
      estatus && String(estatus).trim() ? String(estatus).trim() : 'pendiente',
      auxiliar && String(auxiliar).trim() ? String(auxiliar).trim() : null,
    ];

    const [resultado] = await db.query(sql, valores);

    const actividadCreada = {
      id: resultado.insertId,
      usuario_id: Number(usuario_id),
      nombre: String(nombre).trim(),
      descripcion: descripcion || null,
      tipo: tipo || null,
      prioridad: prioridad || null,
      valor_exp: Number(valor_exp),
      duracion_horas:
        duracion_horas === undefined ||
        duracion_horas === null ||
        duracion_horas === ''
          ? null
          : Number(duracion_horas),
      fecha_inicio: fechaInicioMysql,
      fecha_fin: fechaFinMysql,
      actividad_autoacompletable: Number(actividad_autoacompletable || 0),
      plantilla_id: null,
      repetecion: repetecion || null,
      estatus: estatus || 'pendiente',
      auxiliar: auxiliar || null,
    };

    const io = req.app.get('socketio');

    if (io) {
      io.emit('actividad_creada', actividadCreada);
    }

    return res.status(201).json({
      status: 'ok',
      mensaje: 'Actividad agregada correctamente',
      id: resultado.insertId,
      actividad: actividadCreada,
    });
  } catch (error) {
    console.error('Error al agregar actividad:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al agregar la actividad',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.completarActividad = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const usuario_id = req.usuario?.id;
    const { id } = req.params;

    if (!usuario_id) {
      await connection.rollback();

      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const [actividadesPrevias] = await connection.query(
      `
        SELECT *
        FROM actividades
        WHERE id = ?
          AND usuario_id = ?
        LIMIT 1
      `,
      [Number(id), Number(usuario_id)]
    );

    if (!actividadesPrevias || actividadesPrevias.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: 'error',
        mensaje: 'Actividad no encontrada',
      });
    }

    const actividadPrevia = actividadesPrevias[0];

    if (actividadPrevia.estatus === 'completada') {
      await connection.commit();

      return res.status(200).json({
        status: 'ok',
        mensaje: 'La actividad ya estaba completada',
        actividad: actividadPrevia,
        siguiente_actividad_id: null,
      });
    }

    await connection.query(
      `
        UPDATE actividades
        SET estatus = 'completada'
        WHERE id = ?
          AND usuario_id = ?
      `,
      [Number(id), Number(usuario_id)]
    );

    let siguienteActividadId = null;

    const repetecion = String(actividadPrevia.repetecion || '').trim().toLowerCase();

    if (repetecion && repetecion !== 'una vez') {
      siguienteActividadId = await crearSiguienteActividadSiAplica(
        connection,
        actividadPrevia
      );
    }

    await connection.commit();

    const io = req.app.get('socketio');

    if (io) {
      io.emit('actividad_completada', {
        id: Number(id),
        usuario_id: Number(usuario_id),
        siguiente_actividad_id: siguienteActividadId,
      });
    }

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Actividad completada correctamente',
      actividad_completada: {
        id: Number(actividadPrevia.id),
        usuario_id: Number(actividadPrevia.usuario_id),
        nombre: actividadPrevia.nombre,
        fecha_inicio: actividadPrevia.fecha_inicio,
        fecha_fin: actividadPrevia.fecha_fin,
        estatus: 'completada',
      },
      siguiente_actividad_id: siguienteActividadId,
    });
  } catch (error) {
    await connection.rollback();

    console.error('Error al completar actividad:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al completar actividad',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    connection.release();
  }
};

exports.editarActividad = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const usuario_id = req.usuario?.id;
    const { id } = req.params;

    const {
      nombre,
      descripcion,
      tipo,
      prioridad,
      valor_exp,
      duracion_horas,
      fecha_inicio,
      actividad_autoacompletable,
      repetecion,
      estatus,
      auxiliar,
    } = req.body;

    if (!usuario_id) {
      await connection.rollback();

      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const [actividadesPrevias] = await connection.query(
      `
        SELECT *
        FROM actividades
        WHERE id = ?
          AND usuario_id = ?
        LIMIT 1
      `,
      [Number(id), Number(usuario_id)]
    );

    if (!actividadesPrevias || actividadesPrevias.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: 'error',
        mensaje: 'Actividad no encontrada',
      });
    }

    const actividadPrevia = actividadesPrevias[0];

    if (!nombre || !String(nombre).trim()) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'Falta el nombre de la actividad',
      });
    }

    if (valor_exp === undefined || valor_exp === null || Number.isNaN(Number(valor_exp))) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'Falta valor_exp o no es numérico',
      });
    }

    const nuevoEstatus =
      estatus && String(estatus).trim()
        ? String(estatus).trim()
        : actividadPrevia.estatus || 'pendiente';

    const cambioACompletada =
      actividadPrevia.estatus === 'pendiente' &&
      nuevoEstatus === 'completada';

    let fechaInicioMysql = normalizarFechaMysql(actividadPrevia.fecha_inicio);

    const seMandoFechaNueva =
      fecha_inicio !== undefined &&
      fecha_inicio !== null &&
      String(fecha_inicio).trim() !== '';

    if (seMandoFechaNueva && !cambioACompletada) {
      fechaInicioMysql = calcularFechaInicioSegura(fecha_inicio, repetecion);
    }

    if (!fechaInicioMysql) {
      await connection.rollback();

      return res.status(400).json({
        status: 'error',
        mensaje: 'No se pudo calcular una fecha_inicio válida',
      });
    }

    const duracionFinal =
      duracion_horas === undefined ||
      duracion_horas === null ||
      duracion_horas === ''
        ? null
        : Number(duracion_horas);

    const fechaFinMysql = sumarHoras(fechaInicioMysql, duracionFinal);

    const sql = `
      UPDATE actividades
      SET
        nombre = ?,
        descripcion = ?,
        tipo = ?,
        prioridad = ?,
        valor_exp = ?,
        duracion_horas = ?,
        fecha_inicio = ?,
        fecha_fin = ?,
        actividad_autoacompletable = ?,
        repetecion = ?,
        estatus = ?,
        auxiliar = ?
      WHERE id = ?
        AND usuario_id = ?
    `;

    const valores = [
      String(nombre).trim(),
      descripcion && String(descripcion).trim() ? String(descripcion).trim() : null,
      tipo && String(tipo).trim() ? String(tipo).trim() : null,
      prioridad && String(prioridad).trim() ? String(prioridad).trim() : null,
      Number(valor_exp),
      duracionFinal,
      fechaInicioMysql,
      fechaFinMysql,
      Number(actividad_autoacompletable || 0),
      repetecion && String(repetecion).trim() ? String(repetecion).trim() : null,
      nuevoEstatus,
      auxiliar && String(auxiliar).trim() ? String(auxiliar).trim() : null,
      Number(id),
      Number(usuario_id),
    ];

    const [resultado] = await connection.query(sql, valores);

    const actividadActualizada = {
      ...actividadPrevia,
      id: Number(id),
      usuario_id: Number(usuario_id),
      nombre: String(nombre).trim(),
      descripcion: descripcion || null,
      tipo: tipo || null,
      prioridad: prioridad || null,
      valor_exp: Number(valor_exp),
      duracion_horas: duracionFinal,
      fecha_inicio: fechaInicioMysql,
      fecha_fin: fechaFinMysql,
      actividad_autoacompletable: Number(actividad_autoacompletable || 0),
      repetecion: repetecion || null,
      estatus: nuevoEstatus,
      auxiliar: auxiliar || null,
    };

    let siguienteActividadId = null;

    if (cambioACompletada) {
      siguienteActividadId = await crearSiguienteActividadSiAplica(
        connection,
        {
          ...actividadActualizada,
          fecha_inicio: actividadPrevia.fecha_inicio,
          fecha_fin: actividadPrevia.fecha_fin,
        }
      );
    }

    await connection.commit();

    const io = req.app.get('socketio');

    if (io) {
      io.emit('actividad_editada', actividadActualizada);
    }

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Actividad editada correctamente',
      actividad: actividadActualizada,
      siguiente_actividad_id: siguienteActividadId,
      affectedRows: resultado.affectedRows,
    });
  } catch (error) {
    await connection.rollback();

    console.error('Error al editar actividad:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al editar la actividad',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    connection.release();
  }
};

exports.eliminarActividad = async (req, res) => {
  try {
    const usuario_id = req.usuario?.id;
    const { id } = req.params;

    if (!usuario_id) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const sql = `
      DELETE FROM actividades
      WHERE id = ?
        AND usuario_id = ?
    `;

    const [resultado] = await db.query(sql, [Number(id), Number(usuario_id)]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        mensaje: 'Actividad no encontrada',
      });
    }

    const io = req.app.get('socketio');

    if (io) {
      io.emit('actividad_eliminada', {
        id: Number(id),
        usuario_id: Number(usuario_id),
      });
    }

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Actividad eliminada correctamente',
      id: Number(id),
    });
  } catch (error) {
    console.error('Error al eliminar actividad:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al eliminar la actividad',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.procesarVencidas = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const usuario_id = req.usuario?.id;

    if (!usuario_id) {
      await connection.rollback();

      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const [vencidas] = await connection.query(
      `
        SELECT *
        FROM actividades
        WHERE usuario_id = ?
          AND estatus = 'pendiente'
          AND actividad_autoacompletable = 1
          AND fecha_fin IS NOT NULL
          AND DATE_ADD(fecha_fin, INTERVAL 1 HOUR) < NOW()
      `,
      [Number(usuario_id)]
    );

    let penalizacionTotal = 0;
    const procesadas = [];

    for (const actividad of vencidas) {
      const penalizacion = Math.ceil(Number(actividad.valor_exp || 0) / 2);
      const auxiliarActual = leerAuxiliar(actividad.auxiliar);
      const limiteAutoacompletado = sumarUnaHora(actividad.fecha_fin);

      const nuevoAuxiliar = {
        ...auxiliarActual,
        autoacompletada: true,
        cumplida: false,
        fecha_autoacompletado: normalizarFechaMysql(new Date()),
        penalizacion_xp: penalizacion,
        limite_autoacompletado: limiteAutoacompletado,
      };

      await connection.query(
        `
          UPDATE actividades
          SET estatus = 'no_cumplida',
              auxiliar = ?
          WHERE id = ?
            AND usuario_id = ?
        `,
        [
          JSON.stringify(nuevoAuxiliar),
          Number(actividad.id),
          Number(usuario_id),
        ]
      );

      await connection.query(
        `
          UPDATE usuario
          SET exp = exp - ?
          WHERE id = ?
        `,
        [penalizacion, Number(usuario_id)]
      );

      const siguienteActividadId = await crearSiguienteActividadSiAplica(
        connection,
        {
          ...actividad,
          estatus: 'no_cumplida',
        }
      );

      penalizacionTotal += penalizacion;

      procesadas.push({
        id: actividad.id,
        nombre: actividad.nombre,
        fecha_inicio: actividad.fecha_inicio,
        fecha_fin: actividad.fecha_fin,
        limite_autoacompletado: limiteAutoacompletado,
        penalizacion,
        siguiente_actividad_id: siguienteActividadId,
      });
    }

    const [usuarioActualizadoRows] = await connection.query(
      `
        SELECT id, nombre_usuario, correo, exp, status, alta, nivel
        FROM usuario
        WHERE id = ?
        LIMIT 1
      `,
      [Number(usuario_id)]
    );

    await connection.commit();

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Actividades vencidas procesadas correctamente',
      total_procesadas: procesadas.length,
      penalizacion_total: penalizacionTotal,
      procesadas,
      usuario: usuarioActualizadoRows[0] || null,
    });
  } catch (error) {
    await connection.rollback();

    console.error('Error al procesar vencidas:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al procesar actividades vencidas',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    connection.release();
  }
};