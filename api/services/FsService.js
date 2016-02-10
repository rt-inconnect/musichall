// ### removeRecursive
// NodeJS:
// Delete a file or delete a DIR recursively
// be aware that this is a power full delete function
// so best is to check if the PATH given is really
// the path you want to DELETE ENTIRELY
//
// ### usage example
// remove a folder recursively
//
//      fs.removeRecursive(full_path_to_dir,function(err,status){});
//
// or just delete a file (works to)
//
//      fs.removeRecursive(full_path_to_file,function(err,status){});
//
 
var fs = require('fs');
var crypto = require('crypto');
var guid = require('guid');
var execSync = require('exec-sync');

var deleteFolderRecursive = function(path) {
  //console.log(sails.config.params.rootPath + path);
  if( path && fs.existsSync(path) ) {
    try {
      execSync("rm -r " + sails.config.params.rootPath + path);
    }
    catch (e) {
      sails.log.error('FsService.js:deleteFolderRecursive', "rm -r " + sails.config.params.rootPath + path, e);
    }
  }
};

module.exports = {
  rmdir : deleteFolderRecursive,
  getToken: function (session) {
    var time = new Date().getTime();
    if(!session.token)
      session.token = crypto.createHash('md5').update(guid.raw() + time + sails.config.params.secret).digest('hex');
    return session.token;
  }
};
