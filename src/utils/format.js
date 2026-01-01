export function formatRupiahInput(value) {
  if (value === null || value === undefined) return "";
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatRupiahDisplay(value) {
  if (value === null || value === undefined) return "Rp.0";
  return "Rp." + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/* 🔴 INI YANG HILANG */
export function formatRupiah(value) {
  if (value === null || value === undefined) return "Rp.0";

  const number = Number(value);
  if (isNaN(number)) return "Rp.0";

  return (
    "Rp." +
    number
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}
