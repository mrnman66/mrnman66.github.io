(function () {
    'use strict';

    if (window.pidtor_plugin_initialized) return;
    window.pidtor_plugin_initialized = true;

    // --- Инициализация значений по умолчанию через Storage.field ---
    Lampa.Storage.field('plugin_pidtor_min_sid', 5);
    Lampa.Storage.field('plugin_pidtor_max_size', 50);

    var addedHashes = {};

    function getConfig() {
        var ts = Lampa.Storage.cache('torrserver_url', 0, '') || Lampa.Storage.get('torrserver_url', '');
        if (ts && ts.indexOf('://') === -1) ts = 'http://' + ts;

        var jr = Lampa.Storage.cache('jackett_url', 0, '') || Lampa.Storage.get('jackett_url', '');
        if (jr && jr.indexOf('://') === -1) jr = 'https://' + jr;
        if (!jr) jr = 'https://jacred.xyz';

        return {
            jacred_api: jr,
            torrserver_host: ts || 'http://192.168.10.167:8090',
            min_seeders: parseInt(Lampa.Storage.get('plugin_pidtor_min_sid', 5)) || 5,
            max_size_gb: parseFloat(Lampa.Storage.get('plugin_pidtor_max_size', 50)) || 50,
            proxy_url: 'https://lampac.club/proxy/'
        };
    }

    // ВСЕ запросы через прокси (jacred.xyz в blacklist Lampa!)
    function fetchJson(url, options, callback) {
        var config = getConfig();
        var targetUrl = config.proxy_url + encodeURIComponent(url);

        var xhr = new XMLHttpRequest();
        xhr.open(options && options.method ? options.method : 'GET', targetUrl, true);

        if (options && options.headers) {
            for (var key in options.headers) {
                xhr.setRequestHeader(key, options.headers[key]);
            }
        }

        xhr.onload = function () {
            try {
                callback(JSON.parse(xhr.responseText));
            } catch (e) {
                callback(null);
            }
        };
        xhr.onerror = function () { callback(null); };
        xhr.ontimeout = function () { callback(null); };
        xhr.timeout = 15000;

        if (options && options.body) {
            xhr.send(options.body);
        } else {
            xhr.send();
        }
    }

    function parseQuality(title) {
        if (!title) return 'SD';
        if (/2160p|4K|UHD/i.test(title)) return '4K';
        if (/1080p|FHD/i.test(title)) return '1080p';
        if (/720p|HD/i.test(title)) return '720p';
        return 'SD';
    }

    // --- НАСТРОЙКИ (формат как в backup-плагине, БЕЗ value в field) ---
    function registerSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'pidtor',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2"/><path d="M2 17L12 22L22 17" stroke="white" stroke-width="2"/><path d="M2 12L12 17L22 12" stroke="white" stroke-width="2"/></svg>',
            name: 'PidTor (JacRed)'
        });

        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: {
                type: 'button'
            },
            field: {
                name: 'Мин. сидов: ' + Lampa.Storage.get('plugin_pidtor_min_sid', 5)
            },
            onChange: function () {
                var current = Lampa.Storage.get('plugin_pidtor_min_sid', 5);
                Lampa.Input.open({
                    value: String(current),
                    onChange: function (val) {
                        var num = parseInt(val);
                        if (!isNaN(num) && num >= 0) {
                            Lampa.Storage.set('plugin_pidtor_min_sid', num);
                        }
                    }
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: {
                type: 'button'
            },
            field: {
                name: 'Макс. размер (ГБ): ' + Lampa.Storage.get('plugin_pidtor_max_size', 50)
            },
            onChange: function () {
                var current = Lampa.Storage.get('plugin_pidtor_max_size', 50);
                Lampa.Input.open({
                    value: String(current),
                    onChange: function (val) {
                        var num = parseFloat(val);
                        if (!isNaN(num) && num > 0) {
                            Lampa.Storage.set('plugin_pidtor_max_size', num);
                        }
                    }
                });
            }
        });
    }

    // --- ПОИСК ---
    function startPlugin() {
        registerSettings();

        Lampa.Search.addSource({
            name: 'PidTor (JacRed)',
            check: function (object) {
                return object.type === 'movie' || object.type === 'tv';
            },
            search: function (object, callback) {
                var config = getConfig();
                var query = object.title || object.original_title || '';
                if (!query) return callback([]);

                var yearParam = object.year ? '&Year=' + object.year : '';
                var searchUrl = config.jacred_api +
                    '/api/v2.0/indexers/all/results?Query=' +
                    encodeURIComponent(query) + yearParam +
                    '&Category=2000,2010,2020,2030,2040,2050';

                fetchJson(searchUrl, null, function (data) {
                    if (!data || !data.Results) return callback([]);

                    var results = [];
                    var isSerial = object.type === 'tv';

                    for (var i = 0; i < data.Results.length; i++) {
                        var item = data.Results[i];
                        if (!item.Title || !item.MagnetUri || !item.InfoHash) continue;

                        var sizeGb = (item.Size || 0) / (1024 * 1024 * 1024);
                        if ((item.Seeders || 0) < config.min_seeders) continue;
                        if (sizeGb > (isSerial ? 10 : config.max_size_gb)) continue;

                        results.push({
                            title: item.Title,
                            original_title: item.Title,
                            magnet: item.MagnetUri,
                            size: item.Size || 0,
                            seeders: item.Seeders || 0,
                            quality: parseQuality(item.Title),
                            hash: item.InfoHash,
                            is_serial: isSerial,
                            poster: '',
                            rating: 0
                        });
                    }

                    var priority = ['4K', '2160p', '1080p', '720p', 'SD'];
                    results.sort(function (a, b) {
                        var qA = priority.indexOf(a.quality);
                        var qB = priority.indexOf(b.quality);
                        if (qA !== qB) return qA - qB;
                        return b.seeders - a.seeders;
                    });

                    callback(results.slice(0, 20));
                });
            },

            select: function (item, callback) {
                var config = getConfig();

                if (!addedHashes[item.hash]) {
                    var tsAddUrl = config.torrserver_host + '/torrent/add';
                    fetchJson(tsAddUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ link: item.magnet, save_to_db: false })
                    }, function () {
                        addedHashes[item.hash] = true;
                        proceedSelect(item, config, callback);
                    });
                } else {
                    proceedSelect(item, config, callback);
                }
            }
        });
    }

    function proceedSelect(item, config, callback) {
        if (item.is_serial) {
            var filesUrl = config.torrserver_host + '/torrent/files/' + item.hash;
            fetchJson(filesUrl, null, function (filesData) {
                if (filesData && filesData.length && filesData.length > 0) {
                    var videoFiles = [];
                    for (var i = 0; i < filesData.length; i++) {
                        var f = filesData[i];
                        if (f.name && /\.(mp4|mkv|avi|mov)$/i.test(f.name)) {
                            videoFiles.push(f);
                        }
                    }

                    if (videoFiles.length > 0) {
                        var items = [];
                        for (var j = 0; j < videoFiles.length; j++) {
                            items.push({
                                title: videoFiles[j].name,
                                value: videoFiles[j].id
                            });
                        }

                        Lampa.Select.open({
                            title: 'Выбор серии',
                            items: items,
                            onSelect: function (fileId) {
                                callback({
                                    url: config.torrserver_host + '/stream/' + item.hash + '/' + fileId
                                });
                            }
                        });
                    } else {
                        Lampa.Noty.show('Нет видеофайлов в торренте');
                    }
                } else {
                    callback({
                        url: config.torrserver_host + '/stream/' + item.hash + '/0'
                    });
                }
            });
        } else {
            callback({
                url: config.torrserver_host + '/stream/' + item.hash + '/0'
            });
        }
    }

    if (typeof Lampa !== 'undefined') {
        startPlugin();
    } else {
        document.addEventListener('lamponload', startPlugin);
    }
})();
