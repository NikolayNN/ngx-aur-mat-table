import {ColumnOffset} from "../ngx-aur-mat-table.component";

export class OffsetUtil {
  public static areNotEqual(offsets1: ColumnOffset[], offsets2: ColumnOffset[]): boolean {
    if (offsets1.length !== offsets2.length) {
      return true;
    }

    return offsets1.some((offset, index) => {
      const otherOffset = offsets2[index];
      return offset.left !== otherOffset.left || offset.width !== otherOffset.width || offset.key !== otherOffset.key;
    });
  }
}
