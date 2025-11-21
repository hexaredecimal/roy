## Introduction
This document outlines the command line usage of the Llaml compiler.

- Repl (Read Evaluate Print Loop)
```sh
llml run repl
```

- Compile and Run a file
```sh
llml run main.rml
```

- Compile and output js
```sh
llml build stdout main.rml > main.js
```

- Compile and output an executable
```sh
llml build -exe -o main main.rml
```

- Print help info
```sh
llml help or llml
```
