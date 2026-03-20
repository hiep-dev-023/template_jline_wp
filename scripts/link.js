/**
 * link.js — Tự động tạo Symbolic Link từ Laragon www → public/
 *
 * Tự động nâng quyền Admin nếu chưa có.
 *
 * Cách hoạt động:
 *   mklink /D  D:\laragon\www\[tên_project]  →  [project_root]\public
 *   Laragon tự nhận domain: http://[tên_project].test
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

// Tải file .env nếu có
dotenv.config({ path: resolve(ROOT, '.env') });

const serverType = process.env.SERVER_TYPE || 'laragon';
let SERVER_WWW = '';
let PROJECT_DOMAIN = '';

if (serverType === 'xampp') {
  SERVER_WWW = process.env.XAMPP_HTDOCS || 'C:\\xampp\\htdocs';
  PROJECT_DOMAIN = `http://localhost/${PROJECT_NAME}`;
} else {
  SERVER_WWW = process.env.LARAGON_WWW || 'D:\\laragon\\www';
  PROJECT_DOMAIN = `http://${PROJECT_NAME}.test`;
}

// Đọc --www= ưu tiên cao nhất
const wwwArg = process.argv.find(arg => arg.startsWith('--www='));
if (wwwArg) SERVER_WWW = wwwArg.split('=')[1];

const LINK_PATH = resolve(SERVER_WWW, PROJECT_NAME);

// ─────────────────────────────────────────────
// Kiểm tra quyền Admin trên Windows
// ─────────────────────────────────────────────
function isAdmin() {
  if (platform() !== 'win32') return true; // Linux/Mac không cần
  try {
    // Thử ghi vào thư mục system → nếu được = có quyền Admin
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// Tự nâng quyền Admin nếu chưa có
// ─────────────────────────────────────────────
function elevateAndRun() {
  console.log('⚠ Chưa có quyền Administrator. Đang tự nâng quyền...\n');

  // Tạo file batch tạm để chạy mklink với quyền Admin
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
    `echo.`,
    `echo     Buoc tiep theo:`,
    `echo     1. Reload Sever Apache (neu xampp hay khoi dong lai)`,
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
    // Dùng PowerShell để chạy file batch với quyền Admin (UAC popup)
    execSync(
      `powershell -Command "Start-Process cmd -ArgumentList '/c,${batPath.replace(/'/g, "''")}' -Verb RunAs -Wait"`,
      { stdio: 'inherit' }
    );
    console.log('✓ Quá trình nâng quyền hoàn tất.\n');
  } catch (err) {
    console.error('❌ Người dùng đã từ chối quyền Admin hoặc có lỗi xảy ra.\n');
  } finally {
    // Xóa file batch tạm
    try { unlinkSync(batPath); } catch { /* ignore */ }
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════╗');
console.log('║      Server Symlink Creator                  ║');
console.log('╚══════════════════════════════════════════════╝\n');

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
  console.error(`   Hãy điều chỉnh lại đường dẫn trong file .env\n`);
  process.exit(1);
}

// Xóa thư mục/symlink cũ nếu có
try {
  const stats = lstatSync(LINK_PATH);
  console.log(`⚠ Đang xóa bản cũ: ${LINK_PATH}...`);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    unlinkSync(LINK_PATH);
  } else {
    rmSync(LINK_PATH, { recursive: true, force: true });
  }
  console.log(`✓ Đã xóa thành công.\n`);
} catch (e) {
  // Không tồn tại thì bỏ qua
}

// Nếu đã có quyền Admin (hoặc trên Mac/Linux) → tạo symlink trực tiếp
if (isAdmin()) {
  try {
    if (platform() === 'win32') {
      // Dùng lệnh của Windows
      execSync(`mklink /D "${LINK_PATH}" "${PUBLIC_DIR}"`, { stdio: 'inherit' });
    } else {
      // MacOS / Linux dùng API chuẩn của NodeJS
      symlinkSync(PUBLIC_DIR, LINK_PATH, 'dir');
    }
    console.log(`\n✓ Symlink tạo thành công!`);
    console.log(`  Domain Server: ${PROJECT_DOMAIN}\n`);
  } catch (err) {
    console.error('❌ Lỗi tạo symlink:', err.message);
    process.exit(1);
  }
} else {
  // Chưa có quyền Admin → tự nâng quyền qua UAC
  elevateAndRun();
}
