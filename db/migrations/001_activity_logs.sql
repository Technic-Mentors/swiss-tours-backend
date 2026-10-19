CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` VARCHAR(60) NOT NULL,
  `entity_id`   INT UNSIGNED NOT NULL,
  `action`      VARCHAR(60) NOT NULL,
  `field`       VARCHAR(60) NULL,
  `old_value`   VARCHAR(255) NULL,
  `new_value`   VARCHAR(255) NULL,
  `meta`        VARCHAR(500) NULL,
  `actor_id`    INT UNSIGNED NULL,
  `actor_name`  VARCHAR(160) NULL,
  `actor_email` VARCHAR(190) NULL,
  `ip_address`  VARCHAR(45) NULL,
  `user_agent`  VARCHAR(255) NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_entity` (`entity_type`, `entity_id`, `created_at`),
  KEY `idx_activity_actor` (`actor_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `activity_logs` (`entity_type`, `entity_id`, `action`, `meta`, `created_at`)
SELECT 'enquiry', e.id, 'received', CONCAT(e.full_name, ' · ', e.phone), e.created_at
  FROM `enquiries` e
 WHERE NOT EXISTS (
   SELECT 1
     FROM `activity_logs` a
    WHERE a.entity_type = 'enquiry'
      AND a.entity_id = e.id
      AND a.action = 'received'
 );
