'use strict';

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

var appDirectives = angular.module('appDirectives', []);

appDirectives.filter('orderObjectBy', function() {
  return function(items, field, reverse) {
    var filtered = [];
    angular.forEach(items, function(item) {
      filtered.push(item);
    });
    filtered.sort(function (a, b) {
      return (a[field] > b[field] ? 1 : -1);
    });
    if(reverse) filtered.reverse();
    return filtered;
  };
});

appDirectives.directive('fsProfilePopover',['$compile', 'UserGet', '$rootScope',
  function ($compile, UserGet, $rootScope) {
    return {
      restrict: 'A',
      scope: {
        fsProfilePopover: '='
      },
      //transclude: true,
      link: function (scope, element, attrs) {
        var closed;
        element.bind('mouseenter', function() {
          if (closed) { closed = false; return false; }
          //console.log(scope.profile);
          var tpl = '<div class="popover animated" id="div">'+
            '<div class="arrow"></div>'+
            '<div class="inner-content follow thumb-l">'+
              '<div class="info">'+
                '<span class="profile-login">'+scope.fsProfilePopover.login+
                '<span class="online" ng-class="{\'active\': fsProfilePopover.isOnline}"><i class="icon-circle"></i></span></span><br/>'+
                '<a class="small nowPlaying" ui-sref="track.comments({ id: fsProfilePopover.nowPlaying.id })" ng-if="fsProfilePopover.nowPlaying">'+
                  '<span><i class="icon-headphones"></i> {{fsProfilePopover.nowPlaying.name}}</span>'+
                '</a>'+
                '<span class="small stats"><i class="icon-users"></i> {{fsProfilePopover.numFollowers}} / <i class="icon-heart-1"></i> {{fsProfilePopover.numLikes | kNumber}}</span>'+
              '</div>'+

              '<img src="'+scope.fsProfilePopover.avatarUrl+'" class="img-responsive">'+

              '<div class="enter hover">';

          if(scope.fsProfilePopover.id != $rootScope.cur_user.id)
            tpl = tpl + '<a href class="btn-flat pull-left" title="Подписаться" ng-click="fsProfilePopover.follow(fsProfilePopover)" ng-class="{\'active\': fsProfilePopover.isFollowed}">{{fsProfilePopover.isFollowed ? "Подписан" : "Подписаться"}}</a>';

          tpl = tpl + '<a ui-sref="user.tracks({user:fsProfilePopover.login})" class="btn-flat pull-right" title="Перейти"><span class="icon-right-outline"></span></a></div></div></div>';

          element.append(tpl);

          UserGet.byLogin(scope.fsProfilePopover.login, function (res) {
            angular.extend(scope.fsProfilePopover,res);
            scope.fsProfilePopover.follow = $rootScope.UserService.follow;
          });
          var child = element.children()[0].getBoundingClientRect();
          var profile = element.children().next();
          var top = child.top - profile[0].offsetHeight / 2 + child.height / 2;
          var left = child.left + child.width;
          var pos = 'right fadeInRight';
          if(screen.width/2 < child.left) {
            left = child.left - 204;
            pos = 'left fadeInLeft';
          }
          profile.addClass(pos);
          profile.css({'top': top+'px', 'left': left+'px', 'display': 'block'});
          $compile(element.contents())(scope.$new());
          scope.$apply();
          closed = false;
        });
        element.bind('mouseleave', function() {
          //element.children().next().addClass('fadeOutRight');
          setTimeout(function() { if (closed) { element.children().next().remove(); closed = false; } },500);
          closed = true;
        });
      }
    };
  }
]);

