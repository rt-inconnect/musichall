'use strict';

function audioContextCheck() {
  if (typeof AudioContext !== "undefined") {
    return new AudioContext();
  } else if (typeof webkitAudioContext !== "undefined") {
    return new webkitAudioContext();
  } else if (typeof mozAudioContext !== "undefined") {
    return new mozAudioContext();
  } else {
   return false;
  }
}
var audioContext = audioContextCheck();

var imageFilter = {
  name: 'imageFilter',
  fn: function(item, options) {
    var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
    return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
  }
};

var appServices = angular.module('appServices', ['ngResource']);

appServices.factory('AuthService', ['$http', '$rootScope', 'API',
  function($http, $rootScope, API) {
    var user = (typeof(user_data) !== 'undefined') ? user_data : {};
    return {
      user: user,
      isAuth: function() {
        return (user.id) ? true : false;
      }
    };
  }
]);

appServices.factory('Search', ['$http', 'API',
  function($http, API) {
    return {
      query: function(q, $scope) {
        $scope.loading = true;
        return $http.get(API.search.all + '?q=' + q).then(function(res) {
          $scope.loading = false;
          return res.data;
        });
      }
    };
  }
]);
appServices.factory('SearchQuery', ['$http', '$rootScope', 'API', '$location',
  function($http, $rootScope, API, $location) {

    var parseParams = function(params) {
      var result = {
        xaction: params.xaction,
        url: API.search.query + params.xaction,
        page: params.page,
        params: {q: params.criteria.q},
        nopaginate: params.nopaginate
      };

      return result;
    };

    var SearchQuery = function() {
      this.items = [];
      this.busy = [];
    };

    SearchQuery.prototype.getAll = function(options, callback) {
      var self = this;

      if (self.busy[options.xaction]) return;
      self.busy[options.xaction] = true;

      if(!self.items[options.xaction]) self.items[options.xaction] = [];

      options = parseParams(options);
      if (!options.nopaginate) {
        options.params.skip = self.items[options.xaction].length;
        options.params.limit = options.page ? options.page * 10 : 10;
      }

      $http(options)
        .success(function(data, status, headers, config) {
          for (var i = 0; i < data.length; i++) {
            self.items[options.xaction].push(data[i]);
          }
          self.busy[options.xaction] = false;
          if (typeof callback === "function") callback(self.items[options.xaction]);
        });
    };

    return SearchQuery;
  }
]);

appServices.factory('SearchGenre', ['$http', 'API',
  function($http, API) {
    return {
      query: function(q, $scope) {
        if($scope) $scope.genreLoading = true;
        return $http.get(API.search.genre + '?q=' + q).then(function(res) {
          if($scope) $scope.genreLoading = false;
          return res.data;
        });
      }
    };
  }
]);

appServices.factory('Genres', ['$http', 'API',
  function($http, API) {
    return {
      get: function(callback) {
        return $http.get(API.genre).then(function(res) {
          callback(res.data);
          return res.data;
        });
      }
    };
  }
]);

appServices.factory('SearchTag', ['$http', 'API',
  function($http, API) {
    return {
      query: function(q, $scope) {
        if($scope) $scope.tagLoading = true;
        return $http.get(API.search.tag + '?q=' + q).then(function(res) {
          if($scope) $scope.tagLoading = false;
          return res.data;
        });
      },
      create: function (track, tag, cb) {
        return $http.post(API.tag, {trackId:track, name:tag}).then(function (res) {
          cb(res.data);
          return res;
        });
      },
      delete: function (tag, cb) {
        return $http.delete(API.tag + tag).then(function (res) {
          cb(res.data);
          return res;
        });
      }
    };
  }
]);

appServices.factory('Messages', ['$http', '$rootScope', 'API', '$state',
  function($http, $rootScope, API, $state) {
    var Messages = function () {
      var self = this;
      this.items = [];
      this.total = 0;
      this.busy = false;
      this.chatters = [];
      this.privatmuted = $.jStorage.get('privatmuted', false);

      $rootScope.socket.on('message', function (message) {
        if (!self.privatmuted) $rootScope.player.sounds.message.play();
        if(!$state.is('message.chat', { user:message.from.login })) {
          self.total++;
          if(!self.chatters[message.from.login]) {
            self.chatters[message.from.login] = message.from;
            self.chatters[message.from.login].total = 0;
          }
          self.chatters[message.from.login].total++;
        } else {
          self.items.splice(0,0,message);
        }
        self.lastActivity(message.from.login);
        $rootScope.$apply();
      });
    };

    Messages.prototype.mute = function () {
      this.privatmuted = !this.privatmuted;
      $.jStorage.set('privatmuted', this.privatmuted);
    };

    Messages.prototype.lastActivity = function (user) {
      this.chatters[user].lastActivity = new Date().getTime();
    };

    Messages.prototype.get = function (user) {
      var self = this;
      $http({
        method: 'GET',
        url: API.message.get + user
      }).success(function(data) {
        if(!self.chatters[user]) {
          self.chatters[user] = data.user;
          self.lastActivity(user);
        }
        self.chatters[user].total = 0;
        self.items = data.items;
        self.total = data.total;
      });
    };

    Messages.prototype.loadMore = function (user) {
      var self = this;

      if (self.busy) return;
      self.busy = true;

      $http({
        method: 'GET',
        url: API.message.get + user,
        params: {
          skip: self.items.length,
          limit: 10
        }        
      }).success(function(data) {
        if(!self.chatters[user]) {
          self.chatters[user] = data.user;
          self.lastActivity(user);
        }
        self.chatters[user].total = 0;
        for (var i = 0; i < data.items.length; i++) {
          self.items.push(data.items[i]);
        }
        self.busy = false;
        self.total = data.total;
      });
    };

    Messages.prototype.send = function (text, user, cb) {
      var self = this;
      self.lastActivity(user);
      $rootScope.socket.post(API.message.send, {
        text: text,
        to: user
      }, function(message) {
        self.items.splice(0,0,message);
        if(cb) cb(message);
      });
    };

    Messages.prototype.getTotal = function () {
      var self = this;
      $http({
        method: 'GET',
        url: API.message.total
      }).success(function(data) {
        self.total = data.total;
      });
    };

    Messages.prototype.getChatters = function () {
      var self = this;
      $http({
        method: 'GET',
        url: API.message.chatters
      }).success(function(data) {
        self.chatters = data;
      });
    };

    Messages.prototype.search = function(q, $scope) {
      $scope.loading = true;
      return $http.get(API.message.search + '?q=' + q).then(function(res) {
        $scope.loading = false;
        return res.data;
      });
    };

    return Messages;
  }
]);

