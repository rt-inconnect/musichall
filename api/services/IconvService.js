var jschardet = require("jschardet");
var Buffer = require("buffer").Buffer;
var Iconv = require("iconv").Iconv;

String.prototype.fulltrim = function () {
  return this.replace( /[\u0000-\u001f]/, '' );
};

module.exports = {
  convertToUtf : function (string) {
    if (string) {
      var charset = jschardet.detect(string);
      if(!_.contains(['ascii', 'utf8'], charset.encoding)) {
        string = new Buffer(string, 'binary');
        var iconv = new Iconv('windows-1251', 'utf8');
        string = iconv.convert(string).toString();
        return string.fulltrim();
      }
      return string.fulltrim();
    }
    return string;
  }
};
