const crypto = require('crypto');

const enc = {
  encrypt: function(text, key, defaults) {
    try {

      const iv = crypto.randomBytes(defaults.iv_len),
      cipher = crypto.createCipheriv(
        [defaults.cipher, defaults.bit_len, defaults.mode].join('-'),
        Buffer.from(key, defaults.encode),
        iv,
        {authTagLength: defaults.tag_len}
      ),
      encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

      let final;
      if(['gcm', 'ocb', 'ccm'].indexOf(defaults.mode) !== -1){
        final = [iv, cipher.getAuthTag(), encrypted]
      } else {
        final = [iv, encrypted]
      }

      return Buffer.concat(final).toString(defaults.encode);
    } catch (err) {
      if (err) {
        console.error(err);
        return undefined;
      }
    }
  },
  decrypt: function(encdata, key, defaults) {
    try {

      encdata = Buffer.from(encdata, defaults.encode);
      const decipher = crypto.createDecipheriv(
        [defaults.cipher, defaults.bit_len, defaults.mode].join('-'),
        Buffer.from(key, defaults.encode),
        encdata.slice(0, defaults.iv_len),
        {authTagLength: defaults.tag_len}
      );

      if(['gcm', 'ocb', 'ccm'].indexOf(defaults.mode) !== -1){
        let tag_slice = defaults.iv_len + defaults.tag_len;
        decipher.setAuthTag(encdata.slice(defaults.iv_len, tag_slice));
        return decipher.update(encdata.slice(tag_slice), 'binary', 'utf8') + decipher.final('utf8');
      } else {
        return decipher.update(encdata.slice(defaults.iv_len), 'binary', 'utf8') + decipher.final('utf8');
      }

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
  },
  keygen: function(keylen, iterations, digest, encode){
    let secret = crypto.randomBytes(keylen)
    return crypto.pbkdf2Sync(
      crypto.randomBytes(keylen),
      crypto.randomBytes(keylen),
      iterations, keylen, digest
    ).toString(encode)
  },
  rnd: function(len,enc){
    return crypto.randomBytes(len).toString(enc);
  }
}


module.exports = enc;
