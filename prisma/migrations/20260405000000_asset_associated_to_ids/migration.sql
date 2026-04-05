SET @schema_name = DATABASE();

SET @has_associated_to_ids = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE BINARY TABLE_SCHEMA = BINARY @schema_name
    AND BINARY TABLE_NAME = BINARY 'assets'
    AND BINARY COLUMN_NAME = BINARY 'associatedToIds'
);

SET @add_associated_to_ids_sql = IF(
  @has_associated_to_ids = 0,
  'ALTER TABLE `assets` ADD COLUMN `associatedToIds` JSON NULL',
  'SELECT 1'
);

PREPARE add_associated_to_ids_stmt FROM @add_associated_to_ids_sql;
EXECUTE add_associated_to_ids_stmt;
DEALLOCATE PREPARE add_associated_to_ids_stmt;

SET @has_associated_to_id = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE BINARY TABLE_SCHEMA = BINARY @schema_name
    AND BINARY TABLE_NAME = BINARY 'assets'
    AND BINARY COLUMN_NAME = BINARY 'associatedToId'
);

SET @backfill_associated_sql = IF(
  @has_associated_to_id = 1,
  'UPDATE `assets` SET `associatedToIds` = JSON_ARRAY(`associatedToId`) WHERE `associatedToId` IS NOT NULL',
  'SELECT 1'
);

PREPARE backfill_associated_stmt FROM @backfill_associated_sql;
EXECUTE backfill_associated_stmt;
DEALLOCATE PREPARE backfill_associated_stmt;
