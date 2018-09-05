import * as clc from 'cli-color';
import * as keypress from 'keypress';
import * as glob from 'redstar';
import * as minimist from 'minimist';

let argv = minimist(process.argv.slice( 2 ));
// console.log(argv);

keypress(process.stdin);

let selectionOffset: number = 0;
let buffer = '';
let list: Array<any> = [];

let matches: Array<any> = [];
let selectedItem: any;

const MIN_HEIGHT: number = 6;

// console.log(!argv._.length); // なぜなら
if (!argv._.length) {
  glob('**', (err, files, dirs) => {
    if (err) throw err;

    // console.log(files);
    list = list.concat(files);

    render();
  });
}

const debug = false;

process.stdin.setEncoding('utf8');
process.stdin.on('keypress', (chunk, key) => {
  debug && console.log('chunk: ', chunk);

  key = key || { name: ''};

  const name = String(key.name);

  debug && console.log('got "keypress"', key);

  if (key && key.ctrl && name === 'c') {
    return process.stdin.pause();
  }

  if (key && key.ctrl && name === 'l') {
    return process.stdout.write(clc.reset);
  }

  if (key.ctrl) {
    switch (name) {
      case 'h': // left
        // ignore
        break;
      case 'j': // down
        selectionOffset += 1;
        return render();
        break;
      case 'k': // up
        selectionOffset -= 1;
        return render();
        break;
      case 'l': // right
        console.log('dasdsadasdas');
        break;

      case 'w': // clear fuzzy word
        buffer = '';
        render();
        break;
    }
  }

  if (key.ctrl) return;
  if (key.meta) return;


  switch (name) {
    case 'backspace':
      buffer = buffer.slice(0, -1);
      return render();
      break;
    case 'enter':
      selectionOffset += 1;
      return render();
      break;

    case 'return':
      for (let i = 0; i < MIN_HEIGHT; i++) {
        process.stdout.write(clc.erase.line);
        process.stdout.write(clc.move.down(1));
      }
      process.stdout.write(clc.move.up(MIN_HEIGHT));

      console.log(selectedItem);
      process.exit();
      break;
    // TODO select item
  }

  if (chunk && chunk.length === 1) {
    if (key.shift) {
      buffer += chunk.toUpperCase();
    } else {
      buffer += chunk;
    }

    render();
  }
});


const clcBgGray = clc.bgXterm(236);
const clcFgArrow = clc.xterm(198);
const clcFgBufferArrow = clc.xterm(110);
const clcFgGreen = clc.xterm(143);
// const clcFgMatchGreen = clc.xterm(151);
const clcFgMatchGreen = clc.xterm(107);

// let fuzzyMatch = (fuzzy, text) => {
//   const matches: Array<number> = fuzzyMatches(fuzzy, text);
//   return matches.length === fuzzy.length;
// }

let fuzzyMatches = (fuzzy, text) => {
  fuzzy = fuzzy.toLowerCase();
  text = text.toLowerCase();

  let tp: number = 0; // text position / pointer
  let matches: Array<number> = [];

  // match algorithm 匹配算法，之后再改
  for (let i = 0; i < fuzzy.length; i++) {
    const f = fuzzy[i];

    for (; tp < text.length; tp++) {
      const t = text[tp];
      if (f === t) {
        matches.push(tp);
        tp++;
        break;
      }
    }
  }

  return matches;
};

let fuzzyList = (fuzzy, list) => {
  const results: Array<Object> = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const matches = fuzzyMatches(fuzzy, item);

    if (matches.length === fuzzy.length) {
      let t = item;

      for (let i = 0; i < matches.length; i++) {
        const index = matches[matches.length - (i + 1)];

        const c = clcFgMatchGreen(t[index]);
        t = t.slice(0, index) + c + t.slice(index + 1);
      }

      results.push({
        original: item,
        colored: t
      })
    }
  }

  // sorts in-place
  results.sort((a: any, b: any) => {
    if (a.original < b.original) return -1;
    return 1;
  });

  return results;
};

let render = () => {
  const width = clc.windowSize.width;
  const height = clc.windowSize.height;

  // console.log(width, height);
  // console.log( 'window height: ' + height )
  !debug && process.stdout.write(clc.erase.screen);
  // process.stdout.write(clc.move.to(0, height));

  const writtenHeight = Math.max(
    MIN_HEIGHT,
    2 + matches.length
  );

  process.stdout.write(clc.move(-width));

  for (let i = 0; i < writtenHeight; i ++) {
    process.stdout.write(clc.erase.line);
    process.stdout.write(clc.move.down(1));
  }

  // calculate matches
  matches = fuzzyList(buffer, list);
  let offset = selectionOffset;

  if (offset >= matches.length) {
    offset = matches.length - 1;
  }

  if (offset < 0) {
    offset = 0;
  }

  // save the normalized offset
  selectionOffset = offset;

  // print buffer arrow
  process.stdout.write(clcFgBufferArrow('> '));
  process.stdout.write(buffer);
  process.stdout.write('\n');

  // print matches
  const n = matches.length;
  process.stdout.write('  ');
  process.stdout.write(clcFgGreen(n + '/' + list.length));
  process.stdout.write('\n');

  // print matches
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const item = match.colored;
    const itemSelected = offset === i;


    if (itemSelected) {
      selectedItem = match.original;
      process.stdout.write(clcBgGray(clcFgArrow('> ')));
      process.stdout.write(clcBgGray(item));
      process.stdout.write('\n');
    } else {
      process.stdout.write(clcBgGray(' '));
      process.stdout.write(' ');
      process.stdout.write(item);
      process.stdout.write('\n');
    }
  }

  process.stdout.write(clc.move.up(2 + matches.length));
  process.stdout.write(clc.move.right(1 + buffer.length + 1));
};

process.stdin.setRawMode(true);
process.stdin.resume();
