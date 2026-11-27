const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Centavos inteiros → "R$ 1.234,56". O espaço é comum, não o não separável do Intl. */
export function formatCents(cents: number): string {
  return currency.format(cents / 100).replace(/\s/g, ' ');
}

/** Data e hora no horário de Brasília: "26/11/2026 14:32". */
export function formatDateTime(iso: string): string {
  const parts = Object.fromEntries(
    dateTime.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return `${parts['day']}/${parts['month']}/${parts['year']} ${parts['hour']}:${parts['minute']}`;
}
