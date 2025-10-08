import * as acorn from 'acorn';
import { simple as walkSimple, ancestor as walkAncestor } from 'acorn-walk';

export class Rule {
  private readonly _opts: Opts;
  constructor(_opts: Opts) {
    this._opts = _opts;
  }

  sizeLimit(fn: acorn.Function): boolean {
    if (fn.body.end - fn.body.start > this._opts.maxSize) {
      console.log(inline_warning.size_exceeded.replace('$0', this._opts.maxSize.toString()));
      return false;
    }
    return true;
  }

  /**
   * Pure function, no outer variable reference
   */
  noOuterIdentifier(fn: acorn.Function): boolean {
    // collect local bindings: params and function-local variable/function declarations
    const locals = new Set<string>();

    // add params
    if (fn.params) {
      for (const p of fn.params as any[]) {
        // cover simple Identifier params
        if (p && p.type === 'Identifier') locals.add(p.name);
        // skip patterns/complex params for simplicity
      }
    }

    // add function name (for named function expressions/declarations)
    if ((fn as any).id && (fn as any).id.name) locals.add((fn as any).id.name);

    let ok = true;

    // walk the function body and collect local declarations, then detect free identifiers
    walkSimple(
      fn.body as any,
      {
        VariableDeclaration(node: any) {
          for (const decl of node.declarations) {
            if (decl.id && decl.id.type === 'Identifier') locals.add(decl.id.name);
          }
        },
        FunctionDeclaration(node: any) {
          if (node.id && node.id.type === 'Identifier') locals.add(node.id.name);
        },
        Identifier(node: any, state: any) {
          // parent info is not provided here; rely on simple heuristic: if identifier is not local,
          // and not a property key (handled as MemberExpression's property when computed=false),
          // treat as outer identifier usage.
        },
      },
      undefined
    );

    // Simpler approach: scan for identifier usages and check ancestors to skip declarations/property names.
    let foundOuter: string | null = null;
    walkAncestor(
      fn.body as any,
      {
        Identifier(node: any, ancestors: any[]) {
          const parent = ancestors[ancestors.length - 2];
          // skip if this identifier is a declaration id
          if (!parent) return;
          const parentType = parent.type;
          if (
            (parentType === 'VariableDeclarator' && parent.id === node) ||
            (parentType === 'FunctionDeclaration' && parent.id === node) ||
            (parentType === 'FunctionExpression' && parent.id === node) ||
            (parentType === 'Property' && parent.key === node && !parent.computed) ||
            (parentType === 'MemberExpression' && parent.property === node && !parent.computed) ||
            (parentType === 'LabeledStatement' && parent.label === node) ||
            parentType === 'BreakStatement' ||
            parentType === 'ContinueStatement'
          ) {
            return;
          }

          // skip parameter identifiers (they appear in params, whose parent is the function node)
          if (
            parentType === 'Function' ||
            parentType === 'ArrowFunctionExpression' ||
            parentType === 'FunctionExpression'
          )
            return;

          if (!locals.has(node.name) && node.name !== 'undefined' && node.name !== 'console') {
            foundOuter = node.name;
          }
        },
      } as any
    );

    if (foundOuter) {
      console.log(inline_warning.outer_identifier.replace('$0', foundOuter));
      return false;
    }

    return true;
  }
  noRecursiveCall(fn: acorn.Function): boolean {
    const name = (fn as any).id && (fn as any).id.name;
    if (!name) return true; // anonymous functions: can't detect simple recursion

    let found = false;
    walkSimple(fn.body as any, {
      CallExpression(node: any) {
        if (node.callee && node.callee.type === 'Identifier' && node.callee.name === name) {
          found = true;
        }
      },
    });

    if (found) {
      console.log(inline_warning.recursive_call);
      return false;
    }
    return true;
  }
}
