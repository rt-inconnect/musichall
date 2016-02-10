/**
 * Playlist.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */
var Promise = require("bluebird");

module.exports = {

	attributes: {
    id: {
      type: 'integer',
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: 'string'
    },
    coverUrl: {
      type: 'string'
    },
    totalTime: {
      type: 'integer'
    },
    createdBy: {
      model: 'user',
      dominant: true
    },
    /*tracks: {
      collection: 'playlisttrack',
      via: 'playlist'
    },*/
    directory: {
      type: 'string'
    },
    slug: {
      type: 'string'
    },
    userLikes: {
      collection: 'playlistlike',
      via: 'playlist'
    },
    numLikes: {
      type: 'integer',
      defaultsTo: 0
    }
	},

  get: function (id, user, cb) {
    this.findOne(id).populate('createdBy').exec(function (err, playlist) {
      if (err) sails.log.error('Playlist.js:get', 'this.findOne', id, err);
      if (playlist) {
        var params = {playlist: playlist.id, user: user ? user.id : 0 };
        PlaylistLike.findOne(params).exec(function (err, like) {
          if (err) sails.log.error('Playlist.js:get', 'PlaylistLike.findOne', params, err);
          params = {playlist: playlist.id, sort: 'sort'};
          PlaylistTrack.find(params).exec(function (err, pTracks) {
            if (err) sails.log.error('Playlist.js:get', 'PlaylistTrack.find', params, err);
            tIds = _.map(pTracks, 'track');
            if (!_.isEmpty(tIds)) {
              sql = 'SELECT id, name, numPlays FROM track WHERE id in ('+tIds.join()+')';
              Track.query(sql, function (err, tracks) {
                if (err) sails.log.error('Playlist.js:get', 'Track.query', sql, err);
                tIds = _.map(tracks, 'id');
                playlist.isLiked = !!like;
                playlist.numTracks = pTracks.length;
                playlist.tracks = [];
                _.forEach(pTracks, function (pTrack) {
                  playlist.tracks.push(tracks[tIds.indexOf(pTrack.track)]);
                });
                sql = 'SELECT waveData FROM track WHERE id = '+playlist.tracks[0].id;
                Track.query(sql, function (err, wave) {
                  if (err) sails.log.error('Playlist.js:get', 'Track.query', sql, err);
                  playlist.tracks[0].waveData = JSON.parse(wave[0].waveData);
                  cb(playlist);
                });
              });
            }
          });
        });
      } else {
        cb({});
      }
    });
  },

  get2: function (id, user, cb) {
    this.findOne(id)
      .populate('tracks', { sort: 'sort' })
      .populate('createdBy')
      .populate('userLikes')
      .then(function (playlist) {
        playlist.numTracks = playlist.tracks.length;
        playlist.numLikes = playlist.userLikes.length;
        playlist.isLiked = Playlist.isLiked(playlist, user);
        var ids = _.map(playlist.tracks,'track');
        var criteria = {id: ids};
        Track.getAll(criteria, user, function (tracks) {
          var sortedTracks = [];
          _.forEach(ids, function (id) {
            var index = _.map(tracks,'id').indexOf(id);
            sortedTracks.push(tracks[index]);
          });
          playlist.tracks = sortedTracks;
          playlist.createdBy = User.clearPrivateData(playlist.createdBy);
          cb(playlist);
        });
      });
  },

  getAll: function (criteria, user, cb) {
    this.find(criteria).populate('createdBy').exec(function (err, playlists) {
      if (err) sails.log.error('Playlist.js:getAll', 'this.find', criteria, err);
      var pIds = _.map(playlists, 'id');
      if (!_.isEmpty(pIds)) {
        var params = {playlist: pIds, user: user ? user.id : 0};
        PlaylistLike.find(params).exec(function (err, likes) {
          if (err) sails.log.error('Playlist.js:getAll', 'PlaylistLike.find', params, err);
          var lIds = _.map(likes, 'playlist');
          params = {playlist: pIds, sort: 'sort'};
          PlaylistTrack.find(params).exec(function (err, pTracks) {
            if (err) sails.log.error('Playlist.js:getAll', 'PlaylistTrack.find', params, err);
            tIds = _.map(pTracks, 'track');
            if (!_.isEmpty(tIds)) {
              pTracks = _.groupBy(pTracks, 'playlist');
              // Выбираем первый трэк плейлиста для waveData
              var wTracks = [];
              _.forEach(pTracks, function (pTrack) {
                if (!_.isEmpty(pTrack)) wTracks.push(pTrack[0].track);
              });
              var sql = 'SELECT id, waveData FROM track WHERE id in('+wTracks.join()+')';
              Track.query(sql, function (err, wTracks) {
                if (err) sails.log.error('Playlist.js:getAll', 'Track.query', sql, err);
                wIds = _.map(wTracks, 'id');
                sql = 'SELECT id, name, numPlays FROM track WHERE id in ('+tIds.join()+')';
                Track.query(sql, function (err, tracks) {
                  if (err) sails.log.error('Playlist.js:getAll', 'Track.query', sql, err);
                  tIds = _.map(tracks, 'id');
                  _.forEach(playlists, function (playlist) {
                    playlist.isLiked = lIds.indexOf(playlist.id) >= 0 ? true : false;
                    playlist.numTracks = pTracks[playlist.id] ? pTracks[playlist.id].length : 0;
                    playlist.tracks = [];
                    if (pTracks[playlist.id]) {
                      _.forEach(pTracks[playlist.id], function (pTrack) {
                        playlist.tracks.push(tracks[tIds.indexOf(pTrack.track)]);
                      });
                      playlist.tracks[0].waveData = JSON.parse(wTracks[wIds.indexOf(playlist.tracks[0].id)].waveData);
                    }
                  });
                  cb(playlists);
                });
              });
            }
          });
        });
      } else {
        cb([]);
      }
    });
  },

  getAll2: function (criteria, user, trackId, cb) {
    this.find(criteria)
      .populate('tracks', { sort: 'sort' })
      .populate('createdBy')
      .populate('userLikes')
      .then(function (results) {
        if(_.isEmpty(results)) { cb([]); return;}
        //results.createdBy = User.clearPrivateData(results.createdBy);
        var i = 0; // Объявляем супер-пупер промис)
        for (var r = 0; r < results.length; r++) {
          var ids = _.map(results[r].tracks,'track');
          var opts = { r: r, ids: ids };
          results[r].numLikes = results[r].userLikes.length;
          results[r].isLiked = Playlist.isLiked(results[r], user);
          Track.getAll({id:ids}, user, function (tracks, opts) {
            // Sort tracks in playlist by sorted array after .populate()
            results[opts.r].isAdded = Playlist.isAdded(results[opts.r], trackId);
            results[opts.r].numTracks = results[opts.r].tracks.length;
            results[opts.r].tracks = [];
            results[opts.r].createdBy = User.clearPrivateData(results[opts.r].createdBy);
            _.forEach(opts.ids, function (id) {
              var index = _.map(tracks,'id').indexOf(id);
              results[opts.r].tracks.push(tracks[index]);
            });

            i++;
            // Тут проверяем на выполнение нашего промиса
            if(i == results.length) cb(results);
          }, opts);
        }
      });
  },

  isLiked: function (playlist, user) {
    if (user) {
      var like = playlist.userLikes.map(function (o) {
        return o.user;
      }).indexOf(user.id);
      if (like >= 0) {
        return true;
      }
    }
    return false;
  },  

  toggleTrack: function (params, user, cb) {
    PlaylistTrack.findOne(params).exec(function (err, result) {
      if (err) sails.log.error('Playlist.js:toggleTrack', 'PlaylistTrack.findOne', params, err);
      if(!result) {
        PlaylistTrack.create(params).exec(function (err, result) {
          if (err) sails.log.error('Playlist.js:toggleTrack', 'PlaylistTrack.create', params, err);
          Playlist.get(params.playlist, user, function (playlist) {
            Track.findOne(params.track).exec(function (err, track) {
              if (err) sails.log.error('Playlist.js:toggleTrack', 'Track.findOne', params.track, err);
              var notifyParams = { action:'playlist', initiator: user.id, target: track.createdBy, track: track.id, playlist: playlist.id };
              Notify.insert(notifyParams, function (notify) {
                playlist.isAdded = true;
                cb(playlist);
              });
            });
          });
        });
      } else {
        PlaylistTrack.destroy(params).exec(function (err, result) {
          if (err) sails.log.error('Playlist.js:toggleTrack', 'PlaylistTrack.destroy', params, err);
          Playlist.get(params.playlist, user, function (playlist) {
            playlist.isAdded = false;
            cb(playlist);
          });
        });
      }
    });
  },

  like: function (params, cb) {
    var criteria = {user:params.user.id, playlist:params.playlist};
    PlaylistLike.findOne(criteria).exec(function (err, like) {
      if (err) sails.log.error('Playlist.js:like', 'PlaylistLike.findOne', criteria, err);
      var toggleLike = function (like, params, callback) {
        if(!like) {
          PlaylistLike.create(criteria).exec(function (err, res) {
            if (err) sails.log.error('Playlist.js:like', 'PlaylistLike.create', criteria, err);
            Playlist.findOne(params.playlist).exec(function (err, playlist) {
              if (err) sails.log.error('Playlist.js:like', 'Playlist.findOne', params.playlist, err);
              Playlist.update({id:playlist.id}, {numLikes: playlist.numLikes + 1}).exec(function (err, playlist) { if (err) sails.log.error('Playlist.js:like', 'Playlist.update', criteria, err); });
              if (params.user.id != playlist.createdBy) User.updateLikes(playlist.createdBy, true);
              var notifyParams = { action:'playlistlike', initiator: params.user.id, target: playlist.createdBy, playlist: playlist.id };
              Notify.insert(notifyParams, function (notify) { callback(true); });
            });
          });
        } else {
          PlaylistLike.destroy(criteria).exec(function (err, res) {
            if (err) sails.log.error('Playlist.js:like', 'PlaylistLike.destroy', criteria, err);
            Playlist.findOne(params.playlist).exec(function (err, playlist) {
              if (err) sails.log.error('Playlist.js:like', 'Playlist.findOne', params.playlist, err);
              Playlist.update({id:playlist.id}, {numLikes: playlist.numLikes - 1}).exec(function (err, playlist) { if (err) sails.log.error('Playlist.js:like', 'Playlist.update', criteria, err); });
              if (params.user.id != playlist.createdBy) User.updateLikes(playlist.createdBy, false);
              callback(false);
            });
          });
        }
      };

      toggleLike(like, params, function (isLiked) {
        Playlist.findOne(params.playlist).exec(function (err, playlist) {
          if (err) sails.log.error('Playlist.js:like', 'Playlist.findOne', params.playlist, err);
          PlaylistLike.count({playlist:params.playlist}).exec(function (err, numLikes) {
            if (err) sails.log.error('Playlist.js:like', 'PlaylistLike.count', params.playlist, err);
            playlist.numLikes = numLikes;
            playlist.isLiked = isLiked;
            cb(playlist);
          });
        });
      });
    });
  },

  isAdded: function (playlist, trackId) {
    if (trackId) {
      var added = _.map(playlist.tracks,'track').indexOf(trackId);
      if (added >= 0) {
        return true;
      }
    }
    return false;
  },

  createWithTrack: function (params, tracks, cb) {
    Playlist.create(params).exec(function (err, playlist) {
      if (err) sails.log.error('Playlist.js:like', 'Playlist.create', params, err);
      if(_.isEmpty(tracks)) {
        cb(playlist);
        return false;
      }
      if(typeof tracks == 'object') {
        var childs = [];
        _.forEach(tracks, function (track, sort) {
          childs.push({playlist:playlist.id,track:track,sort:sort});
        });
        PlaylistTrack.create(childs).exec(function (err) {
          if (err) sails.log.error('Playlist.js:create', 'PlaylistTrack.create', childs, err);
          cb(playlist);
        });
      } else {
        var data = {playlist:playlist.id, track:tracks};
        PlaylistTrack.create(data).exec(function(err) {
          if (err) sails.log.error('Playlist.js:create', 'PlaylistTrack.create', data, err);
          cb(playlist);
        });
      }
    });
  }

};