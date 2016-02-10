var generateMeta = function (type, content) {
  return '<meta name="'+type+'" content="'+content+'" />';
}
var generateMetaOg = function (type, content) {
  return '<meta property="og:'+type+'" content="'+content+'" />';
}
module.exports = {
  getMeta: function (track) {
    var keywords;
    if (!_.isEmpty(track.tags)) keywords = _.map(track.tags, 'name').join(',');
    var metas = [
      generateMeta('keywords', sails.config.params.keywords + ',' + keywords),
      generateMetaOg('type', 'website'),
      generateMetaOg('title', track.name),
      generateMetaOg('url', 'http://musichall.uz/track/'+track.id+'/comments'),
      generateMetaOg('description', sails.config.params.description),
      generateMetaOg('image', 'http://musichall.uz/'+track.coverUrl),
      generateMetaOg('updated_time', Date.now())
    ];
    return metas.join(' ');
  }
};