appServices.factory('Chat', ['$http', '$rootScope', 'API', '$state', 'IfService',
  function($http, $rootScope, API, $state, IfService) {
    var Chat = function () {
      var self = this;
      this.items = [];
      this.onliners = [];
      this.chatmuted = $.jStorage.get('chatmuted', false);
      this.busy = false;

      $rootScope.socket.on('chat', function (message) {
        if(!IfService.userEqual(message.createdBy.id)) {
          var el = angular.element(document.querySelector( '#imessages' ));
          el.addClass('shake');
          setTimeout(function() { el.removeClass('shake'); },500);
          if (!self.chatmuted) $rootScope.player.sounds.message.play();
        }
        self.items.splice(0,0,message);
        $rootScope.$apply();
      });
    };

    Chat.prototype.mute = function () {
      this.chatmuted = !this.chatmuted;
      $.jStorage.set('chatmuted', this.chatmuted);
    };

    Chat.prototype.get = function () {
      var self = this;

      if (self.busy) return;
      self.busy = true;

      $http({
        method: 'GET',
        url: API.chat.get,
        params: {
          skip: self.items.length,
          limit: 10
        }
      }).success(function(data) {
        for (var i = 0; i < data.length; i++) {
          self.items.push(data[i]);
        }
        self.busy = false;
      });
    };

    Chat.prototype.send = function (text, cb) {
      var self = this;
      $rootScope.socket.post(API.chat.send, {
        text: text
      }, function(message) {
        if(cb) cb(message);
      });
    };

    Chat.prototype.getOnliners = function () {
      var self = this;
      $http({
        method: 'GET',
        url: API.chat.onliners
      }).success(function(data) {
        self.onliners = data;
      });
    };

    return Chat;
  }
]);

appServices.factory('TrackUploader', ['$rootScope', 'API', 'FileUploader', 'AuthService', 'AUTH_EVENTS',
  function($rootScope, API, FileUploader, AuthService, AUTH_EVENTS) {
    var TrackUploader = function () {
      var self = this;
      self.uploadItem = {};
      self.uploader =  new FileUploader({
        headers: {'Client-Token':token},
        url: API.track.upload,
        removeAfterUpload: true,
        autoUpload: true
      });

      self.uploader.filters.push({
        name: 'mp3Filter',
        fn: function(item, options) {
          if (!AuthService.isAuth()) {
            $rootScope.$broadcast(AUTH_EVENTS.notAuth);
            return false;
          }
          var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
          return '|mp3|mpeg|'.indexOf(type) !== -1;
        }
      });

      /*self.uploader.onAfterAddingAll = function () {

        $rootScope.socket.removeAllListeners('convertToOggProgress');
        $rootScope.socket.on('convertToOggProgress', function (res) {
          $rootScope.$apply(function () {
            self.uploadItem.convertProgress = res.progress;
            self.uploadItem.allProgress = 50 + res.progress/2;
            self.uploadItem.uploadStatus = 'Конвертация аудио...';
            if(self.uploadItem.convertProgress === 100)
              self.uploadItem.uploadStatus = 'Визуализация аудио...';
          });
        });
      };*/

      self.uploader.onBeforeUploadItem = function (item) {
        item.uploadStatus = 'Загрузка файла...';
        self.uploadItem  = item;
      };

      self.uploader.onProgressItem = function(fileItem, progress) {
        self.uploadItem.uploadProgress = progress;
        self.uploadItem.allProgress = progress;
        if(progress === 100) self.uploadItem.uploadStatus = 'Поиск обложки, конвертация и визуализация аудио...';
      };

      self.uploader.onErrorItem = function(item, res) {
        if(res.type == 'dir-track-exist' || res.type == 'track-exist') {
          /*$rootScope.snotifies.push({
            type: 'alert-danger',
            text: '- уже загружен',
            track: res.track
          });*/
          alert(res.track.name + ' - уже загружен');
        }
        if(res.type == 'limit-error') {
          /*$rootScope.snotifies.push({
            type: 'alert-danger',
            text: 'У Вас кончился лимит загрузок (180 минут)'
          });*/
          alert('У Вас кончился лимит загрузок (180 минут)');
        }
      };

    };

    return TrackUploader;
  }
]);

appServices.factory('Notifies', ['$resource', 'API',
  function($resource, API) {
    return $resource(
      API.notifies.get, {}, {
        'getAll': {
          'method': 'GET',
          url: API.notifies.get
        },
        'getUnreaded': {
          'method': 'GET',
          url: API.notifies.unreaded
        },
        'mark': {
          'method': 'GET',
          url: API.notifies.mark
        }
      }
    );
  }
]);

