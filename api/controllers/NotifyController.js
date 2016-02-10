/**
 * NotifyController
 *
 * @description :: Server-side logic for managing genres
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  findAll: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    if (!req.user) {
      res.json({'items': [], count: 0});
      return false;
    }

    criteria.target = req.user.id;

    Notify.find(criteria)
      .populateAll()
      .exec(function (err, notifies) {
        if (err) sails.log.error('NotifyController.js:findAll', 'Notify.find', criteria, err);
        _.forEach(notifies, function (notify) {
          notify.initiator = User.clearPrivateData(notify.initiator);
          notify.target = User.clearPrivateData(notify.target);
        });
        res.json({'items': notifies, 'count': notifies.length});
      });
  },

  findUnreaded: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    if (!req.user) {
      res.json({'items': [], count: 0});
      return false;
    }

    criteria.target = req.user.id;
    criteria.status = 0;

    Notify.find(criteria)
      .populateAll()
      .exec(function (err, notifies) {
        if (err) sails.log.error('NotifyController.js:findUnreaded', 'Notify.find', criteria, err);
        _.forEach(notifies, function (notify) {
          notify.initiator = User.clearPrivateData(notify.initiator);
          notify.target = User.clearPrivateData(notify.target);
        });
        res.json({'items': notifies, 'count': notifies.length});
      });
  },

  mark: function (req, res) {
    Notify.update({target:req.user.id}, {status:1}).exec(function (err) {
      if (err) sails.log.error('NotifyController.js:mark', 'Notify.update to status 1', {target:req.user.id}, err);
      res.send(200);
    });
  }

};