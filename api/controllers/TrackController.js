/**
 * TrackController
 *
 * @description :: Server-side logic for managing tracks
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var path = require('path');
var guid = require('guid');
var fs = require('fs');
//var ffmpeg = require('liquid-ffmpeg');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var jschardet = require("jschardet");
var getSlug = require('speakingurl');
var convertTime = function (unixtime) {
  var date = new Date(unixtime*1000);
  var minutes = "0" + date.getMinutes();
  var seconds = "0" + date.getSeconds();
  return minutes.substr(minutes.length-2) + ':' + seconds.substr(seconds.length-2);
};

module.exports = {

  find: function (req, res) {
    var id = parseInt(req.param('id'));

    Track.get(id, req.user, function (result) {
      res.json(result);
    });
  },

  welcome: function (req, res) {
    var params = {limit:1,sort:{numLikes:0,numPlays:0}};
    Track.find(params).populate('createdBy').exec(function (err, track) {
      if (err) sails.log.error('TrackController.js:welcome', 'Track.find', params, err);
      res.json({
        id: track[0].id,
        coverUrl: track[0].coverUrl,
        name: track[0].name,
        fileOgg: track[0].fileOgg,
        duration: track[0].duration,
        position: 0,
        progress: 0,
        numPlays: track[0].numPlays,
        createdBy: {
          login: track[0].createdBy.login,
          avatarUrl: track[0].createdBy.avatarUrl
        }
      });
    });
  },


  findAll: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    if (allParams.genre && allParams.genre > 0)
      criteria.genreId = allParams.genre;
    if (allParams.tag)
      criteria.tag = allParams.tag;

    Track.getAll(criteria, req.user, function (results) {
      res.json(results);
    });
  },

  history: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    if(!req.user) return res.json([]);

    var condition = '';
    if (req.user)
      condition = 'AND b.user = '+req.user.id;

    var sql = 'SELECT a.id, a.name, b.createdAt ' +
     ' FROM track a, trackplays b WHERE a.id = b.track '+ condition +
     ' ORDER BY b.id DESC ' +
     ' LIMIT '+criteria.skip+','+criteria.limit;

    Track.query(sql, function (err, results) {
       if (err) sails.log.error('TrackController.js:history', 'Track.query', sql, err);
       if(err) console.log(err);
       res.json(results);
     });
  },

  search: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var playlistId = parseInt(req.param('playlist'));
    var q = req.param('q');

    PlaylistTrack.find({playlist: playlistId}).exec(function (err, playlist) {
      if (err) sails.log.error('TrackController.js:search', 'Playlist.findOne', playlistId, err);
      var ids = playlist.map(function (o) {
        return o.track;
      });
      var params = { name: { 'contains': q } };
      if(!_.isEmpty(ids)) params.id = { '!': ids };

      Track.find(params).exec(function (err, results) {
        if (err) sails.log.error('TrackController.js:search', 'Track.find', params, err);
        res.json(results);
      });
    });

  },

  stream: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    /*var login = req.user ? req.user.login : '';
    if(req.param('user'))
      login = req.param('user');
    User.findOne({login: login}).then(function (user) {
      var id = user.id;
      Follow.find({'follower': id}).then(function (users) {
        var follows = _.map(users,'follow');
        criteria.createdBy = follows;
        Track.getAll(criteria, req.user, function (results) {
          res.json(results);
        });
      });
    });*/

    User.getStream(req.user, criteria, function (results) {
      res.json(results);
    });
  },

  findAdded: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    var login = req.user ? req.user.login : '';
    if(req.param('user'))
      login = req.param('user');
    User.findOne({login: login}).exec(function (err, user) {
      if (err) sails.log.error('TrackController.js:findAdded', 'User.findOne', login, err);
      if (!user) return res.send(404);
      criteria.createdBy = user.id;
      Track.getAll(criteria, req.user, function (results) {
        res.json(results);
      });
    });
  },

  findLikes: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    var login = req.user ? req.user.login : '';
    if(req.param('user'))
      login = req.param('user');

    /*User.findOne({login: login})
      .populate('trackLikes', criteria)
      .then(function (user) {
        var ids = user.trackLikes.map(function (o) {
          return o.track;
        });
        Track.getAll({id: ids}, req.user, function (results) {
          res.json(results);
        });
      });*/
    Track.getLiked(login, req.user, criteria, function (results) {
      res.json(results);
    });
  },


  findPopular: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var interval = req.param('interval');
    var params = { interval: 7, limit: 10, genre: req.param('genre') };

    switch(interval) {
      case 'weekly':
        params.interval = 7;
        break;
      case 'monthly':
        params.interval = 31;
        break;
      case 'yearly':
        params.interval = 356;
        break;
    }
    if (interval == 'alltime') {
      criteria.sort = 'numPlays DESC';
      if (req.param('genre') > 0) criteria.genreId = req.param('genre');
      Track.getAll(criteria, req.user, function (results) {
        res.json(results);
      });
    } else {
      TrackPlays.topByInterval(params, function (plays) {
        criteria.id = plays;
        Track.getAll(criteria, req.user, function (results) {
          res.json(results);
        });
      });
    }
  },

