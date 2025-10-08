/**
 * Some errors used in the parser
 * - powered by `rollup-plugin-const-enum`
 */
declare const enum inline_error {}

declare const enum inline_warning {
  size_exceeded = 'The function size exceeded the limit($0) and will not be inlined',
  outer_identifier = "The function references outer identifier('$0') and will not be inlined",
  recursive_call = 'The function contains a recursive call and will not be inlined',
}
