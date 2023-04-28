export interface ActionEvent<T> {
    action: string;
    value: T;
}

export interface RowActionContext {
    position?: 'start' | 'end';
    actions: ActionContext[];
}

export interface ActionContext {
    icon: string;
    action: string;
    color?: string;
    tooltip?: string;
}

export class RowActionProvider<T> {

    readonly COLUMN_NAME = 'tbl_actions';
    context: RowActionContext;

    constructor(ctx: RowActionContext, columns: string[]) {
        this.context = ctx;
        if (ctx.position === 'start') {
            columns.unshift(this.COLUMN_NAME);
        } else {
            columns.push(this.COLUMN_NAME);
        }
    }
}
