<!doctype html>
<html lang="ja">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="format-detection" content="telephone=no, address=no, email=no">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="icon" type="image/x-icon" href="<?php echo get_site_icon_url(); ?>">
        <!-- link -->  
        <?php wp_head(); ?>
        <link rel="apple-touch-icon" href="<?php echo get_template_directory_uri(); ?>/assets/images/common/apple-touch-icon.webp" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Shippori+Mincho:wght@400;500;700&display=swap" rel="stylesheet">
        <?php if (is_page('contact')): ?>
                <style>
                    .grecaptcha-badge{
                        display: block !important;
                        z-index: 1000;
                    }
                </style>
        <?php endif; ?>
        <?php if (is_front_page()): ?>
        <script>
            if (!sessionStorage.getItem('storage_loading')) {
                document.documentElement.classList.add('is-loading');
            }
        </script>
        <?php endif; ?>
    </head>
    <body>
        <?php if (is_front_page()): ?>
        <script>
            if (!window.sessionStorage.getItem("storage_loading")) {
                document.documentElement.classList.add("is-loading");    
                window.sessionStorage.setItem("storage_loading", new Date().getTime().toString());    
            }
        </script>
        <?php endif; ?>
        <header class="c-header">
            Header
        </header>