/**
 * Notify.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {

	attributes: {
		id: {
			type: 'integer',
			primaryKey: true,
			autoIncrement: true
		},
		action: {
			type: 'string',
			enum: ['follow', 'like', 'playlist', 'playlistlike', 'trackcomment']
		},
		initiator: {
			model: 'user'
		},
		target: {
			model: 'user'
		},
		track: {
			model: 'track'
		},
		playlist: {
			model: 'playlist'
		},
		status: {
			type: 'integer',
			defaultsTo: 0
		}
	},

	insert: function (params, callback) {
		if (params.target === params.initiator) { callback(false); return false; }
    Notify.create(params).exec(function (err, notify) {
			if (err) sails.log.error('Notify.js:insert', 'Notify.create', params, err);
      Notify.findOne(notify.id).populateAll().exec(function (err, notify) {
      	if (err) sails.log.error('Notify.js:insert', 'Notify.findOne', err);
        sails.sockets.broadcast('user#' + params.target, 'notify', notify);
        callback(notify);
      });
    });
	}

};