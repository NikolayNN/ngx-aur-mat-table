import {BorderStyleBuilder} from "./border.style-builder";

export class RowStyleBuilder {
  private _background: string = '';
  private _color: string = '';
  private _border: string = '';

  background(color: string): RowStyleBuilder {
    this._background = color;
    return this;
  }

  color(color: string): RowStyleBuilder {
    this._color = color;
    return this;
  }

  border(borderBuilderFn: (borderBuilder: BorderStyleBuilder) => BorderStyleBuilder): RowStyleBuilder {
    const borderBuilder = new BorderStyleBuilder();
    this._border = borderBuilderFn(borderBuilder).build();
    return this;
  }

  build(): string {
    let styles = '';
    if (this._background) styles += `background: ${this._background}; `;
    if (this._color) styles += `color: ${this._color}; `;
    if (this._border) styles += `${this._border}`;
    return styles;
  }
}
