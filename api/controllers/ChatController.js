/**
 * MessageController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
module.exports = {
  get: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    Chat.find(criteria).populate('createdBy').exec(function (err, messages) {
      
      if (err) sails.log.error('ChatController.js:get', 'Chat.find', criteria, err);
      _.forEach(messages, function (message) {
        message.createdBy = User.clearPrivateData(message.createdBy);
      });

      res.json(messages);
    });
    
  },

  send: function (req, res) {
    if (req.session.passport && req.session.passport.user && req.isSocket) {

      var data = {
        text: req.param('text'),
        createdBy: req.session.passport.user
      };

      Chat.create(data).exec(function (err, message) {
        if (err) sails.log.error('ChatController.js:send', 'Chat.create', data, err);
        Chat.findOne(message.id)
          .populate('createdBy')
          .exec(function (err, message) {
            if (err) sails.log.error('ChatController.js:send', 'Chat.findOne', err);
            message.createdBy = User.clearPrivateData(message.createdBy);
            sails.sockets.broadcast('onliners', 'chat', message);
            res.json(message);
          });
      });

    } else {
      res.send(404);
    }
  },

  onliners: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);
    criteria.isOnline = 1;

    User.find(criteria).exec(function (err, users) {
      if (err) sails.log.error('ChatController.js:onliners', 'User.find', params, err);
      users = _.indexBy(users, 'login');
      res.json(users);
    });

  }
};