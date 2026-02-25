/**
 * Voice Release Tracker - Плагин для Lampa
 * Версия: 1.5.0
 * Упрощённая версия
 */

(function() {
    'use strict';

    // ============================================
    // КОНФИГУРАЦИЯ
    // ============================================
    var CONFIG = {
        STORAGE_KEY: 'voice_release_tracking',
        CHECK_INTERVAL: 1000 * 60 * 15,
        VOICES: [
            'AniLibria', 'AniLibria TV', 'Studio Band', 'SHIZA Project', 'DreamCast',
            'JAM Club', 'AnimeVost', 'AniMedia', 'Kotafan', 'Gears Media',
            'SovietRomance', 'M603', 'AniStar', 'Tunel', 'Flarrow Films',
            'HDrezka', 'Rezka', 'Filmix', 'Kinobase', 'Lumex'
        ]
    };

    // ============================================
    // ХРАНИЛИЩЕ ДАННЫХ
    // ============================================
    function getTracking() {
        return Lampa.Storage.cache(CONFIG.STORAGE_KEY, 1000, []);
    }

    function saveTracking(data) {
        var tracking = getTracking();
        var existing = tracking.find(function(t) {
            return t.kinopoisk_id == data.kinopoisk_id;
        });
        if (existing) {
            Object.assign(existing, data);
        } else {
            tracking.push(data);
        }
        Lampa.Storage.set(CONFIG.STORAGE_KEY, tracking);
        return tracking;
    }

    function removeTracking(kinopoisk_id) {
        var tracking = getTracking();
        tracking = tracking.filter(function(t) {
            return t.kinopoisk_id != kinopoisk_id;
        });
        Lampa.Storage.set(CONFIG.STORAGE_KEY, tracking);
        return tracking;
    }

    // ============================================
    // ПРОВЕРКА НОВЫХ СЕРИЙ
    // ============================================
    function checkNewEpisodes() {
        var tracking = getTracking();
        if (tracking.length === 0) return;

        tracking.forEach(function(item) {
            if (item.kinopoisk_id) {
                var network = new Lampa.Reguest();
                network.timeout(10000);
                network.silent('https://api.lumex.space/sId/' + item.kinopoisk_id + '/mod/', function(response) {
                    try {
                        if (response && response.player && response.player.media) {
                            var latest = null;
                            response.player.media.forEach(function(media) {
                                if (media.seasons) {
                                    media.seasons.forEach(function(season) {
                                        if (season.episodes) {
                                            season.episodes.forEach(function(episode) {
                                                if (episode.media) {
                                                    episode.media.forEach(function(m) {
                                                        if (m.translation_name && m.translation_name.toLowerCase().includes(item.voice.toLowerCase())) {
                                                            latest = {
                                                                season: season.season_number || 1,
                                                                episode: episode.episode_number || 1
                                                            };
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                            if (latest) {
                                if (!item.last_episode || latest.season > item.last_episode.season ||
                                    (latest.season == item.last_episode.season && latest.episode > item.last_episode.episode)) {
                                    item.last_episode = latest;
                                    saveTracking(item);
                                    console.log('[VoiceRelease] Новая серия:', item.title, 'S' + latest.season + 'E' + latest.episode);
                                }
                            }
                        }
                    } catch (e) {}
                }, null, null, { cache: { life: 5 } });
            }
        });
    }

    // ============================================
    // МОДАЛЬНОЕ ОКНО ВЫБОРА ОЗВУЧКИ
    // ============================================
    function showVoiceSelector(card) {
        var tracking = getTracking();
        var existing = tracking.find(function(t) {
            return t.kinopoisk_id == card.kinopoisk_id;
        });
        var currentVoice = existing ? existing.voice : null;

        var items = [];
        CONFIG.VOICES.forEach(function(voice) {
            items.push({
                title: voice,
                subtitle: voice == currentVoice ? '✓ Отслеживается' : '',
                voice: voice,
                isCurrent: voice == currentVoice
            });
        });

        Lampa.Select.show({
            title: 'Отслеживание сериала',
            description: card.title,
            items: items,
            onSelect: function(item) {
                if (!item || !item.voice) return;

                if (item.isCurrent) {
                    removeTracking(card.kinopoisk_id);
                } else {
                    saveTracking({
                        kinopoisk_id: card.kinopoisk_id,
                        imdb_id: card.imdb_id,
                        title: card.title,
                        original_title: card.original_title,
                        poster: card.poster || '',
                        voice: item.voice,
                        last_episode: null,
                        added_at: Date.now()
                    });
                }
                setTimeout(function() {
                    addButtonToCard();
                }, 300);
            }
        });
    }

    // ============================================
    // ДОБАВЛЕНИЕ КНОПКИ НА КАРТОЧКУ
    // ============================================
    function addButtonToCard() {
        var activity = Lampa.Activity.active();
        if (!activity || !activity.card) return;

        var card = activity.card;
        if (card.type != 'tv' && card.type != 'Scripted' && !card.number_of_seasons) return;

        var tracking = getTracking();
        var tracked = tracking.find(function(t) {
            return t.kinopoisk_id == card.kinopoisk_id;
        });

        $('.voice-release-btn').remove();

        var btn = $('<div class="full-start__button selector voice-release-btn">' +
            '<svg width="24" height="32" viewBox="0 0 25 30" fill="none">' +
            '<path d="M6 24C6.3 27.4 9.1 30 12.5 30C15.9 30 18.7 27.4 19 24H16C15.7 25.7 14.3 27 12.5 27C10.7 27 9.3 25.7 9 24H6Z" fill="currentColor"/>' +
            '<path d="M3.8 14.6V10.3C3.8 5.4 7.7 1.5 12.5 1.5C17.3 1.5 21.2 5.4 21.2 10.3V14.6C21.2 15.8 21.5 17.1 22.2 18.1L23.1 19.4C24.2 21.2 22.9 23.5 20.9 23.5H4.1C2.1 23.5 0.8 21.2 1.9 19.4L2.8 18.1C3.5 17.1 3.8 15.8 3.8 14.6Z" stroke="currentColor" stroke-width="2.6"/>' +
            '</svg>' +
            '<span>' + (tracked ? '✓ ' + tracked.voice : 'Отслеживать') + '</span>' +
            '</div>');

        btn.on('hover:click', function() {
            showVoiceSelector(card);
        });

        var buttons = $('.full-start-new__buttons, .full-start__buttons').first();
        if (buttons.length) {
            buttons.append(btn);
        }
    }

    // ============================================
    // СТРАНИЦА ПОДПИСОК
    // ============================================
    function showSubscriptionsPage() {
        var tracking = getTracking();

        if (tracking.length === 0) {
            Lampa.Noty.show({
                title: 'Мои подписки',
                description: 'Нет отслеживаемых сериалов',
                time: 3000
            });
            return;
        }

        var items = [];
        tracking.forEach(function(t) {
            var status = t.last_episode ?
                'S' + t.last_episode.season + ':E' + t.last_episode.episode :
                'Ожидание...';

            items.push({
                title: t.title,
                subtitle: t.voice + ' • ' + status,
                kinopoisk_id: t.kinopoisk_id,
                poster: t.poster
            });
        });

        Lampa.Select.show({
            title: 'Мои подписки',
            description: tracking.length + ' сериал(ов)',
            items: items,
            onSelect: function(item) {
                if (item && item.kinopoisk_id) {
                    Lampa.Activity.push({
                        url: 'full/' + item.kinopoisk_id,
                        id: item.kinopoisk_id,
                        type: 'full'
                    });
                }
            }
        });
    }

    // ============================================
    // ДОБАВЛЕНИЕ ПУНКТА В МЕНЮ
    // ============================================
    function addMenuItem() {
        if ($('.menu__item:contains("Мои подписки")').length > 0) return;

        var btn = $('<li class="menu__item selector">' +
            '<div class="menu__ico">' +
            '<svg width="39" height="39" viewBox="0 0 39 39" fill="none">' +
            '<rect x="1.9" y="13.1" width="35.5" height="23.9" rx="4.5" stroke="currentColor" stroke-width="3"/>' +
            '<rect x="4.7" y="5.9" width="29.8" height="3" rx="1.5" fill="currentColor"/>' +
            '<rect x="7.6" y="0.2" width="24.1" height="3" rx="1.5" fill="currentColor"/>' +
            '<rect x="23.4" y="19" width="3.1" height="12.3" rx="1.5" transform="rotate(30 23.4 19)" fill="currentColor"/>' +
            '<rect x="13.2" y="25.3" width="3.1" height="8.3" rx="1.5" transform="rotate(-45 13.2 25.3)" fill="currentColor"/>' +
            '</svg>' +
            '</div>' +
            '<div class="menu__text">Мои подписки</div>' +
            '</li>');

        btn.on('hover:enter', function() {
            showSubscriptionsPage();
        });

        $('.menu .menu__list').first().append(btn);
    }

    // ============================================
    // ПОДПИСКА НА СОБЫТИЯ
    // ============================================
    function subscribeToEvents() {
        Lampa.Listener.follow('full', function(e) {
            if (e.type == 'complite') {
                setTimeout(function() {
                    addButtonToCard();
                }, 500);
            }
        });
    }

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================
    function init() {
        console.log('[VoiceRelease] Запуск плагина v1.5.0');

        // Сразу добавляем пункт меню
        setTimeout(addMenuItem, 1000);

        // Подписка на события
        subscribeToEvents();

        // Первая проверка через 5 секунд
        setTimeout(checkNewEpisodes, 5000);

        // Регулярная проверка
        setInterval(checkNewEpisodes, CONFIG.CHECK_INTERVAL);

        // Экспорт API
        window.voice_release_plugin = {
            add: function(card, voice) {
                saveTracking({
                    kinopoisk_id: card.kinopoisk_id,
                    imdb_id: card.imdb_id,
                    title: card.title,
                    poster: card.poster,
                    voice: voice,
                    added_at: Date.now()
                });
            },
            remove: removeTracking,
            getTracking: getTracking,
            checkNow: checkNewEpisodes,
            showSubscriptions: showSubscriptionsPage,
            version: '1.5.0'
        };

        console.log('[VoiceRelease] Плагин готов');
    }

    // Запуск
    if (window.appready) {
        init();
    } else {
        document.addEventListener('appready', init);
    }
})();