appServices.factory('SM2Player', ['$rootScope', '$http', 'TrackGet', 'Visualizer',
  function($rootScope, $http, TrackGet, Visualizer) {

    //var visualizer = new Visualizer();

    return function() {
      this.nowPlaying = $.jStorage.get('nowPlaying', {progress: 0,isPlaying: false});
      this.repeat = $.jStorage.get('repeat', false);
      this.autoPlay = true;
      this.volume = $.jStorage.get('volume', 100);
      this.muted = $.jStorage.get('muted', false);
      this.playlist = $.jStorage.get('playlist', {tracks:[]});
      this.shuffle = $.jStorage.get('shuffle', false);
      this.analyser = false;
      this.bands = false;

      this.sounds = { message: '', notify: '' };

      this.init = function() {
        var me = this;

        soundManager.setup({
          url: '/swf/',
          flashVersion: 9,
          preferFlash: false,
          debugMode: false,
          useHTML5Audio: true,
          ontimeout: function() {
            alert('SM2 failed to start. Flash missing, blocked or security error?');
            alert('The status is ' + status.success + ', the error type is ' + status.error.type);
          },
          defaultOptions: {
            autoLoad: false,
            autoPlay: false,
            from: null,
            loops: 1,
            multiShot: false,
            multiShotEvents: false,
            onid3: null,
            onload: null,
            onstop: null,
            onpause: null,
            //onplay: null,
            onresume: null,
            position: null,
            pan: 0,
            stream: true,
            to: null,
            type: null,
            usePolicyFile: false,
            volume: me.volume,
            onplay: function () {
              /*console.log('play');
              var ctx = document.getElementById('visualizer').getContext('2d');
              visualizer.ctx = ctx;

              me.setAudioContext();*/
              if (!me.nowPlaying.bitrate && me.nowPlaying.id) $http.put('/api/track/start/' + me.nowPlaying.id);
            },
            whileloading: function() {
              //soundManager._writeDebug('sound '+this.id+' loading, '+this.bytesLoaded+' of '+this.bytesTotal);
            },
            whileplaying: function() {
              /*if (me.analyser) {
                me.analyser.getByteFrequencyData(me.bands);
                visualizer.update(me.bands);
              }*/

              me.nowPlaying.position = Math.floor(this.position/1000);
              me.nowPlaying.progress = ((this.position / this.duration) * 100);
              $rootScope.$broadcast('track:progress', me.nowPlaying.progress);
            },
            onfinish: function() {
              if (!me.nowPlaying.bitrate && me.nowPlaying.id) {
                $http.put('/api/track/end/' + me.nowPlaying.id);
                me.nowPlaying.numPlays++;
              }
              if (me.autoPlay === true && !me.repeat)
                me.nextPlay();
              if (me.repeat) me.play();
            }
          }
        });
        soundManager.onready(function() {

          me.sounds.message = soundManager.createSound({
            id: 'message',
            url: '/sounds/message2.mp3',
            volume: 100,
            onplay: false,
            whileplaying: false,
            onfinish: false
          });
          me.sounds.notify = soundManager.createSound({
            id: 'notify',
            url: '/sounds/notify.mp3',
            volume: 100,
            onplay: false,
            whileplaying: false,
            onfinish: false
          });

          var byDefault = function() {
            soundManager.createSound({
              id: me.nowPlaying.id,
              url: me.nowPlaying.fileOgg,
              volume: me.volume
            });
          }
          if(me.nowPlaying.id) {
            byDefault();
          } else {
            TrackGet.byId('welcome', function (track) {
              me.nowPlaying = track;
              byDefault();
            });
          }
          if (me.muted) soundManager.mute();
        });
      };

      this.play = function(track, index, playlist) {
        var me = this;
        if (me.nowPlaying.isPlaying) {
          me.nowPlaying.isPlaying = false;
          me.nowPlaying.progress = 0;
          soundManager.stopAll();
          soundManager.unload(me.nowPlaying.id);
        }

        if (playlist) {
          me.playlist.isPlaying = false;
          me.playlist = {
            id: playlist.id || '',
            name: playlist.name || '',
            coverUrl: playlist.coverUrl || '',
            createdBy: playlist.createdBy || {},
            tracks: []
          };
          if (playlist.tracks) {
            for (var i = 0; i < playlist.tracks.length; i++) {
              me.playlist.tracks.push(me.parseTrack(playlist.tracks[i]));
            }
          } else {
            for (var i = 0; i < playlist.length; i++) {
              me.playlist.tracks.push(me.parseTrack(playlist[i]));
            }
          }
        }

        var doNext = function () {
          me.saveStorage();
          me.nowPlaying.isPlaying = true;
          me.playlist.isPlaying = true;
          soundManager.play(me.nowPlaying.id);
        };
        if (track) {
          var createSound = function () {
            if (typeof index !== undefined) me.nowPlaying.index = index;
            soundManager.createSound({
              id: me.nowPlaying.id,
              url: me.nowPlaying.fileOgg,
              volume: me.volume
            });
            doNext();
          };
          if (me.playlist.id) {
            TrackGet.byId(track.id, function (track) {
              me.nowPlaying = track;
              createSound();
            });
          } else {
            me.nowPlaying = me.parseTrack(track);
            createSound();
          }
        } else {
          doNext();
        }
      };

      this.setAudioContext = function () {
        var me = this;
        if (audioContext) {
          var audioElement = soundManager.sounds[me.nowPlaying.id]._a;
          var node = audioContext.createScriptProcessor(512, 1, 1);
          me.analyser = audioContext.createAnalyser();
          me.analyser.smoothingTimeConstant = 0.3;
          me.analyser.fftSize = 64;
          me.bands = new Uint8Array(me.analyser.frequencyBinCount);
          var source = audioContext.createMediaElementSource(audioElement);
          source.connect(me.analyser);
          me.analyser.connect(node);
          node.connect(audioContext.destination);
          source.connect(audioContext.destination);          
        }
      };

      this.parseTrack = function (track) {
        return {
          id: track.id,
          coverUrl: track.coverUrl,
          name: track.name,
          fileOgg: track.fileOgg,
          duration: track.duration,
          position: 0,
          progress: 0,
          numPlays: track.numPlays,
          bitrate: track.bitrate,
          createdBy: {
            login: track.createdBy ? track.createdBy.login : '',
            avatarUrl: track.createdBy ? track.createdBy.avatarUrl : ''
          }
        };
      };

      this.saveStorage = function () {
        $.jStorage.set('nowPlaying', this.nowPlaying);
        $.jStorage.set('playlist', this.playlist);
      };

      this.nextPlay = function() {
        var index = this.playlist.tracks.map(function(o) {
          return o.id;
        }).indexOf(this.nowPlaying.id);
        var nextIndex = index + 1;
        if (this.nowPlaying.index === this.playlist.tracks.length - 1)
          nextIndex = 0;
        if (this.shuffle)
          nextIndex = this.getRandom(this.playlist.tracks.length - 1);
        var nextTrack = this.playlist.tracks[nextIndex];
        this.play(nextTrack, nextIndex);
      };

      this.prevPlay = function() {
        var index = this.playlist.tracks.map(function(o) {
          return o.id;
        }).indexOf(this.nowPlaying.id);
        var prevIndex = index - 1;
        if (this.nowPlaying.index === 0)
          prevIndex = this.playlist.tracks.length - 1;
        var prevTrack = this.playlist.tracks[prevIndex];
        this.play(prevTrack, prevIndex);
      };

      this.pause = function() {
        soundManager.pause(this.nowPlaying.id);
        this.nowPlaying.isPlaying = false;
        this.playlist.isPlaying = false;
      };

      this.seek = function(event, drag) {
        if (!this.nowPlaying.id)
          return false;
        var sound = soundManager.getSoundById(this.nowPlaying.id);
        var duration = sound.durationEstimate;
        if (!drag) {
          var x = event.offsetX || event.layerX,
            width = event.target.clientWidth;
          sound.setPosition((x / width) * duration);          
        } else {
          sound.setPosition(drag * duration);          
        }
      };

      this.remove = function(id) {
        var index = this.playlist.tracks.map(function(o) {
          return o.id;
        }).indexOf(id);
        this.playlist.tracks.splice(index, 1);
      };

      this.changeVolume = function(event) {
        var x = event.offsetY || event.layerY - event.target.offsetTop,
          height = event.target.clientHeight;
        this.volume = 100 - ((x / height) * 100);

        for (var i = 0; i < soundManager.soundIDs.length; i++) {
          var mySound = soundManager.getSoundById(soundManager.soundIDs[i]);
          mySound.setVolume(this.volume);
        }

        soundManager.unmute();
        this.muted = false;

        $.jStorage.set('volume', this.volume);
        $.jStorage.set('muted', this.muted);
      };

      this.scrollVolume = function(increment) {
        if (increment) { this.volume += 10; } else { this.volume -= 10; }
        if (this.volume > 100) this.volume = 100;
        if (this.volume < 0) this.volume = 0;

        for (var i = 0; i < soundManager.soundIDs.length; i++) {
          var mySound = soundManager.getSoundById(soundManager.soundIDs[i]);
          mySound.setVolume(this.volume);
        }

        if (this.volume == 0) {
          soundManager.mute();
          this.muted = true;
        } else {
          soundManager.unmute();
          this.muted = false;
        }

        $.jStorage.set('volume', this.volume);
        $.jStorage.set('muted', this.muted);
        if (!$rootScope.$$phase) $rootScope.$digest();
      };

      this.mute = function() {
        var me = this;
        if (soundManager.muted === true) {
          soundManager.unmute();
        } else {
          soundManager.mute();
        }
        this.muted = soundManager.muted;
        $.jStorage.set('muted', this.muted);
      };

      // использование Math.round() даст неравномерное распределение!
      this.getRandom = function(max) {
        return Math.floor(Math.random() * (max - 0 + 1)) + 0;
      };

      this.savePlaylist = function () {
        var me = this;
        if (!me.playlist.id) {
          $rootScope.PlaylistService.create(me.playlist, function (playlist) {
            angular.extend(me.playlist, playlist);
            me.playlist.edit = false;
            $rootScope.playlists.items.my.splice(0,0,playlist);
          });
        } else {
          $rootScope.PlaylistService.save(me.playlist, function (playlist) {
            angular.extend(me.playlist, playlist);
            me.playlist.edit = false;
            var index = $rootScope.playlists.items.my.map(function (o) {
              return o.id;
            }).indexOf(playlist.id);
            $rootScope.playlists.items.my[index] = playlist;
          });
        }
      };

    };

  }
]);

