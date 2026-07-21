(function () {
    'use strict';

    // ==================== КОНФИГУРАЦИЯ ====================
    var CONFIG = {
        name: 'PidTor',
        version: '1.3.0',
        redapi: 'http://jac.red',
        apikey: '',
        min_sid: 1,
        max_size: 0,
        force_quality: '',
        sort: 'sid',
        filter_voice: '',
        filter_ignore: '',
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
            return ('0' + d.getDate()).slice(-2) + '.' +
                   ('0' + (d.getMonth() + 1)).slice(-2) + '.' +
                   d.getFullYear();
        } catch (e) { return dateStr; }
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
        if (/многоголос/.test(title)) return 'Многоголосый';
        if (/двухголос|двуголос/.test(title)) return 'Двухголосый';
        if (/любитель|авторск/.test(title)) return 'Любительский';
        return '';
    }

    function getHDR(title) {
        title = (title || '').toLowerCase();
        if (/hdr10\+/.test(title)) return 'HDR10+';
        if (/hdr10/.test(title)) return 'HDR10';
        if (/dolby\s*vision/.test(title)) return 'DV';
        if (/hdr/.test(title)) return 'HDR';
        return '';
    }

    // ==================== TORRSERVER URL ====================
    // Берём из настроек Lampa, добавляем http:// если нет протокола
    function getTorrsUrl() {
        var useLink = Lampa.Storage.field('torrserver_use_link') || 'one';
        var url = '';

        if (useLink === 'two') {
            url = Lampa.Storage.get('torrserver_url_two', '') || '';
        }
        if (!url) {
            url = Lampa.Storage.get('torrserver_url', '') || '';
        }

        // Фолбэк на конфиг плагина
        if (!url) url = '192.168.10.167:8090';

        // Добавляем протокол если отсутствует
        if (url && url.indexOf('http') !== 0) {
            url = 'http://' + url;
        }

        // Убираем слэш на конце
        url = url.replace(/\/+$/, '');

        return url;
    }

    function getTorrsAuth() {
        var useAuth = Lampa.Storage.field('torrserver_auth');
        if (useAuth) {
            return {
                login: Lampa.Storage.get('torrserver_login', '') || '',
                password: Lampa.Storage.value('torrserver_password') || ''
            };
        }
        return { login: '', password: '' };
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
                    onSuccess(JSON.parse(xhr.responseText));
                } catch (e) {
                    onError('JSON parse error');
                }
            } else {
                onError('HTTP ' + xhr.status);
            }
        };
        xhr.onerror = function () { onError('Network error'); };
        xhr.ontimeout = function () { onError('Timeout'); };
        xhr.send();
    }

    // ==================== ПОИСК ====================
    function searchTorrents(query, params, onSuccess, onError) {
        var searchParams = { query: query };
        if (CONFIG.apikey) searchParams.apikey = CONFIG.apikey;
        if (params && params.season) searchParams.season = params.season;
        if (params && params.year) searchParams.year = params.year;

        apiRequest(CONFIG.redapi + '/api/v2.0/indexers/all/results', searchParams, function (data) {
            var results = data.Results || data.results || [];
            results = filterAndSort(results);
            onSuccess(results);
        }, onError);
    }

    function filterAndSort(results) {
        results = results.filter(function (item) {
            var title = (item.Title || '').toLowerCase();
            var seeds = item.Seeders || 0;
            var size = item.Size || 0;

            if (CONFIG.min_sid > 0 && seeds < CONFIG.min_sid) return false;
            if (CONFIG.max_size > 0 && size / (1024*1024*1024) > CONFIG.max_size) return false;
            if (CONFIG.force_quality) {
                var q = getQualityFromTitle(title);
                if (q && q !== CONFIG.force_quality) return false;
            }
            if (CONFIG.filter_voice) {
                var v = getVoiceFromTitle(title);
                if (v && v !== CONFIG.filter_voice) return false;
            }
            if (CONFIG.filter_ignore) {
                var words = CONFIG.filter_ignore.toLowerCase().split(',');
                for (var i = 0; i < words.length; i++) {
                    if (title.indexOf(words[i].trim()) >= 0) return false;
                }
            }
            return true;
        });

        results.sort(function (a, b) {
            switch (CONFIG.sort) {
                case 'size': return (b.Size||0) - (a.Size||0);
                case 'date': return new Date(b.PublishDate||0) - new Date(a.PublishDate||0);
                case 'name': return (a.Title||'').localeCompare(b.Title||'');
                default: return (b.Seeders||0) - (a.Seeders||0);
            }
        });

        return results;
    }

    // ==================== TORRSERVER ====================
    function addToTorrServer(magnet, title, poster, onSuccess, onError) {
        var tsUrl = getTorrsUrl();
        var auth = getTorrsAuth();
        var xhr = new XMLHttpRequest();

        xhr.open('POST', tsUrl + '/torrents', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.timeout = 10000;

        if (auth.login) {
            xhr.setRequestHeader('Authorization', 'Basic ' + btoa(auth.login + ':' + auth.password));
        }

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try { onSuccess(JSON.parse(xhr.responseText)); }
                catch (e) { onSuccess({}); }
            } else {
                onError('TorrServer HTTP ' + xhr.status);
            }
        };
        xhr.onerror = function () { onError('TorrServer: нет соединения (' + tsUrl + ')'); };
        xhr.ontimeout = function () { onError('TorrServer: таймаут'); };

        xhr.send(JSON.stringify({
            action: 'add',
            link: magnet,
            title: title || '',
            poster: poster || '',
            save_to_db: true
        }));
    }

    function getStreamUrl(hash, fileIndex) {
        var tsUrl = getTorrsUrl();
        var auth = getTorrsAuth();
        var url = tsUrl + '/stream?hash=' + encodeURIComponent(hash);
        if (fileIndex !== undefined) url += '&id=' + fileIndex;
        if (auth.login) {
            url += '&login=' + encodeURIComponent(auth.login);
            url += '&password=' + encodeURIComponent(auth.password);
        }
        return url;
    }

    // ==================== КАРТОЧКА ТОРРЕНТА ====================
    function createTorrentCard(item) {
        var title = item.Title || 'Без названия';
        var size = bytesToSize(item.Size || 0);
        var seeds = item.Seeders || 0;
        var peers = item.Peers || 0;
        var tracker = item.Tracker || '';
        var date = parseDate(item.PublishDate || '');
        var quality = getQualityFromTitle(title);
        var voice = getVoiceFromTitle(title);
        var hdr = getHDR(title);

        var html = '<div class="torrent-item selector layer--visible layer--render">';
        html += '<div class="torrent-item__title">' + Lampa.Utils.shortText(title, 80) + '</div>';
        html += '<div class="torrent-item__details">';
        if (date) html += '<div class="torrent-item__date">' + date + '</div>';
        if (tracker) html += '<div class="torrent-item__tracker">' + tracker + '</div>';
        html += '<div class="torrent-item__seeds">' + Lampa.Lang.translate('torrent_item_seeds') + ': <span>' + seeds + '</span></div>';
        html += '<div class="torrent-item__grabs">' + Lampa.Lang.translate('torrent_item_grabs') + ': <span>' + peers + '</span></div>';
        html += '<div class="torrent-item__size">' + size + '</div>';
        html += '</div>';

        if (quality || hdr || voice) {
            html += '<div class="torrent-item__ffprobe">';
            if (quality) html += '<div class="m-video">' + quality + '</div>';
            if (hdr) html += '<div class="m-video">' + hdr + '</div>';
            if (voice) html += '<div class="m-audio">' + voice + '</div>';
            html += '</div>';
        }

        html += '</div>';
        return $(html);
    }

    // ==================== КОМПОНЕНТ ====================
    function PidTorComponent(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var html = $('<div></div>');
        var results = [];
        var last = null;
        var initialized = false;

        this.create = function () {
            return this.render();
        };

        this.initialize = function () {
            var self = this;
            this.activity.loader(true);

            var movie = object.movie || object.card || {};
            var query = object.search || movie.title || movie.name || '';
            var params = {};

            if (movie.original_name || movie.name) {
                params.season = object.season || 1;
            }
            var rd = movie.release_date || movie.first_air_date || '';
            if (rd) params.year = (rd + '').slice(0, 4);

            searchTorrents(query, params, function (data) {
                results = data;
                self.build();
                Lampa.Layer.update(html);
                self.activity.loader(false);
                self.activity.toggle();
            }, function (err) {
                self.showEmpty('Ошибка поиска: ' + err);
                self.activity.loader(false);
                self.activity.toggle();
            });

            return this.render();
        };

        this.build = function () {
            var self = this;

            if (!results.length) {
                this.showEmpty(Lampa.Lang.translate('torrent_parser_empty'));
                return;
            }

            scroll.body().addClass('torrent-list');

            results.forEach(function (item) {
                var card = createTorrentCard(item);

                card.on('hover:focus', function (e) {
                    last = e.target;
                    scroll.update($(e.target), true);
                });

                card.on('hover:hover hover:touch', function (e) {
                    last = e.target;
                    Lampa.Navigator.focused(last);
                });

                card.on('hover:enter', function () {
                    last = this;
                    self.playTorrent(item);
                });

                card.on('hover:long', function () {
                    self.showMenu(item);
                });

                scroll.append(card);
            });

            html.append(scroll.render());
        };

        this.playTorrent = function (item) {
            var magnet = item.MagnetUri || item.Link || '';
            var title = item.Title || '';
            var movie = object.movie || object.card || {};

            if (!magnet) {
                Lampa.Noty.show('Magnet-ссылка не найдена');
                return;
            }

            Lampa.Noty.show(Lampa.Lang.translate('torrent_get_magnet') + '...');

            addToTorrServer(magnet, title, movie.img || movie.poster || '', function (resp) {
                var hash = resp.hash || item.InfoHash || '';
                if (hash) {
                    var streamUrl = getStreamUrl(hash);
                    Lampa.Player.play({
                        url: streamUrl,
                        title: title,
                        quality: getQualityFromTitle(title) || 'auto'
                    });
                } else {
                    Lampa.Noty.show('Не получен hash от TorrServer');
                }
            }, function (err) {
                Lampa.Noty.show(err);
            });
        };

        this.showMenu = function (item) {
            var enabled = Lampa.Controller.enabled().name;
            var magnet = item.MagnetUri || item.Link || '';

            Lampa.Select.show({
                title: Lampa.Lang.translate('title_action'),
                items: [
                    { title: Lampa.Lang.translate('torrent_parser_add_to_mytorrents'), action: 'add' },
                    { title: Lampa.Lang.translate('copy_link_buffer'), action: 'copy' }
                ],
                onSelect: function (a) {
                    Lampa.Controller.toggle(enabled);
                    if (a.action === 'add') {
                        addToTorrServer(magnet, item.Title, '', function () {
                            Lampa.Noty.show(Lampa.Lang.translate('torrent_parser_added_to_mytorrents'));
                        }, function (err) {
                            Lampa.Noty.show(err);
                        });
                    } else if (a.action === 'copy') {
                        Lampa.Utils.copyTextToClipboard(magnet);
                        Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'));
                    }
                },
                onBack: function () {
                    Lampa.Controller.toggle(enabled);
                }
            });
        };

        this.showEmpty = function (text) {
            var empty = new Lampa.Empty({ descr: text || Lampa.Lang.translate('torrent_parser_empty') });
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
                down: function () { Lampa.Navigator.move('down'); },
                left: function () {
                    if (Lampa.Navigator.canmove('left')) Lampa.Navigator.move('left');
                },
                right: function () {
                    if (Lampa.Navigator.canmove('right')) Lampa.Navigator.move('right');
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
            results = null;
        };
    }

    // ==================== РЕГИСТРАЦИЯ ====================
    function initPlugin() {
        console.log('[PidTor] v' + CONFIG.version + ' init');

        // Загружаем сохранённые настройки
        loadSettings();

        // 1. Регистрируем компонент
        Lampa.Component.add('pidtor', PidTorComponent);

        // 2. Регистрируем как видео-плагин → появится в списке «Смотреть»
        Lampa.Manifest.plugins = {
            type: 'video',
            name: CONFIG.name,
            description: 'Поиск торрентов через JacRed API',
            component: 'pidtor',
            onContextLauch: function (data) {
                Lampa.Activity.push({
                    component: 'pidtor',
                    movie: data,
                    search: data.title || data.name || '',
                    title: CONFIG.name,
                    page: 1
                });
            },
            onContextMenu: function (data) {
                return {
                    name: CONFIG.name,
                    description: 'JacRed: ' + (data.title || data.name || '')
                };
            }
        };

        // 3. Настройки — свой раздел
        Lampa.SettingsApi.addComponent({
            component: 'pidtor',
            icon: '<svg viewBox="0 0 47 47" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.4 0.6C10.7 0.6 0.4 10.9 0.4 23.6C0.4 36.3 10.7 46.6 23.4 46.6C36.1 46.6 46.4 36.3 46.4 23.6C46.4 10.9 36.1 0.6 23.4 0.6ZM38.9 29.5C35.8 29.5 34 27.1 34 27.1C34 27.1 32.5 33.6 25.4 33.6C24 33.6 21.8 32.7 21.8 32.7L26 42.4C25.1 42.5 24.3 42.6 23.4 42.6C21.3 42.6 19.2 42.2 17.3 41.5L7.6 15.4C7.6 15.4 6.9 14.2 8 13.9C9.1 13.6 13.4 12.7 13.4 12.7C13.4 12.7 14.9 12.2 15.2 13.2C15.7 14.5 19.3 24.3 19.3 24.3C19.3 24.3 21 27.6 25.8 27.6C30.5 27.6 31.7 24.1 31.5 23.6C30.3 20.6 26.5 11.8 26.5 11.8C26.5 11.8 25.9 10.7 27.3 10.4C28.7 10.1 31.1 9.7 31.1 9.7C31.1 9.7 32.2 9.5 32.7 10.5C33.5 11.9 37.9 21.7 37.9 21.7C37.9 21.7 39 24.6 41.2 24.6C41.7 24.6 42 24.6 42.4 24.5C42.3 26.2 42 27.8 41.5 29.3C40.9 29.4 40.2 29.5 38.9 29.5Z" fill="currentColor"/></svg>',
            name: CONFIG.name
        });

        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: { name: 'pidtor_redapi', type: 'input', default: CONFIG.redapi },
            field: {
                name: 'Адрес JacRed API',
                description: 'Например: http://jac.red'
            },
            onChange: function (val) {
                CONFIG.redapi = val;
                saveSettings();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: { name: 'pidtor_apikey', type: 'input', default: CONFIG.apikey },
            field: {
                name: 'API ключ JacRed',
                description: 'Если требуется авторизация'
            },
            onChange: function (val) {
                CONFIG.apikey = val;
                saveSettings();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: {
                name: 'pidtor_min_sid',
                type: 'select',
                values: { '0': 'Любое', '1': '1+', '5': '5+', '10': '10+', '50': '50+' },
                default: '1'
            },
            field: { name: 'Минимум сидов' },
            onChange: function (val) {
                CONFIG.min_sid = parseInt(val) || 0;
                saveSettings();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: {
                name: 'pidtor_sort',
                type: 'select',
                values: { 'sid': 'По сидам', 'size': 'По размеру', 'date': 'По дате', 'name': 'По названию' },
                default: 'sid'
            },
            field: { name: 'Сортировка' },
            onChange: function (val) {
                CONFIG.sort = val;
                saveSettings();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: {
                name: 'pidtor_quality',
                type: 'select',
                values: { '': 'Любое', '720p': '720p', '1080p': '1080p', '2160p': '2160p (4K)' },
                default: ''
            },
            field: { name: 'Качество видео' },
            onChange: function (val) {
                CONFIG.force_quality = val;
                saveSettings();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: { name: 'pidtor_filter_voice', type: 'input', default: '' },
            field: {
                name: 'Фильтр озвучки',
                description: 'Дубляж, Многоголосый, и т.д. Пусто = любой'
            },
            onChange: function (val) {
                CONFIG.filter_voice = val;
                saveSettings();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: { name: 'pidtor_filter_ignore', type: 'input', default: '' },
            field: {
                name: 'Игнорировать слова',
                description: 'Через запятую. Например: cam,ts,экранка'
            },
            onChange: function (val) {
                CONFIG.filter_ignore = val;
                saveSettings();
            }
        });

        // Информация о TorrServer (только для чтения)
        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: { type: 'title' },
            field: { name: 'TorrServer' }
        });

        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: { name: 'pidtor_ts_info', type: 'button' },
            field: {
                name: 'TorrServer берётся из настроек Lampa',
                description: 'Раздел: Настройки → TorrServer. Текущий: ' + getTorrsUrl()
            },
            onChange: function () {
                Lampa.Noty.show('TorrServer: ' + getTorrsUrl());
            }
        });

        console.log('[PidTor] Ready. API: ' + CONFIG.redapi + ', TS: ' + getTorrsUrl());
    }

    function saveSettings() {
        Lampa.Storage.set('pidtor_config', JSON.stringify({
            redapi: CONFIG.redapi,
            apikey: CONFIG.apikey,
            min_sid: CONFIG.min_sid,
            max_size: CONFIG.max_size,
            force_quality: CONFIG.force_quality,
            sort: CONFIG.sort,
            filter_voice: CONFIG.filter_voice,
            filter_ignore: CONFIG.filter_ignore
        }));
    }

    function loadSettings() {
        var saved = Lampa.Storage.get('pidtor_config', '');
        if (saved) {
            try {
                var cfg = JSON.parse(saved);
                for (var k in cfg) {
                    if (CONFIG.hasOwnProperty(k)) CONFIG[k] = cfg[k];
                }
            } catch (e) {}
        }
    }

    // ==================== ЗАПУСК ====================
    if (typeof Lampa !== 'undefined') {
        initPlugin();
    } else {
        var checkInterval = setInterval(function () {
            if (typeof Lampa !== 'undefined') {
                clearInterval(checkInterval);
                initPlugin();
            }
        }, 500);
        setTimeout(function () { clearInterval(checkInterval); }, 30000);
    }

})();
