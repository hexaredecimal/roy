## Introduction
This document outlines the command line usage of the RoyML compiler.

- Repl (Read Evaluate Print Loop)
```sh
rmlc run repl
```

- Compile and Run a file
```sh
rmlc run main.rml
```

- Compile and output js
```sh
rmlc build stdout main.rml > main.js
```

- Compile and output an executable
```sh
rmlc build -exe -o main main.rml
```

- Print help info
```sh
rmlc help or rmlc
```
