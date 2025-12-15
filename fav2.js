(function () {
    'use strict';

    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'init') {
            // Принудительно включаем премиум-статус
            Lampa.Account.has_premium = function () { return true; };
            Lampa.Account.premium = true;

            // Блокируем всю рекламу (включая пре-роллы перед видео)
            if (Lampa.Advertising) {
                Lampa.Advertising.show = function () {};
                Lampa.Advertising.start = function () {};
                Lampa.Advertising.init = function () {};
                Lampa.Advertising.destroy = function () {};
            }

            // Удаляем любые рекламные элементы
            setInterval(function () {
                document.querySelectorAll('.advertising, .player-ad, .ad-block').forEach(el => el.remove());
            }, 1000);

            // Расширенное меню закладок
            if (Lampa.Bookmark && Lampa.Bookmark.menu) {
                var origMenu = Lampa.Bookmark.menu;
                Lampa.Bookmark.menu = function () {
                    var menu = origMenu.call(this) || [];

                    menu.push({
                        title: 'Папка: Смотрю позже',
                        type: 'folder_later',
                        onSelect: function () {
                            // Логика добавления в кастомную папку
                            var items = Lampa.Storage.get('custom_later', []);
                            items.push(this.item);
                            Lampa.Storage.set('custom_later', items);
                            Lampa.Noty.show('Добавлено в "Смотрю позже"');
                        }
                    });

                    menu.push({
                        title: 'Папка: Любимое',
                        type: 'folder_fav',
                        onSelect: function () {
                            var items = Lampa.Storage.get('custom_fav', []);
                            items.push(this.item);
                            Lampa.Storage.set('custom_fav', items);
                            Lampa.Noty.show('Добавлено в "Любимое"');
                        }
                    });

                    menu.push({
                        title: 'Экспорт/Импорт закладок',
                        onSelect: function () {
                            // Простой экспорт (можно доработать)
                            var data = Lampa.Storage.cache();
                            var blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
                            var url = URL.createObjectURL(blob);
                            var a = document.createElement('a');
                            a.href = url;
                            a.download = 'lampa_bookmarks.json';
                            a.click();
                        }
                    });

                    return menu;
                };
            }

            Lampa.Noty.show('Премиум разблокирован: нет рекламы + расширенные закладки');
        }
    });
})();
