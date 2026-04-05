SET @schema_name = DATABASE();

SET @has_fk = (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE BINARY CONSTRAINT_SCHEMA = BINARY @schema_name
    AND BINARY TABLE_NAME = BINARY 'assets'
    AND BINARY CONSTRAINT_NAME = BINARY 'assets_associatedToId_fkey'
);

SET @drop_fk_sql = IF(
  @has_fk = 1,
  'ALTER TABLE `assets` DROP FOREIGN KEY `assets_associatedToId_fkey`',
  'SELECT 1'
);

PREPARE drop_fk_stmt FROM @drop_fk_sql;
EXECUTE drop_fk_stmt;
DEALLOCATE PREPARE drop_fk_stmt;

SET @has_idx = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE BINARY TABLE_SCHEMA = BINARY @schema_name
    AND BINARY TABLE_NAME = BINARY 'assets'
    AND BINARY INDEX_NAME = BINARY 'assets_associatedToId_idx'
);

SET @drop_idx_sql = IF(
  @has_idx = 1,
  'DROP INDEX `assets_associatedToId_idx` ON `assets`',
  'SELECT 1'
);

PREPARE drop_idx_stmt FROM @drop_idx_sql;
EXECUTE drop_idx_stmt;
DEALLOCATE PREPARE drop_idx_stmt;

SET @has_legacy_col = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE BINARY TABLE_SCHEMA = BINARY @schema_name
    AND BINARY TABLE_NAME = BINARY 'assets'
    AND BINARY COLUMN_NAME = BINARY 'associatedToId'
);

SET @drop_col_sql = IF(
  @has_legacy_col = 1,
  'ALTER TABLE `assets` DROP COLUMN `associatedToId`',
  'SELECT 1'
);

PREPARE drop_col_stmt FROM @drop_col_sql;
EXECUTE drop_col_stmt;
DEALLOCATE PREPARE drop_col_stmt;
