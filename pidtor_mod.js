(function () {
'use strict';
if (!window.Lampa) return;

var mod_version = '1.1.0';

// ============================================================
//  РЕГИСТРАЦИЯ ПАРАМЕТРОВ — СРАЗУ, ДО РЕНДЕРА НАСТРОЕК
//  (pidtor_torrs убран: стрим идёт через общие настройки TorrServer)
// ============================================================
Lampa.Params.select('pidtor_redapi',   '', 'http://jac.red');
Lampa.Params.select('pidtor_apikey',   '', '');
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
        pidtor_title: { ru: 'PidTor', uk: 'PidTor', be: 'PidTor', en: 'PidTor', zh: 'PidTor', pt: 'PidTor', bg: 'PidTor' },
        pidtor_search: {
            ru: 'Поиск торрентов', uk: 'Пошук торрентів', be: 'Пошук торрентаў',
            en: 'Torrent search', zh: '种子搜索', pt: 'Pesquisa de torrents', bg: 'Търсене на торенти'
        },
        pidtor_empty: {
            ru: 'Ничего не найдено', uk: 'Нічого не знайдено', be: 'Нічога не знойдзена',
            en: 'Nothing found', zh: '未找到', pt: 'Nada encontrado', bg: 'Нищо не е намерено'
        },
        pidtor_error: {
            ru: 'Ошибка запроса к JacRed', uk: 'Помилка запиту до JacRed', be: 'Памылка запыту да JacRed',
            en: 'JacRed request error', zh: 'JacRed请求错误', pt: 'Erro na solicitação JacRed', bg: 'Грешка в заявката към JacRed'
        },
        pidtor_watch: {
            ru: 'Смотреть (PidTor)', uk: 'Дивитися (PidTor)', be: 'Глядзець (PidTor)',
            en: 'Watch (PidTor)', zh: '观看 (PidTor)', pt: 'Assistir (PidTor)', bg: 'Гледай (PidTor)'
        },
        pidtor_seeds: { ru: 'Сиды', uk: 'Сіди', be: 'Сіды', en: 'Seeds', zh: '做种', pt: 'Seeds', bg: 'Сийдове' },
        pidtor_size:  { ru: 'Размер', uk: 'Розмір', be: 'Памер', en: 'Size', zh: '大小', pt: 'Tamanho', bg: 'Размер' },
        pidtor_settings_title: {
            ru: 'PidTor — торренты онлайн', uk: 'PidTor — торренти онлайн', be: 'PidTor — торэнты анлайн',
            en: 'PidTor — torrents online', zh: 'PidTor — 在线种子', pt: 'PidTor — torrents online', bg: 'PidTor — торенти онлайн'
        },
        pidtor_ts_note: {
            ru: 'Для просмотра используется TorrServer из раздела «TorrServer» (там задаются адрес, порт и логин/пароль).',
            uk: 'Для перегляду використовується TorrServer із розділу «TorrServer» (там задаються адреса, порт та логін/пароль).',
            be: 'Для прагляду выкарыстоўваецца TorrServer з раздзела «TorrServer» (там задаюцца адрас, порт і лагін/пароль).',
            en: 'Playback uses TorrServer from the "TorrServer" section (address, port and login/password are set there).',
            zh: '播放使用“TorrServer”部分中的 TorrServer（在那里设置地址、端口和登录/密码）。',
            pt: 'A reprodução usa o TorrServer da seção "TorrServer" (endereço, porta e login/senha são definidos lá).',
            bg: 'За възпроизвеждане се използва TorrServer от раздела "TorrServer" (там се задават адрес, порт и потребител/парола).'
        },
        pidtor_redapi_name: {
            ru: 'Адрес JacRed API', uk: 'Адреса JacRed API', be: 'Адрас JacRed API',
            en: 'JacRed API address', zh: 'JacRed API地址', pt: 'Endereço API JacRed', bg: 'Адрес на JacRed API'
        },
        pidtor_redapi_descr: {
            ru: 'Например: http://jac.red', uk: 'Наприклад: http://jac.red', be: 'Напрыклад: http://jac.red',
            en: 'Example: http://jac.red', zh: '例如: http://jac.red', pt: 'Exemplo: http://jac.red', bg: 'Пример: http://jac.red'
        },
        pidtor_apikey_name: { ru: 'API-ключ JacRed', uk: 'API-ключ JacRed', be: 'API-ключ JacRed', en: 'JacRed API key', zh: 'JacRed API密钥', pt: 'Chave API JacRed', bg: 'API ключ за JacRed' },
        pidtor_min_sid_name: { ru: 'Минимум сидов', uk: 'Мінімум сідів', be: 'Мінімум сідаў', en: 'Minimum seeds', zh: '最少做种数', pt: 'Mínimo de seeds', bg: 'Минимум сийдове' },
        pidtor_max_size_name: {
            ru: 'Макс. размер (ГБ, 0 = без лимита)', uk: 'Макс. розмір (ГБ, 0 = без ліміту)',
            be: 'Макс. памер (ГБ, 0 = без ліміту)', en: 'Max size (GB, 0 = no limit)',
            zh: '最大大小 (GB, 0 = 无限制)', pt: 'Tamanho máx. (GB, 0 = sem limite)', bg: 'Макс. размер (ГБ, 0 = без лимит)'
        },
        pidtor_sort_name: { ru: 'Сортировка', uk: 'Сортування', be: 'Сартаванне', en: 'Sort by', zh: '排序', pt: 'Ordenar por', bg: 'Сортиране' },
        pidtor_filter_name: { ru: 'Фильтр (включить)', uk: 'Фільтр (увімкнути)', be: 'Фільтр (уключыць)', en: 'Filter (include)', zh: '过滤（包含）', pt: 'Filtro (incluir)', bg: 'Филтър (включи)' },
        pidtor_filter_descr: {
            ru: 'Слова через запятую, напр.: 1080p, DUB', uk: 'Слова через кому, напр.: 1080p, DUB',
            be: 'Словы праз коску, напр.: 1080p, DUB', en: 'Comma-separated, e.g.: 1080p, DUB',
            zh: '逗号分隔，例如: 1080p, DUB', pt: 'Separado por vírgula, ex: 1080p, DUB', bg: 'Разделени със запетая, напр.: 1080p, DUB'
        },
        pidtor_clarify: {
            ru: 'Уточнить запрос', uk: 'Уточнити запит', be: 'Удакладніць запыт',
            en: 'Refine query', zh: '优化查询', pt: 'Refinar pesquisa', bg: 'Уточняване на заявката'
        },
        pidtor_query: { ru: 'Запрос', uk: 'Запит', be: 'Запыт', en: 'Query', zh: '查询', pt: 'Consulta', bg: 'Заявка' }
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
                    'M84.5,72.1L38.8,42.4l38-8.1l45.8,29.7L84.5,72.1z M10,88L2,50.2L47.8,80L10,88z" fill="white"/>' +
                '</svg>' +
            '</div>' +
            '<div class="settings-folder__name">#{pidtor_title}</div>' +
        '</div>'
    );
    var server_folder = Lampa.Settings.main().render().find('[data-component="server"]');
    if (server_folder.length) server_folder.after(field);
    else Lampa.Settings.main().render().find('.settings__body > div').append(field);
    Lampa.Settings.main().update();

    Lampa.Template.add('settings_pidtor',
        '<div>' +
            '<div class="settings-param-title"><span>#{pidtor_settings_title}</span></div>' +
            '<div class="settings-param__descr" style="padding:0 0 1.2em 0">#{pidtor_ts_note}</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_redapi" placeholder="#{pidtor_redapi_descr}">' +
                '<div class="settings-param__name">#{pidtor_redapi_name}</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">#{pidtor_redapi_descr}</div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_apikey" data-string="true" placeholder="API key">' +
                '<div class="settings-param__name">#{pidtor_apikey_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param-title"><span>#{filter_filtred}</span></div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_min_sid" placeholder="1">' +
                '<div class="settings-param__name">#{pidtor_min_sid_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_max_size" placeholder="0">' +
                '<div class="settings-param__name">#{pidtor_max_size_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="select" data-name="pidtor_sort">' +
                '<div class="settings-param__name">#{pidtor_sort_name}</div>' +
                '<div class="settings-param__value"></div>' +
            '</div>' +
            '<div class="settings-param selector" data-type="input" data-name="pidtor_filter" placeholder="#{pidtor_filter_descr}">' +
                '<div class="settings-param__name">#{pidtor_filter_name}</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">#{pidtor_filter_descr}</div>' +
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
        redapi:  Lampa.Storage.get('pidtor_redapi', 'http://jac.red'),
        apikey:  Lampa.Storage.get('pidtor_apikey', ''),
        minSid:  parseInt(Lampa.Storage.get('pidtor_min_sid', '1')) || 0,
        maxSize: parseInt(Lampa.Storage.get('pidtor_max_size', '0')) || 0,
        sort:    Lampa.Storage.get('pidtor_sort', 'size'),
        filter:  Lampa.Storage.get('pidtor_filter', '')
    };
}

