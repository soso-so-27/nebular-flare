import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const TARGET_EXTS = ['.tsx', '.ts', '.css'];
const IGNORE_DIRS = ['node_modules', '.next', '.git', 'dist', 'build', 'public'];

// Color mapping (Emerald/Teal -> Sage/Lavender)
const REPLACEMENTS = {
    // Backgrounds
    'bg-emerald-50': 'bg-[#F2F7F4]',
    'bg-emerald-100': 'bg-[#E5F0EA]',
    'bg-emerald-200': 'bg-[#Cce3d6]',
    'bg-emerald-300': 'bg-[#a3cbb5]',
    'bg-emerald-400': 'bg-[#7CAA8E]', // Sage Base
    'bg-emerald-500': 'bg-[#7CAA8E]', // Sage Base
    'bg-emerald-600': 'bg-[#5A8C6E]',
    'bg-emerald-900': 'bg-[#2D4637]',

    'bg-teal-50': 'bg-[#F2F7F4]',
    'bg-teal-100': 'bg-[#E5F0EA]',
    'bg-teal-400': 'bg-[#7CAA8E]',
    'bg-teal-500': 'bg-[#7CAA8E]',

    // Text
    'text-emerald-50': 'text-[#F2F7F4]',
    'text-emerald-400': 'text-[#7CAA8E]',
    'text-emerald-500': 'text-[#7CAA8E]',
    'text-emerald-600': 'text-[#5A8C6E]',
    'text-emerald-700': 'text-[#487058]',

    'text-teal-500': 'text-[#7CAA8E]',
    'text-teal-600': 'text-[#5A8C6E]',

    // Borders / Rings
    'border-emerald-100': 'border-[#E5F0EA]',
    'border-emerald-200': 'border-[#Cce3d6]',
    'border-emerald-500': 'border-[#7CAA8E]',
    'ring-emerald-500': 'ring-[#7CAA8E]',
    'ring-emerald-400': 'ring-[#7CAA8E]',

    // Hex Replacements (for inline styles)
    '#10B981': '#7CAA8E', // emerald-500
    '#34D399': '#7CAA8E', // emerald-400
    '#059669': '#5A8C6E', // emerald-600
    'rgba(52, 211, 153,': 'rgba(124, 170, 142,', // emerald-400 rgb
    'rgba(16, 185, 129,': 'rgba(124, 170, 142,', // emerald-500 rgb
};

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
        } else {
            if (TARGET_EXTS.includes(path.extname(file))) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

function replaceColors(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;

    // 1. Class name replacements (regex for exact word matches)
    for (const [oldClass, newClass] of Object.entries(REPLACEMENTS)) {
        if (oldClass.startsWith('#') || oldClass.startsWith('rgba')) continue; // Skip hex/rgb here

        const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
        if (regex.test(content)) {
            content = content.replace(regex, newClass);
            modified = true;
        }
    }

    // 2. Hex/RGB replacements (string replacements)
    for (const [oldColor, newColor] of Object.entries(REPLACEMENTS)) {
        if (!oldColor.startsWith('#') && !oldColor.startsWith('rgba')) continue;

        if (content.includes(oldColor)) {
            content = content.split(oldColor).join(newColor);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${path.relative(projectRoot, filePath)}`);
    }
}

const files = getAllFiles(path.join(projectRoot, 'src'));
console.log(`Scanning ${files.length} files...`);
files.forEach(file => replaceColors(file));
console.log('Done.');
