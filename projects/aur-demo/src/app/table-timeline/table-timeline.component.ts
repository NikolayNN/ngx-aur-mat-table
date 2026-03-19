import {Component} from '@angular/core';
import {TableConfig} from "ngx-aur-mat-table";

interface RouteStep {
  city: string;
  status: 'arrived' | 'in-transit' | 'pending';
  time: string;
}

@Component({
  selector: 'app-table-timeline',
  templateUrl: './table-timeline.component.html',
  styleUrls: ['./table-timeline.component.scss'],
  standalone: false
})
export class TableTimelineComponent {

  tableConfig: TableConfig<RouteStep> = {
    columnsCfg: [
      {
        name: 'City',
        key: 'city',
        valueConverter: v => v.city
      },
      {
        name: 'Status',
        key: 'status',
        valueConverter: v => v.status
      },
      {
        name: 'Time',
        key: 'time',
        valueConverter: v => v.time
      }
    ],
    timelineCfg: {
      enable: true,
      markerColor: '#1976d2',
      line: {
        color: '#b0bec5',
        width: 2,
        style: 'solid',
        gapStyle: 'dashed'
      },
      segmentColor: (prev, next) => {
        if (prev.rowSrc.status === 'arrived' && next.rowSrc.status === 'arrived') return '#4caf50';
        if (next.rowSrc.status === 'pending') return '#bdbdbd';
        return '#b0bec5';
      }
    },
    filterCfg: {
      enable: true,
      label: 'Search',
      placeholder: 'Filter...'
    }
  };

  tableConfigCustomMarker: TableConfig<RouteStep> = {
    columnsCfg: [
      {
        name: 'City',
        key: 'city',
        valueConverter: v => v.city
      },
      {
        name: 'Status',
        key: 'status',
        valueConverter: v => v.status
      },
      {
        name: 'Time',
        key: 'time',
        valueConverter: v => v.time
      }
    ],
    timelineCfg: {
      enable: true,
      line: {
        color: '#90a4ae',
        width: 2
      }
    }
  };

  tableData: RouteStep[] = [
    {city: 'Brest',    status: 'arrived',    time: '08:00'},
    {city: 'Baranovichi', status: 'arrived', time: '09:45'},
    {city: 'Minsk',    status: 'arrived',    time: '12:00'},
    {city: 'Borisov',  status: 'in-transit', time: '13:30'},
    {city: 'Orsha',    status: 'pending',    time: '—'},
    {city: 'Vitebsk',  status: 'pending',    time: '—'},
    {city: 'Gomel',    status: 'pending',    time: '—'},
  ];

  getMarkerClass(status: string): string {
    switch (status) {
      case 'arrived': return 'marker-arrived';
      case 'in-transit': return 'marker-transit';
      default: return 'marker-pending';
    }
  }

  getMarkerIcon(status: string): string {
    switch (status) {
      case 'arrived': return '✓';
      case 'in-transit': return '●';
      default: return '';
    }
  }
}
