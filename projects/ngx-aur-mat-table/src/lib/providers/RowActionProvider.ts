import {ActionConfig} from "../model/ColumnConfig";

export interface ActionEvent<T> {
    action: string;
    value: T;
}

export class RowActionProvider<T> {

    readonly COLUMN_NAME = 'tbl_actions';
    config: ActionConfig;

    constructor(ctx: ActionConfig, columns: string[]) {
        this.config = ctx;
        if (ctx.position === 'start') {
            columns.unshift(this.COLUMN_NAME);
        } else {
            columns.push(this.COLUMN_NAME);
        }
    }
}
