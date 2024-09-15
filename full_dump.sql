/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.5.2-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: superjoin
-- ------------------------------------------------------
-- Server version	11.5.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `People`
--

DROP TABLE IF EXISTS `People`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `People` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(50) DEFAULT NULL,
  `Role` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `People`
--

LOCK TABLES `People` WRITE;
/*!40000 ALTER TABLE `People` DISABLE KEYS */;
INSERT INTO `People` VALUES
(1,'First','JS'),
(2,'Second','Python'),
(3,'Third','CySec'),
(4,'Fourth','CySec'),
(5,'Fifth','CySec'),
(6,'Sixth','Python'),
(7,'Seventh','JS'),
(8,'Eighth','JS'),
(9,'Ninth','JS'),
(10,'Tenth','CySec'),
(11,'Eleventh','Python'),
(12,'Twelfth','CySec'),
(13,'Thirteenth','CySec'),
(15,'Fourteenth','CySec'),
(16,'helpme','CySec'),
(17,'suffer','CySec');
/*!40000 ALTER TABLE `People` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_uca1400_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`anirudhrevanur`@`localhost`*/ /*!50003 trigger after_person_insert
after insert on People
for each row
begin
insert into insert_log(log_message)
values (concat('New row inserted with id: ', NEW.id));
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_uca1400_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`anirudhrevanur`@`localhost`*/ /*!50003 TRIGGER after_person_update
AFTER UPDATE ON People
FOR EACH ROW
BEGIN
    INSERT INTO update_log(table_name, row_id, updated_fields)
    VALUES ('People', NEW.id, 
        CONCAT_WS(',',
            IF(NEW.Name != OLD.Name, 'Name', NULL),
            IF(NEW.Role != OLD.Role, 'Role', NULL)
        )
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_uca1400_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`anirudhrevanur`@`localhost`*/ /*!50003 trigger log_delete after delete on People for each row begin insert into deletion_logs(table_name, row_id)
values('employees', OLD.id);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `deletion_logs`
--

DROP TABLE IF EXISTS `deletion_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `deletion_logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `deleted_at` timestamp NULL DEFAULT current_timestamp(),
  `table_name` varchar(255) DEFAULT NULL,
  `row_id` int(11) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `deletion_logs`
--

LOCK TABLES `deletion_logs` WRITE;
/*!40000 ALTER TABLE `deletion_logs` DISABLE KEYS */;
INSERT INTO `deletion_logs` VALUES
(1,'2024-09-14 18:35:38','employees',14,1);
/*!40000 ALTER TABLE `deletion_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `insert_log`
--

DROP TABLE IF EXISTS `insert_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `insert_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `log_message` varchar(255) DEFAULT NULL,
  `log_time` timestamp NULL DEFAULT current_timestamp(),
  `processed` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `insert_log`
--

LOCK TABLES `insert_log` WRITE;
/*!40000 ALTER TABLE `insert_log` DISABLE KEYS */;
INSERT INTO `insert_log` VALUES
(1,'New row inserted with id: 14','2024-09-14 17:19:38',1),
(2,'New row inserted with id: 15','2024-09-14 19:21:03',1),
(3,'New row inserted with id: 16','2024-09-15 10:46:27',1),
(4,'New row inserted with id: 17','2024-09-15 10:56:37',1);
/*!40000 ALTER TABLE `insert_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `update_log`
--

DROP TABLE IF EXISTS `update_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `update_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(255) NOT NULL,
  `row_id` int(11) NOT NULL,
  `updated_fields` varchar(255) NOT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  `processed` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `update_log`
--

LOCK TABLES `update_log` WRITE;
/*!40000 ALTER TABLE `update_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `update_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'superjoin'
--

--
-- Dumping routines for database 'superjoin'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2024-09-15 16:54:13
