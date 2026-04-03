const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- Omni-Engine Mobile Build Starting ---');

try {
    // 1. Production Build
    console.log('Step 1: Building production web assets...');
    execSync('npm run build', { stdio: 'inherit' });

    // 2. Capacitor Sync
    console.log('Step 2: Syncing with Capacitor...');
    execSync('npx cap sync', { stdio: 'inherit' });

    console.log('Step 3: Generating dummy assets for mobile bundle...');
    execSync('node scripts/generate-dummy-assets.cjs', { stdio: 'inherit' });

    console.log('--- Mobile Build Complete! ---');
    console.log('You can now open the project in Xcode or Android Studio:');
    console.log('npx cap open ios');
    console.log('npx cap open android');

} catch (e) {
    console.error('Mobile build failed:', e);
    process.exit(1);
}
