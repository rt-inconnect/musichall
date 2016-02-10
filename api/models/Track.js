/**
 * Track.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */
var id3js = require('id3js');
var mm = require('musicmetadata');
var path = require('path');
var fs = require('fs');
var request = require('request');
var api_key = sails.config.params.lastFM.key;
var lastFmNoImage = sails.config.params.lastFM.noImage;

module.exports = {

  attributes: {
    id: {
      type: 'integer',
      primaryKey: true,
      autoIncrement: true
    },
    genreId: {
      model: 'genre'
    },
    createdBy: {
      model: 'user',
      dominant: true
    },
    name: {
      type: 'string'
    },
    coverUrl: {
      type: 'string'
    },
    userLikes: {
      collection: 'like',
      via: 'track'
    },
    playlists: {
      collection: 'playlisttrack',
      via: 'track'
    },
    comments: {
      collection: 'comment',
      via: 'trackId'
    },
    fileMp3: {
      type: 'string'
    },
    fileOgg: {
      type: 'string'
    },
    filePng: {
      type: 'string'
    },
    waveData: {
      type: 'json'
    },
    duration: {
      type: 'integer'
    },
    numPlays: {
      type: 'integer',
      defaultsTo: 0
    },
    numLikes: {
      type: 'integer',
      defaultsTo: 0
    },
    numComments: {
      type: 'integer',
      defaultsTo: 0
    },
    mbid: {
      type: 'string'
    },
    artist: {
      type: 'string'
    },
    album: {
      type: 'string'
    },
    tags: {
      collection: 'tag',
      via: 'trackId'
    },
    directory: {
      type: 'string'
    },
    slug: {
      type: 'string'
    }
  },

  like: function (params, cb) {
    var criteria = { user:params.user.id, track:params.track };
    Like.findOne(criteria).exec(function (err, like) {
      if (err) sails.log.error('Track.js:like', 'Like.findOne', criteria, err);
      var toggleLike = function (like, params, callback) {
        if(!like) {
          Like.create(criteria).exec(function (err, res) {
            if (err) sails.log.error('Track.js:like', 'Like.create', criteria, err);
            Track.findOne(params.track).exec(function (err, track) {
              if (err) sails.log.error('Track.js:like', 'Track.findOne', params.track, err);
              Track.update({id:track.id}, {numLikes: track.numLikes + 1}).exec(function (err) { if (err) sails.log.error('Track.js:like', 'Track.update numLikes +', track.id, err); });
              if (params.user.id != track.createdBy) User.updateLikes(track.createdBy, true);
              var notifyParams = { action:'like', initiator: params.user.id, target: track.createdBy, track: track.id };
              Notify.insert(notifyParams, function (notify) { callback(true); });
            });
          });
        } else {
          Like.destroy(criteria).exec(function (err, res) {
            if (err) sails.log.error('Track.js:like', 'Like.destroy', criteria, err);
            Track.findOne(params.track).exec(function (err, track) {
              if (err) sails.log.error('Track.js:like', 'Track.findOne', params.track, err);
              Track.update({id:track.id}, {numLikes: track.numLikes - 1}).exec(function (err) { if (err) sails.log.error('Track.js:like', 'Track.update numLikes -', track.id, err); });
              if (params.user.id != track.createdBy) User.updateLikes(track.createdBy, false);
              callback(false);
            });
          });
        }
      };

      toggleLike(like, params, function (isLiked) {
        Track.findOne(params.track).exec(function (err, track) {
          if (err) sails.log.error('Track.js:like', 'Track.findOne', params.track, err);
          Like.count({track:params.track}).exec(function (err, numLikes) {
            if (err) sails.log.error('Track.js:like', 'Like.count', params.track, err);
            track.numLikes = numLikes;
            track.isLiked = isLiked;
            cb(track);
          });
        });
      });
    });
  },

  get: function (id, user, cb) {
    if (id) {
      this.findOne(id)
        .populate('genreId')
        .populate('createdBy')
        .populate('tags')
        .exec(function (err, track) {
          if (err) sails.log.error('Track.js:get', 'this.findOne', id, err);
          if(!track) { cb({}); return false;}

          var params = {track: track.id, user: user ? user.id : 0 };
          Like.findOne(params).exec(function (err, like) {
            if (err) sails.log.error('Track.js:get', 'Like.findOne', params, err);
            track.isLiked = !!like;
            track.progress = 0;
            track.createdBy = User.clearPrivateData(track.createdBy);

            if (IfService.canEdit(user, track.createdBy.id)) {
              track.covers = _.map(fs.readdirSync(track.directory + '/images/resized/'), function(cover) {
                return track.directory + '/images/resized/' + cover;
              });
            }
            cb(track);

          });
        });
    } else {
      cb({});
    }
  },

  getAll: function (criteria, user, cb, opts) {
    var defaultTracks = function () {
      Track.find(criteria)
        .populate('genreId')
        .populate('createdBy')
        .populate('tags')
        .exec(function (err, results) {
          if (err) sails.log.error('Track.js:getAll', 'Track.find', criteria, err);
          Track.prepareAll(results, user, function (results) {
            cb(results, opts);
          });
        });
    };

    if (criteria.tag) {
      Tag.find({name:criteria.tag}).exec(function (err, tags) {
        if (err) sails.log.error('Track.js:getAll', 'Tag.find', criteria.tag, err);
        delete criteria.tag;
        criteria.id = _.map(tags, 'trackId');
        defaultTracks();
      });
    } else {
      defaultTracks();
    }
  },

  prepareAll: function (results, user, cb) {
    if (!_.isEmpty(results)) {
      var ids = _.map(results, 'id');
      var params = {track: ids, user: user ? user.id : 0};
      Like.find(params).exec(function (err, likes) {
        if (err) sails.log.error('Track.js:prepareAll', 'Like.find', params, err);
        var lIds = _.map(likes, 'track');
        _.forEach(results, function (track) {
          track.isLiked = lIds.indexOf(track.id) >= 0 ? true : false;
          track.progress = 0;

          track.covers = [];
          if (IfService.canEdit(user, track.createdBy.id)) {
            if (fs.existsSync(track.directory + '/images/resized/')) {
              track.covers = _.map(fs.readdirSync(track.directory + '/images/resized/'), function(cover) {
                return track.directory + '/images/resized/' + cover;
              });
            }
          }
          if (track.createdBy) track.createdBy = User.clearPrivateData(track.createdBy);
        });
        cb(results);
      });
    } else {
      cb([]);
    }
  },

  parseByFilter: function (filter, criteria, user, cb) {
    var parseByTags = function (callback) {
      if(!filter.tags || _.isEmpty(filter.tags)) callback([]);
      Tag.find({name:filter.tags}).exec(function (err, tags) {
        if (err) sails.log.error('Track.js:parseByFilter byTags', 'Tag.find', filter.tags, err);
        if(_.isEmpty(tags)) callback([]);
        tags = _.map(tags, 'trackId');
        callback(tags);
      });
    };
    var parseListened = function (callback) {
      if(user) {
        TrackPlays.find({user: user.id}).exec(function (err, plays) {
          if (err) sails.log.error('Track.js:parseByFilter parseListened', 'TrackPlays.find', user.id, err);
          if(_.isEmpty(plays)) callback([]);
          plays = _.map(plays, 'track');
          callback(plays);
        });
      } else {
        callback([]);
      }
    };

    if(filter.genres && !_.isEmpty(filter.genres)) criteria.genreId = filter.genres;
    if(filter.name) criteria.name = { 'contains': filter.name };

    if((filter.tags && !_.isEmpty(filter.tags)) && filter.listened === 'true') {
      parseByTags(function (tags) {
        parseListened(function (plays) {
          criteria.id = _.difference(tags, plays);
          cb(criteria);
        });
      });
    } else if (filter.tags && !_.isEmpty(filter.tags)) {
      parseByTags(function (tags) {
        criteria.id = tags;
        cb(criteria);
      });
    } else if (filter.listened && filter.listened === 'true') {
      parseListened(function (plays) {
        criteria.id = {'!':plays};
        cb(criteria);
      });
    } else {
      cb(criteria);
    }
  },

  isLiked: function (track, user) {
    if (user) {
      var like = track.userLikes.map(function (o) {
        return o.user;
      }).indexOf(user.id);
      if (like >= 0) {
        return true;
      }
    }
    return false;
  },

  search: function (criteria, q, cb) {
    var results = [];
    criteria.or = [
      {name: {'contains':q}},
      {name: {'contains':TranslitService.transliterate(q)}},
    ];
    Track.find(criteria).exec(function (err, tracks) {
      if (err) sails.log.error('Track.js:search', 'Track.find', criteria, err);
      _.forEach(tracks, function (track) {
        var result = {
          type: 'track',
          id: track.id,
          name: track.name,
          cover: track.coverUrl
        };
        results.push(result);
      });
      cb(results);
    });
  },

  getFileInfo: function (mp3Path, cb) {
    TrackService.identify(mp3Path, function (err, res) {
      if (err) sails.log.error('Track.js:getFileInfo', 'TrackService.identify', mp3Path, err);
      cb(res);
    });
  },

  getID3Cover: function (mp3Path, coverUrl, cb) {
    //console.log('by ID3');
    id3js({file: mp3Path, type: id3js.OPEN_LOCAL}, function (err, result) {
      if (err) sails.log.error('Track.js:getID3Cover', 'id3js', mp3Path, err);
      if(result.v2 && result.v2.image && result.v2.image.data) {
        var toBuffer = function (ab) {
          var buffer = new Buffer(ab.byteLength);
          var view = new Uint8Array(ab);
          for (var i = 0; i < buffer.length; ++i) {
              buffer[i] = view[i];
          }
          return buffer;
        };
        var body = toBuffer(result.v2.image.data);
        var mime = result.v2.image.mime;
        var ext = mime.slice(mime.lastIndexOf('/') + 1);
        fs.writeFile(coverUrl + ext, body, function(err){
            if (err) sails.log.error('Track.js:getID3Cover', 'fs.writeFile', coverUrl + ext, err);
            cb(coverUrl + ext);
        });
      } else {
        cb(false);
      }
    });
  },

  checkByName: function (name, cb) {
    Track.findOne({name: name}).exec(function (err, track) {
      if (err) sails.log.error('Track.js:checkByName', 'Track.findOne', name, err);
      cb(track);
    });
  },

  createCoverDirectory: function (path, cb) {
    if (fs.existsSync(path)) {
      Track.findOne({directory:path}).exec(function (err, track) {
        if (err) sails.log.error('Track.js:createCoverDirectory', 'Track.findOne', {directory:path}, err);
        cb(track);
      });
      return false;
    }
    fs.mkdir(path, function () {
      fs.mkdir(path+'/images', function (err) {
        if (err) sails.log.error('Track.js:createCoverDirectory', 'fs.mkdir', path+'/images', err);
        fs.mkdir(path+'/images/original', function (err) {
          if (err) sails.log.error('Track.js:createCoverDirectory', 'fs.mkdir', path+'/images/original', err);
        });
        fs.mkdir(path+'/images/resized', function (err) {
          if (err) sails.log.error('Track.js:createCoverDirectory', 'fs.mkdir', path+'/images/resized', err);
        });
        cb(false);
      });
    });
  },

  getMMCover: function (data, mp3Path, cb) {
    //console.log('by MusicMetadata');
    var parser = mm(fs.createReadStream(mp3Path));

    parser.on('metadata', function (result) {
      if(result.picture[0] && result.picture[0].data) {
        var original = data.directory + '/images/original/metadata.' + result.picture[0].format;
        var resized = data.directory + '/images/resized/metadata.' + result.picture[0].format;
        fs.writeFile(original, result.picture[0].data, function(err) {
          if (err) sails.log.error('Track.js:getMMCover', 'fs.writeFile', original, err);
          ImageService.resizeGm(original, resized, function () {
            data.coverUrl = resized;
            cb(data);
          });
        });
      } else {
        cb(data);
      }
    });
  },
  toOgg: function (mp3Path, oggPath, user, cb) {
    var jobOggArgs = ['-S', mp3Path, oggPath];
    var jobToOgg = TrackService.transcode(mp3Path, oggPath, jobOggArgs);
    jobToOgg.on('error', function(err) {
      if (err) sails.log.error('Track.js:toOgg', jobOggArgs, err);
    });
    /*jobToOgg.on('progress', function(amountDone, amountTotal) {
      var percent = amountDone / amountTotal * 100;
      percent = Math.round(percent);
      if(percent % 10 === 0) {
        sails.sockets.broadcast('user#' + user, 'convertToOggProgress',
          {progress: percent}
        );
      }
    });*/
    jobToOgg.on('end', function() {
      cb(path.basename(oggPath));
    });
    jobToOgg.start();
  },

  toWav: function (mp3Path, wavPath, user, txtPath, cb) {
    var jobWavArgs = ['-S', mp3Path, '-r', 1, '-c', 1, wavPath, 'downsample', 1000];
    var jobToWav = TrackService.transcode(mp3Path, wavPath, jobWavArgs);
    jobToWav.on('error', function(err) {
      if (err) sails.log.error('Track.js:toWav', jobWavArgs, err);
    });
    jobToWav.on('end', function() {
      return Track.toTxt(wavPath, txtPath, user, cb);
    });
    jobToWav.start();
  },

  toTxt: function (wavPath, txtPath, user, cb) {
    var wavTmpPath = '.tmp/uploads/' + path.basename(wavPath);
    var jobTxtArgs = ['-S', wavPath, '-t', 'dat', txtPath];
    var jobToTxt = TrackService.transcode(wavPath, txtPath, jobTxtArgs);
    jobToTxt.on('error', function(err) {
      if (err) sails.log.error('Track.js:toTxt', jobTxtArgs, err);
    });
    jobToTxt.on('end', function() {
      fs.unlinkSync(wavTmpPath);
      return Track.toArr(txtPath, cb);
    });
    jobToTxt.start();
  },

  toArr: function (txtPath, cb) {
    var txtTmpPath = '.tmp/uploads/' + path.basename(txtPath);

    fs.readFile(txtPath, 'utf8', function (err, data) {
      if (err) sails.log.error('Track.js:toArr', txtTmpPath, err);
      var result = [];
      var lineArr = data.trim().split("\n");
      lineArr.splice(0,2);
      var duration = lineArr.length;
      var prevPercent = 0;
      _.forEach(lineArr, function (line, i) {
        var percent = Math.round(i / lineArr.length * 100);
        if (i === 0 || percent > prevPercent) {
          line = line.replace(i, '').trim();
          toFloat = parseFloat(line) * 100;
          toFloat = Math.abs(toFloat.toFixed(2));
          result.push(toFloat);
        }
        prevPercent = percent;
      });

      fs.unlinkSync(txtTmpPath);
      cb(JSON.stringify(result));
    });
  },

  getCoverLastFMByAlbum: function (artist, album, opts, cb) {
    //console.log('by Album');
    if (!artist || !album) cb(false);
    if (typeof artist == 'undefined' || album == 'undefined') cb(false);
    opts.url = sails.config.params.lastFM.byAlbum+'&api_key='+api_key+'&format=json&album='+album+'&artist='+artist;
    request(opts, function (err, res, body) {
      if (!err && res.statusCode == 200) {
        var result = JSON.parse(body.replace(/"#text"/g, '"text"'));
        if (!result.error) {
          var img = result.album.image[result.album.image.length-1].text;
          if (img && img != lastFmNoImage) {
            opts.url = img;
            opts.encoding = 'binary';
            request.get(opts, function (err, res, body) {
              cb(body, path.extname(img), result);
            });
          } else {
            cb(false);
          }
        } else {
          cb(false);
        }
      } else {
        cb(false);
      }
    });
  },

  getCoverLastFMByTrack: function (track, artist, opts, cb) {
    //console.log('by Track');
    if (!track || !artist) cb(false);
    if (typeof artist == 'undefined' || typeof track == 'undefined') cb(false);
    opts.url = sails.config.params.lastFM.byTrack+'&api_key='+api_key+'&format=json&track='+track+'&artist='+artist;
    request(opts, function (err, res, body) {
      if (!err && res.statusCode == 200) {
        var result = JSON.parse(body.replace(/"#text"/g, '"text"'));
        if (!result.error) {
          var img = false;
          if(result.track.album)
            img = result.track.album.image[result.track.album.image.length-1].text;
          if (img && img != lastFmNoImage) {
            opts.url = img;
            opts.encoding = 'binary';
            request.get(opts, function (err, res, body) {
              cb(body, path.extname(img), result);
            });
          } else {
            cb(false);
          }
        } else {
          cb(false);
        }
      } else {
        cb(false);
      }
    });
  },

  getCoverLastFMByArtist: function (artist, opts, cb) {
    //console.log('by Artist');
    if (!artist) cb(false);
    if (typeof artist == 'undefined') cb(false);
    opts.url = sails.config.params.lastFM.byArtist+'&api_key='+api_key+'&format=json&artist='+artist;
    request(opts, function (err, res, body) {
      if (!err && res.statusCode == 200) {
        var result = JSON.parse(body.replace(/"#text"/g, '"text"'));
        if (!result.error) {
          var img = result.artist.image[result.artist.image.length-1].text;
          if (img && img != lastFmNoImage) {
            opts.url = img;
            opts.encoding = 'binary';
            request.get(opts, function (err, res, body) {
              cb(body, path.extname(img), result);
            });
          } else {
            cb(false);
          }
        } else {
          cb(false);
        }
      } else {
        cb(false);
      }
    });
  },

  getCoverLastFM: function (data, artist, album, track, callback) {
    //var opts = { proxy: 'http://192.168.7.254:8080' };
    var opts = {};

    var saveCover = function (body, ext, from, metadata) {
      if (body) {
        var original = data.directory + '/images/original/lastfm_' + from + ext;
        var resized = data.directory + '/images/resized/lastfm_' + from + ext;
        fs.writeFile(original, body, 'binary', function(err) {
          if (err) sails.log.error('Track.js:getCoverLastFM saveCover', 'fs.writeFile', original, err);
          ImageService.resizeGm(original, resized, function () {
            Track[from + 'MetadataParser'](resized, metadata, function (result) {
              if(result.track) data.mbid = result.track;
              if(result.artist) data.artist = result.artist;
              if(result.album) data.album = result.album;
              if(result.tag) data.tag = result.tag;
              data.coverUrl = resized;

              if (from === "artist") callback(data);
            });
          });
        });
      } else {
        if (from === "artist") callback(data);
      }
    };

    Track.getCoverLastFMByArtist(artist, opts, function (body, ext, metadata) {
      saveCover(body, ext, 'artist', metadata);
      Track.getCoverLastFMByTrack(track, artist, opts, function (body, ext, metadata) {
        saveCover(body, ext, 'track', metadata);
        Track.getCoverLastFMByAlbum(artist, album, opts, function (body, ext, metadata) {
          saveCover(body, ext, 'album', metadata);
        });
      });
    });
  },

  getCoverGoogle: function (data, callback) {
    //var opts = { proxy: 'http://192.168.7.254:8080' };
    var opts = {};
    var num = 0;
    var result;

    if (!data.name) return callback(data);

    var saveCover = function (body) {
      var ext = path.extname(result[num].unescapedUrl);
      var original = data.directory + '/images/original/zgoogle_' + num + '.jpg';
      var resized = data.directory + '/images/resized/zgoogle_' + num + '.jpg';
      fs.writeFile(original, body, 'binary', function(err) {
        if (err) sails.log.error('Track.js:getCoverGoogle saveCover', 'fs.writeFile', original, err);
        ImageService.resizeGm(original, resized, function () {
          num++;
        });
      });
    };

    opts.url = encodeURI(sails.config.params.google + data.name);
    request(opts, function (err, res, body) {
      if (!err && res.statusCode == 200) {
        result = JSON.parse(body).responseData.results;
        if (!_.isEmpty(result)) {
          for (var i = 0; i < result.length; i++) {
            opts.url = encodeURI(result[i].url);
            opts.encoding = 'binary';
            request.get(opts, function (err, res, body) {
              if (!err && res.statusCode == 200) {
                saveCover(body);
              }
            });
          }
        }
      }
    });
    callback(data);
  },

  artistMetadataParser: function (image, metadata, callback) {
    var result = {};
    result.track = '';
    result.album = '';
    result.artist = metadata.artist.mbid || '';

    if (metadata.artist.tags)
      result.tag = _.map(metadata.artist.tags.tag,'name');

    Artist.findOrCreate({mbid:result.artist}, {
      mbid: result.artist,
      name: metadata.artist.name,
      image: image,
      description: metadata.artist.bio ? metadata.artist.bio.summary : ''
    }).exec(function (err, album) {
      if (err) sails.log.error('Track.js:artistMetadataParser', 'findOrCreate', metadata.artist.name, err);
    });

    callback(result);
  },

  trackMetadataParser: function (image, metadata, callback) {
    var result = {};
    result.track = metadata.track.mbid || '';
    result.album = metadata.track.album.mbid || '';
    result.artist = metadata.track.artist.mbid || '';

    if (metadata.track.toptags)
      result.tag = _.map(metadata.track.toptags.tag,'name');

    this.albumCreate(result.album, {
      mbid: result.album,
      name: metadata.track.album.title,
      image: image,
      artist: result.artist
    });

    callback(result);
  },

  albumMetadataParser: function (image, metadata, callback) {
    var result = {};
    result.track = '';
    result.album = metadata.album.mbid || '';
    result.artist = metadata.album.artist || '';

    if (metadata.album.toptags)
      result.tag = _.map(metadata.album.toptags.tag,'name');

    this.albumCreate(result.album, {
      mbid: result.album,
      name: metadata.album.name,
      releasedate: metadata.album.releasedate,
      image: image,
      artist: result.artist,
      description: metadata.album.wiki ? metadata.album.wiki.summary : ''
    });

    callback(result);

  },

  albumCreate: function (mbid, data) {
    Album.findOrCreate({mbid:mbid}, data).exec(function (err, album) {
      if (err) sails.log.error('Track.js:albumCreate', 'findOrCreate', data.name, err);
    });
  },

  fillTags: function (id, tags) {
    //console.log(tags);
    _.forEach(tags, function (tag) {
      if (tag) Tag.create({trackId:id, name:tag}).exec(function (err, res) {
        if (err) sails.log.error('Track.js:fillTags', 'Tag.create', tag, err);
      });
    });
  },

  fillID3Genres: function () {
    var genreList = 'genres.txt';

    fs.readFile(genreList, 'utf8', function (err, data) {
      var result = [];
      if (err) throw err;
      var lineArr = data.trim().split("\n");
      _.forEach(lineArr, function (line, i) {
        Genre.create({name:line}).exec(function (err, genre) {
          if (err) sails.log.error('Track.js:fillID3Genres', 'Genre.create', line, err);
          console.log(genre.id, genre.name);
        });
      });
    });
  },

  setGenre: function (genre, cb) {
    if (genre) {
      var isNumber = parseInt(genre) == genre;
      if (isNumber) {
        Genre.findOne(parseInt(genre) + 1).exec(function (err,rec) {
          if (err) sails.log.error('Track.js:setGenre', 'Genre.findOne', genre, err);
          cb(rec);
        });
      } else {
        Genre.findOne({name:genre}).exec(function (err, rec) {
          if (err) sails.log.error('Track.js:setGenre', 'Genre.findOne', genre, err);
          cb(rec);
        });
      }
    }
  },

  getLiked: function (login, user, criteria, cb) {
    User.findOne({login: login}).exec(function (err, luser) {
      if (err) sails.log.error('Track.js:getLiked', 'User.findOne', login, err);
      var sql = " select track id, 'trackliked' xtype, createdAt from `like` where user in("+luser.id+")"+
                " union all"+
                " select playlist, 'playlistliked' xtype, createdAt from playlistlike where user in("+luser.id+")"+
                " order by createdAt DESC"+
                " LIMIT "+criteria.skip+", "+criteria.limit;
      Track.query(sql, function (err, stream) {
        if (err) sails.log.error('Track.js:getLiked', 'Track.query', sql, err);
        var params = {
          trackliked: [],
          playlistliked: []
        };
        _.forEach(stream, function (o) { params[o.xtype].push(o.id); });
        stream = _.groupBy(stream, 'xtype');
        Track.getAll({ id: _.isEmpty(params.trackliked) ? 0 : params.trackliked }, user, function (tracklikes) {
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
            pushXtype(tracklikes, 'trackliked');
            pushXtype(playlistlikes, 'playlistliked');

            _.forEach(results, function (result) {
              var node = stream[result.xtype];
              var index = _.map(node, 'id').indexOf(result.id);
              result.initDate = node[index].createdAt;
            });
            cb(_.sortBy(results, 'initDate').reverse());
          });
        });
      });

    });
  }
};