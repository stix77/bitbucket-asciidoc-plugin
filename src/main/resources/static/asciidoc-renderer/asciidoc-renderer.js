define('asciidoc/asciidoc-renderer', [
    'jquery',
    'underscore',
    'lib/asciidoctor'
], function(
    $,
    _,
    asciidoctor
) {
 function AsciiDocRenderer($container) {
        this.$container = $container;
        this.width = this.$container.innerWidth();
        this.height = this._calculateHeight();

         _.bindAll(this, '_onWindowResize', 'render');
        $(window).on('resize', this._onWindowResize);
    }

    AsciiDocRenderer.prototype._onWindowResize = function() {
        this.height = this._calculateHeight();
        this.width = this.$container.innerWidth();
    };

    AsciiDocRenderer.prototype._calculateAspectRatio = function() {
        return this.width / this.height;
    };

    AsciiDocRenderer.prototype._calculateHeight = function() {
        var windowHeightRatio = 0.6;
        return $(window).height() * windowHeightRatio;
    };


    AsciiDocRenderer.prototype.render = function(asciiDocRawUrl, commitHash) {
        var content;
        $.ajax({
            url : asciiDocRawUrl,
            async:false,
            success : function(data){
                content = data;
            },
            error: function (xhr, status, errorMessage) {
            }
        });

        try {
            var attributes =  {'source-highlighter': 'highlightjs', 'stylesheet': 'idea.css', 'linkcss!': '', 'copycss!': '', 'showtitle': '', 'stem!': '', 'env-bitbucket': '', 'env': 'bitbucket'};
            var options = {'to_file': false, 'safe': 'secure', 'attributes': attributes};
            var html = asciidoctor.convert(content, options);
            this.$container.html(html);
            postProcess(this.$container, options, asciiDocRawUrl, commitHash);
        } catch (e) {
            return;
        }
    };


    function postProcess($content, options, asciiDocRawUrl, commitHash) {
        applyHighlighting($content, 'highlightjs', '');
        handleImages($content, asciiDocRawUrl, commitHash);
        handleLinks($content, asciiDocRawUrl, commitHash);
    }

    function applyHighlighting($content, highlighter, sourceLanguage) {
        var AVAILABLE_HIGHLIGHTERS = {
            'highlightjs': highlightUsingHighlightjs,
            'highlight.js': highlightUsingHighlightjs
        };

        if (sourceLanguage) {
            $('code.src', $content).each(function () {
                $(this).data('lang', sourceLanguage).addClass('src-' + sourceLanguage).removeClass('src');
            });
        }

        if (highlighter in AVAILABLE_HIGHLIGHTERS) {
            AVAILABLE_HIGHLIGHTERS[highlighter]($content);
        } else {
            console.log('Unknown syntax highlighter "' + highlighter + '", using "' + DEFAULT_HIGHLIGHTER + '" instead.');
            // not in IE8
            if ('keys' in Object) {
                console.log('Recognized highlighter names: ' + Object.keys(AVAILABLE_HIGHLIGHTERS));
            }
            AVAILABLE_HIGHLIGHTERS['highlightjs']($content);
        }
    }

    function highlightUsingHighlightjs($content) {
        $('code[class^="language-"],code[class^="src-"]', $content).each(function (i, e) {
            e.className = e.className.replace('src-', 'language-');
            hljs.highlightBlock(e);
            var $e = $(e);
            var $parent = $e.parent('pre.highlight');
            var language = $e.data('lang');
            if (!language) {
                var matches = e.className.match(/language-([a-z]*)/);
                if (matches.length === 2) {
                    language = matches[1];
                }
            }
            if ($parent.length === 0) {
                $e.css('display', 'inline').addClass(language).css('padding', 0);
            } else {
                $parent.addClass(language);
            }
        });
    }

    /**
     * Handle images and convert relative image locations to absolute URLs
     */
    function handleImages($content, asciiDocRawUrl, commitHash) {
        $('img', $content).each(function () {
            if(!this.getAttribute('src').startsWith('http'))
                this.src = getBaseUrl(asciiDocRawUrl) + this.getAttribute('src') + '?at=' + commitHash + '&raw';
        });
    }

    /**
     * Handle links and convert relative locations to absolute URLs
     */
    function handleLinks($content, asciiDocRawUrl, commitHash) {
        $('a', $content).each(function () {
            if(!this.getAttribute('href').startsWith('http') && !this.getAttribute('href').startsWith('#') && $(this).parents('.toc').size() == 0)
                this.href = getBaseUrl(asciiDocRawUrl) + this.getAttribute('href') + '?at=' + commitHash;
        });
    }

    /**
     * Return base Url of the AsciiDoc file
     * @param AsciiDoc URL
     * @returns {string} base Url of the AsciiDoc file
     */
    function getBaseUrl(asciiDocRawUrl) {
        return asciiDocRawUrl.substring(0, asciiDocRawUrl.lastIndexOf('/')+1);
    }

    AsciiDocRenderer.prototype.destroy = function() {
        $(window).off('resize', this._onWindowResize);
    };

    return AsciiDocRenderer;
});