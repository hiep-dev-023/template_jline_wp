<?php get_header(); 
global $post;
$post_type = get_post_type( $post );
$post_type_obj = get_post_type_object( $post_type );
$cate = get_the_terms(get_the_ID(), 'works_cate'); 
$tags = get_the_terms(get_the_ID(), 'works_tags');
?>
<main class="p-details p-details--works">   
    <ul class="c-bread">
        <li class="c-bread__item"><a href="<?php echo esc_url(home_url('/')); ?>" class="c-bread__link"><?php echo esc_html(get_bloginfo('name')); ?> TOP</a></li>
        <li class="c-bread__item"><a href="<?php echo esc_url( get_post_type_archive_link( $post_type )) ; ?>" class="c-bread__link"><?php echo esc_html( $post_type_obj->labels->name ); ?></a></li>
        <li class="c-bread__item"><?php echo esc_html( get_the_title() ); ?></li>
    </ul>
    <div class="l-container">
        <div class="p-details__worksmv">
            <div class="p-details__worksmv__left">
                <?php if (!empty($cate) && is_array($cate)):?>
                    <div class="p-details__cate">
                        <?php foreach ($cate as $term):?>
                        <a href="" class="p-details__cate__item"><?php echo esc_html($term->name); ?></a>
                        <?php endforeach; ?>  
                    </div>
                <?php  endif; ?>
                <h1 class="c-ttl36 c-ttl36--noto"><?php echo esc_html( get_the_title() ); ?></h1>
            </div>
            <div class="p-details__worksmv__right">
                <div class="c-img01 active">
                    <div class="c-img01__item c-img01__item01"></div>
                    <div class="c-img01__item c-img01__item02"></div>
                    <div class="c-img01__item c-img01__item03"></div>
                    <div class="c-img01__item c-img01__item04"></div>
                </div>
            </div>
        </div>
        <div class="p-details__content">
            <?php echo do_blocks('<!-- wp:post-content /-->'); ?>
        </div>
        <div class="p-details__btn01">
            <a href="<?php echo esc_url(home_url('/works/')); ?>" class="c-btn01 c-btn01--style03">一覧へ戻る</a>
        </div>
    </div>
</main>
<?php get_footer(); ?>