appServices.factory('Waveform', [

  function() {
    return function() {
      // Private properties and methods
      var that = this;
      var startArr;
      var endArr;
      var looping = false;

      // Loop method adjusts the height of bar and redraws if neccessary
      var loop = function() {
        var delta;
        var animationComplete = true;

        // Boolean to prevent update function from looping if already looping
        looping = true;

        // For each bar
        for (var i = 0; i < endArr.length; i++) {
          // Change the current bar height toward its target height
          delta = (endArr[i] - startArr[i]) / that.animationSteps;
          that.curArr[i] += delta;
          // If any change is made then flip a switch
          if (delta) {
            animationComplete = false;
          }
        }

        // If no change was made to any bars then we are done
        if (animationComplete) {
          looping = false;
        } else {
          // Draw and call loop again
          draw(that.curArr);
          setTimeout(loop, that.animationInterval / that.animationSteps);
        }
      }; // End loop function

      // Draw method updates the canvas with the current display
      var draw = function(arr) {
        var numOfBars = arr.length;
        var barWidth;
        var barHeight;
        var ratio;
        var maxBarHeight;
        var gradient;
        var gradientOnMove;
        var largestValue = 0;
        var graphAreaX = 0;
        var graphAreaY = 0;
        var graphAreaWidth = that.width;
        var graphAreaHeight = that.height;
        var i;
        var selectedBar;
        var nowPlayingBar = 0;

        that.ctx.clearRect(0, 0, that.width, that.height);

        // Update the dimensions of the canvas only if they have changed
        if (that.ctx.canvas.width !== that.width || that.ctx.canvas.height !== that.height) {
          that.ctx.canvas.width = that.width;
          that.ctx.canvas.height = that.height;
        }

        // Draw the background color
        that.ctx.fillStyle = that.backgroundColor;
        that.ctx.fillRect(0, 0, that.width, that.height);

        // If x axis labels exist then make room
        if (that.xAxisLabelArr.length) {
          graphAreaHeight -= 40;
        }

        // Calculate dimensions of the bar
        barWidth = graphAreaWidth / numOfBars - that.margin * 2;
        maxBarHeight = graphAreaHeight;

        // Determine the largest value in the bar array
        for (i = 0; i < arr.length; i++) {
          if (arr[i] > largestValue) {
            largestValue = arr[i];
          }
        }

        // If detected mouse move event
        if (that.offsetX) {
          selectedBar = Math.round(that.offsetX / (barWidth + that.margin * 2));
        }

        if (that.progress) {
          nowPlayingBar = Math.round(numOfBars / 100 * that.progress);
        }

        // For each bar
        for (i = 0; i < arr.length; i++) {
          // Set the ratio of current bar compared to the maximum
          if (that.maxValue) {
            ratio = arr[i] / that.maxValue;
          } else {
            ratio = arr[i] / largestValue;
          }

          barHeight = ratio * maxBarHeight;

          // Draw bar background
          var color = "#6C7176";
          if (i < nowPlayingBar && that.progress != 0)
            color = "#DC73AC";
          if (i <= selectedBar)
            color = "#fff";
          that.ctx.fillStyle = color;
          that.ctx.fillRect(
            that.margin + i * that.width / numOfBars,
            graphAreaHeight - barHeight,
            barWidth,
            barHeight
          );
        }
      }; // End draw method

      // Public properties and methods
      this.ctx = '';
      this.progress = 0;
      this.width = 900;
      this.height = 150;
      this.maxValue = 0;
      this.margin = 1;
      this.colors = ["purple", "red", "green", "yellow"];
      this.curArr = [];
      this.backgroundColor = "rgba(0, 0, 0, 0)";
      this.xAxisLabelArr = [];
      this.yAxisLabelArr = [];
      this.animationInterval = 100;
      this.animationSteps = 10;
      this.offsetX = 0;

      // Update method sets the end bar array and starts the animation
      this.update = function(newArr) {
        // If length of target and current array is different
        if (newArr) {
          if (that.curArr.length !== newArr.length) {
            that.curArr = newArr;
            draw(newArr);
          } else {
            // Set the starting array to the current array
            startArr = that.curArr;
            // Set the target array to the new array
            endArr = newArr;
            // Animate from the start array to the end array
            if (!looping) {
              loop();
            }
          }
        }
      }; // End update method
    };
  }
]);

