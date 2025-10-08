import { describe, it, expect, vi } from 'vitest';
import * as acorn from 'acorn';
import { Rule } from '@/compiler/rules.js';

// Messages must match the ones declared in src/types/errors.d.ts
const SIZE_EXCEEDED = 'The function size exceeded the limit($0) and will not be inlined';
const OUTER_IDENTIFIER = "The function references outer identifier('$0') and will not be inlined";
const RECURSIVE_CALL = 'The function contains a recursive call and will not be inlined';

function parseFirstFunction(code: string) {
  const ast = acorn.parse(code, { ecmaVersion: 'latest' }) as any;
  // try direct function declaration
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration') return node;
    if (node.type === 'VariableDeclaration') {
      const decl = node.declarations && node.declarations[0];
      if (
        decl &&
        decl.init &&
        (decl.init.type === 'FunctionExpression' || decl.init.type === 'ArrowFunctionExpression')
      ) {
        return decl.init;
      }
    }
    if (
      node.type === 'ExpressionStatement' &&
      node.expression &&
      node.expression.type === 'FunctionExpression'
    ) {
      return node.expression;
    }
  }
  throw new Error('No function found in code');
}

describe('Rule', () => {
  it('sizeLimit: returns false and logs when size exceeded', () => {
    const body = ';;'.repeat(200); // enlarge body
    const code = `function big(){${body}}`;
    const fn = parseFirstFunction(code);
    const rule = new Rule({ maxSize: 10 } as any);

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(rule.sizeLimit(fn)).toBe(false);
    expect(spy).toHaveBeenCalledWith(SIZE_EXCEEDED.replace('$0', '10'));
    spy.mockRestore();
  });

  it('sizeLimit: returns true when within limit', () => {
    const code = `function small(){ return 1; }`;
    const fn = parseFirstFunction(code);
    const rule = new Rule({ maxSize: 1000 } as any);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(rule.sizeLimit(fn)).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('noOuterIdentifier: detects free outer identifier and logs', () => {
    const code = `function f(){ return OUTER_VAR; }`;
    const fn = parseFirstFunction(code);
    const rule = new Rule({ maxSize: 100 } as any);

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(rule.noOuterIdentifier(fn)).toBe(false);
    expect(spy).toHaveBeenCalledWith(OUTER_IDENTIFIER.replace('$0', 'OUTER_VAR'));
    spy.mockRestore();
  });

  it('noOuterIdentifier: allows local-only identifiers', () => {
    const code = `function f(a){ const b = 2; return a + b; }`;
    const fn = parseFirstFunction(code);
    const rule = new Rule({ maxSize: 100 } as any);

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(rule.noOuterIdentifier(fn)).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('noRecursiveCall: detects recursive call in named function', () => {
    const code = `function rec(){ return rec(); }`;
    const fn = parseFirstFunction(code);
    const rule = new Rule({ maxSize: 100 } as any);

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(rule.noRecursiveCall(fn)).toBe(false);
    expect(spy).toHaveBeenCalledWith(RECURSIVE_CALL);
    spy.mockRestore();
  });

  it('noRecursiveCall: does not flag anonymous functions', () => {
    const code = `const g = function(){ return g && 1; }`;
    const fn = parseFirstFunction(code);
    const rule = new Rule({ maxSize: 100 } as any);

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(rule.noRecursiveCall(fn)).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
