var fs = require('fs')
var tty = require('tty')
var assert = require('assert')

let ttys = {
  stdin: null,
  stdout: null
};

if (tty.isatty(0)) {
  ttys.stdin = process.stdin
} else {
  var ttyFd = fs.openSync('/dev/tty', 'r')
  assert(tty.isatty(ttyFd))
  ttys.stdin = new tty.ReadStream(ttyFd)
  ttys.stdin._type = 'tty'
}

if (tty.isatty(1)) {
  ttys.stdout = process.stdout
} else {
  var ttyFd = fs.openSync('/dev/tty', 'w')
  assert(tty.isatty(ttyFd))
  ttys.stdout = new tty.WriteStream(ttyFd)
  ttys.stdout._type = 'tty'

  // Hack to have the stdout stream not keep the event loop alive.
  // See: https://github.com/joyent/node/issues/1726
  // XXX: remove/fix this once src/node.js does something different as well.
  if (ttys.stdout._handle && ttys.stdout._handle.unref) {
    ttys.stdout._handle.unref()
  }

  // Update the "columns" and "rows" properties on the stdout stream
  // whenever the console window gets resized.
  if (ttys.stdout._refreshSize) {
    process.on('SIGWINCH', function () {
      ttys.stdout._refreshSize()
    })
  }
}

export default ttys;
