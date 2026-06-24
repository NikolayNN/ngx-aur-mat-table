import { Component } from '@angular/core';
import { NgxAurFilters, TableConfig, TableRow } from 'ngx-aur-mat-table';

interface Product { name: string; category: string; price: number; }

class CategoryContains extends NgxAurFilters.ContainsStringIgnoreCase<Product> {
  extractProperty(data: TableRow<Product>): string { return data.rowSrc.category; }
}

@Component({
  selector: 'app-table-with-header-cell-template',
  templateUrl: './table-with-header-cell-template.component.html',
  styleUrls: ['./table-with-header-cell-template.component.scss'],
  standalone: false,
})
export class TableWithHeaderCellTemplateComponent {
  tableConfig: TableConfig<Product> = {
    columnsCfg: [
      { key: 'name', name: 'Товар', valueConverter: v => v.name, sort: {} },
      { key: 'category', name: 'Категория', valueConverter: v => v.category },
      { key: 'price', name: 'Цена', valueConverter: v => v.price, align: 'right', sort: {} },
    ],
  };

  tableData: Product[] = [
    { name: 'Клавиатура', category: 'Периферия', price: 2500 },
    { name: 'Монитор', category: 'Дисплеи', price: 18000 },
    { name: 'Мышь', category: 'Периферия', price: 1200 },
  ];

  makeCategoryFilter(value: string): CategoryContains {
    return new CategoryContains(value);
  }
}
