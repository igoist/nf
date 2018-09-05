#!/usr/bin/env node

const path = require('path');
const glob = require('redstar');

const nf = require(path.join(__dirname, '../main.js'));

const argv = require('minimist')(process.argv.slice(2));

function run() {
  if (process.stdin.isTTY && !argv._.length) {
    return glob('**', (err, files, dirs) => {
      if (err) throw err;

      nf(files, (val, index) => {
        console.log(files[index]);
        process.exit();
      });
    });
  } else {
    const api = nf([], (val, index) => {
      console.log(val);
      process.exit();
    });

    let buffer = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', chunk => {
      buffer += chunk;
      const list = buffer.split( '\n' ).filter( t => t.trim().length > 0);
      api.update(list);
    });
    process.stdin.on('end', () => {
      console.log('end');
      const list = buffer.split( '\n' ).filter( t => t.trim().length > 0);
      api.update(list);
    });
  }
}

run();
