/**
 * TagController
 *
 * @description :: Server-side logic for managing genres
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  findAll: function (req, res) {
    var sql = 'SELECT distinct name FROM tag';
    Tag.query(sql, function (err, tags) {
      if (err) sails.log.error('TagController.js:findAll', 'Tag.query', sql, err);
      res.json(tags);
    });
  },

  search: function (req, res) {
    var q = req.param('q');

    if(!q) { res.json([]); return false; }
    var sql = "SELECT distinct name FROM tag"+
      " WHERE upper(name) like upper('"+q+"%')"+
      " OR upper(name) like upper('"+TranslitService.transliterate(q)+"') LIMIT 10";
    Tag.query(sql, function (err, tags) {
        //if (err) sails.log.error('TagController.js:search', 'Tag.query', sql, err);
        res.json(tags);
      }
    );

  },
};