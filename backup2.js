(function() {
  'use strict';

  function showConfirmDialog(title, confirmCallback, cancelCallback) {
    Lampa.Select.show({
      title: title,
      nomark: true,
      items: [
        {
          title: Lampa.Lang.translate('confirm'),
          confirm: true,
          selected: true
        },
        {
          title: Lampa.Lang.translate('cancel')
        }
      ],
      onSelect: function(item) {
        if (item.confirm) {
          confirmCallback();
        } else {
          cancelCallback();
        }
      },
      onBack: function() {
        cancelCallback();
      }
    });
  }

  function goExport() {
    showConfirmDialog(
      Lampa.Lang.translate('export_confirm'),
      function() {
        Lampa.Loading.start();
        
        // Данные из localStorage
        const favorite = Lampa.Storage.get('favorite', '');
        const bookmarks = Lampa.Storage.get('account_bookmarks', '');
        const fileView = Lampa.Storage.get('file_view', '');
        const onlineView = Lampa.Storage.get('online_view', '');
        
        // Новые параметры
        const onlineLastBalancer = Lampa.Storage.get('online_last_balanser', '');
        const onlineWatchedLast = Lampa.Storage.get('online_watched_last', '');
        const torrentsView = Lampa.Storage.get('torrents_view', '');
        const torrentsFilterData = Lampa.Storage.get('torrents_filter_data', '');
        
        // Объединение всех данных
        const data = {
          favorite: favorite,
          bookmarks: bookmarks,
          file_view: fileView,
          online_view: onlineView,
          
          // Новые поля
          online_last_balanser: onlineLastBalancer,
          online_watched_last: onlineWatchedLast,
          torrents_view: torrentsView,
          torrents_filter_data: torrentsFilterData
        };
        
        // Создание объекта Blob
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'lampa_backup.json';
        link.click();
        URL.revokeObjectURL(link.href);
        
        Lampa.Loading.stop();
        Lampa.Noty.show(Lampa.Lang.translate('export_success'));
        Lampa.Controller.toggle('settings_component');
      },
      function() {}
    );
  }

  function goImport() {
    showConfirmDialog(
      Lampa.Lang.translate('import_confirm'),
      function() {
        Lampa.Loading.start();
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.click();
        
        input.onchange = function(event) {
          const file = event.target.files[0];
          if (file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
              try {
                const data = JSON.parse(e.target.result);
                
                // Применение старых сохраненных данных
                if (data.favorite !== undefined) {
                  Lampa.Storage.set('favorite', data.favorite);
                }
                if (data.bookmarks !== undefined) {
                  Lampa.Storage.set('account_bookmarks', data.bookmarks);
                }
                if (data.file_view !== undefined) {
                  Lampa.Storage.set('file_view', data.file_view);
                }
                if (data.online_view !== undefined) {
                  Lampa.Storage.set('online_view', data.online_view);
                }
                
                // Новые поля
                if (data.online_last_balanser !== undefined) {
                  Lampa.Storage.set('online_last_balanser', data.online_last_balanser);
                }
                if (data.online_watched_last !== undefined) {
                  Lampa.Storage.set('online_watched_last', data.online_watched_last);
                }
                if (data.torrents_view !== undefined) {
                  Lampa.Storage.set('torrents_view', data.torrents_view);
                }
                if (data.torrents_filter_data !== undefined) {
                  Lampa.Storage.set('torrents_filter_data', data.torrents_filter_data);
                }
                
                Lampa.Loading.stop();
                Lampa.Noty.show(Lampa.Lang.translate('import_success'));
                setTimeout(function() {
                  window.location.reload();
                }, 5000);
              } catch (error) {
                Lampa.Loading.stop();
                Lampa.Noty.show(Lampa.Lang.translate('import_error') + ': ' + error.message);
              }
            };
            reader.readAsText(file);
          } else {
            Lampa.Loading.stop();
            Lampa.Noty.show(Lampa.Lang.translate('import_canceled'));
          }
        };
      },
      function() {}
    );
  }

  function startPlugin() {
    window.lampac_backup_plugin = true;
    
    Lampa.Lang.add({
      lampac_backup: {
        ru: 'Резервная копия',
        en: 'Full Backup',
        uk: 'Повне резервне копіювання',
        zh: '全面备份'
      },
      lampac_backup_export: {
        ru: 'Сделать резервную копию',
        en: 'Make Full Backup',
        uk: 'Створити повне резервне копіювання',
        zh: '制作完整备份'
      },
      lampac_backup_import: {
        ru: 'Восстановить резервную копию',
        en: 'Restore Full Backup',
        uk: 'Відновити повне резервне копіювання',
        zh: '恢复完整备份'
      },
      export_confirm: {
        ru: 'Вы уверены, что хотите создать резервную копию?',
        en: 'Are you sure you want to make a full backup?',
        uk: 'Ви впевнені, що хочете створити повне резервне копіювання?',
        zh: '你确定要创建一个完整的备份吗？'
      },
      import_confirm: {
        ru: 'Вы уверены, что хотите восстановить данные из резервной копии?',
        en: 'Are you sure you want to restore data from a full backup?',
        uk: 'Ви впевнені, що хочете відновити дані з повного резервного копіювання?',
        zh: '您确信想从完整备份中恢复数据吗？'
      },
      export_success: {
        ru: 'Резервная копия успешно создана.',
        en: 'Backup was successfully created.',
        uk: 'Резервна копія була успішно створена.',
        zh: '备份已成功创建。'
      },
      import_success: {
        ru: 'Все данные были успешно восстановлены.',
        en: 'All data has been successfully restored.',
        uk: 'Усі дані було успішно відновлено.',
        zh: '所有数据都已经成功恢复了。'
      },
      import_error: {
        ru: 'При восстановлении произошла ошибка:',
        en: 'An error occurred during restoration:',
        uk: 'Під час відновлення сталася помилка:',
        zh: '恢复过程中出现以下错误:'
      },
      import_canceled: {
        ru: 'Операция была отменена.',
        en: 'The operation was cancelled.',
        uk: 'Операція була скасована.',
        zh: '操作被取消了。'
      }
    });

    Lampa.SettingsApi.addComponent({
      component: 'full_backup',
      icon: '<svg>...</svg>', // иконка оставлена прежней
      name: Lampa.Lang.translate('lampac_backup')
    });

    Lampa.SettingsApi.addParam({
      component: 'full_backup',
      param: {
        type: 'button'
      },
      field: {
        name: Lampa.Lang.translate('lampac_backup_export'),
      },
      onChange: function(a, b) {
        goExport();
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'full_backup',
      param: {
        type: 'button'
      },
      field: {
        name: Lampa.Lang.translate('lampac_backup_import'),
      },
      onChange: function() {
        goImport();
      }
    });
  }

  if (!window.lampac_backup_plugin) startPlugin();

})();
