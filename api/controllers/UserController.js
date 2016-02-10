/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var passport = require('passport');
var path = require('path');
var getSlug = require('speakingurl');

var authFn = function(req, res, err, user) {
  //if (err) sails.log.error('UserController.js:authFn()', 'arguments', user, err);
  req.logIn(user, function (err) {
    if (err) {
      //sails.log.error('UserController.js:authFn()', 'req.logIn', user, err);
      res.send(500);
      return;
    }

    User.issueSessionToken(user, function (err, token) {
      //if (err) sails.log.error('UserController.js:authFn()', 'User.issueSessionToken', user, err);
      var time = new Date().getTime();
      res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: time + 3600*24*360 });
      res.send("<script>window.opener.location.href = '/'; window.parent.close();</script>");
    });
  });
};

module.exports = {
  state: function (req, res, next) {
    if (IfService.isAdmin(req.user)) return res.json(sails.config.params.admins);
    else return res.json([]);
  },

  login: function (req, res, next) {
    passport.authenticate('local', function(error, user, info) {
      if (error) sails.log.error('UserController.js:login', 'passport.authenticate', user, error);      
      if (error) next(new Error('Some error was occured!'));
      if (!user) res.send(500);
      req.logIn(user, function(error) {
        if (error) sails.log.error('UserController.js:login', 'req.logIn', user, error);
        if (error) res.send(500);
        if (req.body.remember) {
          User.issueSessionToken(user, function (err, token) {
            if (err) sails.log.error('UserController.js:login', 'User.issueSessionToken', user, err);
            var time = new Date().getTime();
            res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: time + 3600*24*360 });
            user = User.clearPrivateData(user);
            res.send(user.toJSON());
          });
        } else {
          if (user) {
            user = User.clearPrivateData(user);
            res.send(user.toJSON());
          } else {
            res.send(500);
          }
        }
      });
    })(req, res, next);
  },

  google: function (req, res) {
    passport.authenticate(
      'google',
      {
        failureRedirect: '/login',
        scope: [
          'https://www.googleapis.com/auth/plus.login',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email'
        ]
      },
      function(err, user) { authFn(req, res, err, user); }
    )(req, res);
  },

  'google/callback': function (req, res) {
    res.send("<script>window.opener.location.href = '/'; window.parent.close();</script>");
  },

  facebook: function (req, res) {
    passport.authenticate(
      'facebook',
      {
        failureRedirect: '/login',
        scope: ["public_profile","email", "user_location", "user_photos"]
      },
      function(err, user) { authFn(req, res, err, user); }
    )(req, res);
  },

  'facebook/callback': function (req, res) {
    res.send("<script>window.opener.location.href = '/'; window.parent.close();</script>");
  },

  odnoklassniki: function(req, res) {
    passport.authenticate(
      'odnoklassniki',
      {
        failureRedirect: '/login'
      },
      function(err, user) { authFn(req, res, err, user); }
    )(req, res);
  },

  'odnoklassniki/callback': function (req, res) {
    res.send("<script>window.opener.location.href = '/'; window.parent.close();</script>");
  },

  mailru: function(req, res) {
    passport.authenticate(
      'mailru',
      {
        failureRedirect: '/login'
      },
      function(err, user) { authFn(req, res, err, user); }
    )(req, res);
  },

  'mailru/callback': function (req, res) {
    res.send("<script>window.opener.location.href = '/'; window.parent.close();</script>");
  },

  vkontakte: function(req, res) {
    passport.authenticate(
      'vkontakte',
      {
        failureRedirect: '/login'
      },
      function(err, user) { authFn(req, res, err, user); }
    )(req, res);
  },

  'vkontakte/callback': function (req, res) {
    res.send("<script>window.opener.location.href = '/'; window.parent.close();</script>");
  },

  github: function(req, res) {
    passport.authenticate(
      'github',
      {
        failureRedirect: '/login'
      },
      function(err, user) { authFn(req, res, err, user); }
    )(req, res);
  },

  'github/callback': function (req, res) {
    res.send("<script>window.opener.location.href = '/'; window.parent.close();</script>");
  },

  logout: function (req, res) {

    User.update({id: req.user.id}, {isOnline: 0, token: ''}).exec(function (err, user) {
      if (err) sails.log.error('UserController.js:logout', 'User.update', req.user.id, err);
      user = User.clearPrivateData(user);
      sails.sockets.broadcast("follow#" + user.id, 'offline', user);
      res.clearCookie('remember_me');
      req.user = null;
      req.session.destroy();
      req.logout();
      res.redirect('/');
    });
  },

  verify: function (req, res) {
    login = getSlug(req.param('login'));
    if (!login) return res.send('error');
    User.findOne({login: login}).exec(function (err, user) {
      if (err) sails.log.error('UserController.js:verify', 'User.findOne', login, err);
      if(!user){
        res.send('success');
      } else {
        if(user.login === req.user.login) {
          res.send('success');
        } else {
          res.send('error');
        }
      }
    });
  },

  update: function (req, res) {
    var data = {
      login: req.param('login'),
      fullname: req.param('fullname'),
      location: req.param('location')
    };
    if(!data.login) return res.send(404);
    User.update({id: req.user.id}, data).exec(function (err, user) {
      if (err) sails.log.error('UserController.js:update', 'User.update', req.user.id, data, err);
      User.getHim(req.user.id, req.user, function (user) {
        res.json(user);
      });
    });
  },

  find: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    var login = req.user ? req.user.login : '';
    if(req.param('user'))
      login = req.param('user');
    criteria.login = login;

    User.getHim(criteria, req.user, function (user) {
      res.json(user);
    });
  },

  stats: function (req, res) {

    var login = req.user ? req.user.login : '';
    if(req.param('user'))
      login = req.param('user');

    User.findOne({login: login}).exec(function (err, user) {
      if (err) sails.log.error('UserController.js:stats', 'User.findOne', login, err);
      if (!user) return res.send(404);
      User.getStats(user, function (stats) {
        res.json(stats);
      });
    });
  },

  findPopular: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    criteria.sort = 'numLikes DESC';
    if(req.param('genre') > 0) {
      User.getByGenre(req.param('genre'), function (users) {
        criteria.id = users;
        User.getAll(criteria, req.user, function (results) {
          res.json(results);
        });
      });
    } else {
      User.getAll(criteria, req.user, function (results) {
        res.json(results);
      });      
    }
  },

  findAll: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    criteria.id = { '!': req.user.id };

    User.find(criteria)
      .populate('sendedMessages', { to:req.user.id, status:0 })
      .exec(function (err, users) {
        if (err) sails.log.error('UserController.js:findAll', 'User.find', criteria, err);
        if (!_.isEmpty(users)) {
          _.forEach(users, function (user) {
            user.unreadMessages = user.sendedMessages.length;
            user.sendedMessages = [];
            user = User.clearPrivateData(user);
          });
        }
        res.json(users);
      });
  },

  findRecommended: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var params = { interval: 7, limit: 3, user: '' };
    if(req.user) params.user = req.user.id;

    var defaultUsers = function () {
      var sql = 'SELECT id FROM user ORDER BY RAND() LIMIT 0,3';
      User.query(sql, function (err, userIds) {
        if (err) sails.log.error('UserController.js:findRecommended', 'User.query', sql, err);
        var ids = _.map(userIds,'id');
        criteria.id = ids;
        User.getAll(criteria, req.user, function (users) {
          res.json(users);
        });
      });
    };

    if(_.isEmpty(req.user)) return defaultUsers();

    return TrackPlays.topByInterval(params, function (tracks) {
      if(_.isEmpty(tracks)) return defaultUsers();
      params.tracks = tracks;
      return TrackPlays.usersByTracks(params, function (users) {
        if(_.isEmpty(users)) return defaultUsers();
        criteria.id = users;
        User.getAll(criteria, req.user, function (users) {
          res.json(users);
        });
        return false;
      });
    });
    
  },

  findFollows: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    var byDefault = function () {
      res.json([]); return;
    };

    var login = req.user ? req.user.login : '';
    if(req.param('user'))
      login = req.param('user');
    criteria.login = login;

    User.findOne(criteria).exec(function (err, user) {
      if (err) sails.log.error('UserController.js:findFollows', 'User.findOne', criteria, err);
      if(!user) return byDefault();
      Follow.find({follower: user.id}).exec(function (err, follows) {
        if (err) sails.log.error('UserController.js:findFollows', 'Follow.find follower', user.id, err);
        var ids = _.map(follows,'follow');
        if(_.isEmpty(ids)) return byDefault();
        User.find({id:ids}).populate('follows').exec(function (err, results) {
          if (err) sails.log.error('UserController.js:findFollows', 'User.find id', ids, err);
          if(!_.isEmpty(results)) {
            _.forEach(results, function (user) {
              user.numFollowers = user.follows.length;
              user.isFollowed = User.isFollowed(user, req.user);
              user.followers = [];
              user = User.clearPrivateData(user);
            });
          }
          res.json(results);
        });
      });
    });

  },

  findFollowers: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    var byDefault = function () {
      res.json([]); return;
    };

    var login = req.user ? req.user.login : '';
    if(req.param('user'))
      login = req.param('user');
    criteria.login = login;

    User.findOne(criteria).exec(function (err, user) {
      if (err) sails.log.error('UserController.js:findFollowers', 'User.findOne', criteria, err);
      if(!user) return byDefault();
      Follow.find({follow: user.id}).exec(function (err, followers) {
        if (err) sails.log.error('UserController.js:findFollowers', 'Follow.find follow', user.id, err);
        var ids = _.map(followers, 'follower');
        if(_.isEmpty(ids)) return byDefault();
        User.find({id:ids}).populate('follows').exec(function (err, results) {
          if (err) sails.log.error('UserController.js:findFollowers', 'User.find', ids, err);
          if(!_.isEmpty(results)) {
            _.forEach(results, function (user) {
              user.numFollowers = user.follows.length;
              user.isFollowed = User.isFollowed(user, req.user);
              user.followers = [];
              user = User.clearPrivateData(user);
            });
          }
          res.json(results);
        });
      });
    });
  },

  follow: function (req, res) {
    var params = {
      curUser: req.user,
      user: parseInt(req.param('id'))
    };
    if((!params.curUser) || (!params.user)) res.send(404);
    User.follow(params, function (user) {
      res.json(user);
    });
  },

  subscribe: function (req, res) {
    var user = parseInt(req.param('id'));
    var params = {follow: user, follower: req.session.passport.user};
    Follow.findOne(params)
      .exec(function (err, follow) {
        if (err) sails.log.error('UserController.js:subscribe', 'Follow.findOne', params, err);
        if(!follow) {
          sails.sockets.leave(sails.sockets.id(req.socket), 'follow#' + user);
        } else {
          sails.sockets.join(sails.sockets.id(req.socket), 'follow#' + user);
        }
        res.send(200);
      });
  },

  cover: function (req, res) {
    if (req.file('file')._files[0]) {
      var ext = path.extname(req.file('file')._files[0].stream.filename);
      var dirname = 'users/'+req.user.directory+'/';
      var original = dirname + 'original' + ext;
      var resized = dirname + 'resized' + ext;
      req.file('file').upload({
        dirname: '../../' + dirname,
        saveAs: 'original' + ext,
        maxBytes: 100000000
      }, function (err, files) {

        if (err)
          return res.serverError(err);

        ImageService.resizeGm(original, resized, function () {
          User.findOne(req.user.id).exec(function (err, user) {
            if (err) sails.log.error('UserController.js:cover', 'User.findOne', req.user.id, err);
            var params = { avatarUrl: resized + '?' + Math.random() };
            User.update({id:user.id}, params).exec(function (err, user) {
              if (err) sails.log.error('UserController.js:cover', 'User.update', params, err);
              res.send(user[0].avatarUrl);
            });
          });
        });
      });      
    } else {
      res.send(404);
    }

  },

  destroy: function (req, res) {
    var id = parseInt(req.param('id'));
    if (!id) return res.send(404);
    User.findOne(id).exec(function (err, user) {
      if (err) sails.log.error('UserController.js:destroy', 'User.findOne', id, err);

      if (!IfService.isAdmin(req.user)) return res.send(404);

      if(user.directory) FsService.rmdir(user.directory);
      User.destroy(id, function (err) {
        if (err) sails.log.error('UserController.js:destroy', 'User.destroy', id, err);
        if (req.user.id == user.id) {
          res.clearCookie('remember_me');
          req.user = null;
          req.session.destroy();
          req.logout();
        }
        res.send(200);
      });
    });

  }

};