appDirectives.directive('rtTrackSeek',['$compile', '$rootScope',
  function ($compile, $rootScope) {
    return {
      restrict: 'E',
      templateUrl: 'templates/directives/rt-track-seek.html',
      //transclude: true,
      compile: function (tElement, tAttributes) {
        return {
          pre: function (scope, element, attrs) {
            scope.player = $rootScope.player;
            scope.startDrag = false;
            scope.startWheel = false;
            scope.width = 0;

            var handler = element.find('a');
            handler.bind('mousedown', function() {
              scope.width = $rootScope.player.nowPlaying.progress;
              scope.startDrag = true;
            });
            element.bind('mousemove', function(event) {
              var target = event.target || event.srcElement;
              if (scope.startDrag && target.id == 'rt-track-seek') {
                var x = event.offsetX || event.layerX,
                  width = event.target.clientWidth;
                scope.width = x/width * 100;
              }
            });
            element.bind('mouseup', function(event) {
              if (scope.startDrag) {
                $rootScope.player.nowPlaying.progress = scope.width;
                $rootScope.player.seek(event, scope.width / 100);
              } else {
                $rootScope.player.seek(event);
              }
              scope.startDrag = false;
            });
            element.bind('mousewheel DOMMouseScroll', function (event) {
              if (!scope.startWheel) scope.width = $rootScope.player.nowPlaying.progress;
              scope.startWheel = true;
              var wheel = event.wheelDelta || event.detail*(-1);
              if (wheel < 0) {
                scope.width += 5;
              } else {
                scope.width -= 5;
              }
              if (scope.width < 0) scope.width = 0;
              if (scope.width > 100) scope.width = 100;
              setTimeout(function() { 
                if (scope.startWheel) { 
                  $rootScope.player.seek(event, scope.width / 100);
                  scope.startWheel = false;
                }
              },1000);
            });            
          }
        };
      }
    };
  }
]);

appDirectives.directive('rtVolume',['$compile', '$rootScope',
  function ($compile, $rootScope) {
    return {
      restrict: 'E',
      templateUrl: 'templates/directives/rt-volume.html',
      //transclude: true,
      compile: function (tElement, tAttributes) {
        return {
          pre: function (scope, element, attrs) {
            scope.player = $rootScope.player;
            element.bind('mousewheel DOMMouseScroll', function (event) {
              var increment = true;
              var wheel = event.wheelDelta || event.detail*(-1);
              if (wheel < 0) increment = false;
              $rootScope.player.scrollVolume(increment);
            });
          }
        };
      }
    };
  }
]);

appDirectives.directive('fsTrackThumb',['$rootScope',
  function ($rootScope) {
    return {
      restrict: 'E',
      scope: {
        track: '=',
        tracks: '=',
        tags: '=',
        index: '='
      },
      templateUrl: 'templates/directives/fs-track-thumb.html',
      compile: function (tElement, tAttributes) {
        return {
          pre: function (scope, element, attrs) {
            scope.IfService = $rootScope.IfService;
            scope.TrackService = $rootScope.TrackService;
            scope.player = $rootScope.player;
            scope.cur_user = $rootScope.cur_user;
          }
        };
      }
    };
  }
]);

appDirectives.directive('fsTrackWave',['$rootScope',
  function ($rootScope) {
    return {
      restrict: 'E',
      scope: {
        track: '=',
        tracks: '=',
        tags: '=',
        index: '=',
        comment: '='
      },
      templateUrl: 'templates/directives/fs-track-wave.html',
      compile: function (tElement, tAttributes) {
        return {
          pre: function (scope, element, attrs) {
            scope.IfService = $rootScope.IfService;
            scope.TrackService = $rootScope.TrackService;
            scope.player = $rootScope.player;
            scope.cur_user = $rootScope.cur_user;
          }
        };
      }
    };
  }
]);

appDirectives.directive('fsStream',['$rootScope',
  function ($rootScope) {
    return {
      restrict: 'E',
      scope: {
        stream: '=',
        streams: '=',
        index: '='
      },
      templateUrl: 'templates/directives/fs-stream.html',
      compile: function (tElement, tAttributes) {
        return {
          pre: function (scope, element, attrs) {
            switch(scope.stream.xtype) {
              case 'trackadded':
                scope.action = 'добавил трэк';
                scope.type = 'track';
                break;
              case 'trackliked':
                scope.action = 'понравился трэк';
                scope.type = 'track';
                break;
              case 'playlistadded':
                scope.action = 'создал плэйлист';
                scope.type = 'playlist';
                break;
              case 'playlistliked':
                scope.action = 'понравился плэйлист';
                scope.type = 'playlist';
                break;
            }
          }
        };
      }
    };
  }
]);

