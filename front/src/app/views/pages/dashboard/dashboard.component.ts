import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbCalendar, NgbDatepickerModule, NgbDateStruct, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { ApexOptions, NgApexchartsModule } from "ng-apexcharts";
import { ThemeCssVariableService, ThemeCssVariablesType } from '../../../core/services/theme-css-variable.service';
import { LucideAngularModule, CalendarIcon, CloudDownloadIcon, PrinterIcon, EllipsisIcon, EyeIcon, PencilIcon, TrashIcon, DownloadIcon, ArrowUpIcon, ArrowDownIcon } from 'lucide-angular';
import { getRevenueValues, getRevenueCategories } from '../../../core/mock-data/revenue.mock';

@Component({
    selector: 'app-dashboard',
    imports: [
        NgbDropdownModule,
        FormsModule,
        NgbDatepickerModule,
        NgApexchartsModule,
        LucideAngularModule
    ],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  readonly calendarIcon = CalendarIcon;
  readonly printerIcon = PrinterIcon;
  readonly cloudDownloadIcon = CloudDownloadIcon;
  readonly ellipsisIcon = EllipsisIcon;
  readonly eyeIcon = EyeIcon;
  readonly pencilIcon = PencilIcon;
  readonly trashIcon = TrashIcon;
  readonly downloadIcon = DownloadIcon;
  readonly arrowUpIcon = ArrowUpIcon;
  readonly arrowDownIcon = ArrowDownIcon;

  /**
   * NgbDatepicker
   */
  currentDate: NgbDateStruct = inject(NgbCalendar).getToday();

  /**
   * Apex chart
   */
  public customersChartOptions: ApexOptions | any;
  public ordersChartOptions: ApexOptions | any;
  public growthChartOptions: ApexOptions | any;
  public revenueChartOptions: ApexOptions | any;
  public monthlySalesChartOptions: ApexOptions | any;
  public cloudStorageChartOptions: ApexOptions | any;

  themeCssVariables = inject(ThemeCssVariableService).getThemeCssVariables();

  ngOnInit(): void {
    this.customersChartOptions = this.getCustomersChartOptions(this.themeCssVariables);
    this.ordersChartOptions = this.getOrdersChartOptions(this.themeCssVariables);
    this.growthChartOptions = this.getGrowthChartOptions(this.themeCssVariables);
    this.revenueChartOptions = this.getRevenueChartOptions(this.themeCssVariables);
    this.monthlySalesChartOptions = this.getMonthlySalesChartOptions(this.themeCssVariables);
    this.cloudStorageChartOptions = this.getCloudStorageChartOptions(this.themeCssVariables);
  }



  /**
   * Customerse chart options
   */
  getCustomersChartOptions(themeVariables: ThemeCssVariablesType) {
    return {
      series: [{
        name: '',
        data: [3844, 3855, 3841, 3867, 3822, 3843, 3821, 3841, 3856, 3827, 3843]
      }],
      chart: {
        type: "line",
        height: 60,
        sparkline: {
          enabled: !0
        }
      },
      colors: [themeVariables.primary],
      xaxis: {
        type: 'datetime',
        categories: [
          'Jan 01 2026',
          'Jan 02 2026',
          'Jan 03 2026',
          'Jan 04 2026',
          'Jan 05 2026',
          'Jan 06 2026',
          'Jan 07 2026',
          'Jan 08 2026',
          'Jan 09 2026',
          'Jan 10 2026',
          'Jan 11 2026',
        ],
      },
      yaxis: {
        min: 3820,
        max: 3870,
        tickAmount: 4,
        labels: {
          show: false,
        },
      },
      stroke: {
        width: 2,
        curve: "smooth"
      },
      markers: {
        size: 0
      },
    }
  };



  /**
   * Orders chart options
   */
  getOrdersChartOptions(themeVariables: ThemeCssVariablesType) {
    return {
      series: [{
        name: '',
        data: [36, 77, 52, 90, 74, 35, 55, 23, 47, 10, 63]
      }],
      chart: {
        type: "bar",
        height: 60,
        sparkline: {
          enabled: !0
        }
      },
      colors: [themeVariables.primary],
      plotOptions: {
        bar: {
          borderRadius: 2,
          columnWidth: "60%"
        }
      },
      xaxis: {
        type: 'datetime',
        categories: [
          'Jan 01 2026',
          'Jan 02 2026',
          'Jan 03 2026',
          'Jan 04 2026',
          'Jan 05 2026',
          'Jan 06 2026',
          'Jan 07 2026',
          'Jan 08 2026',
          'Jan 09 2026',
          'Jan 10 2026',
          'Jan 11 2026',
        ],
      },
      yaxis: {
        min: 0,
        max: 90,
        tickAmount: 4,
        labels: {
          show: false,
        },
      },
    }
  };



  /**
   * Growth chart options
   */
  getGrowthChartOptions(themeVariables: ThemeCssVariablesType) {
    return {
      series: [{
        name: '',
        data: [41, 45, 44, 46, 52, 54, 43, 74, 82, 82, 89]
      }],
      chart: {
        type: "line",
        height: 60,
        sparkline: {
          enabled: !0
        }
      },
      colors: [themeVariables.primary],
      xaxis: {
        type: 'datetime',
        categories: [
          'Jan 01 2026',
          'Jan 02 2026',
          'Jan 03 2026',
          'Jan 04 2026',
          'Jan 05 2026',
          'Jan 06 2026',
          'Jan 07 2026',
          'Jan 08 2026',
          'Jan 09 2026',
          'Jan 10 2026',
          'Jan 11 2026',
        ],
      },
      yaxis: {
        min: 40,
        max: 90,
        tickAmount: 4,
        labels: {
          formatter: function (val: number) {
            return val + '%';
          },
        },
      },
      stroke: {
        width: 2,
        curve: "smooth"
      },
      markers: {
        size: 0
      },
    }
  };



  /**
   * Revenue chart options
   */
  getRevenueChartOptions(themeVariables: ThemeCssVariablesType) {
    return {
      series: [{
        name: "Revenue",
        data: getRevenueValues()
      }],
      chart: {
        type: "line",
        height: '400',
        parentHeightOffset: 0,
        foreColor: themeVariables.secondary,
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      colors: [themeVariables.primary, themeVariables.danger, themeVariables.warning],
      grid: {
        padding: {
          bottom: -4,
        },
        borderColor: themeVariables.gridBorder,
        xaxis: {
          lines: {
            show: true
          }
        }
      },
      xaxis: {
        type: "datetime",
        categories: getRevenueCategories(),
        lines: {
          show: true
        },
        axisBorder: {
          color: themeVariables.gridBorder,
        },
        axisTicks: {
          color: themeVariables.gridBorder,
        },
        crosshairs: {
          stroke: {
            color: themeVariables.secondary,
          },
        },
      },
      yaxis: {
        title: {
          text: 'Revenue ( $1000 x )',
          style:{
            size: 9,
            color: themeVariables.secondary
          }
        },
        tickAmount: 4,
        tooltip: {
          enabled: true
        },
        crosshairs: {
          stroke: {
            color: themeVariables.secondary,
          },
        },
        labels: {
          offsetX: 0,
        },
      },
      markers: {
        size: 0,
      },
      stroke: {
        width: 2,
        curve: "straight",
      },
    }
  };



  /**
   * Monthly sales chart options
   */
  getMonthlySalesChartOptions(themeVariables: ThemeCssVariablesType) {
    return {
      series: [{
        name: 'Sales',
        data: [152,109,93,113,126,161,188,143,102,113,116,124]
      }],
      chart: {
        type: 'bar',
        height: '330',
        parentHeightOffset: 0,
        foreColor: themeVariables.secondary,
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      colors: [themeVariables.primary],  
      fill: {
        opacity: .9
      } , 
      grid: {
        padding: {
          bottom: -4
        },
        borderColor: themeVariables.gridBorder,
        xaxis: {
          lines: {
            show: true
          }
        }
      },
      xaxis: {
        type: 'category',
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        axisBorder: {
          color: themeVariables.gridBorder,
        },
        axisTicks: {
          color: themeVariables.gridBorder,
        },
      },
      yaxis: {
        title: {
          text: 'Number of Sales',
          style:{
            size: 9,
            color: themeVariables.secondary
          }
        },
        labels: {
          offsetX: 0,
        },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: 'center',
        fontFamily: themeVariables.fontFamily,
        itemMargin: {
          horizontal: 8,
          vertical: 0
        },
      },
      stroke: {
        width: 0
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '10px',
          fontFamily: themeVariables.fontFamily,
        },
        offsetY: -27
      },
      plotOptions: {
        bar: {
          columnWidth: "50%",
          borderRadius: 4,
          dataLabels: {
            position: 'top',
            orientation: 'vertical',
          }
        },
      }
    }
  }



  /**
   * Cloud storage chart options
   */
  getCloudStorageChartOptions(themeVariables: ThemeCssVariablesType) {
    return {
      series: [67],
      chart: {
        height: 260,
        type: "radialBar"
      },
      colors: [themeVariables.primary],
      plotOptions: {
        radialBar: {
          hollow: {
            margin: 15,
            size: "70%"
          },
          track: {
            show: true,
            background: themeVariables.gridBorder,
            strokeWidth: '100%',
            opacity: 1,
            margin: 5, 
          },
          dataLabels: {
            showOn: "always",
            name: {
              offsetY: -11,
              show: true,
              color: themeVariables.secondary,
              fontSize: "13px"
            },
            value: {
              color: themeVariables.secondary,
              fontSize: "30px",
              show: true
            }
          }
        }
      },
      fill: {
        opacity: 1
      },
      stroke: {
        lineCap: "round",
      },
      labels: ["Storage Used"]
    }
  };
  
}
