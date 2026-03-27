        <footer class="c-footer">
            <div class="l-container">
                footer 123
                <p class="c-footer__copy">© <?php echo date('Y'); ?></p>
            </div>
            <a href="#wrapper" class="c-totop">totop</a>
        </footer>
        <div data-gdpr="wrap" id="cookiewrap">
            <div class="inner">
                <p class="close"><a href="javascript:void(0)" data-gdpr="button" style="display: inline-block;">同意する</a></p>
                <p class="txt">当サイトではCookieを使用します。Cookieの使用に関する詳細は「<a href="<?php echo is_page('privacy') ? "#ttl_policy" : esc_url(home_url('/privacy/#ttl_policy')); ?>">プライバシーポリシー</a>」をご覧ください。</p>
            </div>      
        </div>
        <!-- script -->  
        <?php wp_footer(); ?>
    </div>
    
  </body>
</html>