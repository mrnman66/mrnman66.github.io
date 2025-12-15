// ==LampaPlugin==
// @name         Без рекламы + расширенные закладки
// @description  Отключает преролл-рекламу и включает все типы локальных закладок без аккаунта CUB
// @author       user
// @version      1.1
// ==/LampaPlugin==

(function () {
    'use strict';

    // Настройки
    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.account_use = true;
    window.lampa_settings.account_sync = false;

    // Отключить рекламу
    function disableAds() {
        if (typeof Lampa !== 'undefined' && Lampa.Preroll) {
            Lampa.Preroll.show = function (data, callback) {
                console.log('🔇 Реклама пропущена (плагин)');
                if (typeof callback === 'function') callback();
            };
        }
    }

    // Включить расширенные закладки
    function enableBookmarks() {
        const tryEnable = () => {
            if (typeof Account$1 !== 'undefined' && Account$1.Permit) {
                Object.defineProperty(Account$1.Permit, 'sync', {
                    get: () => true,
                    configurable: true
                });
                console.log('🔖 Расширенные закладки включены (локально)');
                return true;
            }
            return false;
        };

        if (!tryEnable()) {
            const iv = setInterval(() => {
                if (tryEnable()) clearInterval(iv);
            }, 500);
            setTimeout(() => clearInterval(iv), 10000);
        }
    }

    // Запуск после загрузки Lampa
    function init() {
        if (typeof Lampa !== 'undefined' && typeof Account$1 !== 'undefined') {
            disableAds();
            enableBookmarks();
        } else {
            setTimeout(init, 300);
        }
    }

    init();
})();