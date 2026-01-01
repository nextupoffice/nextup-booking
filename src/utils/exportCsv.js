export function exportCSV(filename, rows) {
  const csv = [
    Object.keys(rows[0]).join(","),
    ...rows.map(r => Object.values(r).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
