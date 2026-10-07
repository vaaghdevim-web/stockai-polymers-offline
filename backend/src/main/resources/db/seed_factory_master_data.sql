-- ================================================================
-- Sri Vidha Polymers - Comprehensive Factory Master & Transaction Data
-- Complete realistic enterprise dataset for testing all frontend workflows
-- PostgreSQL 14+ / H2 Compatible syntax (Standard ANSI SQL)
-- ================================================================

BEGIN;

SET search_path TO public;

-- 1. Unit of Measure
INSERT INTO unit_of_measure (uom_code, uom_type) VALUES ('KGS', 'Weight');
INSERT INTO unit_of_measure (uom_code, uom_type) VALUES ('ROLLS', 'Quantity');
INSERT INTO unit_of_measure (uom_code, uom_type) VALUES ('BAGS', 'Quantity');
INSERT INTO unit_of_measure (uom_code, uom_type) VALUES ('PCS', 'Quantity');
INSERT INTO unit_of_measure (uom_code, uom_type) VALUES ('METERS', 'Length');

-- 2. Material Categories
INSERT INTO material_category (category_name, category_type, is_active) VALUES ('PP Granules / Resin', 'Raw', TRUE);
INSERT INTO material_category (category_name, category_type, is_active) VALUES ('Calcium Carbonate Filler', 'Additive', TRUE);
INSERT INTO material_category (category_name, category_type, is_active) VALUES ('Color Masterbatch (MB)', 'Additive', TRUE);
INSERT INTO material_category (category_name, category_type, is_active) VALUES ('Polymer Modifiers & Additives', 'Additive', TRUE);
INSERT INTO material_category (category_name, category_type, is_active) VALUES ('Packaging & Cores', 'Packaging', TRUE);

