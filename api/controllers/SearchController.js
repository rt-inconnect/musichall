/**
 * SearchController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  all: function(req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    var q = req.param('q');

    User.search(criteria, q, function (users) {
      Track.search(criteria, q, function (tracks) {
        res.json(_.merge(tracks, users));
      });
    });
  },
  user: function(req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var q = req.param('q');
    criteria.or = [
      {login: {'contains':q}},
      {fullname: {'contains':q}},
      {login: {'contains':TranslitService.transliterate(q)}},
      {fullname: {'contains':TranslitService.transliterate(q)}}
    ];
    User.getAll(criteria, req.user, function (users) {
      res.json(users);
    });
  },
  track: function(req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var q = req.param('q');
    criteria.or = [
      {name: {'contains':q}},
      {name: {'contains':TranslitService.transliterate(q)}},
    ];
    Track.getAll(criteria, req.user, function (tracks) {
      res.json(tracks);
    });
  },
  playlist: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var q = req.param('q');
    criteria.or = [
      {name: {'contains':q}},
      {name: {'contains':TranslitService.transliterate(q)}},
    ];
    Playlist.getAll(criteria, req.user, function (playlists) {
      res.json(playlists);
    });    
  }
};