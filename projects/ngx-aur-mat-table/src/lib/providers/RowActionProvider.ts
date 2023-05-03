import {IconConfig} from "../model/TableConfig";

export interface ActionEvent<T> {
    action: string;
    value: T;
}

export interface RowActionConfig {
    actions: ActionConfig[];
    position?: 'start' | 'end';
}

export interface ActionConfig {
    action: string;
    icon: IconConfig<string>;
}

export class RowActionProvider<T> {

    readonly COLUMN_NAME = 'tbl_actions';
    context: RowActionConfig;

    constructor(ctx: RowActionConfig, columns: string[]) {
        this.context = ctx;
        if (ctx.position === 'start') {
            columns.unshift(this.COLUMN_NAME);
        } else {
            columns.push(this.COLUMN_NAME);
        }
    }
}
