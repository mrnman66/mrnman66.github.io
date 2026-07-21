(function() {
    "use strict";

    // --- НАСТРОЙКИ ПО УМОЛЧАНИЮ ---
    const DEFAULTS = {
        min_seeders: 5,
        max_size_gb: 50,
        max_serial_size_gb: 10,
        quality_priority: ['4K', '2160p', '1080p', '720p']
    };

    const addedHashes = new Set();

    // Функция для получения актуальных конфигураций
    function getConfig() {
        return {
            jacred_api: Lampa.Storage.cache('jackett_url') || 'https://jacred.xyz',
            torrserver_host: Lampa.Storage.cache('torrserver_url') || 'http://192.168.1.100:8090',
            min_seeders: parseInt(Lampa.Storage.get('plugin_pidtor_min_sid')) || DEFAULTS.min_seeders,
            max_size_gb: parseFloat(Lampa.Storage.get('plugin_pidtor_max_size')) || DEFAULTS.max_size_gb,
            proxy_url: 'https://lampac.club/proxy/'
        };
    }

    async function fetchWithProxy(url) {
        const config = getConfig();
        const targetUrl = encodeURIComponent(url);
        try {
            const response = await fetch(`${config.proxy_url}${targetUrl}`);
            if (!response.ok) throw new Error(`Proxy error: ${response.status}`);
            return await response.json();
        } catch (e) {
            console.log('PidTor Proxy Error:', e);
            return null;
        }
    }

    async function fetchLocal(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`Local error: ${response.status}`);
            return await response.json();
        } catch (e) {
            console.log('PidTor Local Error:', e);
            return null;
        }
    }

    function parseQuality(title) {
        if (/2160p|4K|UHD/i.test(title)) return '4K';
        if (/1080p|FHD/i.test(title)) return '1080p';
        if (/720p|HD/i.test(title)) return '720p';
        return 'SD';
    }

    // --- РЕГИСТРАЦИЯ НАСТРОЕК ЧЕРЕЗ SettingsApi ---
    function registerSettings() {
        // Добавляем компонент в меню настроек
        Lampa.SettingsApi.addComponent({
            component: 'pidtor',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            name: 'PidTor (JacRed)'
        });

        // Параметр: Минимальное количество сидов
        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: {
                type: 'input',
                placeholder: '5'
            },
            field: {
                name: 'Мин. количество сидов',
                value: Lampa.Storage.get('plugin_pidtor_min_sid') || DEFAULTS.min_seeders
            },
            onChange: (val) => {
                Lampa.Storage.set('plugin_pidtor_min_sid', val);
            }
        });

        // Параметр: Максимальный размер файла
        Lampa.SettingsApi.addParam({
            component: 'pidtor',
            param: {
                type: 'input',
                placeholder: '50'
            },
            field: {
                name: 'Макс. размер файла (ГБ)',
                value: Lampa.Storage.get('plugin_pidtor_max_size') || DEFAULTS.max_size_gb
            },
            onChange: (val) => {
                Lampa.Storage.set('plugin_pidtor_max_size', val);
            }
        });
    }

    function startPlugin() {
        // Защита от двойной инициализации
        if (window.pidtor_plugin_initialized) return;
        window.pidtor_plugin_initialized = true;

        registerSettings();

        Lampa.Search.addSource({
            name: 'PidTor (JacRed)',
            check: (object) => object.type === 'movie' || object.type === 'tv',
            
            search: async (object, callback) => {
                const config = getConfig();
                let query = object.title || object.original_title;
                if (!query) return callback([]);

                let yearParam = object.year ? `&Year=${object.year}` : '';
                const searchUrl = `${config.jacred_api}/api/v2.0/indexers/all/results?Query=${encodeURIComponent(query)}${yearParam}&Category=2000,2010,2020,2030,2040,2050`;
                
                const data = await fetchWithProxy(searchUrl);
                if (!data || !data.Results) return callback([]);

                let results = [];
                for (let item of data.Results) {
                    let sizeGb = item.Size / (1024 * 1024 * 1024);
                    let isSerial = object.type === 'tv';
                    
                    if (item.Seeders < config.min_seeders) continue;
                    if (sizeGb > (isSerial ? DEFAULTS.max_serial_size_gb : config.max_size_gb)) continue;

                    results.push({
                        title: item.Title,
                        magnet: item.MagnetUri,
                        size: item.Size,
                        seeders: item.Seeders,
                        quality: parseQuality(item.Title),
                        hash: item.InfoHash,
                        is_serial: isSerial
                    });
                }

                results.sort((a, b) => {
                    let qA = DEFAULTS.quality_priority.indexOf(a.quality);
                    let qB = DEFAULTS.quality_priority.indexOf(b.quality);
                    if (qA !== qB) return qA - qB;
                    return b.seeders - a.seeders;
                });

                callback(results.slice(0, 20));
            },

            select: async (item, callback) => {
                const config = getConfig();
                if (!addedHashes.has(item.hash)) {
                    const tsAddUrl = `${config.torrserver_host}/torrent/add`;
                    await fetchLocal(tsAddUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ link: item.magnet, save_to_db: false })
                    });
                    addedHashes.add(item.hash);
                }

                if (item.is_serial) {
                    const filesUrl = `${config.torrserver_host}/torrent/files/${item.hash}`;
                    const filesData = await fetchLocal(filesUrl);

                    if (filesData && filesData.length > 0) {
                        let videoFiles = filesData.filter(f => f.name.match(/\.(mp4|mkv|avi|mov)$/i));
                        if (videoFiles.length > 0) {
                            Lampa.Select.open({
                                title: 'Выбор серии',
                                items: videoFiles.map(f => ({ title: f.name, value: f.id })),
                                onSelect: (fileId) => {
                                    callback({ url: `${config.torrserver_host}/stream/${item.hash}/${fileId}` });
                                }
                            });
                        }
                    }
                } else {
                    callback({ url: `${config.torrserver_host}/stream/${item.hash}/0` });
                }
            }
        });
    }

    if (typeof Lampa !== 'undefined') {
        startPlugin();
    } else {
        document.addEventListener('lamponload', startPlugin);
    }
})();
