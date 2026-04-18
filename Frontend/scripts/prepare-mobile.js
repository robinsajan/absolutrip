/**
 * Post-build script for mobile (Capacitor) builds.
 *
 * Copies the root index.html to 404.html so that Capacitor's WebView
 * can fall back to the SPA shell for any dynamic route that doesn't
 * have a pre-rendered HTML file (e.g. /trip/[tripId]/ledger).
 */
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');
const indexFile = path.join(outDir, 'index.html');
const fallback = path.join(outDir, '404.html');

if (!fs.existsSync(outDir)) {
  console.error('❌ "out" directory not found. Run "next build" with output: "export" first.');
  process.exit(1);
}

if (!fs.existsSync(indexFile)) {
  console.error('❌ "out/index.html" not found. Static export may have failed.');
  process.exit(1);
}

fs.copyFileSync(indexFile, fallback);
console.log('✅ Created 404.html fallback for SPA routing in Capacitor');
