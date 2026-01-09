/**
 * Generate Service Worker with Firebase config injected at build time
 * This script reads sw.template.js and replaces placeholders with environment variables
 * 
 * Usage: node scripts/generate-sw.mjs
 * Called automatically before `next build` via npm scripts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// Load environment variables if dotenv is available
try {
    const dotenv = await import('dotenv');
    dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
} catch (e) {
    // dotenv not available, rely on process.env (Vercel injects these)
    console.log('[generate-sw] dotenv not found, using process.env');
}

// Firebase config from environment variables
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate required fields
const requiredFields = ['apiKey', 'projectId', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
    console.error('[generate-sw] ERROR: Missing required Firebase env vars:', missingFields);
    console.error('[generate-sw] Make sure NEXT_PUBLIC_FIREBASE_* variables are set');
    // Don't fail build - generate with empty config (SW will gracefully skip)
    console.warn('[generate-sw] Generating SW with empty config (push notifications will be disabled)');
}

// Generate build hash for cache busting
const buildHash = crypto.randomBytes(4).toString('hex');

// Read template
const templatePath = path.join(publicDir, 'sw.template.js');
if (!fs.existsSync(templatePath)) {
    console.error('[generate-sw] ERROR: sw.template.js not found');
    process.exit(1);
}

let template = fs.readFileSync(templatePath, 'utf-8');

// Replace placeholders
template = template.replace('__FIREBASE_CONFIG__', JSON.stringify(firebaseConfig));
template = template.replace('__BUILD_HASH__', buildHash);

// Write output
const outputPath = path.join(publicDir, 'sw.js');
fs.writeFileSync(outputPath, template);

console.log(`[generate-sw] Generated sw.js with build hash: ${buildHash}`);
console.log(`[generate-sw] Firebase project: ${firebaseConfig.projectId || '(not set)'}`);
