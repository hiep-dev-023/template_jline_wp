<?php
get_header();
?>
<!-- ↓↓ main ↓↓ -->
<main class="p-404">
    <section class="c-mv01">
        <ul class="c-bread">
            <li class="c-bread__item"><a href="<?php echo esc_url(home_url('/')); ?>" class="c-bread__link"><?php echo esc_html(get_bloginfo('name')); ?> TOP</a></li>
            <li class="c-bread__item">404 見つかりません</li>
        </ul>
        <div class="l-container">
            <h1 class="c-title">
                <span class="c-title__en">404 NOT FOUND</span>
                <span class="c-title__jp">404 見つかりません</span>
            </h1>
        </div>
    </section>
    <div class="p-404__inner">
        <div class="l-container">
            <p class="c_txt16" data-aos="fade-up">お探しのページは見つかりません。<br>一時的にアクセスできない状態か、移動もしくは削除されてしまった可能性があります。</p>
            <div class="p-404__btn" data-aos="fade-up">         
                <a href="<?php echo esc_url(home_url('/')); ?>" class="c-btn01 c-btn01--style02">トップへ戻る<svg class="c-btn01__icon" xmlns="http://www.w3.org/2000/svg" width="25.28" height="42.077" viewBox="0 0 25.28 42.077"><path d="M-8748.265,1773l16.8,16.8-16.8,16.8" transform="translate(8752.507 -1768.757)" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="6" opacity="0.07"/></svg></a> 
            </div>
        </div>        
    </div>
    <!-- ↑↑ 404 ↑↑ -->
</main>
<!-- ↑↑ main ↑↑ -->
<?php
get_footer();
?>
