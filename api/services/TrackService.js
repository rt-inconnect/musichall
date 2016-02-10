var childProcess = require('child_process')
  , EventEmitter = require('events').EventEmitter
  , Batch = require('batch')
  , util = require('util')
  , run = require('comandante')

exports.identify = identify;
exports.transcode = transcode;
exports.gnuplot = gnuplot;

var SENTINEL = /[\n]/

// to edit this see https://gist.github.com/4142076
var PROGRESS_TIME_REGEX = /^In:([\d.]+)%\s+(\d\d):(\d\d):([\d.]+)\s+\[(\d\d):(\d\d):([\d.]+)\]\s+Out:([\d.\w]+)\s+\[[\s|\-!=]+\]\s+(?:Hd:([\d.]+))?\s+Clip:(\d+)\s*$/;

var conversions = {
  sampleRate: int,
  sampleCount: int,
  channelCount: int,
  duration: float,
  bitRate: parseBitRate,
  metadata: parseMetadata
}
var suffixMultiplier = {
  'k': 1024,
  'm': 1024 * 1024,
  'g': 1024 * 1024 * 1024,
};
function parseBitRate(str) {
  var mult = suffixMultiplier[str[str.length - 1]];
  var n = parseInt(str, 10);
  return mult ? mult * n : n;
}

function parseMetadata(value) {
    value = value.replace(/\n/g, "=");
    var arr = value.split("=");
    var metadata = {};
    for (var i = 0; i < arr.length; i++) {
      if(i % 2 === 0) {
        metadata[arr[i].toLowerCase()] = '';
      } else {
        metadata[arr[i-1].toLowerCase()] = arr[i];
      }
    }
    return metadata;
}

function capture(exe, args, callback){
  childProcess.execFile(exe, args, function(err, stdout, stderr){
    if (err) {
      err.stdout = stdout;
      err.stderr = stderr;
      err.args = args;
      callback(err);
    } else {
      callback(null, stdout.trim());
    }
  });
}

function int(it){
  return parseInt(it, 10);
}

function float(it){
  return parseFloat(it, 10);
}

function identify(inputFile, callback){
  var results = {}
    , batch = new Batch()

  soxInfo('-t', function(value) { results.format        = value; });
  soxInfo('-r', function(value) { results.sampleRate    = value; });
  soxInfo('-c', function(value) { results.channelCount  = value; });
  soxInfo('-s', function(value) { results.sampleCount   = value; });
  soxInfo('-D', function(value) { results.duration      = value; });
  soxInfo('-B', function(value) { results.bitRate       = value; });
  soxInfo('-a', function(value) { results.metadata      = value; });

  batch.end(function(err) {
    if (err) {console.log(err); return callback(err);}
    for (var k in conversions) {
      results[k] = conversions[k](results[k])
    }
    callback(null, results);
  });

  function soxInfo(arg, assign) {
    batch.push(function(cb) {
      capture('sox', ['--info', arg, inputFile], function(err, value) {
        if (err) return cb(err);
        assign(value);
        cb();
      });
    });
  }

  function annotations(value) {
  }
}

function transcode(inputFile, outputFile, args) {
  return new Transcode(inputFile, outputFile, args);
}

function Transcode(inputFile, outputFile, args) {
  EventEmitter.call(this);
  this.inputFile = inputFile;
  this.outputFile = outputFile;
  this.args = args;
}

util.inherits(Transcode, EventEmitter);

Transcode.prototype.start = function() {
  var self = this;
  identify(this.inputFile, function(err, src) {
    if (err) {
      self.emit('error', err);
      return
    }

    self.emit('src', src);

    var bin = childProcess.spawn("sox", self.args);
    var stdout = "";
    bin.stdout.setEncoding('utf8');
    bin.stdout.on('data', function(data) {
      stdout += data;
    });
    var stderr = "";
    var buffer = "";
    bin.stderr.setEncoding('utf8');
    bin.stderr.on('data', function(data) {
      stderr += data;
      buffer += data;
      var lines = buffer.split(SENTINEL);
      buffer = lines.pop();
      lines.forEach(function(line) {
        var m = line.match(PROGRESS_TIME_REGEX);
        if (!m) return;
        var hour = parseInt(m[2], 10)
        var min = parseInt(m[3], 10)
        var sec = parseInt(m[4], 10)
        var encodedTime = sec + min * 60 + hour * 60 * 60;
        // might have to correct duration now that we've scanned the file
        if (encodedTime > src.duration) {
          src.duration = encodedTime;
          self.emit('src', src);
        }
        self.emit('progress', encodedTime, src.duration);
      });
    });
    bin.on('close', function(code) {
      if (code) {
        var err = new Error("sox returned nonzero exit code: " + code);
        err.code = code;
        err.stdout = stdout;
        err.stderr = stderr;
        err.args = self.args;
        self.emit('error', err);
      } else {
        self.emit('progress', src.duration, src.duration);
        self.emit('end');
      }
    });
  });
};

function gnuplot (cb) {
  var plot = run('gnuplot', []);

  plot.print = function (data, options) {
      plot.write(data);
      if (options && options.end) {
          plot.end();
      }
      return plot;
  };

  plot.println = function (data, options) {
      return plot.print(data + '\n', options);
  };

  ['set', 'unset', 'plot', 'splot'].forEach(function (name) {
      plot[name] = function (data, options) {
          return plot.println(name + ' ' + data, options);
      };
  });

  plot.on('exit', function (dup, name) {
    cb();
  });

  return plot;
}