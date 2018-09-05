import * as clc from 'cli-color';
import * as keypress from 'keypress';
import ttys from './lib/ttys.js';


const stdin = ttys.stdin;
const stdout = ttys.stdout;

keypress(stdin);

const start = (_list, callback) => {
  let api = <any>{};

  api.update = _list => {
    list = _list.slice();
    render();
  };

  api.stop = () => {
    stdin.removeListener('keypress', handleKeypress);

    stdin.setRawMode && stdin.setRawMode(false);
    stdin.pause();
  }

  let selectionOffset: number = 0;
  let buffer = '';
  let list: Array<any> = _list || [];
  let _printedMatches = 0;

  let matches: Array<any> = [];
  let selectedItem: any;

  const MIN_HEIGHT: number = 6;

  const debug = false;

  let handleKeypress = (chunk, key) => {
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
  };

  stdin.setEncoding( 'utf8' );
  stdin.on('keypress', handleKeypress);


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
      const originalIndex = i;
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
          originalIndex,
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

  let cleanDirtyScreen = () => {
    const width = clc.windowSize.width;
    const writtenHeight = Math.max(
      MIN_HEIGHT,
      2 + _printedMatches
    );

    stdout.write(clc.move(-width));

    for (let i = 0; i < writtenHeight; i++) {
      stdout.write(clc.erase.line);
      stdout.write(clc.move.down(1));
    }

    stdout.write(clc.move.up(writtenHeight));
    // console.log(width, height);
    // console.log( 'window height: ' + height )
    // !debug && process.stdout.write(clc.erase.screen);
    // process.stdout.write(clc.move.to(0, height));

    // console.log('writtenHeight: ', writtenHeight);
    // console.log('matches.length: ', matches.length);
  };

  let render = () => {
    // const width = clc.windowSize.width;
    // const height = clc.windowSize.height;

    cleanDirtyScreen();

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

    if (!selectedItem) {
      selectedItem = matches[0];
    }

    _printedMatches = 0;

    const maxPrintLength = Math.min(matches.length, MIN_HEIGHT);

    const startIndex = Math.max(0, offset - maxPrintLength + Math.ceil(MIN_HEIGHT * 0.25));

    const matchLimit = Math.min(maxPrintLength + startIndex, matches.length);

    // print matches
    for (let i = startIndex; i < matchLimit; i++) {
      _printedMatches++;
      const match = matches[i];
      const item = match.colored;
      const itemSelected = offset === i;


      if (itemSelected) {
        selectedItem = match.original;
        stdout.write(clcBgGray(clcFgArrow('> ')));
        stdout.write(clcBgGray(item));
        stdout.write('\n');
      } else {
        stdout.write(clcBgGray(' '));
        stdout.write(' ');
        stdout.write(item);
        stdout.write('\n');
      }
    }

    stdout.write(clc.move.up(2 + _printedMatches));
    stdout.write(clc.move.right(1 + buffer.length + 1));
  };

  stdin.setRawMode && stdin.setRawMode(true);
  stdin.resume();

  render();

  return api;
};

module.exports = start;
