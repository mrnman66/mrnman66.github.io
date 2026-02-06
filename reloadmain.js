// Quick Reload Button for Lampa Header
(function () {
    "use strict";

    // Защита от повторной инициализации
    if (window.plugin_header_reload_ready) return;
    window.plugin_header_reload_ready = true;

    // Иконка перезагрузки (оптимизированная под размеры панели)
    const reloadIconSVG = 
        '<svg viewBox="0 0 24 24" width="24" height="24" style="display:block">' +
        '<path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>' +
        '</svg>';

    function addReloadButton() {
        // Проверка существования целевого контейнера и отсутствия дубликата
        const $headerRight = $(".head__right");
        if (!$headerRight.length || $headerRight.find('[data-action="header-reload"]').length) return;

        // Создание иконки в стиле системных элементов Lampa
        const $reloadBtn = $(
            '<div class="head__icon selector" data-action="header-reload" style="padding:0 8px; display:flex; align-items:center">' +
            reloadIconSVG +
            '</div>'
        );

        // Обработчик нажатия
        $reloadBtn.on("hover:enter", function () {
            Lampa.Activity.out(); // Закрываем активные меню/панели
            
            // Логика перезагрузки под разные платформы
            if (Lampa.Platform.is("tizen")) {
                try { tizen.application.getCurrentApplication().restart(); return; } catch (e) {}
            } else if (Lampa.Platform.is("webos")) {
                // WebOS: попытка корректного перезапуска
                if (window.webOS && webOS.service.request) {
                    webOS.service.request("luna://com.webos.applicationManager", {
                        method: "closeByAppId",
                        parameters: { appId: window.PalmSystem && PalmSystem.appId || "" },
                        onComplete: () => window.location.reload()
                    });
                    return;
                }
            } else if (Lampa.Platform.is("nw")) {
                try { nw.Window.get().reload(); return; } catch (e) {}
            }
            
            // Универсальный fallback для всех остальных платформ
            window.location.reload();
        });

        // Вставка перед последней иконкой (обычно поиск), чтобы сохранить логику расположения
        const $lastIcon = $headerRight.children().last();
        $lastIcon.length ? $reloadBtn.insertBefore($lastIcon) : $headerRight.append($reloadBtn);
    }

    // Инициализация после полной загрузки приложения
    if (window.appready) {
        addReloadButton();
    } else {
        Lampa.Listener.follow("app", function (e) {
            if (e.type === "ready") {
                // Небольшая задержка для гарантии построения DOM панели
                setTimeout(addReloadButton, 100);
            }
        });
    }

    // Дополнительная защита: повторная проверка при смене активности (на случай динамической перерисовки header)
    Lampa.Listener.follow("activity", function (e) {
        if (e.type === "start" && e.activity === "main") {
            setTimeout(addReloadButton, 150);
        }
    });
})();
