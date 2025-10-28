
var _ = require('underscore');

var getFileContents = function(filename) {
    var fs = require('fs'),
        filenames,
        foundFilename;

    filenames = /\..+$/.test(filename) ? // if an extension is specified,
                [filename] :             // don't bother checking others
                _.map(["", ".roy", ".lroy"], function(ext){
                    return filename + ext;
                });

    foundFilename = _.find(filenames, function(filename) {
        return fs.existsSync(filename);
    });

    if(foundFilename) {
        return fs.readFileSync(foundFilename, 'utf8');
    }
    else {
        throw new Error("File(s) not found: " + filenames.join(", "));
    }
};



var reportError = function (filename, line, message) {
  console.error(filename + ":" + line + ": Error: " + message);
    
  if (filename != "stdin") {
    var code = getFileContents(filename);
    var splits = code.split("\n");
    var snippet = "";
    if (line <= 1 || line == splits.length - 1) {
      snippet = code.split("\n")[line];
      console.error((line === 0 ? 1 : line) + " | ", snippet);
    } else if (line > 1 && line < splits.length - 1) {
      snippet = splits[line-1];
      console.error(line - 1 + " | ", snippet);
      snippet = code.split("\n")[line];
      console.error(line + " | ", snippet);
      console.error(" ".repeat((line + " | ").length) + " ^");
      snippet = code.split("\n")[line+1];
      console.error((line + 1) + " | ", snippet);
    }
  }
  process.exit(1);
};

exports.reportError = reportError;
