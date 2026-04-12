import { Prisma } from "@prisma/client";
import prisma from "@backend/lib/prisma";

const DISPOSAL_RECIPIENTS_KEY = "disposal_recipient_emails";

async function ensureAppSettingsTable() {
  await prisma.$executeRaw(
    Prisma.sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        key_name VARCHAR(191) NOT NULL,
        value_text TEXT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (key_name)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `,
  );
}

function normalizeRecipientEmails(value: string): string[] {
  const uniq = new Set(
    value
      .split(/[;,\s]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  return [...uniq];
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function getDisposalRecipientEmails(): Promise<string[]> {
  await ensureAppSettingsTable();

  const rows = await prisma.$queryRaw<Array<{ value_text: string | null }>>(
    Prisma.sql`SELECT value_text FROM app_settings WHERE key_name = ${DISPOSAL_RECIPIENTS_KEY} LIMIT 1`,
  );

  const stored = rows[0]?.value_text || "";
  const parsed = normalizeRecipientEmails(stored);
  if (parsed.length > 0) return parsed;

  const envFallback = normalizeRecipientEmails(process.env.DISPOSAL_RECIPIENT_EMAILS || "");
  return envFallback;
}

export async function setDisposalRecipientEmails(input: string[]): Promise<string[]> {
  await ensureAppSettingsTable();

  const recipients = [...new Set(input.map((email) => email.trim().toLowerCase()).filter(Boolean))];

  const invalid = recipients.filter((email) => !isValidEmail(email));
  if (invalid.length > 0) {
    throw new Error(`Invalid email(s): ${invalid.join(", ")}`);
  }

  const valueText = recipients.join(",");

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO app_settings (key_name, value_text)
      VALUES (${DISPOSAL_RECIPIENTS_KEY}, ${valueText})
      ON DUPLICATE KEY UPDATE value_text = VALUES(value_text), updated_at = CURRENT_TIMESTAMP
    `,
  );

  return recipients;
}
