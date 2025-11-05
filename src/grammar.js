var typegrammar = require('./typegrammar').bnf;

var n = function(s) {  
    return s + "$$.lineno = yylineno; $$.filename = yy.filename; $$.column = yy.lexer.tokens[yy.lexer.pos - 2][3];";  
};

var grammar = {
  "startSymbol": "program",
  "options": {
  "locations": true
  },

  "operators": [
  ["left", "RIGHTARROW", "LEFTARROW", "RIGHTFATARROW", "ELEM", "NOTELEM",
    "FORALL", "COMPOSE"],
  ["right", "IF", "ELSE"],
  ["left", "BOOLOP"],
  ["left", "COMPARE", "WITH"],
  ["left", "+", "-", "@"],
  ["left", "MATH", "CONCAT"],
  ["left", "."]
],

  "bnf": {
    "program": [
      ["EOF", "return new yy.Module([]);"],
      ["SHEBANG body EOF", "return new yy.Module($2);"],
      ["SHEBANG EOF", "return new yy.Module([]);"],
      ["body EOF", "return new yy.Module($1);"]
    ],
    "body": [
      ["line", "$$ = [$1];"],
      ["body line", "$$ = $1; $1.push($2);"],
    ],
    "line": [
      ["statement", "$$ = $1;"],
      ["expression", "$$ = $1;"],
      ["COMMENT", n("$$ = new yy.Comment($1);")]
    ],
    "statement": [
      ["LET function", "$$ = $2;"],
      ["LET binding", "$$ = $2;"],
      ["dataDecl", "$$ = $1;"],
      ["typeDecl", "$$ = $1;"]
    ],
    "expression": [
      ["innerExpression", "$$ = $1;"],
      ["LAMBDA paramList optType RIGHTARROW expression", n("$$ = new yy.Function(undefined, $2, [$5], $3);")],
      ["innerExpression MATCH caseList", n("$$ = new yy.Match($1, $3);")],
      ["ifThenElse", "$$ = $1;"]
    ],
    "callArgument": [
      ["( expression )", n("$$ = $2;")],
      ["! ( expression )", n("$$ = new yy.UnaryBooleanOperator($1, $3);")],
      ["accessor", "$$ = $1;"],
      ["callArgument @ callArgument", n("$$ = new yy.Access($1, $3);")],
      ["callArgument MATH callArgument", n("$$ = new yy.BinaryNumberOperator($2, $1, $3);")],
      ["callArgument CONCAT callArgument", n("$$ = new yy.BinaryStringOperator($2, $1, $3);")],
      ["callArgument + callArgument", n("$$ = new yy.BinaryNumberOperator($2, $1, $3);")],
      ["callArgument - callArgument", n("$$ = new yy.BinaryNumberOperator($2, $1, $3);")],
      ["callArgument BOOLOP callArgument", n("$$ = new yy.BinaryBooleanOperator($2, $1, $3);")],
      ["callArgument COMPARE callArgument", n("$$ = new yy.BinaryGenericOperator($2, $1, $3);")],
      ["callArgument WITH callArgument", n("$$ = new yy.With($1, $3);")],
      ["literal", "$$ = $1;"]
    ],
    "innerExpression": [
      ["call", "$$ = $1;"],
      ["callArgument", "$$ = $1;"]
    ],
    "caseList": [
      ["| CASE pattern = expression", "$$ = [new yy.Case($3, $5)];"],
      ["caseList | CASE pattern = expression", "$$ = $1; $1.push(new yy.Case($4, $6));"]
    ],
    "pattern": [
      ["innerPattern", "$$ = $1;"],
      ["identifier", n("$$ = new yy.Pattern($1, []);")]
    ],
    "innerPattern": [
      ["( identifier patternIdentifiers )", n("$$ = new yy.Pattern($2, $3);")]
    ],
    "patternIdentifiers": [
      ["identifier", "$$ = [$1];"],
      ["innerPattern", "$$ = [$1];"],
      ["patternIdentifiers innerPattern", "$$ = $1; $1.push($2);"],
      ["patternIdentifiers identifier", "$$ = $1; $1.push($2);"]
    ],
    "ifThenElse": [
      ["IF innerExpression THEN innerExpression ELSE innerExpression", n("$$ = new yy.IfThenElse($2, [$4], [$6]);")]
    ],

    // type Maybe a = Some a | None
    "dataDecl": [
      ["TYPE IDENTIFIER optDataParamList = dataOrAlias", n(
        "$$ = Array.isArray($5) ? ($5.length == 1 ? new yy.TypeName($5[0].name, $5[0].vars): new yy.Data($2, $3, $5)) : new yy.Type($2, $5, $3);"
      )]
    ],
    "dataOrAlias": [
      ["dataList", "$$ = $1"],
      ["declTypes", "$$ = $1"]
    ],
    "dataList": [
      ["IDENTIFIER optTypeParamList", "$$ = [new yy.Tag($1, $2)];"],
      ["dataList | IDENTIFIER optTypeParamList", "$$ = $1; $1.push(new yy.Tag($3, $4));"]
    ],

    // For type annotations (from the typegrammar module)
    "type": typegrammar.type,
    "declTypes": typegrammar.declTypes,
    "typeList": typegrammar.typeList,
    "optTypeParamList": typegrammar.optTypeParamList,
    "typeParamList": typegrammar.typeParamList,
    "optTypeFunctionArgList": typegrammar.optTypeFunctionArgList,
    "typeFunctionArgList": typegrammar.typeFunctionArgList,
    "optTypePairs": typegrammar.optTypePairs,
    "dataParamList": typegrammar.dataParamList,
    "optDataParamList": typegrammar.optDataParamList,

    "function": [
      ["IDENTIFIER paramList optType = expression optWhere", n("$$ = new yy.Function($1, $2, [$5], $3, $6);")]
    ],
    "binding": [
      ["IDENTIFIER optType = expression", n("$$ = new yy.Let($1, $4, $2);")]
    ],
    "paramList": [
      ["( )", "$$ = [];"],
      ["param", "$$ = [$1];"],
      ["paramList ( )", "$$ = $1;"],
      ["paramList param", "$$ = $1; $1.push($2);"]
    ],
    "param": [
      ["IDENTIFIER", n("$$ = new yy.Arg($1);")],
      ["( IDENTIFIER : type )", n("$$ = new yy.Arg($2, $4);")]
    ],
    "optType": [
      ["", ""],
      [": type", "$$ = $2"]
    ],
    "optWhere": [
      ["", "$$ = [];"],
      ["WHERE whereDecls", "$$ = $2;"]
    ],
    "whereDecls": [
      ["whereDecl", "$$ = [$1];"],
      ["whereDecls whereDecl", "$$ = $1; $1.push($2);"]
    ],
    "whereDecl": [
      ["dataDecl", "$$ = $1;"],
      ["IDENTIFIER paramList optType = block optWhere", n("$$ = new yy.Function($1, $2, $5, $3, $6);")],
      ["IDENTIFIER paramList optType = expression", n("$$ = new yy.Function($1, $2, [$5], $3, []);")]
    ],

    "call": [
      ["accessor argList", n("$$ = new yy.Call($1, $2);")],
      ["( expression ) argList", n("$$ = new yy.Call($2, $4);")]
    ],
    "argList": [
      ["( )", "$$ = [];"],
      ["callArgument", "$$ = [$1];"],
      ["argList ( )", "$$ = $1;"],
      ["argList callArgument", "$$ = $1; $1.push($2);"]
    ],
    "tuple": [
      ["( innerExpression , tupleList )", n("$4.unshift($2); $$ = new yy.Tuple($4);")]
    ],
    "tupleList": [
      ["innerExpression", "$$ = [$1];"],
      ["tupleList , innerExpression", "$$ = $1; $1.push($3);"]
    ],
    "literal": [
      ["NUMBER", n("$$ = new yy.Number($1);")],
      ["STRING", n("$$ = new yy.String($1);")],
      ["BOOLEAN", n("$$ = new yy.Boolean($1);")],
      ["tuple", "$$ = $1;"],
      ["[ optValues ]", n("$$ = new yy.Array($2);")],
      ["object", "$$ = $1;"]
    ],
    "object": [
      ["{ optPairs }", n("$$ = new yy.Object($2);")]
    ],
    "optValues": [
      ["", "$$ = [];"],
      ["arrayValues", "$$ = $1;"]
    ],
    "arrayValues": [
      ["expression", "$$ = [$1];"],
      ["arrayValues , expression", "$$ = $1; $1.push($3);"],
      ["arrayValues , expression", "$$ = $1; $1.push($3);"]
    ],
    "optPairs": [
      ["", "$$ = {};"],
      ["keyPairs", "$$ = $1;"]
    ],
    "keyPairs": [
      ["keywordOrIdentifier : expression", "$$ = {}; $$[$1] = $3;"],  
      ["keywordOrIdentifier", "$$ = {}; $$[$1] = new yy.Identifier($1);"], 
      ["keyPairs , keywordOrIdentifier : expression", "$$ = $1; $1[$3] = $5;"],  
      ["keyPairs , keywordOrIdentifier", "$$ = $1; $1[$3] = new yy.Identifier($3);"] 
    ],
    "accessor": [
      ["IDENTIFIER", n("$$ = new yy.Identifier($1);")],
      ["accessor . keywordOrIdentifier", n("$$ = new yy.PropertyAccess($1, $3);")],
      ["( expression ) . keywordOrIdentifier", n("$$ = new yy.PropertyAccess($2, $5);")]
    ],
    "keywordOrIdentifier": typegrammar.keywordOrIdentifier,
    "identifier": [
      ["IDENTIFIER", n("$$ = new yy.Identifier($1);")]
    ]
  }
};
exports.grammar = grammar;
