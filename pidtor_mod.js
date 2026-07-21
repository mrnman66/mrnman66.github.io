(function () {
    'use strict';

    // ==================== КОНФИГУРАЦИЯ ====================
    var CONFIG = {
        name: 'PidTor',
        version: '1.2.0',
        description: 'Поиск торрентов через JacRed API',
        // JacRed API
        redapi: 'http://jac.red',
        apikey: '',
        // TorrServer
        torrs: ['192.168.10.167:8090'],
        torrs_auth: { login: '', password: '' },
        // Фильтры
        min_sid: 1,
        max_size: 0,          // 0 = без лимита (в GB)
        force_quality: '',    // '', '720p', '1080p', '2160p'
        sort: 'sid',          // sid, size, date, name
        filter_voice: '',     // '', 'Дубляж', 'Многоголосый', etc.
        filter_ignore: '',    // игнорируемые слова
        // UI
        displayname: 'PidTor',
        group: 'torrents',
        // Кеш (минуты)
        cache_time: 40
    };

    // ==================== УТИЛИТЫ ====================
    function bytesToSize(bytes) {
        if (!bytes || isNaN(bytes)) return '0 B';
        var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    }

    function parseDate(dateStr) {
        if (!dateStr) return '';
        try {
            var d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            var dd = ('0' + d.getDate()).slice(-2);
            var mm = ('0' + (d.getMonth() + 1)).slice(-2);
            var yyyy = d.getFullYear();
            return dd + '.' + mm + '.' + yyyy;
        } catch (e) {
            return dateStr;
        }
    }

    function getQualityFromTitle(title) {
        title = (title || '').toLowerCase();
        if (/2160p|4k|uhd/.test(title)) return '2160p';
        if (/1080p|fullhd/.test(title)) return '1080p';
        if (/720p/.test(title)) return '720p';
        if (/480p|dvd/.test(title)) return '480p';
        return '';
    }

    function getVoiceFromTitle(title) {
        title = (title || '').toLowerCase();
        if (/дубляж|дублирован|dub/.test(title)) return 'Дубляж';
        if (/многоголос|многоголосый/.test(title)) return 'Многоголосый';
        if (/двухголос|двуголос/.test(title)) return 'Двухголосый';
        if (/любитель|авторск/.test(title)) return 'Любительский';
        if (/субтитр|sub/.test(title)) return 'Субтитры';
        return '';
    }

    function getHDR(title) {
        title = (title || '').toLowerCase();
        if (/hdr10\+|hdr10plus/.test(title)) return 'HDR10+';
        if (/hdr10/.test(title)) return 'HDR10';
        if (/hdr/.test(title)) return 'HDR';
        if (/dolby\s*vision/.test(title)) return 'DV';
        return '';
    }

    // ==================== СЕТЬ ====================
    function apiRequest(url, params, onSuccess, onError) {
        var xhr = new XMLHttpRequest();
        var fullUrl = url;

        if (params) {
            var qs = [];
            for (var k in params) {
                if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                    qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
                }
            }
            if (qs.length) fullUrl += '?' + qs.join('&');
        }

        xhr.open('GET', fullUrl, true);
        xhr.timeout = 15000;

        if (CONFIG.apikey) {
            xhr.setRequestHeader('X-Api-Key', CONFIG.apikey);
        }

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    onSuccess(data);
                } catch (e) {
                    onError('JSON parse error: ' + e.message);
                }
            } else {
                onError('HTTP ' + xhr.status);
            }
        };

        xhr.onerror = function () {
            onError('Network error');
        };

        xhr.ontimeout = function () {
            onError('Timeout');
        };

        xhr.send();
    }

    // ==================== ПОИСК ТОРРЕНТОВ ====================
    function searchTorrents(query, params, onSuccess, onError) {
        var searchParams = {
            query: query,
            apikey: CONFIG.apikey || undefined
        };

        if (params) {
            if (params.season) searchParams.season = params.season;
            if (params.year) searchParams.year = params.year;
        }

        var url = CONFIG.redapi + '/api/v2.0/indexers/all/results';

        apiRequest(url, searchParams, function (data) {
            var results = data.Results || data.results || [];
            results = filterAndSort(results);
            onSuccess(results);
        }, onError);
    }

    function filterAndSort(results) {
        // Фильтрация
        results = results.filter(function (item) {
            var title = (item.Title || item.title || '').toLowerCase();

            // Минимум сидов
            if (CONFIG.min_sid > 0 && (item.Seeders || item.seeders || 0) < CONFIG.min_sid) {
                return false;
            }

            // Максимальный размер
            if (CONFIG.max_size > 0) {
                var sizeGB = (item.Size || item.size || 0) / (1024 * 1024 * 1024);
                if (sizeGB > CONFIG.max_size) return false;
            }

            // Качество
            if (CONFIG.force_quality) {
                var q = getQualityFromTitle(title);
                if (q && q !== CONFIG.force_quality) return false;
            }

            // Озвучка
            if (CONFIG.filter_voice) {
                var v = getVoiceFromTitle(title);
                if (v && v !== CONFIG.filter_voice) return false;
            }

            // Игнорируемые слова
            if (CONFIG.filter_ignore) {
                var ignoreWords = CONFIG.filter_ignore.toLowerCase().split(',');
                for (var i = 0; i < ignoreWords.length; i++) {
                    if (title.indexOf(ignoreWords[i].trim()) >= 0) return false;
                }
            }

            return true;
        });

        // Сортировка
        results.sort(function (a, b) {
            switch (CONFIG.sort) {
                case 'size':
                    return (b.Size || b.size || 0) - (a.Size || a.size || 0);
                case 'date':
                    return new Date(b.PublishDate || b.publishDate || 0) - new Date(a.PublishDate || a.publishDate || 0);
                case 'name':
                    return (a.Title || a.title || '').localeCompare(b.Title || b.title || '');
                case 'sid':
                default:
                    return (b.Seeders || b.seeders || 0) - (a.Seeders || a.seeders || 0);
            }
        });

        return results;
    }

    // ==================== TORRSERVER ====================
    function addToTorrServer(magnet, title, poster, onSuccess, onError) {
        var tsUrl = CONFIG.torrs[0];
        var xhr = new XMLHttpRequest();

        xhr.open('POST', tsUrl + '/torrents', true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        if (CONFIG.torrs_auth.login) {
            var auth = btoa(CONFIG.torrs_auth.login + ':' + CONFIG.torrs_auth.password);
            xhr.setRequestHeader('Authorization', 'Basic ' + auth);
        }

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var resp = JSON.parse(xhr.responseText);
                    onSuccess(resp);
                } catch (e) {
                    onSuccess({});
                }
            } else {
                onError('TorrServer HTTP ' + xhr.status);
            }
        };

        xhr.onerror = function () { onError('TorrServer connection error'); };
        xhr.ontimeout = function () { onError('TorrServer timeout'); };
        xhr.timeout = 10000;

        var body = {
            action: 'add',
            link: magnet,
            title: title || '',
            poster: poster || '',
            save_to_db: true
        };

        xhr.send(JSON.stringify(body));
    }

    function getStreamUrl(hash, fileIndex) {
        var tsUrl = CONFIG.torrs[0];
        var url = tsUrl + '/stream?hash=' + encodeURIComponent(hash);
        if (fileIndex !== undefined) url += '&id=' + fileIndex;
        if (CONFIG.torrs_auth.login) {
            url += '&login=' + encodeURIComponent(CONFIG.torrs_auth.login);
            url += '&password=' + encodeURIComponent(CONFIG.torrs_auth.password);
        }
        return url;
    }

    // ==================== UI: КАРТОЧКА ТОРРЕНТА ====================
    function createTorrentCard(item, movie) {
        var title = item.Title || item.title || 'Без названия';
        var size = bytesToSize(item.Size || item.size || 0);
        var seeds = item.Seeders || item.seeders || 0;
        var peers = item.Peers || item.peers || 0;
        var tracker = item.Tracker || item.tracker || '';
        var date = parseDate(item.PublishDate || item.publishDate || '');
        var quality = getQualityFromTitle(title);
        var voice = getVoiceFromTitle(title);
        var hdr = getHDR(title);

        var html = '<div class="torrent-item selector layer--visible layer--render">';
        html += '<div class="torrent-item__title">' + Lampa.Utils.shortText(title, 80) + '</div>';
        html += '<div class="torrent-item__details">';
        if (date) html += '<div class="torrent-item__date">' + date + '</div>';
        if (tracker) html += '<div class="torrent-item__tracker">' + tracker + '</div>';
        html += '<div class="torrent-item__seeds">Сиды: <span>' + seeds + '</span></div>';
        html += '<div class="torrent-item__grabs">Пиры: <span>' + peers + '</span></div>';
        html += '<div class="torrent-item__size">' + size + '</div>';
        html += '</div>';

        // Метки качества
        html += '<div class="torrent-item__tags">';
        if (quality) html += '<span class="tag tag--quality">' + quality + '</span>';
        if (hdr) html += '<span class="tag tag--hdr">' + hdr + '</span>';
        if (voice) html += '<span class="tag tag--voice">' + voice + '</span>';
        html += '</div>';

        html += '</div>';

        var elem = $(html);

        // События
        elem.on('hover:focus', function (e) {
            if (this._onFocus) this._onFocus(e);
        });

        elem.on('hover:enter', function (e) {
            if (this._onEnter) this._onEnter(e);
        });

        elem.on('hover:long', function (e) {
            if (this._onLong) this._onLong(e);
        });

        elem[0]._item = item;
        elem[0]._movie = movie;

        return elem;
    }

    // ==================== КОМПОНЕНТ: СПИСОК ТОРРЕНТОВ ====================
    function PidTorComponent(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var html = $('<div class="pidtor-component"></div>');
        var results = [];
        var last = null;
        var initialized = false;

        this.create = function () {
            return this.render();
        };

        this.initialize = function () {
            var self = this;
            this.activity.loader(true);

            var query = object.search || object.movie.title || '';
            var params = {};

            if (object.movie.original_name) {
                params.season = object.season || 1;
            }
            if (object.movie.release_date) {
                params.year = (object.movie.release_date + '').slice(0, 4);
            }

            searchTorrents(query, params, function (data) {
                results = data;
                self.build();
                self.activity.loader(false);
                self.activity.toggle();
            }, function (err) {
                self.showError('Ошибка поиска: ' + err);
                self.activity.loader(false);
                self.activity.toggle();
            });

            scroll.onEnd = function () {
                // Пагинация если нужна
            };

            return this.render();
        };

        this.build = function () {
            var self = this;

            if (!results.length) {
                this.showEmpty();
                return;
            }

            // Заголовок
            var head = $('<div class="pidtor-head">');
            head.append('<div class="pidtor-head__title">Торренты (' + results.length + ')</div>');
            head.append('<div class="pidtor-head__source">JacRed</div>');
            html.append(head);

            // Список
            results.forEach(function (item) {
                var card = createTorrentCard(item, object.movie);

                card[0]._onFocus = function (e) {
                    last = e.target;
                    scroll.update($(e.target), true);
                };

                card[0]._onEnter = function () {
                    self.playTorrent(item);
                };

                card[0]._onLong = function () {
                    self.showMenu(item, card);
                };

                scroll.append(card);
            });

            html.append(scroll.render());
        };

        this.playTorrent = function (item) {
            var magnet = item.MagnetUri || item.magnet || item.Link || item.link || '';
            var title = item.Title || item.title || '';

            if (!magnet) {
                Lampa.Noty.show('Magnet-ссылка не найдена');
                return;
            }

            Lampa.Noty.show('Добавление в TorrServer...');

            addToTorrServer(magnet, title, object.movie.img || '', function (resp) {
                Lampa.Noty.show('Торрент добавлен. Запуск...');

                var hash = resp.hash || item.InfoHash || item.infohash || '';
                if (hash) {
                    var streamUrl = getStreamUrl(hash);
                    Lampa.Player.play({
                        url: streamUrl,
                        title: title,
                        quality: getQualityFromTitle(title) || 'auto'
                    });
                }
            }, function (err) {
                Lampa.Noty.show('Ошибка TorrServer: ' + err);
            });
        };

        this.showMenu = function (item, cardElem) {
            var self = this;
            var enabled = Lampa.Controller.enabled().name;
            var magnet = item.MagnetUri || item.magnet || item.Link || '';

            var menu = [
                { title: 'Добавить в TorrServer', action: 'add' },
                { title: 'Копировать magnet', action: 'copy' }
            ];

            Lampa.Select.show({
                title: 'Действие',
                items: menu,
                onSelect: function (a) {
                    Lampa.Controller.toggle(enabled);
                    if (a.action === 'add') {
                        addToTorrServer(magnet, item.Title, object.movie.img, function () {
                            Lampa.Noty.show('Добавлено в TorrServer');
                        }, function (err) {
                            Lampa.Noty.show('Ошибка: ' + err);
                        });
                    } else if (a.action === 'copy') {
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(magnet);
                            Lampa.Noty.show('Magnet скопирован');
                        }
                    }
                },
                onBack: function () {
                    Lampa.Controller.toggle(enabled);
                }
            });
        };

        this.showEmpty = function () {
            var empty = new Lampa.Empty({
                descr: 'По запросу ничего не найдено. Попробуйте изменить параметры поиска.'
            });
            html.append(empty.render());
            this.start = empty.start.bind(empty);
        };

        this.showError = function (text) {
            var empty = new Lampa.Empty({
                descr: text
            });
            html.append(empty.render());
            this.start = empty.start.bind(empty);
        };

        this.start = function () {
            if (!initialized) {
                initialized = true;
                this.initialize();
            }

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                up: function () {
                    if (Lampa.Navigator.canmove('up')) Lampa.Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    Lampa.Navigator.move('down');
                },
                left: function () {
                    if (Lampa.Navigator.canmove('left')) Lampa.Navigator.move('left');
                },
                right: function () {
                    if (Lampa.Navigator.canmove('right')) Lampa.Navigator.move('right');
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });

            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            scroll.destroy();
            html.remove();
            results = null;
        };
    }

    // ==================== РЕГИСТРАЦИЯ ПЛАГИНА ====================
    function initPlugin() {
        console.log('[PidTor] Plugin v' + CONFIG.version + ' loaded');

        // Регистрируем компонент
        Lampa.Component.add('pidtor', PidTorComponent);

        // Добавляем кнопку в карточку фильма
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' && e.object && e.object.activity) {
                var render = e.object.activity.render();
                if (!render) return;

                var btn = $('<div class="full-start__button selector button--pidtor">');
                btn.html('<svg viewBox="0 0 47 47" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.4 0.6C10.7 0.6 0.4 10.9 0.4 23.6C0.4 36.3 10.7 46.6 23.4 46.6C36.1 46.6 46.4 36.3 46.4 23.6C46.4 10.9 36.1 0.6 23.4 0.6ZM38.9 29.5C35.8 29.5 34 27.1 34 27.1C34 27.1 32.5 33.6 25.4 33.6C24 33.6 21.8 32.7 21.8 32.7L26 42.4C25.1 42.5 24.3 42.6 23.4 42.6C21.3 42.6 19.2 42.2 17.3 41.5L7.6 15.4C7.6 15.4 6.9 14.2 8 13.9C9.1 13.6 13.4 12.7 13.4 12.7C13.4 12.7 14.9 12.2 15.2 13.2C15.7 14.5 19.3 24.3 19.3 24.3C19.3 24.3 21 27.6 25.8 27.6C30.5 27.6 31.7 24.1 31.5 23.6C30.3 20.6 26.5 11.8 26.5 11.8C26.5 11.8 25.9 10.7 27.3 10.4C28.7 10.1 31.1 9.7 31.1 9.7C31.1 9.7 32.2 9.5 32.7 10.5C33.5 11.9 37.9 21.7 37.9 21.7C37.9 21.7 39 24.6 41.2 24.6C41.7 24.6 42 24.6 42.4 24.5C42.3 26.2 42 27.8 41.5 29.3C40.9 29.4 40.2 29.5 38.9 29.5Z" fill="currentColor"/></svg>');
                btn.append('<span>Торренты</span>');

                btn.on('hover:enter', function () {
                    Lampa.Activity.push({
                        component: 'pidtor',
                        movie: e.object.movie || e.object.card || {},
                        search: (e.object.movie || e.object.card || {}).title || '',
                        title: 'Торренты',
                        page: 1
                    });
                });

                var buttons = render.find('.full-start-new__buttons, .full-start__buttons');
                if (buttons.length) {
                    buttons.append(btn);
                }
            }
        });

        // Настройки плагина
        Lampa.SettingsApi.addParam({
            component: 'plugins',
            param: {
                name: 'pidtor_redapi',
                type: 'input',
                default: CONFIG.redapi
            },
            field: {
                name: 'PidTor: Адрес JacRed API',
                description: 'Например: http://jac.red'
            },
            onChange: function (val) {
                CONFIG.redapi = val;
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'plugins',
            param: {
                name: 'pidtor_apikey',
                type: 'input',
                default: CONFIG.apikey
            },
            field: {
                name: 'PidTor: API ключ',
                description: 'Ключ доступа к JacRed (если требуется)'
            },
            onChange: function (val) {
                CONFIG.apikey = val;
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'plugins',
            param: {
                name: 'pidtor_torrs',
                type: 'input',
                default: CONFIG.torrs[0]
            },
            field: {
                name: 'PidTor: TorrServer URL',
                description: 'Например: http://127.0.0.1:8090'
            },
            onChange: function (val) {
                CONFIG.torrs = [val];
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'plugins',
            param: {
                name: 'pidtor_min_sid',
                type: 'select',
                values: { '0': 'Любое', '1': '1+', '5': '5+', '10': '10+', '50': '50+' },
                default: '1'
            },
            field: {
                name: 'PidTor: Минимум сидов'
            },
            onChange: function (val) {
                CONFIG.min_sid = parseInt(val) || 0;
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'plugins',
            param: {
                name: 'pidtor_sort',
                type: 'select',
                values: {
                    'sid': 'По сидам',
                    'size': 'По размеру',
                    'date': 'По дате',
                    'name': 'По названию'
                },
                default: 'sid'
            },
            field: {
                name: 'PidTor: Сортировка'
            },
            onChange: function (val) {
                CONFIG.sort = val;
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'plugins',
            param: {
                name: 'pidtor_quality',
                type: 'select',
                values: {
                    '': 'Любое',
                    '720p': '720p',
                    '1080p': '1080p',
                    '2160p': '2160p (4K)'
                },
                default: ''
            },
            field: {
                name: 'PidTor: Качество видео'
            },
            onChange: function (val) {
                CONFIG.force_quality = val;
            }
        });

        // Загружаем сохранённые настройки
        var saved = Lampa.Storage.get('pidtor_config', '');
        if (saved) {
            try {
                var cfg = JSON.parse(saved);
                for (var k in cfg) {
                    if (CONFIG.hasOwnProperty(k)) CONFIG[k] = cfg[k];
                }
            } catch (e) {}
        }

        console.log('[PidTor] Initialized. API: ' + CONFIG.redapi);
    }

    // ==================== ЗАПУСК ====================
    if (typeof Lampa !== 'undefined') {
        initPlugin();
    } else {
        // Ожидание загрузки Lampa
        var checkInterval = setInterval(function () {
            if (typeof Lampa !== 'undefined') {
                clearInterval(checkInterval);
                initPlugin();
            }
        }, 500);

        // Таймаут 30 сек
        setTimeout(function () {
            clearInterval(checkInterval);
        }, 30000);
    }

})();
