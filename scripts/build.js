/**
 * build.js — WordPress Theme Build System
 *
 * Features:
 *   - Auto Theme Naming: Takes the parent directory name as the active theme name.
 *   - ALL source files live under `src/`.
 *   - Single watcher on `src/**` for hot-reloading.
 *   - SCSS compile, PostCSS, WebP conversion, file copy.
 *   - BrowserSync proxy mode (configurable via .env or --proxy=).
 *   - WP core in `public/` is never touched.
 *
 * Performance optimizations:
 *   - Parallel image conversion (configurable concurrency)
 *   - Cached file walking (single walk per full build)
 *   - Cached SCSS import parsing
 *   - Parallel SCSS compilation
 *   - Cross-platform proxy URL support
 */

import { resolve, dirname, basename, extname, relative, join } from 'path';
import { fileURLToPath } from 'url';
import {
  readFileSync, writeFileSync, mkdirSync, existsSync,
  readdirSync, statSync, unlinkSync, rmSync, copyFileSync,
} from 'fs';
import { compileString } from 'sass-embedded';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import sortMediaQueries from 'postcss-sort-media-queries';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { cpus } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// --- AUTO-THEME NAMING ---
const PROJECT_NAME = basename(ROOT);
console.log(`[Config] Project Name detected as: ${PROJECT_NAME}`);

// --- PATHS ---
const SRC_THEME = resolve(ROOT, 'src');

const OUT_PUBLIC = resolve(ROOT, 'public');
const OUT_THEME = resolve(OUT_PUBLIC, 'wp-content', 'themes', PROJECT_NAME);
const OUT_ASSETS = resolve(OUT_THEME, 'assets');

// Source sub-directories (all inside src/)
const SCSS_DIR = resolve(SRC_THEME, 'assets', 'scss');
const JS_DIR = resolve(SRC_THEME, 'assets', 'js');
const IMAGES_DIR = resolve(SRC_THEME, 'assets', 'images');
const VIDEOS_DIR = resolve(SRC_THEME, 'assets', 'videos');
const VENDOR_DIR = resolve(SRC_THEME, 'assets', 'vendor');

const isWatch = process.argv.includes('--watch');

// --- ENV & PROXY ---
dotenv.config({ path: resolve(ROOT, '.env') });
const serverType = process.env.SERVER_TYPE || 'laragon';

// Proxy URL priority: --proxy= arg > PROXY_URL env > auto-detect from server type
function resolveProxyTarget() {
  const customProxyArg = process.argv.find(arg => arg.startsWith('--proxy='));
  if (customProxyArg) return customProxyArg.split('=')[1];

  if (process.env.PROXY_URL) return process.env.PROXY_URL;

  if (serverType === 'xampp') return `http://localhost/${PROJECT_NAME}`;
  return `http://${PROJECT_NAME}.test`;
}
const PROXY_TARGET = resolveProxyTarget();

// --- CONCURRENCY ---
const IMAGE_CONCURRENCY = Math.max(2, Math.min(cpus().length, 8));
const SCSS_CONCURRENCY = Math.max(2, Math.min(cpus().length, 4));

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
const norm = (p) => p.replace(/\\/g, '/');

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function isNewer(src, dest) {
  try {
    return statSync(src).mtimeMs > statSync(dest).mtimeMs;
  } catch {
    return true;
  }
}

function walkSync(dir, filter) {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkSync(fullPath, filter));
    } else if (!filter || filter(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function removeEmptyDirs(dir) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      removeEmptyDirs(join(dir, entry.name));
    }
  }
  if (readdirSync(dir).length === 0 && dir !== OUT_PUBLIC && dir !== OUT_THEME) {
    try { rmSync(dir, { force: true }); } catch { /* ignore */ }
  }
}

/**
 * Run async tasks in parallel with limited concurrency.
 * @param {Array} items - Items to process
 * @param {number} concurrency - Max parallel tasks
 * @param {Function} fn - Async function to run for each item
 */
async function parallelRun(items, concurrency, fn) {
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(batch.map(fn));
  }
}

// ─────────────────────────────────────────────
// Classifiers: determine how a file should be handled
// ─────────────────────────────────────────────
const CONVERT_IMG_EXTS = ['.jpg', '.jpeg', '.png'];
const COPY_IMG_EXTS = ['.gif', '.svg', '.ico', '.webp'];
const VIDEO_EXTS = ['.mp4', '.webm', '.ogg'];

