/**
 * generate-certs.js
 * Generates self-signed TLS certificates for local production / staging tests.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, '..', 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const keyPath = path.join(certsDir, 'opspilot.key');
const crtPath = path.join(certsDir, 'opspilot.crt');

console.log('Generating OpsPilot production TLS certificate...');

try {
  execSync(
    `openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "${keyPath}" -out "${crtPath}" -subj "/CN=opspilot.ai/O=OpsPilot AI Inc/C=US"`,
    { stdio: 'inherit' }
  );
  console.log('✓ SSL/TLS Certificate generated:');
  console.log('  Key:  ', keyPath);
  console.log('  Cert: ', crtPath);
} catch (err) {
  console.error('OpenSSL execution error:', err.message);
  // Fallback: create mock key/cert placeholders if openssl binary missing on host
  if (!fs.existsSync(keyPath)) fs.writeFileSync(keyPath, '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----');
  if (!fs.existsSync(crtPath)) fs.writeFileSync(crtPath, '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----');
}
