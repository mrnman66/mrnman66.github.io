(function () {
'use strict';
if (!window.Lampa) return;

var mod_version = '1.1.0';

// ============================================================
//  РЕГИСТРАЦИЯ ПАРАМЕТРОВ — СРАЗУ, ДО РЕНДЕРА НАСТРОЕК
// ============================================================
// input-поля (values[name] = '' → строка)
Lampa.Params.select('pidtor_redapi',        '', 'http://jac.red');
Lampa.Params.select('pidtor_apikey',        '', '');
Lampa.Params.select('pidtor_torrs',         '', 'http://127.0.0.1:8090');
Lampa.Params.select('pidtor_min_sid',       '', '1');
Lampa.Params.select('pidtor_max_size',      '', '0');
Lampa.Params.select('pidtor_max_serial',    '', '0');
Lampa.Params.select('pidtor_filter',        '', '');
Lampa.Params.select('pidtor_filter_ignore', '', '');
Lampa.Params.select('pidtor_voice',         '', '');
Lampa.Params.select('pidtor_tracker',       '', '');
Lampa.Params.select('pidtor_year',          '', '');
Lampa.Params.select('pidtor_season',        '', '');
// select-поля (values[name] = объект {ключ: отображение})
Lampa.Params.select('pidtor_sort', {
    'size':  '#{torrent_parser_sort_by_size}',
    'sid':   '#{torrent_parser_sort_by_seeders}',
    'date':  '#{torrent_parser_sort_by_date}',
    'title': '#{torrent_parser_sort_by_name}'
}, 'size');
Lampa.Params.select('pidtor_quality', {
    'any':   '#{torrent_parser_any_one}',
    '4k':    '4K / 2160p',
    '1080p': '1080p',
    '720p':  '720p'
}, 'any');
Lampa.Params.select('pidtor_hdr', {
    'any': '#{torrent_parser_any_one}',
    'yes': '#{torrent_parser_yes}',
    'no':  '#{torrent_parser_no}'
}, 'any');
// toggle
Lampa.Params.trigger('pidtor_exact', false);

// ============================================================
//  ПЕРЕВОДЫ
// ============================================================
function addTranslations() {
    Lampa.Lang.add({
        pidtor_title: {
            ru: 'PidTor', uk: 'PidTor', be: 'PidTor', en: 'PidTor',
            zh: 'PidTor', pt: 'PidTor', bg: 'PidTor'
        },
        pidtor_search: {
            ru: 'Поиск торрентов', uk: 'Пошук торрентів', be: 'Пошук торэнтаў',
            en: 'Torrent search', zh: '种子搜索', pt: 'Pesquisa de torrents',
            bg: 'Търсене на торенти'
        },
        pidtor_empty: {
            ru: 'Ничего не найдено', uk: 'Нічого не знайдено', be: 'Нічога не знойдзена',
            en: 'Nothing found', zh: '未找到', pt: 'Nada encontrado', bg: 'Нищо не е намерено'
        },
        pidtor_error: {
            ru: 'Ошибка запроса к JacRed', uk: 'Помилка запиту до JacRed',
            be: 'Памылка запыту да JacRed', en: 'JacRed request error',
            zh: 'JacRed请求错误', pt: 'Erro na solicitação JacRed', bg: 'Грешка в заявката към JacRed'
        },
        pidtor_watch: {
            ru: 'Смотреть (PidTor)', uk: 'Дивитися (PidTor)', be: 'Глядзець (PidTor)',
            en: 'Watch (PidTor)', zh: '观看 (PidTor)', pt: 'Assistir (PidTor)', bg: 'Гледай (PidTor)'
        },
        pidtor_seeds: {
            ru: 'Сиды', uk: 'Сіди', be: 'Сіды', en: 'Seeds',
            zh: '做种', pt: 'Seeds', bg: 'Сийдове'
        },
        pidtor_size: {
            ru: 'Размер', uk: 'Розмір', be: 'Памер', en: 'Size',
            zh: '大小', pt: 'Tamanho', bg: 'Размер'
        },
        pidtor_added: {
            ru: 'Добавлено в TorrServer', uk: 'Додано в TorrServer',
            be: 'Дададзена ў TorrServer', en: 'Added to TorrServer',
            zh: '已添加到TorrServer', pt: 'Adicionado ao TorrServer', bg: 'Добавено в TorrServer'
        },
        pidtor_settings_title: {
            ru: 'PidTor — торренты онлайн', uk: 'PidTor — торренти онлайн',
            be: 'PidTor — торэнты анлайн', en: 'PidTor — torrents online',
            zh: 'PidTor — 在线种子', pt: 'PidTor — torrents online', bg: 'PidTor — торенти онлайн'
        },
        pidtor_redapi_name: {
            ru: 'Адрес JacRed API', uk: 'Адреса JacRed API', be: 'Адрас JacRed API',
            en: 'JacRed API address', zh: 'JacRed API地址', pt: 'Endereço API JacRed',
            bg: 'Адрес на JacRed API'
        },
        pidtor_redapi_descr: {
            ru: 'Например: http://jac.red', uk: 'Наприклад: http://jac.red',
            be: 'Напрыклад: http://jac.red', en: 'Example: http://jac.red',
            zh: '例如: http://jac.red', pt: 'Exemplo: http://jac.red', bg: 'Пример: http://jac.red'
        },
        pidtor_apikey_name: {
            ru: 'API-ключ JacRed', uk: 'API-ключ JacRed', be: 'API-ключ JacRed',
            en: 'JacRed API key', zh: 'JacRed API密钥', pt: 'Chave API JacRed',
            bg: 'API ключ за JacRed'
        },
        pidtor_torrs_name: {
            ru: 'Адрес TorrServer', uk: 'Адреса TorrServer', be: 'Адрас TorrServer',
            en: 'TorrServer address', zh: 'TorrServer地址', pt: 'Endereço TorrServer',
            bg: 'Адрес на TorrServer'
        },
        pidtor_torrs_descr: {
            ru: 'Например: http://127.0.0.1:8090', uk: 'Наприклад: http://127.0.0.1:8090',
            be: 'Напрыклад: http://127.0.0.1:8090', en: 'Example: http://127.0.0.1:8090',
            zh: '例如: http://127.0.0.1:8090', pt: 'Exemplo: http://127.0.0.1:8090',
            bg: 'Пример: http://127.0.0.1:8090'
        },
        pidtor_min_sid_name: {
            ru: 'Минимум сидов', uk: 'Мінімум сідів', be: 'Мінімум сідаў',
            en: 'Minimum seeds', zh: '最少做种数', pt: 'Mínimo de seeds', bg: 'Минимум сийдове'
        },
        pidtor_max_size_name: {
            ru: 'Макс. размер (ГБ, 0 = без лимита)', uk: 'Макс. розмір (ГБ, 0 = без ліміту)',
            be: 'Макс. памер (ГБ, 0 = без ліміту)', en: 'Max size (GB, 0 = no limit)',
            zh: '最大大小 (GB, 0 = 无限制)', pt: 'Tamanho máx. (GB, 0 = sem limite)',
            bg: 'Макс. размер (ГБ, 0 = без лимит)'
        },
        pidtor_max_serial_name: {
            ru: 'Макс. размер сериала (ГБ, 0 = без лимита)',
            uk: 'Макс. розмір серіалу (ГБ, 0 = без ліміту)',
            be: 'Макс. памер серыяла (ГБ, 0 = без ліміту)',
            en: 'Max serial size (GB, 0 = no limit)',
            zh: '剧集最大大小 (GB, 0 = 无限制)',
            pt: 'Tamanho máx. da série (GB, 0 = sem limite)',
            bg: 'Макс. размер на сериал (ГБ, 0 = без лимит)'
        },
        pidtor_sort_name: {
            ru: 'Сортировка', uk: 'Сортування', be: 'Сартаванне',
            en: 'Sort by', zh: '排序', pt: 'Ordenar por', bg: 'Сортиране'
        },
        pidtor_filter_name: {
            ru: 'Уточнить (включить)', uk: 'Уточнити (увімкнути)', be: 'Удакладніць (уключыць)',
            en: 'Include', zh: '包含', pt: 'Incluir', bg: 'Включи'
        },
        pidtor_filter_descr: {
            ru: 'Слова через запятую, напр.: 1080p, DUB', uk: 'Слова через кому, напр.: 1080p, DUB',
            be: 'Словы праз коску, напр.: 1080p, DUB', en: 'Comma-separated, e.g.: 1080p, DUB',
            zh: '逗号分隔，例如: 1080p, DUB', pt: 'Separado por vírgula, ex: 1080p, DUB',
            bg: 'Разделени със запетая, напр.: 1080p, DUB'
        },
        pidtor_filter_ignore_name: {
            ru: 'Исключить', uk: 'Виключити', be: 'Выключыць',
            en: 'Exclude', zh: '排除', pt: 'Excluir', bg: 'Изключи'
        },
        pidtor_filter_ignore_descr: {
            ru: 'Слова через запятую, напр.: CAMRip, TS', uk: 'Слова через кому, напр.: CAMRip, TS',
            be: 'Словы праз коску, напр.: CAMRip, TS', en: 'Comma-separated, e.g.: CAMRip, TS',
            zh: '逗号分隔，例如: CAMRip, TS', pt: 'Separado por vírgula, ex: CAMRip, TS',
            bg: 'Разделени със запетая, напр.: CAMRip, TS'
        },
        pidtor_quality_name: {
            ru: 'Качество', uk: 'Якість', be: 'Якасць',
            en: 'Quality', zh: '质量', pt: 'Qualidade', bg: 'Качество'
        },
        pidtor_hdr_name: {
            ru: 'Тип видео (HDR)', uk: 'Тип відео (HDR)', be: 'Тып відэа (HDR)',
            en: 'Video type (HDR)', zh: '视频类型 (HDR)', pt: 'Tipo de vídeo (HDR)', bg: 'Тип видео (HDR)'
        },
        pidtor_voice_name: {
            ru: 'Озвучка', uk: 'Озвучка', be: 'Агучка',
            en: 'Voice', zh: '配音', pt: 'Dublagem', bg: 'Дублаж'
        },
        pidtor_voice_descr: {
            ru: 'Слова через запятую, напр.: DUB, LostFilm', uk: 'Слова через кому, напр.: DUB, LostFilm',
            be: 'Словы праз коску, напр.: DUB, LostFilm', en: 'Comma-separated, e.g.: DUB, LostFilm',
            zh: '逗号分隔，例如: DUB, LostFilm', pt: 'Separado por vírgula, ex: DUB, LostFilm',
            bg: 'Разделени със запетая, напр.: DUB, LostFilm'
        },
        pidtor_tracker_name: {
            ru: 'Трекер', uk: 'Трекер', be: 'Трэкер',
            en: 'Tracker', zh: '追踪器', pt: 'Rastreador', bg: 'Тракер'
        },
        pidtor_tracker_descr: {
            ru: 'Слова через запятую, напр.: selezen, rutracker', uk: 'Слова через кому, напр.: selezen, rutracker',
            be: 'Словы праз коску, напр.: selezen, rutracker', en: 'Comma-separated, e.g.: selezen, rutracker',
            zh: '逗号分隔，例如: selezen, rutracker', pt: 'Separado por vírgula, ex: selezen, rutracker',
            bg: 'Разделени със запетая, напр.: selezen, rutracker'
        },
        pidtor_year_name: {
            ru: 'Год', uk: 'Рік', be: 'Год',
            en: 'Year', zh: '年份', pt: 'Ano', bg: 'Година'
        },
        pidtor_season_name: {
            ru: 'Сезон', uk: 'Сезон', be: 'Сезон',
            en: 'Season', zh: '季', pt: 'Temporada', bg: 'Сезон'
        },
        pidtor_exact_name: {
            ru: 'Точный поиск', uk: 'Точний пошук', be: 'Дакладны пошук',
            en: 'Exact search', zh: '精确搜索', pt: 'Pesquisa exata', bg: 'Точно търсене'
        },
        pidtor_exact_descr: {
            ru: 'Все слова запроса должны быть в названии раздачи',
            uk: 'Усі слова запиту мають бути в назві роздачі',
            be: 'Усе словы запыту павінны быць у назве раздачы',
            en: 'All query words must appear in the release title',
            zh: '查询的所有词必须出现在标题中',
            pt: 'Todas as palavras da consulta devem aparecer no título',
            bg: 'Всички думи от заявката трябва да са в заглавието'
        }
    });
}

// ============================================================
//  НАСТРОЙКИ
// ============================================================
function initSettings() {
    var field = $(
        '<div class="settings-folder selector" data-component="pidtor">' +
            '<div class="settings-folder__icon">' +
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 244 260" fill="none">' +
                    '<path d="M242,88v170H10V88h41l-38,38h37.1l38-38h38.4l-38,38h38.4l38-38h38.3l-38,38H204L242,88z ' +
                    'M228.9,2l8,37.7L191.2,10L228.9,2z M160.6,56l-45.8-29.7l38-8.1l45.8,29.7L160.6,56z ' +
                    'M84.5,72.1L38.8,42.4l38-8.1l45.8,29.7L84.5,72.1z M10,88L2,50.2L47.8,80L10,88z" ' +
                    'fill="white"/>' +
                '</svg>' +
            '</div>' +
            '<div class="settings-folder__name">#{pidtor_title}</div>' +
        '</div>'
    );
    var server_folder = Lampa.Settings.main().render().find('[data-component="server"]');
    if (server_folder.length) {
        server_folder.after(field);
    } else {
        Lampa.Settings.main().render().find('.settings__body > div').append(field);
    }
    Lampa.Settings.main().update();

    Lampa.Template.add('settings_pidtor',
        '<div>' +
            '<div class="settings-param-title"><span>#{pidtor_settings_title}</span></div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_redapi" ' +
                'placeholder="#{pidtor_redapi_descr}">' +
                '<div class="settings-param__name">#{pidtor_redapi_name}</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">#{pidtor_redapi_descr}</div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_apikey" ' +
                'data-string="true" placeholder="API key">' +
                '<div class="settings-param__name">#{pidtor_apikey_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_torrs" ' +
                'placeholder="#{pidtor_torrs_descr}">' +
                '<div class="settings-param__name">#{pidtor_torrs_name}</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">#{pidtor_torrs_descr}</div>' +
            '</div>' +

            '<div class="settings-param-title"><span>#{filter_filtred}</span></div>' +
            '<div class="settings-param selector" data-type="select" data-name="pidtor_quality">' +
                '<div class="settings-param__name">#{pidtor_quality_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="select" data-name="pidtor_hdr">' +
                '<div class="settings-param__name">#{pidtor_hdr_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_voice" ' +
                'placeholder="#{pidtor_voice_descr}">' +
                '<div class="settings-param__name">#{pidtor_voice_name}</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">#{pidtor_voice_descr}</div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_tracker" ' +
                'placeholder="#{pidtor_tracker_descr}">' +
                '<div class="settings-param__name">#{pidtor_tracker_name}</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">#{pidtor_tracker_descr}</div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_year" ' +
                'placeholder="2024">' +
                '<div class="settings-param__name">#{pidtor_year_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_season" ' +
                'placeholder="1">' +
                '<div class="settings-param__name">#{pidtor_season_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="toggle" data-name="pidtor_exact">' +
                '<div class="settings-param__name">#{pidtor_exact_name}</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">#{pidtor_exact_descr}</div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_filter" ' +
                'placeholder="#{pidtor_filter_descr}">' +
                '<div class="settings-param__name">#{pidtor_filter_name}</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">#{pidtor_filter_descr}</div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_filter_ignore" ' +
                'placeholder="#{pidtor_filter_ignore_descr}">' +
                '<div class="settings-param__name">#{pidtor_filter_ignore_name}</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">#{pidtor_filter_ignore_descr}</div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_min_sid" ' +
                'placeholder="1">' +
                '<div class="settings-param__name">#{pidtor_min_sid_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_max_size" ' +
                'placeholder="0">' +
                '<div class="settings-param__name">#{pidtor_max_size_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_max_serial" ' +
                'placeholder="0">' +
                '<div class="settings-param__name">#{pidtor_max_serial_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="select" data-name="pidtor_sort">' +
                '<div class="settings-param__name">#{pidtor_sort_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
        '</div>'
    );

    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'pidtor') {
            e.body.append(Lampa.Template.get('settings_pidtor'));
            Lampa.Settings.bind();
            Lampa.Settings.update();
        }
    });
}

