// Quick Reload Button for Lampa Header (Perfect Match)
(function () {
    "use strict";

    if (window.plugin_header_reload_ready) return;
    window.plugin_header_reload_ready = true;

    // Чистая иконка с заливкой (как системные), фиксированный размер 24x24
    const reloadIconSVG = 
        '<svg viewBox="0 0 24 24" width="24" height="24" style="display:block">' +
        '<path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>' +
        '</svg>';

    function addReloadButton() {
        const $actions = $(".head__actions");
        if (!$actions.length || $actions.find('[data-action="header-reload"]').length) return;

        // Создаём элемент БЕЗ инлайновых стилей — как системные иконки
        const $reloadBtn = $(
            '<div class="head__action selector" data-action="header-reload">' +
            reloadIconSVG +
            '</div>'
        );

        $reloadBtn.on("hover:enter", function () {
            Lampa.Activity.out();
            try {
                if (Lampa.Platform.is("tizen")) {
                    tizen.application.getCurrentApplication().restart();
                    return;
                } else if (Lampa.Platform.is("webos") && window.webOS?.service?.request) {
                    webOS.service.request("luna://com.webos.applicationManager", {
                        method: "closeByAppId",
                        parameters: { appId: window.PalmSystem?.appId || "" },
                        onComplete: () => window.location.reload()
                    });
                    return;
                } else if (Lampa.Platform.is("nw")) {
                    nw.Window.get().reload();
                    return;
                }
            } catch (e) {
                console.warn("Reload handler failed:", e);
            }
            window.location.reload();
        });

        $actions.prepend($reloadBtn);
        
        // ТОЧЕЧНАЯ КОРРЕКЦИЯ ТОЛЬКО ДЛЯ МОБИЛЬНЫХ (Android и др.)
        if (Lampa.Platform.screen('mobile')) {
            const $refIcon = $actions.find('.head__action').not('[data-action="header-reload"]').first();
            if ($refIcon.length) {
                // Копируем ТОЛЬКО размеры контейнера, не трогая внутреннюю иконку
                const refWidth = $refIcon.outerWidth();
                const refHeight = $refIcon.outerHeight();
                
                $reloadBtn.css({
                    'width': refWidth + 'px',
                    'height': refHeight + 'px',
                    'min-width': refWidth + 'px',
                    'min-height': refHeight + 'px',
                    'display': 'flex',
                    'align-items': 'center',
                    'justify-content': 'center'
                });
            }
        }
    }

    function initPlugin() {
        addReloadButton();
        
        Lampa.Listener.follow("activity", function (e) {
            if (e.type === "start" && e.activity === "main") {
                setTimeout(addReloadButton, 150);
            }
        });
        
        Lampa.Listener.follow("toggle", function (e) {
            if (e.name === "main") {
                setTimeout(addReloadButton, 100);
            }
        });
        
        // Перекалибровка при изменении размера (поворот экрана)
        Lampa.Listener.follow("resize_end", function () {
            if (Lampa.Activity.active().name === 'main' && Lampa.Platform.screen('mobile')) {
                setTimeout(addReloadButton, 100);
            }
        });
    }

    if (window.appready) {
        initPlugin();
    } else {
        Lampa.Listener.follow("app", function (e) {
            if (e.type === "ready") initPlugin();
        });
    }
})();
