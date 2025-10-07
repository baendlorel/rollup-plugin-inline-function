// const enum Dirv {
//   If = '#if',
//   // Else = '#else',
//   // Elif = '#elif',
//   Endif = '#endif',
// }

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

Reflect.set(globalThis, 'Dirv', {
  If: '#if',
  Else: '#else',
  Elif: '#elif',
  Endif: '#endif',
});

Reflect.set(globalThis, 'loadjs', (name: string) =>
  readFileSync(join(process.cwd(), '__mock__', name), 'utf-8')
);

Reflect.set(globalThis, 'cdcp_error', {
  no_else_or_elif_after_else: 'SyntaxError: Cannot have #else or #elif after #else',
  unexpected_directive: 'Unexpected directive $0',
  internal_last_required: "Internal error: 'last' is required for #elif and #else",
  unmatched: "Unmatched '$0' at $1:$2",
  unclosed_blocks: 'Unclosed directive blocks found: $0',
  expr_error: '"$0" with error $1',
});

Reflect.set(globalThis, 'cdcp_warning', {
  not_enough_blocks: 'Warning: Must have at least 2 directives, got orphaned $0. Ignoring it.',
});

declare global {
  function loadjs(name: string): string;
}
