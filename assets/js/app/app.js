'use strict';

io.sails.autoConnect = false;

var body = document.body,
    timer;

var app = angular.module('app', [
  'ui.bootstrap',
  'ui.router',
  'appControllers',
  'appServices',
  'appFilters',
  'appDirectives',
  'angularFileUpload',
  'dndLists',
  'luegg.directives',
  'angularMoment'
]);

app.constant('angularMomentConfig', {
    //preprocess: 'unix', // optional
    timezone: 'Asia/Tashkent' // optional
});

app.config(['$stateProvider', '$urlRouterProvider', '$httpProvider', '$locationProvider',
  function ($stateProvider, $urlRouterProvider, $httpProvider, $locationProvider) {
    $locationProvider.html5Mode(true)
    
    $urlRouterProvider.when('/profile', '/profile/tracks');

    if(!user_data.id)
      $urlRouterProvider.otherwise('/main/popular');
    else
      $urlRouterProvider.otherwise('/main/stream');

    $stateProvider
      .state('main', {
        url: '/main',
        templateUrl: '/templates/main.html',
        controller: 'MainController',
        requireLogin: true,
        abstract: true
      })
      .state('main.stream', {
        url: '/stream',
        templateUrl: '/templates/main/stream.html',
        controller: 'MainStreamController',
        requireLogin: true
      })
      .state('main.explore', {
        url: '/explore?genre&tag',
        templateUrl: '/templates/main/explore.html',
        controller: 'MainExploreController'
      })
      .state('main.popular', {
        url: '/popular?genre',
        templateUrl: '/templates/main/popular.html',
        controller: 'MainPopularController'
      })
      .state('main.recommended', {
        url: '/recommended',
        templateUrl: '/templates/main/recommended.html',
        controller: 'MainRecommendedController'
      })
      .state('main.search', {
        url: '/search?type&q',
        templateUrl: '/templates/main/search.html',
        controller: 'MainSearchController'
      })
      .state('upload', {
        url: '/upload',
        templateUrl: '/templates/upload.html',
        controller: 'UploadController',
        requireLogin: true
      })
      .state('login', {
        url: '/login',
        templateUrl: '/templates/login.html',
        controller: 'LoginController'
      })
      .state('playlist', {
        url: '/playlist/:id',
        templateUrl: '/templates/playlist.html',
        controller: 'PlaylistController'
      })

      .state('track', {
        url: '/track/:id',
        templateUrl: '/templates/track.html',
        controller: 'TrackController',
        abstract: true
      })
      .state('track.comments', {
        url: '/comments',
        templateUrl: '/templates/track/comments.html',
        controller: 'TrackCommentController'
      })
      .state('track.likes', {
        url: '/likes',
        templateUrl: '/templates/track/likes.html',
        controller: 'TrackLikeController'
      })
      .state('track.playlists', {
        url: '/playlists',
        templateUrl: '/templates/track/playlists.html',
        controller: 'TrackPlaylistController'
      })
      .state('track.same', {
        url: '/same',
        templateUrl: '/templates/track/same.html',
        controller: 'TrackSameController'
      })

      .state('notifies', {
        url: '/notifies',
        templateUrl: '/templates/notifies.html',
        controller: 'NotifiesController',
        requireLogin: true
      })

      .state('message', {
        url: '/message',
        templateUrl: '/templates/message.html',
        controller: 'MessageController',
        requireLogin: true
      })
      .state('message.chat', {
        url: '/:user',
        templateUrl: '/templates/message/chat.html',
        controller: 'MessageChatController',
        requireLogin: true
      })

      .state('profile', {
        url: '/profile',
        templateUrl: '/templates/profile.html',
        controller: 'ProfileController',
        requireLogin: true,
        abstract: true
      })
      .state('profile.tracks', {
        url: '/tracks',
        templateUrl: '/templates/profile/tracks.html',
        controller: 'ProfileTracksController',
        requireLogin: true
      })
      .state('profile.likes', {
        url: '/likes',
        templateUrl: '/templates/profile/likes.html',
        controller: 'ProfileLikesController',
        requireLogin: true
      })
      .state('profile.followers', {
        url: '/followers',
        templateUrl: '/templates/profile/followers.html',
        controller: 'ProfileFollowersController',
        requireLogin: true
      })
      .state('profile.follows', {
        url: '/follows',
        templateUrl: '/templates/profile/follows.html',
        controller: 'ProfileFollowsController',
        requireLogin: true
      })
      .state('profile.playlists', {
        url: '/playlists',
        templateUrl: '/templates/profile/playlists.html',
        controller: 'ProfilePlaylistsController',
        requireLogin: true
      })

      .state('user', {
        url: '/:user',
        templateUrl: '/templates/profile.html',
        controller: 'ProfileController',
        abstract: true
      })
      .state('user.tracks', {
        url: '/tracks',
        templateUrl: '/templates/profile/tracks.html',
        controller: 'ProfileTracksController'
      })
      .state('user.likes', {
        url: '/likes',
        templateUrl: '/templates/profile/likes.html',
        controller: 'ProfileLikesController'
      })
      .state('user.followers', {
        url: '/followers',
        templateUrl: '/templates/profile/followers.html',
        controller: 'ProfileFollowersController'
      })
      .state('user.follows', {
        url: '/follows',
        templateUrl: '/templates/profile/follows.html',
        controller: 'ProfileFollowsController'
      })
      .state('user.playlists', {
        url: '/playlists',
        templateUrl: '/templates/profile/playlists.html',
        controller: 'ProfilePlaylistsController'
      });
  }
]);

