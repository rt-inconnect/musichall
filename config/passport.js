var crypto = require('crypto'),
  fs = require('fs'),
  request = require('request'),
  getSlug = require('speakingurl'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  RememberMeStrategy = require('passport-remember-me').Strategy,
  GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
  FacebookStrategy  = require('passport-facebook').Strategy,
  MailruStrategy  = require('passport-mailru').Strategy,
  VkontakteStrategy  = require('passport-vkontakte').Strategy,
  OdnoklassnikiStrategy  = require('passport-odnoklassniki').Strategy,
  GitHubStrategy = require('passport-github').Strategy;

var saveAvatar = function (url, path, callback) {
  request({url: url, encoding: 'binary'}, function (err, res, body) {
    if (err) sails.log.error('passport.js:saveAvatar', 'request', url, err);
    if (!err && res.statusCode == 200) {
      fs.writeFile(path + '/original.jpg', body, 'binary', function(err) {
        if (err) sails.log.error('passport.js:saveAvatar', 'fs.writeFile', path + '/original.jpg', err);
        ImageService.resizeGm(path + '/original.jpg', path + '/resized.jpg', function () {
          callback(path + '/resized.jpg');
        });
      });
    } else {
      //console.log(res);
      callback(url);
    }
  });
};

var createDirectories = function (login, callback) {
  fs.mkdir('users/'+login, function (err) {
    if (err) sails.log.error('passport.js:createDirectories', 'fs.mkdir', 'users/'+login, err);
    fs.mkdir('users/'+login+'/tracks');
    fs.mkdir('users/'+login+'/playlists');
    callback(true);
  });
};

var registration = {
  google: function (profile) {
    return {
      provider: profile.provider,
      uid: profile.id,
      fullname: profile.displayName,
      email: profile.emails[0].value,
      login: profile.emails[0].value.slice(0, profile.emails[0].value.indexOf('@')),
      avatarUrl: profile._json.picture
    };
  },
  github: function (profile) {
    return {
      provider: profile.provider,
      uid: profile.id,
      fullname: profile.displayName,
      email: profile.emails[0].value,
      login: profile.username,
      avatarUrl: profile._json.avatar_url
    };
  },
  facebook: function (profile) {
    return {
      provider: profile.provider,
      uid: profile.id,
      fullname: profile.displayName,
      email: profile.emails ? profile.emails[0].value : profile.id + '@' + profile.provider,
      login: profile.emails ? profile.emails[0].value.slice(0, profile.emails[0].value.indexOf('@')) : profile.id,
      avatarUrl: profile.photos[0].value
    };
  },
  vkontakte: function (profile) {
    return {
      provider: profile.provider,
      uid: profile.id,
      fullname: profile.displayName,
      email: profile.id + '@vkontakte.com',
      login: profile._json.nickname || profile.username,
      avatarUrl: profile._json.photo_big
    };
  },
  odnoklassniki: function (profile) {
    return {
      provider: profile.provider,
      uid: profile.id,
      fullname: profile.displayName,
      email: profile.id + '@odnoklassniki.ru',
      login: profile.id,
      avatarUrl: 'http://ia100.odnoklassniki.ru/getImage?photoId='+profile._json.photo_id+'&amp;photoType=0',
      location: profile._json.location ? profile._json.location.countryName + ', ' + profile._json.location.city : ''
    };
  },
  mailru: function (profile) {
    return {
      provider: profile.provider,
      uid: profile.id,
      fullname: profile.displayName,
      email: profile.emails[0].value,
      login: profile.username || profile.emails[0].value.slice(0, profile.emails[0].value.indexOf('@')),
      avatarUrl: profile._json.pic_big
    };
  }
};

var verifyHandler = function (token, tokenSecret, profile, next) {
  process.nextTick(function () {
   //console.log(profile);
   User.findOne({uid: profile.id, provider: profile.provider}, function (err, user) {
      if (err) sails.log.error('passport.js:verifyHandler', 'User.findOne', {uid: profile.id, provider: profile.provider}, err);
      if (user) {
        return next(null, user);
      } else {
        var data = registration[profile.provider](profile);
        data.login = getSlug(data.login);
        if(!data.login) data.login = User.generateLogin();
        User.findOne({login: data.login}).exec(function (err, user) {
          if (err) sails.log.error('passport.js:verifyHandler', 'User.findOne', {login: data.login}, err);
          if(user) data.login = data.login + '-' + User.generateLogin();
          data.directory = data.login;
          createDirectories(data.directory, function () {
            saveAvatar(data.avatarUrl, 'users/' + data.login, function (avatarUrl) {
              data.avatarUrl = avatarUrl;
              User.create(data, function (err, user) {
                if (err) sails.log.error('passport.js:verifyHandler', 'User.create', data, err);
                return next(err, user);
              });
            });
          });
        });
      }
    });
  });
};

passport.serializeUser(function(user, next) {
  //console.log('passport.serializeUser');
  return next(null, user.id);
});


passport.deserializeUser(function(id, next) {
  //console.log('passport.deserializeUser');
  User
    .findOne({id:id})
    .exec(function(err, user) {
      if (err) sails.log.error('passport.js:deserializeUser', 'User.findOne', id, err);
      user = User.clearPrivateData(user);
      return next(err, user);
    });
});

passport.use(new LocalStrategy({
    usernameField: 'login',
    passwordField: 'password'
  },
  function(login, password, next) {
    //console.log('passport.use LocalStrategy');
    User
      .findOne({login:login})
      .exec(function(error, user) {
        if (error) {
          sails.log.error('passport.js:LocalStrategy', 'User.findOne', login, error);
          next(error);
        } else if (!user) {
          next(false, false, 'The user is not exists');
        } else if (crypto.createHash('md5').update(password).digest('hex') !== user.password) {
          next(false, false, 'Wrong password');
        } else {
          next(false, user);
        }
      });
  }
));

passport.use(new RememberMeStrategy(
  function (token, cb) {
    //console.log('passport.use RememberMeStrategy 1');
    //console.log('consumeSessionToken');
    User.checkToken(token, function (err, user) {
      if (err) sails.log.error('passport.js:LocalStrategy', 'User.findOne', token, err);
      return cb(err, user);
    });
  },
  function (user, cb) {
    //console.log('passport.use RememberMeStrategy 2');
    //console.log('issueSessionToken');
    return User.checkUser(user, cb);
  }
));

passport.use(new GoogleStrategy({
  clientID: '642731279766-3lvug57n1k9pbe24lked5hfthkdifk15.apps.googleusercontent.com',
  clientSecret: 'bG0edHhoARpBeDRtjqEi4rqQ',
  callbackURL: 'http://musichall.uz/api/user/google/callback'
}, verifyHandler));

passport.use(new GitHubStrategy({
  clientID: '10663d4949237588def4',
  clientSecret: '60b8e58559cce46b015b4ccd64add7b0b3b26293',
  callbackURL: 'http://musichall.uz/api/user/github/callback'
}, verifyHandler));

passport.use(new FacebookStrategy({
  clientID: '348076598708745',
  clientSecret: 'a6c91b7245a9df297bdb5f2a4f7dd8dd',
  callbackURL: 'http://musichall.uz/api/user/facebook/callback',
  profileFields: ['id','name','displayName','picture.type(large)','emails','location']
}, verifyHandler));

passport.use(new MailruStrategy({
  clientID: '727712',
  clientSecret: '8c1193de602b5397984fba4ffc930d53',
  callbackURL: 'http://musichall.uz/api/user/mailru/callback'
}, verifyHandler));

passport.use(new VkontakteStrategy({
  clientID: '4668668',
  clientSecret: 'aVpJgaiQlhJR7tylfX4z',
  callbackURL: 'http://musichall.uz/api/user/vkontakte/callback',
  profileFields: ['uid','nickname','displayName','photo_big','country','city']
}, verifyHandler));

passport.use(new OdnoklassnikiStrategy({
  clientID: '1123391232',
  clientPublic: 'CBAIJGPDEBABABABA',
  clientSecret: '9B83DE16C4D908CF90311A89',
  callbackURL: 'http://musichall.uz/api/user/odnoklassniki/callback'
}, verifyHandler));
