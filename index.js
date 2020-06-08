const fs = require('fs'),
zlib = require('zlib'),
https = require('https'),
utils = require('./lib/utils'),
enc = require('./lib/enc');

let config,
cwd = process.cwd(),
cnf_url = cwd + '/tweekdb.json';

try {
  config = require(cnf_url);
  utils.cl(config.settings.verbose,['init','config file found.'],96);
} catch (err) {
  config = require('./config');
  utils.cl(config.settings.verbose,['init','config file not found, loading defaults.'],96);
}

Object.freeze(config);

const vb = config.settings.verbose,
lp = config.settings.lodash_path;

let _ = require(lp);

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

  if(config.static.enabled){
    this.static_dest = config.static.dest;
  }

  if(config.fetch.enabled){
    this.fetch_config = cnf.fetch_config || config.fetch.config;
  }

  if(config.sync.enabled){
    this.sync_config = cnf.sync_config || config.sync.config;
  }

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
    let src = this.src,
    data;
    if(!cb){
      try {
        data = fs.readFileSync(src);
        if(this.gzip){
          data = zlib.unzipSync(data, config.gzip.settings);
        }
        data = data.toString('utf8');
        if(this.encryption){
          data = enc.decrypt(data, this.secret, this.enc_cnf);
        }
        utils.cl(vb,['status','db '+ src +' cached and ready.'],96);
        return this.deserialize(data);
      } catch(e) {
        utils.cl(vb,['warning','unable to load data, creating new...'],91);
        try {
          let data = fs.readFileSync(this.backup_pre + src +'.'+ this.backup_ext);
          if(this.gzip  || this.gzip_backup){
            data = zlib.unzipSync(data, config.gzip.settings);
          }
          data = data.toString('utf8');
          if(this.encryption){
            data = enc.decrypt(data, this.secret, this.enc_cnf);
          }
          utils.cl(vb,['status','db '+ src +' backup cached and ready.'],96);
          return data ? this.deserialize(data) : this.schema;
        } catch (err) {
          let data = this.serialize(this.schema);
          if(this.encryption){
            data = enc.encrypt(data, this.secret, this.enc_cnf);
          }
          if(this.gzip){
            data = zlib.gzipSync(data, config.gzip.settings);
          }
          fs.writeFileSync(src, data);
          utils.cl(vb,['status','new db '+ src +' cached and ready.'],96);
          return this.schema;
        }
      }
    } else {
      let $this = this;
      fs.readFile(src, function(err,res){
        if(err){
          fs.readFile(this.backup_pre + src +'.'+ this.backup_ext, function(err, res){
            if(err){
              let data = $this.serialize($this.schema);
              if($this.encryption){
                data = enc.encrypt(data, $this.secret, $this.enc_cnf);
              }
              if($this.gzip){
                data = zlib.gzipSync(data, config.gzip.settings);
              }
              fs.writeFileSync(src, data);
              cb(false, $this.schema);
              utils.cl(vb,['status','new db '+ src +' cached and ready.'],96);
              return
            }
            if($this.gzip  || this.gzip_backup){
              res = zlib.unzipSync(res, config.gzip.settings);
            }
            res = res.toString('utf8');
            if($this.encryption){
              res = enc.decrypt(res, $this.secret, $this.enc_cnf);
            }
            cb(false, $this.deserialize(res));
            utils.cl(vb,['status','db '+ src +' backup cached and ready.'],96);
          });
        } else {
          if($this.gzip){
            data = zlib.unzipSync(data, config.gzip.settings);
          }
          data = data.toString('utf8');
          if($this.encryption){
            res = enc.decrypt(res, $this.secret, $this.enc_cnf);
          }
          cb(false, $this.deserialize(res));
          utils.cl(vb,['status','db '+ src +' cached and ready.'],96);
        }
      })
    }
  },
  save: function(data, cb) {
    let src = this.src;
    data = this.serialize(data);
    if(this.encryption){
      data = enc.encrypt(data, this.secret, this.enc_cnf);
    }
    if(this.gzip){
      data = zlib.gzipSync(data, config.gzip.settings);
    }
    if(!cb){
      let res = fs.writeFileSync(src, data);
      if(this.backup){
        if(!this.gzip && this.gzip_backup){
          data = zlib.gzipSync(data, config.gzip.settings);
        }
        fs.writeFile(this.backup_pre + src +'.'+ this.backup_ext, data, function(err){
          if(err){
            return utils.cl(vb,['error','backup failed to save'],91);
          }
        })
      }

      if(!config.turbo.enabled){
        return res;
      }

    } else {
      let $this = this;
      fs.writeFile(src, data, function(err){

        if(!config.turbo.enabled){
          if(err){return cb(err)}
          cb(false)
        } else {
          if(err){
            return utils.cl(vb,['error','Turbo file write failed'],91);
          }
        }

        if($this.backup){
          if(!$this.gzip && $this.gzip_backup){
            data = zlib.gzipSync(data, config.gzip.settings);
          }
          fs.writeFile($this.backup_pre + $this.src +'.'+ $this.backup_ext, data, function(err){
            if(err){return utils.cl(vb,['error','backup failed to save'],91);}
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

if(config.static.enabled){
  tweekdb.prototype.static = function(data, title, cb){
    if(typeof data !== 'string'){
      data = JSON.stringify(data)
    }
    let dest = this.static_dest + title + '.json';
    if(!cb){
      return fs.writeFileSync(dest, data);
    } else {
      fs.writeFile(dest, data, function(err){
        if(err){return cb(err)}
        cb(false)
      })
    }
  }
}

if(config.fetch.enabled){
  tweekdb.prototype.fetch = function(cb){
    let $this = this,
    arr = ['key','cert','pfx'];

    for (let i = 0; i < arr.length; i++) {
      if(this.fetch_config[arr[i]]){
        this.fetch_config[arr[i]] = fs.readFileSync(this.fetch_config[arr[i]])
        if(arr[i] === 'ca'){
          this.fetch_config[arr[i]] = [this.fetch_config[arr[i]]]
        }
      }
    }

    const req = https.request(this.fetch_config, function(res){

      let scode = res.statusCode,
      rawData = '';
      if(scode < 200 || scode >= 300){
        cb('request failed with code '+ scode);
        return utils.cl(vb,['error','db from '+ $this.fetch_config.hostname +' failed with code '+ scode],91)
      }

      res.setEncoding('utf8');

      res.on('data', function(chunk){
        rawData += chunk;
      });

      res.on('end', function(){
          try {
            let data = rawData;
            if($this.encryption){
              data = enc.decrypt(data, $this.secret, $this.enc_cnf);
            }
            data = $this.deserialize(data);
            cb(false, data);
            utils.cl(vb,['status','db from '+ $this.fetch_config.hostname +' cached and ready.'],96);
          } catch (err) {
            throw err;
          }

      });

    });

    req.on('error', function(err){
      cb(err);
    })

    req.end();

  }
}

if(config.sync.enabled){
  tweekdb.prototype.sync = function(body, cb){
    let $this = this,
    arr = ['key','cert','pfx'];

    if(typeof body !== 'string'){
      try {
        body = JSON.stringify(body);
      } catch (err) {
        return cb('invalid sync data')
      }
    }

    if(this.encryption){
      body = enc.encrypt(body, this.secret, this.enc_cnf);
    }

    for (let i = 0; i < arr.length; i++) {
      if(this.sync_config[arr[i]]){
        this.sync_config[arr[i]] = fs.readFileSync(this.sync_config[arr[i]])
        if(arr[i] === 'ca'){
          this.sync_config[arr[i]] = [this.sync_config[arr[i]]]
        }
      }
    }

    this.sync_config.headers['Content-Length'] = body.length;

    const req = https.request(this.sync_config, function(res){

      let scode = res.statusCode,
      rawData = '';

      if(scode < 200 || scode >= 300){
        cb('request failed with code '+ scode);
        return utils.cl(vb,['error','db from '+ $this.sync_config.hostname +' failed with code '+ scode],91)
      }

      res.setEncoding('utf8');

      res.on('data', function(chunk){
        rawData += chunk;
      });

      res.on('end', function(){
          try {
            let data = rawData;

            data = $this.deserialize(data);
            cb(false, data);
            utils.cl(vb,['status','db from '+ $this.sync_config.hostname +' cached and ready.'],96);
          } catch (err) {
            throw err;
          }

      });

    });

    req.on('error', function(err){
      cb(err);
    })

    req.write(body)
    req.end();

  }
}

function tweek(src) {

  const db = _.chain({});

  _.prototype.save = _.wrap(_.prototype.value, function(func, cb) {
    if(!cb){
      return db.save(func.apply(this))
    } else {
      db.save(func.apply(this), function(err,res){
        if(err){return cb(err)}
        cb(false,res)
      })
    }
  })

  if(config.static.enabled){
    _.prototype.static = _.wrap(_.prototype.value, function(func, title, cb) {
      if(!cb){
        return src.static(func.apply(this), title)
      } else {
        src.static(func.apply(this), title, function(err,res){
          if(err){return cb(err)}
          cb(false,res)
        })
      }
    })
  }

  _.prototype.val = _.prototype.value

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

  if(config.fetch.enabled){
    db.fetch = function(cb){
      src.fetch(function(err,data){
        if(err){return cb(err)}
        cb(false, set_state(data))
      })
    }
  }

  if(config.sync.enabled){
    db.sync = function(cb){
      src.sync(db.val(), cb)
    }
  }

  db.save_state = function(data, cb){
    if(!cb){
      src.save(db.val());
      return data;
    } else {
      src.save(db.val(), function(err){
        if(err){return cb(err)}
        cb(false, data)
      })
    }
  }

  db.backup = function(cb){
    return src.set_backup(db.val(), cb);
  }

  if(config.turbo.enabled){

    let timeout;
    db.save = function(data, cb) {

  		const later = function() {
  			timeout = null;
  			db.save_state(data, cb)
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
    db.save = db.save_state;
  }

  db.cache = function(state){
    return set_state(state);
  }

  if(config.settings.crypto_utils){

    db.hmac = function(data, secret){
      return enc.hmac(data, secret, config.hmac.digest, config.hmac.encode);
    }

    db.hash = function(data){
      return enc.hash(data, config.hmac.digest, config.hmac.encode);
    }

    db.uuid = enc.uuidv4;

    db.rnd = enc.rnd;

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

    db.keygen = function(){
      return enc.keygen(
        config.encryption.secret_len,
        config.encryption.iterations,
        config.encryption.settings.digest,
        config.encryption.settings.encode
      )
    }
  }

  if(config.settings.dev){
    db.clone_config = function(){
      fs.writeFileSync(cnf_url, JSON.stringify(config,0,2))
    }
  }

  if(config.cron.enabled){
    utils.cl(vb,['build','initializing cron tasks...'],96);
    setInterval(function(){
      src.cron_job(db.value())
    },config.cron.ms)
  }

  utils.cl(vb,['build','build status success.'],96);

  return db;
}

module.exports = { tweek, tweekdb }
