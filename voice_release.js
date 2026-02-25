/**
 * Voice Release Tracker - Плагин для Lampa
 * Отслеживание выхода новых серий в выбранной озвучке
 * 
 * Установка: Добавить URL плагина в настройки Lampa -> Плагины
 */

(function() {
    'use strict';

    // ============================================
    // КОНФИГУРАЦИЯ
    // ============================================
    var CONFIG = {
        STORAGE_KEY: 'voice_release_tracking',
        NOTIFICATIONS_KEY: 'voice_release_notifications',
        CHECK_INTERVAL: 1000 * 60 * 15,  // 15 минут между проверками
        CHECK_INTERVAL_ACTIVE: 1000 * 60 * 5,  // 5 минут когда приложение активно
        IDLE_TIMEOUT: 1000 * 60 * 3,  // 3 минуты бездействия для перехода на медленную проверку
        PROVIDERS: ['lumex', 'kodik', 'collaps'],  // Балансёры для проверки
        VOICES: [  // Известные озвучки для автоопределения
            'AniLibria', 'AniLibria TV', 'Studio Band', 'SHIZA Project', 'DreamCast',
            'JAM Club', 'AnimeVost', 'AniMedia', 'Kotafan', 'Gears Media',
            'SovietRomance', 'M603', 'AniStar', 'Tunel', 'Flarrow Films',
            'HDrezka', 'Rezka', 'Filmix', 'Kinobase', 'Lumex'
        ]
    };

    // ============================================
    // ПЕРЕМЕННЫЕ СОСТОЯНИЯ
    // ============================================
    var checkTimerId = null;
    var lastActivityTime = Date.now();
    var isActive = false;  // Активно ли приложение сейчас

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

    function getNotifications() {
        return Lampa.Storage.cache(CONFIG.NOTIFICATIONS_KEY, 100, []);
    }

    function addNotification(data) {
        var notifications = getNotifications();
        notifications.unshift({
            kinopoisk_id: data.kinopoisk_id,
            title: data.title,
            voice: data.voice,
            season: data.season,
            episode: data.episode,
            poster: data.poster,
            timestamp: Date.now()
        });
        // Храним последние 100 уведомлений
        notifications = notifications.slice(0, 100);
        Lampa.Storage.set(CONFIG.NOTIFICATIONS_KEY, notifications);
    }

    // ============================================
    // API ЗАПРОСЫ К БАЛАНСЁРАМ
    // ============================================
    function buildProviderUrl(item) {
        var urls = [];

        // Lumex
        if (item.provider == 'lumex' || !item.provider) {
            urls.push({
                provider: 'lumex',
                url: 'https://api.lumex.space/sId/' + item.kinopoisk_id + '/mod/'
            });
        }

        // Kodik
        if (item.provider == 'kodik') {
            urls.push({
                provider: 'kodik',
                url: 'https://kodik.info/api/serials?kinopoisk_id=' + item.kinopoisk_id
            });
        }

        // Collaps
        if (item.provider == 'collaps') {
            urls.push({
                provider: 'collaps',
                url: 'https://collaps.top/api/serials?kp=' + item.kinopoisk_id
            });
        }

        return urls;
    }

    function checkProvider(providerData, voiceName, callback) {
        var network = new Lampa.Request();
        network.timeout(10000);  // 10 секунд таймаут

        network.silent(providerData.url, function(response) {
            try {
                var latest = extractLatestEpisode(response, providerData.provider, voiceName);
                if (latest) {
                    callback(latest, providerData.provider);
                } else {
                    callback(null, providerData.provider);
                }
            } catch (e) {
                console.log('[VoiceRelease] Error parsing response:', e);
                callback(null, providerData.provider);
            }
        }, function(error) {
            console.log('[VoiceRelease] Provider error (' + providerData.provider + '):', error);
            callback(null, providerData.provider);
        }, null, {
            cache: { life: 5 }  // Кэш 5 минут
        });
    }

    function extractLatestEpisode(response, provider, voiceName) {
        try {
            if (provider == 'lumex') {
                // Формат Lumex: { player: { media: [{ seasons: [{ episodes: [...] }] }] } }
                if (!response || !response.player || !response.player.media) {
                    return null;
                }

                var allEpisodes = [];

                response.player.media.forEach(function(media) {
                    if (media.seasons) {
                        media.seasons.forEach(function(season) {
                            if (season.episodes) {
                                season.episodes.forEach(function(episode) {
                                    if (episode.media) {
                                        episode.media.forEach(function(m) {
                                            if (m.translation_name && 
                                                m.translation_name.toLowerCase().includes(voiceName.toLowerCase())) {
                                                allEpisodes.push({
                                                    season: season.season_number || season.id || 1,
                                                    episode: episode.episode_number || episode.id,
                                                    title: episode.name || 'Серия ' + episode.episode_number
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

                if (allEpisodes.length > 0) {
                    // Сортируем по сезону и серии
                    allEpisodes.sort(function(a, b) {
                        if (a.season != b.season) return a.season - b.season;
                        return a.episode - b.episode;
                    });
                    return allEpisodes[allEpisodes.length - 1];
                }
            }

            if (provider == 'kodik') {
                // Формат Kodik: [{ episodes: { aired: X, total: Y }, translations: [...] }]
                if (!response || !Array.isArray(response)) {
                    return null;
                }

                for (var i = 0; i < response.length; i++) {
                    var item = response[i];
                    if (item.translations) {
                        for (var j = 0; j < item.translations.length; j++) {
                            var t = item.translations[j];
                            if (t.name && t.name.toLowerCase().includes(voiceName.toLowerCase())) {
                                return {
                                    season: 1,
                                    episode: item.episodes ? item.episodes.aired || 0 : 0,
                                    title: 'Серия ' + (item.episodes ? item.episodes.aired : 0)
                                };
                            }
                        }
                    }
                }
            }

            if (provider == 'collaps') {
                // Формат Collaps: похож на Kodik
                if (!response || !response.data) {
                    return null;
                }

                if (response.data.translations) {
                    for (var i = 0; i < response.data.translations.length; i++) {
                        var t = response.data.translations[i];
                        if (t.name && t.name.toLowerCase().includes(voiceName.toLowerCase())) {
                            return {
                                season: 1,
                                episode: response.data.episodes_aired || 0,
                                title: 'Серия ' + (response.data.episodes_aired || 0)
                            };
                        }
                    }
                }
            }

            return null;
        } catch (e) {
            console.log('[VoiceRelease] Extract error:', e);
            return null;
        }
    }

    // ============================================
    // ПРОВЕРКА НОВЫХ СЕРИЙ
    // ============================================
    function checkNewEpisodes() {
        var tracking = getTracking();

        if (tracking.length === 0) {
            return;
        }

        tracking.forEach(function(item) {
            var urls = buildProviderUrl(item);

            urls.forEach(function(providerData) {
                checkProvider(providerData, item.voice, function(latest, provider) {
                    if (latest && latest.episode > 0) {
                        // Проверяем, есть ли новая серия
                        if (!item.last_episode || 
                            latest.season > item.last_episode.season ||
                            (latest.season == item.last_episode.season && 
                             latest.episode > item.last_episode.episode)) {

                            // Новая серия найдена!
                            item.last_episode = latest;
                            item.last_check = Date.now();
                            item.has_new_episode = true;
                            item.provider = provider;

                            saveTracking(item);
                            addNotification({
                                kinopoisk_id: item.kinopoisk_id,
                                title: item.title,
                                voice: item.voice,
                                season: latest.season,
                                episode: latest.episode,
                                poster: item.poster
                            });

                            // Показываем уведомление
                            showNotification(item, latest);

                            console.log('[VoiceRelease] Новая серия:', item.title, 
                                'S' + latest.season + 'E' + latest.episode, 
                                '(' + item.voice + ')');
                        } else {
                            // Новых серий нет, обновляем время проверки
                            item.last_check = Date.now();
                            saveTracking(item);
                        }
                    }
                });
            });
        });
    }

    // ============================================
    // УВЕДОМЛЕНИЯ
    // ============================================
    function showNotification(item, episode) {
        var message = item.title + ' — ' + item.voice + 
                     ', Сезон ' + episode.season + ', Серия ' + episode.episode;

        Lampa.Noty.show({
            title: '🆕 Новая серия!',
            description: message,
            image: item.poster || '',
            time: 7000,
            onClick: function() {
                // Переход к сериалу
                if (item.kinopoisk_id) {
                    Lampa.Activity.action({
                        url: 'full/' + item.kinopoisk_id,
                        id: item.kinopoisk_id,
                        type: 'full'
                    });
                }
            }
        });
    }

    // ============================================
    // ИНТЕРФЕЙС: КНОПКА "ОТСЛЕЖИВАТЬ"
    // ============================================
    function addTrackButton() {
        // Проверяем, на странице ли сериала
        var activity = Lampa.Activity.active();
        if (!activity || !activity.card) {
            return;
        }

        var card = activity.card;
        var render = activity.render();

        // Проверяем, сериал ли это
        var isSeries = card.type == 'tv' || card.number_of_seasons > 0;
        if (!isSeries) {
            return;
        }

        // Проверяем, не добавлен ли уже сериал в отслеживаемые
        var tracking = getTracking();
        var alreadyTracked = tracking.find(function(t) {
            return t.kinopoisk_id == card.kinopoisk_id || t.imdb_id == card.imdb_id;
        });

        if (alreadyTracked) {
            // Уже отслеживается - показываем кнопку "Удалить"
            addRemoveButton(render, alreadyTracked);
        } else {
            // Не отслеживается - показываем кнопку "Добавить"
            addAddButton(render, card);
        }
    }

    function addAddButton(render, card) {
        // Удаляем старую кнопку если есть
        $('.voice-release-track-btn', render).remove();

        var button = $('<div class="voice-release-track-btn" style="' +
            'display: inline-flex; ' +
            'align-items: center; ' +
            'justify-content: center; ' +
            'padding: 12px 24px; ' +
            'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); ' +
            'border-radius: 8px; ' +
            'color: white; ' +
            'font-size: 14px; ' +
            'font-weight: 600; ' +
            'cursor: pointer; ' +
            'margin: 15px 10px 15px 0; ' +
            'transition: transform 0.2s, box-shadow 0.2s; ' +
            '">' +
            '🔔 Отслеживать выход серий' +
            '</div>');

        button.on('hover:enter', function() {
            button.css({
                'transform': 'scale(1.05)',
                'box-shadow': '0 4px 15px rgba(102, 126, 234, 0.4)'
            });
        }).on('hover:leave', function() {
            button.css({
                'transform': 'scale(1)',
                'box-shadow': 'none'
            });
        }).on('hover:click', function() {
            showVoiceSelector(card);
        });

        // Добавляем кнопку после заголовка
        var title = $('.card__title, .info__title', render).first();
        if (title.length) {
            title.after(button);
        }
    }

    function addRemoveButton(render, trackedItem) {
        // Удаляем старую кнопку если есть
        $('.voice-release-track-btn', render).remove();

        var button = $('<div class="voice-release-track-btn" style="' +
            'display: inline-flex; ' +
            'align-items: center; ' +
            'justify-content: center; ' +
            'padding: 12px 24px; ' +
            'background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); ' +
            'border-radius: 8px; ' +
            'color: white; ' +
            'font-size: 14px; ' +
            'font-weight: 600; ' +
            'cursor: pointer; ' +
            'margin: 15px 10px 15px 0; ' +
            '">' +
            '❌ Отключить отслеживание' +
            '</div>');

        button.on('hover:enter', function() {
            button.css('transform', 'scale(1.05)');
        }).on('hover:leave', function() {
            button.css('transform', 'scale(1)');
        }).on('hover:click', function() {
            Lampa.Modal.open({
                title: 'Отключить отслеживание',
                html: '<p>Вы действительно хотите отключить отслеживание сериала<br><b>' + 
                      trackedItem.title + '</b>?</p>',
                size: 'medium',
                buttons: [
                    {
                        text: 'Отмена',
                        onClick: function() {}
                    },
                    {
                        text: 'Отключить',
                        onClick: function() {
                            removeTracking(trackedItem.kinopoisk_id);
                            button.remove();
                            Lampa.Noty.show({
                                title: 'Отслеживание отключено',
                                time: 3000
                            });
                        }
                    }
                ]
            });
        });

        // Добавляем кнопку после заголовка
        var title = $('.card__title, .info__title', render).first();
        if (title.length) {
            title.after(button);
        }
    }

    // ============================================
    // МОДАЛЬНОЕ ОКНО ВЫБОРА ОЗВУЧКИ
    // ============================================
    function showVoiceSelector(card) {
        var voices = CONFIG.VOICES;

        var items = voices.map(function(voice) {
            return {
                title: voice,
                voice: voice
            };
        });

        Lampa.Modal.open({
            title: 'Выберите озвучку для отслеживания',
            html: '<p style="margin-bottom: 20px;">' + card.title + '</p>' +
                  '<p style="color: #888; font-size: 13px;">' +
                  'Плагин будет проверять выход новых серий в выбранной озвучке</p>',
            size: 'medium',
            items: items,
            onSelect: function(item) {
                // Сохраняем в отслеживаемые
                var trackingData = {
                    kinopoisk_id: card.kinopoisk_id,
                    imdb_id: card.imdb_id,
                    title: card.title || card.name || card.original_title,
                    original_title: card.original_title,
                    poster: card.poster,
                    voice: item.voice,
                    provider: null,  // Будет определён при первой проверке
                    last_episode: null,
                    last_check: Date.now(),
                    has_new_episode: false,
                    added_at: Date.now()
                };

                saveTracking(trackingData);

                Lampa.Noty.show({
                    title: '✅ Отслеживание включено',
                    description: 'Сериал "' + card.title + '" добавлен в список отслеживаемых',
                    time: 4000
                });

                // Перерисовываем кнопку
                setTimeout(function() {
                    addTrackButton();
                }, 500);
            }
        });
    }

    // ============================================
    // БЕЙДЖ НА КАРТОЧКЕ СЕРИАЛА
    // ============================================
    function addBadgeToCard(movie, render) {
        var tracking = getTracking();
        var item = tracking.find(function(t) {
            return (t.kinopoisk_id == movie.kinopoisk_id || 
                    t.imdb_id == movie.imdb_id) && 
                   t.has_new_episode === true;
        });

        if (item && item.last_episode) {
            // Удаляем старый бейдж если есть
            $('.voice-release-badge', render).remove();

            var badge = $('<div class="voice-release-badge" style="' +
                'display: inline-block; ' +
                'padding: 6px 12px; ' +
                'background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); ' +
                'border-radius: 6px; ' +
                'color: white; ' +
                'font-size: 12px; ' +
                'font-weight: 600; ' +
                'margin-left: 10px; ' +
                '">' +
                '🆕 S' + item.last_episode.season + ':E' + item.last_episode.episode + 
                ' (' + item.voice + ')' +
                '</div>');

            var title = $('.card__title, .info__title', render).first();
            if (title.length) {
                title.append(badge);
            }

            // Сбрасываем флаг после отображения
            item.has_new_episode = false;
            saveTracking(item);
        }
    }

    // ============================================
    // СТРАНИЦА СПИСКА УВЕДОМЛЕНИЙ
    // ============================================
    function showNotificationsPage() {
        var notifications = getNotifications();

        if (notifications.length === 0) {
            Lampa.Modal.open({
                title: 'Уведомления',
                html: '<p style="text-align: center; color: #888; padding: 40px;">' +
                      'Нет новых уведомлений</p>',
                size: 'large'
            });
            return;
        }

        var items = notifications.map(function(n) {
            return {
                title: n.title + ' — S' + n.season + ':E' + n.episode + 
                       ' (' + n.voice + ')',
                description: new Date(n.timestamp).toLocaleString(),
                kinopoisk_id: n.kinopoisk_id,
                poster: n.poster
            };
        });

        Lampa.Modal.open({
            title: '🔔 Уведомления о новых сериях',
            size: 'large',
            items: items,
            onSelect: function(item) {
                if (item.kinopoisk_id) {
                    Lampa.Activity.action({
                        url: 'full/' + item.kinopoisk_id,
                        id: item.kinopoisk_id,
                        type: 'full'
                    });
                }
            }
        });
    }

    // ============================================
    // СТРАНИЦА СПИСКА ОТСЛЕЖИВАЕМЫХ
    // ============================================
    function showTrackingPage() {
        var tracking = getTracking();

        if (tracking.length === 0) {
            Lampa.Modal.open({
                title: 'Отслеживаемые сериалы',
                html: '<p style="text-align: center; color: #888; padding: 40px;">' +
                      'Вы ещё не отслеживаете ни один сериал</p>',
                size: 'large'
            });
            return;
        }

        var items = tracking.map(function(t) {
            var status = t.last_episode ? 
                'S' + t.last_episode.season + ':E' + t.last_episode.episode : 
                'Ожидание...';
            return {
                title: t.title,
                description: t.voice + ' — ' + status,
                kinopoisk_id: t.kinopoisk_id,
                poster: t.poster
            };
        });

        Lampa.Modal.open({
            title: '📺 Отслеживаемые сериалы',
            size: 'large',
            items: items,
            onSelect: function(item) {
                if (item.kinopoisk_id) {
                    Lampa.Activity.action({
                        url: 'full/' + item.kinopoisk_id,
                        id: item.kinopoisk_id,
                        type: 'full'
                    });
                }
            },
            onContextMenu: function(item, element) {
                // Контекстное меню для удаления
                Lampa.ContextMenu.open({
                    items: [
                        {
                            text: 'Отключить отслеживание',
                            onClick: function() {
                                removeTracking(item.kinopoisk_id);
                                showTrackingPage();  // Обновляем список
                                Lampa.Noty.show({
                                    title: 'Удалено из отслеживаемых',
                                    time: 3000
                                });
                            }
                        }
                    ]
                });
            }
        });
    }

    // ============================================
    // ДОБАВЛЕНИЕ КНОПКИ В МЕНЮ LAMPA
    // ============================================
    function addMenuButton() {
        // Добавляем кнопку в шапку Lampa (если есть Head API)
        if (Lampa.Head && typeof Lampa.Head.addIcon === 'function') {
            // Кнопка уведомлений
            Lampa.Head.addIcon('🔔', function() {
                showNotificationsPage();
            });

            // Кнопка списка отслеживаемых
            Lampa.Head.addIcon('📺', function() {
                showTrackingPage();
            });
        }
    }

    // ============================================
    // ПОДПИСКА НА СОБЫТИЯ
    // ============================================
    function subscribeToEvents() {
        // Подписка на рендеринг карточки (для кнопки и бейджа)
        Lampa.Listener.follow('full', function(e) {
            if (e.type == 'complite') {
                // Добавляем кнопку отслеживания
                setTimeout(function() {
                    addTrackButton();
                }, 500);

                // Добавляем бейдж если есть новые серии
                if (e.data && e.data.movie) {
                    addBadgeToCard(e.data.movie, e.object.activity.render());
                }
            }
        });

        // Отслеживание активности приложения
        document.addEventListener('mousemove', updateActivityTime);
        document.addEventListener('keydown', updateActivityTime);
        document.addEventListener('touchstart', updateActivityTime);
        document.addEventListener('click', updateActivityTime);
    }

    // ============================================
    // ОТСЛЕЖИВАНИЕ АКТИВНОСТИ
    // ============================================
    function updateActivityTime() {
        lastActivityTime = Date.now();
        isActive = true;
    }

    function trackActivity() {
        // Проверяем активность каждые 30 секунд
        setInterval(function() {
            var idleTime = Date.now() - lastActivityTime;
            
            if (idleTime > CONFIG.IDLE_TIMEOUT) {
                if (isActive) {
                    console.log('[VoiceRelease] Приложение перешло в режим ожидания');
                    isActive = false;
                    // Перезапускаем таймер с большим интервалом
                    startSmartTimer();
                }
            } else {
                if (!isActive) {
                    console.log('[VoiceRelease] Приложение активно, учащаем проверки');
                    isActive = true;
                    startSmartTimer();
                }
            }
        }, 30000);

        // Считаем приложение активным при запуске
        isActive = true;
        console.log('[VoiceRelease] Отслеживание активности запущено');
    }

    // ============================================
    // УМНЫЙ ТАЙМЕР ПРОВЕРОК
    // ============================================
    function startSmartTimer() {
        // Очищаем предыдущий таймер
        if (checkTimerId) {
            clearTimeout(checkTimerId);
        }

        // Выбираем интервал в зависимости от активности
        var interval = isActive ? CONFIG.CHECK_INTERVAL_ACTIVE : CONFIG.CHECK_INTERVAL;

        console.log('[VoiceRelease] Таймер проверок: ' + (interval / 1000 / 60) + ' мин. (активность: ' + isActive + ')');

        // Создаём новый таймер
        checkTimerId = setInterval(function() {
            checkNewEpisodes();
        }, interval);
    }

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================
    function init() {
        console.log('[VoiceRelease] Plugin initializing...');

        // Подписка на события
        subscribeToEvents();

        // Добавление кнопок в меню
        setTimeout(function() {
            addMenuButton();
        }, 2000);

        // Первая проверка через 3 секунды
        setTimeout(function() {
            checkNewEpisodes();
        }, 3000);

        // Отслеживание активности пользователя
        trackActivity();

        // Запуск умного таймера проверок
        startSmartTimer();

        // Экспорт API для внешнего использования
        window.voice_release_plugin = {
            // Добавить сериал в отслеживаемые
            add: function(card, voice) {
                var trackingData = {
                    kinopoisk_id: card.kinopoisk_id,
                    imdb_id: card.imdb_id,
                    title: card.title || card.name || card.original_title,
                    original_title: card.original_title,
                    poster: card.poster,
                    voice: voice,
                    provider: null,
                    last_episode: null,
                    last_check: Date.now(),
                    has_new_episode: false,
                    added_at: Date.now()
                };
                saveTracking(trackingData);
            },

            // Удалить из отслеживаемых
            remove: function(kinopoisk_id) {
                removeTracking(kinopoisk_id);
            },

            // Получить список отслеживаемых
            getTracking: getTracking,

            // Получить уведомления
            getNotifications: getNotifications,

            // Принудительная проверка
            checkNow: checkNewEpisodes,

            // Показать страницу уведомлений
            showNotifications: showNotificationsPage,

            // Показать список отслеживаемых
            showTracking: showTrackingPage,

            // Версия плагина
            version: '1.0.0'
        };

        console.log('[VoiceRelease] Plugin initialized successfully!');
        console.log('[VoiceRelease] Use window.voice_release_plugin for API access');
    }

    // Запуск после готовности Lampa
    if (window.appready) {
        init();
    } else {
        document.addEventListener('appready', init);
    }

})();
