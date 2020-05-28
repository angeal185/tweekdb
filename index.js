const fs = require('fs'),
zlib = require('zlib'),
enc = require('./lib/enc');

let config;

function cl(v,x,y){
  if(v){
    return console.log('\x1b[92m[\x1b[94mtweekdb\x1b[92m:\x1b[94m'+x[0]+'\x1b[92m] \x1b['+y+'m'+ x[1] +' \x1b[0m');
  }
}

try {
  config = require(process.cwd() + '/tweekdb.json');
  cl(config.settings.verbose,['init','config file found.'],96);
} catch (err) {
  config = require('./config');
  cl(config.settings.verbose,['init','config file not found, loading defaults.'],96);
}

Object.freeze(config)

const vb = config.settings.verbose;

let _ = require(config.settings.lodash_path);

if(config.settings.noconflict){
  _ = _.runInContext();
}

function tweekdb(src, cnf){
  cnf = cnf || {};
  this.src = src;
  this.schema = cnf.schema || config.schema;
  this.serialize = cnf.serialize || JSON.stringify;
  this.deserialize = cnf.deserialize || JSON.parse;
  this.cron = cnf.cron || null;
  this.encryption = cnf.encryption || config.encryption.enabled;
  this.backup = cnf.backup || config.backup.enabled;
  this.gzip =  cnf.gzip || config.gzip.enabled;
  this.gzip_backup = config.gzip.backup;

  if(this.encryption){
    this.secret = config.encryption.secret || null;
    this.enc_cnf = config.encryption.settings || null;
  }

  if(this.backup){
    this.backup_pre = config.backup.pre || '.';
    this.backup_ext = config.backup.ext || 'tmp';
  }

}

tweekdb.prototype = {
  load: function(cb) {

    if(!cb){
      try {
        let data = fs.readFileSync(this.src);
        if(this.gzip){
          data = zlib.unzipSync(data, config.gzip.settings);
        }
        if(this.encryption){
          data = enc.decrypt(data, this.secret, this.enc_cnf);
        }
        cl(vb,['status','db '+ this.src +' cached and ready.'],96);
        return this.deserialize(data);
      } catch(e) {
        cl(vb,['warning','unable to load data, creating new...'],91);
        try {
          let data = fs.readFileSync(this.backup_pre + this.src +'.'+ this.backup_ext);
          if(this.gzip  || this.gzip_backup){
            data = zlib.unzipSync(data, config.gzip.settings);
          }
          if(this.encryption){
            data = enc.decrypt(data, this.secret, this.enc_cnf);
          }
          cl(vb,['status','db '+ this.src +' backup cached and ready.'],96);
          return data ? this.deserialize(data) : this.schema;
        } catch (err) {
          let data = this.serialize(this.schema)
          if(this.encryption){
            data = enc.encrypt(data, this.secret, this.enc_cnf);
          }
          if(this.gzip){
            data = zlib.gzipSync(data, config.gzip.settings);
          }
          fs.writeFileSync(this.src, data);
          cl(vb,['status','new db '+ this.src +' cached and ready.'],96);
          return this.schema;
        }
      }
    } else {
      let $this = this;
      fs.readFile(this.src, function(err,res){
        if(err){
          fs.readFile(this.backup_pre + this.src +'.'+ this.backup_ext, function(err, res){
            if(err){
              let data = $this.serialize($this.schema);
              if($this.encryption){
                data = enc.encrypt(data, $this.secret, $this.enc_cnf);
              }
              if($this.gzip){
                data = zlib.gzipSync(data, config.gzip.settings);
              }
              fs.writeFileSync($this.src, data);
              cb(false, $this.schema);
              cl(vb,['status','new db '+ this.src +' cached and ready.'],96);
              return
            }
            if($this.gzip  || this.gzip_backup){
              res = zlib.unzipSync(res, config.gzip.settings);
            }
            if($this.encryption){
              res = enc.decrypt(res, $this.secret, $this.enc_cnf);
            }
            cb(false, $this.deserialize(res));
            cl(vb,['status','db '+ this.src +' backup cached and ready.'],96);
          });
        } else {
          if($this.gzip){
            data = zlib.unzipSync(data, config.gzip.settings);
          }
          if($this.encryption){
            res = enc.decrypt(res, $this.secret, $this.enc_cnf);
          }
          cb(false, $this.deserialize(res));
          cl(vb,['status','db '+ this.src +' cached and ready.'],96);
        }
      })
    }
  },
  write: function(data, cb) {
    data = this.serialize(data);
    if(this.encryption){
      data = enc.encrypt(data, this.secret, this.enc_cnf);
    }
    if(this.gzip){
      data = zlib.gzipSync(data, config.gzip.settings);
    }
    if(!cb){
      let res = fs.writeFileSync(this.src, data);
      if(this.backup){
        if(!this.gzip && this.gzip_backup){
          data = zlib.gzipSync(data, config.gzip.settings);
        }
        fs.writeFile(this.backup_pre + this.src +'.'+ this.backup_ext, data, function(err){
          if(err){
            return cl(vb,['error','backup failed to save'],91);
          }
        })
      }

      if(!config.turbo.enabled){
        return res;
      }

    } else {
      let $this = this;
      fs.writeFile(this.src, data, function(err){

        if(!config.turbo.enabled){
          if(err){return cb(err)}
          cb(false)
        } else {
          if(err){
            return cl(vb,['error','Turbo file write failed'],91);
          }
        }

        if($this.backup){
          if(!$this.gzip && $this.gzip_backup){
            data = zlib.gzipSync(data, config.gzip.settings);
          }
          fs.writeFile($this.backup_pre + $this.src +'.'+ $this.backup_ext, data, function(err){
            if(err){return cl(vb,['error','backup failed to save'],91);}
          })
        }
      })
    }
  },
  set_backup: function(data, cb) {
    data = this.serialize(data);

    let dest = config.backup.pre + this.src +'.'+ config.backup.ext;

    if(this.encryption){
      data = enc.encrypt(data, this.secret, this.enc_cnf);
    }
    if(this.gzip){
      data = zlib.gzipSync(data, config.gzip.settings);
    }
    if(!cb){
      return fs.writeFileSync(dest, data);
    }
    fs.writeFile(dest, data, function(err){
      if(err){return cb(err)}
      cb(false)
    })
  },
  cron_job: function(db){
    this.cron(db)
  }
}