// ============================================================
//  ПОИСК (один запрос / объединение нескольких / фильтр+сорт)
// ============================================================
function searchOne(query, cfg, onOk, onErr) {
    var base = cfg.redapi.replace(/\/+$/, '');
    // Шлём оба варианта имени параметра — страховка от регистра/совместимости
    var url = base + '/api/v2.0/indexers/all/results?apikey=' + encodeURIComponent(cfg.apikey) +
              '&Query=' + encodeURIComponent(query) + '&query=' + encodeURIComponent(query);
    Lampa.Network.timeout(15000);
    Lampa.Network.silent(url, function (data) {
        onOk((data && data.Results) ? data.Results : []);
    }, function (a, c) {
        onErr(Lampa.Network.errorDecode(a, c));
    });
}

function mergeResults(arrs) {
    var seen = {}, out = [];
    arrs.forEach(function (list) {
        (list || []).forEach(function (r) {
            var key = r.InfoHash || ((r.Title || '') + '|' + (r.Size || ''));
            if (!seen[key]) { seen[key] = 1; out.push(r); }
        });
    });
    return out;
}

function applyFilterSort(results, cfg) {
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
    var f = cfg.sort === 'sid' ? 'Seeders' : cfg.sort === 'date' ? 'PublishDate' :
            cfg.sort === 'title' ? 'Title' : 'Size';
    results.sort(function (a, b) {
        if (f === 'Title') return (a.Title || '').localeCompare(b.Title || '');
        return (b[f] || 0) - (a[f] || 0);
    });
    return results;
}

