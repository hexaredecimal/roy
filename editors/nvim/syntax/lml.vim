" Vim syntax file
" Language:     PiccodeScript
" Filenames:    *.llml


" quit when a syntax file was already loaded
if exists("b:current_syntax")
  finish
endif

" Disable spell checking of syntax.
syn spell notoplevel

" llml is case sensitive.

" lowercase identifier - the standard way to match
" syn match    llmlLCIdentifier /\<\(\l\|_\)\(\w\|'\)*\>/

syn match    llmlKeyChar    "|"

" Some convenient clusters
syn cluster  llmlAllErrs contains=llmlBraceErr,llmlBrackErr,llmlParenErr,llmlCommentErr,llmlEndErr,llmlThenErr

syn cluster  llmlAENoParen contains=llmlBraceErr,llmlBrackErr,llmlCommentErr,llmlEndErr,llmlThenErr

syn cluster  llmlContained contains=llmlTodo,llmlPreDef,llmlModParam,llmlModParam1,llmlPreMPRestr,llmlMPRestr,llmlMPRestr1,llmlMPRestr2,llmlMPRestr3,llmlModRHS,llmlFuncWith,llmlFuncStruct,llmlModTypeRestr,llmlModTRWith,llmlWith,llmlWithRest,llmlModType,llmlFullMod


" Enclosing delimiters
syn region   llmlEncl transparent matchgroup=llmlKeyword start="(" matchgroup=llmlKeyword end=")" contains=ALLBUT,@llmlContained,llmlParenErr
syn region   llmlEncl transparent matchgroup=llmlKeyword start="{" matchgroup=llmlKeyword end="}"  contains=ALLBUT,@llmlContained,llmlBraceErr
syn region   llmlEncl transparent matchgroup=llmlKeyword start="\[" matchgroup=llmlKeyword end="\]" contains=ALLBUT,@llmlContained,llmlBrackErr
syn region   llmlEncl transparent matchgroup=llmlKeyword start="#\[" matchgroup=llmlKeyword end="\]" contains=ALLBUT,@llmlContained,llmlBrackErr


" Comments
syn region llmlComment start="\/\/" end="$" contains=llmlComment,llmlTodo,@Spell
" syn region   llmlComment start="\%%" contains=llmlComment,llmlTodo,@Spell
syn keyword  llmlTodo contained TODO FIXME

syn keyword  llmlKeyword  let in function with when is 
syn keyword  llmlKeyword  type open if then else


syn keyword  llmlBoolean      true false
syn match    llmlConstructor  "(\s*)"
syn match    llmlConstructor  "\[\s*\]"
syn match    llmlConstructor  "#\[\s*\]"
syn match    llmlConstructor  "\u\(\w\|'\)*\>"

syn match llmlFnIdent "[a-zA-Z_][a-zA-Z0-9_]*\s*\ze("

" Module prefix
syn match    llmlModPath      "\u\(\w\|'\)*\."he=e-1

syn match    llmlCharacter    +#"\\""\|#"."\|#"\\\d\d\d"+
syn match    llmlCharErr      +#"\\\d\d"\|#"\\\d"+
syn region   llmlString       start=+"+ skip=+\\\\\|\\"+ end=+"+ contains=@Spell

syn match    llmlFunDef       "=>"
syn match    llmlOperator     "::"
syn match    llmlAnyVar       "\<_\>"
syn match    llmlKeyChar      "!"
syn match    llmlKeyChar      ";"
syn match    llmlKeyChar      "\*"
syn match    llmlKeyChar      "="

syn match    llmlNumber        "\<-\=\d\+\>"
syn match    llmlNumber        "\<-\=0[x|X]\x\+\>"
syn match    llmlReal          "\<-\=\d\+\.\d*\([eE][-+]\=\d\+\)\=[fl]\=\>"

" Synchronization
syn sync minlines=20
syn sync maxlines=500

hi def link llmlComment      Comment

hi def link llmlModPath      Include
hi def link llmlModule       Include
hi def link llmlModParam1    Include
hi def link llmlModType      Include
hi def link llmlMPRestr3     Include
hi def link llmlFullMod      Include
hi def link llmlModTypeRestr Include
hi def link llmlWith         Include
hi def link llmlMTDef        Include

hi def link llmlConstructor  Constant

hi def link llmlModPreRHS    Keyword
hi def link llmlMPRestr2     Keyword
hi def link llmlKeyword      Keyword
hi def link llmlFunDef       Keyword
hi def link llmlRefAssign    Keyword
hi def link llmlKeyChar      Keyword
hi def link llmlAnyVar       Keyword
hi def link llmlTopStop      Keyword
hi def link llmlOperator     Keyword
hi def link llmlThread       Keyword

hi def link llmlBoolean      Boolean
hi def link llmlAtom         Boolean
hi def link llmlCharacter    Character
hi def link llmlNumber       Number
hi def link llmlReal         Float
hi def link llmlString       String
hi def link llmlType         Type
hi def link llmlTodo         Todo
hi def link llmlEncl         Keyword
hi def link llmlFnIdent      Function

let b:current_syntax = "llml"

" vim: ts=8
