/**
 * link.js — Tự động tạo Symbolic Link vào thư mục web server → public/
 *
 * Cross-platform: Windows (Laragon/XAMPP), macOS (MAMP/Valet), Linux (Apache)
 *
 * Cách hoạt động:
 *   Windows: mklink /D  D:\laragon\www\[tên_project]  →  [project_root]\public
 *   macOS/Linux: ln -s  [project_root]/public  /var/www/html/[tên_project]
 */

import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, lstatSync, readlinkSync, writeFileSync, unlinkSync, rmSync, symlinkSync } from 'fs';
import { execSync } from 'child_process';
import { platform } from 'os';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PROJECT_NAME = basename(ROOT);
const PUBLIC_DIR = resolve(ROOT, 'public');
const IS_WIN = platform() === 'win32';

// Tải file .env nếu có
dotenv.config({ path: resolve(ROOT, '.env') });

const serverType = process.env.SERVER_TYPE || 'laragon';

// ─────────────────────────────────────────────
// Detect thư mục web server theo OS + server type
// ─────────────────────────────────────────────
function detectServerWww() {
  // --www= arg ưu tiên cao nhất
  const wwwArg = process.argv.find(arg => arg.startsWith('--www='));
  if (wwwArg) return wwwArg.split('=')[1];

  // Từ .env
  if (serverType === 'xampp' && process.env.XAMPP_HTDOCS) {
    return process.env.XAMPP_HTDOCS;
  }
  if (process.env.LARAGON_WWW) {
    return process.env.LARAGON_WWW;
  }

  // Auto-detect defaults theo OS
  if (IS_WIN) {
    if (serverType === 'xampp') return 'C:\\xampp\\htdocs';
    return 'D:\\laragon\\www';
  }

  // macOS
  if (platform() === 'darwin') {
    // MAMP
    if (existsSync('/Applications/MAMP/htdocs')) return '/Applications/MAMP/htdocs';
    // Laravel Valet
    const valetPath = resolve(process.env.HOME || '~', '.valet', 'Sites');
    if (existsSync(valetPath)) return valetPath;
    // Fallback
    return '/var/www/html';
  }

  // Linux
  return '/var/www/html';
}

function detectProjectDomain() {
  // Nếu có PROXY_URL trong .env → dùng luôn làm domain hiển thị
  if (process.env.PROXY_URL) return process.env.PROXY_URL;

  if (IS_WIN) {
    if (serverType === 'xampp') return `http://localhost/${PROJECT_NAME}`;
    return `http://${PROJECT_NAME}.test`; // Laragon auto domain
  }

  // macOS/Linux: không có auto .test domain → dùng localhost
  return `http://localhost/${PROJECT_NAME}`;
}

const SERVER_WWW = detectServerWww();
const PROJECT_DOMAIN = detectProjectDomain();
const LINK_PATH = resolve(SERVER_WWW, PROJECT_NAME);

