export class Rule {
  private readonly _opts: Opts;
  constructor(_opts: Opts) {
    this._opts = _opts;
  }

  sizeLimit(code: string): boolean {
    if (code.length > this._opts.maxSize) {
      console.log(inline_warning.size_exceeded.replace('$0', this._opts.maxSize.toString()));
      return false;
    }
    return true;
  }
}
