/**
 * PidTor Plugin for Lampa
 * Поиск торрентов через jacred.xyz прямо из браузера.
 * Подключение: Настройки → Плагины → Добавить → вставить URL этого файла
 */
(function () {
    'use strict';

    // ============ КОНФИГ ============
    var CONFIG = {
        api: 'https://jacred.xyz/api/v2.0/indexers/all/results',
        min_sid: 1,
        sort: 'sid', // sid | size | date
        quality_filter: [], // пусто = все; или ['2160p','1080p']
        voice_filter: [],   // пусто = все
        max_results: 50
    };

    // ============ УТИЛИТЫ ============
    function bytesToSize(bytes) {
        if (!bytes || isNaN(bytes)) return '';
        var sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    }

    function parseDate(ts) {
        if (!ts) return '';
        var d = new Date(ts * 1000);
        return d.toLocaleDateString('ru-RU');
    }

    function detectQuality(title) {
        title = (title || '').toLowerCase();
        if (/2160|4k|uhd/.test(title)) return '2160p';
        if (/1080/.test(title)) return '1080p';
        if (/720/.test(title)) return '720p';
        if (/480/.test(title)) return '480p';
        return 'SD';
    }

    function detectVoice(title) {
        title = (title || '').toLowerCase();
        if (/дубл|дубляж|dub/.test(title)) return 'Дубляж';
        if (/многоголос|пм|pm/.test(title)) return 'Многоголосый';
        if (/двухголос|лд|ld/.test(title)) return 'Двухголосый';
        if (/авторск|ло|lo/.test(title)) return 'Авторский';
        return '';
    }

    // ============ API ЗАПРОС ============
    function searchTorrents(params, onSuccess, onError) {
        var query = params.title || '';
        if (params.year) query += ' ' + params.year;

        var url = CONFIG.api + '?apikey=&title=' + encodeURIComponent(query);
        if (params.season) url += '&season=' + params.season;

        console.log('[PidTor] search:', url);

        Lampa.Network.silent(url, function (data) {
            var results = [];
            if (data && data.Results) {
                results = data.Results;
            } else if (Array.isArray(data)) {
                results = data;
            }

            // Фильтрация
            results = results.filter(function (item) {
                if (CONFIG.min_sid && (item.Seeders || 0) < CONFIG.min_sid) return false;
                if (CONFIG.quality_filter.length) {
                    var q = detectQuality(item.Title);
                    if (CONFIG.quality_filter.indexOf(q) === -1) return false;
                }
                return true;
            });

            // Сортировка
            results.sort(function (a, b) {
                if (CONFIG.sort === 'size') return (b.Size || 0) - (a.Size || 0);
                if (CONFIG.sort === 'date') return (b.PublishDate || 0) - (a.PublishDate || 0);
                return (b.Seeders || 0) - (a.Seeders || 0);
            });

            results = results.slice(0, CONFIG.max_results);
            onSuccess(results);
        }, function (err) {
            onError(err);
        });
    }

    // ============ TORRSERVER ============
    function getTorserverUrl() {
        var url = Lampa.Storage.get('torrserver_url', '');
        if (!url) return null;
        if (url.indexOf('http') !== 0) url = 'http://' + url;
        return url;
    }

    function addToTorserver(item, movie, callback) {
        var tsUrl = getTorserverUrl();
        if (!tsUrl) {
            Lampa.Noty.show('TorrServer не настроен. Укажите адрес в Настройки → TorrServer');
            return;
        }
        var magnet = item.MagnetUri || item.Link || '';
        if (!magnet) {
            Lampa.Noty.show('Нет magnet-ссылки');
            return;
        }
        var data = {
            title: (movie.title || movie.name || '') + ' / ' + (movie.original_title || ''),
            poster: movie.img || (movie.poster_path ? Lampa.TMDB.image('t/p/w200' + movie.poster_path) : ''),
            link: magnet,
            data: JSON.stringify({ lampa: true, movie: movie })
        };

        Lampa.Network.silent(tsUrl + '/torrents', function () {
            Lampa.Noty.show('Добавлено в TorrServer');
            if (callback) callback();
        }, function () {
            Lampa.Noty.show('Ошибка добавления в TorrServer');
        }, false, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(data)
        });
    }

    function playTorrent(item, movie) {
        var tsUrl = getTorserverUrl();
        if (!tsUrl) {
            Lampa.Noty.show('TorrServer не настроен');
            return;
        }
        var magnet = item.MagnetUri || item.Link || '';
        if (!magnet) {
            Lampa.Noty.show('Нет magnet-ссылки');
            return;
        }
        // Добавляем и открываем через стандартный механизм Lampa
        Lampa.Torrent.start({
            MagnetUri: magnet,
            Title: item.Title,
            Size: item.Size,
            poster: movie.img || (movie.poster_path ? Lampa.TMDB.image('t/p/w200' + movie.poster_path) : '')
        }, movie);
    }

    // ============ КОМПОНЕНТ СПИСКА ТОРРЕНТОВ ============
    function PidTorList(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var html = $('<div></div>');
        var last;
        var results = [];
        var initialized = false;

        this.create = function () {
            return this.render();
        };

        this.initialize = function () {
            var self = this;
            this.activity.loader(true);

            var params = {
                title: object.movie.original_title || object.movie.title || object.search,
                year: object.movie.release_date ? object.movie.release_date.slice(0, 4) : '',
                season: object.season || ''
            };

            searchTorrents(params, function (data) {
                results = data;
                self.build();
                self.activity.loader(false);
                self.activity.toggle();
            }, function (err) {
                self.empty('Ошибка поиска: ' + (err || 'неизвестная'));
            });

            scroll.onEnd = function () {};
            return this.render();
        };

        this.build = function () {
            var self = this;
            if (!results.length) {
                this.empty('По запросу ничего не найдено');
                return;
            }

            var head = $('<div class="torrent-list" style="padding:1em"></div>');
            head.append('<div style="margin-bottom:1em;opacity:0.6">Найдено: ' + results.length + '</div>');

            results.forEach(function (item) {
                var quality = detectQuality(item.Title);
                var voice = detectVoice(item.Title);
                var card = $(
                    '<div class="torrent-item selector" style="margin-bottom:0.8em">' +
                    '<div class="torrent-item__title">' + (item.Title || 'Без названия') + '</div>' +
                    '<div class="torrent-item__details">' +
                    '<div class="torrent-item__seeds">Сиды: <span>' + (item.Seeders || 0) + '</span></div>' +
                    '<div class="torrent-item__grabs">Личи: <span>' + (item.Peers || 0) + '</span></div>' +
                    '<div class="torrent-item__size">' + bytesToSize(item.Size) + '</div>' +
                    '<div>' + quality + '</div>' +
                    (voice ? '<div>' + voice + '</div>' : '') +
                    '<div class="torrent-item__date">' + parseDate(item.PublishDate) + '</div>' +
                    '<div class="torrent-item__tracker">' + (item.Tracker || '') + '</div>' +
                    '</div></div>'
                );

                card.on('hover:focus', function (e) {
                    last = e.target;
                    scroll.update($(e.target), true);
                });

                card.on('hover:enter', function () {
                    self.showActions(item);
                });

                card.on('hover:long', function () {
                    self.showActions(item);
                });

                head.append(card);
            });

            scroll.append(head);
            html.append(scroll.render());
        };

        this.showActions = function (item) {
            var self = this;
            var enabled = Lampa.Controller.enabled().name;
            var menu = [
                { title: '▶ Смотреть (TorrServer)', action: 'play' },
                { title: '＋ Добавить в Мои торренты', action: 'add' },
                { title: '📋 Копировать Magnet', action: 'copy' }
            ];

            Lampa.Select.show({
                title: item.Title || 'Торрент',
                items: menu,
                onSelect: function (a) {
                    if (a.action === 'play') {
                        playTorrent(item, object.movie);
                    } else if (a.action === 'add') {
                        addToTorserver(item, object.movie);
                    } else if (a.action === 'copy') {
                        var magnet = item.MagnetUri || item.Link || '';
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(magnet);
                            Lampa.Noty.show('Magnet скопирован');
                        }
                    }
                    Lampa.Controller.toggle(enabled);
                },
                onBack: function () {
                    Lampa.Controller.toggle(enabled);
                }
            });
        };

        this.empty = function (text) {
            var empty = new Lampa.Empty({ descr: text });
            html.append(empty.render());
            this.start = empty.start.bind(empty);
            this.activity.loader(false);
            this.activity.toggle();
        };

        this.start = function () {
            if (!initialized) {
                initialized = true;
                this.initialize();
            }
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render(), html);
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                up: function () {
                    if (Lampa.Navigator.canmove('up')) Lampa.Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () { Lampa.Navigator.move('down'); },
                right: function () { Lampa.Navigator.move('right'); },
                left: function () {
                    if (Lampa.Navigator.canmove('left')) Lampa.Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () {
            scroll.destroy();
            html.remove();
        };
    }

    // ============ РЕГИСТРАЦИЯ КОМПОНЕНТА ============
    Lampa.Component.add('pidtor', PidTorList);

    // ============ КНОПКА В КАРТОЧКЕ ФИЛЬМА ============
    Lampa.Listener.follow('full', function (e) {
        if (e.type !== 'complite') return;
        if (!e.object || !e.object.activity) return;

        var render = e.object.activity.render();
        if (!render) return;

        // Ищем контейнер кнопок (рядом с Торренты/Трейлеры)
        var container = render.find('.buttons--container');
        if (!container.length) {
            // Пробуем найти в full-start-new__buttons
            container = render.find('.full-start-new__buttons');
        }
        if (!container.length) return;

        // Не добавляем повторно
        if (container.find('.pidtor-btn').length) return;

        var btn = $(
            '<div class="full-start__button selector pidtor-btn">' +
            '<svg viewBox="0 0 47 47" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:1.4em;height:1.4em">' +
            '<path d="M23.4 0.6C10.7 0.6 0.4 10.9 0.4 23.6C0.4 36.3 10.7 46.6 23.4 46.6C36.1 46.6 46.4 36.3 46.4 23.6C46.4 10.9 36.1 0.6 23.4 0.6ZM38.9 29.5C35.8 29.5 34 27.1 34 27.1C34 27.1 32.5 33.6 25.4 33.6C24 33.6 21.8 32.7 21.8 32.7L26 42.4C25.1 42.5 24.3 42.6 23.4 42.6C21.3 42.6 19.2 42.2 17.3 41.5L7.6 15.4C7.6 15.4 6.9 14.2 8 13.9C9.1 13.6 13.4 12.7 13.4 12.7C13.4 12.7 14.9 12.2 15.2 13.2C15.7 14.5 19.3 24.3 19.3 24.3C19.3 24.3 21 27.6 25.8 27.6C30.5 27.6 31.7 24.1 31.5 23.6C30.3 20.6 26.5 11.8 26.5 11.8C26.5 11.8 25.9 10.7 27.3 10.4C28.7 10.1 31.1 9.7 31.1 9.7C31.1 9.7 32.2 9.5 32.7 10.5C33.5 11.9 37.9 21.7 37.9 21.7C37.9 21.7 39 24.6 41.2 24.6C41.7 24.6 42 24.6 42.4 24.5C42.3 26.2 42 27.8 41.5 29.3C40.9 29.4 40.2 29.5 38.9 29.5Z" fill="currentColor"/>' +
            '</svg>' +
            '<span>PidTor</span>' +
            '</div>'
        );

        btn.on('hover:enter', function () {
            var movie = e.object.movie || e.object.card || {};
            Lampa.Activity.push({
                url: '',
                component: 'pidtor',
                title: 'PidTor - ' + (movie.title || movie.name || ''),
                movie: movie,
                search: movie.original_title || movie.title || movie.name || '',
                season: movie.number_of_seasons ? (movie.season || '') : '',
                page: 1
            });
        });

        // Вставляем после кнопки торрентов или в конец
        var torrentBtn = container.find('.view--torrent');
        if (torrentBtn.length) {
            torrentBtn.after(btn);
        } else {
            container.append(btn);
        }

        // Показываем контейнер если скрыт
        container.removeClass('hide');
    });

    // ============ ИНТЕГРАЦИЯ В ПОИСК ============
    // Добавляем источник в поиск Lampa
    if (Lampa.Search && Lampa.Search.addSource) {
        Lampa.Search.addSource({
            title: 'PidTor',
            search: function (params, onComplite) {
                var query = params.query || '';
                searchTorrents({ title: query }, function (results) {
                    if (!results.length) {
                        onComplite([]);
                        return;
                    }
                    var items = results.map(function (item) {
                        return {
                            title: item.Title,
                            subtitle: bytesToSize(item.Size) + ' | Сиды: ' + (item.Seeders || 0) + ' | ' + detectQuality(item.Title),
                            magnet: item.MagnetUri || item.Link || '',
                            tracker: item.Tracker || '',
                            size: item.Size,
                            seeders: item.Seeders || 0
                        };
                    });
                    onComplite([{
                        title: 'PidTor',
                        results: items
                    }]);
                }, function () {
                    onComplite([]);
                });
            },
            onCancel: function () {},
            params: {
                lazy: true
            }
        });
    }

    console.log('[PidTor] Plugin loaded. API: ' + CONFIG.api);
})();
