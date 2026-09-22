const nf = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export const fmt = (n: number) => `$${nf.format(Math.round(n))}`;
