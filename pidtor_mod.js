(function() {
    "use strict";

    // --- НАСТРОЙКИ ПО УМОЛЧАНИЮ (для специфичных параметров) ---
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
            // Берем из глобальных настроек Lampa или используем дефолтные значения
            jacred_api: Lampa.Storage.cache('jackett_url') || 'https://jacred.xyz',
            torrserver_host: Lampa.Storage.cache('torrserver_url') || 'http://192.168.1.100:8090',
            
            // Специфичные настройки плагина
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

    // --- РЕГИСТРАЦИЯ НАСТРОЕК В МЕНЮ LAMPA ---
    function registerSettings() {
        Lampa.Settings.main().add({
            name: 'pidtor_settings',
            title: 'Настройки PidTor',
            template: () => {
                return `
                    <div class="settings-param" data-name="min_sid">
                        <div class="settings-param__name">Мин. количество сидов</div>
                        <div class="settings-param__value">${Lampa.Storage.get('plugin_pidtor_min_sid') || DEFAULTS.min_seeders}</div>
                    </div>
                    <div class="settings-param" data-name="max_size">
                        <div class="settings-param__name">Макс. размер файла (ГБ)</div>
                        <div class="settings-param__value">${Lampa.Storage.get('plugin_pidtor_max_size') || DEFAULTS.max_size_gb}</div>
                    </div>
                `;
            },
            onSelect: (param) => {
                let currentVal = '';
                if (param.name === 'min_sid') currentVal = Lampa.Storage.get('plugin_pidtor_min_sid') || DEFAULTS.min_seeders;
                if (param.name === 'max_size') currentVal = Lampa.Storage.get('plugin_pidtor_max_size') || DEFAULTS.max_size_gb;

                Lampa.Keyboard.primitive({
                    value: String(currentVal),
                    onChange: (val) => {
                        if (param.name === 'min_sid') Lampa.Storage.set('plugin_pidtor_min_sid', val);
                        if (param.name === 'max_size') Lampa.Storage.set('plugin_pidtor_max_size', val);
                        param.querySelector('.settings-param__value').innerText = val;
                    }
                });
            }
        });
    }

    function startPlugin() {
        registerSettings();

        Lampa.Search.addSource({
            name: 'PidTor (JacRed)',
            check: (object) => object.type === 'movie' || object.type === 'tv',
            
            search: async (object, callback) => {
                const config = getConfig();
                let query = object.title || object.original_title;
                if (!query) return callback([]);

                let yearParam = object.year ? `&Year=${object.year}` : '';
                // Используем глобальный jackett_url из настроек Lampa
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
                // Используем глобальный torrserver_url из настроек Lampa
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
