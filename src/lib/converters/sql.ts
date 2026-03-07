/**
 * SQL Dialect Converter – MSSQL ↔ MySQL ↔ PostgreSQL
 */

export type SqlDialect = "mssql" | "mysql" | "pgsql";

// ─── Dialect detection ──────────────────────────────────────────────────────

const MSSQL_MARKERS = [
  /\bGO\b/m,
  /\bTOP\s*\(/i,
  /\bNVARCHAR\b/i,
  /\bNTEXT\b/i,
  /\bDATETIME2\b/i,
  /\bUNIQUEIDENTIFIER\b/i,
  /\bIDENTITY\s*\(/i,
  /\bISNULL\s*\(/i,
  /\bGETDATE\s*\(\)/i,
  /\bNOLOCK\b/i,
  /\[\w+\]/,
  /\bBIT\b/i,
  /\bDATEDIFF\s*\(/i,
  /\bDATEADD\s*\(/i,
  /\bCONVERT\s*\(/i,
  /\bSET\s+NOCOUNT\s+ON/i,
  /\bVARCHAR\s*\(\s*MAX\s*\)/i,
];

const MYSQL_MARKERS = [
  /\bAUTO_INCREMENT\b/i,
  /\bENGINE\s*=\s*InnoDB/i,
  /\bLIMIT\s+\d+/i,
  /`\w+`/,
  /\bIFNULL\s*\(/i,
  /\bNOW\s*\(\)/i,
  /\bINT\s+UNSIGNED\b/i,
  /\bTINYINT\s*\(\s*1\s*\)/i,
  /\bDEFAULT\s+CHARSET/i,
  /\bSHOW\s+TABLES/i,
  /\bSHOW\s+DATABASES/i,
  /\bUSE\s+`?\w+`?/i,
  /\bON\s+DUPLICATE\s+KEY\s+UPDATE/i,
  /\bGROUP_CONCAT\s*\(/i,
];

const PGSQL_MARKERS = [
  /\bSERIAL\b/i,
  /\bBIGSERIAL\b/i,
  /\bRETURNING\b/i,
  /\bTEXT\b/i,
  /\bBOOLEAN\b/i,
  /\bTIMESTAMPTZ\b/i,
  /\bJSON[B]?\b/i,
  /\bCOALESCE\s*\(/i,
  /\bNOW\s*\(\)/i,
  /\bCREATE\s+EXTENSION/i,
  /\bON\s+CONFLICT\b/i,
  /\bDO\s+UPDATE\s+SET\b/i,
  /\bGENERATED\s+ALWAYS\s+AS\s+IDENTITY/i,
  /\b::\w+/,
  /\bUUID\b/i,
];

export function detectSqlDialect(sql: string): SqlDialect {
  let mssqlScore = 0;
  let mysqlScore = 0;
  let pgsqlScore = 0;

  for (const pat of MSSQL_MARKERS) if (pat.test(sql)) mssqlScore++;
  for (const pat of MYSQL_MARKERS) if (pat.test(sql)) mysqlScore++;
  for (const pat of PGSQL_MARKERS) if (pat.test(sql)) pgsqlScore++;

  if (mssqlScore >= mysqlScore && mssqlScore >= pgsqlScore) return "mssql";
  if (mysqlScore >= pgsqlScore) return "mysql";
  return "pgsql";
}

// ─── MSSQL → MySQL ──────────────────────────────────────────────────────────

export function mssqlToMysql(sql: string): string {
  let out = sql;

  // Remove GO statements
  out = out.replace(/^\s*GO\s*$/gim, "");

  // SET NOCOUNT ON
  out = out.replace(/SET\s+NOCOUNT\s+ON\s*;?/gi, "");

  // Square brackets → backticks
  out = out.replace(/\[(\w+)\]/g, "`$1`");

  // Data types
  out = out.replace(/\bNVARCHAR\s*\(\s*MAX\s*\)/gi, "LONGTEXT");
  out = out.replace(/\bVARCHAR\s*\(\s*MAX\s*\)/gi, "LONGTEXT");
  out = out.replace(/\bNVARCHAR\b/gi, "VARCHAR");
  out = out.replace(/\bNTEXT\b/gi, "LONGTEXT");
  out = out.replace(/\bNCHAR\b/gi, "CHAR");
  out = out.replace(/\bDATETIME2\b/gi, "DATETIME(6)");
  out = out.replace(/\bSMALLDATETIME\b/gi, "DATETIME");
  out = out.replace(/\bUNIQUEIDENTIFIER\b/gi, "CHAR(36)");
  out = out.replace(/\bBIT\b/gi, "TINYINT(1)");
  out = out.replace(/\bMONEY\b/gi, "DECIMAL(19,4)");
  out = out.replace(/\bSMALLMONEY\b/gi, "DECIMAL(10,4)");
  out = out.replace(/\bIMAGE\b/gi, "LONGBLOB");
  out = out.replace(/\bVARBINARY\s*\(\s*MAX\s*\)/gi, "LONGBLOB");

  // IDENTITY → AUTO_INCREMENT
  out = out.replace(/\bIDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, "AUTO_INCREMENT");

  // ISNULL → IFNULL
  out = out.replace(/\bISNULL\s*\(/gi, "IFNULL(");

  // GETDATE() → NOW()
  out = out.replace(/\bGETDATE\s*\(\)/gi, "NOW()");

  // GETUTCDATE() → UTC_TIMESTAMP()
  out = out.replace(/\bGETUTCDATE\s*\(\)/gi, "UTC_TIMESTAMP()");

  // NEWID() → UUID()
  out = out.replace(/\bNEWID\s*\(\)/gi, "UUID()");

  // TOP → LIMIT (simple SELECT)
  out = out.replace(
    /\bSELECT\s+TOP\s*\(\s*(\d+)\s*\)\s+(.+?)(?=\bFROM\b)/gi,
    (_, n, cols) => `SELECT ${cols.trim()} `
  );
  // Add LIMIT at end of statement for TOP conversions (best-effort)
  out = out.replace(
    /\bSELECT\s+TOP\s+(\d+)\b/gi,
    "SELECT "
  );

  // LEN() → CHAR_LENGTH()
  out = out.replace(/\bLEN\s*\(/gi, "CHAR_LENGTH(");

  // CHARINDEX → LOCATE (swap args)
  out = out.replace(
    /\bCHARINDEX\s*\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*\)/gi,
    "LOCATE($1, $2)"
  );

  // String concatenation: + → CONCAT (simple cases)
  // This is hard to do perfectly; we handle obvious string + string
  out = out.replace(/\bCONVERT\s*\(\s*VARCHAR[^)]*\)\s*,\s*/gi, "CAST(");

  return out.trim();
}

// ─── MSSQL → PostgreSQL ─────────────────────────────────────────────────────

export function mssqlToPostgres(sql: string): string {
  let out = sql;

  // Remove GO
  out = out.replace(/^\s*GO\s*$/gim, "");

  // SET NOCOUNT ON
  out = out.replace(/SET\s+NOCOUNT\s+ON\s*;?/gi, "");

  // Square brackets → double quotes
  out = out.replace(/\[(\w+)\]/g, '"$1"');

  // Data types
  out = out.replace(/\bNVARCHAR\s*\(\s*MAX\s*\)/gi, "TEXT");
  out = out.replace(/\bVARCHAR\s*\(\s*MAX\s*\)/gi, "TEXT");
  out = out.replace(/\bNVARCHAR\b/gi, "VARCHAR");
  out = out.replace(/\bNTEXT\b/gi, "TEXT");
  out = out.replace(/\bNCHAR\b/gi, "CHAR");
  out = out.replace(/\bDATETIME2\b/gi, "TIMESTAMP");
  out = out.replace(/\bDATETIME\b/gi, "TIMESTAMP");
  out = out.replace(/\bSMALLDATETIME\b/gi, "TIMESTAMP");
  out = out.replace(/\bUNIQUEIDENTIFIER\b/gi, "UUID");
  out = out.replace(/\bBIT\b/gi, "BOOLEAN");
  out = out.replace(/\bMONEY\b/gi, "NUMERIC(19,4)");
  out = out.replace(/\bSMALLMONEY\b/gi, "NUMERIC(10,4)");
  out = out.replace(/\bTINYINT\b/gi, "SMALLINT");
  out = out.replace(/\bIMAGE\b/gi, "BYTEA");
  out = out.replace(/\bVARBINARY\s*\(\s*MAX\s*\)/gi, "BYTEA");
  out = out.replace(/\bINT\s+IDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, "SERIAL");
  out = out.replace(/\bBIGINT\s+IDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, "BIGSERIAL");

  // For remaining IDENTITY (column already typed)
  out = out.replace(/\bIDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, "GENERATED ALWAYS AS IDENTITY");

  // ISNULL → COALESCE
  out = out.replace(/\bISNULL\s*\(/gi, "COALESCE(");

  // GETDATE() → NOW()
  out = out.replace(/\bGETDATE\s*\(\)/gi, "NOW()");

  // GETUTCDATE() → NOW() AT TIME ZONE 'UTC'
  out = out.replace(/\bGETUTCDATE\s*\(\)/gi, "NOW() AT TIME ZONE 'UTC'");

  // NEWID() → gen_random_uuid()
  out = out.replace(/\bNEWID\s*\(\)/gi, "gen_random_uuid()");

  // TOP → LIMIT
  out = out.replace(
    /\bSELECT\s+TOP\s*\(?\s*(\d+)\s*\)?\b/gi,
    "SELECT "
  );

  // LEN() → LENGTH()
  out = out.replace(/\bLEN\s*\(/gi, "LENGTH(");

  // CHARINDEX → POSITION
  out = out.replace(
    /\bCHARINDEX\s*\(\s*([^,]+?)\s*,\s*([^,)]+?)\s*\)/gi,
    "POSITION($1 IN $2)"
  );

  return out.trim();
}

// ─── MySQL → MSSQL ──────────────────────────────────────────────────────────

export function mysqlToMssql(sql: string): string {
  let out = sql;

  // Backticks → square brackets
  out = out.replace(/`(\w+)`/g, "[$1]");

  // AUTO_INCREMENT → IDENTITY(1,1)
  out = out.replace(/\bAUTO_INCREMENT\b/gi, "IDENTITY(1,1)");

  // Data types
  out = out.replace(/\bLONGTEXT\b/gi, "NVARCHAR(MAX)");
  out = out.replace(/\bMEDIUMTEXT\b/gi, "NVARCHAR(MAX)");
  out = out.replace(/\bTINYTEXT\b/gi, "NVARCHAR(255)");
  out = out.replace(/\bTEXT\b/gi, "NVARCHAR(MAX)");
  out = out.replace(/\bTINYINT\s*\(\s*1\s*\)/gi, "BIT");
  out = out.replace(/\bDOUBLE\b/gi, "FLOAT");
  out = out.replace(/\bLONGBLOB\b/gi, "VARBINARY(MAX)");
  out = out.replace(/\bMEDIUMBLOB\b/gi, "VARBINARY(MAX)");
  out = out.replace(/\bBLOB\b/gi, "VARBINARY(MAX)");
  out = out.replace(/\bBOOLEAN\b/gi, "BIT");
  out = out.replace(/\bBOOL\b/gi, "BIT");
  out = out.replace(/\bDATETIME\s*\(\s*6\s*\)/gi, "DATETIME2");
  out = out.replace(/\bINT\s+UNSIGNED\b/gi, "BIGINT");

  // IFNULL → ISNULL
  out = out.replace(/\bIFNULL\s*\(/gi, "ISNULL(");

  // NOW() → GETDATE()
  out = out.replace(/\bNOW\s*\(\)/gi, "GETDATE()");

  // UTC_TIMESTAMP() → GETUTCDATE()
  out = out.replace(/\bUTC_TIMESTAMP\s*\(\)/gi, "GETUTCDATE()");

  // UUID() → NEWID()
  out = out.replace(/\bUUID\s*\(\)/gi, "NEWID()");

  // LIMIT n → TOP n (simple)
  out = out.replace(
    /\bLIMIT\s+(\d+)\s*$/gim,
    "-- LIMIT $1 (use TOP in SELECT)"
  );

  // CHAR_LENGTH → LEN
  out = out.replace(/\bCHAR_LENGTH\s*\(/gi, "LEN(");
  out = out.replace(/\bCHARACTER_LENGTH\s*\(/gi, "LEN(");

  // ENGINE=... remove
  out = out.replace(/\s*ENGINE\s*=\s*\w+/gi, "");

  // DEFAULT CHARSET=... remove
  out = out.replace(/\s*DEFAULT\s+CHARSET\s*=\s*\w+/gi, "");

  // GROUP_CONCAT → STRING_AGG (approximate)
  out = out.replace(/\bGROUP_CONCAT\s*\(/gi, "STRING_AGG(");

  return out.trim();
}

// ─── MySQL → PostgreSQL ─────────────────────────────────────────────────────

export function mysqlToPostgres(sql: string): string {
  let out = sql;

  // Backticks → double quotes
  out = out.replace(/`(\w+)`/g, '"$1"');

  // AUTO_INCREMENT → GENERATED ALWAYS AS IDENTITY
  out = out.replace(/\bINT\s+AUTO_INCREMENT\b/gi, "SERIAL");
  out = out.replace(/\bBIGINT\s+AUTO_INCREMENT\b/gi, "BIGSERIAL");
  out = out.replace(/\bAUTO_INCREMENT\b/gi, "GENERATED ALWAYS AS IDENTITY");

  // Data types
  out = out.replace(/\bLONGTEXT\b/gi, "TEXT");
  out = out.replace(/\bMEDIUMTEXT\b/gi, "TEXT");
  out = out.replace(/\bTINYTEXT\b/gi, "TEXT");
  out = out.replace(/\bTINYINT\s*\(\s*1\s*\)/gi, "BOOLEAN");
  out = out.replace(/\bTINYINT\b/gi, "SMALLINT");
  out = out.replace(/\bDOUBLE\b/gi, "DOUBLE PRECISION");
  out = out.replace(/\bFLOAT\b/gi, "REAL");
  out = out.replace(/\bLONGBLOB\b/gi, "BYTEA");
  out = out.replace(/\bMEDIUMBLOB\b/gi, "BYTEA");
  out = out.replace(/\bBLOB\b/gi, "BYTEA");
  out = out.replace(/\bDATETIME\s*\(\s*6\s*\)/gi, "TIMESTAMP");
  out = out.replace(/\bDATETIME\b/gi, "TIMESTAMP");
  out = out.replace(/\bINT\s+UNSIGNED\b/gi, "BIGINT");
  out = out.replace(/\bBOOL\b/gi, "BOOLEAN");

  // IFNULL → COALESCE
  out = out.replace(/\bIFNULL\s*\(/gi, "COALESCE(");

  // UUID() → gen_random_uuid()
  out = out.replace(/\bUUID\s*\(\)/gi, "gen_random_uuid()");

  // ENGINE=... remove
  out = out.replace(/\s*ENGINE\s*=\s*\w+/gi, "");
  out = out.replace(/\s*DEFAULT\s+CHARSET\s*=\s*\w+/gi, "");

  // GROUP_CONCAT → STRING_AGG
  out = out.replace(/\bGROUP_CONCAT\s*\(/gi, "STRING_AGG(");

  // ON DUPLICATE KEY UPDATE → ON CONFLICT ... DO UPDATE SET
  out = out.replace(
    /\bON\s+DUPLICATE\s+KEY\s+UPDATE\b/gi,
    "ON CONFLICT DO UPDATE SET"
  );

  return out.trim();
}

// ─── PostgreSQL → MSSQL ─────────────────────────────────────────────────────

export function postgresToMssql(sql: string): string {
  let out = sql;

  // Double quotes → square brackets
  out = out.replace(/"(\w+)"/g, "[$1]");

  // SERIAL / BIGSERIAL
  out = out.replace(/\bBIGSERIAL\b/gi, "BIGINT IDENTITY(1,1)");
  out = out.replace(/\bSERIAL\b/gi, "INT IDENTITY(1,1)");
  out = out.replace(/\bGENERATED\s+ALWAYS\s+AS\s+IDENTITY/gi, "IDENTITY(1,1)");

  // Data types
  out = out.replace(/\bTEXT\b/gi, "NVARCHAR(MAX)");
  out = out.replace(/\bBOOLEAN\b/gi, "BIT");
  out = out.replace(/\bTIMESTAMPTZ\b/gi, "DATETIMEOFFSET");
  out = out.replace(/\bTIMESTAMP\b/gi, "DATETIME2");
  out = out.replace(/\bUUID\b/gi, "UNIQUEIDENTIFIER");
  out = out.replace(/\bBYTEA\b/gi, "VARBINARY(MAX)");
  out = out.replace(/\bDOUBLE\s+PRECISION\b/gi, "FLOAT");
  out = out.replace(/\bREAL\b/gi, "FLOAT");
  out = out.replace(/\bSMALLINT\b/gi, "SMALLINT"); // Same
  out = out.replace(/\bJSONB?\b/gi, "NVARCHAR(MAX)");
  out = out.replace(/\bNUMERIC\b/gi, "DECIMAL");

  // COALESCE stays (supported by both), but for completeness:
  // gen_random_uuid() → NEWID()
  out = out.replace(/\bgen_random_uuid\s*\(\)/gi, "NEWID()");

  // NOW() → GETDATE()
  out = out.replace(/\bNOW\s*\(\)/gi, "GETDATE()");

  // LENGTH → LEN
  out = out.replace(/\bLENGTH\s*\(/gi, "LEN(");

  // LIMIT → TOP (approximate, comment-based)
  out = out.replace(
    /\bLIMIT\s+(\d+)\s*$/gim,
    "-- LIMIT $1 (use TOP in SELECT)"
  );

  // || → + (string concat)
  // Only simple cases within string context
  out = out.replace(/\|\|/g, "+");

  // :: casts → CAST
  out = out.replace(/(\w+)::(\w+)/g, "CAST($1 AS $2)");

  // STRING_AGG → STRING_AGG (same in MSSQL 2017+)

  // RETURNING → OUTPUT
  out = out.replace(/\bRETURNING\b/gi, "OUTPUT INSERTED.*");

  // ON CONFLICT → (comment)
  out = out.replace(/\bON\s+CONFLICT\b/gi, "-- ON CONFLICT (use MERGE in MSSQL)");

  return out.trim();
}

// ─── PostgreSQL → MySQL ─────────────────────────────────────────────────────

export function postgresToMysql(sql: string): string {
  let out = sql;

  // Double quotes → backticks
  out = out.replace(/"(\w+)"/g, "`$1`");

  // SERIAL
  out = out.replace(/\bBIGSERIAL\b/gi, "BIGINT AUTO_INCREMENT");
  out = out.replace(/\bSERIAL\b/gi, "INT AUTO_INCREMENT");
  out = out.replace(/\bGENERATED\s+ALWAYS\s+AS\s+IDENTITY/gi, "AUTO_INCREMENT");

  // Data types
  out = out.replace(/\bBOOLEAN\b/gi, "TINYINT(1)");
  out = out.replace(/\bTIMESTAMPTZ\b/gi, "DATETIME");
  out = out.replace(/\bTIMESTAMP\b/gi, "DATETIME");
  out = out.replace(/\bUUID\b/gi, "CHAR(36)");
  out = out.replace(/\bBYTEA\b/gi, "LONGBLOB");
  out = out.replace(/\bDOUBLE\s+PRECISION\b/gi, "DOUBLE");
  out = out.replace(/\bREAL\b/gi, "FLOAT");
  out = out.replace(/\bJSONB\b/gi, "JSON");
  out = out.replace(/\bNUMERIC\b/gi, "DECIMAL");

  // gen_random_uuid() → UUID()
  out = out.replace(/\bgen_random_uuid\s*\(\)/gi, "UUID()");

  // COALESCE → IFNULL (for 2-arg)
  // Keep COALESCE as MySQL supports it too

  // :: casts → remove or convert
  out = out.replace(/(\w+)::(\w+)/g, "CAST($1 AS $2)");

  // || → CONCAT
  // Hard to do perfectly; leave as-is (MySQL 8 supports || with PIPES_AS_CONCAT)

  // STRING_AGG → GROUP_CONCAT
  out = out.replace(/\bSTRING_AGG\s*\(/gi, "GROUP_CONCAT(");

  // RETURNING → (not supported, comment)
  out = out.replace(/\bRETURNING\b.*/gi, "-- RETURNING (not supported in MySQL)");

  // ON CONFLICT → ON DUPLICATE KEY UPDATE
  out = out.replace(
    /\bON\s+CONFLICT\s+DO\s+UPDATE\s+SET\b/gi,
    "ON DUPLICATE KEY UPDATE"
  );
  out = out.replace(
    /\bON\s+CONFLICT\s+DO\s+NOTHING\b/gi,
    "ON DUPLICATE KEY UPDATE id=id"
  );

  // CREATE EXTENSION → comment
  out = out.replace(/\bCREATE\s+EXTENSION\b.*$/gim, "-- $& (not needed in MySQL)");

  return out.trim();
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

export function convertSql(sql: string, from: SqlDialect, to: SqlDialect): string {
  if (from === to) return sql;

  const key = `${from}->${to}`;
  switch (key) {
    case "mssql->mysql": return mssqlToMysql(sql);
    case "mssql->pgsql": return mssqlToPostgres(sql);
    case "mysql->mssql": return mysqlToMssql(sql);
    case "mysql->pgsql": return mysqlToPostgres(sql);
    case "pgsql->mssql": return postgresToMssql(sql);
    case "pgsql->mysql": return postgresToMysql(sql);
    default: return sql;
  }
}