function isUnderDir(filePath, dir) {
  return norm(resolve(filePath)).startsWith(norm(resolve(dir)));
}

function isScssSource(filePath) {
  return isUnderDir(filePath, SCSS_DIR) && extname(filePath) === '.scss';
}

function isConvertImage(filePath) {
  return isUnderDir(filePath, IMAGES_DIR) && CONVERT_IMG_EXTS.includes(extname(filePath).toLowerCase());
}

function isCopyImage(filePath) {
  return isUnderDir(filePath, IMAGES_DIR) && COPY_IMG_EXTS.includes(extname(filePath).toLowerCase());
}

/**
 * Get the destination path for a source file.
 * Maps src/X → OUT_THEME/X, but SCSS gets special output to assets/css/.
 */
function getDestPath(srcFile) {
  const rel = relative(SRC_THEME, srcFile);
  return resolve(OUT_THEME, rel);
}

// ─────────────────────────────────────────────
// File Cache — collect all files once, reuse everywhere
// ─────────────────────────────────────────────
class FileCache {
  constructor() {
    this._allSrcFiles = null;
    this._copyableFiles = null;
    this._convertImages = null;
    this._scssFiles = null;
    this._scssEntries = null;
    this._outThemeFiles = null;
  }

  invalidate() {
    this._allSrcFiles = null;
    this._copyableFiles = null;
    this._convertImages = null;
    this._scssFiles = null;
    this._scssEntries = null;
    this._outThemeFiles = null;
  }

  /** All files under src/ */
  get allSrcFiles() {
    if (!this._allSrcFiles) {
      this._allSrcFiles = existsSync(SRC_THEME) ? walkSync(SRC_THEME) : [];
    }
    return this._allSrcFiles;
  }

  /** Files that should be copied (not SCSS source, not convertible images) */
  get copyableFiles() {
    if (!this._copyableFiles) {
      this._copyableFiles = this.allSrcFiles.filter(f =>
        !isScssSource(f) && !isConvertImage(f)
      );
    }
    return this._copyableFiles;
  }

  /** JPG/PNG files that need WebP conversion */
  get convertImages() {
    if (!this._convertImages) {
      this._convertImages = this.allSrcFiles.filter(f => isConvertImage(f));
    }
    return this._convertImages;
  }

  /** All SCSS files */
  get scssFiles() {
    if (!this._scssFiles) {
      this._scssFiles = this.allSrcFiles.filter(f => isScssSource(f));
    }
    return this._scssFiles;
  }

  /** SCSS entry files (non-partial) */
  get scssEntries() {
    if (!this._scssEntries) {
      this._scssEntries = this.scssFiles.filter(f => !basename(f).startsWith('_'));
    }
    return this._scssEntries;
  }

  /** All files in output theme (for stale cleaning) */
  get outThemeFiles() {
    if (!this._outThemeFiles) {
      const outCssDir = resolve(OUT_ASSETS, 'css');
      const outScssDir = resolve(OUT_THEME, 'assets', 'scss');
      this._outThemeFiles = existsSync(OUT_THEME)
        ? walkSync(OUT_THEME, f => !isUnderDir(f, outCssDir) && !isUnderDir(f, outScssDir))
        : [];
    }
    return this._outThemeFiles;
  }
}

const fileCache = new FileCache();

// ─────────────────────────────────────────────
// 1. General File Copy (PHP, CSS, TXT, etc.)
//    Copies everything EXCEPT: scss source, convertible images
// ─────────────────────────────────────────────
function buildCopyFiles(changedFile) {
  if (!existsSync(SRC_THEME)) return;

  if (changedFile) {
    // Skip files handled by other builders
    if (isScssSource(changedFile) || isConvertImage(changedFile)) return;

    const rel = relative(SRC_THEME, changedFile);
    const dest = resolve(OUT_THEME, rel);
    ensureDir(dirname(dest));
    copyFileSync(changedFile, dest);
    console.log(`[copy] ${norm(rel)}`);
    return;
  }

  // Full build: use cached file list
  const files = fileCache.copyableFiles;

  for (const file of files) {
    const rel = relative(SRC_THEME, file);
    const dest = resolve(OUT_THEME, rel);
    if (isNewer(file, dest)) {
      ensureDir(dirname(dest));
      copyFileSync(file, dest);
      console.log(`[copy] ${norm(rel)}`);
    }
  }

  // Clean stale copied files
  cleanStaleCopiedFiles();
}

