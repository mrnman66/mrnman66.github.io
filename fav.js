// ==LampaPlugin==
// @name         Все закладки + без рекламы (локально)
// @description  Полный доступ ко всем категориям закладок без аккаунта CUB и без рекламы
// @author       user
// @version      1.5
// ==/LampaPlugin==

(function () {
    'use strict';

    // === Настройки ===
    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.account_use = true;
    window.lampa_settings.account_sync = false;

    // === Отключить рекламу ===
    function disableAds() {
        if (typeof Lampa !== 'undefined' && Lampa.Preroll) {
            Lampa.Preroll.show = function (data, callback) {
                if (typeof callback === 'function') callback();
            };
        }
    }

    // === Подделать аккаунт CUB ===
    function fakeAccount() {
        if (typeof Account$1 === 'undefined' || typeof Account$1.Permit === 'undefined') return;

        // Токен — обязателен (иначе "ещё нет аккаунта")
        Account$1.Permit.token = 'fake_token_12345';

        // Пользователь
        Account$1.Permit.user = {
            id: 12345,
            profile: { id: 12345 },
            premium: 1,
            name: 'Guest'
        };

        // Premium
        Account$1.hasPremium = function () { return 1; };
        Account$1.status = function () { return true; };
        Account$1.logined = function () { return true; };

        // Блокировка модалок
        Account$1.showCubPremium = function () {};
        Account$1.Modal = { account: () => {}, premium: () => {} };

        console.log('✅ Фейковый CUB-аккаунт активирован');
    }

    // === Инициализация ===
    function init() {
        if (typeof Lampa === 'undefined' || typeof Account$1 === 'undefined') {
            setTimeout(init, 500);
            return;
        }

        disableAds();
        fakeAccount();

        console.log('✨ Плагин готов: закладки и без рекламы');
    }

    init();
})();