app.run(['$rootScope', '$injector', '$state', '$stateParams', '$location', 'AUTH_EVENTS', 'AuthService', 'Messages', 'Notifies', 'Chat',
  function ($rootScope, $injector, $state, $stateParams, $location, AUTH_EVENTS, AuthService, Messages, Notifies, Chat) {
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
    $injector.get("$http").defaults.transformRequest = function(data, headersGetter) {
        headersGetter()['Client-Token'] = token;
        if (data) {
            return angular.toJson(data);
        }
    };

    $rootScope.$on('$stateChangeStart', function (event, next, nextParams, prev, prevParams) {

      if(next.requireLogin && !AuthService.isAuth()) {
        event.preventDefault();
        $rootScope.$broadcast(AUTH_EVENTS.notAuth);
      }

      if(AuthService.isAuth()) {
        var justConnected = false;
        if(!$rootScope.socket) {
          $rootScope.socket = io.connect('http://musichall.uz');
          justConnected = true;
        } else if(!$rootScope.socket.socket.connected) {
          $rootScope.socket.socket.connect();
          justConnected = true;
        }

        if(justConnected) {

          $rootScope.socket.on('notify', function (res) {
            $rootScope.player.sounds.notify.play();
            $rootScope.notifies.items.splice(0, 0, res);
            $rootScope.notifies.count++;
            $rootScope.$digest();
          });

          $rootScope.notifies = Notifies.getUnreaded();

          $rootScope.messages = new Messages();
          $rootScope.messages.getTotal();
          $rootScope.messages.getChatters();

          $rootScope.chat = new Chat();
          $rootScope.chat.getOnliners();

          $rootScope.socket.on('online', function (user) {
            if ($rootScope.messages.chatters[user[0].login]) $rootScope.messages.chatters[user[0].login].isOnline = 1;
            $rootScope.chat.onliners[user[0].login] = user[0];
            $rootScope.$apply();
          });

          $rootScope.socket.on('offline', function (user) {
            if ($rootScope.messages.chatters[user[0].login]) $rootScope.messages.chatters[user[0].login].isOnline = 0;
            $rootScope.chat.onliners[user[0].login] = user[0];
            $rootScope.$apply();            
          });
        }

      }

    });
    $rootScope.$on(AUTH_EVENTS.notAuth, function (event, next) {
      $state.go('login');
    });
    $rootScope.$on(AUTH_EVENTS.loginSuccess, function (event, next) {
      $state.go('/');
    });
    $rootScope.$on(AUTH_EVENTS.loginFailed, function (event, next) {
      alert('Логин или пароль не верно введены!');
    });
    $rootScope.$on(AUTH_EVENTS.logoutSuccess, function (event, next) {
      $state.go('/', {}, {reload:true});
    });

  }
]);

app.constant('AUTH_EVENTS', {
  loginSuccess: 'auth-login-success',
  loginFailed: 'auth-login-failed',
  logoutSuccess: 'auth-logout-success',
  sessionTimeout: 'auth-session-timeout',
  notAuth: 'auth-not-auth'
});

app.constant('PLAN', {
  free: 180*60,
  pro: 360*60
});

