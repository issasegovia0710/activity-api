const express = require('express');
const router = express.Router();

const actividadesController = require('../controllers/actividadesController');
const dailyActivitiesController = require('../controllers/dailyActivitiesController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// ===============================
// ACTIVIDADES NORMALES
// ===============================

router.get('/tipos', actividadesController.verTiposDelUsuario);
router.get('/', actividadesController.verActividadesDelUsuario);
router.post('/procesar-vencidas', actividadesController.procesarVencidas);

// ===============================
// ACTIVIDADES DIARIAS
// Base: /api/actividades/diarias
// ===============================

// Ver todas las plantillas diarias del usuario
router.get('/diarias', dailyActivitiesController.verActividadesDiariasDelUsuario);

// Ver solo las misiones diarias que aplican hoy
router.get('/diarias/hoy', dailyActivitiesController.verActividadesDiariasDeHoy);

// Completar una misión diaria solo por el día actual
router.put('/diarias/:id/completar-hoy', dailyActivitiesController.completarActividadDiariaHoy);

// Ver una misión diaria por ID
router.get('/diarias/:id', dailyActivitiesController.verActividadDiariaPorId);

// Crear una misión diaria
router.post('/diarias', dailyActivitiesController.agregarActividadDiaria);

// Editar una misión diaria
router.put('/diarias/:id', dailyActivitiesController.editarActividadDiaria);

// Activar o pausar una misión diaria
router.put('/diarias/:id/estado', dailyActivitiesController.cambiarEstadoActividadDiaria);

// Eliminar una misión diaria
router.delete('/diarias/:id', dailyActivitiesController.eliminarActividadDiaria);

// ===============================
// ACTIVIDADES NORMALES DINÁMICAS
// Estas van al final
// ===============================

router.get('/:id', actividadesController.verActividadPorId);

router.post('/', actividadesController.agregarActividad);

router.put('/:id/completar', actividadesController.completarActividad);

router.put('/:id/cierre', actividadesController.editarCierreActividad);

router.put('/:id', actividadesController.editarActividad);

router.delete('/:id', actividadesController.eliminarActividad);

module.exports = router;