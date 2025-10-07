import * as acorn from 'acorn';

export class Inline {
  private readonly _opts: Opts;
  constructor(_opts: Opts) {
    this._opts = _opts;
  }

  /**
   * Analyzing code with acorn
   */
  proceed(code: string): string | null {
    return null;
  }
}
