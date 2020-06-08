const fs = require('fs'),
zlib = require('zlib');

const utils = {
  cl: function(v,x,y){
    if(v){
      let msg = '\x1b[92m[\x1b[94mtweekdb\x1b[92m:\x1b[94m'+x[0]+'\x1b[92m] \x1b['+y+'m'+ x[1] +' \x1b[0m';
      console.log(msg);
    }
  },
  write_backup: function(obj, data, config){

    if(obj.backup){
      if(!obj.gzip && obj.gzip_backup){
        data = zlib.gzipSync(data, config.gzip.settings);
      }
      fs.writeFile(obj.backup_pre + obj.src +'.'+ obj.backup_ext, data, function(err){
        if(err){return utils.cl(config.settings.verbose,['error','backup failed to save'],91);}
      })
    }

  }
}

module.exports = utils;
