// Main Menu Reload
(function () {
    "use strict";

    Lampa.Lang.add({
        reload_menu: {
            ru: "Перезагрузка",
            en: "Reload",
            uk: "Перезавантаження",
            be: "Перазагрузка",
            zh: "重新加载",
            pt: "Recarregar",
            bg: "Презареждане"
        }
    });

    function reload_m(object) {
        this.create = function () { };
        this.build = function () { };
        this.start = function () { };
        this.pause = function () { };
        this.stop = function () { };
        this.render = function () { };
        this.destroy = function () { };
    }

    function add() {
        var ico =
            '<svg version="1.1" id="reload" color="#fff" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">' +
            '<g>' +
            '<path fill="currentColor" d="M432,256c0-17.6-14.4-32-32-32H156.8l68.8-68.8c6.2-6.2,6.2-16.4,0-22.6c-6.2-6.2-16.4-6.2-22.6,0L128,208 c-6.2,6.2-6.2,16.4,0,22.6l74.4,74.4c6.2,6.2,16.4,6.2,22.6,0c6.2-6.2,6.2-16.4,0-22.6L156.8,288H400c17.6,0,32-14.4,32-32 S449.6,256,432,256z"/>' +
            '<path fill="currentColor" d="M112,256c0,17.6,14.4,32,32,32h243.2l-68.8,68.8c-6.2,6.2-6.2,16.4,0,22.6c3.1,3.1,7.2,4.7,11.3,4.7 s8.2-1.6,11.3-4.7l74.4-74.4c6.2-6.2,6.2-16.4,0-22.6l-74.4-74.4c-6.2-6.2-16.4-6.2-22.6,0c-6.2,6.2-6.2,16.4,0,22.6 L355.2,224H112c-17.6,0-32,14.4-32,32S94.4,256,112,256z"/>' +
            '</g>' +
            '</svg>';

        var menu_items = $(
            '<li class="menu__item selector" data-action="reload_r"><div class="menu__ico">' +
            ico +
            '</div><div class="menu__text">' +
            Lampa.Lang.translate("reload_menu") +
            "</div></li>"
        );

        menu_items.on("hover:enter", function () {
            Lampa.Activity.out();

            if (Lampa.Platform.is('apple_tv')) {
                // Для Apple TV можно попробовать перезагрузить через JS, но официально нет API — перезагрузка не поддерживается.
                // Вместо этого просто перезагружаем страницу.
                window.location.reload();
            } else if (Lampa.Platform.is("tizen")) {
                tizen.application.getCurrentApplication().restart();
            } else if (Lampa.Platform.is("webos")) {
                // WebOS не имеет официального API для перезапуска, но можно закрыть и открыть заново (или перезагрузить страницу)
                window.location.reload();
            } else if (Lampa.Platform.is("android")) {
                window.location.reload();
            } else if (Lampa.Platform.is("orsay")) {
                // Orsay: нет стандартного метода перезагрузки, делаем reload
                window.location.reload();
            } else if (Lampa.Platform.is("nw")) {
                nw.Window.get().reload();
            } else {
                // fallback для браузера и других платформ
                window.location.reload();
            }
        });

        $(".menu .menu__list").eq(1).append(menu_items);
    }

    function createReloadMenu() {
        window.plugin_reload_m_ready = true;
        Lampa.Component.add("reload_m", reload_m);
        if (window.appready) {
            add();
        } else {
            Lampa.Listener.follow("app", function (e) {
                if (e.type == "ready") add();
            });
        }
    }

    if (!window.plugin_reload_m_ready) {
        createReloadMenu();
    }
})();