// queries — массив строк; результаты объединяются
function doSearch(queries, cfg, onDone, onAllError) {
    queries = (queries || []).filter(function (q) { return q && q.trim(); });
    if (!queries.length) { onDone([]); return; }
    var pending = queries.length, anyErr = null, collected = [];
    queries.forEach(function (q) {
        searchOne(q.trim(), cfg, function (list) {
            collected.push(list);
            if (--pending === 0) onDone(applyFilterSort(mergeResults(collected), cfg));
        }, function (err) {
            anyErr = err; collected.push([]);
            if (--pending === 0) {
                var m = applyFilterSort(mergeResults(collected), cfg);
                if (m.length) onDone(m); else onAllError(anyErr);
            }
        });
    });
}

// ============================================================
//  КАРТОЧКА РЕЗУЛЬТАТА (открытие — через движок Lampa.Torrent)
// ============================================================
function posterOf(movie) {
    if (movie.poster_path) return Lampa.TMDB.image('t/p/w300' + movie.poster_path);
    if (movie.poster) return movie.poster;
    if (movie.img) return movie.img;
    return '';
}

function createCard(item, movie) {
    var html =
        '<div class="torrent-item selector layer--visible layer--render">' +
            '<div class="torrent-item__title">' + Lampa.Utils.shortText(item.Title || '', 90) + '</div>' +
            '<div class="torrent-item__details">' +
                '<div class="torrent-item__tracker">' + (item.Tracker || '') + '</div>' +
                '<div class="torrent-item__seeds">#{pidtor_seeds}: <span>' + (item.Seeders || 0) + '</span></div>' +
                '<div class="torrent-item__grabs">#{pidtor_size}: <span>' + Lampa.Utils.bytesToSize(item.Size || 0) + '</span></div>' +
                '<div class="torrent-item__size">' + (item.PublishDate || '') + '</div>' +
            '</div>' +
        '</div>';
    var card = $(Lampa.Lang.translate(html));

    // Нормализуем под формат, который ожидает Lampa.Torrent (Jackett-совместимый)
    item.poster = posterOf(movie);
    if (!item.Link && item.MagnetUri) item.Link = item.MagnetUri;

    card.on('hover:enter', function () {
        var magnet = item.MagnetUri || item.Link || '';
        if (!magnet) { Lampa.Noty.show(Lampa.Lang.translate('pidtor_error')); return; }
        // magnet → add → файлы → выбор серии → /stream (всё внутри движка,
        // с учётом auth / внешнего плеера / tsport из настроек TorrServer)
        Lampa.Torrent.start(item, movie);
    });

    card.on('hover:long', function () {
        var enabled = Lampa.Controller.enabled().name;
        Lampa.Select.show({
            title: Lampa.Lang.translate('title_action'),
            items: [{ title: Lampa.Lang.translate('torrent_parser_add_to_mytorrents'), add: true }],
            onSelect: function (a) {
                if (a.add) {
                    Lampa.Torserver.add({
                        poster: posterOf(movie),
                        title: (movie.title || '') + ' / ' + (movie.original_title || ''),
                        link: item.MagnetUri || item.Link,
                        data: { lampa: true, movie: movie }
                    }, function () {
                        Lampa.Noty.show((movie.title || '') + ' - ' + Lampa.Lang.translate('torrent_parser_added_to_mytorrents'));
                    });
                }
                Lampa.Controller.toggle(enabled);
            },
            onBack: function () { Lampa.Controller.toggle(enabled); }
        });
    });

    return card;
}

