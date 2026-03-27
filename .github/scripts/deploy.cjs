const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');
const { execSync } = require('child_process');
const crypt = require('apache-crypt');

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

function walkDir(dir, baseDir = dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkDir(fullPath, baseDir));
        } else {
            results.push(path.relative(baseDir, fullPath).replace(/\\/g, '/'));
        }
    }
    return results;
}

function validateConfig(config) {
    const errors = [];
    if (!config.server || typeof config.server !== 'string') {
        errors.push('Thiếu trường "server" (string)');
    }
    if (!config.project_dir || typeof config.project_dir !== 'string') {
        errors.push('Thiếu trường "project_dir" (string)');
    }
    if (!config.source_folder || typeof config.source_folder !== 'string') {
        errors.push('Thiếu trường "source_folder" (string)');
    }
    if (!config.basic_auth || !config.basic_auth.username || !config.basic_auth.password) {
        errors.push('Thiếu trường "basic_auth" với "username" và "password"');
    }
    return errors;
}

/**
 * Tự detect theme name từ build output.
 * Build.js tạo theme tại: public/wp-content/themes/[project_folder_name]/
 */
function detectThemeName(sourceFolder) {
    const themesDir = path.join(sourceFolder, 'wp-content', 'themes');
    if (!fs.existsSync(themesDir)) return null;

    const entries = fs.readdirSync(themesDir, { withFileTypes: true });
    const themes = entries.filter(e =>
        e.isDirectory() &&
        !e.name.startsWith('.') &&
        // Bỏ qua theme mặc định của WP
        !e.name.startsWith('twenty')
    );

    if (themes.length === 1) return themes[0].name;

    // Fallback: lấy tên thư mục gốc project
    return path.basename(process.cwd());
}

// ─────────────────────────────────────────────
// FTP Upload (recursive directory)
// ─────────────────────────────────────────────

async function uploadDirectory(client, localDir, remoteDir, ftpRoot) {
    const files = walkDir(localDir);
    let uploadCount = 0;

    for (const relPath of files) {
        const localFilePath = path.join(localDir, relPath);
        const remoteFilePath = `${remoteDir}/${relPath}`;

        const remoteFileDir = path.posix.dirname(remoteFilePath);
        await client.ensureDir(remoteFileDir);
        await client.cd(ftpRoot);

        await client.uploadFrom(localFilePath, remoteFilePath);
        uploadCount++;
        console.log(`   ⬆️ ${relPath}`);
    }

    console.log(`   📊 Tổng cộng: ${uploadCount} file đã upload.`);
}

// ─────────────────────────────────────────────
// FTP Connection with Retry
// ─────────────────────────────────────────────

