<?php
///////////////////////////////////
// part block theme
/////////////////////////////////

function written_enqueue_block_variations() {

	wp_enqueue_script(
		'written-enqueue-block-variations',
		get_template_directory_uri() . '/assets/js/blockeditor-variations.js',
		array( 'wp-rich-text','wp-blocks', 'wp-dom-ready', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n', 'wp-primitives', 'lodash' ),
		wp_get_theme()->get( 'Version' ),
		false
	);
	wp_localize_script(
        'written-enqueue-block-variations',
        'themeData',
        array(
            'templateUrl' => get_template_directory_uri(),
        )
    );
}
add_action( 'enqueue_block_editor_assets', 'written_enqueue_block_variations' );

add_action( 'after_setup_theme', function () {
	add_theme_support( 'editor-styles' );
	add_editor_style( 'assets/css/blockeditor.css' );
});

add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style(
		'mytheme-style',
		get_parent_theme_file_uri( '/assets/css/blockeditor.css' ),
		array( 'wp-block-library' ),
		null
	);
}, 20 );

add_filter( 'block_categories_all', function( $categories ) {
    return array_merge(
        [
            [
                'slug'  => 'my-category-custom',
                'title' => 'ブロックカスタム',
                'icon'  => 'screenoptions',
            ],
        ],
        $categories
    );
} );


add_action('init', function () {
  register_block_style(
    'core/heading',
    [
      'name'  => 'dot',
      'label' => 'Dot'
    ]
  );
  register_block_style(
	'core/button',
	[ 'name' => 'style01' ]
	);

});
