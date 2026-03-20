# WordPress Theme Boilerplate (Laragon + Symlink)

[日本語 (Japanese)](#日本語-japanese) | [English](#english) | [Tiếng Việt (Vietnamese)](#tiếng-việt-vietnamese)

---

## 日本語 (Japanese)

Laragonに最適化された、高速なWordPressテーマ開発用ボイラープレートです。ソースコードは `src/` 内に記述され、自動的にビルド・同期されます。

### セットアップ手順

1. **パッケージのインストール**
   ```bash
   npm install
   ```

2. **WordPress (日本語版) のダウンロード**
   ```bash
   npm run wp:download
   ```
   *※特定のバージョンを指定したい場合：* `npm run wp:download -- --version=6.4.3`

3. **環境変数 (.env) の設定**
   `.env.example` ファイルをコピーして `.env` を作成します。
   ```bash
   cp .env.example .env
   ```
   `.env` ファイルを開き、Laragonの `www` フォルダパスを設定してください。
   ```env
   LARAGON_WWW=C:\laragon\www
   ```

4. **Laragonのシンボリックリンク作成**
   ```bash
   npm run link
   ```
   このコマンドは、設定された `LARAGON_WWW` 内に現在のプロジェクトと同名のシンボリックリンクを作成し、`public/` フォルダを指すようにします。すでに存在する場合は自動的に上書きされます。
   *(※管理者権限のプロンプトが表示される場合があります)*

5. **開発開始**
   ```bash
   npm start
   ```
   ソースファイル (`src/`) を監視し、SCSSのコンパイル、画像のWebP変換、PHPファイルのコピーを行います。BrowserSyncが起動し、`http://[プロジェクト名].test` のプロキシサーバーとして http://localhost:3000 が開かれます。

### フォルダ構成
```text
[プロジェクト名]/
├── src/                     ← 開発用ソースコード
│   ├── *.php                ← テンプレートファイル
│   └── assets/              ← SCSS, JS, 画像ファイルなど
├── public/                  ← WordPress本体 + デプロイされるテーマ
├── scripts/                 ← ビルドやリンク用のカスタムスクリプト
├── .env                     ← Laragonパスなどのローカル設定
└── package.json
```

### コマンド一覧
| コマンド | 説明 |
|-------|-------|
| `npm start` | 開発サーバーと全ファイル(PHP, SCSS, JS, Images)の監視 |
| `npm run build` | プロダクション用ビルド（監視なし） |
| `npm run wp:download` | 最新(または指定バージョン)のWordPress JAをダウンロード |
| `npm run link` | Laragonの www → `public/` へのシンボリックリンク作成 |
| `npm run clean` | 出力されたテーマを削除 (WP本体は保持) |

---

## English

A high-speed WordPress theme development boilerplate optimized for Laragon with automatic symlinking. All source code is written inside `src/` and automatically built to `public/`.

### Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Download WordPress (Japanese Edition)**
   ```bash
   npm run wp:download
   ```
   *※ To specify a version:* `npm run wp:download -- --version=6.4.3`

3. **Set Up Environment Variables (.env)**
   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and configure your Laragon `www` path:
   ```env
   LARAGON_WWW=C:\laragon\www
   ```

4. **Create Laragon Symlink**
   ```bash
   npm run link
   ```
   This command creates a symlink in your `LARAGON_WWW` directory pointing to the `public/` folder. It will automatically replace an existing folder/symlink if one exists.
   *(※ A UAC Admin prompt may appear on Windows)*

5. **Start Development**
   ```bash
   npm start
   ```
   Watches the `src/` folder for changes, compiles SCSS, converts images to WebP, and synchronizes PHP files. BrowserSync will launch at http://localhost:3000, proxying `http://[project-name].test`.

### Directory Structure
```text
[project_name]/
├── src/                     ← YOUR SOURCE CODE
│   ├── *.php                ← PHP templates
│   └── assets/              ← SCSS, JS, Vendor, Images
├── public/                  ← Installed WordPress Core + Output Theme
├── scripts/                 ← Build & Utilities scripts
├── .env                     ← Local environment configuration
└── package.json
```

### Available Commands
| Command | Description |
|-------|-------|
| `npm start` | Dev server + File watcher (PHP, SCSS, JS, Images) |
| `npm run build` | One-off production build |
| `npm run wp:download` | Download latest (or specific) WordPress JA |
| `npm run link` | Symlink Laragon www → `public/` |
| `npm run clean` | Remove compiled theme output (keeps WP Core) |

---

## Tiếng Việt (Vietnamese)

Hệ thống phát triển WordPress Theme siêu tốc, tối ưu hóa cho phần mềm Laragon bằng cơ chế Symlink thông minh. Toàn bộ mã nguồn phát triển nằm trong thư mục `src/`.

### Hướng dẫn Cài đặt

1. **Cài đặt thư viện**
   ```bash
   npm install
   ```

2. **Tải mã nguồn WordPress (Bản Tiếng Nhật)**
   ```bash
   npm run wp:download
   ```
   *※ Muốn tải phiên bản cụ thể:* `npm run wp:download -- --version=6.4.3`

3. **Thiết lập biến môi trường (.env)**
   Copy file `.env.example` và đổi tên thành `.env`:
   ```bash
   cp .env.example .env
   ```
   Mở file `.env` và thiết lập đường dẫn đến thư mục `www` của Laragon trên máy tính của bạn:
   ```env
   LARAGON_WWW=C:\laragon\www
   ```

4. **Tạo Link Kết Nối với Laragon**
   ```bash
   npm run link
   ```
   Lệnh này sẽ tự động sinh ra một symlink tại đường dẫn cấu hình `LARAGON_WWW` trỏ trực tiếp về thư mục `public/` của dự án. Nếu thư mục hoặc link cũ đã tồn tại, công cụ sẽ tự động xoá bớt để tạo mới.
   *(※ Bước này có thể yêu cầu bạn cấp quyền Administrator (Run As Admin) trên Windows)*

5. **Bắt đầu Lập Trình**
   ```bash
   npm start
   ```
   Lệnh này thực hiện tự động theo dõi file trong `src/` để biên dịch SCSS ra CSS, chuyển đổi định dạng ảnh sang WebP, và đồng bộ mã nguồn PHP. Ngay lúc này BrowserSync sẽ chạy ở http://localhost:3000, trỏ thông qua proxy vào tên miền `http://[tên_dự_án].test` được sinh bởi Laragon.

### Cấu trúc Thư mục
```text
[tên_dự_án]/
├── src/                     ← MÃ NGUỒN BẠN VIẾT VÀO ĐÂY
│   ├── *.php                ← Các file template (header, footer, functions...)
│   └── assets/              ← Chứa tệp tĩnh SCSS, JS, Vendor, Images
├── public/                  ← Lõi WordPress (Tự gen) + Mã nguồn bản build
├── scripts/                 ← Các lệnh NodeJS bổ trợ cho build, tải WP
├── .env                     ← File cấu hình đường dẫn nội bộ máy tính
└── package.json
```

### Tổng hợp các Lệnh
| Lệnh | Ý nghĩa |
|-------|-------|
| `npm start` | Compile code và Watch toàn bộ file (PHP, SCSS, JS, Images) |
| `npm run build` | Phiên bản build tĩnh nhanh gọn một lần (không watch) |
| `npm run wp:download` | Chạy lệnh tải WP bản tiếng Nhật mới nhất (hoặc theo cú pháp lấy version) |
| `npm run link` | Trích xuất Symlink vào thư mục web `www` của Laragon |
| `npm run clean` | Xoá toàn bộ folder Theme đã build để lấy lại không gian sạch |
