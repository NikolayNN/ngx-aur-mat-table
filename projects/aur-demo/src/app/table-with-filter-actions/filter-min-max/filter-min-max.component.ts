import {Component, EventEmitter, Input, Output} from '@angular/core';
import {debounceTime, Subject} from 'rxjs';

export interface MinMax {
  min: number,
  max: number
}

@Component({
  selector: 'app-filter-min-max',
  templateUrl: './filter-min-max.component.html',
  styleUrls: ['./filter-min-max.component.scss']
})
export class FilterMinMaxComponent {

  @Input() debounceTime = 500;
  @Output() filter = new EventEmitter<MinMax>();

  _min: number = 0;
  _max: number = 200;

  private filterInputSubject = new Subject<MinMax>();

  constructor() {
    this.filterInputSubject.pipe(
      debounceTime(this.debounceTime)
    ).subscribe(value => this.filter.emit(value));
  }

  onKeyUp() {
    const v = {min: this._min, max: this._max};
    console.log(v);
    this.filterInputSubject.next(v);
  }

}
