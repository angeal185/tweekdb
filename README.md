# tweekdb

## settings

```js
{
  "settings": {
    "verbose": true, //log to console
    "dev": true,  //development mode
    "lodash_path": "lodash", //require path to lodash or custom lodash
    "noconflict": false, // fixes lodash conflict issues at a cost
    "crypto_utils": true // enable extra crypto utils
  },
  "backup": { //db backup config
    "enabled": false,
    "ext": "tmp", //db backup file extention
    "pre": "." //db backup file prefix
  },
  "turbo": { // turbo mode config
    "enabled": true,
    "ms": 5 // debounce delay in milliseconds
  },
  "cron": { // cronjobs config
    "enabled": false,
    "ms": 10000 // cron task interval in milliseconds
  },
  "fetch": { // remote db fetch config
    "enabled": true,
    "config": { // accepts all nodejs https config options
      "hostname": "",
      "port": 443,
      "path": "",
      "method": "GET",
      "headers":{}
    }
  },
  "sync": {// remote db save config
    "enabled": false,
    "config": { // accepts all nodejs https config options
      "hostname": "",
      "port": 443,
      "path": "",
      "method": "POST",
      "headers":{}
    }
  },
  "gzip":{ // db gzip config
    "enabled": false, // gzip db
    "backup": true, // gzip db backup
    "settings":{
      "level": 9,
      "memLevel": 9,
      "strategy": 0
    }
  },
  "hmac": {
    "secret": "", // hmac secret (encoded with hmac.encode)
    "encode": "hex", // hmac/hash encoding
    "digest": "sha512" // hmac/hash digest sha256/sha384/sha512
                       //sha3-256/sha3-384/sha3-512
  },
  "encryption":{
    "enabled": false,
    "secret": "", // encryption secret (encoded with encryption.settings.encode)
    "secret_len": 32, // secret length 16/24/32
    "iterations": 60000, // pbkdf2 iterations
    "settings": {
      "cipher": "aes", // encryption cipher aes/camilla/aria
      "bit_len": "256", // 128/192/256
      "iv_len": 32, // encryption iv length 16/24/32
      "tag_len": 16,  // encryption tag length
      "encode": "hex", // encryption encoding
      "mode": "gcm", // encryption mode
      "digest": "sha512" // encryption digest sha256/sha384/sha512
                         //sha3-256/sha3-384/sha3-512
    }
  },
  "static":{ //db static file generator options
    "enabled": true,
    "dest": "./" //static file dest
  },
  "schema": {} //default db schema
}

```

## setup

```js

const { tweek, tweekdb } = require('./tweekdb');


//minimal base setup example
const db = tweek(new tweekdb('./db'));

//complete base setup example
const db = tweek(new tweekdb('./db',{
  //add custom db serialize function
  serialize: function(data){
    return Buffer.from(JSON.stringify(data), 'utf8').toString('base64')
  },
  //add custom db deserialize function
  deserialize: function(data){
    return JSON.parse(Buffer.from(data, 'base64').toString())
  },
  //default db schema ~ overrides config file settings
  schema: {
    array: [],
    object:{},
    key: 'value'
  },
  //custom cron job entry point
  cron: function(data){
    console.log(data)
  },
  //enable db encryption ~ overrides config file settings
  encryption: false,
  //enable db backup ~ overrides config file settings
  backup: false,
  //enable db gzip ~ overrides config file settings
  gzip: false,
  //remote db fetch settings ~ overrides config file settings
  fetch_config: {
    hostname: "",
    port: 443,
    path: "",
    method: "GET",
    headers:{}
  },
  //remote db sync settings ~ overrides config file settings
  sync_config {
    hostname: "",
    port: 443,
    path: "",
    method: "POST",
    headers:{}
  },
}));

//create config file in cwd
db.clone_config();
```

## api
```js
//db.load will store your db to cache so it only needs be called once.

//db load sync
db.load();

//db load async
db.load(function(err, data){
  if(err){return console.error(err)};
  // db. in now available outside of this scope
  cl(data.val())
});

//save cached db state to file sync
db.save();

//save cached db state to async
db.save(function(err){
  if(err){return console.error(err)};
});

//load remode db
db.fetch(function(err,data){
  if(err){return cl(err)}
  cl(data.val())
})

// add defaults to base db schema and save state to cache.
db.defaults({
  collection:[{"test":"ok"}],
  key: 'val'
}).val()

// add defaults to base db schema and save state to db file.
db.defaults({
  collection:[{"test":"ok"}],
  key: 'val'
}).save()

// create an array named array and save state to cache.
db.set('array', []).val();

// create an array named array and save state to db file.
db.set('array', []).save();

// create a collection named collection and save state to cache
db.set('collection', [{test:'working'}]).val();

// create a collection named collection and save state to db file
db.set('collection', [{test:'working'}]).save();

// create object and save state to cache
db.set('obj', {test:'working'}).val()

// create object and save state to cache
db.set('obj', {test:'working'}).save()

// append an object to a collection and update cache state
db.get('collection').push({ id: db.uuid()}).val()

// prepend an object to a collection and save to file
db.get('collection').unshift({ id: db.uuid()}).save()

```

## utils
```js

//create new cryptographically secure secret
db.keygen();

//generate uuidv4
db.uuid();

//encrypt a string

/**
 *  encrypt a string
 *  @param {string} data ~ data to be encrypted
 *  @param {string} secret ~ optional / fallback to config file
 **/

 db.encrypt(data,secret);

 /**
  *  decrypt a string
  *  @param {string} data ~ data to be encrypted
  *  @param {string} secret ~ optional / fallback to config file
  **/

  db.decrypt(data,secret);

/**
 *  hmac a string
 *  @param {string} data ~ data for hmac
 *  @param {string} secret ~ optional / fallback to config file
 **/

 db.hmac(data,secret)

/**
  *  hash a string
  *  @param {string} data ~ data for hash
  **/

  db.hash(data);

```
