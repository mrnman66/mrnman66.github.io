// ==LampaPlugin==
// @name         Без рекламы + полные закладки (локально)
// @description  Отключает рекламу и включает ВСЕ типы закладок без аккаунта CUB
// @author       user
// @version      1.2
// ==/LampaPlugin==

(function () {
    'use strict';

    const category$2 = ['like', 'wath', 'book', 'history', 'look', 'viewed', 'scheduled', 'continued', 'thrown'];

    // Настройки
    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.account_use = true;
    window.lampa_settings.account_sync = false;

    // Отключить рекламу
    function disableAds() {
        if (typeof Lampa !== 'undefined' && Lampa.Preroll) {
            Lampa.Preroll.show = function (data, callback) {
                if (typeof callback === 'function') callback();
            };
        }
    }

    // Включить Permit.sync = true
    function enableSync() {
        if (typeof Account$1 !== 'undefined' && Account$1.Permit) {
            Object.defineProperty(Account$1.Permit, 'sync', {
                get: () => true,
                configurable: true
            });
        }
    }

    // Патч Favorite для локальной поддержки всех категорий
    function patchFavorite() {
        if (typeof Favorite === 'undefined' || typeof Favorite.check !== 'function') return;

        const originalCheck = Favorite.check;

        Favorite.check = function (card) {
            const result = originalCheck.call(this, card);
            const all = Favorite.all();
            const id = card.id;

            category$2.forEach(type => {
                result[type] = all[type] ? all[type].includes(id) : false;
            });

            return result;
        };

        const originalToggle = Favorite.toggle;
        Favorite.toggle = function (where, card) {
            if (!category$2.includes(where)) {
                return originalToggle.call(this, where, card);
            }

            const all = Favorite.all();
            const id = card.id;
            const list = all[where] || [];
            const index = list.indexOf(id);

            if (index === -1) {
                list.unshift(id);
                if (!all.card.find(c => c.id === id)) {
                    all.card.push(card);
                }
            } else {
                list.splice(index, 1);
            }

            all[where] = list;
            Favorite.save();
            Lampa.Listener.send('state:changed', {
                target: 'favorite',
                method: index === -1 ? 'add' : 'remove',
                where,
                card
            });
        };
    }

    // Инициализация
    function init() {
        if (typeof Lampa === 'undefined' || typeof Account$1 === 'undefined' || typeof Favorite === 'undefined') {
            setTimeout(init, 300);
            return;
        }

        disableAds();
        enableSync();
        patchFavorite();

        console.log('✅ Плагин активирован: реклама отключена, все закладки доступны');
    }

    init();
})();
