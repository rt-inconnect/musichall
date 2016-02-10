var gm = require('gm');
var im = require('gm').subClass({ imageMagick: true });


module.exports = {
  resizeGm: function(original, resized, callback) {
    gm(original)
      .resize(300, 300, '^')
      .gravity('Center')
      .extent(300, 300)
      .quality(95)
      .write(resized, function (err, data) {
        //if (err) sails.log.error('ImageService.js:resizeGm', 'write', resized, err);
        callback(resized, data);
      });
  },
  resizeIm: function (original, resized, callback) {
    gm(original)
      .resize(300, 300 + '^')
      .gravity('Center')
      .extent(300, 300)
      .write(resized, function (err, data) {
        if (err) sails.log.error('ImageService.js:resizeIm', 'write', resized, err);
        callback(resized, data);
      });
  }
};