// ─────────────────────────────────────────────
// Kiểm tra quyền Admin/Root
// ─────────────────────────────────────────────
function isAdmin() {
  if (!IS_WIN) {
    // macOS/Linux: kiểm tra quyền ghi vào thư mục server
    try {
      const testFile = resolve(SERVER_WWW, '.link_test_' + Date.now());
      writeFileSync(testFile, '');
      unlinkSync(testFile);
      return true;
    } catch {
      return false;
    }
  }

  // Windows: kiểm tra quyền admin
  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// Windows: Tự nâng quyền Admin qua UAC
// ─────────────────────────────────────────────
function elevateWindows() {
  console.log('⚠ Chưa có quyền Administrator. Đang tự nâng quyền...\n');

  const batContent = [
    '@echo off',
    `echo.`,
    `echo ══════════════════════════════════════════`,
    `echo   Server Symlink Creator (Admin)`,
    `echo ══════════════════════════════════════════`,
    `echo.`,
    `echo   Project : ${PROJECT_NAME}`,
    `echo   Source  : ${PUBLIC_DIR}`,
    `echo   Link    : ${LINK_PATH}`,
    `echo   Domain  : ${PROJECT_DOMAIN}`,
    `echo.`,
    '',
    `if exist "${LINK_PATH}" (`,
    `    echo [!] Dang xoa ban cu: ${LINK_PATH}...`,
    `    rmdir /q /s "${LINK_PATH}" 2>nul || del /q /f "${LINK_PATH}" 2>nul`,
    `)`,
    '',
    `mklink /D "${LINK_PATH}" "${PUBLIC_DIR}"`,
    `if %errorlevel% equ 0 (`,
    `    echo.`,
    `    echo [OK] Symlink tao thanh cong!`,
    `    echo     Domain du kien: ${PROJECT_DOMAIN}`,
    `    echo.`,
    `    echo     Buoc tiep theo:`,
    `    echo     1. Reload Server Apache (neu xampp hay khoi dong lai)`,
    `    echo     2. Chay: npm run start`,
    `) else (`,
    `    echo.`,
    `    echo [LOI] Khong the tao symlink!`,
    `)`,
    `echo.`,
    `pause`,
  ].join('\r\n');

  const batPath = resolve(ROOT, '.create-link.bat');
  writeFileSync(batPath, batContent, 'utf8');

  try {
    execSync(
      `powershell -Command "Start-Process cmd -ArgumentList '/c,${batPath.replace(/'/g, "''")}' -Verb RunAs -Wait"`,
      { stdio: 'inherit' }
    );
    console.log('✓ Quá trình nâng quyền hoàn tất.\n');
  } catch {
    console.error('❌ Người dùng đã từ chối quyền Admin hoặc có lỗi xảy ra.\n');
  } finally {
    try { unlinkSync(batPath); } catch { /* ignore */ }
  }
}

// ─────────────────────────────────────────────
// macOS/Linux: Hướng dẫn dùng sudo
// ─────────────────────────────────────────────
function elevateUnix() {
  console.log('⚠ Không có quyền ghi vào thư mục server.\n');
  console.log('Hãy chạy lại với sudo:');
  console.log(`  sudo npm run link\n`);
  console.log('Hoặc chỉ định thư mục bạn có quyền ghi:');
  console.log(`  npm run link -- --www=/path/you/own\n`);
  process.exit(1);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════╗');
console.log('║      Server Symlink Creator                  ║');
console.log('╚══════════════════════════════════════════════╝\n');

console.log(`  OS           : ${platform()}`);
console.log(`  Server Type  : ${serverType}`);
console.log(`  Project Name : ${PROJECT_NAME}`);
console.log(`  Source       : ${PUBLIC_DIR}`);
console.log(`  Symlink      : ${LINK_PATH}`);
console.log(`  Domain       : ${PROJECT_DOMAIN}\n`);

// Kiểm tra public/ tồn tại
if (!existsSync(PUBLIC_DIR)) {
  console.log('⚠ Thư mục public/ chưa tồn tại. Hãy chạy "npm run wp:download" trước.\n');
  process.exit(1);
}

// Kiểm tra Server thư mục
if (!existsSync(SERVER_WWW)) {
  console.error(`❌ Không tìm thấy thư mục Server (${serverType}): ${SERVER_WWW}`);
  if (!IS_WIN) {
    console.error(`   Tạo thư mục: sudo mkdir -p ${SERVER_WWW}`);
  }
  console.error(`   Hoặc điều chỉnh lại đường dẫn trong file .env\n`);
  process.exit(1);
}

// Xóa symlink/thư mục cũ nếu có
try {
  const stats = lstatSync(LINK_PATH);
  console.log(`⚠ Đang xóa bản cũ: ${LINK_PATH}...`);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    unlinkSync(LINK_PATH);
  } else {
    rmSync(LINK_PATH, { recursive: true, force: true });
  }
  console.log(`✓ Đã xóa thành công.\n`);
} catch {
  // Không tồn tại thì bỏ qua
}

// Tạo symlink
if (isAdmin()) {
  try {
    if (IS_WIN) {
      execSync(`mklink /D "${LINK_PATH}" "${PUBLIC_DIR}"`, { stdio: 'inherit' });
    } else {
      symlinkSync(PUBLIC_DIR, LINK_PATH, 'dir');
    }
    console.log(`\n✓ Symlink tạo thành công!`);
    console.log(`  Domain Server: ${PROJECT_DOMAIN}\n`);
  } catch (err) {
    console.error('❌ Lỗi tạo symlink:', err.message);
    if (!IS_WIN) {
      console.error('   Thử chạy: sudo npm run link');
    }
    process.exit(1);
  }
} else {
  if (IS_WIN) {
    elevateWindows();
  } else {
    elevateUnix();
  }
}
