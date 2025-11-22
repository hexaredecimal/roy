## Llaml

## Why
I forked the "Roy" project because the original dev gave up and I would like to use it
as a hands on learning tool for learning type inference and structural typing.
I also would like to use it to learn how does a language like ocaml combine 
imperative concepts (Such as loops and references) while still being a functional language.

## Features
- [X] No `do` block/Monads
- [X] Function currying
- [X] Structural typing (WIP)
- [X] Cli Improvements
- [X] Modules
- [X] Proper error messages
- [ ] Formatter/Pretty printer (WIP)
- [X] Include files
- [X] Pattern matching
- [X] Typed external functions
- [X] Annotations
- [X] Operator overloading
- [ ] Mutability/References
- [ ] Custom stdlib (With few external functions)
- [X] Build binaries (Using QuickJS as the runtime)
- [] Let in expression

## What I aim to achieve
```ocaml

open Std.Printf

let add a b = sum a b
  where
    sum a b = a + b

let main = 
  Print.print "{}" (add 10 10)
  
```


## References and study material
[Archived Roy](https://github.com/puffnfresh/roy) - This repository was archived by the owner on Nov 23, 2017. It is now read-only.

[Imperative to Functional Programming Succinctly](https://www.syncfusion.com/succinctly-free-ebooks/imperative)

[Functional Programming in OCaml](https://www.ps.uni-saarland.de/~smolka/drafts/prog2021.pdf)

[Learning F# by Designing Your Own Language by Oleksii Holub | JetBrains](http://youtube.com/watch?v=34C_7halqGw)

<a href="https://deepwiki.com/hexaredecimal/royml"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>

## Reference Projects
[Reason ML](https://reasonml.github.io/en/)

[Ocaml](https://ocaml.org/)

[Sml](https://smlfamily.github.io/)

[F#](https://fsharp.org/)

