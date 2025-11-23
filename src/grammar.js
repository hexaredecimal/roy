var typegrammar = require('./typegrammar').bnf;

var n = function (s) {
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
    ["left", "OPERATOR", ":"],
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
      ["openModule", "$$ = $1;"],
      ["statement", "$$ = $1;"],
      ["COMMENT", n("$$ = new yy.Comment($1);")]
    ],
    "openModule": [
      ["OPEN importPATH liftOrNot", n("$$ = $3 == null ? new yy.importIntoModule($2) : new yy.importIntoModule($2, $3);")],
    ],
    "liftOrNot": [
      ["", "$$ = null;"],
      ["( importLiftedIds )", "$$ = $2;"]
    ],
    "importPATH": [
      ["IDENTIFIER", "$$ = [$1];"],
      ["importPATH . IDENTIFIER", "$$ = $1; $$.push($3);"],
    ],
    "importLiftedIds": [
      ["funcName", "$$ = [$1];"],
      ["importLiftedIds , funcName", "$$ = $1; $$.push($3);"],
    ],

    "statement": [
      ["toplevel", "$$ = $1;"],
      ["annotation toplevel", "$$ = $2; $2.annotations = $1;"]
    ],
    "toplevel": [
      ["LET function", "$$ = $2;"],
      ["typeDecl", "$$ = $1;"],
      ["LET binding", "$$ = $2;"],
    ],
    "annotation": [
      ["# [ annotationArgs ]", "$$ = $3;"]
    ],
    "annotationArgs": [
      ["annotationArg", "$$ = [$1]"], 
      ["annotationArgs , annotationArg", "$$ = $1; $1.push($3);"]
    ],
    "annotationArg": [
      ["IDENTIFIER annotationArg2", "$$ = $2.length == 0 ? new yy.IdAnnotation($1) : new yy.FuncAnnotation($1, $2);"]
    ],
    "annotationArg2" : [
      ["", "$$ = [];"],
      ["( annotationArgValues )", "$$ = $2;"]
    ],

    "annotationArgValues" : [
      ["STRING", "$$ = [$1]"], 
      ["annotationArgValues , STRING", "$$ = $1; $1.push($3);"]
    ],
    
    "expression": [
      ["innerExpression", "$$ = $1;"],
      ["MATCH innerExpression IS caseList", n("$$ = new yy.Match($2, $4);")],
      ["ifThenElse", "$$ = $1;"],
      ["LET letInBindings IN innerExpression", n("$$ = new yy.LetIn($2, $4);")]
    ],
    "letInBindings": [  
        ["IDENTIFIER optType = innerExpression", "$$ = [{name: $1, value: $4, type: $2}];"],  
        ["letInBindings IDENTIFIER optType = innerExpression", "$$ = $1; $1.push({name: $2, value: $5, type: $3});"]  
    ],
    "callArgument": [
      ["( expression )", n("$$ = $2;")],
      ["( opName )", n("$$ = new yy.Identifier($2);")],
      ["accessor", "$$ = $1;"],
      ["innerExpression @ innerExpression", n("$$ = new yy.Call(new yy.Identifier($2), [$1, $3]);")],
      ["innerExpression MATH innerExpression", n("$$ = new yy.Call(new yy.Identifier($2), [$1, $3]);")],
      ["innerExpression CONCAT innerExpression", n("$$ = new yy.Call(new yy.Identifier($2), [$1, $3]);")],
      ["innerExpression + innerExpression", n("$$ = new yy.Call(new yy.Identifier($2), [$1, $3]);")],
      ["innerExpression - innerExpression", n("$$ = new yy.Call(new yy.Identifier($2), [$1, $3]);")],
      ["innerExpression BOOLOP innerExpression", n("$$ = new yy.Call(new yy.Identifier($2), [$1, $3]);")],
      ["innerExpression COMPARE innerExpression", n("$$ = new yy.Call(new yy.Identifier($2), [$1, $3]);")],
      ["innerExpression OPERATOR callArgument", n("$$ = new yy.Call(new yy.Identifier($2), [$1, $3]);")],
      ["innerExpression OPERATOR call", n("$$ = new yy.Call(new yy.Identifier($2), [$1, $3]);")],
      ["innerExpression : callArgument", n("$$ = new yy.Call(new yy.Identifier($2), [$1, $3]);")],
      ["innerExpression : call", n("$$ = new yy.Call(new yy.Identifier($2), [$1, $3]);")],
      ["callArgument WITH innerExpression", n("$$ = new yy.With($1, $3);")],
      ["LAMBDA paramList optType RIGHTARROW expression", n("$$ = new yy.Function(undefined, $2, [$5], $3);")],
      ["literal", "$$ = $1;"]
    ],
    "unaryExpression": [
      ["opName literal", n("$$ = new yy.Call(new yy.Identifier($1), [$2]);")],
      ["opName call", n("$$ = new yy.Call(new yy.Identifier($1), [$2]);")],
    ],
    "innerExpression": [
      ["callArgument", "$$ = $1;"],
      ["call", "$$ = $1;"],
      ["unaryExpression", "$$ = $1;"],
    ],
    "caseList": [
      ["| pattern = expression", "$$ = [new yy.Case($2, $4)];"],
      ["caseList | pattern = expression", "$$ = $1; $1.push(new yy.Case($3, $5));"]
    ],
    "pattern": [
      ["IDENTIFIER patternArgs", n("$$ = new yy.Pattern($1, $2);")],
      ["NUMBER", n("$$ = new yy.Number($1);")],
      ["STRING", n("$$ = new yy.String($1);")],
      ["BOOLEAN", n("$$ = new yy.Boolean($1);")],
      ["tuple", "$$ = $1;"],
      ["[ optValues ]", n("$$ = new yy.Array($2);")],
      ["object", "$$ = $1;"],
      ["listConstPattern", "$$ = $1;"]
    ],
    "patternArgs": [
      ["", "$$ = []"],
      ["patternIdentifiers", "$$ = $1"],
      ["( patternIdentifiers ) ", "$$ = $2"]
    ],
    "patternIdentifiers": [
      ["sumTypeArg", "$$ = [$1];"],
      ["patternIdentifiers sumTypeArg", "$$ = $1; $1.push($2);"]
    ],
    "listConstPattern" : [
      ["listConstPatternItems", n("$$ =new yy.ListConstPattern($1);")],
    ],
    "listConstPatternItems": [
      ["pattern", "$$ = [$1];"],
      ["listConstPatternItems : pattern", "$$ = $1; $1.push($3);"]
    ],
    "sumTypeArg": [
      ["IDENTIFIER", n("$$ = new yy.Pattern($1, []);")],
      ["NUMBER", n("$$ = new yy.Number($1);")],
      ["STRING", n("$$ = new yy.String($1);")],
      ["BOOLEAN", n("$$ = new yy.Boolean($1);")],
      ["tuple", "$$ = $1;"],
      ["[ optValues ]", n("$$ = new yy.Array($2);")],
      ["object", "$$ = $1;"]
    ],

    "ifThenElse": [
      ["IF innerExpression THEN innerExpression ELSE innerExpression", n("$$ = new yy.IfThenElse($2, [$4], [$6]);")]
    ],

    // type Maybe a = Some a | None
    "typeDecl": [
      ["TYPE IDENTIFIER optDataParamList = dataOrAlias", n(
        "$$ = Array.isArray($5) ? ($5.length == 1 ? new yy.Type($2, new yy.TypeName($5[0].name, $5[0].vars), $3) : new yy.Data($2, $3, $5)) : new yy.Type($2, $5, $3);"
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
      ["funcName paramList optType rhsValue optWhere", n("$$ = new yy.Function($1, $2, $4, $3, $5);")]  
    ], 
    "binding": [
      ["IDENTIFIER optType = expression", n("$$ = new yy.Let($1, $4, $2);")]
    ],
    "rhsValue": [  
      ["", "$$ = [null];"],  
      ["= expression", "$$ = [$2];"]  
    ],
    'funcName': [
      ["IDENTIFIER", "$$ = $1;"],
      ["( opName )", n("$$ = $2;")]
    ],
    "opName": [
      ["@", "$$ = $1;"],
      ["MATH", "$$ = $1;"],
      ["CONCAT", "$$ = $1;"],
      ["+", "$$ = $1;"],
      ["-", "$$ = $1;"],
      ["?", "$$ = $1;"],
      [":", "$$ = $1;"],
      ["BOOLOP", "$$ = $1;"],
      ["COMPARE", "$$ = $1;"],
      ["OPERATOR", "$$ = $1;"],
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
      ["funcName paramList optType = expression optWhere", n("$$ = new yy.Function($1, $2, [$5], $3, $6);")]
    ],

    "call": [
      ["accessor argList", n("$$ = new yy.Call($1, $2);")],
      ["( expression ) argList", n("$$ = new yy.Call($2, $4);")]
    ],
    "argList": [
      ["( )", "$$ = [];"],
      ["funcCallArg", "$$ = [$1];"],
      ["argList ( )", "$$ = $1;"],
      ["argList funcCallArg", "$$ = $1; $1.push($2);"]
    ],

    "funcCallArg": [
      ["literal", "$$ = $1;"],
      ["accessor", "$$ = $1;"],
      ["( expression )", n("$$ = $2;")],
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
       ["( )", n("$$ = new yy.Unit();")],
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