// ============================================================
//  КОНФИГ
// ============================================================
function getCfg() {
    return {
        redapi:      Lampa.Storage.get('pidtor_redapi', 'http://jac.red'),
        apikey:      Lampa.Storage.get('pidtor_apikey', ''),
        torrs:       Lampa.Storage.get('pidtor_torrs', 'http://127.0.0.1:8090'),
        minSid:      parseInt(Lampa.Storage.get('pidtor_min_sid', '1'), 10) || 0,
        maxSize:     parseInt(Lampa.Storage.get('pidtor_max_size', '0'), 10) || 0,
        maxSerial:   parseInt(Lampa.Storage.get('pidtor_max_serial', '0'), 10) || 0,
        sort:        Lampa.Storage.get('pidtor_sort', 'size'),
        filter:      Lampa.Storage.get('pidtor_filter', ''),
        filterIgnore:Lampa.Storage.get('pidtor_filter_ignore', ''),
        quality:     Lampa.Storage.get('pidtor_quality', 'any'),
        hdr:         Lampa.Storage.get('pidtor_hdr', 'any'),
        voice:       Lampa.Storage.get('pidtor_voice', ''),
        tracker:     Lampa.Storage.get('pidtor_tracker', ''),
        year:        (Lampa.Storage.get('pidtor_year', '') + '').trim(),
        season:      (Lampa.Storage.get('pidtor_season', '') + '').trim(),
        exact:       Lampa.Storage.get('pidtor_exact', false)
    };
}

// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ ФИЛЬТРЫ (по строке Title / полю Tracker)
// ============================================================
var RE_SERIAL = /s\d+\s*e\d+|season\s*\d+|сезон\s*\d+|\[\s*\d+\s*x\s*\d+/i;

function words(str) {
    if (!str) return [];
    return str.toLowerCase().split(',').map(function (w) { return w.trim(); })
        .filter(function (w) { return w.length > 0; });
}

function testQuality(title, q) {
    if (!q || q === 'any') return true;
    if (q === '4k')    return /(4k|uhd|2160p)/i.test(title);
    if (q === '1080p') return /(1080p|full\s?hd)/i.test(title);
    if (q === '720p')  return /720p/i.test(title);
    return true;
}

function testHdr(title, h) {
    if (!h || h === 'any') return true;
    var has = /hdr/i.test(title);
    return h === 'yes' ? has : !has;
}

function testIncludeWords(title, list) {
    if (!list.length) return true;
    for (var i = 0; i < list.length; i++) {
        if (title.indexOf(list[i]) >= 0) return true;
    }
    return false;
}

function testExcludeWords(title, list) {
    if (!list.length) return true;
    for (var i = 0; i < list.length; i++) {
        if (title.indexOf(list[i]) >= 0) return false;
    }
    return true;
}

function testTracker(tracker, list) {
    if (!list.length) return true;
    var t = (tracker || '').toLowerCase();
    for (var i = 0; i < list.length; i++) {
        if (t.indexOf(list[i]) >= 0) return true;
    }
    return false;
}

function testSeason(title, season) {
    if (!season) return true;
    var n = season.replace(/^0+/, '') || season;
    var re = new RegExp('(s0?' + n + '[e\\-\\s\\]]|season\\s*0?' + n + '|сезон\\s*0?' + n + ')', 'i');
    return re.test(title);
}

function testExact(title, query) {
    if (!query) return true;
    var ws = query.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 2; });
    for (var i = 0; i < ws.length; i++) {
        if (title.indexOf(ws[i]) === -1) return false;
    }
    return true;
}

