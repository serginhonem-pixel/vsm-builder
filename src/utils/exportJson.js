export function exportJson(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `${name.replace(/\s+/g, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(href);
}
