const https = require('https');

const utils = {
  cl: function(v,x,y){
    if(v){
      let msg = '\x1b[92m[\x1b[94mtweekdb\x1b[92m:\x1b[94m'+x[0]+'\x1b[92m] \x1b['+y+'m'+ x[1] +' \x1b[0m';
      console.log(msg);
    }
  }
}

module.exports = utils;