// ============================================================
//  ПОИСК
// ============================================================
function searchTorrents(movie, callback, error) {
    var cfg = getCfg();
    var query = movie.original_title || movie.title || '';
    if (!query) { error('No title'); return; }

    var url = cfg.redapi.replace(/\/+$/, '') + '/api/v2.0/indexers/all/results?apikey=' +
              encodeURIComponent(cfg.apikey) + '&query=' + encodeURIComponent(query);

    var incWords  = words(cfg.filter);
    var excWords  = words(cfg.filterIgnore);
    var voiceList = words(cfg.voice);
    var trackList = words(cfg.tracker);

    Lampa.Network.timeout(15000);
    Lampa.Network.silent(url, function (data) {
        var results = (data && data.Results) ? data.Results : [];

        results = results.filter(function (r) {
            var title   = (r.Title || '').toLowerCase();
            var tracker = r.Tracker || '';
            var size    = r.Size || 0;

            if (cfg.minSid > 0 && (r.Seeders || 0) < cfg.minSid) return false;
            if (cfg.maxSize > 0 && size > cfg.maxSize * 1073741824) return false;
            if (cfg.maxSerial > 0 && RE_SERIAL.test(r.Title || '') && size > cfg.maxSerial * 1073741824) return false;

            if (!testQuality(r.Title || '', cfg.quality)) return false;
            if (!testHdr(r.Title || '', cfg.hdr)) return false;
            if (!testIncludeWords(title, incWords)) return false;
            if (!testExcludeWords(title, excWords)) return false;
            if (!testIncludeWords(title, voiceList)) return false;
            if (!testTracker(tracker, trackList)) return false;
            if (cfg.year && title.indexOf(cfg.year) === -1) return false;
            if (!testSeason(r.Title || '', cfg.season)) return false;
            if (cfg.exact && !testExact(title, query)) return false;

            return true;
        });

        var sortField = cfg.sort === 'sid' ? 'Seeders'
                      : cfg.sort === 'date' ? 'PublishDate'
                      : cfg.sort === 'title' ? 'Title' : 'Size';
        results.sort(function (a, b) {
            if (sortField === 'Title') return (a.Title || '').localeCompare(b.Title || '');
            return (b[sortField] || 0) - (a[sortField] || 0);
        });

        callback(results);
    }, function (a, c) {
        error(Lampa.Network.errorDecode(a, c));
    });
}

