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

// inline warnings used by rule.ts implementation
Reflect.set(globalThis, 'inline_warning', {
  size_exceeded: 'The function size exceeded the limit($0) and will not be inlined',
  outer_identifier: "The function references outer identifier('$0') and will not be inlined",
  recursive_call: 'The function contains a recursive call and will not be inlined',
});

declare global {
  function loadjs(name: string): string;
}
