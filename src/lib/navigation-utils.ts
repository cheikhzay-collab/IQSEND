/**
 * Safe navigation helpers that avoid window.open / window.alert in iFrame environments.
 */
export function safeOpenExternalUrl(url: string, newTab: boolean = true) {
  if (typeof window === 'undefined') return;
  const link = document.createElement('a');
  link.href = url;
  if (newTab) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function safeDialPhone(phone: string) {
  if (typeof window === 'undefined') return;
  const link = document.createElement('a');
  link.href = `tel:${phone}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
