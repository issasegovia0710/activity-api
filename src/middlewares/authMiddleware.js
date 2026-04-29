const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'activity_secret_key';

exports.verificarToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'No se envió token',
      });
    }

    const partes = String(authHeader).split(' ');

    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return res.status(401).json({
        status: 'error',
        mensaje: 'Formato de token inválido',
      });
    }

    const token = partes[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    req.usuario = {
      id: decoded.id,
      nombre_usuario: decoded.nombre_usuario,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      mensaje: 'Sesión inválida o expirada',
      detalle: error.message,
    });
  }
};