appServices.factory('TrackQuery', ['$http', '$rootScope', 'API', '$location',
  function($http, $rootScope, API, $location) {

    var parseParams = function(params) {
      var result = {
        xaction: params.xaction,
        url: API.track.query + params.xaction,
        page: params.page,
        params: {},
        nopaginate: params.nopaginate
      };

      switch (params.xaction) {
        case "all":
          if (params.criteria && params.criteria.genre) result.params.genre = params.criteria.genre;
          if (params.criteria && params.criteria.tag) result.params.tag = params.criteria.tag;
          break;
        case "popular":
          if (params.criteria && params.criteria.genre) result.params.genre = params.criteria.genre;
          if (params.criteria && params.criteria.interval) result.params.interval = params.criteria.interval;
          break;
        case "same":
          result.url = result.url + '/' + params.criteria.id;
          break;
        default:
          if (params.criteria && params.criteria.user) result.params.user = params.criteria.user;
          break;
      }

      return result;
    };

    var TrackQuery = function() {
      this.items = [];
      this.busy = [];
    };

    TrackQuery.prototype.getAll = function(options, callback) {
      var self = this;

      if (self.busy[options.xaction]) return;
      self.busy[options.xaction] = true;

      if(!self.items[options.xaction]) self.items[options.xaction] = [];

      options = parseParams(options);
      if (!options.nopaginate) {
        options.params.skip = self.items[options.xaction].length;
        options.params.limit = options.page ? options.page * 10 : 10;
      }

      $http(options)
        .success(function(data, status, headers, config) {
          for (var i = 0; i < data.length; i++) {
            self.items[options.xaction].push(data[i]);
          }
          self.busy[options.xaction] = false;
          if (typeof callback === "function") callback(self.items[options.xaction]);
        });
    };

    TrackQuery.prototype.search = function(q, playlist) {
      return $http.get(API.track.search, {
        params: { q: q, playlist: playlist }
      }).then(function(res) {
        return res.data;
      });

    };

    return TrackQuery;
  }
]);

appServices.factory('TrackGet', ['$http', 'API', '$rootScope',
  function($http, API, $rootScope) {
    return {
      byId: function(id, callback) {
        return $http.get(API.track.query + id).success(function(data) {
          if (typeof callback === "function") callback(data);
          return data;
        });
      }
    };
  }
]);

appServices.factory('TrackService', ['$http', 'API', '$rootScope', 'AUTH_EVENTS', 'AuthService', '$modal', 'SearchGenre', 'SearchTag', 'FileUploader',
  function($http, API, $rootScope, AUTH_EVENTS, AuthService, $modal, SearchGenre, SearchTag, FileUploader) {

    var uploader = new FileUploader({
      headers: {'Client-Token':token},
      url: API.track.cover,
      removeAfterUpload: true,
      queueLimit: 1,
      withCredentials: true
    });
    uploader.filters.push(imageFilter);
    uploader.onAfterAddingFile = function (item) {
      item.url = API.track.cover + '/' + item.track.id;
      item.upload();
    };
    uploader.onProgressItem = function(fileItem, progress) {
      fileItem.track.coverProgress = progress;
      if(progress === 100) fileItem.track.coverProgress = 0;
    };
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
      fileItem.track.coverUrl = response;
    };

    return {
      uploader: uploader,

      save: function(track, callback) {
        $http.put(API.track.query + track.id, track)
        .success(function(data, status, headers, config) {
          if (!callback) {
            angular.extend(track, data);
            track.edit = false;
          } else {
            callback(data);
          }
        });
      },

      delete: function (track, index, items, callback) {
        if (!confirm('Вы уверены, что хотите удалить данный трэк?')) return false;
        $http.delete(API.track.delete + track.id)
          .success(function(data, status, headers, config) {
            if (!callback) {
              items.splice(index, 1);
            } else {
              callback(data);
            }
          });
      },

      delcomment: function (comment, index, items, callback) {
        if (!confirm('Вы уверены, что хотите удалить данный комментарий?')) return false;
        $http.delete(API.track.delcomment + comment.id)
          .success(function(data, status, headers, config) {
            if (!callback) {
              items.splice(index, 1);
            } else {
              callback(data);
            }
          });
      },

      like: function (track, callback) {
        if (!AuthService.isAuth()) {
          $rootScope.$broadcast(AUTH_EVENTS.notAuth);
          return false;
        }

        $http({
          method: 'GET',
          url: API.track.like + track.id
        }).success(function(data, status, headers, config) {
          track.isLiked = data.isLiked;
          track.numLikes = data.numLikes;
          if (typeof callback === "function") callback(data);
        });
      },

      toPlaylist: function (track, playlist) {
        if (!AuthService.isAuth()) {
          $rootScope.$broadcast(AUTH_EVENTS.notAuth);
          return false;
        }
        var playlist = $modal.open({
          templateUrl: 'templates/modal-playlist.html',
          controller: 'PlaylistModalController',
          resolve: {
            track: function() {
              return track;
            },
            playlist: function() {
              return playlist || false;
            }
          }
        });
      },

      comment: function (track, callback) {
        if (!track.id || !track.content) return false;
        $http({
          method: 'POST',
          url: API.track.comment + track.id,
          data: { content: track.content }
        }).success(function(data, status, headers, config) {
          track.content = '';
          track.numComments++;
          if (!track.comments) track.comments = [];
          track.comments.splice(0, 0, data);
        }.bind(this));
      },

      share: function (track) {
        var playlist = $modal.open({
          templateUrl: 'templates/modal-share.html',
          controller: 'ShareController',
          resolve: {
            track: function() { return track; }
          }
        });
      },

      searchGenre: function (q) {
        return SearchGenre.query(q);
      },

      selectGenre: function (track) {
        track.genreId = this.genreSelected;
        track.genre = this.genreSelected.id;
        this.genreSelected = '';
      },

      searchTag: function (q) {
        return SearchTag.query(q);
      },

      selectTag: function (track) {
        var self = this;
        SearchTag.create(track.id, self.tagSelected.name, function (res) {
          track.tags.push(res);
          self.tagSelected = '';
        });
        return false;
      },

      createTag: function (event, track) {
        var self = this;
        if(event && event.keyCode != 13) return false;
        if(typeof self.tagSelected === 'object') return false;
        SearchTag.create(track.id, self.tagSelected, function (res) {
          track.tags.push(res);
          self.tagSelected = '';
        });
        event.preventDefault();
        return false;
      },

      deleteTag: function (index, track, tag) {
        SearchTag.delete(tag.id, function (res) {
          track.tags.splice(index, 1);
        });
      }
    };
  }
]);

