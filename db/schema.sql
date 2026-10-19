-- =====================================================================
--  Swiss Tour & Transfer - database schema
--  MySQL 8 / utf8mb4.  Run this file first, then seed.sql.
--
--  DESIGN RULE: no FOREIGN KEY constraints anywhere.
--  Relationships are plain INT UNSIGNED columns with a normal index.
--  Cascading deletes are handled in code - see Backend/utils/cascade.js
-- =====================================================================

DROP DATABASE IF EXISTS `swiss_tour_transfer`;
CREATE DATABASE `swiss_tour_transfer`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `swiss_tour_transfer`;

-- ---------------------------------------------------------------------
-- 1. admin_users
-- ---------------------------------------------------------------------
CREATE TABLE `admin_users` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(120) NOT NULL,
  `email`         VARCHAR(190) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          VARCHAR(40)  NOT NULL DEFAULT 'admin',
  `last_login_at` DATETIME     NULL DEFAULT NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. settings  (key/value: WhatsApp, contact, socials, announcement bar)
-- ---------------------------------------------------------------------
CREATE TABLE `settings` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key`   VARCHAR(100) NOT NULL,
  `setting_value` TEXT         NULL,
  `group_name`    VARCHAR(60)  NOT NULL DEFAULT 'general',
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_setting_key` (`setting_key`),
  KEY `idx_setting_group` (`group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. homepage_sections  (order + visibility of the 13 homepage blocks)
-- ---------------------------------------------------------------------
CREATE TABLE `homepage_sections` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `section_key` VARCHAR(60)  NOT NULL,
  `label`       VARCHAR(120) NOT NULL,
  `description` VARCHAR(255) NULL,
  `sort_order`  INT          NOT NULL DEFAULT 0,
  `is_visible`  TINYINT(1)   NOT NULL DEFAULT 1,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_section_key` (`section_key`),
  KEY `idx_section_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. content_blocks  (all editable copy, keyed by page + block)
-- ---------------------------------------------------------------------
CREATE TABLE `content_blocks` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `page_key`    VARCHAR(60)  NOT NULL,
  `block_key`   VARCHAR(80)  NOT NULL,
  `block_value` MEDIUMTEXT   NULL,
  `block_type`  VARCHAR(20)  NOT NULL DEFAULT 'text',
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_page_block` (`page_key`, `block_key`),
  KEY `idx_page_key` (`page_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. faqs
-- ---------------------------------------------------------------------
CREATE TABLE `faqs` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question`   VARCHAR(255) NOT NULL,
  `answer`     TEXT         NOT NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  `is_visible` TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_faq_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. vehicle_categories
-- ---------------------------------------------------------------------
CREATE TABLE `vehicle_categories` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(120) NOT NULL,
  `slug`        VARCHAR(140) NOT NULL,
  `description` TEXT         NULL,
  `image`       VARCHAR(255) NULL,
  `sort_order`  INT          NOT NULL DEFAULT 0,
  `is_visible`  TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_category_slug` (`slug`),
  KEY `idx_category_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* --------------------------------------------------------------- category photos
   Several photos per vehicle category, same shape as vehicle_photos. No foreign
   key: category_id is a plain indexed column and Backend/utils/cascade.js clears
   the rows and files. The is_cover photo is mirrored into
   vehicle_categories.image, which the public cards read.                      */
CREATE TABLE `category_photos` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` INT UNSIGNED NOT NULL,
  `file_path`   VARCHAR(255) NOT NULL,
  `alt_text`    VARCHAR(255) NULL,
  `sort_order`  INT          NOT NULL DEFAULT 0,
  `is_cover`    TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category_photo_category` (`category_id`),
  KEY `idx_category_photo_order` (`category_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- 7. vehicles       (category_id -> vehicle_categories.id, NO FK)
-- ---------------------------------------------------------------------
CREATE TABLE `vehicles` (
  `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `category_id`       INT UNSIGNED  NULL DEFAULT NULL,
  `name`              VARCHAR(160)  NOT NULL,
  `slug`              VARCHAR(180)  NOT NULL,
  `tagline`           VARCHAR(255)  NULL,
  `description`       TEXT          NULL,
  `passengers`        TINYINT UNSIGNED NOT NULL DEFAULT 3,
  `suitcases`         TINYINT UNSIGNED NOT NULL DEFAULT 2,
  `hand_bags`         TINYINT UNSIGNED NOT NULL DEFAULT 2,
  `price_from`        DECIMAL(10,2) NULL DEFAULT NULL,
  `price_unit`        VARCHAR(40)   NOT NULL DEFAULT 'hour',
  `price_note`        VARCHAR(160)  NULL,
  `ideal_for`         TEXT          NULL,
  `whatsapp_template` TEXT          NULL,
  `is_visible`        TINYINT(1)    NOT NULL DEFAULT 1,
  `is_featured`       TINYINT(1)    NOT NULL DEFAULT 0,
  `sort_order`        INT           NOT NULL DEFAULT 0,
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vehicle_slug` (`slug`),
  KEY `idx_vehicle_category` (`category_id`),
  KEY `idx_vehicle_visible` (`is_visible`),
  KEY `idx_vehicle_featured` (`is_featured`),
  KEY `idx_vehicle_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. vehicle_photos (vehicle_id -> vehicles.id, NO FK)
-- ---------------------------------------------------------------------
CREATE TABLE `vehicle_photos` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `vehicle_id` INT UNSIGNED NOT NULL,
  `file_path`  VARCHAR(255) NOT NULL,
  `alt_text`   VARCHAR(255) NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  `is_cover`   TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_photo_vehicle` (`vehicle_id`),
  KEY `idx_photo_order` (`vehicle_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. vehicle_specs  (vehicle_id -> vehicles.id, NO FK)
-- ---------------------------------------------------------------------
CREATE TABLE `vehicle_specs` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `vehicle_id` INT UNSIGNED NOT NULL,
  `spec_label` VARCHAR(120) NOT NULL,
  `spec_value` VARCHAR(255) NOT NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_spec_vehicle` (`vehicle_id`),
  KEY `idx_spec_order` (`vehicle_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 10. cities  (SEO landing pages)
-- ---------------------------------------------------------------------
CREATE TABLE `cities` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(120)  NOT NULL,
  `slug`        VARCHAR(140)  NOT NULL,
  `hub_label`   VARCHAR(160)  NULL,
  `intro`       VARCHAR(500)  NULL,
  `description` TEXT          NULL,
  `image`       VARCHAR(255)  NULL,
  `lat`         DECIMAL(10,7) NULL,
  `lng`         DECIMAL(10,7) NULL,
  `sort_order`  INT           NOT NULL DEFAULT 0,
  `is_visible`  TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_city_slug` (`slug`),
  KEY `idx_city_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 11. vehicle_cities  (join table, both ids indexed, NO FK)
-- ---------------------------------------------------------------------
CREATE TABLE `vehicle_cities` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `vehicle_id` INT UNSIGNED NOT NULL,
  `city_id`    INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vehicle_city` (`vehicle_id`, `city_id`),
  KEY `idx_vc_vehicle` (`vehicle_id`),
  KEY `idx_vc_city` (`city_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 12. services
-- ---------------------------------------------------------------------
CREATE TABLE `services` (
  `id`                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`              VARCHAR(160) NOT NULL,
  `slug`              VARCHAR(180) NOT NULL,
  `short_description` VARCHAR(500) NULL,
  `full_description`  TEXT         NULL,
  `included`          TEXT         NULL,
  `image`             VARCHAR(255) NULL,
  `icon`              VARCHAR(60)  NULL,
  `price_text`        VARCHAR(160) NULL,
  `sort_order`        INT          NOT NULL DEFAULT 0,
  `is_visible`        TINYINT(1)   NOT NULL DEFAULT 1,
  `show_on_homepage`  TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_slug` (`slug`),
  KEY `idx_service_order` (`sort_order`),
  KEY `idx_service_home` (`show_on_homepage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ---------------------------------------------------------------- service photos
   A service can carry several photos. No foreign key: service_id is a plain
   indexed column and Backend/utils/cascade.js removes the rows and files when
   a service is deleted. The photo flagged is_cover is mirrored into
   services.image, which is what cards and listings read.                      */
CREATE TABLE `service_photos` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_id` INT UNSIGNED NOT NULL,
  `file_path`  VARCHAR(255) NOT NULL,
  `alt_text`   VARCHAR(255) NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  `is_cover`   TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_photo_service` (`service_id`),
  KEY `idx_service_photo_order` (`service_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- 13. gallery_albums  (these ARE the gallery categories shown publicly)
-- ---------------------------------------------------------------------
CREATE TABLE `gallery_albums` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(120) NOT NULL,
  `slug`       VARCHAR(140) NOT NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  `is_visible` TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_album_slug` (`slug`),
  KEY `idx_album_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 14. gallery_photos  (album_id -> gallery_albums.id, NO FK)
-- ---------------------------------------------------------------------
CREATE TABLE `gallery_photos` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `album_id`   INT UNSIGNED NOT NULL,
  `file_path`  VARCHAR(255) NOT NULL,
  `caption`    VARCHAR(255) NULL,
  `alt_text`   VARCHAR(255) NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  `is_visible` TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gphoto_album` (`album_id`),
  KEY `idx_gphoto_order` (`album_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 15. testimonials
-- ---------------------------------------------------------------------
CREATE TABLE `testimonials` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_name` VARCHAR(160) NOT NULL,
  `country`       VARCHAR(100) NULL,
  `service_label` VARCHAR(160) NULL,
  `rating`        TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `review_text`   TEXT         NOT NULL,
  `photo`         VARCHAR(255) NULL,
  `source`        ENUM('google','direct') NOT NULL DEFAULT 'direct',
  `is_approved`   TINYINT(1)   NOT NULL DEFAULT 0,
  `is_featured`   TINYINT(1)   NOT NULL DEFAULT 0,
  `sort_order`    INT          NOT NULL DEFAULT 0,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_testimonial_approved` (`is_approved`),
  KEY `idx_testimonial_featured` (`is_featured`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 16. promotions  (offers, homepage banner, announcement bar target)
-- ---------------------------------------------------------------------
CREATE TABLE `promotions` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`        VARCHAR(200) NOT NULL,
  `description`  TEXT         NULL,
  `code`         VARCHAR(60)  NULL,
  `banner_image` VARCHAR(255) NULL,
  `placement`    ENUM('homepage_banner','offers_page','both') NOT NULL DEFAULT 'both',
  `starts_at`    DATE         NULL,
  `ends_at`      DATE         NULL,
  `link_type`    VARCHAR(40)  NOT NULL DEFAULT 'whatsapp',
  `link_url`     VARCHAR(255) NULL,
  `is_active`    TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`   INT          NOT NULL DEFAULT 0,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_promo_active` (`is_active`),
  KEY `idx_promo_dates` (`starts_at`, `ends_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 17. enquiries  (vehicle_id -> vehicles.id, nullable, NO FK)
-- ---------------------------------------------------------------------
CREATE TABLE `enquiries` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_type`    VARCHAR(120) NULL,
  `vehicle_id`      INT UNSIGNED NULL DEFAULT NULL,
  `vehicle_name`    VARCHAR(160) NULL,
  `pickup`          VARCHAR(255) NULL,
  `dropoff`         VARCHAR(255) NULL,
  `travel_datetime` DATETIME     NULL,
  `flight_number`   VARCHAR(40)  NULL,
  `passengers`      TINYINT UNSIGNED NULL,
  `suitcases`       TINYINT UNSIGNED NULL,
  `return_trip`     TINYINT(1)   NOT NULL DEFAULT 0,
  `full_name`       VARCHAR(160) NOT NULL,
  `email`           VARCHAR(190) NULL,
  `phone`           VARCHAR(60)  NOT NULL,
  `message`         TEXT         NULL,
  `status`          ENUM('new','contacted','confirmed','closed') NOT NULL DEFAULT 'new',
  `source_page`     VARCHAR(255) NULL,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_enquiry_vehicle` (`vehicle_id`),
  KEY `idx_enquiry_status` (`status`),
  KEY `idx_enquiry_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 18. whatsapp_clicks  (dashboard analytics)
-- ---------------------------------------------------------------------
CREATE TABLE `whatsapp_clicks` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `vehicle_id`   INT UNSIGNED NULL DEFAULT NULL,
  `vehicle_name` VARCHAR(160) NULL,
  `page_path`    VARCHAR(255) NULL,
  `page_type`    VARCHAR(60)  NULL,
  `clicked_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_click_vehicle` (`vehicle_id`),
  KEY `idx_click_date` (`clicked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 19. activity_logs  (admin and enquiry history; no foreign keys)
-- ---------------------------------------------------------------------
CREATE TABLE `activity_logs` (
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
