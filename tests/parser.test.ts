import { describe, it, expect } from 'vitest';
import { IfParser } from '@/compiler/parser.js';

describe('IfParser basic behaviors', () => {
  const opts = { variables: { DEBUG: true, VAL: 7 } } as any;
  const parser = new IfParser(opts);

  it('evaluate should compute expressions using provided variables', () => {
    expect(parser.evaluate('DEBUG')).toBe(true);
    expect(parser.evaluate('VAL > 5')).toBe(true);
    expect(parser.evaluate('!!DEBUG')).toBe(true);
  });

  it('evaluate should throw on invalid expressions (unknown identifiers)', () => {
    expect(() => parser.evaluate('UNKNOWN_VAR + 1')).toThrow();
  });

  it('proceed should return null for files without recognized directives', () => {
    const code = loadjs('case3.js');
    expect(() => parser.proceed(code)).not.toThrow();
    const result = parser.proceed(code);
    expect(result).toBeNull();
  });

  it('proceed should run on a file with directives without throwing (basic smoke test)', () => {
    const code = loadjs('case2.js');
    expect(() => parser.proceed(code)).not.toThrow();
  });
});