appServices.factory('CommentQuery', ['$http', '$rootScope', 'API', '$location',
  function($http, $rootScope, API, $location) {

    var parseParams = function(params) {
      var result = {
        xaction: params.xaction,
        url: API.track.query + params.criteria.track + '/' + params.xaction,
        page: params.page,
        params: {},
        nopaginate: params.nopaginate
      };
      return result;
    };

    var CommentQuery = function() {
      this.items = [];
      this.busy = [];
    };

    CommentQuery.prototype.getAll = function(options, callback) {
      var self = this;

      if (self.busy[options.xaction]) return;
      self.busy[options.xaction] = true;

      if(!self.items[options.xaction]) self.items[options.xaction] = [];

      options = parseParams(options);
      if (!options.nopaginate) {
        options.params.skip = self.items[options.xaction].length;
        options.params.limit = options.page ? options.page * 10 : 10;
      }

      $http(options)
        .success(function(data, status, headers, config) {
          for (var i = 0; i < data.length; i++) {
            self.items[options.xaction].push(data[i]);
          }
          self.busy[options.xaction] = false;

          if (typeof callback === "function") callback(self.items[options.xaction]);
        });
    };

    return CommentQuery;
  }
]);

appServices.service('IfService', ['$rootScope', 'AuthService', 'AUTH_EVENTS',
  function($rootScope, AuthService, AUTH_EVENTS) {
    var self = this;
    self.playlistPlaying = function (id) {
      return $rootScope.player.playlist.id === id && $rootScope.player.nowPlaying.id && $rootScope.player.nowPlaying.isPlaying;
    };
    self.playlistPaused = function (id) {
      return $rootScope.player.playlist.id === id && $rootScope.player.nowPlaying.id && !$rootScope.player.nowPlaying.isPlaying;
    };
    self.playlistEqual = function (id) {
      return id === $rootScope.player.playlist.id;
    };

    self.trackPlaying = function (id) {
      return id === $rootScope.player.nowPlaying.id && $rootScope.player.nowPlaying.isPlaying;
    };
    self.trackPaused = function (id) {
      return id !== $rootScope.player.nowPlaying.id || !$rootScope.player.nowPlaying.isPlaying;
    };
    self.trackEqual = function (id) {
      return id === $rootScope.player.nowPlaying.id;
    };

    self.userEqual = function (id) {
      return $rootScope.cur_user.id == id;
    };

    self.canEdit = function (id) {
      if (!$rootScope.cur_user) return false;
      if ($rootScope.cur_user.id == id) return true;
      if ($rootScope.admins.indexOf($rootScope.cur_user.login) !== -1) return true;
      return false;
    };
    self.canEditPlaylist = function (createdBy) {
      if (!$rootScope.cur_user) return false;
      if (!createdBy.id) return true;
      if ($rootScope.cur_user.id == createdBy.id) return true;
      if ($rootScope.admins.indexOf($rootScope.cur_user.login) !== -1) return true;
      return false;
    };
    self.isAdmin = function () {
      return ($rootScope.admins.indexOf($rootScope.cur_user.login) !== -1);
      //return (($rootScope.cur_user) && ($rootScope.cur_user.login == 'chill <3'));
    };
    self.isAuth = function () {
      return $rootScope.isAuth();
    };

    self.download = function (type, id) {
      if (!AuthService.isAuth()) {
        $rootScope.$broadcast(AUTH_EVENTS.notAuth);
        return false;
      } else {
        window.open('/api/'+type+'/download/'+id, 'download');
      }
    };
  }
]);

appServices.factory('UserQuery', ['$http', '$rootScope', 'API', '$location',
  function($http, $rootScope, API, $location) {

    var parseParams = function(params) {
      var result = {
        xaction: params.xaction,
        url: API.profile.query + params.xaction,
        page: params.page,
        params: {},
        nopaginate: params.nopaginate
      };

      switch (params.xaction) {
        case "popular":
          if (params.criteria && params.criteria.genre) result.params.genre = params.criteria.genre;
          break;
        case "tracklikes":
          result.url = API.track.query + params.criteria.track + '/likes';
          break;
        default:
          if (params.criteria && params.criteria.user) result.params.user = params.criteria.user;
          break;
      }

      return result;
    };

    var UserQuery = function() {
      this.items = [];
      this.busy = [];
    };

    UserQuery.prototype.getAll = function(options, callback) {
      var self = this;

      if (self.busy[options.xaction]) return;
      self.busy[options.xaction] = true;

      if(!self.items[options.xaction]) self.items[options.xaction] = [];

      options = parseParams(options);
      if (!options.nopaginate) {
        options.params.skip = self.items[options.xaction].length;
        options.params.limit = options.page ? options.page * 10 : 10;
      }

      $http(options)
        .success(function(data, status, headers, config) {
          for (var i = 0; i < data.length; i++) {
            self.items[options.xaction].push(data[i]);
          }
          self.busy[options.xaction] = false;

          if (typeof callback === "function") callback(self.items[options.xaction]);
        });
    };

    return UserQuery;
  }
]);

appServices.factory('UserGet', ['$http', 'API', '$rootScope',
  function($http, API, $rootScope) {
    return {
      byLogin: function(login, callback) {
        return $http.get(API.profile.query + '?user='+login).success(function(data) {
          if (typeof callback === "function") callback(data);
          return data;
        });
      },
      stats: function(login, callback) {
        return $http.get(API.profile.stats + '?user='+login).success(function(data) {
          if (typeof callback === "function") callback(data);
          return data;
        });
      }
    };
  }
]);

