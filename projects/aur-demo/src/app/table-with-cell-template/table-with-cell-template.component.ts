import { Component } from '@angular/core';
import { TableConfig } from 'ngx-aur-mat-table';

interface Task { title: string; status: 'todo' | 'doing' | 'done'; progress: number; }

@Component({
  selector: 'app-table-with-cell-template',
  templateUrl: './table-with-cell-template.component.html',
  styleUrls: ['./table-with-cell-template.component.scss'],
  standalone: false,
})
export class TableWithCellTemplateComponent {
  tableConfig: TableConfig<Task> = {
    filterCfg: {},
    columnsCfg: [
      { key: 'title', name: 'Задача', valueConverter: v => v.title },
      { key: 'status', name: 'Статус', valueConverter: v => v.status, align: 'center', sort: {} },
      { key: 'progress', name: 'Прогресс', valueConverter: v => v.progress, align: 'center' },
      { key: 'actions', name: '', valueConverter: () => '' },
    ],
  };

  tableData: Task[] = [
    { title: 'Свёрстать страницу', status: 'done', progress: 100 },
    { title: 'Написать тесты', status: 'doing', progress: 60 },
    { title: 'Code review', status: 'todo', progress: 0 },
  ];

  statusColor(status: string): string {
    return status === 'done' ? '#4caf50' : status === 'doing' ? '#ff9800' : '#9e9e9e';
  }

  onAction(t: Task): void {
    alert('Действие по задаче: ' + t.title);
  }
}
