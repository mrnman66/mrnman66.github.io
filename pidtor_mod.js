(function() {
    "use strict";

    // --- НАСТРОЙКИ ПЛАГИНА ---
    const CONFIG = {
        jacred_api: 'https://jacred.xyz', 
        torrserver_host: 'http://192.168.10.167:8090/', // ЗАМЕНИТЕ на IP вашего TorrServer
        proxy_url: 'https://lampac.club/proxy/',       // Прокси только для JacRed (обход CORS)
        
        // Фильтры качества и размера
        min_seeders: 5,
        max_size_gb: 50,
        max_serial_size_gb: 10, // Ограничение размера для серий, чтобы не качать полные сезоны сразу
        quality_priority: ['4K', '2160p', '1080p', '720p']
    };

    // Хранилище добавленных хэшей, чтобы не дублировать запросы к TS
    const addedHashes = new Set();

    // --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

    async function fetchWithProxy(url) {
        const targetUrl = encodeURIComponent(url);
        try {
            const response = await fetch(`${CONFIG.proxy_url}${targetUrl}`);
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

    function formatSize(bytes) {
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    // --- ОСНОВНАЯ ЛОГИКА ---

    function startPlugin() {
        Lampa.Search.addSource({
            name: 'PidTor (JacRed)',
            check: (object) => object.type === 'movie' || object.type === 'tv',
            
            search: async (object, callback) => {
                let query = object.title || object.original_title;
                if (!query) return callback([]);

                // Формируем запрос к JacRed с учетом года и языка
                let yearParam = object.year ? `&Year=${object.year}` : '';
                const searchUrl = `${CONFIG.jacred_api}/api/v2.0/indexers/all/results?Query=${encodeURIComponent(query)}${yearParam}&Category=2000,2010,2020,2030,2040,2050`;
                
                const data = await fetchWithProxy(searchUrl);
                if (!data || !data.Results) return callback([]);

                let results = [];
                for (let item of data.Results) {
                    let sizeGb = item.Size / (1024 * 1024 * 1024);
                    let isSerial = object.type === 'tv';
                    
                    // Применяем фильтры
                    if (item.Seeders < CONFIG.min_seeders) continue;
                    if (sizeGb > (isSerial ? CONFIG.max_serial_size_gb : CONFIG.max_size_gb)) continue;

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

                // Сортировка: сначала качество, потом количество сидов
                results.sort((a, b) => {
                    let qA = CONFIG.quality_priority.indexOf(a.quality);
                    let qB = CONFIG.quality_priority.indexOf(b.quality);
                    if (qA !== qB) return qA - qB;
                    return b.seeders - a.seeders;
                });

                callback(results.slice(0, 20));
            },

            select: async (item, callback) => {
                // 1. Добавление магнета в TorrServer (если еще не добавлен)
                if (!addedHashes.has(item.hash)) {
                    const tsAddUrl = `${CONFIG.torrserver_host}/torrent/add`;
                    await fetchLocal(tsAddUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ link: item.magnet, save_to_db: false })
                    });
                    addedHashes.add(item.hash);
                }

                // 2. Обработка выбора
                if (item.is_serial) {
                    // Получаем список файлов из TorrServer
                    const filesUrl = `${CONFIG.torrserver_host}/torrent/files/${item.hash}`;
                    const filesData = await fetchLocal(filesUrl);

                    if (filesData && filesData.length > 0) {
                        // Фильтруем только видеофайлы
                        let videoFiles = filesData.filter(f => f.name.match(/\.(mp4|mkv|avi|mov)$/i));
                        
                        if (videoFiles.length > 0) {
                            // Открываем меню выбора серии/файла
                            Lampa.Select.open({
                                title: 'Выбор серии',
                                items: videoFiles.map(f => ({
                                    title: f.name,
                                    value: f.id
                                })),
                                onSelect: (fileId) => {
                                    callback({ url: `${CONFIG.torrserver_host}/stream/${item.hash}/${fileId}` });
                                }
                            });
                        } else {
                            Lampa.Noty.show('В торренте не найдены видеофайлы');
                        }
                    }
                } else {
                    // Для фильмов берем первый файл (обычно это основной фильм)
                    callback({ url: `${CONFIG.torrserver_host}/stream/${item.hash}/0` });
                }
            }
        });
    }

    // Инициализация плагина
    if (typeof Lampa !== 'undefined') {
        startPlugin();
    } else {
        document.addEventListener('lamponload', startPlugin);
    }
})();
