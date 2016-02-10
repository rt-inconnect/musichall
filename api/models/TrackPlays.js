/**
 * TrackPlays.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {

  attributes: {
    track: {
      model: 'track'
    },
    user: {
      model: 'user'
    }
  },

  topByInterval: function (params, cb) {
    var userCondition = '';
    var intervalCondition = '';
    var genreCondition = '';
    if (params.user) userCondition = ' AND user = ' + params.user;    
    if (params.interval) intervalCondition = ' AND createdAt > DATE_SUB(CURDATE(),INTERVAL '+params.interval+' DAY)';
    if (params.genre && params.genre != 0) genreCondition = ' AND track in (select id from track where genreId = '+params.genre+')';
    var sql = 'SELECT track, count(track) kol'+
      ' FROM trackplays'+
      ' WHERE 1 = 1 ' + userCondition + intervalCondition + genreCondition +
      ' GROUP BY track'+
      ' ORDER BY 2 DESC LIMIT '+ params.limit;
    TrackPlays.query(sql, function (err, plays) {
        if (err) sails.log.error('TrackPlays.js:topByInterval', 'TrackPlays.query', sql, err);
        plays = _.map(plays, 'track');
        cb(plays);
      });
  },

  topByIntervalTags: function (params, cb) {
    var userCondition = '';
    var trackCondition = '';
    
    if (params.user) userCondition = ' AND a.user != ' + params.user;
    if (params.track) trackCondition = ' AND a.track != ' + params.track;

    var sql = 'SELECT a.track, count(a.track) kol'+
      ' FROM trackplays a, tag b'+
      ' WHERE 1 = 1 '+
      //' AND a.createdAt > DATE_SUB(CURDATE(),INTERVAL '+params.interval+' DAY) ' +
        userCondition +
        trackCondition +
      ' AND b.name in("'+params.tags.join('","')+'") AND a.track = b.trackId'+
      ' GROUP BY a.track'+
      ' ORDER BY 2 DESC LIMIT '+ params.limit;

    TrackPlays.query(sql, function (err, plays) {
        if (err) sails.log.error('TrackPlays.js:topByIntervalTags', 'TrackPlays.query', sql, err);
        plays = _.map(plays, 'track');
        cb(plays);
      });
  },

  usersByTracks: function (params, cb) {
    var sql = 'SELECT user, count(track) kol'+
      ' FROM trackplays'+
      ' WHERE track in('+params.tracks.join()+') AND user != '+ params.user +
      ' GROUP BY user, track'+
      ' ORDER BY 2 DESC';
    TrackPlays.query(sql, function (err, users) {
        if (err) sails.log.error('TrackPlays.js:usersByTracks', 'TrackPlays.query', sql, err);
        var userIds = _.map(users, 'user');
        userIds = _.uniq(userIds).slice(0, params.limit);
        cb(userIds);
      }
    );
  }

};