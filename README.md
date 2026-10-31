# tree-sitter-mc

Tree-sitter grammar for MC (`.mc`), maintained alongside the memc compiler.
The handwritten compiler parser defines accepted syntax. This editor grammar is a separate
implementation checked against the compiler's golden language and conformance fixtures.
It does not replace compiler diagnostics or semantic checks.

Generated parsers use Tree-sitter ABI 15 (Tree-sitter 0.25 or newer, Neovim 0.11 or newer).
This package contains no highlight, injection, or other query files. Installing its parser
alone does not enable highlighting; consumers supply their own queries.

## Build

Building memc requires Node.js, a C toolchain, and `tree-sitter-cli` 0.25.6:

```sh
cargo install tree-sitter-cli --version 0.25.6 --locked
cargo build --locked
```

Cargo regenerates and compiles the editor parser when the editor grammar, scanner, or compiler
lexer/parser/token sources change. Generated artifacts stay in Cargo's `OUT_DIR`; source files
remain untouched. Parser generation failures fail the build. Plain `cargo build` generates the
parser but does not run parity tests. `scripts/check` runs those tests.

In an exported standalone repository, the generated sources are already present. Editors need
only a C compiler to compile `src/parser.c` and `src/scanner.c` with `src` as an include directory.
To regenerate standalone sources, install the same CLI and Node.js, then run:

```sh
tree-sitter generate --abi 15
```

## Export and publish

From the compiler checkout:

```sh
scripts/check
scripts/export-tree-sitter ../tree-sitter-mc
```

The export creates or updates only its grammar, metadata, README, generated sources and headers,
and external scanner. Other files, including `.git` and consumer queries, are retained.
The destination may be a checkout of a separate `tree-sitter-mc` GitHub repository.
Review and publish it using ordinary Git operations:

```sh
git -C ../tree-sitter-mc add grammar.js tree-sitter.json README.md src
git -C ../tree-sitter-mc diff --cached
git -C ../tree-sitter-mc commit -m "Update MC parser"
git -C ../tree-sitter-mc push
```

For the initial publication, create the GitHub repository and initialize the export directory
with `git init`, then add its remote before pushing. Subsequent exports use the same command.
Make grammar changes in the compiler repository; the published repository is a distribution copy.

Neovim can load a locally compiled parser from a runtime directory:

```sh
mkdir -p /path/to/nvim-runtime/parser
cc -shared -fPIC -I../tree-sitter-mc/src ../tree-sitter-mc/src/parser.c \
  ../tree-sitter-mc/src/scanner.c -o /path/to/nvim-runtime/parser/mc.so
```

Register `.mc` files as filetype `mc` and add that directory to `runtimepath`:

```lua
vim.filetype.add({ extension = { mc = 'mc' } })
vim.opt.runtimepath:append('/path/to/nvim-runtime')
```

Editor installers should use language name `mc`, sources `src/parser.c` and `src/scanner.c`,
and include directory `src`. The shared-library extension and compiler flags depend on the host.