-- 3. Suppliers
INSERT INTO supplier (supplier_name, gst_no, email, phone, address, is_active, created_at, updated_at)
VALUES ('Indian Oil Corporation Limited', '36AAACI1681G1ZM', 'sales@iocl.com', '+91 40 2345 6789', 'Hyderabad, Telangana', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO supplier (supplier_name, gst_no, email, phone, address, is_active, created_at, updated_at)
VALUES ('Mangalore Refinery and Petrochemicals Limited', '29AAACM2201G1ZU', 'petrochemicals@mrpl.co.in', '+91 824 2270 400', 'Mangalore, Karnataka', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO supplier (supplier_name, gst_no, email, phone, address, is_active, created_at, updated_at)
VALUES ('Reliance Industries Limited', '37AABCR0001G1ZT', 'polymers@ril.com', '+91 22 3555 5000', 'Mumbai, Maharashtra', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO supplier (supplier_name, gst_no, email, phone, address, is_active, created_at, updated_at)
VALUES ('Colorplas Polyadditives LLP', '36AAHFC8891J1ZP', 'orders@colorplas.in', '+91 40 2777 8899', 'Hyderabad, Telangana', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO supplier (supplier_name, gst_no, email, phone, address, is_active, created_at, updated_at)
VALUES ('Sri Vasavi Pigments (P) Ltd', '37AALCS4455N1ZK', 'info@vasavipigments.com', '+91 866 2884 123', 'Vijayawada, Andhra Pradesh', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO supplier (supplier_name, gst_no, email, phone, address, is_active, created_at, updated_at)
VALUES ('Growel Processors Private Limited', '36AABCG9988H1ZU', 'contact@growel.com', '+91 40 2999 1122', 'Hyderabad, Telangana', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4. Raw Materials
INSERT INTO raw_material (category_id, default_uom_id, material_name, material_code, standard_cost, reorder_level, safety_stock, lead_time_days, is_active, created_at, updated_at)
SELECT c.category_id, u.uom_id, 'RAFFIA 1030RG-25KG IOCL', 'RM-PP-1030RG-IOCL', 108.50, 5000.00, 2500.00, 5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM material_category c, unit_of_measure u WHERE c.category_name = 'PP Granules / Resin' AND u.uom_code = 'KGS';

INSERT INTO raw_material (category_id, default_uom_id, material_name, material_code, standard_cost, reorder_level, safety_stock, lead_time_days, is_active, created_at, updated_at)
SELECT c.category_id, u.uom_id, 'RAFFIA 1030RG-25KG MRPL', 'RM-PP-1030RG-MRPL', 108.00, 5000.00, 2500.00, 5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM material_category c, unit_of_measure u WHERE c.category_name = 'PP Granules / Resin' AND u.uom_code = 'KGS';

INSERT INTO raw_material (category_id, default_uom_id, material_name, material_code, standard_cost, reorder_level, safety_stock, lead_time_days, is_active, created_at, updated_at)
SELECT c.category_id, u.uom_id, 'PP H030SG (Reliance)', 'RM-PP-H030SG', 110.00, 5000.00, 2500.00, 5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM material_category c, unit_of_measure u WHERE c.category_name = 'PP Granules / Resin' AND u.uom_code = 'KGS';

INSERT INTO raw_material (category_id, default_uom_id, material_name, material_code, standard_cost, reorder_level, safety_stock, lead_time_days, is_active, created_at, updated_at)
SELECT c.category_id, u.uom_id, 'LLDPE JF19010 (Reliance)', 'RM-LLDPE-JF19010', 98.00, 2000.00, 1000.00, 7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM material_category c, unit_of_measure u WHERE c.category_name = 'PP Granules / Resin' AND u.uom_code = 'KGS';

INSERT INTO raw_material (category_id, default_uom_id, material_name, material_code, standard_cost, reorder_level, safety_stock, lead_time_days, is_active, created_at, updated_at)
SELECT c.category_id, u.uom_id, 'FILLER SQ3023-(S) VASAVI', 'RM-FL-SQ3023', 38.50, 3000.00, 1500.00, 4, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM material_category c, unit_of_measure u WHERE c.category_name = 'Calcium Carbonate Filler' AND u.uom_code = 'KGS';

INSERT INTO raw_material (category_id, default_uom_id, material_name, material_code, standard_cost, reorder_level, safety_stock, lead_time_days, is_active, created_at, updated_at)
SELECT c.category_id, u.uom_id, 'FILLER SQ3099-(Hyd) Colorplas', 'RM-FL-SQ3099', 39.00, 3000.00, 1500.00, 4, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM material_category c, unit_of_measure u WHERE c.category_name = 'Calcium Carbonate Filler' AND u.uom_code = 'KGS';

INSERT INTO raw_material (category_id, default_uom_id, material_name, material_code, standard_cost, reorder_level, safety_stock, lead_time_days, is_active, created_at, updated_at)
SELECT c.category_id, u.uom_id, 'BLUE TONE FILLER', 'RM-FL-BLUETONE', 42.00, 2000.00, 1000.00, 4, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM material_category c, unit_of_measure u WHERE c.category_name = 'Calcium Carbonate Filler' AND u.uom_code = 'KGS';

INSERT INTO raw_material (category_id, default_uom_id, material_name, material_code, standard_cost, reorder_level, safety_stock, lead_time_days, is_active, created_at, updated_at)
SELECT c.category_id, u.uom_id, 'CP/RD-8077- KESAR RED (MB)', 'RM-MB-KESAR-RED', 175.00, 200.00, 100.00, 7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM material_category c, unit_of_measure u WHERE c.category_name = 'Color Masterbatch (MB)' AND u.uom_code = 'KGS';

INSERT INTO raw_material (category_id, default_uom_id, material_name, material_code, standard_cost, reorder_level, safety_stock, lead_time_days, is_active, created_at, updated_at)
SELECT c.category_id, u.uom_id, 'CP100322-DARK PARROT GREEN (MB)', 'RM-MB-PARROT-GREEN', 185.00, 200.00, 100.00, 7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM material_category c, unit_of_measure u WHERE c.category_name = 'Color Masterbatch (MB)' AND u.uom_code = 'KGS';

INSERT INTO raw_material (category_id, default_uom_id, material_name, material_code, standard_cost, reorder_level, safety_stock, lead_time_days, is_active, created_at, updated_at)
SELECT c.category_id, u.uom_id, 'CP100437-IVORY YELLOW (MB)', 'RM-MB-IVORY-YELLOW', 165.00, 200.00, 100.00, 7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM material_category c, unit_of_measure u WHERE c.category_name = 'Color Masterbatch (MB)' AND u.uom_code = 'KGS';

INSERT INTO raw_material (category_id, default_uom_id, material_name, material_code, standard_cost, reorder_level, safety_stock, lead_time_days, is_active, created_at, updated_at)
SELECT c.category_id, u.uom_id, 'MEGA PLAS MODIFIER', 'RM-MOD-MEGAPLAS', 145.00, 500.00, 250.00, 6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM material_category c, unit_of_measure u WHERE c.category_name = 'Polymer Modifiers & Additives' AND u.uom_code = 'KGS';

-- 5. Plants & Warehouses
INSERT INTO plant (plant_name, city, state, country, is_active, created_at, updated_at)
VALUES ('Sri Vidha Polymers - Unit 1', 'Hyderabad', 'Telangana', 'India', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO plant (plant_name, city, state, country, is_active, created_at, updated_at)
VALUES ('Sri Vidha Polymers - Unit 2', 'Hyderabad', 'Telangana', 'India', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO warehouse (plant_id, warehouse_name, type, is_active)
SELECT p.plant_id, 'Unit 1 Raw Material Warehouse', 'Raw', TRUE
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO warehouse (plant_id, warehouse_name, type, is_active)
SELECT p.plant_id, 'Unit 1 WIP Warehouse', 'Both', TRUE
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO warehouse (plant_id, warehouse_name, type, is_active)
SELECT p.plant_id, 'Unit 1 Finished Goods Warehouse', 'FG', TRUE
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO warehouse (plant_id, warehouse_name, type, is_active)
SELECT p.plant_id, 'Unit 2 Main Warehouse', 'Both', TRUE
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 2';

-- 6. Racks, Shelves, Bins
INSERT INTO location_rack (warehouse_id, rack_code, is_active)
SELECT w.warehouse_id, 'RACK-U1-01', TRUE FROM warehouse w WHERE w.warehouse_name = 'Unit 1 Raw Material Warehouse';
INSERT INTO location_rack (warehouse_id, rack_code, is_active)
SELECT w.warehouse_id, 'RACK-U1-02', TRUE FROM warehouse w WHERE w.warehouse_name = 'Unit 1 Raw Material Warehouse';

INSERT INTO location_shelf (rack_id, shelf_code, is_active)
SELECT r.rack_id, 'SHELF-U1-01', TRUE FROM location_rack r WHERE r.rack_code = 'RACK-U1-01';
INSERT INTO location_shelf (rack_id, shelf_code, is_active)
SELECT r.rack_id, 'SHELF-U1-02', TRUE FROM location_rack r WHERE r.rack_code = 'RACK-U1-01';

INSERT INTO location_bin (shelf_id, bin_code, capacity_kg, is_active)
SELECT s.shelf_id, 'BIN-U1-01', 5000.0000, TRUE FROM location_shelf s WHERE s.shelf_code = 'SHELF-U1-01';
INSERT INTO location_bin (shelf_id, bin_code, capacity_kg, is_active)
SELECT s.shelf_id, 'BIN-U1-02', 5000.0000, TRUE FROM location_shelf s WHERE s.shelf_code = 'SHELF-U1-01';
INSERT INTO location_bin (shelf_id, bin_code, capacity_kg, is_active)
SELECT s.shelf_id, 'BIN-U1-03', 5000.0000, TRUE FROM location_shelf s WHERE s.shelf_code = 'SHELF-U1-02';
INSERT INTO location_bin (shelf_id, bin_code, capacity_kg, is_active)
SELECT s.shelf_id, 'BIN-U1-04', 5000.0000, TRUE FROM location_shelf s WHERE s.shelf_code = 'SHELF-U1-02';

-- FG Warehouse Bins
INSERT INTO location_rack (warehouse_id, rack_code, is_active)
SELECT w.warehouse_id, 'RACK-U3-01', TRUE FROM warehouse w WHERE w.warehouse_name = 'Unit 1 Finished Goods Warehouse';
INSERT INTO location_rack (warehouse_id, rack_code, is_active)
SELECT w.warehouse_id, 'RACK-U3-02', TRUE FROM warehouse w WHERE w.warehouse_name = 'Unit 1 Finished Goods Warehouse';

INSERT INTO location_shelf (rack_id, shelf_code, is_active)
SELECT r.rack_id, 'SHELF-U3-01', TRUE FROM location_rack r WHERE r.rack_code = 'RACK-U3-01';
INSERT INTO location_shelf (rack_id, shelf_code, is_active)
SELECT r.rack_id, 'SHELF-U3-02', TRUE FROM location_rack r WHERE r.rack_code = 'RACK-U3-02';

INSERT INTO location_bin (shelf_id, bin_code, capacity_kg, is_active)
SELECT s.shelf_id, 'BIN-U3-01', 5000.0000, TRUE FROM location_shelf s WHERE s.shelf_code = 'SHELF-U3-01';
INSERT INTO location_bin (shelf_id, bin_code, capacity_kg, is_active)
SELECT s.shelf_id, 'BIN-U3-02', 5000.0000, TRUE FROM location_shelf s WHERE s.shelf_code = 'SHELF-U3-01';
INSERT INTO location_bin (shelf_id, bin_code, capacity_kg, is_active)
SELECT s.shelf_id, 'BIN-U3-03', 5000.0000, TRUE FROM location_shelf s WHERE s.shelf_code = 'SHELF-U3-02';

-- 7. App Roles
INSERT INTO app_role (role_name, is_active) VALUES ('ADMIN', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('SUPERVISOR', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('OPERATOR', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('MANAGER', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('SUPER_ADMIN', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('FACTORY_DIRECTOR', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('PLANT_MANAGER', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('STORE_MANAGER', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('PURCHASE_MANAGER', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('PRODUCTION_MANAGER', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('QUALITY_MANAGER', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('WAREHOUSE_EXECUTIVE', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('ACCOUNTS_TEAM', TRUE);
INSERT INTO app_role (role_name, is_active) VALUES ('DISPATCH_EXECUTIVE', TRUE);

-- 8. Users (passwords are represented by BCrypt hashes below)
INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'admin', 'admin@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', 'STOCKAIADMINMFA2', TRUE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'superadmin', 'superadmin@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'director', 'director@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'plantmgr', 'plantmgr@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'storemgr', 'storemgr@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'purchasemgr', 'purchasemgr@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'productionmgr', 'productionmgr@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'qualitymgr', 'qualitymgr@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'warehouseexec', 'warehouseexec@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'accountsteam', 'accountsteam@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'dispatchexec', 'dispatchexec@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'operator01', 'operator01@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'supervisor01', 'supervisor01@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO app_user (plant_id, user_name, email, password_hash, mfa_secret, mfa_enabled, is_active, created_at)
SELECT p.plant_id, 'manager01', 'manager01@stockai.com', '$2a$10$vv9aIRmeTNDGoJSunKCvT.9zAtgze1Zg32/4IZo0zLAKblJ3WRSNa', NULL, FALSE, TRUE, CURRENT_TIMESTAMP
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

-- 9. User Roles Mapping
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'admin' AND r.role_name IN ('ADMIN', 'SUPER_ADMIN');
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'superadmin' AND r.role_name IN ('ADMIN', 'SUPER_ADMIN');
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'director' AND r.role_name IN ('ADMIN', 'FACTORY_DIRECTOR');
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'plantmgr' AND r.role_name IN ('MANAGER', 'PLANT_MANAGER');
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'storemgr' AND r.role_name IN ('MANAGER', 'STORE_MANAGER');
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'purchasemgr' AND r.role_name IN ('MANAGER', 'PURCHASE_MANAGER');
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'productionmgr' AND r.role_name IN ('MANAGER', 'PRODUCTION_MANAGER');
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'qualitymgr' AND r.role_name IN ('SUPERVISOR', 'MANAGER', 'QUALITY_MANAGER');
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'warehouseexec' AND r.role_name IN ('OPERATOR', 'WAREHOUSE_EXECUTIVE');
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'accountsteam' AND r.role_name IN ('MANAGER', 'ACCOUNTS_TEAM');
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'dispatchexec' AND r.role_name IN ('SUPERVISOR', 'DISPATCH_EXECUTIVE');
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'operator01' AND r.role_name = 'OPERATOR';
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'supervisor01' AND r.role_name = 'SUPERVISOR';
INSERT INTO user_role (user_id, role_id, is_active)
SELECT u.user_id, r.role_id, TRUE FROM app_user u, app_role r WHERE u.user_name = 'manager01' AND r.role_name = 'MANAGER';

-- 10. Raw Material Batches (Incoming Stock Receipts)
INSERT INTO material_batch (material_id, supplier_id, batch_no, lot_number, initial_weight_kg, current_weight_kg, unit_cost, quality_status, status, is_active, received_at, created_at)
SELECT rm.material_id, s.supplier_id, 'RM-2026-001', 'LOT-RIL-001', 25000.0000, 24580.0000, 110.0000, 'Available', 'Available', TRUE, CURRENT_TIMESTAMP - INTERVAL '3' DAY, CURRENT_TIMESTAMP
FROM raw_material rm, supplier s WHERE rm.material_code = 'RM-PP-H030SG' AND s.supplier_name = 'Reliance Industries Limited';

INSERT INTO material_batch (material_id, supplier_id, batch_no, lot_number, initial_weight_kg, current_weight_kg, unit_cost, quality_status, status, is_active, received_at, created_at)
SELECT rm.material_id, s.supplier_id, 'RM-2026-002', 'LOT-AOC-001', 5000.0000, 4950.0000, 38.5000, 'Available', 'Available', TRUE, CURRENT_TIMESTAMP - INTERVAL '3' DAY, CURRENT_TIMESTAMP
FROM raw_material rm, supplier s WHERE rm.material_code = 'RM-FL-SQ3023' AND s.supplier_name = 'Sri Vasavi Pigments (P) Ltd';

INSERT INTO material_batch (material_id, supplier_id, batch_no, lot_number, initial_weight_kg, current_weight_kg, unit_cost, quality_status, status, is_active, received_at, created_at)
SELECT rm.material_id, s.supplier_id, 'RM-2026-003', 'LOT-CLARI-001', 1000.0000, 980.0000, 175.0000, 'Available', 'Available', TRUE, CURRENT_TIMESTAMP - INTERVAL '4' DAY, CURRENT_TIMESTAMP
FROM raw_material rm, supplier s WHERE rm.material_code = 'RM-MB-KESAR-RED' AND s.supplier_name = 'Colorplas Polyadditives LLP';

INSERT INTO material_batch (material_id, supplier_id, batch_no, lot_number, initial_weight_kg, current_weight_kg, unit_cost, quality_status, status, is_active, received_at, created_at)
SELECT rm.material_id, s.supplier_id, 'RM-2026-004', 'LOT-UV-001', 500.0000, 490.0000, 145.0000, 'Available', 'Available', TRUE, CURRENT_TIMESTAMP - INTERVAL '5' DAY, CURRENT_TIMESTAMP
FROM raw_material rm, supplier s WHERE rm.material_code = 'RM-MOD-MEGAPLAS' AND s.supplier_name = 'Growel Processors Private Limited';

INSERT INTO material_batch (material_id, supplier_id, batch_no, lot_number, initial_weight_kg, current_weight_kg, unit_cost, quality_status, status, is_active, received_at, created_at)
SELECT rm.material_id, s.supplier_id, 'RM-2026-005', 'LOT-IOCL-001', 15000.0000, 15000.0000, 108.5000, 'Available', 'Available', TRUE, CURRENT_TIMESTAMP - INTERVAL '1' DAY, CURRENT_TIMESTAMP
FROM raw_material rm, supplier s WHERE rm.material_code = 'RM-PP-1030RG-IOCL' AND s.supplier_name = 'Indian Oil Corporation Limited';

INSERT INTO material_batch (material_id, supplier_id, batch_no, lot_number, initial_weight_kg, current_weight_kg, unit_cost, quality_status, status, is_active, received_at, created_at)
SELECT rm.material_id, s.supplier_id, 'RM-2026-006', 'LOT-MRPL-001', 10000.0000, 10000.0000, 108.0000, 'Available', 'Available', TRUE, CURRENT_TIMESTAMP - INTERVAL '2' DAY, CURRENT_TIMESTAMP
FROM raw_material rm, supplier s WHERE rm.material_code = 'RM-PP-1030RG-MRPL' AND s.supplier_name = 'Mangalore Refinery and Petrochemicals Limited';

-- Inventory records for Raw Material Batches in Warehouse Bins
INSERT INTO inventory (bin_id, material_batch_id, quantity_on_hand, reserved_qty, quality_status, updated_at)
SELECT b.bin_id, mb.batch_id, mb.current_weight_kg, 0.0000, 'Available', CURRENT_TIMESTAMP
FROM location_bin b, material_batch mb
WHERE b.bin_code = 'BIN-U1-01' 
  AND mb.batch_no = 'RM-2026-001';

INSERT INTO inventory (bin_id, material_batch_id, quantity_on_hand, reserved_qty, quality_status, updated_at)
SELECT b.bin_id, mb.batch_id, mb.current_weight_kg, 0.0000, 'Available', CURRENT_TIMESTAMP
FROM location_bin b, material_batch mb
WHERE b.bin_code = 'BIN-U1-02' 
  AND mb.batch_no = 'RM-2026-002';

INSERT INTO inventory (bin_id, material_batch_id, quantity_on_hand, reserved_qty, quality_status, updated_at)
SELECT b.bin_id, mb.batch_id, mb.current_weight_kg, 0.0000, 'Available', CURRENT_TIMESTAMP
FROM location_bin b, material_batch mb
WHERE b.bin_code = 'BIN-U1-03' 
  AND mb.batch_no = 'RM-2026-003';

-- 11. Product Category, Finished Products & Finished Batches
INSERT INTO product_category (category_name, is_active) VALUES ('PP Woven Sacks', TRUE);
INSERT INTO product_category (category_name, is_active) VALUES ('FIBC Jumbo Bags', TRUE);
INSERT INTO product_category (category_name, is_active) VALUES ('BOPP Laminated Sacks', TRUE);
INSERT INTO product_category (category_name, is_active) VALUES ('Leno Mesh Bags', TRUE);

INSERT INTO finished_product (prod_cat_id, default_uom_id, product_name, product_code, standard_cost, selling_price, reorder_level, is_active, created_at, updated_at)
SELECT pc.prod_cat_id, u.uom_id, '50KG PP Fertilizer Bag', 'FP-BAG-50KG-01', 12.5000, 18.0000, 5000.0000, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM product_category pc, unit_of_measure u WHERE pc.category_name = 'PP Woven Sacks' AND u.uom_code = 'BAGS';

INSERT INTO finished_product (prod_cat_id, default_uom_id, product_name, product_code, standard_cost, selling_price, reorder_level, is_active, created_at, updated_at)
SELECT pc.prod_cat_id, u.uom_id, '25KG PP Sugar/Grain Bag', 'FP-BAG-25KG-01', 8.5000, 12.5000, 3000.0000, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM product_category pc, unit_of_measure u WHERE pc.category_name = 'PP Woven Sacks' AND u.uom_code = 'BAGS';

INSERT INTO finished_product (prod_cat_id, default_uom_id, product_name, product_code, standard_cost, selling_price, reorder_level, is_active, created_at, updated_at)
SELECT pc.prod_cat_id, u.uom_id, '50KG Cement BOPP Laminated Bag', 'FP-BOPP-50KG-01', 16.0000, 24.0000, 4000.0000, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM product_category pc, unit_of_measure u WHERE pc.category_name = 'BOPP Laminated Sacks' AND u.uom_code = 'BAGS';

INSERT INTO finished_product (prod_cat_id, default_uom_id, product_name, product_code, standard_cost, selling_price, reorder_level, is_active, created_at, updated_at)
SELECT pc.prod_cat_id, u.uom_id, '1000KG FIBC Type A Jumbo Bag', 'FP-FIBC-1000KG-01', 350.0000, 520.0000, 500.0000, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM product_category pc, unit_of_measure u WHERE pc.category_name = 'FIBC Jumbo Bags' AND u.uom_code = 'BAGS';

-- Finished Batches
INSERT INTO finished_batch (product_id, batch_no, production_date, qty_produced, qty_rejected, scrap_weight_kg, is_active, quality_status, created_at)
SELECT fp.product_id, 'FB-2026-BAG-01', CURRENT_DATE - INTERVAL '1' DAY, 10000.0000, 0.0000, 10.0000, TRUE, 'Available', CURRENT_TIMESTAMP
FROM finished_product fp WHERE fp.product_code = 'FP-BAG-50KG-01';

INSERT INTO finished_batch (product_id, batch_no, production_date, qty_produced, qty_rejected, scrap_weight_kg, is_active, quality_status, created_at)
SELECT fp.product_id, 'FB-2026-BAG-02', CURRENT_DATE, 8000.0000, 50.0000, 15.0000, TRUE, 'Available', CURRENT_TIMESTAMP
FROM finished_product fp WHERE fp.product_code = 'FP-BAG-25KG-01';

INSERT INTO finished_batch (product_id, batch_no, production_date, qty_produced, qty_rejected, scrap_weight_kg, is_active, quality_status, created_at)
SELECT fp.product_id, 'FB-2026-BAG-03', CURRENT_DATE, 500.0000, 2.0000, 25.0000, TRUE, 'Available', CURRENT_TIMESTAMP
FROM finished_product fp WHERE fp.product_code = 'FP-FIBC-1000KG-01';

-- 12. Production Units
INSERT INTO production_unit (plant_id, unit_code, unit_name, unit_type, sequence_no, is_active)
SELECT p.plant_id, 'PU-EXT-01', 'Tape Extrusion Plant', 'Extrusion', 1, TRUE
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO production_unit (plant_id, unit_code, unit_name, unit_type, sequence_no, is_active)
SELECT p.plant_id, 'PU-WEAV-01', 'Circular Loom Weaving Shed', 'Weaving', 2, TRUE
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

INSERT INTO production_unit (plant_id, unit_code, unit_name, unit_type, sequence_no, is_active)
SELECT p.plant_id, 'PU-CONV-01', 'Bag Finishing & Conversion', 'Conversion', 3, TRUE
FROM plant p WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1';

-- 13. Machines
INSERT INTO machine (unit_id, machine_code, machine_name, machine_type, rated_capacity, capacity_uom_id, status, is_active, created_at, updated_at)
SELECT pu.unit_id, 'EXT-01', 'Lohia Tape Extruder 1', 'Extruder', 450.0000, u.uom_id, 'Running', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM production_unit pu, unit_of_measure u WHERE pu.unit_code = 'PU-EXT-01' AND u.uom_code = 'KGS';

INSERT INTO machine (unit_id, machine_code, machine_name, machine_type, rated_capacity, capacity_uom_id, status, is_active, created_at, updated_at)
SELECT pu.unit_id, 'EXT-02', 'Lohia Tape Extruder 2', 'Extruder', 450.0000, u.uom_id, 'Running', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM production_unit pu, unit_of_measure u WHERE pu.unit_code = 'PU-EXT-01' AND u.uom_code = 'KGS';

INSERT INTO machine (unit_id, machine_code, machine_name, machine_type, rated_capacity, capacity_uom_id, status, is_active, created_at, updated_at)
SELECT pu.unit_id, 'LOOM-01', 'Circular Loom 6-Shuttle 01', 'Circular Loom', 120.0000, u.uom_id, 'Running', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM production_unit pu, unit_of_measure u WHERE pu.unit_code = 'PU-WEAV-01' AND u.uom_code = 'METERS';

INSERT INTO machine (unit_id, machine_code, machine_name, machine_type, rated_capacity, capacity_uom_id, status, is_active, created_at, updated_at)
SELECT pu.unit_id, 'LOOM-02', 'Circular Loom 6-Shuttle 02', 'Circular Loom', 120.0000, u.uom_id, 'Running', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM production_unit pu, unit_of_measure u WHERE pu.unit_code = 'PU-WEAV-01' AND u.uom_code = 'METERS';

INSERT INTO machine (unit_id, machine_code, machine_name, machine_type, rated_capacity, capacity_uom_id, status, is_active, created_at, updated_at)
SELECT pu.unit_id, 'BCS-01', 'Automatic Cutting & Sewing Line 01', 'Conversion Machine', 5000.0000, u.uom_id, 'Available', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM production_unit pu, unit_of_measure u WHERE pu.unit_code = 'PU-CONV-01' AND u.uom_code = 'BAGS';

-- 14. Compounding Formulation & Batches
INSERT INTO compounding_bom (bom_code, version, effective_from, target_batch_weight_kg, status, created_at, updated_at)
VALUES ('STD-BOM-PP-01', 'v1.0', CURRENT_DATE - INTERVAL '30' DAY, 420.0000, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO compounding_bom (bom_code, version, effective_from, target_batch_weight_kg, status, created_at, updated_at)
VALUES ('HIGH-STRENGTH-BOM-01', 'v1.0', CURRENT_DATE - INTERVAL '30' DAY, 850.0000, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO compounding_batch (compounding_bom_id, batch_code, target_weight_kg, actual_weight_kg, status, created_at, completed_at)
SELECT cbom.compounding_bom_id, 'CB-2026-001', 420.0000, 420.0000, 'Completed', CURRENT_TIMESTAMP - INTERVAL '1' DAY, CURRENT_TIMESTAMP - INTERVAL '1' DAY
FROM compounding_bom cbom WHERE cbom.bom_code = 'STD-BOM-PP-01';

INSERT INTO compounding_batch (compounding_bom_id, batch_code, target_weight_kg, actual_weight_kg, status, created_at, completed_at)
SELECT cbom.compounding_bom_id, 'CB-2026-002', 850.0000, 850.0000, 'Completed', CURRENT_TIMESTAMP - INTERVAL '2' DAY, CURRENT_TIMESTAMP - INTERVAL '2' DAY
FROM compounding_bom cbom WHERE cbom.bom_code = 'HIGH-STRENGTH-BOM-01';

INSERT INTO compounding_batch_material (compounding_batch_id, material_batch_id, required_qty_kg, consumed_qty_kg)
SELECT cb.compounding_batch_id, mb.batch_id, 350.0000, 350.0000
FROM compounding_batch cb, material_batch mb
WHERE cb.batch_code = 'CB-2026-001' AND mb.batch_no = 'RM-2026-001';

INSERT INTO compounding_batch_material (compounding_batch_id, material_batch_id, required_qty_kg, consumed_qty_kg)
SELECT cb.compounding_batch_id, mb.batch_id, 50.0000, 50.0000
FROM compounding_batch cb, material_batch mb
WHERE cb.batch_code = 'CB-2026-001' AND mb.batch_no = 'RM-2026-002';

INSERT INTO compounding_batch_material (compounding_batch_id, material_batch_id, required_qty_kg, consumed_qty_kg)
SELECT cb.compounding_batch_id, mb.batch_id, 20.0000, 20.0000
FROM compounding_batch cb, material_batch mb
WHERE cb.batch_code = 'CB-2026-001' AND mb.batch_no = 'RM-2026-003';

-- 15. Bill of Materials (BOM) for Finished Products
INSERT INTO bom (product_id, version, effective_from, yield_quantity, status)
SELECT fp.product_id, 'v1.0-STD', CURRENT_DATE, 1000.0000, 'Active'
FROM finished_product fp WHERE fp.product_code = 'FP-BAG-50KG-01';

INSERT INTO bom (product_id, version, effective_from, yield_quantity, status)
SELECT fp.product_id, 'v1.0-STD', CURRENT_DATE, 1000.0000, 'Active'
FROM finished_product fp WHERE fp.product_code = 'FP-BAG-25KG-01';

-- 16. Production Runs & Stages
INSERT INTO production_run (plant_id, bom_id, compounding_batch_id, production_number, start_datetime, status, planned_qty, actual_qty, input_weight_kg, output_weight_kg, scrap_weight_kg, yield_percentage, bags_produced, bags_per_kg, created_at, updated_at)
SELECT p.plant_id, b.bom_id, cb.compounding_batch_id, 'PR-2026-001', CURRENT_TIMESTAMP - INTERVAL '1' DAY, 'InProgress', 5000.0000, 3200.0000, 420.0000, 410.0000, 10.0000, 97.619, 3200.0000, 7.800, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM plant p, bom b, finished_product fp, compounding_batch cb
WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1' AND b.product_id = fp.product_id AND fp.product_code = 'FP-BAG-50KG-01' AND cb.batch_code = 'CB-2026-001';

INSERT INTO production_run (plant_id, bom_id, compounding_batch_id, production_number, start_datetime, status, planned_qty, actual_qty, input_weight_kg, output_weight_kg, scrap_weight_kg, yield_percentage, bags_produced, bags_per_kg, created_at, updated_at)
SELECT p.plant_id, b.bom_id, cb.compounding_batch_id, 'PR-2026-002', NULL, 'Planned', 10000.0000, 0.0000, 850.0000, 0.0000, 0.0000, 0.000, 0.0000, 0.000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM plant p, bom b, finished_product fp, compounding_batch cb
WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1' AND b.product_id = fp.product_id AND fp.product_code = 'FP-BAG-50KG-01' AND cb.batch_code = 'CB-2026-002';

INSERT INTO production_run (plant_id, bom_id, compounding_batch_id, production_number, start_datetime, end_datetime, status, planned_qty, actual_qty, input_weight_kg, output_weight_kg, scrap_weight_kg, yield_percentage, bags_produced, bags_per_kg, created_at, updated_at)
SELECT p.plant_id, b.bom_id, cb.compounding_batch_id, 'PR-2026-003', CURRENT_TIMESTAMP - INTERVAL '3' DAY, CURRENT_TIMESTAMP - INTERVAL '2' DAY, 'Completed', 10000.0000, 10000.0000, 820.0000, 805.0000, 15.0000, 98.170, 10000.0000, 12.420, CURRENT_TIMESTAMP - INTERVAL '3' DAY, CURRENT_TIMESTAMP - INTERVAL '2' DAY
FROM plant p, bom b, finished_product fp, compounding_batch cb
WHERE p.plant_name = 'Sri Vidha Polymers - Unit 1' AND b.product_id = fp.product_id AND fp.product_code = 'FP-BAG-50KG-01' AND cb.batch_code = 'CB-2026-001';

-- Production Stages for PR-2026-001
INSERT INTO production_stage (production_id, unit_id, machine_id, sequence_no, status, input_weight_kg, output_weight_kg, scrap_weight_kg, started_at, created_at)
SELECT pr.production_id, pu.unit_id, m.machine_id, 1, 'Running', 420.0000, 0.0000, 0.0000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM production_run pr, production_unit pu, machine m
WHERE pr.production_number = 'PR-2026-001' AND pu.unit_code = 'PU-EXT-01' AND m.machine_code = 'EXT-01';

INSERT INTO production_stage (production_id, unit_id, machine_id, sequence_no, status, input_weight_kg, output_weight_kg, scrap_weight_kg, started_at, created_at)
SELECT pr.production_id, pu.unit_id, m.machine_id, 2, 'Pending', 0.0000, 0.0000, 0.0000, NULL, CURRENT_TIMESTAMP
FROM production_run pr, production_unit pu, machine m
WHERE pr.production_number = 'PR-2026-001' AND pu.unit_code = 'PU-WEAV-01' AND m.machine_code = 'LOOM-01';

INSERT INTO production_stage (production_id, unit_id, machine_id, sequence_no, status, input_weight_kg, output_weight_kg, scrap_weight_kg, started_at, created_at)
SELECT pr.production_id, pu.unit_id, m.machine_id, 3, 'Pending', 0.0000, 0.0000, 0.0000, NULL, CURRENT_TIMESTAMP
FROM production_run pr, production_unit pu, machine m
WHERE pr.production_number = 'PR-2026-001' AND pu.unit_code = 'PU-CONV-01' AND m.machine_code = 'BCS-01';

-- Production Stages for PR-2026-002
INSERT INTO production_stage (production_id, unit_id, machine_id, sequence_no, status, input_weight_kg, output_weight_kg, scrap_weight_kg, started_at, created_at)
SELECT pr.production_id, pu.unit_id, m.machine_id, 1, 'Ready', 0.0000, 0.0000, 0.0000, NULL, CURRENT_TIMESTAMP
FROM production_run pr, production_unit pu, machine m
WHERE pr.production_number = 'PR-2026-002' AND pu.unit_code = 'PU-EXT-01' AND m.machine_code = 'EXT-01';

INSERT INTO production_stage (production_id, unit_id, machine_id, sequence_no, status, input_weight_kg, output_weight_kg, scrap_weight_kg, started_at, created_at)
SELECT pr.production_id, pu.unit_id, m.machine_id, 2, 'Pending', 0.0000, 0.0000, 0.0000, NULL, CURRENT_TIMESTAMP
FROM production_run pr, production_unit pu, machine m
WHERE pr.production_number = 'PR-2026-002' AND pu.unit_code = 'PU-WEAV-01' AND m.machine_code = 'LOOM-01';

INSERT INTO production_stage (production_id, unit_id, machine_id, sequence_no, status, input_weight_kg, output_weight_kg, scrap_weight_kg, started_at, created_at)
SELECT pr.production_id, pu.unit_id, m.machine_id, 3, 'Pending', 0.0000, 0.0000, 0.0000, NULL, CURRENT_TIMESTAMP
FROM production_run pr, production_unit pu, machine m
WHERE pr.production_number = 'PR-2026-002' AND pu.unit_code = 'PU-CONV-01' AND m.machine_code = 'BCS-01';

-- 17. Pallets & Barcodes
INSERT INTO pallet (pallet_code, barcode, warehouse_id, bin_id, status, created_at)
SELECT 'PAL-2026-0001', 'PAL-2026-0001', w.warehouse_id, b.bin_id, 'Stored', CURRENT_TIMESTAMP
FROM warehouse w, location_bin b
WHERE w.warehouse_name = 'Unit 1 Finished Goods Warehouse' AND b.bin_code = 'BIN-U3-01';

INSERT INTO pallet (pallet_code, barcode, warehouse_id, bin_id, status, created_at)
SELECT 'PAL-2026-0002', 'PAL-2026-0002', w.warehouse_id, b.bin_id, 'Stored', CURRENT_TIMESTAMP
FROM warehouse w, location_bin b
WHERE w.warehouse_name = 'Unit 1 Finished Goods Warehouse' AND b.bin_code = 'BIN-U3-02';

INSERT INTO pallet (pallet_code, barcode, warehouse_id, bin_id, status, created_at)
SELECT 'PAL-2026-0003', 'PAL-2026-0003', w.warehouse_id, b.bin_id, 'Open', CURRENT_TIMESTAMP
FROM warehouse w, location_bin b
WHERE w.warehouse_name = 'Unit 1 Finished Goods Warehouse' AND b.bin_code = 'BIN-U3-03';

INSERT INTO pallet_item (pallet_id, finished_batch_id, quantity, created_at)
SELECT p.pallet_id, fb.finished_batch_id, 2500.0000, CURRENT_TIMESTAMP
FROM pallet p, finished_batch fb
WHERE p.pallet_code = 'PAL-2026-0001' AND fb.batch_no = 'FB-2026-BAG-01';

INSERT INTO pallet_item (pallet_id, finished_batch_id, quantity, created_at)
SELECT p.pallet_id, fb.finished_batch_id, 2000.0000, CURRENT_TIMESTAMP
FROM pallet p, finished_batch fb
WHERE p.pallet_code = 'PAL-2026-0002' AND fb.batch_no = 'FB-2026-BAG-02';

-- 18. QC Specifications & Quality Inspections
INSERT INTO qc_specification (product_id, inspection_type, parameter_name, minimum_value, maximum_value, target_value, measurement_unit, is_critical, is_active)
SELECT fp.product_id, 'Final', 'Grammage (GSM)', 65.0000, 75.0000, 70.0000, 'GSM', FALSE, TRUE
FROM finished_product fp WHERE fp.product_code = 'FP-BAG-50KG-01';

INSERT INTO qc_specification (product_id, inspection_type, parameter_name, minimum_value, maximum_value, target_value, measurement_unit, is_critical, is_active)
SELECT fp.product_id, 'Final', 'Tensile Strength - Warp', 80.0000, 110.0000, 95.0000, 'kgf', TRUE, TRUE
FROM finished_product fp WHERE fp.product_code = 'FP-BAG-50KG-01';

INSERT INTO quality_inspection (finished_batch_id, inspection_type, status, remarks, inspected_by, inspection_date)
SELECT fb.finished_batch_id, 'Final', 'Pass', 'All tensile strength and GSM specs within tolerance', u.user_id, CURRENT_TIMESTAMP
FROM finished_batch fb, app_user u
WHERE fb.batch_no = 'FB-2026-BAG-01' AND u.user_name = 'supervisor01';

INSERT INTO quality_inspection (material_batch_id, inspection_type, status, remarks, inspected_by, inspection_date)
SELECT mb.batch_id, 'Incoming', 'Pass', 'MFI and granule purity confirmed with vendor COA', u.user_id, CURRENT_TIMESTAMP - INTERVAL '3' DAY
FROM material_batch mb, app_user u
WHERE mb.batch_no = 'RM-2026-001' AND u.user_name = 'supervisor01';

-- 19. Customers, Orders, Vehicles, Drivers & Dispatches
INSERT INTO customer (customer_name, customer_code, email, phone, is_active, created_at, updated_at)
VALUES ('IFFCO Fertilizer Corp', 'CUST-IFFCO-01', 'procurement@iffco.in', '+91 40 2345 1122', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO customer (customer_name, customer_code, email, phone, is_active, created_at, updated_at)
VALUES ('Coromandel International Ltd', 'CUST-CORO-01', 'supplychain@coromandel.biz', '+91 40 6699 0000', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO customer (customer_name, customer_code, email, phone, is_active, created_at, updated_at)
VALUES ('UltraTech Cement Limited', 'CUST-ULTRA-01', 'orders@ultratechcement.com', '+91 22 6691 7800', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO vehicle (vehicle_number, vehicle_type, capacity, is_active)
VALUES ('AP-16-TX-9874', '10-Ton Truck', 10000.000, TRUE);

INSERT INTO vehicle (vehicle_number, vehicle_type, capacity, is_active)
VALUES ('TS-09-UB-4521', '16-Ton Multi-Axle Truck', 16000.000, TRUE);

INSERT INTO driver (driver_name, license_number, license_expiry, phone, is_active)
VALUES ('Ramesh Kumar', 'DL-AP-16-2018-009847', CURRENT_DATE + INTERVAL '365' DAY, '+91 98480 12345', TRUE);

INSERT INTO driver (driver_name, license_number, license_expiry, phone, is_active)
VALUES ('Suresh Reddy', 'DL-TS-09-2020-004512', CURRENT_DATE + INTERVAL '500' DAY, '+91 98490 67890', TRUE);

INSERT INTO customer_order (customer_id, plant_id, order_number, order_date, required_date, status, subtotal, discount_amount, tax_amount, grand_total, created_by, created_at)
SELECT c.customer_id, p.plant_id, 'ORD-2026-001', CURRENT_DATE, CURRENT_DATE + INTERVAL '7' DAY, 'Open', 150000.0000, 0.0000, 27000.0000, 177000.0000, u.user_id, CURRENT_TIMESTAMP
FROM customer c, plant p, app_user u
WHERE c.customer_code = 'CUST-IFFCO-01' AND p.plant_name = 'Sri Vidha Polymers - Unit 1' AND u.user_name = 'supervisor01';

INSERT INTO customer_order_item (order_id, product_id, ordered_qty, fulfilled_qty, pending_qty, rate, discount_amount, tax_amount)
SELECT o.order_id, fp.product_id, 5000.0000, 0.0000, 5000.0000, 30.0000, 0.0000, 27000.0000
FROM customer_order o, finished_product fp
WHERE o.order_number = 'ORD-2026-001' AND fp.product_code = 'FP-BAG-50KG-01';

-- Inventory for Finished Goods
INSERT INTO inventory (bin_id, finished_batch_id, quantity_on_hand, reserved_qty, quality_status, updated_at)
SELECT b.bin_id, fb.finished_batch_id, 10000.0000, 0.0000, 'Available', CURRENT_TIMESTAMP
FROM location_bin b, finished_batch fb
WHERE b.bin_code = 'BIN-U3-01' 
  AND fb.batch_no = 'FB-2026-BAG-01';

INSERT INTO order_allocation (order_item_id, finished_batch_id, warehouse_id, bin_id, allocated_qty, allocation_status)
SELECT oi.order_item_id, fb.finished_batch_id, w.warehouse_id, b.bin_id, 3000.0000, 'Partial'
FROM customer_order_item oi, customer_order o, finished_batch fb, warehouse w, location_bin b
WHERE oi.order_id = o.order_id AND o.order_number = 'ORD-2026-001'
  AND fb.batch_no = 'FB-2026-BAG-01'
  AND w.warehouse_name = 'Unit 1 Finished Goods Warehouse'
  AND b.bin_code = 'BIN-U3-01';

INSERT INTO dispatch (order_id, vehicle_id, driver_id, dispatch_number, dispatch_date, expected_delivery_date, status, carrier, shipping_method, tracking_number, created_by, created_at)
SELECT o.order_id, v.vehicle_id, d.driver_id, 'DSP-20260922-001', CURRENT_DATE, CURRENT_DATE, 'Prepared', 'Sri Vidha Logistics', 'Road Transport', 'TRK-2026-9874', u.user_id, CURRENT_TIMESTAMP
FROM customer_order o, vehicle v, driver d, app_user u
WHERE o.order_number = 'ORD-2026-001' 
  AND v.vehicle_number = 'AP-16-TX-9874' 
  AND d.license_number = 'DL-AP-16-2018-009847' 
  AND u.user_name = 'supervisor01';

INSERT INTO dispatch_item (dispatch_id, allocation_id, finished_batch_id, quantity)
SELECT dp.dispatch_id, oa.allocation_id, fb.finished_batch_id, 3000.0000
FROM dispatch dp, order_allocation oa, finished_batch fb
WHERE dp.dispatch_number = 'DSP-20260922-001' 
  AND fb.batch_no = 'FB-2026-BAG-01'
  AND oa.allocated_qty = 3000.0000;

-- 20. Full End-to-End Batch Traceability Lineage
INSERT INTO batch_genealogy (finished_batch_id, raw_material_batch_id, compounding_batch_id, production_id, quantity_consumed)
SELECT fb.finished_batch_id, mb.batch_id, cb.compounding_batch_id, pr.production_id, 350.0000
FROM finished_batch fb, material_batch mb, compounding_batch cb, production_run pr
WHERE fb.batch_no = 'FB-2026-BAG-01' 
  AND mb.batch_no = 'RM-2026-001' 
  AND cb.batch_code = 'CB-2026-001' 
  AND pr.production_number = 'PR-2026-001';

INSERT INTO batch_genealogy (finished_batch_id, raw_material_batch_id, compounding_batch_id, production_id, quantity_consumed)
SELECT fb.finished_batch_id, mb.batch_id, cb.compounding_batch_id, pr.production_id, 50.0000
FROM finished_batch fb, material_batch mb, compounding_batch cb, production_run pr
WHERE fb.batch_no = 'FB-2026-BAG-01' 
  AND mb.batch_no = 'RM-2026-002' 
  AND cb.batch_code = 'CB-2026-001' 
  AND pr.production_number = 'PR-2026-001';

COMMIT;

