<?php
include_once('includes/editor-block-theme.php');
include_once('includes/styles-scripts-all.php');
include_once('includes/contactform.php');
// ================ DEFAULT SETTING ===================
//add Featured Image
add_theme_support( 'post-thumbnails' );

/*--add feature images--*/

/**
 * Allow SVG & ICO upload (Admin only)
 * ⚠️ Note: For production, consider using the "Safe SVG" plugin
 *    to sanitize SVG content and prevent XSS attacks.
 */
function allow_svg_ico_mimes( $mimes ) {
    // Only allow admin to upload SVG/ICO
    if ( ! current_user_can( 'manage_options' ) ) {
        return $mimes;
    }
    $mimes['svg'] = 'image/svg+xml';
    $mimes['ico'] = 'image/x-icon';
    return $mimes;
}
add_filter( 'upload_mimes', 'allow_svg_ico_mimes' );

/**
 * Fix MIME check for SVG & ICO
 */
function fix_svg_ico_mime_check( $data, $file, $filename, $mimes ) {

    // Only allow admin
    if ( ! current_user_can( 'manage_options' ) ) {
        return $data;
    }

    $filetype = wp_check_filetype( $filename, $mimes );

    if ( in_array( $filetype['ext'], [ 'svg', 'ico' ], true ) ) {
        $data['ext']  = $filetype['ext'];
        $data['type'] = $filetype['type'];
    }

    return $data;
}
add_filter( 'wp_check_filetype_and_ext', 'fix_svg_ico_mime_check', 10, 4 );

//ADD MENU
if ( function_exists( 'register_nav_menu' ) ) {
    register_nav_menu( 'main-menu', 'Main Menu' );
}
//EXCERPT
add_post_type_support( 'page', 'excerpt' );

require_once( dirname( __FILE__ ) . '/includes/shortcode.php' );
// ================ END DEFAULT SETTING ===================


// Prevent WP from adding <p> tags on pages
function disable_wp_auto_p( $content ) {
    if ( is_singular( 'page' ) ) {
        remove_filter( 'the_content', 'wpautop' );
        remove_filter( 'the_excerpt', 'wpautop' );
    }
    return $content;
}
add_filter( 'the_content', 'disable_wp_auto_p', 0 );


add_filter('show_admin_bar', function($show) {
    if (!is_admin()) {
        return false;
    }
    return $show;
});

/**
 * Restrict admin menu for non-admin users (role-based)
 * Customize the $restricted_role or capability as needed per project.
 */
function restrict_admin_menus() {
    // Skip for administrators
    if ( current_user_can( 'manage_options' ) ) {
        return;
    }

    // Remove menus for non-admin users (e.g. editors, authors)
    remove_menu_page('edit.php');
    remove_menu_page('upload.php');
    remove_menu_page('edit.php?post_type=page');
    remove_menu_page('edit-comments.php');
    remove_menu_page('themes.php');
    remove_menu_page('plugins.php');
    remove_submenu_page('index.php', 'update-core.php');
    remove_menu_page('users.php');
    remove_menu_page('tools.php');
    remove_menu_page('options-general.php');
    remove_menu_page('wpcf7');
    remove_menu_page('ai1wm_export');
    remove_menu_page('cptui_main_menu');
    remove_menu_page('siteguard');
}
add_action('admin_menu', 'restrict_admin_menus');

/**
 * Remove dashboard widgets for non-admin users
 */
function restrict_dashboard_widgets() {
    if ( current_user_can( 'manage_options' ) ) {
        return;
    }

    remove_action('admin_notices', 'update_nag', 3);
    remove_meta_box('dashboard_site_health', 'dashboard', 'normal');
    remove_meta_box('dashboard_activity', 'dashboard', 'normal');
    remove_meta_box('dashboard_right_now', 'dashboard', 'normal');
    remove_meta_box('dashboard_quick_press', 'dashboard', 'side');
    remove_meta_box('dashboard_primary', 'dashboard', 'side');
}
add_action('wp_dashboard_setup', 'restrict_dashboard_widgets');

/**
 * Hide update icon in admin bar for non-admin users
 */
function restrict_adminbar_update_icon() {
    if ( current_user_can( 'manage_options' ) ) {
        return;
    }

    global $wp_admin_bar;
    $wp_admin_bar->remove_menu('updates');
}
add_action('wp_before_admin_bar_render', 'restrict_adminbar_update_icon');

/**
 * Hide update notifications for non-admin users
 */
function restrict_update_notifications() {
    if ( current_user_can( 'manage_options' ) ) {
        return;
    }

    add_filter('pre_site_transient_update_core', '__return_zero');
    remove_action('wp_version_check', 'wp_version_check');
    remove_action('admin_init', '_maybe_update_core');
}
add_action('admin_init', 'restrict_update_notifications');
