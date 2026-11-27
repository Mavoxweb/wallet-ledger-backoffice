import { Pipe, PipeTransform } from '@angular/core';
import { formatCents, formatDateTime } from '../core/format/format';

/** `{{ 123456 | money }}` → "R$ 1.234,56". Valores sempre em centavos inteiros. */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(cents: number): string {
    return formatCents(cents);
  }
}

/** `{{ iso | dateTime }}` → "26/11/2026 14:32", no horário de Brasília. */
@Pipe({ name: 'dateTime' })
export class DateTimePipe implements PipeTransform {
  transform(iso: string): string {
    return formatDateTime(iso);
  }
}

@Pipe({ name: 'day' })
export class DayPipe implements PipeTransform {
  transform(iso: string): string {
    return formatDateTime(iso).slice(0, 10);
  }
}