/*
  findPopular: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    criteria.limit = 3;

    var mode = 'byPlays';
    if(req.param('mode'))
      mode = req.param('mode');

    if(mode === 'byPlays') {
      criteria.sort = 'numPlays DESC';
      Track.getAll(criteria, req.user, function (results) {
        res.json(results);
      });
    }
    if(mode === 'byLikes') {
      Like.query('SELECT track, count(id) kol FROM `like` GROUP BY track ORDER BY `kol`  DESC LIMIT 0,3', function (err, results) {
        if(err) console.log(err);
        var ids = _.map(results,'track');
        criteria.id = ids;
        Track.getAll(criteria, req.user, function (results) {
          res.json(results);
        });
      });
    }
    if(mode === 'byComments') {
      Comment.query('SELECT trackId, count(id) kol FROM `comment` GROUP BY trackId ORDER BY `kol`  DESC LIMIT 0,3', function (err, results) {
        if(err) console.log(err);
        var ids = _.map(results,'trackId');
        criteria.id = ids;
        Track.getAll(criteria, req.user, function (results) {
          res.json(results);
        });
      });
    }
  },*/

  findRecommended: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var params = { interval: 1, limit: 10, user: '' };
    if(req.user) params.user = req.user.id;

    var defaultTracks = function () {
      /*criteria.sort = 'numPlays DESC';
      criteria.limit = 10;
      Track.getAll(criteria, req.user, function (results) {
        res.json(results);
      });*/
      res.json([]);
      return false;
    };

    if(!req.user) return defaultTracks();

    return TrackPlays.topByInterval(params, function (plays) {
      if (_.isEmpty(plays)) return defaultTracks();
      return Tag.find({trackId: plays}).exec(function (err, tags) {
        if (err) sails.log.error('TrackController.js:findRecommended', 'Tag.find trackId', plays, err);
        if(_.isEmpty(tags)) return defaultTracks();
        params.tags = _.map(tags, 'name');
        TrackPlays.topByIntervalTags(params, function (plays) {
          if(_.isEmpty(plays)) return defaultTracks();
          criteria.id = plays;
          Track.getAll(criteria, req.user, function (results) {
            res.json(results);
          });
        });
      });
    });
  },

  findSame: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var id = parseInt(req.param('id'));
    var params = { interval: 7, limit: 10, track: id };
    if(req.user) params.user = req.user.id;

    var defaultTracks = function () {
      /*criteria.sort = 'numPlays DESC';
      criteria.limit = 10;
      Track.getAll(criteria, req.user, function (results) {
        res.json(results);
      });*/
      res.json([]);
      return false;
    };

    return Tag.find({trackId: id}).exec(function (err, tags) {
      if (err) sails.log.error('TrackController.js:findSame', 'Tag.find trackId', id, err);
      if(_.isEmpty(tags)) return defaultTracks();
      params.tags = _.map(tags, 'name');
      TrackPlays.topByIntervalTags(params, function (plays) {
        if(_.isEmpty(plays)) return defaultTracks();
        criteria.id = plays;
        Track.getAll(criteria, req.user, function (results) {
          res.json(results);
        });
      });
    });
  },

  like: function (req, res) {
    var params = {
      user: req.user,
      track: parseInt(req.param('id'))
    };
    if((!params.user) || (!params.track)) return res.send(404);
    Track.like(params, function (track) {
      res.json(track);
    });
  },

  comments: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var id = parseInt(req.param('id'));
    criteria.trackId = id;

    Comment.find(criteria).populate('createdBy').exec(function(err, comments) {
      if (err) sails.log.error('TrackController.js:comments', 'Comment.find', criteria, err);
      _.forEach(comments, function (comment) {
        comment = User.clearPrivateData(comment.createdBy);
      });
      res.json(comments);
    });

  },

  likes: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var id = parseInt(req.param('id'));
    criteria.track = id;

    Like.find(criteria).exec(function(err, likers) {
      if (err) sails.log.error('TrackController.js:likes', 'Like.find', criteria, err);
      var ids = _.map(likers,'user');
      if(_.isEmpty(ids)) res.json([]);
      User.getAll(ids, req.user, function (users) {
        res.json(users);
      });
    });

  },

  playlists: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var id = parseInt(req.param('id'));
    criteria.track = id;

    PlaylistTrack.find(criteria).exec(function(err, playlists) {
      if (err) sails.log.error('TrackController.js:playlists', 'PlaylistTrack.find', criteria, err);
      var ids = _.map(playlists,'playlist');
      if(_.isEmpty(ids)) res.json([]);
      Playlist.getAll(ids, req.user, function (results) {
        res.json(results);
      });
    });

  },

  comment: function (req, res) {
    var id = parseInt(req.param('id'));
    var content = req.param('content');

    if ((!req.user) || (!id)) return res.send(404);

    var data = {
      trackId: id,
      createdBy: req.user.id,
      content: content
    };

    Comment.create(data).exec(function (err, comment) {
      if (err) sails.log.error('TrackController.js:comment', 'Comment.create', data, err);
      Track.findOne(data.trackId).exec(function (err, track) {
        if (err) sails.log.error('TrackController.js:comment', 'Track.findOne', data.trackId, err);
        Track.update({id:track.id}, {numComments: track.numComments + 1}).exec(function (err) { if (err) sails.log.error('TrackController.js:comment', 'Track.update numComments + 1', track.id, err); });
        var notifyParams = { action:'trackcomment', initiator: data.createdBy, target: track.createdBy, track: track.id };
        Notify.insert(notifyParams, function () {});
      });
      Comment.findOne(comment.id).populate('createdBy').exec(function (err, comment) {
        if (err) sails.log.error('TrackController.js:comment', 'Comment.findOne', err);
        comment.createdBy = User.clearPrivateData(comment.createdBy);
        res.json(comment);
      });
    });
  },

  delcomment: function (req, res) {
    var id = parseInt(req.param('id'));
    if (IfService.isAdmin(req.user)) {
      Comment.findOne(id).exec(function (err, comment) {
        if (err) sails.log.error('TrackController.js:delcomment', 'Comment.findOne', id, err);
        Comment.destroy(id, function (err) {
          if (err) sails.log.error('TrackController.js:delcomment', 'Comment.destroy', id, err);
          Track.findOne(comment.trackId).exec(function (err, track) {
            if (err) sails.log.error('TrackController.js:delcomment', 'Track.findOne', comment.trackId, err);
            Track.update({id:track.id}, {numComments: track.numComments - 1}).exec(function (err) { if (err) sails.log.error('TrackController.js:delcomment', 'Track.update numComments - 1', track.id, err); });
          });
          
          return res.send(200);
        });
      })
    } else {
      return res.send(404);
    }
  },

  create: function (req, res) {
    if (!req.session.passport.user) return res.send(404);

    if (!IfService.canUpload(req.user)) return res.json(500, {type:'limit-error'});

    if (!req.file('file')._files[0]) return res.send(404);

    var ext = path.extname(req.file('file')._files[0].stream.filename);
    var basename = path.basename(req.file('file')._files[0].stream.filename, ext);
    var slug = getSlug(basename);
    if(!slug) slug = guid.raw();
    var dirname = 'users/'+req.user.directory+'/tracks/'+slug;
    var rootPath = sails.config.params.rootPath;
    var createdBy = req.session.passport.user;

    Track.createCoverDirectory(dirname, function (success, exist) {
      if (exist) { res.json(500, {type:'dir-track-exist', track: exist}); return false; }
      req.file('file').upload({
        dirname: '../../' + dirname,
        saveAs: 'original' + ext,
        maxBytes: 100000000
      }, function (err, files) {

        if (err) return res.serverError(err);

        var mp3Path = dirname + '/original'+ext;
        var oggPath = dirname + '/converted.ogg';
        var wavPath = '.tmp/uploads/'+slug+'.wav';
        var txtPath = '.tmp/uploads/'+slug+'.txt';

        Track.getFileInfo(rootPath + mp3Path, function (result) {
          if (result) {
            var artist = IconvService.convertToUtf(result.metadata.artist);
            var album = IconvService.convertToUtf(result.metadata.album);
            var title = IconvService.convertToUtf(result.metadata.title);
            var genre = IconvService.convertToUtf(result.metadata.genre);
            var duration = Math.floor(result.duration);
            var data = {
              createdBy: createdBy,
              name: basename,
              fileMp3: mp3Path,
              duration: duration,
              slug: req.user.login+'-'+slug,
              directory: dirname
            };
            if (artist && title) data.name = artist + ' - ' + title ;

            Track.checkByName(data.name, function (exist) {
              if (exist) { res.json(500, {type:'track-exist', track: exist}); return false; }
              Track.setGenre(genre, function (rec) {
                if (rec) data.genreId = rec.id;
              });

              var doNext = function () {
                Track.checkByName(data.name, function (track) {
                  if (!track) {
                    Track.toOgg(rootPath + mp3Path, rootPath + oggPath, createdBy, function (oggRes) {
                      Track.toWav(rootPath + mp3Path, rootPath + wavPath, createdBy, rootPath + txtPath, function (wavRes) {
                        data.fileOgg = oggPath;
                        data.waveData = wavRes;
                        Track.create(data).exec(function (err, track) {
                          if (err) sails.log.error('TrackController.js:create', 'Track.create', data, err);
                          User.updateSummaryUploaded(req.user.id, track.duration, true, function () {
                            if (data.tag) Track.fillTags(track.id, data.tag);

                            Track.get(track.id, createdBy, function (track) {
                              MetadataService.modify(track);
                              res.json(track);
                            });
                          });
                        });
                      });
                    });
                  } else {
                    res.send(200);
                  }
                });                  
              };

              //console.log('-------------');
              if (artist) {
                Track.getCoverGoogle(data, function (data) {
                  Track.getMMCover(data, rootPath + mp3Path, function (data) {
                    Track.getCoverLastFM(data, artist, album, title, function (data) {
                      doNext();
                    });
                  });
                });
              } else {
                Track.getCoverGoogle(data, function (data) {
                  doNext();
                });
              }

            });
          } else {
            res.send(404);
          }
        });
      });
    });
  },

  /*id3genres: function (req, res) {
    Track.fillID3Genres();
    res.send(200, 'Complete');
  },*/

  update: function (req, res) {
    var id = parseInt(req.param('id'));
    var name = req.param('name');
    var genre = req.param('genre');
    var coverUrl = req.param('coverUrl');

    if (!req.user || !id) return res.send(404);

    Track.findOne(id).exec(function (err, track) {
      if (err) sails.log.error('TrackController.js:update', 'Track.findOne', id, err);
      if (!track) return res.send(404);
      if (!IfService.canEdit(req.user, track.createdBy)) return res.send(404);
      var data = {name:name, coverUrl: coverUrl};
      if (genre) data.genreId = genre;

      Track.update({id:id}, data).exec(function (err) {
        if (err) sails.log.error('TrackController.js:update', 'Track.update', id, data, err);
        Track.findOne(id)
          .populate('userLikes')
          .populate('genreId')
          .populate('createdBy')
          .exec(function (err, track) {
            if (err) sails.log.error('TrackController.js:update', 'Track.findOne', id, err);
            track.numLikes = track.userLikes.length;
            track.isLiked = Track.isLiked(track, req.user);
            track.userLikes = [];
            track.createdBy = User.clearPrivateData(track.createdBy);
            MetadataService.modify(track);
            res.json(track);
          });
      });
    });


  },

  destroy: function (req, res) {
    var id = parseInt(req.param('id'));
    
    Track.findOne(id).exec(function (err, track) {
      if (err) sails.log.error('TrackController.js:destroy', 'Track.findOne', id, err);
      if (!track) return res.send(404);
      if (!IfService.canEdit(req.user, track.createdBy)) return res.send(404);
      if(track.coverUrl && fs.existsSync(track.coverUrl)) fs.unlinkSync(track.coverUrl);
      if(track.fileMp3 && fs.existsSync(track.fileMp3)) fs.unlinkSync(track.fileMp3);
      if(track.fileOgg && fs.existsSync(track.fileOgg)) fs.unlinkSync(track.fileOgg);
      FsService.rmdir(track.directory);
      User.updateSummaryUploaded(req.user.id, track.duration, false, function () {
        Track.destroy(id, function (err) {
          if (err) sails.log.error('TrackController.js:destroy', 'Track.destroy', id, err);
          return res.send(200);
        });
      });
    });
  },

  cover: function (req, res) {
    var id = parseInt(req.param('id'));
    if(!id) return res.send(404);
    if(!req.file('file')._files[0]) return res.send(404);

    Track.findOne(id).exec(function (err, track) {
      if (err) sails.log.error('TrackController.js:cover', 'Track.findOne', id, err);
      if (!IfService.canEdit(req.user, track.createdBy)) return res.send(404);

      var original = track.directory + '/images/original/';
      var resized = track.directory + '/images/resized/';
      var ext = path.extname(req.file('file')._files[0].stream.filename);
      var filename = 'custom' + ext;
      req.file('file').upload({
        dirname: '../../' + original,
        saveAs: filename,
        maxBytes: 100000000
      }, function (err, files) {

        if (err)
          return res.serverError(err);

        ImageService.resizeGm(original + filename, resized + filename, function () {
          var coverUrl = resized + filename;
          Track.update({id:id}, {coverUrl:coverUrl}).exec(function (err, track) {
            if (err) sails.log.error('TrackController.js:cover', 'Track.update', id, coverUrl, err);
            res.send(track[0].coverUrl);
          });
        });
      });
    });
  },

  playStarted: function (req, res) {
    var id = parseInt(req.param('id'));
    //console.log('started',id,req.session.passport);
    if (id) {
      req.session.nowPlaying = {
        track: id,
        startedAt: new Date().getTime()
      };
      //console.log('started', req.session.nowPlaying);
      if (req.session.passport && req.session.passport.user) {
        req.session.nowPlaying.user = req.session.passport.user;
        args = { nowPlaying: id };
        User.update(req.session.passport.user, args).exec(function(err, user) {
          if (err) sails.log.error('TrackController.js:playStarted', 'User.update', req.session.passport.user, args, err);
        });
      }
    }
    res.send(200);
  },

  playEnded: function (req, res) {
    //console.log('ended',req.session.nowPlaying);
    if (req.session.nowPlaying) {
      var endedAt = (new Date().getTime() - req.session.nowPlaying.startedAt)/1000;
      Track.findOne(req.session.nowPlaying.track).exec(function(err, track) {
        if (!track) sails.log.error('TrackController.js:playEnded', 'Track.findOne', args, 'Not Found!');
        if (err) sails.log.error('TrackController.js:playEnded', 'Track.findOne', args, err);
        
        //console.log('ended',endedAt, track.duration);
        if (track && (endedAt >= track.duration)) {
          var args = { numPlays: track.numPlays + 1 };
          Track.update(track.id, args).exec(function(err, track) {
            if (err) sails.log.error('TrackController.js:playEnded', 'Track.update ', args, err); 
          });
          TrackPlays.create(req.session.nowPlaying).exec(function(err, track) {
            if (err) sails.log.error('TrackController.js:playEnded', 'TrackPlays.create', req.session.nowPlaying, err); 
          });
        }

      });
    }
    res.send(200);
  },

  widget: function (req, res) {
    var id = parseInt(req.param('id'));
    
    Track.get(id, req.user, function (track) {
      if (!track || _.isEmpty(track)) return res.send(404);
      track.duration = convertTime(track.duration);
      res.view({track:track,layout:null});
    });
  },

  view: function (req, res) {
    var id = parseInt(req.param('id'));

    Track.get(id, req.user, function (track) {
      if (!track || _.isEmpty(track)) return res.send(404);
      track.duration = convertTime(track.duration);
      res.view({track:track});
    });    
  },

  test: function (req, res) {
    /*var data = {
      name: req.param('name')
    };
    Track.getCoverGoogle(data, function (result) {
      console.log(typeof result, result);
      res.json(result);
    });
    FsService.rmdir(
      'users/r.toshpulatov-112325438968186529399/tracks/delfin-vojna'
    );*/
    /*Track.find().populate('genreId').exec(function(err, tracks) {
      if (err) sails.log.error('TrackController.js:test', 'Track.find', err);
      _.forEach(tracks, function (track) {
        MetadataService.modify(track);
        //return false;
      });
    })*/
    
    res.send(200);
  }
};