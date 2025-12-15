// ==LampaPlugin==
// @name         Без рекламы + все закладки (локально)
// @description  Отключает рекламу и включает ВСЕ категории закладок без аккаунта CUB
// @author       user
// @version      1.4
// ==/LampaPlugin==

(function () {
    'use strict';

    // === 1. Настройки ===
    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.account_use = true;
    window.lampa_settings.account_sync = false;

    // === 2. Отключить рекламу ===
    function disableAds() {
        if (typeof Lampa !== 'undefined' && Lampa.Preroll) {
            Lampa.Preroll.show = function (data, callback) {
                if (typeof callback === 'function') callback();
            };
        }
    }

    // === 3. Обход проверок CUB ===
    function bypassCubChecks() {
        if (typeof Account$1 === 'undefined') return;

        // Включаем sync
        Object.defineProperty(Account$1.Permit, 'sync', {
            get: () => true,
            configurable: true
        });

        // Подменяем hasPremium()
        Account$1.hasPremium = function () {
            return 1; // как будто есть премиум
        };

        // Блокируем модальные окна
        Account$1.showCubPremium = function () {};
        Account$1.Modal = { account: () => {}, premium: () => {} };

        console.log('✅ Обход CUB: sync=true, hasPremium=1, модалки отключены');
    }

    // === 4. Инициализация ===
    function init() {
        if (typeof Lampa === 'undefined' || typeof Account$1 === 'undefined') {
            setTimeout(init, 500);
            return;
        }

        disableAds();
        bypassCubChecks();

        console.log('✨ Плагин активирован: реклама отключена, все закладки доступны');
    }

    init();
})();