// ============================================================
//  TORRSERVER
// ============================================================
function addToTorrs(magnet, title, poster, callback, error) {
    var cfg = getCfg();
    var url = cfg.torrs.replace(/\/+$/, '') + '/torrents';
    $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            title: title,
            link: magnet,
            poster: poster || '',
            data: JSON.stringify({ lampa: true })
        }),
        success: function () { callback(); },
        error: function (a, c) { error(Lampa.Network.errorDecode(a, c)); }
    });
}

function playTorrent(hash, fileIndex, title) {
    var cfg = getCfg();
    var url = cfg.torrs.replace(/\/+$/, '') + '/stream/' +
              encodeURIComponent(hash) + '?index=' + (fileIndex || 1) + '&play';
    Lampa.Player.play({
        title: title,
        url: url,
        type: 'torrent'
    });
}

// ============================================================
//  КАРТОЧКА РЕЗУЛЬТАТА
// ============================================================
function createCard(item, movie) {
    var card = $(
        '<div class="torrent-item selector layer--visible layer--render">' +
            '<div class="torrent-item__title">' + Lampa.Utils.shortText(item.Title || '', 80) + '</div>' +
            '<div class="torrent-item__details">' +
                '<div class="torrent-item__tracker">' + (item.Tracker || '') + '</div>' +
                '<div class="torrent-item__seeds">#{pidtor_seeds}: <span>' + (item.Seeders || 0) + '</span></div>' +
                '<div class="torrent-item__grabs">#{pidtor_size}: <span>' +
                    Lampa.Utils.bytesToSize(item.Size || 0) + '</span></div>' +
                '<div class="torrent-item__size">' + (item.PublishDate || '') + '</div>' +
            '</div>' +
        '</div>'
    );
    card.on('hover:enter', function () {
        var magnet = item.MagnetUri || item.Link || '';
        if (!magnet) {
            Lampa.Noty.show(Lampa.Lang.translate('pidtor_error'));
            return;
        }
        Lampa.Noty.show(Lampa.Lang.translate('pidtor_added'));
        addToTorrs(
            magnet,
            (movie.title || '') + ' / ' + (movie.original_title || ''),
            movie.poster_path ? Lampa.TMDB.image('t/p/w200' + movie.poster_path) : '',
            function () {
                playTorrent(item.InfoHash || '', 1, item.Title || movie.title);
            },
            function (err) {
                Lampa.Noty.show(err);
            }
        );
    });
    card.on('hover:focus', function (e) {
        Lampa.Controller.collectionFocus(e.target);
    });
    return card;
}

