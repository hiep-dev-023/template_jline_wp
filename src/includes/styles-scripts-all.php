<?php
add_action( 'wp_enqueue_scripts', function() {
    $themeUrl = get_template_directory_uri();

    $themeDir = get_template_directory();

    // css files
    wp_enqueue_style( 'scrollable-css', $themeUrl . '/assets/vendor/scrollable/scrollable.css', array(), '1.0.1' );
    wp_enqueue_style( 'aos-css', $themeUrl . '/assets/vendor/aos/aos.css', array(), '1.0.1' );
    wp_enqueue_style( 'style-css', $themeUrl . '/assets/css/common.css', array(), filemtime($themeDir . '/assets/css/common.css') );

    if(is_front_page()){
        wp_enqueue_style( 'slick-css', $themeUrl . '/assets/vendor/slick/slick.css', array(), '1.0.1' );
        wp_enqueue_style( 'top-css', $themeUrl . '/assets/css/top.css', array(), filemtime($themeDir . '/assets/css/top.css') );
    }

    

    // js files

    wp_enqueue_script( 'jquery-js', $themeUrl . '/assets/vendor/jquery/jquery-3.5.1.min.js', array(), '1.0', true );    
    wp_enqueue_script( 'scrollable-js', $themeUrl . '/assets/vendor/scrollable/scrollable.js', array(), '1.0', true );
    wp_enqueue_script( 'aos-js', $themeUrl . '/assets/vendor/aos/aos.js', array(), '1.0', true );
    wp_enqueue_script( 'cookie-js', $themeUrl . '/assets/js/cookie.js', array(), filemtime($themeDir . '/assets/js/cookie.js'), true );
    wp_enqueue_script( 'common-js', $themeUrl . '/assets/js/common.js', array(), filemtime($themeDir . '/assets/js/common.js'), true );
    

    // js only page, post
    if(is_front_page()){
        wp_enqueue_script( 'slick-js', $themeUrl . '/assets/vendor/slick/slick.min.js', array(), '1.0', true );
        wp_enqueue_script( 'top-js', $themeUrl . '/assets/js/top.js', array(), filemtime($themeDir . '/assets/js/top.js'), true );
    }

} );             
?>