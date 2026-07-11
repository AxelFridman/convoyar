/** Export CSV/JSON para el admin (spec §9). */
function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadJSON(filename: string, data: unknown) {
  download(filename, JSON.stringify(data, null, 2), "application/json");
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  download(filename, rows.map((r) => r.map(esc).join(",")).join("\n"), "text/csv;charset=utf-8");
}
