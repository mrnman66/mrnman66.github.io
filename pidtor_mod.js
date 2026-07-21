(function () {
    'use strict';

    // ===== КОНФИГУРАЦИЯ =====
    var CONFIG = {
        name: 'JacRed',
        version: '1.2.0',
        api_url: 'https://jacred.xyz',
        api_key: '',
        torrserver_url: '192.168.10.167:8090',
        torrserver_auth: false,
        torrserver_login: '',
        torrserver_password: '',
        min_sid: 1,
        max_size: 0, // 0 = без лимита (в байтах)
        sort: 'sid', // sid, size, date
        filter_quality: '', // '', '720p', '1080p', '2160p'
        filter_voice: '',
        cache_time: 40 * 60 * 1000 // 40 минут
    };

    // ===== УТИЛИТЫ =====
    function bytesToSize(bytes) {
        if (bytes === 0) return '0 Б';
        var sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    }

    function formatDate(dateStr) {
        if (!dateStr || dateStr === '2000-01-01') return '';
        try {
            var d = new Date(dateStr);
            return d.toLocaleDateString('ru-RU');
        } catch (e) {
            return dateStr;
        }
    }

    function parseSize(sizeStr) {
        if (!sizeStr) return 0;
        if (typeof sizeStr === 'number') return sizeStr;
        var match = sizeStr.match(/([\d.]+)\s*(TB|GB|MB|KB|B|ТБ|ГБ|МБ|КБ)/i);
        if (!match) return parseInt(sizeStr) || 0;
        var val = parseFloat(match[1]);
        var unit = match[2].toUpperCase();
        var multipliers = { 'B': 1, 'Б': 1, 'KB': 1024, 'КБ': 1024, 'MB': 1048576, 'МБ': 1048576, 'GB': 1073741824, 'ГБ': 1073741824, 'TB': 1099511627776, 'ТБ': 1099511627776 };
        return Math.round(val * (multipliers[unit] || 1));
    }

    function detectQuality(title) {
        title = title.toLowerCase();
        if (/2160p|4k|uhd|ultra\s*hd/.test(title)) return '2160p';
        if (/1080p|full\s*hd|fullhd/.test(title)) return '1080p';
        if (/720p/.test(title)) return '720p';
        if (/480p|dvd/.test(title)) return '480p';
        return '';
    }

    function detectVoice(title) {
        title = title.toLowerCase();
        if (/дубляж|дублирован|dub/.test(title)) return 'Дубляж';
        if (/многоголос|пм|лм/.test(title)) return 'Многоголосый';
        if (/двухголос|двуголос|лд|пд/.test(title)) return 'Двухголосый';
        if (/авторск|одноголос|ло|ап/.test(title)) return 'Авторский';
        return '';
    }

    function detectHDR(title) {
        title = title.toLowerCase();
        if (/hdr10\+|hdr10plus/.test(title)) return 'HDR10+';
        if (/dolby\s*vision|dv/.test(title)) return 'Dolby Vision';
        if (/hdr/.test(title)) return 'HDR';
        return '';
    }

    // ===== КЕШ =====
    var cache = {};

    function cacheGet(key) {
        var item = cache[key];
        if (item && Date.now() - item.time < CONFIG.cache_time) {
            return item.data;
        }
        delete cache[key];
        return null;
    }

    function cacheSet(key, data) {
        cache[key] = { data: data, time: Date.now() };
    }

    // ===== API ЗАПРОСЫ =====
    function apiSearch(params, onSuccess, onError) {
        var cacheKey = JSON.stringify(params);
        var cached = cacheGet(cacheKey);
        if (cached) {
            onSuccess(cached);
            return;
        }

        var url = CONFIG.api_url + '/api/v2.0/indexers/all/results';
        var queryParams = [];

        if (params.query) queryParams.push('query=' + encodeURIComponent(params.query));
        if (params.title) queryParams.push('title=' + encodeURIComponent(params.title));
        if (params.original_title) queryParams.push('original_title=' + encodeURIComponent(params.original_title));
        if (params.year) queryParams.push('year=' + params.year);
        if (params.season) queryParams.push('season=' + params.season);
        if (params.is_serial) queryParams.push('is_serial=true');
        if (CONFIG.api_key) queryParams.push('apikey=' + CONFIG.api_key);

        if (queryParams.length) url += '?' + queryParams.join('&');

        Lampa.Network.timeout(15000);
        Lampa.Network.silent(url, function (data) {
            var results = parseResults(data);
            cacheSet(cacheKey, results);
            onSuccess(results);
        }, function (error) {
            onError(error);
        });
    }

    function parseResults(data) {
        var results = [];
        var items = data.Results || data.results || data || [];

        if (!Array.isArray(items)) return results;

        items.forEach(function (item) {
            var title = item.Title || item.title || item.name || '';
            var size = parseSize(item.Size || item.size || 0);
            var seeders = parseInt(item.Seeders || item.seeders || item.seed || 0);
            var peers = parseInt(item.Peers || item.peers || item.leech || 0);
            var magnet = item.MagnetUri || item.magnet || item.infohash || '';
            var tracker = item.Tracker || item.tracker || item.source || 'JacRed';
            var date = item.PublishDate || item.date || item.publish_date || '';
            var link = item.Link || item.link || item.download || '';

            if (!title) return;
            if (seeders < CONFIG.min_sid) return;
            if (CONFIG.max_size > 0 && size > CONFIG.max_size) return;

            var quality = detectQuality(title);
            if (CONFIG.filter_quality && quality !== CONFIG.filter_quality) return;

            results.push({
                Title: title,
                Size: size,
                size: bytesToSize(size),
                Seeders: seeders,
                Peers: peers,
                MagnetUri: magnet,
                Link: link,
                Tracker: tracker,
                PublishDate: date,
                date: formatDate(date),
                quality: quality,
                voice: detectVoice(title),
                hdr: detectHDR(title),
                hash: magnet.replace('magnet:?xt=urn:btih:', '').split('&')[0] || Lampa.Utils.hash(title + size)
            });
        });

        return sortResults(results);
    }

    function sortResults(results) {
        var sort = CONFIG.sort;
        results.sort(function (a, b) {
            if (sort === 'size') return b.Size - a.Size;
            if (sort === 'date') return new Date(b.PublishDate) - new Date(a.PublishDate);
            return b.Seeders - a.Seeders; // по умолчанию по сидам
        });
        return results;
    }

    // ===== TORRSERVER =====
    function torrserverAdd(magnet, title, poster, onSuccess, onError) {
        var url = CONFIG.torrserver_url + '/torrents';
        var data = {
            action: 'add',
            link: magnet,
            title: title,
            poster: poster || '',
            save_to_db: true
        };

        var headers = { 'Content-Type': 'application/json' };
        if (CONFIG.torrserver_auth) {
            headers['Authorization'] = 'Basic ' + btoa(CONFIG.torrserver_login + ':' + CONFIG.torrserver_password);
        }

        $.ajax({
            url: url,
            type: 'POST',
            data: JSON.stringify(data),
            headers: headers,
            timeout: 15000,
            success: function (res) {
                if (onSuccess) onSuccess(res);
            },
            error: function (err) {
                if (onError) onError(err);
            }
        });
    }

    function torrserverStream(hash, fileIndex, onSuccess, onError) {
        var url = CONFIG.torrserver_url + '/stream?hash=' + hash;
        if (fileIndex !== undefined) url += '&id=' + fileIndex;

        var headers = {};
        if (CONFIG.torrserver_auth) {
            headers['Authorization'] = 'Basic ' + btoa(CONFIG.torrserver_login + ':' + CONFIG.torrserver_password);
        }

        $.ajax({
            url: url,
            type: 'GET',
            headers: headers,
            timeout: 30000,
            success: function (res) {
                if (onSuccess) onSuccess(res);
            },
            error: function (err) {
                if (onError) onError(err);
            }
        });
    }

    // ===== КОМПОНЕНТ ПОИСКА =====
    function JacRedSearch(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var html = $('<div class="jacred-search"></div>');
        var results = [];
        var filtred = [];
        var last = null;
        var filter_data = {
            quality: '',
            voice: '',
            tracker: '',
            sort: CONFIG.sort
        };

        this.create = function () {
            return this.render();
        };

        this.initialize = function () {
            this.activity.loader(true);
            this.search();
            return this.render();
        };

        this.search = function () {
            var self = this;
            var params = {
                title: object.movie.title || object.search || '',
                original_title: object.movie.original_title || '',
                year: object.movie.release_date ? object.movie.release_date.slice(0, 4) : '',
                is_serial: Boolean(object.movie.original_name || object.movie.name),
                season: object.season || ''
            };

            apiSearch(params, function (data) {
                results = data;
                filtred = data;
                self.build();
                self.activity.loader(false);
                self.activity.toggle();
            }, function (error) {
                self.empty('Ошибка поиска: ' + (error.message || 'неизвестная ошибка'));
                self.activity.loader(false);
                self.activity.toggle();
            });
        };

        this.build = function () {
            var self = this;
            scroll.clear();
            scroll.reset();

            if (!filtred.length) {
                this.empty('По вашему запросу ничего не найдено.');
                return;
            }

            // Панель фильтров
            var filterPanel = this.buildFilterPanel();
            scroll.append(filterPanel);

            // Результаты
            filtred.forEach(function (item, index) {
                var card = self.createCard(item, index);
                scroll.append(card);
            });

            html.empty().append(scroll.render());
        };

        this.buildFilterPanel = function () {
            var self = this;
            var panel = $('<div class="jacred-filters" style="display:flex;gap:10px;padding:10px 0;flex-wrap:wrap;"></div>');

            // Сортировка
            var sortBtn = $('<div class="simple-button selector" style="padding:8px 16px;">Сортировка: ' + this.getSortLabel() + '</div>');
            sortBtn.on('hover:enter', function () {
                self.showSortSelect();
            });
            panel.append(sortBtn);

            // Качество
            var qualBtn = $('<div class="simple-button selector" style="padding:8px 16px;">Качество: ' + (filter_data.quality || 'Любое') + '</div>');
            qualBtn.on('hover:enter', function () {
                self.showQualitySelect();
            });
            panel.append(qualBtn);

            // Озвучка
            var voiceBtn = $('<div class="simple-button selector" style="padding:8px 16px;">Озвучка: ' + (filter_data.voice || 'Любая') + '</div>');
            voiceBtn.on('hover:enter', function () {
                self.showVoiceSelect();
            });
            panel.append(voiceBtn);

            return panel;
        };

        this.getSortLabel = function () {
            var labels = { sid: 'По сидам', size: 'По размеру', date: 'По дате' };
            return labels[filter_data.sort] || 'По сидам';
        };

        this.showSortSelect = function () {
            var self = this;
            Lampa.Select.show({
                title: 'Сортировка',
                items: [
                    { title: 'По сидам', value: 'sid', selected: filter_data.sort === 'sid' },
                    { title: 'По размеру', value: 'size', selected: filter_data.sort === 'size' },
                    { title: 'По дате', value: 'date', selected: filter_data.sort === 'date' }
                ],
                onSelect: function (a) {
                    filter_data.sort = a.value;
                    CONFIG.sort = a.value;
                    self.applyFilters();
                    Lampa.Controller.toggle('content');
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        };

        this.showQualitySelect = function () {
            var self = this;
            Lampa.Select.show({
                title: 'Качество',
                items: [
                    { title: 'Любое', value: '', selected: !filter_data.quality },
                    { title: '2160p (4K)', value: '2160p', selected: filter_data.quality === '2160p' },
                    { title: '1080p', value: '1080p', selected: filter_data.quality === '1080p' },
                    { title: '720p', value: '720p', selected: filter_data.quality === '720p' }
                ],
                onSelect: function (a) {
                    filter_data.quality = a.value;
                    self.applyFilters();
                    Lampa.Controller.toggle('content');
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        };

        this.showVoiceSelect = function () {
            var self = this;
            Lampa.Select.show({
                title: 'Озвучка',
                items: [
                    { title: 'Любая', value: '', selected: !filter_data.voice },
                    { title: 'Дубляж', value: 'Дубляж', selected: filter_data.voice === 'Дубляж' },
                    { title: 'Многоголосый', value: 'Многоголосый', selected: filter_data.voice === 'Многоголосый' },
                    { title: 'Двухголосый', value: 'Двухголосый', selected: filter_data.voice === 'Двухголосый' },
                    { title: 'Авторский', value: 'Авторский', selected: filter_data.voice === 'Авторский' }
                ],
                onSelect: function (a) {
                    filter_data.voice = a.value;
                    self.applyFilters();
                    Lampa.Controller.toggle('content');
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        };

        this.applyFilters = function () {
            filtred = results.filter(function (item) {
                if (filter_data.quality && item.quality !== filter_data.quality) return false;
                if (filter_data.voice && item.voice !== filter_data.voice) return false;
                return true;
            });
            filtred = sortResults(filtred);
            this.build();
            Lampa.Layer.update(html);
        };

        this.createCard = function (item, index) {
            var self = this;
            var card = $(
                '<div class="torrent-item selector layer--visible layer--render" style="padding:15px;margin-bottom:8px;">' +
                '<div class="torrent-item__title" style="font-size:1.1em;margin-bottom:8px;">' + Lampa.Utils.shortText(item.Title, 100) + '</div>' +
                '<div class="torrent-item__details" style="display:flex;gap:15px;flex-wrap:wrap;font-size:0.85em;opacity:0.7;">' +
                (item.date ? '<div class="torrent-item__date">' + item.date + '</div>' : '') +
                '<div class="torrent-item__tracker">' + item.Tracker + '</div>' +
                '<div>Раздают: <span style="color:#4caf50;">' + item.Seeders + '</span></div>' +
                '<div>Качают: <span style="color:#ff9800;">' + item.Peers + '</span></div>' +
                '<div class="torrent-item__size" style="font-weight:bold;">' + item.size + '</div>' +
                (item.quality ? '<div style="color:#2196f3;">' + item.quality + '</div>' : '') +
                (item.hdr ? '<div style="color:#9c27b0;">' + item.hdr + '</div>' : '') +
                (item.voice ? '<div style="color:#ffeb3b;">' + item.voice + '</div>' : '') +
                '</div>' +
                '</div>'
            );

            card.on('hover:focus', function (e) {
                last = e.target;
                scroll.update($(e.target), true);
            });

            card.on('hover:hover hover:touch', function (e) {
                last = e.target;
                Lampa.Navigator.focused(last);
            });

            card.on('hover:enter', function () {
                self.playTorrent(item);
            });

            card.on('hover:long', function () {
                self.showContextMenu(item, card);
            });

            return card;
        };

        this.playTorrent = function (item) {
            var self = this;
            var magnet = item.MagnetUri;

            if (!magnet && item.hash) {
                magnet = 'magnet:?xt=urn:btih:' + item.hash;
            }

            if (!magnet) {
                Lampa.Noty.show('Ошибка: magnet-ссылка не найдена');
                return;
            }

            Lampa.Noty.show('Добавление в TorrServer...');

            torrserverAdd(
                magnet,
                object.movie.title || item.Title,
                object.movie.img || object.movie.poster || '',
                function (res) {
                    Lampa.Noty.show('Торрент добавлен. Запуск воспроизведения...');
                    setTimeout(function () {
                        torrserverStream(item.hash, undefined, function (streamData) {
                            if (streamData && streamData.url) {
                                Lampa.Player.play({
                                    url: streamData.url,
                                    title: item.Title,
                                    type: 'torrent'
                                });
                            } else {
                                Lampa.Noty.show('Ошибка получения потока');
                            }
                        }, function () {
                            Lampa.Noty.show('Ошибка подключения к TorrServer');
                        });
                    }, 2000);
                },
                function () {
                    Lampa.Noty.show('Ошибка добавления торрента в TorrServer');
                }
            );
        };

        this.showContextMenu = function (item, card) {
            var self = this;
            var enabled = Lampa.Controller.enabled().name;

            Lampa.Select.show({
                title: 'Действие',
                items: [
                    { title: 'Воспроизвести', action: 'play' },
                    { title: 'Добавить в Мои торренты', action: 'add' },
                    { title: 'Копировать magnet', action: 'copy' }
                ],
                onSelect: function (a) {
                    Lampa.Controller.toggle(enabled);
                    if (a.action === 'play') {
                        self.playTorrent(item);
                    } else if (a.action === 'add') {
                        var magnet = item.MagnetUri || ('magnet:?xt=urn:btih:' + item.hash);
                        torrserverAdd(magnet, item.Title, '', function () {
                            Lampa.Noty.show('Добавлено в Мои торренты');
                        }, function () {
                            Lampa.Noty.show('Ошибка добавления');
                        });
                    } else if (a.action === 'copy') {
                        var magnetLink = item.MagnetUri || ('magnet:?xt=urn:btih:' + item.hash);
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(magnetLink);
                            Lampa.Noty.show('Magnet скопирован');
                        } else {
                            Lampa.Noty.show(magnetLink);
                        }
                    }
                },
                onBack: function () {
                    Lampa.Controller.toggle(enabled);
                }
            });
        };

        this.empty = function (text) {
            var empty = new Lampa.Empty({ descr: text });
            html.empty().append(empty.render());
            this.start = empty.start.bind(empty);
        };

        this.start = function () {
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
                    else Lampa.Controller.toggle('menu');
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
            filtred = null;
        };
    }

    // ===== РЕГИСТРАЦИЯ ПЛАГИНА =====
    function init() {
        // Загрузка сохранённых настроек
        loadSettings();

        // Регистрация компонента
        Lampa.Component.add('jacred_search', JacRedSearch);

        // Добавление в меню торрентов
        Lampa.Listener.follow('torrent', function (e) {
            if (e.type === 'onenter' && e.element && e.element.jacred) {
                // Обработка элементов из JacRed
            }
        });

        // Добавление пункта в настройки
        addSettings();

        // Добавление источника в поиск торрентов
        addTorrentSource();

        console.log('JacRed Plugin v' + CONFIG.version + ' initialized');
    }

    function loadSettings() {
        var saved = Lampa.Storage.get('jacred_settings', '{}');
        if (saved && typeof saved === 'object') {
            for (var key in saved) {
                if (CONFIG.hasOwnProperty(key)) {
                    CONFIG[key] = saved[key];
                }
            }
        }
    }

    function saveSettings() {
        Lampa.Storage.set('jacred_settings', CONFIG);
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'jacred',
            icon: '<svg width="37" height="37" viewBox="0 0 37 37" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="33" height="33" rx="4" stroke="white" stroke-width="3"/><path d="M10 18h17M18 10v17" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>',
            name: 'JacRed'
        });

        Lampa.SettingsApi.addParam({
            component: 'jacred',
            param: { name: 'jacred_api_url', type: 'input', default: CONFIG.api_url },
            field: { name: 'Адрес API', description: 'URL JacRed сервера' },
            onChange: function (val) { CONFIG.api_url = val; saveSettings(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'jacred',
            param: { name: 'jacred_api_key', type: 'input', default: CONFIG.api_key },
            field: { name: 'API ключ', description: 'Ключ доступа (если требуется)' },
            onChange: function (val) { CONFIG.api_key = val; saveSettings(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'jacred',
            param: { name: 'jacred_ts_url', type: 'input', default: CONFIG.torrserver_url },
            field: { name: 'TorrServer URL', description: 'Адрес TorrServer для стриминга' },
            onChange: function (val) { CONFIG.torrserver_url = val; saveSettings(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'jacred',
            param: { name: 'jacred_min_sid', type: 'select', values: { '0': 'Любое', '1': '1+', '3': '3+', '5': '5+', '10': '10+' }, default: String(CONFIG.min_sid) },
            field: { name: 'Минимум сидов' },
            onChange: function (val) { CONFIG.min_sid = parseInt(val); saveSettings(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'jacred',
            param: { name: 'jacred_sort', type: 'select', values: { 'sid': 'По сидам', 'size': 'По размеру', 'date': 'По дате' }, default: CONFIG.sort },
            field: { name: 'Сортировка по умолчанию' },
            onChange: function (val) { CONFIG.sort = val; saveSettings(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'jacred',
            param: { name: 'jacred_quality', type: 'select', values: { '': 'Любое', '720p': '720p', '1080p': '1080p', '2160p': '2160p (4K)' }, default: CONFIG.filter_quality },
            field: { name: 'Фильтр качества' },
            onChange: function (val) { CONFIG.filter_quality = val; saveSettings(); }
        });
    }

    function addTorrentSource() {
        // Интеграция с системой парсеров Lampa
        if (Lampa.Parser && Lampa.Parser.addSource) {
            Lampa.Parser.addSource({
                name: 'JacRed',
                search: function (params, onResults, onError) {
                    apiSearch(params, function (results) {
                        results.forEach(function (r) { r.jacred = true; });
                        onResults(results);
                    }, onError);
                }
            });
        }

        // Добавление кнопки в карточку фильма
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' && e.object) {
                var btn = $('<div class="full-start__button selector button--jacred" style="margin-top:10px;">' +
                    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2"/><path d="M6 10h8M10 6v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
                    '<span>JacRed</span></div>');

                btn.on('hover:enter', function () {
                    Lampa.Activity.push({
                        component: 'jacred_search',
                        movie: e.object.card || e.object.movie || {},
                        search: (e.object.card || e.object.movie || {}).title || '',
                        title: 'JacRed - ' + ((e.object.card || e.object.movie || {}).title || 'Поиск')
                    });
                });

                var buttonsContainer = e.object.activity.render().find('.full-start-new__buttons');
                if (buttonsContainer.length) {
                    buttonsContainer.append(btn);
                }
            }
        });
    }

    // ===== ЗАПУСК =====
    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
