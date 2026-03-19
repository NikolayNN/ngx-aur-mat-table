import {TableConfig, TimelineConfig, TimelineLineConfig} from "../model/ColumnConfig";
import {AbstractProvider} from "./AbstractProvider";
import {TableRow} from "../model/TableRow";
import {EmptyValue} from "../model/EmptyValue";

export class TimelineProvider<T> extends AbstractProvider {
  public static readonly COLUMN_NAME = 'tbl_timeline';
  public readonly isEnabled: boolean = true;
  public readonly markerColor: string;
  public readonly line: Required<TimelineLineConfig>;
  public readonly segmentColor?: (prev: TableRow<T>, next: TableRow<T>) => string;

  private static readonly LINE_DEFAULTS: Required<TimelineLineConfig> = {
    color: '#ccc',
    width: 2,
    style: 'solid',
    gapStyle: 'dashed'
  };

  constructor(config: TimelineConfig<T>) {
    super();
    this.line = {...TimelineProvider.LINE_DEFAULTS, ...config.line};
    this.markerColor = config.markerColor ?? '#ccc';
    this.segmentColor = config.segmentColor;
  }

  get COLUMN_NAME(): string {
    return TimelineProvider.COLUMN_NAME;
  }

  public addTimelineColumn(columns: string[]): TimelineProvider<T> {
    if (this.notHasKey(this.COLUMN_NAME, columns)) {
      columns.unshift(this.COLUMN_NAME);
    }
    return this;
  }

  public static create<T>(tableConfig: TableConfig<T>): TimelineProvider<T> {
    if (TimelineProvider.canCreate(tableConfig)) {
      return new TimelineProvider<T>(tableConfig.timelineCfg!);
    }
    return new TimelineProviderDummy<T>();
  }

  private static canCreate<T>(tableConfig: TableConfig<T>): boolean {
    return tableConfig.timelineCfg?.enable ?? false;
  }
}

export class TimelineProviderDummy<T> extends TimelineProvider<T> {
  public override readonly isEnabled = false;

  constructor() {
    super(EmptyValue.TIMELINE_CONFIG);
  }

  public override addTimelineColumn(columns: string[]): TimelineProviderDummy<T> {
    return this;
  }
}
