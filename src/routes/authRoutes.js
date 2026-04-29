const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.post('/login', authController.login);

router.get('/nivel', verificarToken, authController.obtenerNivelUsuario);
router.put('/exp', verificarToken, authController.actualizarExp);

module.exports = router;