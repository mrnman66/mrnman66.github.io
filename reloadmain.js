// Quick Reload Button for Lampa Header (Mobile-Perfect)
(function () {
    "use strict";

    if (window.plugin_header_reload_ready) return;
    window.plugin_header_reload_ready = true;

    // Иконка с оптимизированным viewBox и толщиной линий под мобильные экраны
    const reloadIconSVG = 
        '<svg viewBox="0 0 24 24" style="display:block; width:100%; height:100%;">' +
        '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
        'd="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>' +
        '</svg>';

    function addReloadButton() {
        const $actions = $(".head__actions");
        if (!$actions.length || $actions.find('[data-action="header-reload"]').length) return;

        // Создаём элемент с классами, идентичными системным иконкам
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
        
        // ТОЧЕЧНАЯ КОРРЕКЦИЯ ДЛЯ МОБИЛЬНЫХ
        if (Lampa.Platform.screen('mobile')) {
            // Берём стили первой системной иконки (уведомления/поиск)
            const $refIcon = $actions.find('.head__action').not('[data-action="header-reload"]').first();
            if ($refIcon.length) {
                const refStyles = window.getComputedStyle($refIcon[0]);
                // Копируем ключевые стили для идеального совпадения
                $reloadBtn.css({
                    'padding': refStyles.padding,
                    'margin': refStyles.margin,
                    'width': refStyles.width,
                    'height': refStyles.height,
                    'min-width': refStyles.minWidth,
                    'min-height': refStyles.minHeight,
                    'box-sizing': 'border-box'
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
        
        // Дополнительно: перекалибровка при изменении размера окна
        Lampa.Listener.follow("resize_end", function () {
            if (Lampa.Activity.active().name === 'main') {
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
