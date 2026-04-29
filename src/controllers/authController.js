const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'activity_secret_key';

async function calcularNivelPorExp(exp) {
  const expNumerica = Number(exp || 0);

  const [nivelRows] = await db.query(
    `
      SELECT id, nivel, exp_necesario
      FROM nivel
      WHERE exp_necesario <= ?
      ORDER BY exp_necesario DESC
      LIMIT 1
    `,
    [expNumerica]
  );

  const nivelActual = nivelRows[0] || {
    id: 1,
    nivel: 1,
    exp_necesario: 0,
  };

  const [siguienteRows] = await db.query(
    `
      SELECT id, nivel, exp_necesario
      FROM nivel
      WHERE exp_necesario > ?
      ORDER BY exp_necesario ASC
      LIMIT 1
    `,
    [Number(nivelActual.exp_necesario)]
  );

  const siguienteNivel = siguienteRows[0] || null;

  const expNivelActual = Number(nivelActual.exp_necesario || 0);
  const expSiguienteNivel = siguienteNivel
    ? Number(siguienteNivel.exp_necesario || 0)
    : expNivelActual;

  const expEnNivel = expNumerica - expNivelActual;
  const expParaSubir = siguienteNivel ? expSiguienteNivel - expNumerica : 0;

  const rangoNivel = siguienteNivel
    ? expSiguienteNivel - expNivelActual
    : 1;

  const porcentaje = siguienteNivel
    ? Math.max(0, Math.min(100, Math.floor((expEnNivel / rangoNivel) * 100)))
    : 100;

  return {
    nivel: Number(nivelActual.nivel || 1),
    exp_actual: expNumerica,
    exp_nivel_actual: expNivelActual,
    siguiente_nivel: siguienteNivel ? Number(siguienteNivel.nivel) : null,
    exp_siguiente_nivel: siguienteNivel ? expSiguienteNivel : null,
    exp_en_nivel: expEnNivel,
    exp_para_subir: expParaSubir,
    porcentaje,
  };
}

