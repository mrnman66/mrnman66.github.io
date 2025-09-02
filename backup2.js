(function() {
  'use strict';

  // Initialize plugin
  function initPlugin() {
    if (window.lampa_backup_init) return;
    window.lampa_backup_init = true;

    // Add backup/restore buttons to Lampa UI (assuming Lampa has a menu API)
    Lampa.Menu.add('backup', {
      title: 'Backup Settings',
      subtitle: 'Save or restore settings',
      items: [
        {
          title: 'Save Backup',
          onSelect: function() {
            Lampa.Noty.show('Save backup?', {
              buttons: [
                { text: 'Yes', onSelect: exportSettings },
                { text: 'No', onSelect: function() {} }
              ]
            });
          }
        },
        {
          title: 'Restore Backup',
          onSelect: function() {
            Lampa.Noty.show('Restore backup?', {
              buttons: [
                { text: 'Yes', onSelect: importSettings },
                { text: 'No', onSelect: function() {} }
              ]
            });
          }
        }
      ]
    });

    // Listen for storage changes to keep data consistent
    Lampa.Storage.listener.follow('change', function(e) {
      // Optionally handle specific storage changes if needed
      console.log('Storage changed:', e.name);
    });
  }

  // Export settings to lampa_settings.json
  function exportSettings() {
    var settings = {};
    var fields = [
      'file_view',
      'online_view',
      'online_last_balanser',
      'online_watched_last',
      'torrents_view',
      'torrents_filter_data',
      'favorite',
      'account_bookmarks'
    ];

    // Include profile-specific file_view if account profile exists
    var acc = Lampa.Storage.get('account', '{}');
    if (acc.profile) {
      fields.push('file_view_' + acc.profile.id);
    }

    // Collect all relevant settings
    fields.forEach(function(field) {
      settings[field] = Lampa.Storage.get(field, '');
    });

    // Create JSON blob
    var json = JSON.stringify(settings, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    // Trigger download
    var a = document.createElement('a');
    a.href = url;
    a.download = 'lampa_settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Notify user
    Lampa.Noty.show('Backup successfully saved!');
  }

  // Import settings from lampa_settings.json
  function importSettings() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = function(event) {
      var file = event.target.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = JSON.parse(e.target.result);
          // Restore settings
          for (var key in data) {
            if (data.hasOwnProperty(key)) {
              Lampa.Storage.set(key, data[key], true);
              if (key === 'favorite') Lampa.Favorite.init();
            }
          }
          Lampa.Noty.show('Backup successfully restored!');
        } catch (error) {
          Lampa.Noty.show('Error restoring backup: ' + error.message);
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  // Initialize the plugin
  initPlugin();

})();