appDirectives.directive('fsPlaylistWave',['$rootScope', 'TrackQuery',
  function ($rootScope, TrackQuery) {
    return {
      restrict: 'E',
      scope: {
        playlist: '=',
        playlists: '=',
        limit: '=',
        index: '='
      },
      templateUrl: 'templates/directives/fs-playlist-wave.html',
      compile: function (tElement, tAttributes) {
        return {
          pre: function (scope, element, attrs) {
            scope.IfService = $rootScope.IfService;
            scope.PlaylistService = $rootScope.PlaylistService;
            scope.player = $rootScope.player;

            scope.TrackQuery = new TrackQuery();

            scope.uploadClick = function () {
              document.getElementById('file-playlist-'+scope.playlist.id).click();
            };

            scope.getCurrentTrack = function () {
              var index = scope.playlist.tracks.map(function (o) {
                return o.id;
              }).indexOf(scope.player.nowPlaying.id);
              return index;
            };

            scope.addToPlaylist = function () {
              scope.playlist.tracks.push(scope.playlist.track_selected);
              scope.playlist.track_selected = '';
            };

            scope.delete = function (index) {
              scope.playlist.tracks.splice(index, 1);
            };

            scope.toggleEdit = function () {
              scope.playlist.edit = !scope.playlist.edit;
              if(scope.playlist.edit) {
                scope.old_playlist = angular.copy(scope.playlist);
              }
            };

            scope.reset = function () {
              scope.playlist = angular.copy(scope.old_playlist);
              scope.playlist.edit = false;
            };
          }
        };
      }
    };
  }
]);

appDirectives.directive('rtPlaylistMini',['$rootScope',
  function ($rootScope) {
    return {
      restrict: 'E',
      scope: {
        playlist: '=',
        playlists: '='
      },
      templateUrl: 'templates/directives/rt-playlist-mini.html',
      compile: function (tElement, tAttributes) {
        return {
          pre: function (scope, element, attrs) {
            scope.player = $rootScope.player;
            scope.IfService = $rootScope.IfService;
            scope.PlaylistService = $rootScope.PlaylistService;
          }
        };
      }
    };
  }
]);

appDirectives.directive('fsTrackMini',['$rootScope',
  function ($rootScope) {
    return {
      restrict: 'E',
      scope: {
        track: '=',
        tracks: '=',
        index: '='
      },
      templateUrl: 'templates/directives/fs-track-mini.html',
      compile: function (tElement, tAttributes) {
        return {
          pre: function (scope, element, attrs) {
            scope.TrackService = $rootScope.TrackService;
            scope.player = $rootScope.player;
          }
        };
      }
    };
  }
]);

appDirectives.directive('fsProfileMini',['$rootScope',
  function ($rootScope) {
    return {
      restrict: 'E',
      scope: {
        user: '='
      },
      templateUrl: 'templates/directives/fs-profile-mini.html',
      compile: function (tElement, tAttributes) {
        return {
          pre: function (scope, element, attrs) {
            scope.UserService = $rootScope.UserService;
            scope.cur_user = $rootScope.cur_user;
          }
        };
      }
    };
  }
]);

appDirectives.directive('fsProfileThumb',['$rootScope',
  function ($rootScope) {
    return {
      restrict: 'E',
      scope: {
        user: '='
      },
      templateUrl: 'templates/directives/fs-profile-thumb.html',
      compile: function (tElement, tAttributes) {
        return {
          pre: function (scope, element, attrs) {
            scope.UserService = $rootScope.UserService;
            scope.cur_user = $rootScope.cur_user;
          }
        };
      }
    };
  }
]);

