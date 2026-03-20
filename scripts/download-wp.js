import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, createWriteStream, rmSync, renameSync, unlinkSync } from 'fs';
import { get } from 'https';
import AdmZip from 'adm-zip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC_DIR = resolve(ROOT, 'public');
const versionArg = process.argv.find(arg => arg.startsWith('--version='));
const version = versionArg ? versionArg.split('=')[1] : null;

const WP_DOWNLOAD_URL = version 
    ? `https://ja.wordpress.org/wordpress-${version}-ja.zip`
    : 'https://ja.wordpress.org/latest-ja.zip';

const WP_ZIP_PATH = version 
    ? resolve(ROOT, `wordpress-${version}-ja.zip`)
    : resolve(ROOT, 'latest-ja.zip');

function ensureDir(dir) {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = createWriteStream(dest);
        get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // handle redirection
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            unlinkSync(dest);
            reject(err);
        });
    });
}

async function main() {
    console.log('╔══════════════════════════════════════╗');
    console.log('║    WordPress (JA) Downloader         ║');
    console.log('╚══════════════════════════════════════╝\n');

    try {
        if (!existsSync(PUBLIC_DIR)) {
            ensureDir(PUBLIC_DIR);
        }

        // Check if WP already exists
        if (existsSync(join(PUBLIC_DIR, 'wp-config-sample.php'))) {
            console.log('➜ WordPress appears to be already installed in public/ directory.');
            console.log('➜ Skipping download. If you want to reinstall, delete the public/ folder first.\n');
            return;
        }

        if (version) {
            console.log(`[1/3] Downloading WordPress (JA) version ${version} from: ${WP_DOWNLOAD_URL}...`);
        } else {
            console.log(`[1/3] Downloading latest WordPress (JA) from: ${WP_DOWNLOAD_URL}...`);
        }
        await downloadFile(WP_DOWNLOAD_URL, WP_ZIP_PATH);
        console.log(`   ✓ Download complete (${WP_ZIP_PATH})`);

        console.log(`\n[2/3] Extracting zip file...`);
        const zip = new AdmZip(WP_ZIP_PATH);
        
        // Extract to a temporary folder first to handle the inner "wordpress" folder
        const tempExtractDir = resolve(ROOT, '.wp_temp');
        ensureDir(tempExtractDir);
        zip.extractAllTo(tempExtractDir, true);

        console.log(`\n[3/3] Moving files to public folder...`);
        // The zip contains a single 'wordpress' folder. We want its contents in public/
        const innerWpDir = join(tempExtractDir, 'wordpress');
        
        if (existsSync(innerWpDir)) {
             // We can use fs-extra or simple rename since public might be empty
             // Since node renameSync across partitions might fail, we assume same drive here.
             // But for safety let's just copy/move everything.
             const fs = await import('fs');
             const entries = fs.readdirSync(innerWpDir);
             for(let entry of entries) {
                 const srcPath = join(innerWpDir, entry);
                 const destPath = join(PUBLIC_DIR, entry);
                 fs.renameSync(srcPath, destPath);
             }
        }
        
        // Cleanup temporary files
        rmSync(tempExtractDir, { recursive: true, force: true });
        rmSync(WP_ZIP_PATH, { force: true });

        console.log(`   ✓ WordPress successfully extracted to ${PUBLIC_DIR}\n`);
    } catch (err) {
        console.error('\n❌ Error downloading or extracting WordPress:', err.message);
        process.exit(1);
    }
}

main();
