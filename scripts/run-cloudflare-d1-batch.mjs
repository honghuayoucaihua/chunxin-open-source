import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const [, , sqlPathArg, modeArg = 'production'] = process.argv;

if (!sqlPathArg) {
  console.error('Usage: node scripts/run-cloudflare-d1-batch.mjs <sql-file> [production|preview]');
  process.exit(1);
}

const splitStatements = (sql) => {
  const statements = [];
  let current = '';
  let inSingleQuote = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (!inSingleQuote && char === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1;
      continue;
    }

    current += char;

    if (char === "'") {
      if (inSingleQuote && next === "'") {
        current += next;
        i += 1;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === ';' && !inSingleQuote) {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = '';
    }
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
};

const chunkStatements = (statements, maxChars = 240000, maxStatements = 16) => {
  const chunks = [];
  let current = [];
  let currentLength = 0;

  for (const statement of statements) {
    const nextLength = currentLength + statement.length + 2;
    if (current.length > 0 && (nextLength > maxChars || current.length >= maxStatements)) {
      chunks.push([...current]);
      current = [];
      currentLength = 0;
    }
    current.push(statement);
    currentLength += statement.length + 2;
  }

  if (current.length > 0) {
    chunks.push([...current]);
  }

  return chunks;
};

const statementChunks = (statements) => statements.map((statement) => [statement]);

const runChunk = async (sql, preview) => {
  const tempFile = path.join(os.tmpdir(), `chunxin-d1-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`);
  await fs.writeFile(tempFile, `${sql}\n`, 'utf8');
  const args = ['wrangler', 'd1', 'execute', 'APP_DB', '--remote'];
  if (preview) args.push('--preview');
  args.push('--file', tempFile);

  const result = spawnSync('npx', args, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env
  });

  await fs.rm(tempFile, { force: true }).catch(() => {});
  return result.status || 0;
};

const main = async () => {
  const sql = await fs.readFile(sqlPathArg, 'utf8');
  const statements = splitStatements(sql);
  const preview = modeArg === 'preview';

  const chunkQueue = chunkStatements(statements).map((chunk, index) => ({
    statements: chunk,
    label: `chunk ${index + 1}`
  }));

  console.log(`Preparing ${statements.length} SQL statements as ${chunkQueue.length} chunks for ${preview ? 'preview' : 'production'} D1.`);

  while (chunkQueue.length > 0) {
    const item = chunkQueue.shift();
    if (!item) continue;

    console.log(`Running ${item.label} (${item.statements.length} statement${item.statements.length === 1 ? '' : 's'})...`);
    const exitCode = await runChunk(item.statements.join('\n'), preview);

    if (exitCode === 0) {
      continue;
    }

    if (item.statements.length > 1) {
      console.warn(`Retrying ${item.label} as individual statements...`);
      const singles = statementChunks(item.statements).map((single, index) => ({
        statements: single,
        label: `${item.label}.${index + 1}`
      }));
      chunkQueue.unshift(...singles);
      continue;
    }

    const statement = item.statements[0] || '';
    if (/^INSERT INTO community_shares\b/i.test(statement)) {
      const idMatch = statement.match(/VALUES\s*\(\s*'([^']+)'/i);
      const skippedId = idMatch?.[1] || 'unknown-community-share';
      console.warn(`Skipping oversized or incompatible community share: ${skippedId}`);
      continue;
    }

    process.exit(exitCode || 1);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
