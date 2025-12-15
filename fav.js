// ==LampaPlugin==
// @name         Без рекламы + полные закладки
// @description  Отключает рекламу и включает все категории закладок (Просмотрено, Запланировано, Продолжить и т.д.) без аккаунта CUB
// @author       user
// @version      1.3
// ==/LampaPlugin==

(function () {
    'use strict';

    const category$2 = ['like', 'wath', 'book', 'history', 'look', 'viewed', 'scheduled', 'continued', 'thrown'];

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

    // === Включить Permit.sync ===
    function enableSync() {
        if (typeof Account$1 !== 'undefined' && Account$1.Permit) {
            Object.defineProperty(Account$1.Permit, 'sync', {
                get: () => true,
                configurable: true
            });
        }
    }

    // === Патч Favorite: поддержка всех категорий локально ===
    function patchFavorite() {
        if (typeof Favorite === 'undefined') return;

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

    // === Патч: принудительно показывать все вкладки в "Избранное" ===
    function patchBookmarkTabs() {
        if (typeof component$2 === 'undefined') return;

        const original = component$2;
        window.component$2 = function (object) {
            const comp = original(object);

            const origOnCreate = comp.onCreate;
            comp.onCreate = function () {
                origOnCreate.call(this);

                const tabs = this.render().find('.bookmark__menu');
                if (tabs.length && tabs.children().length <= 4) {
                    tabs.empty();
                    const allTabs = ['book', 'like', 'wath', 'history', 'viewed', 'scheduled', 'continued', 'thrown'];

                    allTabs.forEach(type => {
                        const title = Lang.translate('menu_' + type) || type;
                        const tab = $(`<div class="bookmark__tab selector" data-type="${type}"><span>${title}</span></div>`);
                        tabs.append(tab);
                    });

                    tabs.find('.bookmark__tab').on('hover:enter', function () {
                        const type = $(this).data('type');
                        Lampa.Activity.replace({
                            component: 'favorite',
                            type: type,
                            title: Lang.translate('menu_' + type) || type
                        });
                    });

                    tabs.find('.bookmark__tab').first().addClass('active');
                }
            };

            return comp;
        };
    }

    // === Инициализация ===
    function init() {
        if (
            typeof Lampa === 'undefined' ||
            typeof Account$1 === 'undefined' ||
            typeof Favorite === 'undefined' ||
            typeof component$2 === 'undefined'
        ) {
            setTimeout(init, 500);
            return;
        }

        disableAds();
        enableSync();
        patchFavorite();
        patchBookmarkTabs();

        console.log('✅ Плагин активирован: реклама отключена, все закладки включены');
    }

    init();
})();
