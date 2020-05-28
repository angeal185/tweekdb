
const utils = {
  cl: function(v,x,y){
    if(v){
      return console.log('\x1b[92m[\x1b[94mtweekdb\x1b[92m:\x1b[94m'+x[0]+'\x1b[92m] \x1b['+y+'m'+ x[1] +' \x1b[0m');
    }
  }
}

module.exports = utils;
