// ==LampaPlugin==
// @name         Все закладки + без рекламы
// @description  Включает все категории закладок (просмотрено, запланировано и т.д.) без аккаунта CUB. Отключает рекламу.
// @author       user
// @version      1.6
// ==/LampaPlugin==

(function () {
    'use strict';

    function waitForGlobals() {
        if (
            typeof Account$1 === 'undefined' ||
            typeof Account$1.Permit === 'undefined' ||
            typeof Favorite === 'undefined' ||
            typeof Lampa === 'undefined'
        ) {
            setTimeout(waitForGlobals, 500);
            return;
        }

        // === 1. Отключаем рекламу ===
        if (Lampa.Preroll) {
            Lampa.Preroll.show = function (data, callback) {
                if (typeof callback === 'function') callback();
            };
        }

        // === 2. Фейковый аккаунт CUB ===
        const fakeToken = 'fake_lampa_token_123';
        Account$1.Permit.token = fakeToken;
        Account$1.Permit.user = {
            id: 999,
            profile: { id: 999 },
            premium: 1,
            name: 'Guest'
        };

        // === 3. Обход проверок ===
        Account$1.hasPremium = () => 1;
        Account$1.status = () => true;
        Account$1.logined = () => true;
        Account$1.showCubPremium = () => {};
        Account$1.Modal = { account: () => {}, premium: () => {} };

        // === 4. Включаем sync (если вдруг не сработало автоматически) ===
        try {
            Object.defineProperty(Account$1.Permit, 'sync', {
                get: () => true,
                configurable: true
            });
        } catch (e) {
            Account$1.Permit.sync = true;
        }

        console.log('✅ Все закладки активированы. Реклама отключена.');
    }

    // Запускаем с небольшой задержкой, чтобы Lampa успела загрузиться
    setTimeout(waitForGlobals, 2000);
})();
