# WordPress Theme Boilerplate

Hệ thống phát triển WordPress Theme tối ưu, hỗ trợ SCSS, WebP tự động, BrowserSync live-reload, và CI/CD deploy qua FTP.

---

## 📋 Mục Lục

- [Yêu Cầu Hệ Thống](#-yêu-cầu-hệ-thống)
- [Cấu Trúc Thư Mục](#-cấu-trúc-thư-mục)
- [Thiết Lập Nhanh](#-thiết-lập-nhanh)
- [Cấu Hình Theo Hệ Điều Hành](#-cấu-hình-theo-hệ-điều-hành)
  - [Windows + Laragon](#windows--laragon-khuyến-nghị)
  - [Windows + XAMPP](#windows--xampp)
  - [macOS + MAMP](#macos--mamp)
  - [macOS + Laravel Valet](#macos--laravel-valet)
  - [Linux + Apache](#linux--apache)
- [Hướng Dẫn Phát Triển](#-hướng-dẫn-phát-triển)
- [Build System Chi Tiết](#-build-system-chi-tiết)
- [Lệnh CLI](#-lệnh-cli)
- [CI/CD Deploy Qua FTP](#-cicd-deploy-qua-ftp)
- [FAQ & Xử Lý Lỗi](#-faq--xử-lý-lỗi)

---

## 🔧 Yêu Cầu Hệ Thống

| Phần mềm | Phiên bản tối thiểu | Kiểm tra |
|-----------|---------------------|----------|
| Node.js | 18+ (khuyến nghị 20+) | `node -v` |
| npm | 9+ | `npm -v` |
| Git | 2.30+ | `git --version` |
| Local Server | Laragon / XAMPP / MAMP / Valet | — |

**Cài đặt Node.js:**
- Windows/macOS: [nodejs.org](https://nodejs.org/) → tải bản LTS
- Linux: `sudo apt install nodejs npm` (Ubuntu) hoặc `sudo dnf install nodejs npm` (Fedora)

---

## 📁 Cấu Trúc Thư Mục

```
[project_name]/
├── src/                          ← 💻 Source code (bạn code ở đây)
│   ├── *.php                     ← PHP template files
│   ├── style.css                 ← Theme metadata (tên, mô tả)
│   ├── theme.json                ← Block theme settings
│   ├── includes/                 ← PHP includes (functions, hooks)
│   └── assets/
│       ├── scss/                 ← SCSS → auto compile → CSS
│       │   ├── common.scss       ← Entry file → common.css
│       │   ├── top.scss          ← Entry file → top.css
│       │   ├── global/           ← Variables, mixins, functions
│       │   ├── foundation/       ← Reset, base styles
│       │   ├── component/        ← UI components
│       │   ├── layout/           ← Layout components
│       │   ├── page/             ← Page-specific styles
│       │   └── utilities/        ← Utility classes
│       ├── js/                   ← JavaScript files (copy trực tiếp)
│       ├── images/               ← JPG/PNG → auto convert → WebP
│       └── vendor/               ← Thư viện bên thứ 3 (jQuery, AOS...)
│
├── public/                       ← 🌐 WordPress core + Theme build output
│   ├── wp-admin/                 ← WP core (download-wp.js tạo)
│   ├── wp-includes/              ← WP core
│   ├── wp-config.php             ← DB config (tạo thủ công)
│   └── wp-content/themes/
│       └── [project_name]/       ← ✅ Theme đã build (build.js tạo)
│
├── scripts/                      ← Build scripts
│   ├── build.js                  ← SCSS compile, WebP convert, file copy
│   ├── download-wp.js            ← WordPress downloader
│   ├── link.js                   ← Symlink creator
│   └── clean.js                  ← Clean build output
│
├── .github/                      ← CI/CD
│   ├── workflows/deploy.yml      ← GitHub Actions workflow
│   └── scripts/deploy.cjs        ← FTP deploy script
│
├── deploy-config.json            ← Deploy configuration
├── .env                          ← Local environment (không commit)
├── .env.example                  ← Environment template
└── package.json
```

> **Quan trọng:** `public/` bị `.gitignore` — nó được tạo tự động bởi `wp:download` và `build`.

---

## ⚡ Thiết Lập Nhanh

```bash
# 1. Clone hoặc copy template
git clone <repo-url> my-project
cd my-project

# 2. Cài đặt dependencies
npm install

# 3. Tải WordPress
npm run wp:download

# 4. Tạo file .env
cp .env.example .env
# → Mở .env và sửa đường dẫn cho đúng máy bạn

# 5. Tạo symlink vào web server
npm run link

# 6. Bắt đầu code!
npm start
```

> **Kết quả:** Trình duyệt mở `http://localhost:3000` → proxy tới `http://[project_name].test`

---

## 🖥 Cấu Hình Theo Hệ Điều Hành

### Windows + Laragon (Khuyến nghị)

**Bước 1: Cài đặt Laragon**
- Tải [Laragon Full](https://laragon.org/download/) → cài đặt
- Laragon tự tạo domain `.test` cho mỗi project trong `www/`

**Bước 2: Cấu hình `.env`**
```env
SERVER_TYPE=laragon
LARAGON_WWW=D:\laragon\www
```
> Nếu cài Laragon ở ổ khác, đổi `D:\laragon\www` cho đúng.

**Bước 3: Chạy lệnh setup**
```bash
npm install
npm run wp:download
npm run link          # ← Sẽ hiện UAC popup, bấm "Yes"
```

**Bước 4: Cài WordPress**
1. Mở Laragon → bấm **Start All**
2. Mở browser → `http://[project_name].test`
3. Tạo database trong **phpMyAdmin** (Laragon → Database)
4. Làm theo wizard cài đặt WordPress

**Bước 5: Phát triển**
```bash
npm start
```

---

### Windows + XAMPP

**Bước 1: Cài đặt XAMPP**
- Tải [XAMPP](https://www.apachefriends.org/) → cài đặt
- Document root mặc định: `C:\xampp\htdocs`

**Bước 2: Cấu hình `.env`**
```env
SERVER_TYPE=xampp
XAMPP_HTDOCS=C:\xampp\htdocs
```

**Bước 3: Chạy lệnh setup**
```bash
npm install
npm run wp:download
npm run link          # ← Cần quyền Admin
```

**Bước 4: Cài WordPress**
1. Mở XAMPP Control Panel → Start **Apache** + **MySQL**
2. Mở browser → `http://localhost/[project_name]`
3. Tạo database trong phpMyAdmin (`http://localhost/phpmyadmin`)
4. Hoàn thành wizard WordPress

**Bước 5: Phát triển**
```bash
npm start
# BrowserSync proxy → http://localhost/[project_name]
```

---

### macOS + MAMP

**Bước 1: Cài đặt**
```bash
# Cài Node.js qua Homebrew
brew install node

# Tải MAMP từ https://www.mamp.info/
```

**Bước 2: Cấu hình `.env`**
```env
SERVER_TYPE=laragon
LARAGON_WWW=/Applications/MAMP/htdocs
PROXY_URL=http://localhost:8888/[project_name]
```
> MAMP mặc định dùng port 8888. Đặt `PROXY_URL` vì không có auto `.test` domain.

**Bước 3: Chạy lệnh setup**
```bash
npm install
npm run wp:download
npm run link
```
> macOS không cần quyền Admin cho symlink.

**Bước 4: Cài WordPress**
1. Mở MAMP → Start Servers
2. Mở browser → `http://localhost:8888/[project_name]`
3. Tạo database → cài WordPress

**Bước 5: Phát triển**
```bash
npm start
# BrowserSync proxy → http://localhost:8888/[project_name]
```

---

### macOS + Laravel Valet

**Bước 1: Cài đặt**
```bash
brew install php composer node
composer global require laravel/valet
valet install
```

**Bước 2: Cấu hình `.env`**
```env
SERVER_TYPE=laragon
LARAGON_WWW=/Users/[username]/.valet/Sites
PROXY_URL=http://[project_name].test
```

**Bước 3: Chạy lệnh setup**
```bash
npm install
npm run wp:download
npm run link

# Đăng ký với Valet
cd public && valet link [project_name] && cd ..
```

**Bước 4: Cài WordPress**
```bash
# Cài MySQL
brew install mysql && brew services start mysql

# Tạo database
mysql -u root -e "CREATE DATABASE [project_name]"
```
Mở `http://[project_name].test` → hoàn thành wizard.

**Bước 5: Phát triển**
```bash
npm start
```

---

### Linux + Apache

**Bước 1: Cài đặt**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install apache2 php php-mysql mysql-server nodejs npm

# Bật mod_rewrite
sudo a2enmod rewrite
sudo systemctl restart apache2
```

**Bước 2: Cấu hình `.env`**
```env
SERVER_TYPE=laragon
LARAGON_WWW=/var/www/html
PROXY_URL=http://localhost/[project_name]
```

**Bước 3: Chạy lệnh setup**
```bash
npm install
npm run wp:download
npm run link
```
> Nếu `/var/www/html` cần quyền root: `sudo npm run link`

**Bước 4: Cấu hình Apache cho WordPress**
```bash
# Cho phép .htaccess override
sudo nano /etc/apache2/apache2.conf
```
Tìm block `<Directory /var/www/>` và đổi `AllowOverride None` → `AllowOverride All`:
```apache
<Directory /var/www/>
    AllowOverride All
</Directory>
```
```bash
sudo systemctl restart apache2
```

**Bước 5: Cài WordPress**
```bash
sudo mysql -e "CREATE DATABASE [project_name]"
sudo mysql -e "CREATE USER 'wpuser'@'localhost' IDENTIFIED BY 'password'"
sudo mysql -e "GRANT ALL ON [project_name].* TO 'wpuser'@'localhost'"
```
Mở `http://localhost/[project_name]` → hoàn thành wizard.

**Bước 6: Phát triển**
```bash
npm start
```

---

## 💻 Hướng Dẫn Phát Triển

### Quy trình code hàng ngày

```bash
# Mở terminal trong thư mục project
npm start
```

Sau khi chạy `npm start`:
- **BrowserSync** mở `http://localhost:3000`
- **Watcher** theo dõi mọi file trong `src/`
- Sửa file → **auto build** → **auto refresh** trình duyệt

### Cách code từng loại file

| Bạn sửa | Build system làm | Output |
|---------|------------------|--------|
| `src/*.php` | Copy sang output | `themes/[name]/*.php` |
| `src/assets/scss/*.scss` | SCSS → PostCSS → Minify | `themes/[name]/assets/css/*.css` |
| `src/assets/js/*.js` | Copy sang output | `themes/[name]/assets/js/*.js` |
| `src/assets/images/*.jpg` | Convert sang WebP (quality 90) | `themes/[name]/assets/images/*.webp` |
| `src/assets/images/*.svg` | Copy trực tiếp (không convert) | `themes/[name]/assets/images/*.svg` |
| `src/assets/vendor/*` | Copy trực tiếp | `themes/[name]/assets/vendor/*` |

### SCSS Architecture

```
scss/
├── global/          ← Không output CSS, chỉ chứa variables/mixins
│   ├── _color.scss
│   ├── _font.scss
│   ├── _mixin.scss
│   └── _index.scss  ← @forward tất cả
├── foundation/      ← Reset, base styles
├── component/       ← Buttons, headers, footers...
├── layout/          ← Container, grid
├── page/            ← Page-specific styles
├── utilities/       ← Utility classes (u_margin, u_padding...)
├── common.scss      ← ✅ Entry file → common.css (tất cả trang)
└── top.scss         ← ✅ Entry file → top.css (chỉ trang chủ)
```

**Quy tắc:**
- File bắt đầu `_` (underscore) = **partial** → không tạo CSS riêng
- File không có `_` = **entry file** → tạo CSS output riêng
- Dùng `@use "../global" as *;` để import variables/mixins

### Thêm CSS cho trang mới

1. Tạo `src/assets/scss/page/about/_index.scss`
2. Tạo `src/assets/scss/about.scss`:
   ```scss
   @use "global" as *;
   @use "page/about";
   ```
3. Đăng ký trong `src/includes/styles-scripts-all.php`:
   ```php
   if(is_page('about')){
       wp_enqueue_style('about-css', $themeUrl . '/assets/css/about.css', array(), filemtime($themeDir . '/assets/css/about.css'));
   }
   ```

### Thêm JavaScript cho trang mới

1. Tạo `src/assets/js/about.js`
2. Đăng ký trong `src/includes/styles-scripts-all.php`:
   ```php
   if(is_page('about')){
       wp_enqueue_script('about-js', $themeUrl . '/assets/js/about.js', array(), filemtime($themeDir . '/assets/js/about.js'), true);
   }
   ```

### Thêm ảnh

1. Đặt ảnh JPG/PNG vào `src/assets/images/`
2. Build system tự convert sang **WebP** (chất lượng 90%)
3. Trong PHP/SCSS, tham chiếu file `.webp`:
   ```php
   <img src="<?php echo get_template_directory_uri(); ?>/assets/images/hero.webp" alt="">
   ```

> **GIF, SVG, ICO** không được convert — copy trực tiếp.

---

## ⚙ Build System Chi Tiết

### Tính năng

| Feature | Chi tiết |
|---------|----------|
| **SCSS → CSS** | `sass-embedded` compile + PostCSS (autoprefixer + cssnano + sort media queries) |
| **Images → WebP** | `sharp` convert JPG/PNG → WebP, quality 90% |
| **File Copy** | PHP, JS, vendor, SVG, GIF → copy trực tiếp |
| **Incremental Build** | Chỉ build file thay đổi (so sánh mtime) |
| **Parallel Processing** | Images + SCSS compile song song (theo số CPU cores) |
| **Source Map** | Tạo `.css.map` cho debug SCSS |
| **Clean Stale** | Tự xoá file output khi xoá file source |
| **BrowserSync** | CSS hot inject (không cần refresh), PHP/JS full reload |

### Hiệu năng

| Quy mô | Full build | Watch rebuild |
|--------|-----------|---------------|
| Nhỏ (~50 files) | < 1 giây | < 500ms |
| Vừa (~200 files) | 5-10 giây | < 1 giây |
| Lớn (~500+ ảnh) | 15-30 giây | < 1 giây |

---

## 📝 Lệnh CLI

| Lệnh | Mô tả |
|-------|-------|
| `npm start` | Chạy dev server (watch + BrowserSync) |
| `npm run build` | Build production (1 lần, không watch) |
| `npm run wp:download` | Tải WordPress JA mới nhất |
| `npm run wp:download -- --version=6.4.3` | Tải WP phiên bản cụ thể |
| `npm run link` | Tạo symlink vào web server |
| `npm run link -- --www=/path/to/htdocs` | Symlink với đường dẫn tuỳ chỉnh |
| `npm run clean` | Xoá theme build output (giữ WP core) |

### Tham số tuỳ chỉnh

```bash
# Đổi proxy URL
npm start -- --proxy=http://localhost:8080

# Đổi thư mục web server
npm run link -- --www=/var/www/html

# Download WP phiên bản cũ
npm run wp:download -- --version=6.5.2
```

---

## 🚀 CI/CD Deploy Qua FTP

### Tổng quan

Khi push code lên `main`, GitHub Actions tự động:
1. **Lần đầu**: Tải WP + Build theme → Upload toàn bộ lên FTP server
2. **Lần sau**: Build theme → Upload **chỉ file thay đổi** trong theme

### Bước 1: Tạo GitHub Secret

Vào **GitHub → Organization (hoặc Repo) → Settings → Secrets → Actions → New Secret**

| Secret Name | Value |
|-------------|-------|
| `SERVER_A_CONFIG` | `{"host":"ftp.example.com","user":"ftp_user","pass":"ftp_pass","ftp_dir":"./public_html","root_path":"/var/www/vhosts/example.com/public_html"}` |

> **Giải thích:**
> - `host`: Địa chỉ FTP server
> - `user` / `pass`: Tài khoản FTP
> - `ftp_dir`: Thư mục FTP root (relative)
> - `root_path`: Đường dẫn tuyệt đối trên server (dùng cho `.htpasswd` AuthUserFile)
>
> Thêm server mới: tạo Secret `SERVER_B_CONFIG`, `SERVER_C_CONFIG`,...

### Bước 2: Cấu hình `deploy-config.json`

```json
{
  "server": "SERVER_A",
  "project_dir": "ten_du_an",
  "source_folder": "public",
  "has_build_step": true,
  "build_command": "npm run wp:download && npm run build",
  "basic_auth": {
    "username": "tester",
    "password": "mat_khau_manh_456"
  }
}
```

| Trường | Ý nghĩa |
|--------|---------|
| `server` | Tên server (khớp với Secret: `SERVER_A` → `SERVER_A_CONFIG`) |
| `project_dir` | Tên thư mục trên server (regex: `a-z 0-9 _ -` only) |
| `source_folder` | Thư mục chứa build output (luôn là `public`) |
| `has_build_step` | `true` = chạy build trước deploy |
| `build_command` | Lệnh build (bao gồm `wp:download` + `build`) |
| `basic_auth` | Username/password bảo vệ site test |

### Bước 3: Push và Deploy

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

Theo dõi tại **GitHub → Actions** hoặc **VS Code → GitHub Actions extension**.

### Bước 4: Sau Deploy Lần Đầu

1. FTP vào server → copy `wp-config-sample.php` → `wp-config.php`
2. Sửa `wp-config.php` với thông tin database:
   ```php
   define('DB_NAME', 'ten_database');
   define('DB_USER', 'user_database');
   define('DB_PASSWORD', 'mat_khau_database');
   define('DB_HOST', 'localhost');
   ```
3. Tạo database MySQL trên hosting panel
4. Mở browser → `https://domain.com/ten_du_an/` → hoàn thành cài đặt WordPress
5. Đăng nhập WP Admin → Appearance → Themes → Kích hoạt theme

### Bảo mật Deploy

| Lớp | Bảo vệ |
|-----|--------|
| 🛡️ 1 | Path Traversal — chặn `../` trong `project_dir` |
| 🛡️ 2 | Repo Lock — `.repo_lock` chống repo khác ghi đè nhầm |
| 🛡️ 3 | Protected Files — `.htaccess`, `.htpasswd` không bị xoá |
| 🛡️ 4 | FTP Retry — tự thử lại 3 lần khi mất kết nối |
| 🛡️ 5 | `wp-config.php` — KHÔNG BAO GIỜ bị ghi đè |
| 🛡️ 6 | `wp-content/uploads/` — KHÔNG BAO GIỜ bị xoá |
| 🛡️ 7 | WP core — lần sau KHÔNG đụng tới |
| 🛡️ 8 | Delete scope — chỉ xoá file trong `themes/[name]/` |

---

## ❓ FAQ & Xử Lý Lỗi

### `npm run link` báo lỗi quyền (Windows)

Bấm **Yes** khi UAC popup hiện ra. Nếu không thấy popup:
```bash
# Chạy PowerShell as Administrator
npm run link
```

### `npm start` báo proxy lỗi

Kiểm tra:
1. Web server (Laragon/XAMPP) đã **Start** chưa?
2. File `.env` có đường dẫn `LARAGON_WWW` đúng không?
3. Đã chạy `npm run link` chưa?
4. Thử đặt proxy thủ công:
   ```bash
   npm start -- --proxy=http://localhost/[project_name]
   ```

### SCSS compile lỗi

```bash
# Kiểm tra SCSS syntax
npm run build
# → Lỗi sẽ hiển thị tên file và dòng lỗi
```

### Ảnh không convert sang WebP

- Chỉ **JPG** và **PNG** được convert → WebP
- **GIF**, **SVG**, **ICO** → copy trực tiếp, không convert
- Kiểm tra file nằm trong `src/assets/images/` (không phải `src/assets/vendor/`)

### Deploy lỗi 429 (WordPress download)

WordPress.org rate-limit GitHub Actions runners. Script tự retry 3 lần. Nếu vẫn lỗi:
- Chờ 5-10 phút rồi re-run workflow
- Lần chạy tiếp sẽ dùng cache (không cần tải lại)

### Deploy lỗi "CẢNH BÁO BẢO MẬT"

Thư mục `project_dir` trên server đã thuộc về repo khác. Kiểm tra:
1. `project_dir` trong `deploy-config.json` có đúng không?
2. Nếu chuyển repo: xoá file `.repo_lock` trên FTP server

### Muốn thay đổi tên theme

Tên theme = **tên thư mục project**. Khi clone template:
```bash
git clone <repo-url> my-new-theme
cd my-new-theme
# → Theme name tự động = "my-new-theme"
# → Output: public/wp-content/themes/my-new-theme/
```

---

## 📄 License

ISC
