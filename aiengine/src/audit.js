import fs from 'node:fs';
import path from 'node:path';
import { AUDIT_FILE } from './config.js';

export function writeAuditEvent(event) {
  fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
  fs.appendFileSync(AUDIT_FILE, JSON.stringify(event) + '\n', 'utf8');
}

export function parseAuditLogArgs(args) {
  let limit = 10;
  let format = 'summary';
  let requestId = null;
  let action = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i] ?? '').trim();

    if (!arg) {
      continue;
    }

    if (arg === '--full') {
      format = 'full';
      continue;
    }

    if (arg === '--json') {
      format = 'json';
      continue;
    }

    if (arg === '--request') {
      const value = String(args[i + 1] ?? '').trim();
      if (!value) {
        throw new Error('Missing value for --request');
      }

      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Invalid value for --request: "${value}". Expected a positive integer.`);
      }

      requestId = parsed;
      i += 1;
      continue;
    }

    if (arg === '--action') {
      const value = String(args[i + 1] ?? '').trim();
      if (!value) {
        throw new Error('Missing value for --action');
      }

      action = value;
      i += 1;
      continue;
    }

    if (!arg.startsWith('--')) {
      const parsedLimit = Number(arg);
      if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
        limit = parsedLimit;
        continue;
      }
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown audit-log option: ${arg}`);
    }

    throw new Error(`Invalid audit-log argument: ${arg}`);
  }

  return { limit, format, requestId, action };
}

export function showAuditLog(limit = 10, format = 'summary', requestId = null, action = null) {
  if (!fs.existsSync(AUDIT_FILE)) {
    console.log('No audit log found yet.');
    return;
  }

  const raw = fs.readFileSync(AUDIT_FILE, 'utf8');
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    console.log('Audit log is empty.');
    return;
  }

  let entries = lines.map((line) => {
    try {
      return { parsed: true, raw: line, entry: JSON.parse(line) };
    } catch {
      return { parsed: false, raw: line, entry: null };
    }
  });

  if (requestId !== null) {
    entries = entries.filter(
      (item) =>
        item.parsed &&
        item.entry &&
        Number(item.entry.requestId) === Number(requestId)
    );
  }

  if (action !== null) {
    const normalizedAction = String(action).trim();
    entries = entries.filter(
      (item) =>
        item.parsed &&
        item.entry &&
        String(item.entry.action ?? '').trim() === normalizedAction
    );
  }

  if (entries.length === 0) {
    console.log('No audit log entries matched the given filters.');
    return;
  }

  const safeLimit =
    Number.isInteger(limit) && limit > 0 ? limit : 10;

  const selected = entries.slice(-safeLimit);

  if (format === 'json') {
    selected.forEach((item) => {
      if (item.parsed) {
        console.log(JSON.stringify(item.entry));
      } else {
        console.log(item.raw);
      }
    });
    return;
  }

  console.log(`Last ${selected.length} audit log entr${selected.length === 1 ? 'y' : 'ies'}:`);

  selected.forEach((item, index) => {
    if (!item.parsed) {
      console.log(`${index + 1}. ${item.raw}`);
      return;
    }

    const entry = item.entry;

    if (format === 'full') {
      console.log(`${index + 1}.`);
      console.log(JSON.stringify(entry, null, 2));
      return;
    }

    console.log(
      `${index + 1}. ${entry.timestamp} | request=${entry.requestId} | supplier=${entry.supplier} | actor=${entry.actor ?? 'n/a'} | action=${entry.action} | guardrail=${entry.guardrailResult ?? 'n/a'} | score=${entry.finalScore ?? 'n/a'} | reason=${entry.reason ?? 'n/a'}`
    );
  });
}