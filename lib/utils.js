const fs = require('fs'),
zlib = require('zlib'),
https = require('https'),
enc = require('./enc');

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

  },
  check_read: function(obj, data, config){
    if(obj.gzip){
      data = zlib.unzipSync(data, config.gzip.settings);
    }
    data = data.toString('utf8');
    if(obj.encryption){
      data = enc.decrypt(data, obj.secret, obj.enc_cnf);
    }
    return data;
  },
  check_write: function(obj, data, config){
    data = obj.serialize(data);
    if(obj.encryption){
      data = enc.encrypt(data, obj.secret, obj.enc_cnf);
    }
    if(obj.gzip){
      data = zlib.gzipSync(data, config.gzip.settings);
    }
    return data
  },
  req: function(obj, dest, config, cb){
    const req = https.request(obj[dest], function(res){

      let scode = res.statusCode,
      str = '';

      if(scode < 200 || scode >= 300){
        cb('request failed with code '+ scode);
        return utils.cl(config.settings.verbose,['error','db from '+ obj[dest].hostname +' failed with code '+ scode],91)
      }

      res.setEncoding('utf8');

      res.on('data', function(chunk){
        str += chunk;
      });

      res.on('end', function(){
        cb(false, str)
      });

    });

    req.on('error', function(err){
      cb(err);
    })

    req.end();
  }
}

module.exports = utils;