// ============================================================
//  КОМПОНЕНТ
// ============================================================
function component(object) {
    var scroll = new Lampa.Scroll({ mask: true, over: true });
    var html = $('<div></div>');
    var head = null;
    var last = null;
    var results = [];
    var queryLabel = '';

    function buildQueries() {
        if (object.clarification && object.search) return [object.search];
        var m = object.movie || {};
        var q = [], a = m.original_title, b = m.title;
        if (a) q.push(a);
        if (b && b !== a) q.push(b);
        return q;
    }

    function clarify(value) {
        Lampa.Input.edit({
            title: Lampa.Lang.translate('pidtor_clarify'),
            value: value || ''
        }, function (val) {
            val = (val || '').trim();
            if (val) Lampa.Activity.replace({ search: val, clarification: true });
        });
    }

    function buildHead() {
        head = $(
            '<div class="explorer__files-head" style="display:flex;gap:.6em;align-items:center;margin:0 0 1em 0">' +
                '<div class="simple-button selector filter--back">' +
                    '<svg><use xlink:href="#sprite-backward"></use></svg>' +
                '</div>' +
                '<div class="simple-button selector filter--search">' +
                    '<svg><use xlink:href="#sprite-search"></use></svg>' +
                    '<div></div>' +
                '</div>' +
                '<div class="pidtor__query" style="opacity:.7;font-size:.9em"></div>' +
            '</div>'
        );
        head = $(Lampa.Lang.translate(head[0].outerHTML));
        head.find('.filter--back').on('hover:enter', function () { Lampa.Activity.backward(); });
        head.find('.filter--search').on('hover:enter', function () { clarify(object.search || queryLabel); });
        head.find('.pidtor__query').text(
            Lampa.Lang.translate('pidtor_query') + ': ' + queryLabel + ' (' + results.length + ')'
        );
        scroll.minus(head);
        html.append(head);
    }

    this.create = function () {
        var self = this;
        this.activity.loader(true);
        var cfg = getCfg();
        var queries = buildQueries();
        queryLabel = (object.clarification && object.search) ? object.search
                   : (queries.join(' / ') || (object.movie && object.movie.title) || '');

        doSearch(queries, cfg, function (data) {
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
        buildHead();
        if (!results.length) { this.empty(Lampa.Lang.translate('pidtor_empty')); return; }
        results.forEach(function (item) {
            var card = createCard(item, object.movie);
            card.on('hover:focus', function (e) {
                last = e.target;
                scroll.update($(e.target), true);
            });
            card.on('hover:hover', function (e) { last = e.target; Lampa.Navigator.focused(last); });
            scroll.append(card);
        });
        html.append(scroll.render());
    };

    this.empty = function (text) {
        if (head) html.append(head); // шапка с кнопкой уточнить нужна и при пустом результате
        var empty = new Lampa.Empty({
            descr: text,
            buttons: [{
                title: Lampa.Lang.translate('pidtor_clarify'),
                onEnter: function () { clarify(object.search || queryLabel); }
            }]
        });
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
            left: function () {
                if (Lampa.Navigator.canmove('left')) Lampa.Navigator.move('left');
                else Lampa.Activity.backward();
            },
            right: function () {
                if (Lampa.Navigator.canmove('right')) Lampa.Navigator.move('right');
                else if (head) head.find('.filter--search').trigger('hover:enter');
            },
            back: function () { Lampa.Activity.backward(); }
        });
        Lampa.Controller.toggle('content');
    };

    this.pause = function () {};
    this.stop = function () {};
    this.render = function () { return html; };
    this.destroy = function () { scroll.destroy(); html.remove(); results = null; head = null; };
}

