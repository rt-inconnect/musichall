/**
 * PlaylistController
 *
 * @description :: Server-side logic for managing tracks
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var path = require('path');
var guid = require('guid');
var fs = require('fs');
var getSlug = require('speakingurl');

module.exports = {

  find: function (req, res) {
    var id = parseInt(req.param('id'));

    Playlist.get(id, req.user, function (result) {
      res.json(result);
    });
  },

  findAll: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    criteria.createdBy = req.user ? req.user.id : '';

    var getAll = function () {
      Playlist.getAll(criteria, req.user, function (results) {
        res.json(results);
      });
    };

    if (req.param('user')) {
      User.findOne({login: req.param('user')}).exec(function (err, user) {
        if (err) sails.log.error('PlaylistController.js:findAll', 'User.findOne', {login: req.param('user')}, err);
        criteria.createdBy = user.id;
        getAll();
      });
    } else {
      getAll();
    }
  },

  findUserSets: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var track = parseInt(req.param('id'));
    criteria.createdBy = req.user ? req.user.id : 0;
    Playlist.find(criteria).populate('createdBy').exec(function (err, playlists) {
      if (err) sails.log.error('PlaylistController.js:findUserSets', 'Playlist.find', criteria, err);
      var ids = _.map(playlists, 'id');
      if (!_.isEmpty(ids)) {
        var params = {playlist: ids, track: track};
        PlaylistTrack.find(params).exec(function (err, tracks) {
          if (err) sails.log.error('PlaylistController.js:findUserSets', 'PlaylistTrack.find', params, err);
          var inLists = _.map(tracks, 'playlist');
          _.forEach(playlists, function (playlist) {
            playlist.isAdded = inLists.indexOf(playlist.id) >= 0 ? true : false;
          });
          res.json(playlists);
        });
      } else {
        res.json([]);
      }
    });
  },

  like: function (req, res) {
    var params = {
      user: req.user,
      playlist: parseInt(req.param('id'))
    };
    if((!params.user) || (!params.playlist)) return res.send(404);
    Playlist.like(params, function (playlist) {
      res.json(playlist);
    });
  },  

  create: function (req, res) {
    if(!req.param('name')) {
      res.send(404);
      return false;
    }
    var slug = getSlug(req.param('name'));
    if(!slug) slug = guid.raw();
    var dirname = 'users/'+req.user.directory+'/playlists/' + slug;
    var params = {
      name: req.param('name'),
      createdBy: req.user.id,
      directory: dirname,
      slug: req.user.login + '-' +req.param('name')
    };
    var trackId = req.param('track');
    var tracks = req.param('tracks');

    if (typeof tracks == 'string') {
      tracks = tracks.split(',');
    }
    Playlist.createWithTrack(params, trackId || tracks, function (playlist) {
      fs.mkdir(dirname, function () {
        if (req.file('file')._files.length) {
          var ext = path.extname(req.file('file')._files[0].stream.filename);
          var original = dirname + '/original' + ext;
          var resized = dirname + '/resized' + ext;
          req.file('file').upload({
            dirname: '../../' + dirname,
            saveAs: 'original' + ext,
            maxBytes: 100000000
          }, function (err, files) {
            if (err)
              return res.serverError(err);

            ImageService.resizeGm(original, resized, function () {
              Playlist.update({id:playlist.id}, {coverUrl:resized}).exec(function (err) {
                if (err) sails.log.error('PlaylistController.js:create', 'Playlist.update', {id:playlist.id}, err);
                Playlist.get(playlist.id, req.user, function (result) { res.json(result); });
              });
            });
          });
        } else {
          Playlist.get(playlist.id, req.user, function (playlist) { res.json(playlist); });
        }
      });
    });
  },

  update: function (req, res) {
    var id = parseInt(req.param('id'));
    var tracks = req.param('tracks');

    Playlist.findOne(id).exec(function (err, playlist) {
      if (err) sails.log.error('PlaylistController.js:update', 'Playlist.findOne', id, err);
      if (!playlist) return res.send(404);
      if (!IfService.canEdit(req.user, playlist.createdBy)) return res.send(404);

      Playlist.update({id:id}, {name:req.param('name')}).then(function (playlist) {
        if (err) sails.log.error('PlaylistController.js:update', 'Playlist.update id ' + id, {name:req.param('name')}, err);
        PlaylistTrack.destroy({playlist:id}).exec(function (err) {
          if (err) sails.log.error('PlaylistController.js:update', 'PlaylistTrack.destroy', {playlist:id}, err);
          var params = [];
          if (!_.isEmpty(tracks)) {
            _.forEach(tracks, function (track, sort) {
              params.push({playlist:id,track:track,sort:sort});
            });
          }
          PlaylistTrack.create(params).exec(function (err) {
            if (err) sails.log.error('PlaylistController.js:update', 'PlaylistTrack.create', params, err);
            Playlist.get(id, req.user, function (playlist) {
              res.json(playlist);
            });
          });
        });
      });
    });
  },

  destroy: function (req, res) {
    var id = parseInt(req.param('id'));
    Playlist.findOne(id).exec(function (err, playlist) {
      if (err) sails.log.error('PlaylistController.js:destroy', 'Playlist.findOne', id, err);
      FsService.rmdir(playlist.directory);
    });
    Playlist.destroy(id, function (err) {
      if (err) sails.log.error('PlaylistController.js:destroy', 'Playlist.destroy', id, err);
      res.send(200);
    });
  },

  track: function (req, res) {
    var params = {
      playlist: parseInt(req.param('playlist')),
      track: parseInt(req.param('track'))
    };
    if((!params.playlist) || (!params.track)) res.send(404);
    Playlist.toggleTrack(params, req.user, function (playlist) {
      res.json(playlist);
    });
  },

  cover: function (req, res) {
    var id = parseInt(req.param('id'));
    if(!id) res.send(404);

    Playlist.findOne(id).exec(function (err, playlist) {
      if (err) sails.log.error('PlaylistController.js:cover', 'Playlist.findOne', id, err);
      var ext = path.extname(req.file('file')._files[0].stream.filename);
      var original = playlist.directory + '/original' + ext;
      var resized = playlist.directory + '/resized' + ext;
      req.file('file').upload({
        dirname: '../../' + playlist.directory,
        saveAs: 'original' + ext,
        maxBytes: 100000000
      }, function (err, files) {

        if (err)
          return res.serverError(err);

        ImageService.resizeGm(original, resized, function () {
          var params = {coverUrl:resized + '?' + Math.random()};
          Playlist.update({id:id}, params).then(function (playlist) {
            if (err) sails.log.error('PlaylistController.js:cover', 'Playlist.update id ' + id, params, err);
            res.send(playlist[0].coverUrl);
          });
        });
      });
    });
  }
};