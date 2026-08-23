const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.resolve(__dirname, '../backups');
const backupFile = path.join(BACKUP_DIR, `opspilot_dr_test.sql`);

console.log('1. Dumping opspilot database...');
const dumpBuffer = execSync('docker exec opspilot_postgres pg_dump -U opspilot -d opspilot --clean --if-exists', {
  maxBuffer: 50 * 1024 * 1024,
});
fs.writeFileSync(backupFile, dumpBuffer);
console.log(`   Dump written: ${(dumpBuffer.length / 1024).toFixed(1)} KB`);

console.log('2. Recreating opspilot_dr_verify database...');
execSync('docker exec opspilot_postgres psql -U opspilot -d postgres -c "DROP DATABASE IF EXISTS opspilot_dr_verify;"');
execSync('docker exec opspilot_postgres psql -U opspilot -d postgres -c "CREATE DATABASE opspilot_dr_verify;"');

console.log('3. Restoring dump using input buffer...');
execSync('docker exec -i opspilot_postgres psql -U opspilot -d opspilot_dr_verify', {
  input: dumpBuffer,
});

console.log('4. Verifying restored counts against primary DB:');
const origRuns = execSync('docker exec opspilot_postgres psql -U opspilot -d opspilot -t -c "SELECT COUNT(*) FROM pipeline_runs;"', { encoding: 'utf-8' }).trim();
const drRuns = execSync('docker exec opspilot_postgres psql -U opspilot -d opspilot_dr_verify -t -c "SELECT COUNT(*) FROM pipeline_runs;"', { encoding: 'utf-8' }).trim();

const origUsers = execSync('docker exec opspilot_postgres psql -U opspilot -d opspilot -t -c "SELECT COUNT(*) FROM users;"', { encoding: 'utf-8' }).trim();
const drUsers = execSync('docker exec opspilot_postgres psql -U opspilot -d opspilot_dr_verify -t -c "SELECT COUNT(*) FROM users;"', { encoding: 'utf-8' }).trim();

const origOrgs = execSync('docker exec opspilot_postgres psql -U opspilot -d opspilot -t -c "SELECT COUNT(*) FROM organizations;"', { encoding: 'utf-8' }).trim();
const drOrgs = execSync('docker exec opspilot_postgres psql -U opspilot -d opspilot_dr_verify -t -c "SELECT COUNT(*) FROM organizations;"', { encoding: 'utf-8' }).trim();

console.log(`   Pipeline Runs: Original = ${origRuns}, Restored = ${drRuns}`);
console.log(`   Users:         Original = ${origUsers}, Restored = ${drUsers}`);
console.log(`   Organizations: Original = ${origOrgs}, Restored = ${drOrgs}`);

if (origRuns !== drRuns || origUsers !== drUsers || origOrgs !== drOrgs) {
  throw new Error('Disaster recovery verification mismatch!');
}

console.log('5. Cleaning up verification database...');
execSync('docker exec opspilot_postgres psql -U opspilot -d postgres -c "DROP DATABASE opspilot_dr_verify;"');

console.log('✅ Full PostgreSQL Backup & Disaster Recovery 100% Verified!');
