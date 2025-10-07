import * as acorn from 'acorn';

const REGEX = new RegExp(`^(${Dirv.If}|${Dirv.Endif}|${Dirv.Elif}|${Dirv.Else})\\b`);
export class IfParser {
  private readonly _opts: Opts;
  private readonly _keys: string[] = [];
  private readonly _values: any[] = [];
  constructor(_opts: Opts) {
    this._opts = _opts;
    const kv = Object.entries(this._opts.variables);
    for (let i = 0; i < kv.length; i++) {
      this._keys.push(kv[i][0]);
      this._values.push(kv[i][1]);
    }
  }

  /**
   * Analyzing code with acorn
   */
  proceed(code: string): string | null {
    const dirvBlocks = this.toDirvBlocks(code);
    if (dirvBlocks.length === 0) {
      return null;
    }

    const ifBlocks = this.toIfBlocks(dirvBlocks);
    return this.compile(code, ifBlocks);
  }

  toDirvBlocks(code: string): DirvBlock[] {
    const blocks: DirvBlock[] = [];
    const toBlock: typeof this.tryParseToBlock = (r, s, e) => this.tryParseToBlock(r, s, e);

    acorn.parse(code, {
      ecmaVersion: 'latest',
      /**
       * @param isBlock whether its a '/⋆ ... ⋆/' comment
       * @param text text inside the comment, excludes the boundaries
       * @param start start index, includes boundary
       * @param end end index, boundary + 1
       */
      onComment(isBlock, text, start, end) {
        if (isBlock) {
          return; // * Only allows non-block directives: '// #if ...'
        }

        const b = toBlock(text, start, end);
        b && blocks.push(b);
      },
    });
    return blocks;
  }

  /**
   * Parse the comment to a `IfMacroBlock`
   * @param raw trimmed comment text
   */
  private tryParseToBlock(raw: string, start: number, end: number): DirvBlock | null {
    raw = raw.replace(/(^|\n)[*\s]+/g, '');
    let dirv = null as Dirv | null;
    const expr = raw.replace(REGEX, (_, $1: Dirv) => ((dirv = $1), '')).trim();
    if (dirv === null) {
      return null;
    }

    let condition: boolean;
    switch (dirv) {
      case Dirv.If:
      case Dirv.Elif:
        condition = this.evaluate(expr);
        break;
      case Dirv.Else:
        condition = true;
        break;
      case Dirv.Endif:
        condition = false;
        break;
      default:
        throw new Error(cdcp_error.unexpected_directive.replace('$0', String(dirv)));
    }

    return { dirv, condition, start, end };
  }

  toIfBlocks(blocks: DirvBlock[]): IfBlock[] {
    if (blocks.length === 0) {
      return [];
    } else if (blocks.length === 1) {
      console.warn(cdcp_warning.not_enough_blocks.replace('$0', blocks[0].dirv));
      return [];
    }

    // syntax check first
    for (let i = 1; i < blocks.length; i++) {
      const cur = blocks[i].dirv;
      const last = blocks[i - 1].dirv;
      if (last === Dirv.Else && (cur === Dirv.Else || cur === Dirv.Elif)) {
        throw new Error(cdcp_error.no_else_or_elif_after_else);
      }
    }

    const result: IfBlock[] = [];
    const stack: IfBlock[] = [];

    const addIfBlock = (b: DirvBlock, last?: IfBlock): void => {
      let condition: boolean | null = true;

      if (b.dirv === Dirv.If) {
        condition = b.condition;

        // * Since #endif won't call this function, we can directly use 'else' here
        // `last` here is always truthy because only #if enteres will no `last` needed
      } else {
        if (!last) throw new Error(cdcp_error.internal_last_required);

        // * Here, last IfBlock can only be #if or #elif.
        // - if last is #else, it will be blocked by 'cdcp_error.syntax_no_else_or_elif_after_else' check above
        // - if last is #endif, it will not have been passed in here
        if (last.condition === true) {
          condition = null;
        } else if (last.condition === null) {
          // null should propagate down the #elif/#else chain
          condition = null;
        } else {
          condition = !last.condition && b.condition;
        }
      }

      const newIfBlock: IfBlock = {
        dirv: b.dirv,
        condition,
        children: [],

        ifStart: b.start,
        ifEnd: b.end,
        endifStart: NaN, // to be filled when '#endif' is found
        endifEnd: NaN, // to be filled when '#endif' is found
      };

      // ! Order of expressions below cannot be changed!
      if (stack.length === 0) {
        result.push(newIfBlock);
      } else {
        stack[stack.length - 1].children.push(newIfBlock);
      }
      stack.push(newIfBlock);
    };

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.dirv === Dirv.If) {
        addIfBlock(b);
        continue;
      }

      // Since we consider other 3 directives as 'endif' + 'if'
      // the 3 must have a corresponding '#if' to it
      // & original Dirv.Endif handler shares the same logic
      if (stack.length === 0) {
        throw new Error(
          cdcp_error.unmatched
            .replace('$0', String(b.dirv))
            .replace('$1', String(b.start))
            .replace('$2', String(b.end))
        );
      }
      const last = stack.pop() as IfBlock;
      last.endifStart = b.start;
      last.endifEnd = b.end;

      if (b.dirv === Dirv.Endif) {
        continue;
      }

      // $ Here we convert 'elif' and 'else' to 'endif' + 'if not previous condition'
      if (b.dirv === Dirv.Else) {
        addIfBlock(b, last);
        continue;
      }

      if (b.dirv === Dirv.Elif) {
        addIfBlock(b, last);
        continue;
      }
    }

    if (stack.length > 0) {
      throw new Error(cdcp_error.unclosed_blocks.replace('$0', JSON.stringify(stack)));
    }

    return result;
  }

  /**
   * Apply the transformations to the code
   * - Only handles `ifBlocks.length > 0` here, =0 will be returned outside
   */
  compile(code: string, ifBlocks: IfBlock[]): string {
    const keep: number[] = [0]; // if it chops first and last item, it will mean `drop`

    const visit = (ifBlock: IfBlock) => {
      if (!ifBlock.condition) {
        keep.push(ifBlock.ifStart, ifBlock.endifEnd);
        return;
      }

      keep.push(ifBlock.ifStart, ifBlock.ifEnd); // drop the `#if ...` line
      for (let i = 0; i < ifBlock.children.length; i++) {
        visit(ifBlock.children[i]);
      }
      keep.push(ifBlock.endifStart, ifBlock.endifEnd); // drop the `#endif ...` line
    };

    for (let i = 0; i < ifBlocks.length; i++) {
      visit(ifBlocks[i]);
    }

    // & now we get the indexes needs to be kept
    keep.push(code.length);

    const result: string[] = [];
    for (let i = 0; i < keep.length; i += 2) {
      result.push(code.slice(keep[i], keep[i + 1]));
    }

    return result.join('');
  }

  /**
   * & Most imaginative part
   */
  evaluate(expr: string): boolean {
    const fn = new Function(...this._keys, `return (${expr})`);
    try {
      const result = fn(...this._values);
      return Boolean(result);
    } catch (e) {
      throw new Error(
        cdcp_error.expr_error
          .replace('$0', expr)
          .replace('$1', e instanceof Error ? e.message : String(e))
      );
    }
  }
}
