import { NextRequest, NextResponse } from "next/server";
import prisma from "@backend/lib/prisma";
import { getUserFromRequest } from "@backend/lib/jwt";

const MAX_SQL_FILE_BYTES = 20 * 1024 * 1024;

const TABLE_DELETE_ORDER = [
  "disposal_approval_requests",
  "consumable_issue_logs",
  "reports",
  "report_folders",
  "assets",
  "products",
  "product_types",
  "vendors",
  "categories",
  "sites",
  "departments",
  "app_settings",
] as const;

const TABLE_INSERT_ORDER = [
  "departments",
  "sites",
  "categories",
  "vendors",
  "product_types",
  "products",
  "assets",
  "report_folders",
  "reports",
  "consumable_issue_logs",
  "disposal_approval_requests",
  "app_settings",
] as const;

const ALLOWED_INSERT_TABLES = new Set<string>(TABLE_INSERT_ORDER);

type InsertStatementByTable = Map<string, string[]>;

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];
    const prev = sql[i - 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        current += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
      if (char === "-" && next === "-") {
        const third = sql[i + 2];
        if (third === " " || third === "\t" || third === "\n" || third === "\r" || third === undefined) {
          inLineComment = true;
          i += 1;
          continue;
        }
      }

      if (char === "#") {
        inLineComment = true;
        continue;
      }

      if (char === "/" && next === "*") {
        inBlockComment = true;
        i += 1;
        continue;
      }
    }

    if (char === "'" && !inDoubleQuote && !inBacktick && prev !== "\\") {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (char === '"' && !inSingleQuote && !inBacktick && prev !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (char === "`" && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
      current += char;
      continue;
    }

    if (char === ";" && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const trailing = current.trim();
  if (trailing) {
    statements.push(trailing);
  }

  return statements;
}

function extractInsertStatements(sql: string): InsertStatementByTable {
  const byTable: InsertStatementByTable = new Map();
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    const match = statement.match(/^INSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?\s+VALUES\b/i);
    if (!match) {
      continue;
    }

    const tableName = String(match[1] || "").toLowerCase();
    if (!ALLOWED_INSERT_TABLES.has(tableName)) {
      continue;
    }

    const existing = byTable.get(tableName) || [];
    existing.push(`${statement};`);
    byTable.set(tableName, existing);
  }

  return byTable;
}

export async function POST(req: NextRequest) {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Please upload a SQL file" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".sql")) {
      return NextResponse.json({ message: "Unsupported file type. Use a .sql file." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_SQL_FILE_BYTES) {
      return NextResponse.json(
        { message: "SQL file must be between 1 byte and 20 MB" },
        { status: 400 },
      );
    }

    const sqlText = await file.text();
    const insertStatements = extractInsertStatements(sqlText);

    const statementCount = Array.from(insertStatements.values()).reduce((sum, list) => sum + list.length, 0);
    if (statementCount === 0) {
      return NextResponse.json(
        { message: "No supported INSERT statements were found in the SQL file" },
        { status: 400 },
      );
    }

    const restoredTables: Record<string, number> = {};

    await prisma.$transaction(
      async (tx) => {
        for (const tableName of TABLE_DELETE_ORDER) {
          await tx.$executeRawUnsafe(`DELETE FROM \`${tableName}\``);
        }

        for (const tableName of TABLE_INSERT_ORDER) {
          const statementsForTable = insertStatements.get(tableName) || [];
          restoredTables[tableName] = statementsForTable.length;

          for (const statement of statementsForTable) {
            await tx.$executeRawUnsafe(statement);
          }
        }
      },
      {
        maxWait: 30_000,
        timeout: 180_000,
      },
    );

    return NextResponse.json({
      message: "Database rollback completed (users preserved)",
      restoredTables,
      statementCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to rollback database";
    return NextResponse.json({ message }, { status: 500 });
  }
}
