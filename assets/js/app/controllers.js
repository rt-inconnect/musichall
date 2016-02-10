'use strict';

var appControllers = angular.module('appControllers', []);

appControllers.controller('AppController', [
  '$scope', '$rootScope', 'AUTH_EVENTS', 'AuthService', 'SM2Player', 'Search', '$state', 'Notifies', 'TrackService', 'UserService', 'PlaylistService', 'TrackUploader', 'PlaylistQuery', 'IfService', 'PLAN', 'RADIO', 'Visualizer',
  function ($scope, $rootScope, AUTH_EVENTS, AuthService, SM2Player, Search, $state, Notifies, TrackService, UserService, PlaylistService, TrackUploader, PlaylistQuery, IfService, PLAN, RADIO, Visualizer) {
    $rootScope.cur_user = AuthService.user;
    UserService.admins(function (admins) { $rootScope.admins = admins; });
    $rootScope.isAuth = AuthService.isAuth;
    $rootScope.snotifies = [];
    $rootScope.snotifyClose = function (index) {
      $rootScope.snotifies.splice(index, 1);
    };
    $rootScope.PLAN = PLAN;
    $rootScope.RADIO = RADIO;
    
    $rootScope.trackUploader = new TrackUploader();
    $rootScope.IfService = IfService;
    $rootScope.TrackService = TrackService;
    $rootScope.UserService = UserService;
    $rootScope.PlaylistService = PlaylistService;
    
    $rootScope.theme = $.jStorage.get('theme', 'theme-dark');
    $scope.isThumb = $.jStorage.get('isThumb', false);
    $scope.playerVisible = $.jStorage.get('playerVisible', true);
    
    $scope.switchTrackMode = function (mode) {
      $scope.isThumb = mode;
      $.jStorage.set('isThumb', mode);
    };

    $scope.login = function (strategy) {
      var w = 600;
      var h = 400;
      var left = (screen.width/2)-(w/2);
      var top = (screen.height/2)-(h/2);
      var authWin = window.open("/api/user/"+strategy, "authWin",'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+w+', height='+h+', top='+top+', left='+left);
      authWin.focus();
    };

    $scope.logout = function () {
      AuthService.logout()
      .success(function () {
        $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
      });
      return false;
    };

    $scope.enableNotify = function () {
      if (Notification && Notification.permission !== "denied") {
        Notification.requestPermission(function (status) {
          if (Notification.permission !== status) {
            Notification.permission = status;
          }
        });
      }
    };

    $rootScope.goHome = function () {
      if ($scope.isAuth()) {
        $state.go('main.stream');
      } else {
        $state.go('main.popular');        
      }
    };

    $rootScope.download = function (type, id) {
      if (!$scope.isAuth()) {
        $rootScope.$broadcast(AUTH_EVENTS.notAuth);
        return false;
      } else {
        window.open('/api/'+type+'/download/'+id, 'download');
      }
    };

    $scope.searchAll = function (q) {
      return Search.query(q, $scope);
    };
    $scope.goToQ = function () {
      if ($scope.searchEnterClicked) return false;
      if ($scope.qSelected.type === 'user') {
        $state.go('user.tracks', {user:$scope.qSelected.id});
      } else {
        $state.go('track.comments', {id:$scope.qSelected.id});
      }
      return false;
    };
    $scope.searchEnterPress = function (event) {
      if(event && event.keyCode == 13) {
        $scope.searchEnterClicked = true;
        $scope.goToSearch();
        return false;
      }
    };
    $scope.goToSearch = function () {
      var val = document.getElementById('search-input').value;
      angular.element(document.querySelector('.rt-search .dropdown-menu')).addClass("ng-hide");
      $state.go('main.search', {type:'track', q:val});
      return false;
    };

    $scope.togglePlay = function (track, index) {
      if (track.isPlaying)
        $rootScope.player.pause();
      else
        $rootScope.player.play(track, index);
    };

    $scope.togglePlayer = function () {
      $scope.playerVisible = !$scope.playerVisible;
      $.jStorage.set('playerVisible', $scope.playerVisible);
    };

    $rootScope.player = new SM2Player();
    $rootScope.player.init();
    $rootScope.$on('track:progress', function (event, data) {
      if (!$rootScope.$$phase) $rootScope.$digest();
    });

    $rootScope.$watch('player.shuffle', function (shuffle) {
      $.jStorage.set('shuffle', shuffle);
    });
    $rootScope.$watch('player.repeat', function (repeat) {
      $.jStorage.set('repeat', repeat);
    });
    
    $scope.togglePlaylistEdit = function () {
      if (IfService.canEditPlaylist($rootScope.player.playlist.createdBy))
        $rootScope.TrackService.toPlaylist(false, $rootScope.player.playlist);
    };

    $scope.readNotifies = function() {
      if($rootScope.notifies.count > 0) {
        Notifies.mark().$promise.then(function () {
          $rootScope.notifies.count = 0;
        });
      }
    };
    $scope.displayNotifyText = function (notify) {
      try {
        switch(notify.action) {
          case 'follow':
            return notify.initiator.login + ' подписался на Вашу ленту';
            break;
          case 'like':
            return notify.initiator.login + ' понравился Ваш трэк "' + notify.track.name + '"';
            break;
          case 'playlist':
            return notify.initiator.login + ' добавил трэк "' + notify.track.name + '" в плэйлист "' + notify.playlist.name + '"';
            break;
          case 'playlistlike':
            return notify.initiator.login + ' понравился Ваш плэйлист "' + notify.playlist.name + '"';
            break;
          case 'trackcomment':
            return notify.initiator.login + ' прокомментировал Ваш трэк "' + notify.track.name + '"';
            break;
        }
      } catch(e) {
        //console.log(e);
        return 'НЛО прилетело и что-то там нафурычила';
      }
    };

    $scope.isRadio = function (playlist) {
      for (var i = 0; i < playlist.length; i++) {
        if (playlist[i].bitrate) return true;
      }
      return false;
    };

    $rootScope.playlists = new PlaylistQuery();
    $rootScope.playlistsOpts = { xaction: 'my' };
    $rootScope.playlists.getAll($rootScope.playlistsOpts);

    /*$rootScope.histories = new TrackQuery();
    $rootScope.historiesOpts = { xaction: 'history' };
    $rootScope.histories.getAll($rootScope.historiesOpts);*/
  }
]);

appControllers.controller('LoginController', [
  '$scope', '$rootScope', 'AUTH_EVENTS', 'AuthService',
  function ($scope, $rootScope, AUTH_EVENTS, AuthService) {
    /*$scope.credentials = {
      username: '',
      password: '',
      rememberme: true
    };
    $scope.login = function (credentials) {
      AuthService.login(credentials)
      .success(function () {
        $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
      })
      .error(function () {
        $rootScope.$broadcast(AUTH_EVENTS.loginFailed);
      });
    };*/
  }
]);

appControllers.controller('NotifiesController', [
  '$scope', '$rootScope', 'API', 'Notifies',
  function ($scope, $rootScope, API, Notifies) {
    $scope.notifiesAll = Notifies.getAll({limit: 10, skip: 0});
    $scope.nextPage = function () {
      $scope.busy = true;
      Notifies.getAll({limit:10, skip:$scope.notifiesAll.length}).$promise.then(function (data) {
        for (var i = 0; i < data.length; i++) {
          $scope.notifiesAll.push(data[i]);
        }
        $scope.busy = false;
      });
    };
  }
]);

appControllers.controller('MainController', [
  '$scope',
  function ($scope) {

  }
]);

appControllers.controller('MainSearchController', [
  '$scope', 'SearchQuery', '$state',
  function ($scope, SearchQuery, $state) {
    $scope.type = $state.params.type || 'user';
    $scope.q = $state.params.q || null;
    $scope.results = new SearchQuery();
    $scope.resultsOpts = { xaction: $scope.type, criteria: { q: $scope.q || null } };
    $scope.results.getAll($scope.resultsOpts);
  }
]);

appControllers.controller('MainStreamController', [
  '$scope', 'TrackQuery', '$state',
  function ($scope, TrackQuery, $state) {
    $scope.tracks = new TrackQuery();
    $scope.streamOpts = { xaction: 'stream', criteria: { user: $state.params.user || null } };
    $scope.tracks.getAll($scope.streamOpts);
  }
]);

appControllers.controller('MainExploreController', [
  '$scope', '$rootScope', '$stateParams', 'TrackQuery', 'Genres',
  function ($scope, $rootScope, $stateParams, TrackQuery, Genres) {
    var criteria = {
      genre: $stateParams.genre,
      tag: $stateParams.tag
    };

    Genres.get(function (genres) {
      $scope.genres = genres;
    });

    $scope.tracks = new TrackQuery();
    $scope.allOpts = { xaction: 'all', criteria: criteria };
    $scope.tracks.getAll($scope.allOpts);

    $rootScope.trackUploader.uploader.onSuccessItem = function (item, res) {
      res.edit = true;
      $scope.tracks.items.all.splice(0,0,res);
    };
  }
]);
appControllers.controller('MainPopularController', [
  '$scope', '$rootScope', '$stateParams', 'TrackQuery', 'UserQuery', 'Genres',
  function ($scope, $rootScope, $stateParams, TrackQuery, UserQuery, Genres) {
    $scope.toggleInterval = function (interval) {
      $scope.popularOpts.criteria.interval = interval;
      $scope.tracks.items.popular = [];
      $scope.tracks.getAll($scope.popularOpts);
    };
    Genres.get(function (genres) {
      $scope.genres = genres;
    });

    $scope.users = new UserQuery();
    $scope.usersOpts = { xaction: 'popular', criteria: {genre: $stateParams.genre} };
    $scope.users.getAll($scope.usersOpts);

    $scope.tracks = new TrackQuery();
    $scope.popularOpts = { xaction: 'popular', criteria: {genre: $stateParams.genre,interval: 'weekly'} };
    $scope.tracks.getAll($scope.popularOpts);
  }
]);

appControllers.controller('MainRecommendedController', [
  '$scope', '$rootScope', 'TrackQuery',
  function ($scope, $rootScope, TrackQuery) {
    $scope.tracks = new TrackQuery();
    $scope.recommendedOpts = { xaction: 'recommended' };
    $scope.tracks.getAll($scope.recommendedOpts);
  }
]);

appControllers.controller('UploadController', [
  '$scope', '$rootScope',
  function ($scope, $rootScope) {}
]);

appControllers.controller('PlaylistModalController', [
  '$scope', '$rootScope', '$modalInstance', 'track', 'playlist', 'PlaylistQuery',
  function ($scope, $rootScope, $modalInstance, track, playlist, PlaylistQuery) {
    $scope.tabs = [{acitve:false},{active:false}];
    if (track) {
      $scope.tabs[0].active = true;
      $scope.track = track;
      $scope.no_cover = 'images/no-cover.jpg';

      $scope.playlists = new PlaylistQuery();
      $scope.playlistsOpts = { xaction: 'modal', criteria: { track: track.id }, nopaginate: true};
      $scope.playlists.getAll($scope.playlistsOpts);

      $scope.playlist = {name:'', track:track.id};      
    } else {
      $scope.tabs[1].active = true;
      $scope.playlist = playlist;
    }

    $scope.close = function () {
      $modalInstance.dismiss('cancel');
    };

    $scope.delete  = function () {
      $rootScope.PlaylistService.delete($scope.playlist, false, false, function () {
        $scope.close();
      });
    }

    $scope.create = function () {
      if (!$scope.playlist.id) {
        $rootScope.PlaylistService.create($scope.playlist, function (nplaylist) {
          $scope.close();
        });
      } else {
        $rootScope.PlaylistService.save($scope.playlist, function (nplaylist) {
          $scope.close();
        });        
      }
    };

  }
]);


appControllers.controller('ShareController', [
  '$scope', '$modalInstance', 'track',
  function ($scope, $modalInstance, track) {

    $scope.track = track;
    $scope.url = "http://musichall.uz/track/"+track.id+"/comments";
    $scope.widget = "http://musichall.uz/w/"+track.id;
    $scope.widgetUrl = '<iframe width="100%" scrolling="no" frameborder="no" height="188" src="http://musichall.uz/w/'+track.id+'"></iframe>';

    $scope.close = function () {
      $modalInstance.dismiss('cancel');
    };
    
    $scope.share = function (strategy) {
      var social = '';
      var w = 600;
      var h = 400;
      var left = (screen.width/2)-(w/2);
      var top = (screen.height/2)-(h/2);
      switch(strategy) {
        case 'google':
          social = 'https://plus.google.com/share?image=http://musichall.uz/'+track.coverUrl+'&url=';
          break;
        case 'facebook':
          social = 'http://www.facebook.com/sharer/sharer.php?u=';
          break;
        case 'twitter':
          social = 'https://twitter.com/intent/tweet?image=http://musichall.uz/'+track.coverUrl+'&url=';
          break;
        case 'vk':
          social = 'http://vk.com/share.php?image=http://musichall.uz/'+track.coverUrl+'&url=';
          break;
        case 'mailru':
          social = 'http://connect.mail.ru/share?image=http://musichall.uz/'+track.coverUrl+'&share_url=';
          break;
        case 'odnoklassniki':
          social = 'http://www.odnoklassniki.ru/dk?st.cmd=addShare&image=http://musichall.uz/'+track.coverUrl+'&st._surl=';
          break;
      }
      social = social + $scope.url;

      var shareWin = window.open(social, "shareWin",'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width='+w+', height='+h+', top='+top+', left='+left);
      shareWin.focus();
    };
  }
]);


appControllers.controller('ProfileController', ['$scope', '$rootScope', 'UserGet', 'FileUploader', 'API', '$state', '$http',
  function ($scope, $rootScope, UserGet, FileUploader, API, $state, $http) {
    
    //if ($state.params.user === $scope.cur_user.login) $state.go('profile.stream');

    UserGet.byLogin($state.params.user || $scope.cur_user.login, function (res) {
      $scope.user = res;
    });
    UserGet.stats($state.params.user || $scope.cur_user.login, function (res) {
      $scope.stats = res;
    });

    $scope.changeTheme = function (theme) {
      $rootScope.theme = theme;
      $.jStorage.set('theme', theme);
    };
    $scope.currentTheme = function (theme) {
      return $rootScope.theme == theme;
    };
  }
]);

appControllers.controller('ProfileTracksController', [
  '$scope', 'TrackQuery', '$state', 'API', '$rootScope', '$location',
  function ($scope, TrackQuery, $state, API, $rootScope, $location) {
    $scope.tracks = new TrackQuery();
    $scope.addedOpts = { xaction: 'added', criteria: { user: $state.params.user || null } };
    $scope.tracks.getAll($scope.addedOpts);
    
    $rootScope.trackUploader.uploader.onSuccessItem = function (item, res) {
      res.edit = true;
      $scope.tracks.items.added.splice(0,0,res);
    };

  }
]);


appControllers.controller('ProfileLikesController', [
  '$scope', 'TrackQuery', '$state',
  function ($scope, TrackQuery, $state) {
    $scope.tracks = new TrackQuery();
    $scope.likesOpts = { xaction: 'likes', criteria: { user: $state.params.user || null } };
    $scope.tracks.getAll($scope.likesOpts);
  }
]);

appControllers.controller('ProfileFollowersController', [
  '$scope', '$state', 'UserQuery',
  function ($scope, $state, UserQuery) {
    $scope.followers = new UserQuery();
    $scope.followersOpts = { xaction: 'followers', criteria: { user: $state.params.user || null }};
    $scope.followers.getAll($scope.followersOpts);
  }
]);

appControllers.controller('ProfileFollowsController', [
  '$scope', '$state', 'UserQuery',
  function ($scope, $state, UserQuery) {
    $scope.follows = new UserQuery();
    $scope.followsOpts = { xaction: 'follows', criteria: { user: $state.params.user || null }};
    $scope.follows.getAll($scope.followsOpts);
  }
]);

appControllers.controller('ProfilePlaylistsController', [
  '$scope', '$rootScope', '$state', 'PlaylistQuery',
  function ($scope, $rootScope, $state, PlaylistQuery) {
    $scope.playlists = new PlaylistQuery();
    $scope.playlistsOpts = { xaction: 'added', criteria: { user: $state.params.user || null }};
    $scope.playlists.getAll($scope.playlistsOpts);
  }
]);

appControllers.controller('PlaylistController', [
  '$scope', '$rootScope', '$state', 'TrackQuery', 'PlaylistGet',
  function ($scope, $rootScope, $state, TrackQuery, PlaylistGet) {
    $scope.playlist = PlaylistGet.byId($state.params.id, function (data) {
      $scope.playlist = data;
    });
  }
]);

appControllers.controller('TrackController', [
  '$scope', '$state', 'TrackGet',
  function ($scope, $state, TrackGet) {
    TrackGet.byId($state.params.id, function (track) {
      $scope.track = track;
    });
  }
]);

appControllers.controller('TrackCommentController', [
  '$scope', '$state', 'CommentQuery',
  function ($scope, $state, CommentQuery) {
    $scope.comments = new CommentQuery();
    $scope.commentsOpts = { xaction: 'comments', criteria: { track: $state.params.id }};
    $scope.comments.getAll($scope.commentsOpts, function () {
      setTimeout(function() {
        $scope.$parent.track.comments = $scope.comments.items.comments;
        $scope.$digest();
      }, 500);
    });
  }
]);

appControllers.controller('TrackLikeController', [
  '$scope', '$state', 'UserQuery',
  function ($scope, $state, UserQuery) {
    $scope.tracklikes = new UserQuery();
    $scope.tracklikesOpts = { xaction: 'tracklikes', criteria: { track: $state.params.id }};
    $scope.tracklikes.getAll($scope.tracklikesOpts);
  }
]);

appControllers.controller('TrackPlaylistController', [
  '$scope', '$state', 'PlaylistQuery',
  function ($scope, $state, PlaylistQuery) {
    $scope.playlists = new PlaylistQuery();
    $scope.playlistsOpts = { xaction: 'trackplaylist', criteria: { track: $state.params.id || null }};
    $scope.playlists.getAll($scope.playlistsOpts);
  }
]);

appControllers.controller('TrackSameController', [
  '$scope', '$state', 'TrackQuery',
  function ($scope, $state, TrackQuery) {
    $scope.tracks = new TrackQuery();
    $scope.sameOpts = { xaction: 'same', criteria: { id: $state.params.id } };
    $scope.tracks.getAll($scope.sameOpts);
  }
]);

appControllers.controller('MessageController', [
  '$scope', '$rootScope', '$state',
  function ($scope, $rootScope, $state) {
    
    $scope.isOpened = false;
    $scope.tabs = [{acitve:false},{active:false}];
    $scope.text = '';

    if (!!$state.params.user) {
      $scope.tabs[0].active = false;
      $scope.tabs[1].active = true;
    }

    $rootScope.chat.get();

    $scope.toggleIsOpened = function () {
      $scope.isOpened = !$scope.isOpened;
    };

    $scope.searchChatters = function (q) {
      return $rootScope.messages.search(q, $scope);
    };
    $scope.goToChatter = function () {
      $scope.tabs[0].active = false;
      $scope.tabs[1].active = true;
      $state.go('message.chat', {user:$scope.qChatter.id});
    };

    $scope.chatWith = function (user) {
      if ($rootScope.IfService.userEqual(user.id)) return false;
      $scope.isOpened = false;
      $scope.tabs[0].active = false;
      $scope.tabs[1].active = true;
      $state.go('message.chat',{user: user.login});
    };

    $scope.goToChat = function () {
      $scope.isOpened = false;
      $scope.tabs[0].active = true;
      $scope.tabs[1].active = false;
      $state.go('message');
    };

    $scope.sendChat = function () {
      var self = this;
      if (!self.text) return false;
      self.sending = true;
      $rootScope.chat.send(self.text, function (message) {
        self.sending = false;
        self.text = '';
        $scope.$apply();
        document.getElementById('messageInput').focus();
      });
    };

    $scope.sayTo = function (login) {
      $scope.text = login + ', ';
      document.getElementById('messageInput').focus();
    };
  }
]);

appControllers.controller('MessageChatController', [
  '$scope', '$rootScope', '$state',
  function ($scope, $rootScope, $state) {

    $rootScope.messages.get($state.params.user);

    $scope.send = function () {
      var self = this;
      if (!self.text) return false;
      self.sending = true;
      $rootScope.messages.send(self.text, $state.params.user, function (message) {
        self.sending = false;
        self.text = '';
        $scope.$apply();
        document.getElementById('messageInput').focus();
      });
    };
  }
]);