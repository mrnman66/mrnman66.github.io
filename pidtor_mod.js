(function () {
'use strict';
if (!window.Lampa) return;

var mod_version = '1.0.4';

// ============================================================
//  РЕГИСТРАЦИЯ ПАРАМЕТРОВ — СРАЗУ, ДО РЕНДЕРА НАСТРОЕК
// ============================================================
Lampa.Params.select('pidtor_redapi',   '', 'http://jac.red');
Lampa.Params.select('pidtor_apikey',   '', '');
Lampa.Params.select('pidtor_torrs',    '', 'http://127.0.0.1:8090');
Lampa.Params.select('pidtor_min_sid',  '', '1');
Lampa.Params.select('pidtor_max_size', '', '0');
Lampa.Params.select('pidtor_filter',   '', '');
Lampa.Params.select('pidtor_sort', {
    'size':  '#{torrent_parser_sort_by_size}',
    'sid':   '#{torrent_parser_sort_by_seeders}',
    'date':  '#{torrent_parser_sort_by_date}',
    'title': '#{torrent_parser_sort_by_name}'
}, 'size');

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
        pidtor_no_torrs: {
            ru: 'TorrServer не настроен', uk: 'TorrServer не налаштований',
            be: 'TorrServer не наладжаны', en: 'TorrServer not configured',
            zh: 'TorrServer未配置', pt: 'TorrServer não configurado', bg: 'TorrServer не е конфигуриран'
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
        pidtor_tracker: {
            ru: 'Трекер', uk: 'Трекер', be: 'Трэкер', en: 'Tracker',
            zh: '追踪器', pt: 'Rastreador', bg: 'Тракер'
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
        pidtor_sort_name: {
            ru: 'Сортировка', uk: 'Сортування', be: 'Сартаванне',
            en: 'Sort by', zh: '排序', pt: 'Ordenar por', bg: 'Сортиране'
        },
        pidtor_filter_name: {
            ru: 'Фильтр (включить)', uk: 'Фільтр (увімкнути)', be: 'Фільтр (уключыць)',
            en: 'Filter (include)', zh: '过滤（包含）', pt: 'Filtro (incluir)', bg: 'Филтър (включи)'
        },
        pidtor_filter_descr: {
            ru: 'Слова через запятую, напр.: 1080p, DUB', uk: 'Слова через кому, напр.: 1080p, DUB',
            be: 'Словы праз коску, напр.: 1080p, DUB', en: 'Comma-separated, e.g.: 1080p, DUB',
            zh: '逗号分隔，例如: 1080p, DUB', pt: 'Separado por vírgula, ex: 1080p, DUB',
            bg: 'Разделени със запетая, напр.: 1080p, DUB'
        }
    });
}

// ============================================================
//  ИКОНКА (переиспользуется в меню и на кнопке)
// ============================================================
var ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 244 260" fill="none">' +
        '<path d="M242,88v170H10V88h41l-38,38h37.1l38-38h38.4l-38,38h38.4l38-38h38.3l-38,38H204L242,88z ' +
        'M228.9,2l8,37.7L191.2,10L228.9,2z M160.6,56l-45.8-29.7l38-8.1l45.8,29.7L160.6,56z ' +
        'M84.5,72.1L38.8,42.4l38-8.1l45.8,29.7L84.5,72.1z M10,88L2,50.2L47.8,80L10,88z" ' +
        'fill="white"/>' +
    '</svg>';

// ============================================================
//  НАСТРОЙКИ
// ============================================================
function initSettings() {
    // Имя папки подставляем УЖЕ переведённым — $() не обрабатывает #{...}
    var field = $(
        '<div class="settings-folder selector" data-component="pidtor">' +
            '<div class="settings-folder__icon">' + ICON_SVG + '</div>' +
            '<div class="settings-folder__name">' + Lampa.Lang.translate('pidtor_title') + '</div>' +
        '</div>'
    );

    var server_folder = Lampa.Settings.main().render().find('[data-component="server"]');
    if (server_folder.length) {
        server_folder.after(field);
    } else {
        Lampa.Settings.main().render().find('.settings__body > div').append(field);
    }
    Lampa.Settings.main().update();

    // Шаблон раздела. Ядро Lampa САМО вставит его в body и САМО забиндит/обновит
    // поля (hover:enter, значения из Storage) — вручную append/bind/update НЕ нужны.
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
            '<div class="settings-param selector" data-type="select" data-name="pidtor_sort">' +
                '<div class="settings-param__name">#{pidtor_sort_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_filter" ' +
                'placeholder="#{pidtor_filter_descr}">' +
                '<div class="settings-param__name">#{pidtor_filter_name}</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">#{pidtor_filter_descr}</div>' +
            '</div>' +
        '</div>'
    );
}

// ============================================================
//  КОНФИГ
// ============================================================
function getCfg() {
    return {
        redapi:  Lampa.Storage.get('pidtor_redapi', 'http://jac.red'),
        apikey:  Lampa.Storage.get('pidtor_apikey', ''),
        torrs:   Lampa.Storage.get('pidtor_torrs', 'http://127.0.0.1:8090'),
        minSid:  parseInt(Lampa.Storage.get('pidtor_min_sid', '1')) || 0,
        maxSize: parseInt(Lampa.Storage.get('pidtor_max_size', '0')) || 0,
        sort:    Lampa.Storage.get('pidtor_sort', 'size'),
        filter:  Lampa.Storage.get('pidtor_filter', '')
    };
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

    Lampa.Network.timeout(15000);
    Lampa.Network.silent(url, function (data) {
        var results = (data && data.Results) ? data.Results : [];

        results = results.filter(function (r) {
            if (cfg.minSid > 0 && (r.Seeders || 0) < cfg.minSid) return false;
            if (cfg.maxSize > 0 && r.Size > cfg.maxSize * 1073741824) return false;
            if (cfg.filter) {
                var words = cfg.filter.toLowerCase().split(',');
                var title = (r.Title || '').toLowerCase();
                for (var i = 0; i < words.length; i++) {
                    if (words[i].trim() && title.indexOf(words[i].trim()) === -1) return false;
                }
            }
            return true;
        });

        var sortField = cfg.sort === 'sid'   ? 'Seeders'
                      : cfg.sort === 'date'  ? 'PublishDate'
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
    card = $(Lampa.Lang.translate(card[0].outerHTML));

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
        filter = $(Lampa.Lang.translate(filter[0].outerHTML));
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
