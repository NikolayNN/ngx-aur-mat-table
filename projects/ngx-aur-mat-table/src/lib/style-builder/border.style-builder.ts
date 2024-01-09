export class BorderStyleBuilder {
  private _top: string = '';
  private _bottom: string = '';
  private _right: string = '';
  private _left: string = '';

  top(width: string, style: BorderStyle, color: string): BorderStyleBuilder {
    this._top = `${width} ${style} ${color}`;
    return this;
  }

  bottom(width: string, style: BorderStyle, color: string): BorderStyleBuilder {
    this._bottom = `${width} ${style} ${color}`;
    return this;
  }

  right(width: string, style: BorderStyle, color: string): BorderStyleBuilder {
    this._right = `${width} ${style} ${color}`;
    return this;
  }

  left(width: string, style: BorderStyle, color: string): BorderStyleBuilder {
    this._left = `${width} ${style} ${color}`;
    return this;
  }

  allBorders(width: string, style: BorderStyle, color: string): BorderStyleBuilder {
    this._top = this._bottom = this._right = this._left = `${width} ${style} ${color}`;
    return this;
  }

  build(): string {
    let styles = '';
    if (this._top) styles += `border-top: ${this._top}; `;
    if (this._bottom) styles += `border-bottom: ${this._bottom}; `;
    if (this._right) styles += `border-right: ${this._right}; `;
    if (this._left) styles += `border-left: ${this._left}; `;
    return styles;
  }
}
export enum BorderStyle {
  SOLID = "solid",
  DOTTED = "dotted",
  DASHED = "dashed",
  DOUBLE = "double",
  GROOVE = "groove",
  RIDGE = "ridge",
  INSET = "inset",
  OUTSET = "outset",
  NONE = "none",
  HIDDEN = "hidden"
}

