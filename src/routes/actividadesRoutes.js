const express = require('express');
const router = express.Router();

const actividadesController = require('../controllers/actividadesController');
const dailyActivitiesController = require('../controllers/dailyActivitiesController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.get('/tipos', actividadesController.verTiposDelUsuario);
router.get('/', actividadesController.verActividadesDelUsuario);
router.post('/procesar-vencidas', actividadesController.procesarVencidas);

router.get('/diarias', dailyActivitiesController.verActividadesDiariasDelUsuario);
router.get('/diarias/:id', dailyActivitiesController.verActividadDiariaPorId);
router.post('/diarias', dailyActivitiesController.agregarActividadDiaria);
router.put('/diarias/:id', dailyActivitiesController.editarActividadDiaria);
router.put('/diarias/:id/estado', dailyActivitiesController.cambiarEstadoActividadDiaria);
router.delete('/diarias/:id', dailyActivitiesController.eliminarActividadDiaria);

router.get('/:id', actividadesController.verActividadPorId);
router.post('/', actividadesController.agregarActividad);
router.put('/:id/completar', actividadesController.completarActividad);
router.put('/:id/cierre', actividadesController.editarCierreActividad);
router.put('/:id', actividadesController.editarActividad);
router.delete('/:id', actividadesController.eliminarActividad);

module.exports = router;