async function connectWithRetry(client, serverInfo, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔗 Đang kết nối FTP (lần ${attempt}/${maxRetries})...`);
            await client.access({
                host: serverInfo.host,
                user: serverInfo.user,
                password: serverInfo.pass,
                secure: false,
            });
            console.log(`✅ Kết nối FTP thành công: ${serverInfo.host}`);
            return;
        } catch (err) {
            console.error(`⚠️ Lần ${attempt} thất bại: ${err.message}`);
            if (attempt === maxRetries) {
                throw new Error(`Không thể kết nối FTP sau ${maxRetries} lần thử: ${err.message}`);
            }
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
}

// ─────────────────────────────────────────────
// WordPress-specific helpers
// ─────────────────────────────────────────────

/**
 * File/folder được bảo vệ — KHÔNG BAO GIỜ xoá hoặc ghi đè trên server.
 * Áp dụng cho incremental deploy (lần 2+).
 */
const WP_PROTECTED_PATTERNS = [
    'wp-config.php',
    'wp-config-sample.php',
    '.htaccess',
    '.htpasswd',
    '.repo_lock',
];

/**
 * Kiểm tra path có thuộc thư mục uploads không (media files).
 */
function isUploadDir(relativePath) {
    return relativePath.startsWith('wp-content/uploads/') ||
           relativePath === 'wp-content/uploads';
}

/**
 * Kiểm tra path có phải WP core (ngoài wp-content/themes/[name]/) không.
 */
function isWpCore(relativePath, themeName) {
    const themePrefix = `wp-content/themes/${themeName}/`;

    // Cho phép thay đổi trong theme
    if (relativePath.startsWith(themePrefix)) return false;

    // Mọi thứ khác = WP core (wp-admin, wp-includes, root files, plugins, uploads, etc.)
    return true;
}

/**
 * Kiểm tra file có được bảo vệ không.
 */
function isProtected(relativePath) {
    if (WP_PROTECTED_PATTERNS.some(p => relativePath === p)) return true;
    if (isUploadDir(relativePath)) return true;
    return false;
}

/**
 * Map file thay đổi trong src/ sang đường dẫn tương ứng trong public/.
 * Trả về danh sách file cần upload từ thư mục build output.
 */
function mapSrcChangesToTheme(diffLines, sourceFolder, themeName) {
    const themeOutputDir = path.join(sourceFolder, 'wp-content', 'themes', themeName);
    const result = { upload: [], delete: [], scssChanged: false };

    for (const line of diffLines) {
        const parts = line.split(/\t/);
        const status = parts[0].charAt(0);
        let srcPath = '';

        if (status === 'R') {
            // Renamed: xoá file cũ, upload file mới
            const oldSrc = parts[1];
            const newSrc = parts[2];

            if (oldSrc.startsWith('src/')) {
                const oldRel = oldSrc.substring(4); // Bỏ 'src/'
                result.delete.push(oldRel);
            }
            srcPath = newSrc;
        } else {
            srcPath = parts[1];
        }

        if (!srcPath || !srcPath.startsWith('src/')) continue;

        const srcRel = srcPath.substring(4); // Bỏ 'src/'

        // Check if SCSS changed → cần upload tất cả CSS
        if (srcRel.startsWith('assets/scss/') || srcRel.endsWith('.scss')) {
            result.scssChanged = true;
        }

        if (status === 'D') {
            // File bị xoá
            let delPath = srcRel;
            // Image JPG/PNG → xoá file .webp tương ứng
            if (/\.(jpg|jpeg|png)$/i.test(delPath) && delPath.startsWith('assets/images/')) {
                delPath = delPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            }
            // SCSS → xoá CSS tương ứng (nếu là entry file)
            if (delPath.startsWith('assets/scss/') && !path.basename(delPath).startsWith('_')) {
                delPath = delPath.replace('assets/scss/', 'assets/css/').replace(/\.scss$/, '.css');
            }
            result.delete.push(delPath);
        } else if (status === 'A' || status === 'M') {
            // File thêm/sửa → tìm file tương ứng trong build output
            let outRel = srcRel;

            // SCSS → CSS (sẽ được handle riêng nếu scssChanged)
            if (srcRel.startsWith('assets/scss/')) continue;

            // Image JPG/PNG → WebP
            if (/\.(jpg|jpeg|png)$/i.test(outRel) && outRel.startsWith('assets/images/')) {
                outRel = outRel.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            }

            const outFile = path.join(themeOutputDir, outRel);
            if (fs.existsSync(outFile)) {
                result.upload.push({ local: outFile, remote: outRel });
            }
        }
    }

    // Nếu SCSS thay đổi → upload tất cả CSS files (an toàn nhất)
    if (result.scssChanged) {
        const cssDir = path.join(themeOutputDir, 'assets', 'css');
        if (fs.existsSync(cssDir)) {
            const cssFiles = walkDir(cssDir, cssDir);
            for (const cssRel of cssFiles) {
                const local = path.join(cssDir, cssRel);
                result.upload.push({ local, remote: `assets/css/${cssRel}` });
            }
        }
    }

    return result;
}

// ─────────────────────────────────────────────
// Main Deploy Logic
// ─────────────────────────────────────────────

async function runDeploy() {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   🚀 WP DEPLOY AN TOÀN — KHỞI ĐỘNG         ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    // ─── Đọc & validate config ───
    if (!fs.existsSync('deploy-config.json')) {
        console.error('❌ LỖI: Không tìm thấy file deploy-config.json!');
        process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync('deploy-config.json', 'utf8'));

    const configErrors = validateConfig(config);
    if (configErrors.length > 0) {
        console.error('❌ LỖI CẤU HÌNH deploy-config.json:');
        configErrors.forEach((e) => console.error(`   • ${e}`));
        process.exit(1);
    }

    // 🛡️ LỚP 1: CHỐNG PATH TRAVERSAL
    const isValidDir = /^[a-zA-Z0-9_-]+$/.test(config.project_dir);
    if (!isValidDir) {
        console.error(`❌ LỖI NGHIÊM TRỌNG: Tên dự án "${config.project_dir}" KHÔNG HỢP LỆ!`);
        console.error(`   Chỉ cho phép: Chữ cái, số, gạch ngang (-), gạch dưới (_).`);
        process.exit(1);
    }

    // ─── Kiểm tra source folder ───
    if (!fs.existsSync(config.source_folder)) {
        console.error(`❌ LỖI: Thư mục source "${config.source_folder}" không tồn tại!`);
        process.exit(1);
    }

    // ─── Detect theme name ───
    const themeName = detectThemeName(config.source_folder);
    if (!themeName) {
        console.error('❌ LỖI: Không tìm thấy theme trong wp-content/themes/!');
        console.error('   Hãy chạy "npm run build" trước khi deploy.');
        process.exit(1);
    }
    console.log(`🎨 Theme detected: ${themeName}`);

    // ─── Kiểm tra Server Secret ───
    if (!process.env.SERVER_SECRET_JSON) {
        console.error(`❌ LỖI: Không tìm thấy Secret cho server [${config.server}].`);
        console.error(`   Hãy tạo GitHub Secret tên "${config.server.toUpperCase()}_CONFIG" chứa JSON cấu hình FTP.`);
        process.exit(1);
    }

    const serverInfo = JSON.parse(process.env.SERVER_SECRET_JSON);
    const targetDir = `${serverInfo.ftp_dir}/${config.project_dir}`;
    const themeRemoteDir = `${targetDir}/wp-content/themes/${themeName}`;

    console.log('');
    console.log(`📋 Cấu hình:`);
    console.log(`   • Server: ${serverInfo.host}`);
    console.log(`   • Thư mục FTP: ${targetDir}`);
    console.log(`   • Theme: ${themeName}`);
    console.log(`   • Theme remote: ${themeRemoteDir}`);
    console.log('');

    // ─── Kết nối FTP ───
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        await connectWithRetry(client, serverInfo);

        const ftpRoot = await client.pwd();

        // 🛡️ LỚP 2: REPO LOCK (CHỐNG GHI ĐÈ NHẦM)
        let isFirstDeploy = false;
        try {
            await client.cd(targetDir);
            const lockFileLocal = '/tmp/.repo_lock';
            await client.downloadTo(lockFileLocal, '.repo_lock');
            const lockOwner = fs.readFileSync(lockFileLocal, 'utf8').trim();

            if (lockOwner !== process.env.GITHUB_REPO) {
                throw new Error(
                    `❌ CẢNH BÁO BẢO MẬT: Thư mục [${config.project_dir}] đang thuộc về dự án [${lockOwner}]. ` +
                    `Repo hiện tại: [${process.env.GITHUB_REPO}]. HỦY DEPLOY ĐỂ TRÁNH GHI ĐÈ!`
                );
            }
            console.log('✅ Khớp mã chủ quyền (.repo_lock) — an toàn.');
        } catch (err) {
            if (err.message.includes('CẢNH BÁO BẢO MẬT')) throw err;
            isFirstDeploy = true;
            console.log('ℹ️ Phát hiện deploy lần đầu — sẽ setup đầy đủ.');
        }

        // ════════════════════════════════════════
        // LUÔN CẬP NHẬT: .htpasswd (mỗi lần deploy)
        // ════════════════════════════════════════
        console.log('🔐 Cập nhật .htpasswd...');
        const hashedPass = crypt(config.basic_auth.password);
        fs.writeFileSync('/tmp/.htpasswd', `${config.basic_auth.username}:${hashedPass}`);
        if (!isFirstDeploy) {
            await client.uploadFrom('/tmp/.htpasswd', `${targetDir}/.htpasswd`);
        }

        // ════════════════════════════════════════
        // CHẾ ĐỘ 1: DEPLOY LẦN ĐẦU TIÊN
        // Upload toàn bộ WP core + theme
        // ════════════════════════════════════════
        if (isFirstDeploy) {
            console.log('');
            console.log('━━━ DEPLOY LẦN ĐẦU: Upload WP + Theme + Bảo mật ━━━');

            await client.ensureDir(targetDir);
            await client.cd(ftpRoot);

            // 1. Tạo .repo_lock
            console.log('🔒 Tạo .repo_lock...');
            fs.writeFileSync('/tmp/.repo_lock', process.env.GITHUB_REPO);
            await client.uploadFrom('/tmp/.repo_lock', `${targetDir}/.repo_lock`);

            // 2. Upload .htpasswd (đã tạo ở trên)
            await client.uploadFrom('/tmp/.htpasswd', `${targetDir}/.htpasswd`);

            // 3. Tạo .htaccess (WordPress rewrite + Basic Auth)
            console.log('🔐 Tạo .htaccess (WordPress + Basic Auth)...');
            const htaccessContent = [
                '# === Bảo vệ file ẩn ===',
                '<Files ~ "^\\.\\(htaccess|htpasswd\\)$">',
                'Deny from all',
                '</Files>',
                '',
                '# === Basic Auth ===',
                'AuthType Basic',
                'AuthName "Restricted Area"',
                `AuthUserFile ${serverInfo.root_path}/${config.project_dir}/.htpasswd`,
                'Require valid-user',
                '',
                '# === WordPress Rewrite Rules ===',
                '<IfModule mod_rewrite.c>',
                'RewriteEngine On',
                `RewriteBase /${config.project_dir}/`,
                'RewriteRule ^index\\.php$ - [L]',
                'RewriteCond %{REQUEST_FILENAME} !-f',
                'RewriteCond %{REQUEST_FILENAME} !-d',
                'RewriteRule . index.php [L]',
                '</IfModule>',
            ].join('\n');
            fs.writeFileSync('/tmp/.htaccess', htaccessContent);
            await client.uploadFrom('/tmp/.htaccess', `${targetDir}/.htaccess`);

            // 4. Upload toàn bộ public/ (WP core + theme)
            console.log(`📤 Upload toàn bộ ${config.source_folder}/ (WP core + Theme)...`);
            await uploadDirectory(client, config.source_folder, targetDir, ftpRoot);

            console.log('');
            console.log('✅ Hoàn thành Deploy lần đầu!');
            console.log('');
            console.log('📝 BƯỚC TIẾP THEO (thủ công):');
            console.log('   1. FTP vào server → tạo wp-config.php (copy từ wp-config-sample.php)');
            console.log('   2. Tạo database MySQL trên hosting');
            console.log('   3. Mở browser → truy cập URL → hoàn thành cài đặt WordPress');
        }

        // ════════════════════════════════════════
        // CHẾ ĐỘ 2: INCREMENTAL DEPLOY
        // Chỉ upload file thay đổi trong theme
        // ════════════════════════════════════════
        else {
            console.log('');
            console.log('━━━ CẬP NHẬT: Chỉ đẩy file thay đổi trong theme ━━━');

            await client.cd(ftpRoot);

            // Kiểm tra đủ commit để diff
            let diffOutput = '';
            try {
                const commitCount = execSync('git rev-list --count HEAD').toString().trim();
                if (parseInt(commitCount, 10) < 2) {
                    console.log('ℹ️ Chỉ có 1 commit — upload toàn bộ theme...');
                    const themeLocalDir = path.join(config.source_folder, 'wp-content', 'themes', themeName);
                    await uploadDirectory(client, themeLocalDir, themeRemoteDir, ftpRoot);
                    console.log('✅ Hoàn thành!');
                    return;
                }
                // Diff trên src/ (source code, không phải output)
                diffOutput = execSync('git diff --name-status HEAD~1 HEAD -- src/').toString().trim();
            } catch (gitErr) {
                console.error(`⚠️ Git diff lỗi: ${gitErr.message}`);
                console.log('ℹ️ Fallback: Upload toàn bộ theme...');
                const themeLocalDir = path.join(config.source_folder, 'wp-content', 'themes', themeName);
                await uploadDirectory(client, themeLocalDir, themeRemoteDir, ftpRoot);
                console.log('✅ Hoàn thành!');
                return;
            }

            if (!diffOutput) {
                console.log('ℹ️ Không có thay đổi trong src/ — kiểm tra file khác...');

                // Kiểm tra nếu thay đổi ở deploy-config, scripts, etc.
                const otherDiff = execSync('git diff --name-status HEAD~1 HEAD').toString().trim();
                if (!otherDiff) {
                    console.log('ℹ️ Không có thay đổi nào.');
                    return;
                }

                // Nếu chỉ đổi config/scripts → không cần deploy theme
                const hasNonSrcChanges = otherDiff.split('\n').some(line => {
                    const filePath = line.split(/\t/)[1] || '';
                    return !filePath.startsWith('src/') &&
                           !filePath.startsWith('.github/') &&
                           !filePath.startsWith('scripts/') &&
                           filePath !== 'deploy-config.json' &&
                           filePath !== 'package.json' &&
                           filePath !== '.gitignore';
                });

                if (!hasNonSrcChanges) {
                    console.log('ℹ️ Chỉ thay đổi config/scripts — không cần deploy theme.');
                    return;
                }
            }

            // Map src/ changes → theme output
            const diffLines = diffOutput.split('\n').filter(Boolean);
            const changes = mapSrcChangesToTheme(diffLines, config.source_folder, themeName);

            let uploadCount = 0;
            let deleteCount = 0;
            let skipCount = 0;

            // Upload changed files
            for (const item of changes.upload) {
                const remotePath = `${themeRemoteDir}/${item.remote}`;
                const remoteFileDir = path.posix.dirname(remotePath);
                await client.ensureDir(remoteFileDir);
                await client.cd(ftpRoot);
                await client.uploadFrom(item.local, remotePath);
                console.log(`   ⬆️ ${item.remote}`);
                uploadCount++;
            }

            // Delete removed files (chỉ trong theme, bảo vệ WP core)
            for (const delRel of changes.delete) {
                // 🛡️ LỚP 3: Chỉ xoá trong theme directory
                const remotePath = `${themeRemoteDir}/${delRel}`;
                try {
                    await client.remove(remotePath);
                    console.log(`   🗑️ Đã xóa: ${delRel}`);
                    deleteCount++;
                } catch {
                    // File có thể không tồn tại trên server
                }
            }

            if (changes.scssChanged) {
                console.log('   📝 SCSS thay đổi → đã upload tất cả CSS files.');
            }

            console.log('');
            console.log(`📊 Kết quả: ${uploadCount} upload, ${deleteCount} xóa, ${skipCount} bảo vệ.`);
            console.log('✅ Hoàn thành Cập nhật Theme!');
        }
    } catch (error) {
        console.error('');
        console.error('╔══════════════════════════════════════╗');
        console.error('║         ❌ LỖI HỆ THỐNG             ║');
        console.error('╚══════════════════════════════════════╝');
        console.error(error.message);
        process.exit(1);
    } finally {
        client.close();
        console.log('');
        console.log('🔌 Đã ngắt kết nối FTP.');
    }
}

runDeploy();
