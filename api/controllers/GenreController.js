/**
 * GenreController
 *
 * @description :: Server-side logic for managing genres
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  findAll: function (req, res) {
    var params = 'SELECT distinct genreId FROM track';
    Track.query(params, function (err, genres) {
      if (err) sails.log.error('GenreController.js:findAll', 'Track.query', params, err);
      genreIds = _.map(genres,'genreId');
      params = { id: genreIds, sort: 'name ASC' };
      Genre.find(params).exec(function (err, genres) {
        if (err) sails.log.error('GenreController.js:findAll', 'Genre.find', params, err);
        res.json(genres);
      });
    });
  },

  find: function (req, res) {
    Genre.findOne(req.param('id')).exec(function (err, genre) {
      if (err) sails.log.error('GenreController.js:find', 'Genre.findOne', req.param('id'), err);
      res.json(genre);
    });
  },

  search: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    var q = req.param('q');
    criteria.or = [
      {name: {'contains':q}},
      {name: {'contains':TranslitService.transliterate(q)}},
    ];
    criteria.limit = 15;
    Genre.find(criteria).exec(function (err, genres) {
      if (err) sails.log.error('GenreController.js:search', 'Genre.find', criteria, err);
      res.json(genres);
    });

  }
};