// ============================================================
//  КОМПОНЕНТ
// ============================================================
function component(object) {
    var scroll = new Lampa.Scroll({ mask: true, over: true });
    var html = $('<div></div>');
    var last = null;
    var results = [];

    this.create = function () {
        var self = this;
        this.activity.loader(true);
        searchTorrents(object.movie, function (data) {
            results = data;
            self.build();
            self.activity.loader(false);
            self.activity.toggle();
        }, function (err) {
            self.empty(Lampa.Lang.translate('pidtor_error') + ': ' + err);
        });
        return this.render();
    };

    this.build = function () {
        var self = this;
        if (!results.length) {
            this.empty(Lampa.Lang.translate('pidtor_empty'));
            return;
        }
        var head = $('<div class="explorer__files-head"></div>');
        var filter = $('<div class="simple-button selector filter--back" style="margin:0 0 1em 0">' +
            '<span>#{pidtor_search}: ' + (object.movie.title || '') + ' (' + results.length + ')</span></div>');
        head.append(filter);
        scroll.minus(head);
        results.forEach(function (item) {
            var card = createCard(item, object.movie);
            card.on('hover:focus', function (e) {
                last = e.target;
                scroll.update($(e.target), true);
            });
            scroll.append(card);
        });
        html.append(scroll.render());
    };

    this.empty = function (text) {
        var empty = new Lampa.Empty({ descr: text });
        html.append(empty.render());
        this.start = empty.start.bind(empty);
        this.activity.loader(false);
        this.activity.toggle();
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
            down: function () { Lampa.Navigator.move('down'); },
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

// ============================================================
//  ЗАПУСК ПОИСКА
// ============================================================
var pidtor_loading = false;
function loadPidTor(object) {
    if (pidtor_loading) return;
    pidtor_loading = true;
    Lampa.Component.add('pidtor', component);
    Lampa.Activity.push({
        url: '',
        title: Lampa.Lang.translate('pidtor_title'),
        component: 'pidtor',
        search: object.title,
        movie: object,
        page: 1
    });
    pidtor_loading = false;
}

// ============================================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================================
function init() {
    addTranslations();
    initSettings();

    Lampa.Component.add('pidtor', component);

    var manifest = {
        type: 'video',
        version: mod_version,
        name: Lampa.Lang.translate('pidtor_title') + ' ' + mod_version,
        description: Lampa.Lang.translate('pidtor_search'),
        component: 'pidtor',
        onContextMenu: function (object) {
            return {
                name: Lampa.Lang.translate('pidtor_watch'),
                description: Lampa.Lang.translate('pidtor_search')
            };
        },
        onContextLauch: function (object) {
            pidtor_loading = false;
            loadPidTor(object);
        }
    };
    Lampa.Manifest.plugins = manifest;

    var buttonHtml =
        '<div class="full-start__button selector view--pidtor" data-subtitle="PidTor ' + mod_version + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 244 260" fill="none" ' +
                'width="24" height="24" style="vertical-align:middle">' +
                '<path d="M242,88v170H10V88h41l-38,38h37.1l38-38h38.4l-38,38h38.4l38-38h38.3l-38,38H204L242,88z ' +
                'M228.9,2l8,37.7L191.2,10L228.9,2z M160.6,56l-45.8-29.7l38-8.1l45.8,29.7L160.6,56z ' +
                'M84.5,72.1L38.8,42.4l38-8.1l45.8,29.7L84.5,72.1z M10,88L2,50.2L47.8,80L10,88z" ' +
                'fill="currentColor"/>' +
            '</svg>' +
            '<span>#{pidtor_title}</span>' +
        '</div>';

    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            var btn = $(Lampa.Lang.translate(buttonHtml));
            pidtor_loading = false;
            btn.on('hover:enter', function () {
                loadPidTor(e.data.movie);
            });
            var torrentBtn = e.object.activity.render().find('.view--torrent');
            if (torrentBtn.length) {
                torrentBtn.after(btn);
            } else {
                var playBtn = e.object.activity.render().find('.button--play');
                if (playBtn.length) playBtn.after(btn);
            }
        }
    });
}

// ============================================================
//  СТАРТ
// ============================================================
if (window.appready) {
    init();
} else {
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
}
})();