// ============================================================
//  ЗАПУСК ПОИСКА
// ============================================================
function loadPidTor(object) {
    Lampa.Component.add('pidtor', component);
    Lampa.Activity.push({
        url: '',
        title: Lampa.Lang.translate('pidtor_title'),
        component: 'pidtor',
        search: object.search || object.title,
        clarification: object.clarification || false,
        movie: object,
        page: 1
    });
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
        onContextMenu: function () {
            return {
                name: Lampa.Lang.translate('pidtor_watch'),
                description: Lampa.Lang.translate('pidtor_search')
            };
        },
        onContextLauch: function (object) { loadPidTor(object); }
    };
    Lampa.Manifest.plugins = manifest;

    var buttonHtml =
        '<div class="full-start__button selector view--pidtor" data-subtitle="PidTor ' + mod_version + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 244 260" fill="none" ' +
                'width="24" height="24" style="vertical-align:middle">' +
                '<path d="M242,88v170H10V88h41l-38,38h37.1l38-38h38.4l-38,38h38.4l38-38h38.3l-38,38H204L242,88z ' +
                'M228.9,2l8,37.7L191.2,10L228.9,2z M160.6,56l-45.8-29.7l38-8.1l45.8,29.7L160.6,56z ' +
                'M84.5,72.1L38.8,42.4l38-8.1l45.8,29.7L84.5,72.1z M10,88L2,50.2L47.8,80L10,88z" fill="currentColor"/>' +
            '</svg>' +
            '<span>#{pidtor_title}</span>' +
        '</div>';

    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            var btn = $(Lampa.Lang.translate(buttonHtml));
            btn.on('hover:enter', function () { loadPidTor(e.data.movie); });
            var torrentBtn = e.object.activity.render().find('.view--torrent');
            if (torrentBtn.length) torrentBtn.after(btn);
            else {
                var playBtn = e.object.activity.render().find('.button--play');
                if (playBtn.length) playBtn.after(btn);
            }
        }
    });
}

if (window.appready) init();
else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
