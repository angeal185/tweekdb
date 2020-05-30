# tweekdb

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

## config

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
## Backup mode
  the `config.backup` setting will enable db backups  on write() and load from the backup file in the unlikely event of data corruption to the db. this setting can be used in conjunction with `config.gzip` to compress your backups. if you are using a large sized db `config.turbo` is recommended. db backups can also be called manually.

## Turbo mode
  the `config.turbo` setting will debounce file writes in a non blocking way within the time-frame that you specify. for example, if you set  `config.turbo.ms` to 100, all calls to .write() will have .val() stored to cache but the file write will be debounced for 100ms. if another call to .write() is detected within 100ms, the timeframe is reset and write is debounced again. If you have 1000 consecutive writes within 100ms of each other, only the last write will be written. this process is non blocking and will return/callback to the user at the point of .val() being updated. the speed gains of this feature grow with the size of your db.

## encryption
  tweekdb supports encryption out of the box and can be configured at `config.encryption`. prior to enabling this feature an appropriately sized encryption key must be generated with the appropriate encoding. this can be created and returned by calling `db.keygen()`.

## gzip
  the `config.gzip` setting will enable db compression should you wish to compress your db and or backup.

## lodash
  tweekdb is built using lodash. should you wish, you can create your own filtered lodash module and update the require() path at `config.settings.lodash_path`.

  tweekdb uses all the same chain-able methods as lodash. be mindful that many of these methods will mutate your items in place while others will return a new item.

for example:
```js
{
  "array": [1,2,3,4,5]
}

// remove value 2 from the array and mutates the array.
// this action will update the db cache
db.get('array').pull(2).val()
console.log(db.get('array').val()) // [1,3,4,5]

// remove value 2 from the array but returns a new array
// this action will not update the db cache but will return
// a new array without 2
let x = db.get('array').without(2).val()

console.log(db.get('array').val()) // [1,2,3,4,5]
console.log(x) // [1,3,4,5]
db.set('array',x).val()
console.log(db.get('array').val()) // [1,3,4,5]
```


## examples
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


// calling .save() will update cache state as well as write state to file.
// calling .val() will update only the cache state.

//save cached db state to file sync
db.save();

//save cached db state to async
db.save(function(err){
  if(err){return console.error(err)};
});

//load remode db to cache using the settings in your config file
db.fetch(function(err,data){
  if(err){return cl(err)}
  // db. in now available outside of this scope
  cl(data.val())
})

//save a remode db using the settings in your config file
db.sync(function(err){
  if(err){return cl(err)}
  cl('done')
})

// add defaults to base db schema and save state to cache.
db.defaults({
  collection:[{"test":"ok"}],
  array:[],
  key: 'val'
}).val()

// add defaults to base db schema and save state to db file.
db.defaults({
  collection:[{"test":"ok"}],
  array:[1,2,3,4,5],
  key: 'val'
}).save()

// create an array named array and save state to cache.
db.set('array', []).val();

// create a collection named collection
db.set('collection', [{test:'working'}]).val();

// create object and save state to cache
db.set('obj', {test:'working'}).val()

// append an object to a collection
db.get('collection').push({ id: db.uuid()}).val()

// append a value then prepend a value to an array
db.get('array').push(1).unshift(2).val()

// prepend an object to a collection
db.get('collection').unshift({ id: db.uuid()}).val()

// prepend a value and append a value to an array
db.get('collection').unshift({ id: db.uuid()}).push({ id: db.uuid()}).val()

// remove an object from a collection and add a new object
db.get('collection').remove({"test":"working"}).push({"test":"working2"}).val()

// remove a value from an array and append a new value
db.get('array').pull('test').unshift('test2').val()

// find an object in a collection
console.log(
  db.get('collection').find({"test":"working"}).val()
) // {test:'working'}

// find index of an object in a collection
console.log(
  db.get('collection').findIndex({"test":"working"}).val()
) // 0


// return first item in a collection or array
console.log(
  db.get('array').head().val()
) // 1

// return first item in a collection or array
console.log(
  db.get('array').tail().val()
) // 5

// return last item in a collection or array
console.log(
  db.get('collection').head().val()
) // {test:'working'}

```


## static method

tweekdb can also be used as a dev tool to generate json files
from your db items.

```js

db.set('blog_posts', [{
    id: 1,
    title: "post 1",
    author: "x",
  },{
    id: 2,
    title: "post 2",
    author: "x"
  },{
    id: 3,
    title: "post 3",
    author: "x"
  },{
    id: 4,
    title: "post 4",
    author: "x"
  },{
    id: 5,
    title: "post 5",
    author: "x"
  }]
)

// create a json file for each post in the config.static.dest folder
let x = db.get('blog_posts').val();
for (let i = 0; i < x.length; i++) {
  db.get('blog_posts['+ i +']').static('post_'+ x[i].id)
}

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