function cleanStaleCopiedFiles() {
  if (!existsSync(OUT_THEME)) return;

  // Build set of expected dest files from cached lists
  const srcRelFiles = new Set();
  for (const f of fileCache.copyableFiles) {
    srcRelFiles.add(norm(relative(SRC_THEME, f)));
  }

  // Also account for WebP outputs from convertible images
  for (const f of fileCache.convertImages) {
    const rel = relative(SRC_THEME, f);
    const webpRel = rel.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    srcRelFiles.add(norm(webpRel));
  }

  // Use cached output file list
  for (const f of fileCache.outThemeFiles) {
    const rel = norm(relative(OUT_THEME, f));
    if (!srcRelFiles.has(rel)) {
      try {
        unlinkSync(f);
        console.log(`[clean] removed stale: ${rel}`);
      } catch { /* ignore */ }
    }
  }
  removeEmptyDirs(OUT_THEME);
}

// ─────────────────────────────────────────────
// 2. SCSS → CSS (with import cache & parallel compile)
// ─────────────────────────────────────────────
const postcssPlugins = [
  sortMediaQueries({ sort: 'mobile-first' }),
  autoprefixer({ cascade: false }),
  cssnano(),
];

// Cache for parsed SCSS imports — cleared on each full build
const importsCache = new Map();

async function buildScss(changedFile) {
  if (!existsSync(SCSS_DIR)) return;
  let entryFiles;

  if (changedFile) {
    const changedAbs = resolve(changedFile);
    const changedBase = basename(changedFile);

    // Clear import cache for the changed file (content may have changed)
    importsCache.delete(norm(changedAbs));

    if (changedBase.startsWith('_')) {
      entryFiles = findDependentEntries(changedAbs);
    } else {
      entryFiles = [changedAbs];
    }
  } else {
    // Full build: use cached SCSS entries
    entryFiles = fileCache.scssEntries;
  }

  // Compile in parallel
  await parallelRun(entryFiles, SCSS_CONCURRENCY, compileScssFile);
}

