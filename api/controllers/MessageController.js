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
    var params = {login: req.param('id')};
    User.findOne(params).exec(function (err, user) {
      if (err) sails.log.error('MessageController.js:get', 'User.findOne', params, err);
      if (user) {
        criteria.or = [
          { to: req.user.id, from: user.id },
          { to: user.id, from: req.user.id }
        ];
        params = { to:req.user.id, from:user.id };
        Message.update(params, {status:1}).exec(function(err) {
          if (err) sails.log.error('MessageController.js:get', 'Message.update to status 1', params, err);
          Message.find(criteria)
            .populate('to')
            .populate('from')
            .exec(function (err, messages) {
              if (err) sails.log.error('MessageController.js:get', 'Message.find', criteria, err);
              //var results = messages.reverse();
              _.forEach(messages, function (message) {
                message.from = User.clearPrivateData(message.from);
                message.to = User.clearPrivateData(message.to);
              });
              params = { to:req.user.id, status:0 };
              Message.count(params).exec(function (err, total) {
                if (err) sails.log.error('MessageController.js:get', 'Message.count', params, err);
                user = User.clearPrivateData(user);
                if(!_.isEmpty(messages)) {
                  user.lastActivity = messages[0].createdAt.getTime();
                } else {
                  user.lastActivity = 0;
                }
                res.json({items:messages, total:total, user:user});
              });
              
            });

        });
      } else {
        res.send(404);
      }

    });
    
  },

  send: function (req, res) {
    if(req.session.passport && req.session.passport.user && req.isSocket) {
      var params = { where: {login: req.param('to')} };
      User.findOne(params).exec(function (err, toUser) {
        if (err) sails.log.error('MessageController.js:send', 'User.findOne', params, err);
        var data = {
          text: req.param('text'),
          to: toUser.id,
          from: req.session.passport.user
        };
        Message.create(data).exec(function (err, message) {
          if (err) sails.log.error('MessageController.js:send', 'Message.create', data, err);
          Message.findOne(message.id)
            .populate('to')
            .populate('from')
            .exec(function (err, message) {
              if (err) sails.log.error('MessageController.js:send', 'Message.findOne', err);
              message.from = User.clearPrivateData(message.from);
              message.to = User.clearPrivateData(message.to);
              sails.sockets.broadcast("user#" + toUser.id, 'message', message);
              res.json(message);
            });
        });
      });
    }
  },

  total: function (req, res) {
    var params = {to:req.user.id, status:0};
    Message.count(params).exec(function (err, total) {
      if (err) sails.log.error('MessageController.js:total', 'Message.count', params, err);
      res.json({ total: total});
    });
  },

  chatters: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    var params = {from: req.user.id};
    Message.find(params).exec(function (err, messages) {
      if (err) sails.log.error('MessageController.js:chatters', 'Message.find', params, err);
      var toIds = _.map(messages,'to');
      params = {to: req.user.id};
      Message.find(params).exec(function (err, messages) {
      if (err) sails.log.error('MessageController.js:chatters', 'Message.find', params, err);
        var fromIds = _.map(messages,'from');
        params = { id: _.union(toIds, fromIds) };
        User.find(params)
          .populate('sendedMessages', { to:req.user.id })
          .populate('receivedMessages', { from:req.user.id })
          .exec(function (err, users) {
            if (err) sails.log.error('MessageController.js:chatters', 'User.find', params, err);
            if (!_.isEmpty(users)) {
              _.forEach(users, function (user) {
                user.total = _.filter(user.sendedMessages, {'status': 0}).length;
                var allMessages = _.merge(user.sendedMessages, user.receivedMessages);
                user.lastActivity = _.max(allMessages, 'createdAt').createdAt.getTime();
                user.sendedMessages = [];
                user.receivedMessages = [];
                user = User.clearPrivateData(user);
              });
            }
            users = _.indexBy(users, 'login');
            res.json(users);
          });
      });
    });
  },

  search: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    var q = req.param('q');
    criteria.id = {'!' : req.user.id};
    User.search(criteria, q, function (users) {
      res.json(users);
    });
  },

  searchOld: function (req, res) {
    var allParams = req.allParams();
    var criteria = ParserService.parseGetParams(allParams);

    var q = req.param('q');

    Message.find({from: req.user.id}).then(function (messages) {
      var toIds = _.map(messages,'to');
      Message.find({to: req.user.id}).then(function (messages) {
        var fromIds = _.map(messages,'from');
        criteria.id = {'!' : _.union(toIds, fromIds, [req.user.id])};

        User.search(criteria, q, function (users) {
          res.json(users);
        });
      });
    });
  }
};