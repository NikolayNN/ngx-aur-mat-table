
export namespace StyleBuilder {
  export class Row {
    private _background: string = '';
    private _color: string = '';
    private _border: string = '';

    private _fontWeight: string = '';

    static builder(): Row {
      return new Row();
    }

    background(color: string): Row {
      this._background = color;
      return this;
    }

    color(color: string): Row {
      this._color = color;
      return this;
    }

    border(borderBuilderFn: (borderBuilder: BorderStyleBuilder) => BorderStyleBuilder): Row {
      const borderBuilder = new BorderStyleBuilder();
      this._border = borderBuilderFn(borderBuilder).build();
      return this;
    }

    fontWeight(weight: FontWeight): Row {
      this._fontWeight = weight;
      return this;
    }

    build(): string {
      let styles = '';
      if (this._background) styles += `background: ${this._background}; `;
      if (this._color) styles += `color: ${this._color}; `;
      if (this._fontWeight) styles += `font-weight: ${this._fontWeight}; `;
      if (this._border) styles += `${this._border}`;
      return styles;
    }
  }

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

  export enum FontWeight {
    NORMAL = "normal",
    BOLD = "bold",
    BOLDER = "bolder",
    LIGHTER = "lighter",
    W_100 = "100",
    W_200 = "200",
    W_300 = "300",
    W_400 = "400",
    W_500 = "500",
    W_600 = "600",
    W_700 = "700",
    W_800 = "800",
    W_900 = "900"
  }

}
