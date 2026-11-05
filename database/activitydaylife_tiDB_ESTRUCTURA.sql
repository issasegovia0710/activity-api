-- Activity Day Life: estructura TiDB Cloud
-- Fuente: estructura de activitydaylife.sql, respaldo 29/09/2026
-- IMPORTANTE: el archivo contiene la estructura completa de 9 tablas, NO los datos.
-- Para crear el dump con todos los INSERT originales, ejecutar convert_mysql_dump.py
-- sobre el respaldo activitydaylife.sql original. No ejecutar sobre una base con datos.
CREATE DATABASE IF NOT EXISTS `actvitydaylife`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `actvitydaylife`;

CREATE TABLE IF NOT EXISTS `usuario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_usuario` varchar(100) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `exp` int DEFAULT '0',
  `nivel` int NOT NULL DEFAULT '1',
  `status` varchar(20) DEFAULT 'activo',
  `alta` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `nivel` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nivel` int NOT NULL,
  `exp_necesario` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `ejercicios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text,
  `grupo_muscular` varchar(80) DEFAULT NULL,
  `tipo` varchar(80) DEFAULT NULL,
  `duracion_minutos` int NOT NULL DEFAULT '5',
  `valor_exp` int NOT NULL DEFAULT '10',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ejercicios_usuario_id` (`usuario_id`),
  KEY `idx_ejercicios_grupo_muscular` (`grupo_muscular`),
  KEY `idx_ejercicios_activo` (`activo`),
  CONSTRAINT `fk_ejercicios_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `actividades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text,
  `tipo` varchar(50) DEFAULT NULL,
  `prioridad` varchar(20) DEFAULT NULL,
  `valor_exp` int NOT NULL,
  `duracion_horas` decimal(5,2) DEFAULT NULL,
  `fecha_inicio` datetime DEFAULT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  `actividad_autoacompletable` tinyint(1) NOT NULL DEFAULT '0',
  `actividad_origen_id` int DEFAULT NULL,
  `plantilla_id` int DEFAULT NULL,
  `repetecion` text,
  `estatus` varchar(20) DEFAULT 'pendiente',
  `auxiliar` text,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `actividades_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `actividades_ejercicios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text,
  `dias` json NOT NULL,
  `hora_inicio` time NOT NULL DEFAULT '07:00:00',
  `duracion_minutos` int NOT NULL DEFAULT '45',
  `valor_exp_total` int NOT NULL DEFAULT '0',
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_actividades_ejercicios_usuario_id` (`usuario_id`),
  KEY `idx_actividades_ejercicios_activa` (`activa`),
  KEY `idx_actividades_ejercicios_hora_inicio` (`hora_inicio`),
  CONSTRAINT `fk_actividades_ejercicios_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `actividades_ejercicios_detalle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actividad_ejercicio_id` int NOT NULL,
  `ejercicio_id` int NOT NULL,
  `orden` int NOT NULL DEFAULT '1',
  `series` int NOT NULL DEFAULT '3',
  `repeticiones` varchar(50) DEFAULT NULL,
  `duracion_minutos` int NOT NULL DEFAULT '5',
  `descanso_segundos` int NOT NULL DEFAULT '60',
  `valor_exp` int NOT NULL DEFAULT '10',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_actividad_ejercicio_detalle_actividad` (`actividad_ejercicio_id`),
  KEY `idx_actividad_ejercicio_detalle_ejercicio` (`ejercicio_id`),
  CONSTRAINT `fk_actividad_ejercicio_detalle_actividad` FOREIGN KEY (`actividad_ejercicio_id`) REFERENCES `actividades_ejercicios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_actividad_ejercicio_detalle_ejercicio` FOREIGN KEY (`ejercicio_id`) REFERENCES `ejercicios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `actividades_ejercicios_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actividad_ejercicio_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `fecha` date NOT NULL,
  `completada_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `duracion_real_minutos` int DEFAULT NULL,
  `exp_ganada` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_actividad_ejercicio_usuario_fecha` (`actividad_ejercicio_id`,`usuario_id`,`fecha`),
  KEY `idx_actividades_ejercicios_logs_usuario_fecha` (`usuario_id`,`fecha`),
  CONSTRAINT `fk_actividades_ejercicios_logs_actividad` FOREIGN KEY (`actividad_ejercicio_id`) REFERENCES `actividades_ejercicios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_actividades_ejercicios_logs_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `daily_activities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text,
  `repeat_days` json NOT NULL,
  `scheduled_time` time NOT NULL,
  `priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
  `exp_value` int NOT NULL DEFAULT '15',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_daily_activities_user_id` (`user_id`),
  KEY `idx_daily_activities_priority` (`priority`),
  KEY `idx_daily_activities_active` (`is_active`),
  KEY `idx_daily_activities_scheduled_time` (`scheduled_time`),
  CONSTRAINT `fk_daily_activities_user` FOREIGN KEY (`user_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `daily_activity_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `daily_activity_id` int NOT NULL,
  `user_id` int NOT NULL,
  `completed_date` date NOT NULL,
  `completed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `exp_awarded` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_daily_activity_user_date` (`daily_activity_id`,`user_id`,`completed_date`),
  KEY `idx_daily_activity_logs_user_date` (`user_id`,`completed_date`),
  KEY `idx_daily_activity_logs_activity` (`daily_activity_id`),
  CONSTRAINT `fk_daily_activity_logs_activity` FOREIGN KEY (`daily_activity_id`) REFERENCES `daily_activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_daily_activity_logs_user` FOREIGN KEY (`user_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
