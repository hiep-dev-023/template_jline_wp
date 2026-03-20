<?php
/* Template directory */
add_shortcode('tmpurl', 'shortcode_tmpurl');
function shortcode_tmpurl() {
	return get_bloginfo('template_url');
}

/* Site directory */
add_shortcode('siteurl', 'shortcode_siteurl');
function shortcode_siteurl() {
	return get_bloginfo('url');
}

add_filter('wpcf7_form_elements', function($content) {
    return do_shortcode($content);
});


add_shortcode('link', 'shortcode_link');
function shortcode_link($atts, $content = null) {
    $atts = shortcode_atts(array(
        'url' => '',
        'text' => '',
        'target' => '_self'
    ), $atts, 'siteurl');

    $base_url = get_bloginfo('url');
    $full_url = trailingslashit($base_url) . ltrim($atts['url'], '/');
    $link_text = $atts['text'] ? $atts['text'] : ($content ? do_shortcode($content) : $full_url);

    $rel_attr = '';
    if ($atts['target'] === '_blank') {
        $rel_attr = ' rel="noopener noreferrer"';
    }

    return '<a href="' . esc_url($full_url) . '" target="' . esc_attr($atts['target']) . '"' . $rel_attr . '>' . esc_html($link_text) . '</a>';
}

?>