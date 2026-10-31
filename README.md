# tree-sitter-mc

Tree-sitter grammar for MC (`.mc`), maintained alongside the memc compiler.
The handwritten compiler parser defines accepted syntax. This editor grammar is a separate
implementation checked against the compiler's golden language and conformance fixtures.
It does not replace compiler diagnostics or semantic checks.

Generated parsers use Tree-sitter ABI 15 (Tree-sitter 0.25 or newer, Neovim 0.11 or newer).
The package includes Neovim queries for highlighting, locals, comment injections, folds,
indentation, and text objects. See [editor setup](#editor-setup).

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
external scanner, and the six bundled query files. Other files, including `.git` and additional
consumer queries, are retained. Bundled query files are replaced on export; keep local
customizations in the editor's `after/queries/mc/` directory with a `; extends` modeline.
The destination may be a checkout of a separate `tree-sitter-mc` GitHub repository.
Review and publish it using ordinary Git operations:

```sh
git -C ../tree-sitter-mc add grammar.js tree-sitter.json README.md src queries
git -C ../tree-sitter-mc diff --cached
git -C ../tree-sitter-mc commit -m "Update MC parser"
git -C ../tree-sitter-mc push
```

For the initial publication, create the GitHub repository and initialize the export directory
with `git init`, then add its remote before pushing. Subsequent exports use the same command.
Make grammar changes in the compiler repository; the published repository is a distribution copy.

## Editor setup

Neovim can load a locally compiled parser from a runtime directory:

```sh
mkdir -p /path/to/nvim-runtime/parser
cc -shared -fPIC -I../tree-sitter-mc/src ../tree-sitter-mc/src/parser.c \
  ../tree-sitter-mc/src/scanner.c -o /path/to/nvim-runtime/parser/mc.so
```

Register
`.mc` files as filetype `mc`. Tree-sitter repositories store queries directly in `queries/`,
so copy them into the language subdirectory of your runtime directory first:

```sh
mkdir -p /path/to/nvim-runtime/queries/mc
cp ../tree-sitter-mc/queries/*.scm /path/to/nvim-runtime/queries/mc/
```

Configure Neovim:

```lua
vim.filetype.add({ extension = { mc = 'mc' } })
vim.opt.runtimepath:append('/path/to/nvim-runtime')
vim.api.nvim_create_autocmd('FileType', {
  pattern = 'mc',
  callback = function()
    vim.treesitter.start()
    vim.wo.foldmethod = 'expr'
    vim.wo.foldexpr = 'v:lua.vim.treesitter.foldexpr()'
    -- Requires nvim-treesitter for indentation.
    vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
  end,
})
```

Editor installers should use language name `mc`, sources `src/parser.c` and `src/scanner.c`,
and include directory `src`. The shared-library extension and compiler flags depend on the host.

### Query behavior

Highlights use syntax roles: declaration names, parameters, properties, nominal types, builtin
operations and variants, effects, and generic delimiters. No capitalization heuristic guesses
whether an ordinary name denotes a type or constant. Semantic coloring of references requires
compiler/LSP information. Locals expose lexical scopes, bindings and value references, excluding
field labels and pattern constructors. They do not implement type checking, generic argument
resolution, or declaration-order-aware name resolution. Neovim core does not consume locals;
plugins can use them for navigation or reference highlighting.

Injections use the optional Tree-sitter `comment` parser for annotations such as TODO. Without
that parser comments still highlight normally. MC has no general strings or embedded languages.
Folds cover declarations, bodies, effects, aggregate literals and multiline comments.
Indentation requires `nvim-treesitter`; text objects require `nvim-treesitter-textobjects` or a
compatible consumer. The text-object captures are `function`, `class`, `block`, `loop`,
`conditional`, `call`, `parameter`, `comment`, `return`, `assignment`, and `statement` (with
`.inner`/`.outer` where meaningful), plus `assignment.lhs` and `assignment.rhs`. Inner bodies
exclude braces; parameter outer ranges include an adjacent comma for swapping/deletion.

Queries follow [Neovim's query conventions](https://neovim.io/doc/user/treesitter/),
[nvim-treesitter indentation captures](https://github.com/nvim-treesitter/nvim-treesitter/blob/main/CONTRIBUTING.md),
and [nvim-treesitter-textobjects captures](https://github.com/nvim-treesitter/nvim-treesitter-textobjects).
