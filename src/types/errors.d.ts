/**
 * Some errors used in the parser
 * - powered by `rollup-plugin-const-enum`
 * - `cdcp` means conditional compilation
 */
declare const enum cdcp_error {
  internal_last_required = "Internal error: 'last' is required for #elif and #else",
  no_else_or_elif_after_else = 'SyntaxError: Cannot have #else or #elif after #else',
  unexpected_directive = 'Unexpected directive $0',
  unmatched = "Unmatched '$0' at $1:$2",
  unclosed_blocks = 'Unclosed directive blocks found: $0',
  expr_error = '"$0" with error $1',
}

declare const enum cdcp_warning {
  not_enough_blocks = 'Warning: Must have at least 2 directives, got orphaned $0. Ignoring it.',
}
