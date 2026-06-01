const express = require('express');
const router = express.Router();

const actividadesController = require('../controllers/actividadesController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.get('/tipos', actividadesController.verTiposDelUsuario);
router.get('/', actividadesController.verActividadesDelUsuario);
router.post('/procesar-vencidas', actividadesController.procesarVencidas);
router.get('/:id', actividadesController.verActividadPorId);
router.post('/', actividadesController.agregarActividad);

router.put('/:id/completar', actividadesController.completarActividad);

// NUEVO: solo edita fecha/hora de cierre
router.put('/:id/cierre', actividadesController.editarCierreActividad);

router.put('/:id', actividadesController.editarActividad);
router.delete('/:id', actividadesController.eliminarActividad);

module.exports = router;