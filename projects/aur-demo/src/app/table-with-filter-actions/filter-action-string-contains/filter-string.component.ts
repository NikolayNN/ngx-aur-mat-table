import {Component, EventEmitter, Input, Output} from '@angular/core';
import {debounceTime, Subject} from "rxjs";


@Component({
  selector: 'app-filter-string',
  templateUrl: './filter-string.component.html',
  styleUrls: ['./filter-string.component.scss']
})
export class FilterStringComponent {

  @Input() debounceTime = 500;
  @Output() filter = new EventEmitter<string>();

  _filterValue = '';

  private filterInputSubject = new Subject<string>();

  constructor() {
    this.filterInputSubject.pipe(debounceTime(this.debounceTime))
      .subscribe(value => this.filter.emit(value));
  }

  onKeyUp() {
    this.filterInputSubject.next(this._filterValue);
  }
}
