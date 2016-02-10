var id3 = require('id3-writer');
var writer = new id3.Writer();
var fs = require('fs');

module.exports = {
  modify: function (track) {

    if (!track) return false;

    if (fs.existsSync(sails.config.params.rootPath + track.fileMp3)) {
      var mp3 = new id3.File(sails.config.params.rootPath + track.fileMp3);
      
      var cover = false;
      var meta;
      if (track.coverUrl && fs.existsSync(sails.config.params.rootPath + track.coverUrl)) {
        cover = new id3.Image(sails.config.params.rootPath + track.coverUrl);
      }

      if (cover) {
        meta = new id3.Meta({
          title: track.name,
          genre: track.genreId ? track.genreId.name : '',
          album: '',
          artist: '',
          desc: '',
          comment: ''

        }, [cover]);
      } else {
        meta = new id3.Meta({
          title: track.name,
          genre: track.genreId ? track.genreId.name : '',
          album: '',
          artist: '',
          desc: '',
          comment: ''
        });      
      }
      writer.setFile(mp3).write(meta, function(err) {
        if (err) { sails.log.error('MetadataService.js:modify', 'writer.setFile(mp3)', track.name); }
      });
    }
  }
};