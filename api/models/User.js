/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

var crypto = require('crypto');
var guid = require('guid');

module.exports = {

  attributes: {
    id: {
      type: 'integer',
      primaryKey: true,
      autoIncrement: true
    },
    login: {
      type: 'string'
    },
    password: {
      type: 'string'
    },
    email: {
      type: 'string'
    },
    avatarUrl: {
      type: 'string'
    },
    fullname: {
      type: 'string'
    },
    location: {
      type: 'string'
    },
    token: {
      type: 'string'
    },
    provider: {
      type: 'string'
    },
    uid: {
      type: 'string'
    },
    nowPlaying: {
      model: 'track'
    },
    addedPlaylists: {
      collection: 'playlist',
      via: 'createdBy'
    },
    addedTracks: {
      collection: 'track',
      via: 'createdBy'
    },
    trackLikes: {
      collection: 'like',
      via: 'user'
    },
    playlistLikes: {
      collection: 'playlistlike',
      via: 'user'
    },
    followers: {
      collection: 'follow',
      via: 'follower'
    },
    follows: {
      collection: 'follow',
      via: 'follow'
    },
    comments: {
      collection: 'comment',
      via: 'createdBy'
    },
    sendedMessages: {
      collection: 'message',
      via: 'from'
    },
    receivedMessages: {
      collection: 'message',
      via: 'to'
    },
    isOnline: {
      type: 'integer'
    },
    directory: {
      type: 'string'
    },
    summaryUploaded: {
      type: 'integer',
      defaultsTo: 0
    },
    plan: {
      type: 'string',
      enum: ['free', 'pro', 'unlimited'],
      defaultsTo: 'free'
    },
    numLikes: {
      type: 'integer',
      defaultsTo: 0
    }
  },

  issueSessionToken: function (user, cb) {
    //console.log('issueSessionToken');
    if (!user || typeof user === 'function') {
      return cb("A model user must be supplied");
    } else {
      var token = crypto.randomBytes(32).toString('hex');
      user.token = token;
      User.update({id:user.id}, {token: token}).exec(function (err, user) {
        if (err) sails.log.error('User.js:issueSessionToken', 'User.update', user.id, err);
        return cb(err, token);
      });
    }
  },

  consumeSessionToken: function (token, cb) {
    //console.log('consumeSessionToken');
    if(!token || typeof token === 'function') return cb("A token must be supplied");
    User.findOne({token:token}, function(err, user) {
      if (err || !user) {
        sails.log.error('User.js:consumeSessionToken', 'User.findOne', token, err);
        return cb(err, false);
      } else {
        User.update({id:user.id}, {token: ''}).exec(function (err, user) {
          if (err) sails.log.error('User.js:consumeSessionToken', 'User.update', user.id, err);
          return cb(err, token);
        });
      }
    });
  },

  checkToken: function (token, cb) {
    //console.log('checkToken');
    if(!token || typeof token === 'function') return cb("A token must be supplied");
    User.findOne({token:token}, function(err, user) {
      if (err || !user) {
        sails.log.error('User.js:checkToken', 'User.findOne', token, err);
        return cb(err);
      } else {
        return cb(err, user);
      }
    });
  },

  checkUser: function (user, cb) {
    //console.log('checkUser');
    if (!user || typeof user === 'function') {
      return cb("A model user must be supplied");
    } else {
      return cb(null, user.token);
    }
  },

  isFollowed: function (user, curUser) {
    if (curUser) {
      var follow = _.map(user.follows,'follower').indexOf(curUser.id);
      if (follow >= 0) {
        return true;
      }
    }
    return false;
  },

  follow: function (params, cb) {
    var criteria = {follow:params.user, follower:params.curUser.id};
    Follow.findOne(criteria).exec(function (err, follow) {
      if (err) sails.log.error('User.js:follow', 'Follow.findOne', criteria, err);
      var toggleFollow = function (follow, params, callback) {
        if(!follow) {
          Follow.create(criteria).exec(function (err, res) {
            if (err) sails.log.error('User.js:follow', 'Follow.create', criteria, err);
            var notifyParams = { action:'follow', initiator: params.curUser.id, target: params.user };
            Notify.insert(notifyParams, function (notify) { callback(true); });
          });
        } else {
          Follow.destroy(criteria).exec(function (err, res) {
            if (err) sails.log.error('User.js:follow', 'Follow.destroy', criteria, err);
            callback(false);
          });
        }
      };

      toggleFollow(follow, params, function(isFollowed) {
        User.findOne(params.user).exec(function (err, user) {
          if (err) sails.log.error('User.js:follow', 'User.findOne', params.user, err);
          Follow.count({follow:params.user}).exec(function (err, numFollowers) {
            if (err) sails.log.error('User.js:follow', 'Follow.count', params.user, err);
            user.isFollowed = isFollowed;
            user.numFollowers = numFollowers;
            user = User.clearPrivateData(user);
            cb(user);
          });
        });
      });

    });
  },

  getHim: function (criteria, curUser, cb) {
    User.findOne(criteria)
      .populate('nowPlaying')
      .then(function (user) {
        
        if(!user) return false;

        var numFollows = Follow.count({follower:user.id}).then(function (res) {
          return res;
        });

        var numFollowers = Follow.count({follow:user.id}).then(function (res) {
          return res;
        });

        var isFollowed = false;
        if (curUser) {
          var isFollowedParams = {follow: user.id, follower: curUser.id};
          isFollowed = Follow.count(isFollowedParams).then(function (res) {
            return !!res;
          });
        }

        var numTracks = Track.count({createdBy: user.id}).then(function (res) {
          return res;
        });

        var numPlaylists = Playlist.count({createdBy: user.id}).then(function (res) {
          return res;
        });

        var numTrackLikes = Like.count({user: user.id}).then(function (res) {
          return res;
        });

        return [user, numFollows, numFollowers, isFollowed, numTracks, numPlaylists, numTrackLikes];
      })
      .spread(function (user, numFollows, numFollowers, isFollowed, numTracks, numPlaylists, numTrackLikes) {
        if(!user) {cb(false); return false;}
        user.numFollows = numFollows;
        user.numFollowers = numFollowers;
        user.isFollowed = isFollowed;
        user.numTracks = numTracks;
        user.numPlaylists = numPlaylists;
        user.numTrackLikes = numTrackLikes;
        user = User.clearPrivateData(user);
        cb(user);
      })
      .fail(function (err) {
        //if (err) sails.log.error('User.js:getHim', 'spread', criteria, err);
      });
  },

  getAll: function (criteria, user, cb) {
    User.find(criteria)
      .populate('follows')
      .populate('followers')
      .populate('addedTracks')
      .populate('trackLikes')
      .exec(function (err, results) {
        if (err) sails.log.error('User.js:getAll', 'User.find', criteria, err);
        if (!_.isEmpty(results)) {
          _.forEach(results, function (result) {
            result.numFollowers = result.follows.length;
            result.numFollows = result.followers.length;
            result.numTracks = result.addedTracks.length;
            result.numTrackLikes = result.trackLikes.length;
            result.isFollowed = User.isFollowed(result, user);
            result.follows = [];
            result.followers = [];
            result.addedTracks = [];
            result.trackLikes = [];

            result = User.clearPrivateData(result);
          });
          cb(results);
        } else {
          cb([]);
        }
      });

  },

  search: function (criteria, q, cb) {
    var results = [];
    criteria.or = [
      {login: {'contains':q}},
      {fullname: {'contains':q}},
      {login: {'contains':TranslitService.transliterate(q)}},
      {fullname: {'contains':TranslitService.transliterate(q)}}
    ];
    User.find(criteria).exec(function (err, users) {
      if (err) sails.log.error('User.js:search', 'User.find', criteria, err);
      _.forEach(users, function (user) {
        var result = {
          type: 'user',
          id: user.login,
          name: user.fullname || user.login,
          cover: user.avatarUrl
        };
        results.push(result);
      });
      cb(results);
    });
  },

  clearPrivateData: function (user) {
    if (user) {
      delete user.token;
      delete user.password;
      delete user.provider;
      delete user.uid;
    } else {
      user = {
        avatarUrl: sails.config.params.user.deleted,
        status: 'removed'
      };
    }
    return user;
  },

  updateSummaryUploaded: function (userId, duration, increment, cb) {
    var operation = '-';
    if (increment) operation = '+';
    var sql = "UPDATE `user` SET `summaryUploaded`= summaryUploaded "+operation+duration+" WHERE `id`="+userId;
    User.query(sql, function (err, user) {
      if (err) sails.log.error('User.js:updateSummaryUploaded', 'User.query', sql, err);
      if (typeof cb === "function") cb();
    });
  },

  updateLikes: function (userId, increment, cb) {
    var operation = '-';
    if (increment) operation = '+';
    var sql = "UPDATE `user` SET `numLikes`= numLikes "+operation+" 1 WHERE `id`="+userId;
    User.query(sql, function (err, user) {
      if (err) sails.log.error('User.js:updateLikes', 'User.query', sql, err);
      if (typeof cb === "function") cb();
    });
  },

  generateLogin: function () {
    return guid.raw();
  },

  getStats: function (user, cb) {
    var sql = "SELECT genre.id as genreId, genre.name as genreName, genre.kol as genrePlays, weekly.id as weeklyId, weekly.name as weeklyName, weekly.kol as weeklyPlays, monthly.id as monthlyId, monthly.name as monthlyName, monthly.kol as monthlyPlays, alltime.id as alltimeId, alltime.name as alltimeName, alltime.kol as alltimePlays " +
                
                " FROM (SELECT b.id, b.name, count(a.track) kol "+
                " FROM trackplays a, track b "+
                " WHERE a.user = "+user.id+" AND a.track = b.id "+
                " AND a.createdAt > DATE_SUB(CURDATE(), INTERVAL 7 DAY) "+
                " GROUP BY 1 , 2 ORDER BY 3 DESC LIMIT 1) weekly, "+
                
                " (SELECT b.id, b.name, count(a.track) kol "+
                " FROM trackplays a, track b "+
                " WHERE a.user = "+user.id+" AND a.track = b.id "+
                " AND a.createdAt > DATE_SUB(CURDATE(), INTERVAL 30 DAY) "+
                " GROUP BY 1 , 2  ORDER BY 3 DESC LIMIT 1) monthly, "+
                
                " (SELECT b.id, b.name, count(a.track) kol "+
                " FROM trackplays a, track b "+
                " WHERE a.user = "+user.id+" AND a.track = b.id "+
                " GROUP BY 1 , 2 ORDER BY 3 DESC LIMIT 1) alltime, "+
                
                " (SELECT  b.genreId as id, (select name from genre where id = b.genreId) name, count(a.track) kol "+
                " FROM trackplays a, track b "+
                " WHERE a.user = "+user.id+" AND a.track = b.id "+
                " AND b.genreId is not null "+
                " GROUP BY 1 , 2 ORDER BY 3 DESC LIMIT 1) genre";
    TrackPlays.query(sql, function (err, stats) {
      if (err) sails.log.error('User.js:getStats', 'TrackPlays.query', sql, err);
      cb(stats[0]);
    });
  },

  getStream: function (user, criteria, cb) {
    if (user) {
      Follow.find({'follower': user.id}).exec(function (err, users) {
        if (err) sails.log.error('User.js:getStream', 'Follow.find', user.id, err);
        var follows = _.map(users,'follow');
        if (_.isEmpty(follows)) return cb([]);
        var sql = " select id, 'trackadded' xtype, createdBy initiator, createdAt from track where createdBy in("+follows.join()+")"+
                  " union all"+
                  " select track, 'trackliked' xtype, user initiator, createdAt from `like` where user in("+follows.join()+")"+
                  " union all"+
                  " select id, 'playlistadded' xtype, createdBy initiator, createdAt from playlist where createdBy in("+follows.join()+")"+
                  " union all"+
                  " select playlist, 'playlistliked' xtype, user initiator, createdAt from playlistlike where user in("+follows.join()+")"+
                  " order by createdAt DESC"+
                  " LIMIT "+criteria.skip+", "+criteria.limit;
        Track.query(sql, function (err, stream) {
          if (err) sails.log.error('User.js:getStream', 'Track.query', sql, err);
          var params = {
            trackadded: [],
            trackliked: [],
            playlistadded: [],
            playlistliked: [],
            initiator: _.map(stream, 'initiator')
          };
          _.forEach(stream, function (o) { params[o.xtype].push(o.id); });

          stream = _.groupBy(stream, 'xtype');
          User.getAll({id: params.initiator}, user, function (initiators) {
            Track.getAll({ id: _.isEmpty(params.trackadded) ? 0 : params.trackadded }, user, function (tracks) {
              Track.getAll({ id: _.isEmpty(params.trackliked) ? 0 : params.trackliked }, user, function (tracklikes) {
                Playlist.getAll({ id: _.isEmpty(params.playlistadded) ? 0 : params.playlistadded }, user, function (playlists) {
                  Playlist.getAll({ id: _.isEmpty(params.playlistliked) ? 0 : params.playlistliked }, user, function (playlistlikes) {
                    var results = [];
                    var pushXtype = function (items, xtype) {
                      if (!_.isEmpty(items)) {
                        _.forEach(items, function (item) {
                          item.xtype = xtype;
                          results.push(item);
                        });
                      }
                    };
                    pushXtype(tracks, 'trackadded');
                    pushXtype(tracklikes, 'trackliked');
                    pushXtype(playlists, 'playlistadded');
                    pushXtype(playlistlikes, 'playlistliked');

                    _.forEach(results, function (result) {
                      var node = stream[result.xtype];
                      var index = _.map(node, 'id').indexOf(result.id);
                      var initiator = _.map(initiators, 'id').indexOf(node[index].initiator);
                      result.initiator = initiators[initiator];
                      result.initDate = node[index].createdAt;
                    });
                    cb(_.sortBy(results, 'initDate').reverse());
                  });
                });
              });
            });
          });

        });
      });
    } else {
      return cb([]);
    }
  },

  getByGenre: function (genre, callback) {
    var sql = "SELECT distinct(createdBy) users FROM track WHERE genreId = "+genre;
    Track.query(sql, function (err, users) {
      if (err) sails.log.error('User.js:getByGenre', 'Track.query', sql, err);
      users = _.map(users, 'users');
      callback(users);
    });
  }

};