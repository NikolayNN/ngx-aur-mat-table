import {Component} from '@angular/core';
import {BooksGenerator} from "../shared/generator/BooksGenerator";
import {TableConfig} from "ngx-aur-mat-table";
import {Book} from "../shared/model/book";

@Component({
  selector: 'app-complex-object',
  templateUrl: './complex-object.component.html',
  styleUrls: ['./complex-object.component.scss']
})
export class ComplexObjectComponent {

  tableConfig: TableConfig<Book> = {
    columnsCfg: [
      {
        name: 'book id',
        key: 'id',
        valueConverter: v => v.id
      },
      {
        name: 'book name',
        key: 'name',
        valueConverter: v => v.name
      },
      {
        name: 'book Author',
        key: 'author',
        valueConverter: v => v.author.name
      }
    ],
    filterCfg: {enable: true}
  };

  tableData = BooksGenerator.generate(10);

}
