const express = require('express');
const router = express.Router();

const actividadesController = require('../controllers/actividadesController');
const dailyActivitiesController = require('../controllers/dailyActivitiesController');
const ejerciciosController = require('../controllers/ejerciciosController');
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

router.get('/diarias', dailyActivitiesController.verActividadesDiariasDelUsuario);
router.get('/diarias/hoy', dailyActivitiesController.verActividadesDiariasDeHoy);
router.put('/diarias/:id/completar-hoy', dailyActivitiesController.completarActividadDiariaHoy);
router.get('/diarias/:id', dailyActivitiesController.verActividadDiariaPorId);
router.post('/diarias', dailyActivitiesController.agregarActividadDiaria);
router.put('/diarias/:id', dailyActivitiesController.editarActividadDiaria);
router.put('/diarias/:id/estado', dailyActivitiesController.cambiarEstadoActividadDiaria);
router.delete('/diarias/:id', dailyActivitiesController.eliminarActividadDiaria);

// ===============================
// EJERCICIOS Y RUTINAS
// Base: /api/actividades/ejercicios
// ===============================

router.get('/ejercicios', ejerciciosController.verEjerciciosDelUsuario);
router.post('/ejercicios', ejerciciosController.agregarEjercicio);

router.get('/ejercicios/rutinas', ejerciciosController.verRutinasEjercicioDelUsuario);
router.get('/ejercicios/rutinas/hoy', ejerciciosController.verRutinasEjercicioHoy);
router.put('/ejercicios/rutinas/:id/completar-hoy', ejerciciosController.completarRutinaEjercicioHoy);
router.get('/ejercicios/rutinas/:id', ejerciciosController.verRutinaEjercicioPorId);
router.post('/ejercicios/rutinas', ejerciciosController.agregarRutinaEjercicio);
router.put('/ejercicios/rutinas/:id', ejerciciosController.editarRutinaEjercicio);
router.put('/ejercicios/rutinas/:id/estado', ejerciciosController.cambiarEstadoRutinaEjercicio);
router.delete('/ejercicios/rutinas/:id', ejerciciosController.eliminarRutinaEjercicio);

router.get('/ejercicios/:id', ejerciciosController.verEjercicioPorId);
router.put('/ejercicios/:id', ejerciciosController.editarEjercicio);
router.delete('/ejercicios/:id', ejerciciosController.eliminarEjercicio);

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