import { execSync } from 'child_process';
import fs from 'fs';

export const TEST_DB = '/tmp/pang-test.db';

export default function setup() {
  for (const f of [TEST_DB, TEST_DB + '-journal']) if (fs.existsSync(f)) fs.rmSync(f);
  execSync('npx prisma db push --skip-generate --force-reset', {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB}` },
  });
}