async function compileScssFile(filePath) {
  try {
    const source = readFileSync(filePath, 'utf8');
    if (!source.trim() || /^{\\rtf/i.test(source)) return;

    const result = compileString(source, {
      url: new URL(`file:///${norm(filePath)}`),
      loadPaths: [SCSS_DIR],
      style: 'expanded',
      sourceMap: isWatch,
    });

    const processed = await postcss(postcssPlugins).process(result.css, {
      from: filePath,
      map: isWatch ? { inline: false } : false,
    });

    const rel = relative(SCSS_DIR, filePath);
    const cssPath = resolve(OUT_ASSETS, 'css', rel.replace(/\.scss$/, '.css'));
    const mapPath = cssPath + '.map';
    ensureDir(dirname(cssPath));

    writeFileSync(cssPath, processed.css, 'utf8');
    if (processed.map) {
      writeFileSync(mapPath, processed.map.toString(), 'utf8');
    }
    console.log(`[scss] ${norm(rel)} → ${basename(cssPath)}`);
  } catch (err) {
    console.error(`[scss] Error compiling ${filePath}:`, err.message);
  }
}

function findDependentEntries(changedPartial) {
  const allFiles = fileCache.scssFiles.length > 0
    ? fileCache.scssFiles
    : walkSync(SCSS_DIR, (f) => extname(f) === '.scss');
  const importRegex = /@(use|import|forward)\s+['"]([^'"]+)['"]/g;

  function resolveImport(importPath, fromDir) {
    const clean = importPath.replace(/\.(scss|sass)$/, '');
    const base = resolve(fromDir, clean);
    const candidates = [];

    for (const ext of ['.scss', '.sass']) {
      candidates.push(base + ext);
      candidates.push(join(dirname(base), '_' + basename(base) + ext));
    }
    candidates.push(join(base, '_index.scss'));
    candidates.push(join(base, 'index.scss'));

    for (const c of candidates) {
      if (existsSync(c)) return resolve(c);
    }
    return null;
  }

  function parseImports(filePath) {
    const key = norm(filePath);
    if (importsCache.has(key)) return importsCache.get(key);

    try {
      const content = readFileSync(filePath, 'utf8');
      const imports = [];
      let match;
      importRegex.lastIndex = 0;
      while ((match = importRegex.exec(content)) !== null) {
        const imp = match[2];
        if (/^(sass:|http:|https:|url\()/i.test(imp)) continue;
        imports.push(imp);
      }
      const resolved = imports
        .map((p) => resolveImport(p, dirname(filePath)))
        .filter(Boolean);
      importsCache.set(key, resolved);
      return resolved;
    } catch {
      importsCache.set(key, []);
      return [];
    }
  }

  const memo = new Map();
  function dependsOn(file, target) {
    const key = `${file}|${target}`;
    if (memo.has(key)) return memo.get(key);
    memo.set(key, false);
    const imports = parseImports(file);
    if (imports.some((imp) => resolve(imp) === resolve(target))) {
      memo.set(key, true);
      return true;
    }
    for (const imp of imports) {
      if (dependsOn(imp, target)) {
        memo.set(key, true);
        return true;
      }
    }
    return false;
  }

  const entries = [];
  for (const file of allFiles) {
    if (!basename(file).startsWith('_')) {
      if (resolve(file) === resolve(changedPartial) || dependsOn(file, changedPartial)) {
        entries.push(file);
      }
    }
  }
  memo.clear();
  return entries;
}

// Clean stale CSS files
function cleanStaleCss() {
  const outCssDir = resolve(OUT_ASSETS, 'css');
  if (!existsSync(outCssDir) || !existsSync(SCSS_DIR)) return;

  const scssEntries = fileCache.scssEntries.length > 0
    ? fileCache.scssEntries
    : walkSync(SCSS_DIR, (f) => extname(f) === '.scss' && !basename(f).startsWith('_'));

  const srcEntries = new Set();
  for (const f of scssEntries) {
    const rel = relative(SCSS_DIR, f);
    srcEntries.add(norm(rel.replace(/\.scss$/, '.css')));
    srcEntries.add(norm(rel.replace(/\.scss$/, '.css.map')));
  }

  for (const f of walkSync(outCssDir)) {
    const rel = norm(relative(outCssDir, f));
    if (!srcEntries.has(rel)) {
      try { unlinkSync(f); console.log(`[clean] removed stale CSS: ${rel}`); } catch { /* ignore */ }
    }
  }
  removeEmptyDirs(outCssDir);
}

// ─────────────────────────────────────────────
// 3. Images (WebP Pipeline — Parallel Processing)
// ─────────────────────────────────────────────
async function buildImages(changedFile) {
  if (!existsSync(IMAGES_DIR)) return;
  const destDir = resolve(OUT_ASSETS, 'images');
  ensureDir(destDir);

  if (changedFile) {
    if (!isConvertImage(changedFile)) return; // copy images handled by buildCopyFiles
    const rel = relative(IMAGES_DIR, changedFile);
    const webpRel = rel.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const dest = resolve(destDir, webpRel);
    ensureDir(dirname(dest));
    await sharp(changedFile).webp({ quality: 90 }).toFile(dest);
    console.log(`[images] webp: ${norm(rel)} → ${norm(webpRel)}`);
    return;
  }

  // Full build: parallel convert JPG/PNG → WebP
  const convertFiles = fileCache.convertImages;

  // Filter to only files that need updating
  const filesToConvert = convertFiles.filter(file => {
    const rel = relative(IMAGES_DIR, file);
    const webpRel = rel.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const dest = resolve(destDir, webpRel);
    return isNewer(file, dest);
  });

  if (filesToConvert.length === 0) return;

  console.log(`[images] Converting ${filesToConvert.length} images (concurrency: ${IMAGE_CONCURRENCY})...`);
  const start = Date.now();

  await parallelRun(filesToConvert, IMAGE_CONCURRENCY, async (file) => {
    const rel = relative(IMAGES_DIR, file);
    const webpRel = rel.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const dest = resolve(destDir, webpRel);
    ensureDir(dirname(dest));
    await sharp(file).webp({ quality: 90 }).toFile(dest);
    console.log(`[images] webp: ${norm(rel)} → ${norm(webpRel)}`);
  });

  const elapsed = Date.now() - start;
  console.log(`[images] ✓ ${filesToConvert.length} images converted in ${elapsed}ms`);
}

// ─────────────────────────────────────────────
// Full Build
// ─────────────────────────────────────────────
async function fullBuild() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log(`║    Building WP Theme: ${PROJECT_NAME}`.padEnd(39) + '║');
  console.log('╚══════════════════════════════════════╝\n');

  const start = Date.now();

  ensureDir(OUT_THEME);

  // Invalidate file cache for fresh full build
  fileCache.invalidate();
  importsCache.clear();

  // 1. Copy all non-compiled files
  buildCopyFiles();

  // 2. Compile SCSS → CSS (parallel)
  await buildScss();

  // 3. Convert images JPG/PNG → WebP (parallel)
  await buildImages();

  // 4. Clean stale CSS
  cleanStaleCss();

  // 5. Remove scss source from output (don't deploy source files)
  const outScssDir = resolve(OUT_THEME, 'assets', 'scss');
  if (existsSync(outScssDir)) {
    rmSync(outScssDir, { recursive: true, force: true });
    console.log('[clean] removed scss source from output');
  }

  const elapsed = Date.now() - start;
  console.log(`\n✓ Build complete in ${elapsed}ms\n`);
}

// ─────────────────────────────────────────────
// Watch Mode — Single watcher on src/**
// ─────────────────────────────────────────────
async function startWatch() {
  await fullBuild();

  const { watch: chokidarWatch } = await import('chokidar');
  const browserSync = (await import('browser-sync')).default.create();

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`║ Starting BrowserSync Proxy -> ${PROXY_TARGET}`.padEnd(47) + '║');
  console.log('╚══════════════════════════════════════════════╝\n');

  browserSync.init({
    proxy: PROXY_TARGET,
    port: 3000,
    open: true,
    notify: false,
    ui: false,
  });

  function debounce(fn, wait = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  const watcher = chokidarWatch('src/**', {
    cwd: ROOT,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
  });

  function getAbs(filepath) { return resolve(ROOT, filepath); }

  // ── Handler: determine what to do based on file path ──
  async function handleChange(filepath, eventType) {
    const absPath = getAbs(filepath);

    // SCSS source changed → recompile
    if (isScssSource(absPath)) {
      console.log(`[watch:scss] ${eventType}: ${norm(filepath)}`);
      await buildScss(absPath);
      browserSync.reload('*.css');
      return;
    }

    // Convertible image changed → re-convert to WebP
    if (isConvertImage(absPath)) {
      console.log(`[watch:images] ${eventType}: ${norm(filepath)}`);
      await buildImages(absPath);
      browserSync.reload();
      return;
    }

    // Everything else → copy to output
    console.log(`[watch:copy] ${eventType}: ${norm(filepath)}`);
    buildCopyFiles(absPath);
    browserSync.reload();
  }

  function handleUnlink(filepath) {
    const absPath = getAbs(filepath);
    const rel = relative(SRC_THEME, absPath);

    if (isScssSource(absPath)) {
      // Clear import cache for deleted file
      importsCache.delete(norm(absPath));

      // Remove corresponding CSS
      const name = basename(filepath);
      if (!name.startsWith('_')) {
        const cssRel = rel.replace(/^assets[\\/]scss[\\/]/, '').replace(/\.scss$/, '.css');
        const cssFile = resolve(OUT_ASSETS, 'css', cssRel);
        const mapFile = cssFile + '.map';
        try { unlinkSync(cssFile); } catch { /* ignore */ }
        try { unlinkSync(mapFile); } catch { /* ignore */ }
        console.log(`[watch:scss] removed CSS: ${basename(cssFile)}`);
      }
      removeEmptyDirs(resolve(OUT_ASSETS, 'css'));
      return;
    }

    if (isConvertImage(absPath)) {
      // Remove corresponding WebP
      const imgRel = relative(IMAGES_DIR, absPath);
      const webpRel = imgRel.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      const dest = resolve(OUT_ASSETS, 'images', webpRel);
      try { unlinkSync(dest); } catch { /* ignore */ }
      console.log(`[watch:images] removed WebP: ${norm(webpRel)}`);
      removeEmptyDirs(resolve(OUT_ASSETS, 'images'));
      return;
    }

    // Remove the copied file from output
    const dest = resolve(OUT_THEME, rel);
    try { unlinkSync(dest); } catch { /* ignore */ }
    console.log(`[watch:copy] removed: ${norm(rel)}`);
    removeEmptyDirs(OUT_THEME);
  }

  watcher.on('change', debounce(async (filepath) => {
    await handleChange(filepath, 'changed');
  }));

  watcher.on('add', debounce(async (filepath) => {
    await handleChange(filepath, 'added');
  }));

  watcher.on('unlink', debounce((filepath) => {
    handleUnlink(filepath);
  }));
}

// ─────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────
if (isWatch) {
  startWatch();
} else {
  fullBuild();
}
