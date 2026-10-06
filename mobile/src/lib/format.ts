/**
 * Mise en forme des montants, nombres et dates, identique à celle du web
 * (src/lib/format.ts). Purement de l'affichage : aucun calcul métier ici.
 */

/** Sépare les milliers par une espace insécable, comme le fait `fr-FR`. */
function groupThousands(value: number, maximumFractionDigits: number) {
  const fixed = value.toFixed(maximumFractionDigits);
  const [integer, fraction] = fixed.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const trimmed = fraction?.replace(/0+$/, '');
  return trimmed ? `${grouped},${trimmed}` : grouped;
}

export function formatMoney(amount: number, currency = 'XOF') {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    // Moteur JavaScript sans les données de la devise : repli lisible.
    return `${groupThousands(amount, 0)} ${currency}`;
  }
}

export function formatNumber(value: number) {
  try {
    return new Intl.NumberFormat('fr-FR').format(value);
  } catch {
    return groupThousands(value, 3);
  }
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  } catch {
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }
}

export function formatDateTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}

export function formatMonth(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  try {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
  } catch {
    return `${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }
}

/** « +12,5 % » / « -3 % » : variation signée, une décimale au plus. */
export function formatPercent(value: number, options: { signed?: boolean } = {}) {
  const sign = options.signed !== false && value > 0 ? '+' : '';
  return `${sign}${groupThousands(value, 1)} %`;
}

export function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Numéro de vente affiché, ex : « #00042 ». */
export function saleNumber(id: number) {
  return `#${String(id).padStart(5, '0')}`;
}

/** Saisie d'un nombre dans un champ texte : accepte la virgule décimale. Null si vide ou invalide. */
export function parseNumberInput(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, '').replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