appServices.factory('UserService', ['$http', 'API', '$rootScope', 'AUTH_EVENTS', 'AuthService', 'FileUploader', 'IfService', '$state',
  function($http, API, $rootScope, AUTH_EVENTS, AuthService, FileUploader, IfService, $state) {

    var uploader = new FileUploader({
      headers: {'Client-Token':token},
      url: API.profile.cover,
      removeAfterUpload: true,
      queueLimit: 1,
      autoUpload: true
    });
    uploader.filters.push(imageFilter);
    uploader.onProgressItem = function(fileItem, progress) {
      fileItem.user.avatarProgress = progress;
      if(progress === 100) fileItem.user.avatarProgress = 0;
    };
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
      fileItem.user.avatarUrl = response;
      AuthService.user.avatarUrl = response;
    };


    return {
      uploader: uploader,

      save: function(user, callback) {
        $http.post(API.profile.query, user)
        .success(function(data, status, headers, config) {
          if (!callback) {
            angular.extend(user, data);
            angular.extend(AuthService.user, data);
            user.edit = false;
          } else {
            callback(data);
          }
        });
      },

      verify: function (user, callback) {
        user.state = 'loading';
        $http.get(API.profile.query + 'verify?login=' + user.login).success(function(data) {
          user.state = data;
          if (typeof callback === "function") callback(data);
        });
      },

      follow: function (user, callback) {

        if (!AuthService.isAuth()) {
          $rootScope.$broadcast(AUTH_EVENTS.notAuth);
          return false;
        }

        $http.get(API.profile.query + 'follow/' + user.id).success(function(data) {
          user.isFollowed = data.isFollowed;
          user.numFollowers = data.numFollowers;
          $rootScope.socket.put(API.subscribe + data.id);
          if (typeof callback === "function") callback(data);
        });
      },
      admins: function (callback) {
        return $http.get(API.profile.query + 'state').success(function(data) {
          if (typeof callback === "function") callback(data);
          return data;
        });
      },
      delete: function (user, callback) {
        if (!confirm('Вы уверены, что хотите удалить аккаунт без права на восстановление?')) return false;
        $http.delete(API.profile.query + 'destroy/' + user.id)
          .success(function(data, status, headers, config) {
            if (IfService.userEqual(user.id)) user_data = {};
            $state.go('main.explore');
          });
      }
    };
  }
]);

appServices.factory('PlaylistQuery', ['$http', '$rootScope', 'API', '$location',
  function($http, $rootScope, API, $location) {

    var parseParams = function(params) {
      var result = {
        xaction: params.xaction,
        url: API.playlist.query,
        page: params.page,
        params: {},
        nopaginate: params.nopaginate
      };

      switch (params.xaction) {
        case "trackplaylist":
          result.url = API.track.query + params.criteria.track + '/playlists';
          break;
        case "modal":
          result.url = API.playlist.track + '/' + params.criteria.track;
          break;
        default:
          if (params.criteria && params.criteria.user) result.params.user = params.criteria.user;
          if (params.criteria && params.criteria.track) result.params.track = params.criteria.track;
          break;
      }

      return result;
    };

    var PlaylistQuery = function() {
      this.items = [];
      this.busy = [];
    };

    PlaylistQuery.prototype.getAll = function(options, callback) {
      var self = this;

      if (self.busy[options.xaction]) return;
      self.busy[options.xaction] = true;

      if(!self.items[options.xaction]) self.items[options.xaction] = [];

      options = parseParams(options);
      if (!options.nopaginate) {
        options.params.skip = self.items[options.xaction].length;
        options.params.limit = options.page ? options.page * 10 : 10;
      }

      $http(options)
        .success(function(data, status, headers, config) {
          for (var i = 0; i < data.length; i++) {
            self.items[options.xaction].push(data[i]);
          }
          self.busy[options.xaction] = false;

          if (typeof callback === "function") callback(self.items[options.xaction]);
        });
    };

    return PlaylistQuery;
  }
]);

appServices.factory('PlaylistGet', ['$http', 'API', '$rootScope',
  function($http, API, $rootScope) {
    return {
      byId: function(id, callback) {
        return $http.get(API.playlist.query + id).success(function(data) {
          if (typeof callback === "function") callback(data);
          return data;
        });
      }
    };
  }
]);

appServices.factory('PlaylistService', ['$http', 'API', '$rootScope', 'AUTH_EVENTS', 'AuthService', 'FileUploader',
  function($http, API, $rootScope, AUTH_EVENTS, AuthService, FileUploader) {

    var syncPlaylist = function (data) {
      angular.extend($rootScope.player.playlist, data);
      $rootScope.player.saveStorage();
    };

    var uploader = new FileUploader({
      headers: {'Client-Token':token},
      url: API.playlist.query,
      removeAfterUpload: true,
      queueLimit: 1,
      withCredentials: true
    });
    uploader.filters.push(imageFilter);
    uploader.onAfterAddingFile = function (item) {
      if (item.playlist && item.playlist.id) {
        item.url = API.playlist.cover + '/' + item.playlist.id;
        item.upload();
      } else {
        uploader.clearQueue();
        uploader.queue.push(item);
      }
    };
    uploader.onProgressItem = function(fileItem, progress) {
      if (fileItem.playlist && fileItem.playlist.id) {
        fileItem.playlist.coverProgress = progress;
        if(progress === 100) fileItem.playlist.coverProgress = 0;
      }
    };
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
      if (fileItem.playlist && fileItem.playlist.id && !response.id) {
        fileItem.playlist.coverUrl = response;
      }
    };


    return {
      uploader: uploader,

      save: function(playlist, callback) {
        var params = {
          name: playlist.name,
          tracks: playlist.tracks.map(function(o) { return o.id; })
        };
        $http.put(API.playlist.query + playlist.id, params)
        .success(function(data, status, headers, config) {
          if (!callback) {
            angular.extend(playlist, data);
            playlist.edit = false;          
            if ($rootScope.player.playlist.id == data.id) {
              syncPlaylist(data);
            }
          } else {
            callback(data);
          }
        });
      },

      delete: function (playlist, index, items, callback) {
        if (!confirm('Вы уверены, что хотите удалить плэйлист?')) return false;
        $http.delete(API.playlist.query + playlist.id)
          .success(function(data, status, headers, config) {
            if ($rootScope.player.playlist.id == playlist.id) {
              $rootScope.player.playlist = {tracks:[]};
              $rootScope.player.saveStorage();
            }
            if (!callback) {
              if (items.length > 0) {
                items.splice(index, 1);
              }
            } else {
              callback(data);
            }
          });
      },

      toPlaylist: function (playlist, track, callback) {
        $http.get(API.playlist.track+'?track='+track.id+'&playlist='+playlist.id).success(function(data) {
          angular.extend(playlist, data);
          if ($rootScope.player.playlist.id == playlist.id) {
            syncPlaylist(data);
          }
          if (typeof callback === "function") callback(data);
        });
      },

      create: function (playlist, callback) {
        var params = {
          name: playlist.name,
          tracks: playlist.tracks ? playlist.tracks.map(function(o) { return o.id; }) : [ playlist.track ]
        };
        if(this.uploader.queue.length > 0) {
          this.uploader.queue[0].formData.push(params);
          this.uploader.queue[0].upload();
          if(params.tracks.length > 1) {
            this.uploader.queue[0].onComplete = function (data) {
              syncPlaylist(data);
            };            
          }
          callback();
        } else {
          $http.post(API.playlist.query, params)
          .success(function(data, status, headers, config) {
            if (!callback) {
              angular.extend(playlist, data);
              playlist.edit = false;
            } else {
              if (params.tracks.length > 1) {
                syncPlaylist(data);
              }
              callback(data);
            }
          });
        }
      },

      like: function (playlist, callback) {
        if (!AuthService.isAuth()) {
          $rootScope.$broadcast(AUTH_EVENTS.notAuth);
          return false;
        }

        $http({
          method: 'GET',
          url: API.playlist.like + playlist.id
        }).success(function(data, status, headers, config) {
          playlist.isLiked = data.isLiked;
          playlist.numLikes = data.numLikes;
          if (typeof callback === "function") callback(data);
        });
      }
    };
  }
]);

