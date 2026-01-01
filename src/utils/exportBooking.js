import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export function exportBookingToExcel(bookings) {
  if (!bookings || bookings.length === 0) {
    alert("Data booking kosong");
    return;
  }

  const formattedData = bookings.map((b, index) => ({
    No: index + 1,
    Client: b.client_name,
    "No HP": b.phone,
    Acara: b.acara,
    Tanggal: b.date,
    Waktu: b.time,
    Lokasi: b.location,
    DP: b.dp,
    Pelunasan: b.pelunasan,
    "Total Bayar": b.dp + b.pelunasan,
    Tim: b.team_jobs
      ?.map(
        (t) => `${t.name} (${t.role}) - Rp${t.income.toLocaleString("id-ID")}`
      )
      .join(", "),
    Dibuat: new Date(b.created_at).toLocaleString("id-ID"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Booking");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type: "application/octet-stream",
  });

  saveAs(blob, `Data-Booking-${new Date().toISOString()}.xlsx`);
}
