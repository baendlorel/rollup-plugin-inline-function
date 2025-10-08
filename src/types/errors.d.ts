/**
 * Some errors used in the parser
 * - powered by `rollup-plugin-const-enum`
 */
declare const enum inline_error {}

declare const enum inline_warning {
  size_exceeded = 'The function size exceeded the limit($0) and will not be inlined',
}
