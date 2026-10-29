import { DatePipe } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

/** Date FR : {{ d | dateFr }} → « 20/07/2026 » ; {{ d | dateFr:true }} → « 20/07/2026 14:30 ». */
@Pipe({ name: 'dateFr' })
export class DateFrPipe implements PipeTransform {
  private readonly date = new DatePipe(inject(LOCALE_ID));

  transform(value: string | Date | null | undefined, withTime = false): string {
    if (!value) {
      return '—';
    }
    return this.date.transform(value, withTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy') ?? '';
  }
}
