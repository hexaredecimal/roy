## RoyML

## Why
I forked the "Roy" project because the original dev gave up and I would like to use it
as a hands on learning tool for learning type inference and structural typing.
I also would like to use it to learn how does a language like ocaml combine 
imperative concepts (Such as loops and references) while still being a functional language.

## Features
- [ ] References
- [X] No `do` block/Monads
- [X] Function currying
- [X] Structural typing (WIP)
- [X] Cli Improvements
- [ ] Modules (Golang inspired)
- [ ] Proper error messages
- [ ] Formatter/Pretty printer (WIP)
- [ ] Include files
- [ ] Pattern matching
- [ ] Typed external functions
- [ ] Operator overloading
- [ ] Mutability/References
- [ ] Custom stdlib (With few external functions)
- [ ] Build binaries (Using QuickJS as the runtime)

## What I aim to achieve
```ocaml

open Std.Printf

let add a b = sum a b
  where
    sum a b = a + b

let main = 
  Printf.printf "{}" (add 10 10)
  
```

## References and study material
[Archived Roy](https://github.com/puffnfresh/roy) - This repository was archived by the owner on Nov 23, 2017. It is now read-only.

[Imperative to Functional Programming Succinctly](https://www.syncfusion.com/succinctly-free-ebooks/imperative)

[Functional Programming in OCaml](https://www.ps.uni-saarland.de/~smolka/drafts/prog2021.pdf)

## Reference Projects
[Reason ML](https://reasonml.github.io/en/)

[Ocaml](https://ocaml.org/)

[Sml](https://smlfamily.github.io/)

[F#](https://fsharp.org/)

