const crypto = require('crypto');

const enc = {
  encrypt: function(text, key, defaults) {
    try {
      const iv = crypto.randomBytes(defaults.iv_len),
        cipher = crypto.createCipheriv(
          [defaults.cipher, defaults.bit_len, defaults.mode].join('-'),
          Buffer.from(key, defaults.encode),
          iv
        ),
        encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(defaults.encode);
    } catch (err) {
      if (err) {
        console.error(err);
        return undefined;
      }
    }
  },
  decrypt: function(encdata, key, defaults) {
    try {
      let tag_slice = defaults.iv_len + defaults.tag_len;
      encdata = Buffer.from(encdata, defaults.encode);
      const decipher = crypto.createDecipheriv(
        [defaults.cipher, defaults.bit_len, defaults.mode].join('-'),
        Buffer.from(key, defaults.encode),
        encdata.slice(0, defaults.iv_len)
      );
      decipher.setAuthTag(encdata.slice(defaults.iv_len, tag_slice));
      return decipher.update(encdata.slice(tag_slice), 'binary', 'utf8') + decipher.final('utf8');
    } catch (err) {
      if (err) {
        console.error(err);
        return undefined;
      }
    }
  },
  hash: function(data, digest, encode) {

    if(typeof data !== 'string'){
      data = JSON.stringify(data)
    }

    return crypto.createHash(digest).update(data).digest(encode)
  },
  hmac: function(data, secret, digest, encode) {

    if(typeof data !== 'string'){
      data = JSON.stringify(data)
    }
    return crypto.createHmac(digest, Buffer.from(secret, encode).toString()).update(data).digest(encode)
  },
  uuidv4: function() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c){
      return (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
    });
  }
}


module.exports = enc;