appDirectives.directive('fsProfileThumbSmall',['$rootScope',
  function ($rootScope) {
    return {
      restrict: 'E',
      scope: {
        user: '='
      },
      templateUrl: 'templates/directives/fs-profile-thumb-small.html',
      compile: function (tElement, tAttributes) {
        return {
          pre: function (scope, element, attrs) {
            scope.UserService = $rootScope.UserService;
            scope.cur_user = $rootScope.cur_user;
          }
        };
      }
    };
  }
]);

appDirectives.directive('fsFilter',['$rootScope',
  function ($rootScope) {
    return {
      restrict: 'E',
      transclude: true,
      templateUrl: 'templates/directives/fs-filter.html'
    };
  }
]);

appDirectives.directive('fsUploader',['$rootScope',
  function ($rootScope) {
    return {
      restrict: 'E',
      transclude: true,
      templateUrl: 'templates/directives/fs-uploader.html'
    };
  }
]);

appDirectives.directive('fsHover',
  function () {
    return {
      link: function (scope, element, attrs) {
        element.bind('mouseenter', function() {
          element.addClass('hover');
        });
        element.bind('mouseleave', function() {
          element.removeClass('hover');
        });
      }
    };
  }
);

appDirectives.directive('showonhoverparent',
  function () {
    return {
      link: function (scope, element, attrs) {
        element.parent().bind('mouseenter', function() {
          element.addClass('hover');
          element.addClass('animated fadeInUp');
        });
        element.parent().bind('mouseleave', function() {
          element.removeClass('hover');
          element.removeClass('animated fadeInUp');
        });
      }
    };
  }
);

appDirectives.directive('chatSayWidth',
  function () {
    return {
      link: function (scope, element, attrs) {
        var prevWidth = element.parent().children()[0].clientWidth;
        element.css({'width':prevWidth+'px'});
      }
    };
  }
);

appDirectives.directive('waveform', ['Waveform', '$rootScope',
  function (Waveform, $rootScope) {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function (scope, element, attrs, ngModel) {

        var prevProgress = 0;
        var curProgress = 0;
        scope.$watch(function() {
          if(ngModel.$modelValue) {
            if ($rootScope.IfService.trackEqual(ngModel.$modelValue.id) && $rootScope.player.nowPlaying.progress != 0)
              return $rootScope.player.nowPlaying.progress;
            if(typeof ngModel.$modelValue.waveData === 'object')
              return 1;
          }
          return 0;
        }, function () {
          if (ngModel.$modelValue) {
            if ($rootScope.IfService.trackEqual(ngModel.$modelValue.id)) {
              curProgress = Math.round($rootScope.player.nowPlaying.progress);
              if (curProgress > prevProgress || curProgress === 0) {
                render(false, curProgress);
              }
              prevProgress = curProgress;
            } else {
              render();
            }
          }
        });

        element.bind('mousemove', function(event) {
          if (ngModel.$modelValue && $rootScope.IfService.trackPlaying(ngModel.$modelValue.id))
            render(event.offsetX || event.layerX, $rootScope.player.nowPlaying.progress);
        });

        element.bind('mouseleave', function(event) {
          if (ngModel.$modelValue && $rootScope.IfService.trackPlaying(ngModel.$modelValue.id))
            render(false, $rootScope.player.nowPlaying.progress);
        });

        element.bind('mousedown', function (event) {
          if (ngModel.$modelValue && $rootScope.IfService.trackPlaying(ngModel.$modelValue.id))
            $rootScope.player.seek(event);
        });

        var render = function (offsetX, progress) {
          var ctx = element[0].getContext('2d');
          var waveform = new Waveform();
          var data;
          // Trim trailing comma if we are a string
          waveform.ctx = ctx;
          waveform.width = element.next()[0].offsetWidth;
          waveform.height = 104;
          waveform.offsetX = offsetX;
          waveform.progress = progress || 0;
          waveform.update(ngModel.$modelValue.waveData);
        };
      }
    };
  }
]);

appDirectives.directive('visualizer', ['Visualizer', '$rootScope',
  function (Visualizer, $rootScope) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        //Visualizer.init(element[0]);
      }
    };
  }
]);