appServices.factory('Visualizer', [

  function() {
    return function() {
      // Private properties and methods
      var that = this;
      var startArr;
      var endArr;
      var looping = false;

      // Loop method adjusts the height of bar and redraws if neccessary
      var loop = function() {
        var delta;
        var animationComplete = true;

        // Boolean to prevent update function from looping if already looping
        looping = true;

        // For each bar
        for (var i = 0; i < endArr.length; i++) {
          // Change the current bar height toward its target height
          delta = (endArr[i] - startArr[i]) / that.animationSteps;
          that.curArr[i] += delta;
          // If any change is made then flip a switch
          if (delta) {
            animationComplete = false;
          }
        }

        // If no change was made to any bars then we are done
        if (animationComplete) {
          looping = false;
        } else {
          // Draw and call loop again
          draw(that.curArr);
          setTimeout(loop, that.animationInterval / that.animationSteps);
        }
      }; // End loop function

      // Draw method updates the canvas with the current display
      var draw = function(arr) {
        var numOfBars = arr.length*2;
        var barWidth;
        var barHeight;
        var ratio;
        var maxBarHeight;
        var gradient;
        var gradientOnMove;
        var largestValue = 0;
        var graphAreaX = 0;
        var graphAreaY = 0;
        var graphAreaWidth = that.width;
        var graphAreaHeight = that.height;
        var i;

        that.ctx.clearRect(0, 0, that.width, that.height);

        // Update the dimensions of the canvas only if they have changed
        if (that.ctx.canvas.width !== that.width || that.ctx.canvas.height !== that.height) {
          that.ctx.canvas.width = that.width;
          that.ctx.canvas.height = that.height;
        }

        // Draw the background color
        that.ctx.fillStyle = that.backgroundColor;
        that.ctx.fillRect(0, 0, that.width, that.height);

        // If x axis labels exist then make room
        if (that.xAxisLabelArr.length) {
          graphAreaHeight -= 40;
        }

        // Calculate dimensions of the bar
        barWidth = graphAreaWidth / numOfBars - that.margin * 2;
        maxBarHeight = graphAreaHeight;
        //console.log(graphAreaWidth);

        // Determine the largest value in the bar array
        for (i = 0; i < arr.length; i++) {
          if (arr[i] > largestValue) {
            largestValue = arr[i];
          }
        }

        // For each bar
        for (i = 0; i < arr.length; i++) {
          // Set the ratio of current bar compared to the maximum
          if (that.maxValue) {
            ratio = arr[i] / that.maxValue;
          } else {
            ratio = arr[i] / largestValue;
          }

          barHeight = ratio * maxBarHeight;

          // Draw bar background
          var color = "#fff";
          that.ctx.fillStyle = color;
          that.ctx.fillRect(
            that.margin + i * that.width / numOfBars,
            graphAreaHeight - barHeight,
            barWidth,
            barHeight
          );
        }

        // For each bar
        for (i = arr.length; i > 0; i--) {
          // Set the ratio of current bar compared to the maximum
          if (that.maxValue) {
            ratio = arr[i] / that.maxValue;
          } else {
            ratio = arr[i] / largestValue;
          }

          barHeight = ratio * maxBarHeight;

          // Draw bar background
          var color = "#fff";
          that.ctx.fillStyle = color;
          that.ctx.fillRect(
            graphAreaWidth - (that.margin + i * that.width / numOfBars),
            graphAreaHeight - barHeight,
            barWidth,
            barHeight
          );
        }
      }; // End draw method

      // Public properties and methods
      this.ctx = '';
      this.progress = 0;
      this.width = 300;
      this.height = 50;
      this.maxValue = 0;
      this.margin = 1;
      this.curArr = [];
      this.backgroundColor = "rgba(0, 0, 0, 0)";
      this.xAxisLabelArr = [];
      this.yAxisLabelArr = [];
      this.animationInterval = 100;
      this.animationSteps = 10;
      this.offsetX = 0;

      // Update method sets the end bar array and starts the animation
      this.update = function(newArr) {
        // If length of target and current array is different
        if (newArr) {
          if (that.curArr.length !== newArr.length) {
            that.curArr = newArr;
            draw(newArr);
          } else {
            // Set the starting array to the current array
            startArr = that.curArr;
            // Set the target array to the new array
            endArr = newArr;
            // Animate from the start array to the end array
            if (!looping) {
              loop();
            }
          }
        }
      }; // End update method
    };
  }
]);