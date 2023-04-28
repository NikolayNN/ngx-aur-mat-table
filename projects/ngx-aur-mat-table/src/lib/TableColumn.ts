export interface TableColumn<T> {
  name: string;
  dataKey: string;
  position?: 'right' | 'left';
  isSortable?: boolean;
  headerIcon?: string;
  headerIconColor?: string;
  headerIconWithText?: boolean;
  headerTooltip?: string;
  valueIcon?: (value: T) => string;
  valueIconColor?: (value: T) => string;
  valueIconWithText?: boolean;
}
