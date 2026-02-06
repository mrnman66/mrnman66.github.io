// Quick Reload Button for Lampa Header (Fixed)
(function () {
    "use strict";

    // Защита от повторной инициализации
    if (window.plugin_header_reload_ready) return;
    window.plugin_header_reload_ready = true;

    // Оптимизированная иконка перезагрузки (24x24, соответствует стилю Lampa)
    const reloadIconSVG = 
        '<svg viewBox="0 0 24 24" width="24" height="24" style="display:block">' +
        '<path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>' +
        '</svg>';

    function addReloadButton() {
        // Ищем контейнер для иконок шапки (правильное место согласно коду приложения)
        const $actions = $(".head__actions");
        if (!$actions.length) return;
        
        // Проверяем, не добавлена ли уже иконка
        if ($actions.find('[data-action="header-reload"]').length) return;

        // Создаем элемент в точном соответствии со структурой Lampa
        const $reloadBtn = $(
            '<div class="head__action selector" data-action="header-reload" style="padding:0 8px">' +
            reloadIconSVG +
            '</div>'
        );

        // Обработчик нажатия
        $reloadBtn.on("hover:enter", function () {
            Lampa.Activity.out(); // Закрываем активные меню
            
            // Логика перезагрузки под разные платформы
            try {
                if (Lampa.Platform.is("tizen")) {
                    tizen.application.getCurrentApplication().restart();
                    return;
                } else if (Lampa.Platform.is("webos")) {
                    if (window.webOS?.service?.request) {
                        webOS.service.request("luna://com.webos.applicationManager", {
                            method: "closeByAppId",
                            parameters: { appId: window.PalmSystem?.appId || "" },
                            onComplete: () => window.location.reload()
                        });
                        return;
                    }
                } else if (Lampa.Platform.is("nw")) {
                    nw.Window.get().reload();
                    return;
                }
            } catch (e) {
                console.warn("Reload platform handler failed:", e);
            }
            
            // Универсальный fallback
            window.location.reload();
        });

        // Вставляем ПЕРВОЙ в контейнер (чтобы иконка была слева от поиска)
        $actions.prepend($reloadBtn);
    }

    // Инициализация после полной загрузки приложения
    function initPlugin() {
        // Добавляем при готовности приложения
        addReloadButton();
        
        // Передобавляем при смене активности (на случай пересоздания шапки)
        Lampa.Listener.follow("activity", function (e) {
            if (e.type === "start" && e.activity === "main") {
                // Небольшая задержка для гарантии построения DOM
                setTimeout(addReloadButton, 150);
            }
        });
        
        // Дополнительная проверка при открытии главного меню
        Lampa.Listener.follow("toggle", function (e) {
            if (e.name === "main") {
                setTimeout(addReloadButton, 100);
            }
        });
    }

    // Запуск инициализации
    if (window.appready) {
        initPlugin();
    } else {
        Lampa.Listener.follow("app", function (e) {
            if (e.type === "ready") {
                initPlugin();
            }
        });
    }
})();