app.constant('API', {
  track: {
    query: '/api/track/',
    all: '/api/track/all',
    stream: '/api/track/stream',
    likes: '/api/track/likes',
    added: '/api/track/added',
    cover: '/api/track/cover',
    like: '/api/track/like/',
    delete: '/api/track/',
    search: '/api/track/search',
    upload: '/api/track/create',
    comment: '/api/track/comment/',
    delcomment: '/api/track/delcomment/',
    popular: '/api/track/popular',
    recommended: '/api/track/recommended',
    same: '/api/track/same/',
  },
  playlist: {
    query: '/api/playlist/',
    cover: '/api/playlist/cover',
    track: '/api/playlist/track',
    delete: '/api/playlist/:id',
    get: '/api/playlist/:id',
    like: '/api/playlist/like/'    
  },
  profile: {
    query: '/api/user/',
    stats: '/api/user/stats',
    cover: '/api/user/cover'
  },
  followers: '/api/user/followers/',
  follows: '/api/user/follows/',
  follow: '/api/user/follow/',
  subscribe: '/api/user/subscribe/',
  genre: '/api/genre/',
  user: '/api/users',
  login: '/api/user/login',
  logout: '/api/user/logout',
  search: {
    all: '/api/search/all',
    genre: '/api/genre/search',
    tag: '/api/tag/search',
    query: '/api/search/'
  },
  tag: '/api/tag/',
  message: {
    get: '/api/message/get/',
    send: '/api/message/send',
    chatters: '/api/message/chatters',
    search: '/api/message/search',
    total: '/api/message/total'
  },
  chat: {
    get: '/api/chat/get',
    send: '/api/chat/send',
    onliners: '/api/chat/onliners'
  },
  notifies: {
    get: '/api/notify',
    unreaded: '/api/notify/unreaded',
    mark: '/api/notify/mark'
  }
});

app.constant('RADIO', [
  {
    id: 'tarona',
    name: 'Узбегим Таронаси',
    coverUrl: '/images/radio/tarona2.png',
    fileOgg: 'http://80.80.208.6:8008/uzbegim-taronasi',
    bitrate: 96
  },{
    id: 'blackbeats',
    name: 'Радио Blackbeats',
    coverUrl: '/images/radio/blackbeats.jpg',
    fileOgg: 'http://80.80.208.6:8008/blackbeats',
    bitrate: 128
  },{
    id: 'love',
    name: 'Love радио',
    coverUrl: '/images/radio/love.jpg',
    fileOgg: 'http://melody.uz:8003/love',
    bitrate: 128
  },{
    id: 'radiorecord',
    name: 'Радио Record',
    coverUrl: '/images/radio/radiorecord.jpg',
    fileOgg: 'http://melody.uz:8003/radiorecord',
    bitrate: 128
  },{
    id: 'hitfm',
    name: 'Радио Hit FM',
    coverUrl: '/images/radio/hitfm.jpg',
    fileOgg: 'http://80.80.208.6:8008/hitfm',
    bitrate: 96
  },{
    id: 'energy',
    name: 'Радио Energy',
    coverUrl: '/images/radio/energy.jpeg',
    fileOgg: 'http://melody.uz:8003/energy',
    rate: 44100,
    bitrate: 128
  },{
    id: 'maximum',
    name: 'Радио Maximum',
    coverUrl: '/images/radio/maximum.jpg',
    fileOgg: 'http://melody.uz:8003/maximum',
    bitrate: 96
  },{
    id: 'dfm',
    name: 'Радио DFM',
    coverUrl: '/images/radio/dfm.jpeg',
    fileOgg: 'http://melody.uz:8003/dfm',
    bitrate: 96
  },{
    id: 'europa',
    name: 'Радио Europa+',
    coverUrl: '/images/radio/europa.jpg',
    fileOgg: 'http://melody.uz:8003/europa',
    bitrate: 128
  },{
    id: 'europadance',
    name: 'Радио Europa Dance',
    coverUrl: '/images/radio/europadance.jpg',
    fileOgg: 'http://80.80.208.6:8008/europa-dance',
    bitrate: 128
  },{
    id: 'radio7',
    name: 'Радио 7',
    coverUrl: '/images/radio/radio7.jpg',
    fileOgg: 'http://melody.uz:8003/radio7',
    bitrate: 128
  },{
    id: 'nashe',
    name: 'Наше радио',
    coverUrl: '/images/radio/nashe.jpg',
    fileOgg: 'http://melody.uz:8003/nashe',
    bitrate: 128
  },{
    id: 'retro',
    name: 'Радио Ретро FM',
    coverUrl: '/images/radio/retro.jpg',
    fileOgg: 'http://melody.uz:8003/retro',
    bitrate: 128
  },{
    id: 'chanson',
    name: 'Радио Дорожное',
    coverUrl: '/images/radio/chanson.jpg',
    fileOgg: 'http://melody.uz:8003/chanson',
    bitrate: 128
  },{
    id: 'sportfm',
    name: 'Спорт FM',
    coverUrl: '/images/radio/sportfm.jpg',
    fileOgg: 'http://melody.uz:8003/sportfm',
    bitrate: 128
  },{
    id: 'dacha',
    name: 'Радио Дача',
    coverUrl: '/images/radio/dacha.jpg',
    fileOgg: 'http://melody.uz:8003/dacha',
    bitrate: 128
  }
]);