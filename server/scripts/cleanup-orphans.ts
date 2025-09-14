#!/usr/bin/env ts-node
import { cleanupOrphanedReportChildren } from '../import-persist.ts';

async function main() {
  const dryRun = process.argv.includes('--apply') ? false : true;
  console.log(`Running orphan cleanup (${dryRun ? 'DRY RUN' : 'APPLY'})...`);
  const result = await cleanupOrphanedReportChildren(dryRun);
  console.log(JSON.stringify(result, null, 2));
  if (dryRun) {
    console.log('Use --apply to actually delete orphaned rows.');
  }
}

main().catch(e => {
  console.error('Cleanup failed:', e);
  process.exit(1);
});
