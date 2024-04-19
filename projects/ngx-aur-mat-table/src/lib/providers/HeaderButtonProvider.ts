import {AbstractProvider} from "./AbstractProvider";
import {TableHeaderButtonConfig} from "../model/ColumnConfig";

export class HeaderButtonProvider extends AbstractProvider {
  isEnabled: boolean;
  icon: string;
  color: string;
  background: string;

  constructor(cfg?: TableHeaderButtonConfig) {
    super();
    this.isEnabled = cfg?.enable ?? false;
    this.icon = cfg?.icon ?? 'more_vert';
    this.color = cfg?.color ?? 'black';
    this.background = cfg?.background ?? 'white';
  }
}

export class HeaderButtonProviderDummy extends HeaderButtonProvider {
  constructor() {
    super({enable: false});
  }
}
