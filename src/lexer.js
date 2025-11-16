var unicode = require('unicode-categories'),
    _ = require('underscore');

var errors = require("./errors.js");

// http://es5.github.com/#x7.6
// ECMAscript identifier starts with `$`, `_`,
// or letter from (Lu Ll Lt Lm Lo Nl) unicode groups.
// Then identifier can also be from groups (Nd, Mn, Mc, or Pc).
// Roy identifier cannot have letter u03BB (greek lowercase lambda)
// because it's used in anonymous functions.
var IDENTIFIER = new RegExp(
    unicode.ECMA.identifier.source.replace('\\u03BB', '')
);

var NUMBER = /^-?[0-9]+(\.[0-9]+)?([eE][\-\+]?[0-9]+)?/;
var STRING = /^"(?:[^"\\]|\\[\s\S])*"/;
var WHITESPACE = /^[^\n\S]+/;
var INDENT = /^(?:\n[^\n\S]*)+/;
var GENERIC = /^'([a-z]+)/;
var SHEBANG = /^#!.*/;
var COMMENT = /^\/\/.*|^\/\*[\s\S]*?\*\//;

var keywordTokens = {
    'true': 'BOOLEAN',
    'false': 'BOOLEAN',
    'let': 'LET',
    'if': 'IF',
    'instance': 'INSTANCE',
    'then': 'THEN',
    'else': 'ELSE',
    'data': 'DATA',
    'type': 'TYPE',
    'typeclass': 'TYPECLASS',
    'when': 'MATCH',
    'is': 'IS',
    'case': 'CASE',
    'do': 'DO',
    'return': 'RETURN',
    'with': 'WITH',
    'where': 'WHERE'
};

var indent;
var indents;
var tokens;
var lineno;
var column;


var identifierToken = function (chunk) {
    var token = IDENTIFIER.exec(chunk);

    if (token) {
        var value = token[0],
            name = keywordTokens[value] || 'IDENTIFIER';

        tokens.push([name, value, lineno, column]);
        column += token[0].length;
        return token[0].length;
    }
    return 0;
};

var numberToken = function (chunk) {
    var token = NUMBER.exec(chunk);
    if (token) {
        tokens.push(['NUMBER', token[0], lineno, column]);
        column += token[0].length;
        return token[0].length;
    }
    return 0;
};

var stringToken = function (chunk) {
    var token = STRING.exec(chunk);
    if (token) {
        tokens.push(['STRING', token[0].replaceAll("\"", "`"), lineno, column]);
        column += token[0].length;
        return token[0].length;

    }
    return 0;
};

var genericToken = function (chunk) {
    var token = GENERIC.exec(chunk);
    if (token) {
        tokens.push(['GENERIC', token[1], lineno, column]);
        column += token[0].length;
        return token[0].length;
    }
    return 0;
};

var commentToken = function (chunk) {
    var token = COMMENT.exec(chunk);
    if (token) {
        tokens.push(['COMMENT', token[0], lineno, column]);
        column += token[0].length;
        return token[0].length;
    }
    return 0;
};


var whitespaceToken = function (chunk) {
    var token = WHITESPACE.exec(chunk);
    if (token) {
        column += token[0].length;
        return token[0].length;
    }
    return 0;
};

// If an OUTDENT is followed by a line continuer,
// the next TERMINATOR token is supressed.
var lineContinuer = {
    "where": true
};

var lineToken = function (chunk) {
    var token = INDENT.exec(chunk);
    if (token) {
        column += token[0].length;
        return token[0].length;  // Just consume, don't generate tokens  
    }
    return 0;
};

var literalToken = function (chunk) {
    var operatorChars = '+-*/%<>=!|&?@:\\'; 
    var i = 0;  
  
    if (chunk[0] == '(' || chunk[0] == ')' 
     || chunk[0] == '{' || chunk[0] == '}' 
     || chunk[0] == '[' || chunk[0] == ']' 
     || chunk[0] == "'"
     || chunk[0] == ',' || chunk[0] == '.') {  
        tokens.push([chunk[0], chunk[0], lineno, column]);  
        column += 1;  
        return 1;  
    }  
  
    while (i < chunk.length && operatorChars.includes(chunk[i])) {  
        i++;  
    }  
  
    if (i === 0) return 0;  
  
    var op = chunk.slice(0, i);  
  
    var knownOps = {  
        '>>': 'MATH', '<<': 'MATH',  
        '>=': 'COMPARE', '<=': 'COMPARE', '==': 'COMPARE', '!=': 'COMPARE',  
        '++': 'CONCAT',  
        '||': 'BOOLOP', '&&': 'BOOLOP',  
        '->': 'RIGHTARROW', '<-': 'LEFTARROW',
        '\\': 'LAMBDA',
    };  
  
    if (knownOps[op]) {  
        tokens.push([knownOps[op], op, lineno, column]);  
        column += op.length;  
        return op.length;  
    }  
  
    var singleCharOps = {  
        '<': 'COMPARE', '>': 'COMPARE',  
        '*': 'MATH', '/': 'MATH', '%': 'MATH'  
    };  
  
    if (i === 1 && singleCharOps[op]) {  
        tokens.push([singleCharOps[op], op, lineno, column]);  
        column += op.length;  
        return op.length;  
    }  
  
    if (i > 1) {  
        tokens.push(['OPERATOR', op, lineno, column]);  
        column += i;  
        return i;  
    }  
  
    tokens.push([op, op, lineno, column]);  
    column += 1;  
    return 1;  
};

var shebangToken = function (chunk) {
    var token = SHEBANG.exec(chunk);
    if (token) {
        tokens.push(['SHEBANG', token[0], lineno, column]);
        column += 1;
        return token[0].length;
    }
    return 0;
};



var tokenise = function (source, tokenizers) {
    /*jshint boss:true*/
    var i = 0, chunk;

    function getDiff(chunk) {
        return _.foldl(tokenizers, function (diff, tokenizer) {
            return diff ? diff : tokenizer.apply(tokenizer, [chunk]);
        }, 0);
    }

    while (chunk = source.slice(i)) {
        var diff = getDiff(chunk);
        if (!diff) {
            throw "Couldn't tokenise: " + chunk.substring(0, chunk.indexOf("\n") > -1 ? chunk.indexOf("\n") : chunk.length);
        }
        var newlines = source.slice(i, i + diff).split('\n').length - 1;
        lineno += newlines;
        if (newlines > 0) {
            column = 1; // Reset column when newline detected  
        }
        i += diff;
    }

    return tokens;
};

exports.tokenise = function (source, opts) {
    indent = 0;
    indents = [];
    tokens = [];
    lineno = 0;
    opts = opts || { filename: "stdin" };
    column = 1;

    try {
        let tokens = tokenise(source, [identifierToken, numberToken,
            stringToken, genericToken, commentToken, whitespaceToken,
            lineToken, literalToken, shebangToken]
        ).concat([['EOF', '', lineno, column]]);
        return tokens;
    } catch (e) {
        // lexerError(e, opts.filename);
        console.log(tokens)
        errors.reportError(opts.filename, lineno, column, e);
    }
};