exports.login = async (req, res) => {
  try {
    const { nombre_usuario, contrasena } = req.body;

    if (!nombre_usuario || !contrasena) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Faltan el usuario o la contraseña',
      });
    }

    const [resultados] = await db.query(
      `
        SELECT
          id,
          nombre_usuario,
          correo,
          contrasena,
          exp,
          nivel,
          status,
          alta
        FROM usuario
        WHERE nombre_usuario = ?
        LIMIT 1
      `,
      [nombre_usuario]
    );

    if (!resultados || resultados.length === 0) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'El usuario no existe',
      });
    }

    const usuario = resultados[0];

    if (String(contrasena) !== String(usuario.contrasena)) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'Contraseña incorrecta',
      });
    }

    if (usuario.status && usuario.status !== 'activo') {
      return res.status(403).json({
        status: 'error',
        mensaje: 'Usuario inactivo',
      });
    }

    const nivelInfo = await calcularNivelPorExp(usuario.exp);

    if (Number(usuario.nivel || 1) !== Number(nivelInfo.nivel)) {
      await db.query(
        `
          UPDATE usuario
          SET nivel = ?
          WHERE id = ?
        `,
        [Number(nivelInfo.nivel), Number(usuario.id)]
      );

      usuario.nivel = Number(nivelInfo.nivel);
    }

    const token = jwt.sign(
      {
        id: Number(usuario.id),
        nombre_usuario: usuario.nombre_usuario,
      },
      JWT_SECRET,
      {
        expiresIn: '30d',
      }
    );

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Inicio de sesión correcto',
      token,
      usuario: {
        id: Number(usuario.id),
        nombre_usuario: usuario.nombre_usuario,
        correo: usuario.correo,
        exp: Number(usuario.exp || 0),
        nivel: Number(nivelInfo.nivel || 1),
        status: usuario.status,
        alta: usuario.alta,
      },
      nivel_info: nivelInfo,
    });
  } catch (error) {
    console.error('Error en login:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error en el servidor',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.obtenerNivelUsuario = async (req, res) => {
  try {
    const usuario_id = req.usuario?.id;

    if (!usuario_id) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    const [usuarios] = await db.query(
      `
        SELECT id, nombre_usuario, correo, exp, nivel, status, alta
        FROM usuario
        WHERE id = ?
        LIMIT 1
      `,
      [Number(usuario_id)]
    );

    if (!usuarios || usuarios.length === 0) {
      return res.status(404).json({
        status: 'error',
        mensaje: 'Usuario no encontrado',
      });
    }

    const usuario = usuarios[0];
    const nivelInfo = await calcularNivelPorExp(usuario.exp);

    if (Number(usuario.nivel || 1) !== Number(nivelInfo.nivel)) {
      await db.query(
        `
          UPDATE usuario
          SET nivel = ?
          WHERE id = ?
        `,
        [Number(nivelInfo.nivel), Number(usuario.id)]
      );

      usuario.nivel = Number(nivelInfo.nivel);
    }

    return res.status(200).json({
      status: 'ok',
      usuario: {
        id: Number(usuario.id),
        nombre_usuario: usuario.nombre_usuario,
        correo: usuario.correo,
        exp: Number(usuario.exp || 0),
        nivel: Number(nivelInfo.nivel || 1),
        status: usuario.status,
        alta: usuario.alta,
      },
      nivel_info: nivelInfo,
    });
  } catch (error) {
    console.error('Error al obtener nivel:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al obtener nivel',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};

exports.actualizarExp = async (req, res) => {
  try {
    const usuario_id = req.usuario?.id;
    const { exp } = req.body;

    if (!usuario_id) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No hay usuario en sesión',
      });
    }

    if (exp === undefined || exp === null || Number.isNaN(Number(exp))) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'La experiencia no es válida',
      });
    }

    const nuevaExp = Number(exp);

    const [usuariosPrevios] = await db.query(
      `
        SELECT id, nombre_usuario, correo, exp, nivel, status, alta
        FROM usuario
        WHERE id = ?
        LIMIT 1
      `,
      [Number(usuario_id)]
    );

    if (!usuariosPrevios || usuariosPrevios.length === 0) {
      return res.status(404).json({
        status: 'error',
        mensaje: 'Usuario no encontrado',
      });
    }

    const usuarioPrevio = usuariosPrevios[0];
    const nivelAnterior = Number(usuarioPrevio.nivel || 1);

    const nivelInfo = await calcularNivelPorExp(nuevaExp);
    const nuevoNivel = Number(nivelInfo.nivel || 1);

    await db.query(
      `
        UPDATE usuario
        SET exp = ?,
            nivel = ?
        WHERE id = ?
      `,
      [nuevaExp, nuevoNivel, Number(usuario_id)]
    );

    const subioNivel = nuevoNivel > nivelAnterior;

    const usuarioActualizado = {
      id: Number(usuarioPrevio.id),
      nombre_usuario: usuarioPrevio.nombre_usuario,
      correo: usuarioPrevio.correo,
      exp: nuevaExp,
      nivel: nuevoNivel,
      status: usuarioPrevio.status,
      alta: usuarioPrevio.alta,
    };

    return res.status(200).json({
      status: 'ok',
      mensaje: subioNivel
        ? `Subiste al nivel ${nuevoNivel}`
        : 'Experiencia actualizada',
      usuario: usuarioActualizado,
      nivel_info: nivelInfo,
      nivel_anterior: nivelAnterior,
      nivel_actual: nuevoNivel,
      subio_nivel: subioNivel,
    });
  } catch (error) {
    console.error('Error al actualizar EXP:', error);

    return res.status(500).json({
      status: 'error',
      mensaje: 'Error al actualizar experiencia',
      detalle: error.message,
      codigo: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
};