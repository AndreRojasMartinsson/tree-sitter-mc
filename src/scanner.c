#include "tree_sitter/parser.h"

// Logical && is one token, including when a unary borrow is expected.
bool tree_sitter_mc_external_scanner_scan(void *payload, TSLexer *lexer,
                                          const bool *valid_symbols) {
  (void)payload;
  if (!valid_symbols[0]) return false;
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
         lexer->lookahead == '\r' || lexer->lookahead == '\n' ||
         lexer->lookahead == '\v' || lexer->lookahead == '\f') {
    lexer->advance(lexer, true);
  }
  if (lexer->lookahead != '&') return false;
  lexer->advance(lexer, false);
  lexer->mark_end(lexer);
  if (lexer->lookahead == '&') return false;
  lexer->result_symbol = 0;
  return true;
}

void *tree_sitter_mc_external_scanner_create(void) { return NULL; }
void tree_sitter_mc_external_scanner_destroy(void *payload) { (void)payload; }
void tree_sitter_mc_external_scanner_reset(void *payload) { (void)payload; }
unsigned tree_sitter_mc_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}
void tree_sitter_mc_external_scanner_deserialize(void *payload, const char *buffer,
                                               unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}
