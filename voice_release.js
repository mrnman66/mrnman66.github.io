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
        // Используем Lampa.Reguest (с буквой 'g' - это правильное название в Lampa)
        var network = new Lampa.Reguest();
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
    // ИНТЕРФЕЙС: КНОПКА "ОТСЛЕЖИВАТЬ"
    // ============================================
    function addTrackButton() {
        console.log('[VoiceRelease] addTrackButton вызвана');
        
        // Получаем текущую активность
        var activity = Lampa.Activity.active();
        console.log('[VoiceRelease] Activity:', !!activity);
        
        if (!activity) {
            console.log('[VoiceRelease] Нет активной активности');
            return;
        }

        // Проверяем, есть ли activity.activity (для совместимости)
        if (!activity.activity) {
            console.log('[VoiceRelease] Нет activity.activity, пробуем напрямую activity');
        }

        var render = activity.activity ? activity.activity.render() : null;
        console.log('[VoiceRelease] Render:', !!render);
        
        // Проверяем, есть ли card
        var card = activity.card;
        console.log('[VoiceRelease] Card:', !!card, card ? card.title : 'нет данных');
        
        if (!card) {
            console.log('[VoiceRelease] Нет карточки в активности');
            return;
        }

        // Проверяем, сериал ли это (разные типы в Lampa)
        var isSeries = card.type == 'tv' || card.type == 'Scripted' || card.number_of_seasons > 0;
        console.log('[VoiceRelease] Это сериал:', isSeries, 'type:', card.type);
        
        if (!isSeries) {
            console.log('[VoiceRelease] Это не сериал, пропускаем');
            return;
        }

        // Проверяем, не добавлен ли уже сериал в отслеживаемые
        var tracking = getTracking();
        var alreadyTracked = tracking.find(function(t) {
            return t.kinopoisk_id == card.kinopoisk_id || t.imdb_id == card.imdb_id;
        });
        console.log('[VoiceRelease] Уже отслеживается:', !!alreadyTracked, alreadyTracked ? '(' + alreadyTracked.voice + ')' : '');

        // Показываем кнопку "Отслеживать" (всегда одну и ту же)
        console.log('[VoiceRelease] Показываем кнопку "Отслеживать"');
        addTrackButtonInternal(render, card, alreadyTracked);
    }

    function addTrackButtonInternal(render, card, alreadyTracked) {
        // Удаляем старую кнопку если есть
        $('.voice-release-track-btn, .button--voice-release').remove();

        // Определяем текст и статус кнопки
        var buttonText = alreadyTracked ? 'Отслеживать ✓' : 'Отслеживать';
        var buttonClass = alreadyTracked ? 'button--voice-release tracked' : 'button--voice-release';

        // Создаём кнопку в стиле кнопок Lampa
        var button = $('<div class="full-start__button selector ' + buttonClass + '">' +
            '<svg width="24" height="32" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>' +
            '<path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.6"/>' +
            '</svg>' +
            '<span>' + buttonText + (alreadyTracked ? ' (' + alreadyTracked.voice + ')' : '') + '</span>' +
            '</div>');

        // Обработчики событий Lampa
        button.on('hover:enter', function() {
            console.log('[VoiceRelease] Hover:enter на кнопке');
        }).on('hover:leave', function() {
            console.log('[VoiceRelease] Hover:leave на кнопке');
        }).on('hover:click', function() {
            console.log('[VoiceRelease] Hover:click на кнопке - открытие выбора озвучки');
            showVoiceSelector(card);
        }).on('click', function() {
            console.log('[VoiceRelease] Click на кнопке - открытие выбора озвучки');
            showVoiceSelector(card);
        });

        // Ищем блок с кнопками в карточке
        var buttonsContainer = $('.full-start-new__buttons, .full-start__buttons, .buttons--container', render).first();
        console.log('[VoiceRelease] Найдено контейнер кнопок:', buttonsContainer.length);
        
        if (buttonsContainer.length) {
            // Ищем кнопку "Смотреть" и вставляем после неё
            var playButton = $('.button--play', buttonsContainer).first();
            
            if (playButton.length) {
                playButton.after(button);
                console.log('[VoiceRelease] Кнопка "' + buttonText + '" добавлена после кнопки "Смотреть"');
            } else {
                buttonsContainer.append(button);
                console.log('[VoiceRelease] Кнопка "' + buttonText + '" добавлена в конец блока кнопок');
            }
        } else {
            console.log('[VoiceRelease] Не найден контейнер кнопок');
        }
    }

    // ============================================
    // МОДАЛЬНОЕ ОКНО ВЫБОРА ОЗВУЧКИ
    // ============================================
    function showVoiceSelector(card) {
        var voices = CONFIG.VOICES;
        
        // Проверяем, есть ли уже выбранная озвучка для этого сериала
        var tracking = getTracking();
        var existingItem = tracking.find(function(t) {
            return t.kinopoisk_id == card.kinopoisk_id || t.imdb_id == card.imdb_id;
        });
        var currentVoice = existingItem ? existingItem.voice : null;
        
        console.log('[VoiceRelease] showVoiceSelector, текущая озвучка:', currentVoice);

        var items = [];
        voices.forEach(function(voice) {
            items.push({
                title: voice,
                subtitle: voice == currentVoice ? '✓ Отслеживается' : '',
                voice: voice,
                isCurrent: voice == currentVoice
            });
        });

        Lampa.Select.show({
            title: 'Отслеживание сериала',
            description: card.title + (currentVoice ? '\nТекущая: ' + currentVoice : ''),
            items: items,
            onSelect: function(item) {
                if (!item || !item.voice) return;

                if (item.isCurrent) {
                    // Уже отслеживается - удаляем из отслеживания
                    removeTracking(card.kinopoisk_id);
                } else {
                    // Ещё не отслеживается - добавляем
                    // Получаем полный URL постера через Lampa TMDB
                    var posterUrl = card.poster || '';
                    if (posterUrl && posterUrl.indexOf('http') !== 0 && posterUrl.indexOf('/') === 0) {
                        posterUrl = 'https://image.tmdb.org/t/p/w500' + posterUrl;
                    }
                    
                    var trackingData = {
                        kinopoisk_id: card.kinopoisk_id,
                        imdb_id: card.imdb_id,
                        title: card.title || card.name || card.original_title,
                        original_title: card.original_title,
                        poster: posterUrl,  // Сохраняем полный URL!
                        voice: item.voice,
                        provider: null,
                        last_episode: null,
                        last_check: Date.now(),
                        has_new_episode: false,
                        added_at: Date.now()
                    };

                    console.log('[VoiceRelease] Сохраняем в отслеживаемые:', trackingData.title, 'poster:', trackingData.poster);
                    saveTracking(trackingData);
                }

                // Обновляем кнопку через небольшую задержку
                setTimeout(function() {
                    console.log('[VoiceRelease] Обновление кнопки после изменения');
                    addTrackButton();
                }, 300);
            }
        });
    }

    // ============================================
    // ДОБАВЛЕНИЕ КНОПКИ В МЕНЮ LAMPA
    // ============================================
    function addMenuButton() {
        // Добавляем пункт "Подписки" в главное меню Lampa
        setTimeout(function() {
            addSubscriptionsMenuItem();
        }, 2000);
    }

    function addSubscriptionsMenuItem() {
        console.log('[VoiceRelease] addSubscriptionsMenuItem вызвана');
        
        // Проверяем, есть ли уже наш пункт (ищем по уникальному названию)
        if ($('.menu__item:contains("Мои подписки")').length > 0) {
            console.log('[VoiceRelease] Пункт "Мои подписки" уже есть в меню');
            return;
        }

        console.log('[VoiceRelease] Создаём кнопку меню');
        
        // Создаём кнопку меню с иконкой как в стандарте Lampa
        var button = $('<li class="menu__item selector">' +
            '<div class="menu__ico">' +
            '<svg width="39" height="39" viewBox="0 0 39 39" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<rect x="1.85742" y="13.0947" width="35.501" height="23.9331" rx="4.5" stroke="currentColor" stroke-width="3"/>' +
            '<rect x="4.72461" y="5.90186" width="29.7656" height="3.01074" rx="1.50537" fill="currentColor"/>' +
            '<rect x="7.55957" y="0.208984" width="24.0957" height="3.01074" rx="1.50537" fill="currentColor"/>' +
            '<rect x="23.3701" y="18.9653" width="3.06348" height="12.3091" rx="1.53174" transform="rotate(30 23.3701 18.9653)" fill="currentColor"/>' +
            '<rect x="13.1934" y="25.2788" width="3.06348" height="8.31331" rx="1.53174" transform="rotate(-45 13.1934 25.2788)" fill="currentColor"/>' +
            '</svg>' +
            '</div>' +
            '<div class="menu__text">Мои подписки</div>' +
            '</li>');

        // Обработчик нажатия
        button.on('hover:enter', function() {
            console.log('[VoiceRelease] Открытие подписок');
            showSubscriptionsPage();
        });

        // Добавляем кнопку в меню (после последнего элемента)
        var menuList = $('.menu .menu__list').first();
        console.log('[VoiceRelease] menuList найдено:', menuList.length);
        
        if (menuList.length) {
            menuList.append(button);
            console.log('[VoiceRelease] Пункт "Мои подписки" добавлен в меню');
        } else {
            console.log('[VoiceRelease] Не найдено меню для добавления');
            console.log('[VoiceRelease] Пробуем найти .menu:', $('.menu').length);
            console.log('[VoiceRelease] Пробуем найти .menu__list:', $('.menu__list').length);
        }
    }

    // ============================================
    // СТРАНИЦА ПОДПИСОК (отдельная страница с карточками)
    // ============================================
    function showSubscriptionsPage() {
        console.log('[VoiceRelease] showSubscriptionsPage вызвана');
        
        var tracking = getTracking();
        console.log('[VoiceRelease] Отслеживаемые сериалы:', tracking.length);
        console.log('[VoiceRelease] Данные отслеживания:', tracking);

        if (tracking.length === 0) {
            // Показываем пустую страницу
            Lampa.Activity.push({
                url: 'voice_release_subscriptions',
                title: 'Мои подписки',
                component: 'subscriptions_empty'
            });
            
            if (!Lampa.Component.get('subscriptions_empty')) {
                Lampa.Component.add('subscriptions_empty', function(data){
                    var _this = this;
                    _this.html = $('<div class="full"><div class="empty"><div class="empty__title">Нет отслеживаемых сериалов</div><div class="empty__descr">Добавьте сериал через кнопку "Отслеживать" на странице сериала</div></div></div>');
                    _this.render = function(){ return _this.html; };
                    _this.start = function(){};
                    _this.stop = function(){};
                    _this.pause = function(){};
                    _this.destroy = function(){ _this.html.remove(); };
                    return _this;
                });
            }
            return;
        }

        // Проверяем и дополняем данные
        tracking.forEach(function(item) {
            if (!item.poster || item.poster.indexOf('img_load') >= 0) {
                console.log('[VoiceRelease] Нет постера у:', item.title);
                // Используем заглушку
                item.poster = './img/img_load.svg';
            }
        });

        // Открываем страницу с карточками
        Lampa.Activity.push({
            url: 'voice_release_subscriptions',
            title: 'Мои подписки',
            component: 'subscriptions',
            items: tracking
        });
        
        // Регистрируем компонент если ещё не зарегистрирован
        if (!Lampa.Component.get('subscriptions')) {
            registerSubscriptionsComponent();
        }
    }

    // ============================================
    // РЕГИСТРАЦИЯ КОМПОНЕНТА ПОДПИСОК
    // ============================================
    function registerSubscriptionsComponent() {
        console.log('[VoiceRelease] registerSubscriptionsComponent вызвана');
        
        // Создаём конструктор компонента
        function SubscriptionsComponent(data) {
            var _this = this;
            _this.data = data;
            _this.activity = null;
            _this.items = data.items || [];
            _this.html = null;
            
            console.log('[VoiceRelease] SubscriptionsComponent constructor, items:', _this.items.length);
            
            _this.create = function() {
                console.log('[VoiceRelease] SubscriptionsComponent create вызвана');
                
                // Добавляем стили для сетки карточек
                if (!$('#voice-release-styles').length) {
                    $('head').append('<style id="voice-release-styles">' +
                        '.subscriptions-page .full { padding: 20px; }' +
                        '.subscriptions-page .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }' +
                        '.subscriptions-page .card { margin: 0; }' +
                        '.subscriptions-page .card__subscribe { position: absolute; bottom: 10px; left: 10px; right: 10px; background: rgba(0,0,0,0.8); padding: 8px; border-radius: 6px; font-size: 12px; }' +
                        '.subscriptions-page .card__subscribe-status { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #4CAF50; margin-right: 8px; }' +
                        '.subscriptions-page .card__subscribe-position { display: block; color: #fff; margin-top: 4px; }' +
                        '.subscriptions-page .card__subscribe-voice { display: block; color: #aaa; margin-top: 4px; }' +
                        '</style>');
                }
                
                var scroll = new Lampa.Scroll({
                    step: 300,
                    visible: 5
                });

                _this.html = $('<div class="full subscriptions-page"></div>');
                _this.scroll = scroll;

                // Создаём сетку карточек
                var cards = $('<div class="cards"></div>');
                scroll.append(cards);
                _this.html.append(scroll.render());

                // Рендерим карточки
                console.log('[VoiceRelease] Рендерим карточек:', _this.items.length);
                
                if (_this.items.length > 0) {
                    _this.items.forEach(function(item) {
                        var card = createSubscriptionCard(item);
                        cards.append(card);
                    });
                }

                Lampa.Controller.add('subscriptions_cards', {
                    toggle: function() {
                        Lampa.Controller.collectionFocus(cards.find('.card').first(), cards);
                    }
                });

                Lampa.Controller.toggle('subscriptions_cards');
                
                return _this.html;
            };
            
            _this.render = function() {
                console.log('[VoiceRelease] SubscriptionsComponent render вызвана');
                if (!_this.html) {
                    return _this.create();
                }
                return _this.html;
            };
            
            _this.start = function() {
                console.log('[VoiceRelease] SubscriptionsComponent start');
            };
            
            _this.stop = function() {
                console.log('[VoiceRelease] SubscriptionsComponent stop');
            };
            
            _this.pause = function() {
                console.log('[VoiceRelease] SubscriptionsComponent pause');
            };
            
            _this.destroy = function() {
                console.log('[VoiceRelease] SubscriptionsComponent destroy');
                if (_this.html) _this.html.remove();
                if (_this.scroll) _this.scroll.destroy();
            };
        }

        Lampa.Component.add('subscriptions', SubscriptionsComponent);
        console.log('[VoiceRelease] Компонент subscriptions зарегистрирован');
    }

    // ============================================
    // СОЗДАНИЕ КАРТОЧКИ ПОДПИСКИ
    // ============================================
    function createSubscriptionCard(item) {
        console.log('[VoiceRelease] createSubscriptionCard:', item.title);
        console.log('[VoiceRelease] Poster:', item.poster);
        
        // Исправляем URL постера если он относительный
        var posterUrl = item.poster;
        if (posterUrl && posterUrl.indexOf('http') !== 0 && posterUrl.indexOf('/') === 0) {
            posterUrl = 'https://image.tmdb.org/t/p/w500' + posterUrl;
        } else if (!posterUrl || posterUrl.indexOf('img_load') >= 0) {
            posterUrl = './img/img_load.svg';
        }
        
        // Создаём карточку вручную с правильными классами
        var card = $('<div class="card card--voice-release selector layer--visible layer--render">' +
            '<div class="card__imgbox">' +
            '<div class="card__view image--ready">' +
            '<img class="card__img" src="' + posterUrl + '" />' +
            '</div>' +
            '</div>' +
            '<div class="card__left">' +
            '<div class="card__title">' + item.title + '</div>' +
            '<div class="card__age"></div>' +
            '</div>' +
            '</div>');

        // Добавляем бейдж с информацией о подписке
        var status = item.last_episode ?
            'S' + item.last_episode.season + ':E' + item.last_episode.episode :
            'Ожидание...';
        
        var badge = $('<div class="card__subscribe">' +
            '<div class="card__subscribe-status on"></div>' +
            '<div class="card__subscribe-position">' + status + '</div>' +
            '<div class="card__subscribe-voice">' + item.voice + '</div>' +
            '</div>');
        
        var cardView = card.find('.card__view');
        if (cardView.length) {
            cardView.after(badge);
        } else {
            card.append(badge);
        }

        // Обработчик нажатия
        card.on('hover:enter', function() {
            console.log('[VoiceRelease] Hover на карточке:', item.title);
        }).on('hover:click', function() {
            console.log('[VoiceRelease] Клик на карточке, переход к:', item.title);
            Lampa.Activity.push({
                url: 'full/' + item.kinopoisk_id,
                id: item.kinopoisk_id,
                type: 'full',
                source: 'tmdb'
            });
        });

        return card;
    }

    // ============================================
    // ПОДПИСКА НА СОБЫТИЯ
    // ============================================
    function subscribeToEvents() {
        console.log('[VoiceRelease] Подписка на события Lampa.Listener');
        
        // Подписка на рендеринг карточки (для кнопки и бейджа)
        Lampa.Listener.follow('full', function(e) {
            console.log('[VoiceRelease] Событие full:', e.type);
            
            if (e.type == 'complite') {
                // Проверяем, есть ли данные о фильме/сериале
                if (e.data && e.data.movie) {
                    console.log('[VoiceRelease] Карточка сериала/фильма:', e.data.movie.title);
                }
                
                // Добавляем кнопку отслеживания с задержкой
                setTimeout(function() {
                    console.log('[VoiceRelease] Вызов addTrackButton');
                    addTrackButton();
                }, 1000);

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
        
        console.log('[VoiceRelease] Подписка на события завершена');
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

            // Показать подписки (главное меню)
            showSubscriptions: showSubscriptionsPage,

            // Версия плагина
            version: '1.3.0'
        };

        console.log('[VoiceRelease] Plugin initialized successfully!');
        console.log('[VoiceRelease] Use window.voice_release_plugin for API access');
    }

    // Запуск после готовности Lampa
    // Проверяем несколько способов на случай гонки инициализации
    (function safeInit() {
        if (window.appready === true) {
            console.log('[VoiceRelease] Lampa уже готова, запуск плагина...');
            init();
        } else if (window.Lampa && typeof window.Lampa.Activity !== 'undefined') {
            console.log('[VoiceRelease] Lampa.Activity доступен, запуск плагина...');
            init();
        } else {
            console.log('[VoiceRelease] Ожидание готовности Lampa...');
            document.addEventListener('appready', function() {
                console.log('[VoiceRelease] Событие appready получено');
                init();
            });
            // Дополнительная страховка - пробуем через 2 секунды
            setTimeout(function() {
                if (!window.appready && !window.voice_release_plugin) {
                    console.log('[VoiceRelease] Принудительный запуск через timeout');
                    init();
                }
            }, 2000);
        }
    })();

})();
