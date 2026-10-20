#!/usr/bin/env node
/**
 * Keeps the self-hosted icon font in sync with the icons the code actually uses.
 *
 * The app ships a SUBSET of Google's Material Symbols Outlined font (a few KB instead of the 480KB
 * full set). That subset only contains the icon names listed in public/fonts/icons.manifest.json.
 * If you use a new icon name in the code without regenerating the font, it renders as plain text
 * (e.g. the word "lightbulb") - so this script exists to make that impossible to forget.
 *
 *   npm run icons          scan src/, download a fresh subset from Google Fonts, update references
 *   npm run icons:check    exit 1 if src/ uses an icon the current font does not contain
 *                          (also runs as part of `npm run lint`)
 *
 * Icon names are found in: <span className="material-symbols-outlined">name</span>, ternaries inside
 * that span (`{cond ? 'a' : 'b'}`), and `icon="name"` / `icon: 'name'` props. Names that are chosen
 * dynamically elsewhere belong in EXTRA_ICONS below; things that merely look like icon props but are
 * not font icons belong in IGNORED.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = path.join(ROOT, 'public', 'fonts');
const MANIFEST = path.join(FONT_DIR, 'icons.manifest.json');

// Icons picked at runtime from a list (src/pages/Celebration.jsx -> the confetti "pops").
const EXTRA_ICONS = ['auto_awesome', 'celebration', 'favorite', 'star'];
// `icon: 'star4'` in Celebration.jsx is an inline SVG shape, not a font glyph.
const IGNORED = new Set(['star4']);

const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return /\.(jsx?|tsx?)$/.test(entry.name) ? [full] : [];
    });

function collectIconNames() {
    const names = new Set(EXTRA_ICONS);
    for (const file of walk(path.join(ROOT, 'src'))) {
        const source = fs.readFileSync(file, 'utf8');
        for (const m of source.matchAll(/material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g)) names.add(m[1]);
        for (const m of source.matchAll(/material-symbols-outlined[^>]*>\s*\{([^}]*)\}/g)) {
            for (const q of m[1].matchAll(/'([a-z0-9_]+)'/g)) names.add(q[1]);
        }
        for (const m of source.matchAll(/\bicon[=:]\s*["']([a-z0-9_]+)["']/g)) names.add(m[1]);
    }
    for (const ignored of IGNORED) names.delete(ignored);
    return [...names].sort();
}

const readManifest = () => (fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : null);

const used = collectIconNames();

if (process.argv.includes('--check')) {
    const manifest = readManifest();
    if (!manifest) {
        console.error('icons: public/fonts/icons.manifest.json is missing - run `npm run icons`.');
        process.exit(1);
    }
    const missing = used.filter((name) => !manifest.names.includes(name));
    if (missing.length > 0) {
        console.error(`icons: the code uses icon(s) missing from the font subset: ${missing.join(', ')}`);
        console.error('       Run `npm run icons` to regenerate public/fonts and commit the result.');
        process.exit(1);
    }
    console.log(`icons: OK (${used.length} icons in use, all present in ${manifest.file})`);
    process.exit(0);
}

// ---- regenerate ------------------------------------------------------------------------------
const cssUrl =
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,1,0' +
    `&icon_names=${used.join(',')}&display=block`;

// Google serves woff2 only to modern user agents.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const cssResponse = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
if (!cssResponse.ok) throw new Error(`Google Fonts CSS request failed: ${cssResponse.status}`);
const css = await cssResponse.text();
const fontUrl = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/)?.[1];
if (!fontUrl) throw new Error('Could not find the woff2 URL in the Google Fonts response.');

const fontResponse = await fetch(fontUrl);
if (!fontResponse.ok) throw new Error(`Font download failed: ${fontResponse.status}`);
const bytes = Buffer.from(await fontResponse.arrayBuffer());

// Content-hashed file name: the font is served with an immutable 1-year cache header, so a changed
// icon set MUST get a new URL or returning visitors would keep the old file (and see raw text).
const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 8);
const fileName = `material-symbols-${hash}.woff2`;

for (const old of fs.readdirSync(FONT_DIR)) {
    if (/^material-symbols-.*\.woff2$/.test(old) && old !== fileName) fs.unlinkSync(path.join(FONT_DIR, old));
}
fs.writeFileSync(path.join(FONT_DIR, fileName), bytes);
fs.writeFileSync(MANIFEST, JSON.stringify({ file: fileName, bytes: bytes.length, names: used }, null, 2) + '\n');

// Point the @font-face rule and the preload tag at the new file.
for (const rel of ['src/index.css', 'index.html']) {
    const target = path.join(ROOT, rel);
    const before = fs.readFileSync(target, 'utf8');
    const after = before.replace(/material-symbols-[A-Za-z0-9-]+\.woff2/g, fileName);
    if (after !== before) fs.writeFileSync(target, after);
}

console.log(`icons: ${used.length} icons -> public/fonts/${fileName} (${(bytes.length / 1024).toFixed(1)} KB)`);
