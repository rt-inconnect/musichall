/**
 * FileController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var getSlug = require('speakingurl');
var archiver = require('archiver');

module.exports = {
  get: function (req, res) {
    res.sendfile(req.path.substr(1));
  },
  ogg: function (req, res) {
    /*if(!req.session.nowPlaying || req.session.nowPlaying !== req.path.substr(1)) {
      req.session.nowPlaying = req.path.substr(1);
      var args = { fileOgg: req.path.substr(1) };
      Track.findOne(args).exec(function(err, track) {
        if (!track) sails.log.error('FileController.js:ogg', 'Track.findOne', args, 'Not Found!');
        if (err) sails.log.error('FileController.js:ogg', 'Track.findOne', args, err);
        if (track) {
          args = { numPlays: track.numPlays + 1 };
          Track.update(track.id, args).exec(function(err, track) {
            if (err) sails.log.error('FileController.js:ogg', 'Track.update ', args, err); 
          });
          var params = { track: track.id };
          if (req.user) {
            args = { nowPlaying: track.id };
            User.update(req.user.id, args).exec(function(err, user) {
              if (err) sails.log.error('FileController.js:ogg', 'User.update', req.user.id, args, err);
            });
            params.user = req.user.id;
          }
          TrackPlays.create(params).exec(function(err, track) {
            if (err) sails.log.error('FileController.js:ogg', 'TrackPlays.create', params, err); 
          });
        }
      });
    }*/
    res.sendfile(req.path.substr(1));
  },
  mp3: function (req, res) {
    if (!req.user) return res.send(404);
    var id = parseInt(req.param('id'));
    if (!id) return res.send(404);
    Track.findOne(id).exec(function (err, track) {
      if (!track) { 
        sails.log.error('FileController.js:mp3', 'Track.findOne', id, 'Not Found!');
        return res.send(404);
      }
      res.set('Content-disposition', 'attachment; filename='+getSlug(track.name)+'.mp3');
      res.sendfile(track.fileMp3);
    });
  },
  playlist: function (req, res) {
    if (!req.user) return res.send(404);
    var id = parseInt(req.param('id'));
    if (!id) return res.send(404);

    PlaylistTrack.find({playlist: id, sort: 'sort'})
    .populate('playlist')
    .populate('track')
    .exec(function (err, ptracks) {
      if (err) sails.log.error('FileController.js:playlist', 'PlaylistTrack.find', id);
      if (!_.isEmpty(ptracks)) {
        res.attachment(getSlug(ptracks[0].playlist.name)+'.zip');
        var zip = archiver('zip');
        _.forEach(ptracks, function (ptrack, sort) {
          sort += 1;
          if (sort < 10) sort = '0' + sort;
          zip.file(ptrack.track.fileMp3, { name: sort + '_' + ptrack.track.name + '.mp3' });
        });
        zip.finalize();
        zip.pipe(res);
      } else {
        res.send(404);
      }
    });
  },  
  _config: {
    rest: false,
    shortcuts: false
  }
};