import { CurrencyPipe } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

/** Montant en euros au format français : {{ 1094.76 | money }} → « 1 094,76 € ». */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  private readonly currency = new CurrencyPipe(inject(LOCALE_ID));

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return this.currency.transform(value, 'EUR', 'symbol', '1.2-2') ?? '';
  }
}