function tweek(src) {

  const db = _.chain({});

  _.prototype.write = _.wrap(_.prototype.value, function(func, cb) {
    if(!cb){
      return db.write(func.apply(this))
    } else {
      db.write(func.apply(this), function(err,res){
        if(err){return cb(err)}
        cb(false,res)
      })
    }
  })

  function set_state(state) {
    db.__wrapped__ = state
    return db
  }

  db._ = _

  db.load = function(cb){
    if(!cb){
      return set_state(src.load())
    } else {
      src.load(function(err,data){
        if(err){return cb(err)}
        cb(false, set_state(data))
      })
    }
  }

  db.write_state = function(data, cb){
    if(!cb){
      src.write(db.getState());
      return data;
    } else {
      src.write(db.getState(), function(err){
        if(err){return cb(err)}
        cb(false, data)
      })
    }
  }

  db.backup = function(cb){
    return src.set_backup(db.getState(), cb);
  }

  if(config.turbo.enabled){
    let timeout;
    db.write = function(data, cb) {

  		const later = function() {
  			timeout = null;
  			db.write_state(data, cb)
  		};

      if(!timeout || typeof timeout === 'object'){
        //maybee add immediate for first call option here
        clearTimeout(timeout);
        timeout = setTimeout(later, config.turbo.ms);
        if(typeof timeout === 'object'){
          if(cb){
            return cb(false)
          }
          return true
        }
      }
    }

  } else {
    db.write = db.write_state;
  }

  db.getState = function(){
    return db.__wrapped__;
  }

  db.setState = function(state){
    return set_state(state);
  }

  db.encrypt = function(data, secret){
    if(!secret){
      secret = config.encryption.secret;
    }
    return enc.encrypt(data, secret, config.encryption.settings);
  }

  db.decrypt = function(data, secret){
    if(!secret){
      secret = config.encryption.secret;
    }
    return enc.decrypt(data, config.encryption.secret, config.encryption.settings);
  }

  db.keygen = function(len, iter){
    return enc.keygen(
      config.encryption.secret_len,
      config.encryption.iterations,
      config.encryption.settings.digest,
      config.encryption.settings.encode
    )
  }

  if(config.settings.dev){

    db.clone_config = function(){
      fs.writeFileSync(process.cwd() + '/tweekdb.json', JSON.stringify(config,0,2))
    }

  }

  if(config.cron.enabled){
    cl(vb,['build','initializing cron tasks...'],96);
    setInterval(function(){
      src.cron_job(db.value())
    },config.cron.ms)
  }

  cl(vb,['build','build status success.'],96);

  return db;
}


module.exports = { tweek, tweekdb }
