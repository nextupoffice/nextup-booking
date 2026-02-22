import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { formatRupiahDisplay } from "../utils/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function BookingTable() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [groupedData, setGroupedData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("booking-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        fetchData
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    const months = Object.keys(groupedData);
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [groupedData]);

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (!data) {
      setGroupedData({});
      return;
    }

    const grouped = {};

    data.forEach((b) => {
      if (!b?.date) return;

      const monthKey = new Date(b.date).toLocaleString("id-ID", {
        month: "long",
        year: "numeric",
      });

      if (!grouped[monthKey]) {
        grouped[monthKey] = { rows: [], total: 0 };
      }

      grouped[monthKey].rows.push(b);

      grouped[monthKey].total +=
        user?.role === "admin"
          ? (Number(b.dp) || 0) + (Number(b.pelunasan) || 0)
          : 0;
    });

    setGroupedData(grouped);
  };

  /* ================= DOWNLOAD PDF ================= */
  const downloadPDF = () => {
    if (!selectedMonth || !groupedData[selectedMonth]) return;

    const doc = new jsPDF("p", "mm", "a4");
    const rows = groupedData[selectedMonth].rows;
    const totalIncome = groupedData[selectedMonth].total;

    autoTable(doc, {
      head: [["Client","Acara","Tanggal","Waktu","Lokasi","Total"]],
      body: rows.map((b) => [
        b.client_name,
        b.acara,
        b.date,
        b.time,
        b.location,
        formatRupiahDisplay(
          (Number(b.dp) || 0) + (Number(b.pelunasan) || 0)
        ),
      ]),
    });

    doc.text(
      `Total Income: ${formatRupiahDisplay(totalIncome)}`,
      14,
      doc.lastAutoTable.finalY + 10
    );

    doc.save(`Booking-${selectedMonth}.pdf`);
  };

  /* ================= SAVE EDIT ================= */
  const handleSave = async () => {
    await supabase
      .from("bookings")
      .update({
        client_name: editingBooking.client_name,
        phone: editingBooking.phone,
        acara: editingBooking.acara,
        dp: editingBooking.dp,
        pelunasan: editingBooking.pelunasan,
      })
      .eq("id", editingBooking.id);

    setEditingBooking(null);
    fetchData();
  };

  return (
    <>
      <div className="card" style={{ width: "100%" }}>
        <h3>Data Booking</h3>

        {/* BUTTON BULAN */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          {Object.keys(groupedData).map((month) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid #333",
                background: selectedMonth === month ? "#cba58a" : "#111",
                color: selectedMonth === month ? "#000" : "#cba58a",
                cursor: "pointer",
              }}
            >
              {month}
            </button>
          ))}

          {user?.role === "admin" && selectedMonth && (
            <button
              onClick={downloadPDF}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "none",
                background: "#cba58a",
                color: "#000",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Download PDF
            </button>
          )}
        </div>

        {/* TABLE */}
        {selectedMonth && groupedData[selectedMonth] && (
          <div>
            <table style={{ width: "100%", minWidth: 1000 }}>
              <thead>
                <tr>
                  {[
                    "Client",
                    "No HP",
                    "Acara",
                    "Tanggal",
                    "Waktu",
                    "Lokasi",
                    "DP",
                    "Pelunasan",
                    "Total",
                    "Aksi",
                  ].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {groupedData[selectedMonth].rows.map((b) => {
                  const total =
                    (Number(b.dp) || 0) + (Number(b.pelunasan) || 0);

                  return (
                    <tr key={b.id}>
                      <td style={td}>{b.client_name}</td>
                      <td style={td}>{b.phone}</td>
                      <td style={td}>{b.acara}</td>
                      <td style={td}>{b.date}</td>
                      <td style={td}>{b.time}</td>
                      <td style={td}>{b.location}</td>
                      <td style={td}>{formatRupiahDisplay(b.dp || 0)}</td>
                      <td style={td}>{formatRupiahDisplay(b.pelunasan || 0)}</td>
                      <td style={{ ...td, color: "#cba58a", fontWeight: 600 }}>
                        {formatRupiahDisplay(total)}
                      </td>
                      <td style={td}>
                        <button
                          style={editBtn}
                          onClick={() => setEditingBooking({ ...b })}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{
              textAlign: "right",
              marginTop: 12,
              fontWeight: 700,
              color: "#cba58a",
            }}>
              Total Bulan Ini:{" "}
              {formatRupiahDisplay(groupedData[selectedMonth].total || 0)}
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDIT */}
      {editingBooking && (
        <div style={overlay}>
          <div style={modal}>
            <h3>Edit Booking</h3>

            <input
              style={input}
              value={editingBooking.client_name || ""}
              onChange={(e) =>
                setEditingBooking({
                  ...editingBooking,
                  client_name: e.target.value,
                })
              }
              placeholder="Client Name"
            />

            <input
              style={input}
              value={editingBooking.phone || ""}
              onChange={(e) =>
                setEditingBooking({
                  ...editingBooking,
                  phone: e.target.value,
                })
              }
              placeholder="Phone"
            />

            <input
              style={input}
              value={editingBooking.acara || ""}
              onChange={(e) =>
                setEditingBooking({
                  ...editingBooking,
                  acara: e.target.value,
                })
              }
              placeholder="Acara"
            />

            <input
              style={input}
              type="number"
              value={editingBooking.dp || 0}
              onChange={(e) =>
                setEditingBooking({
                  ...editingBooking,
                  dp: e.target.value,
                })
              }
              placeholder="DP"
            />

            <input
              style={input}
              type="number"
              value={editingBooking.pelunasan || 0}
              onChange={(e) =>
                setEditingBooking({
                  ...editingBooking,
                  pelunasan: e.target.value,
                })
              }
              placeholder="Pelunasan"
            />

            <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
              <button style={saveBtn} onClick={handleSave}>
                Save
              </button>
              <button style={cancelBtn} onClick={() => setEditingBooking(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* STYLES */
const th = { padding: 10, color: "#cba58a", textAlign: "left" };
const td = { padding: 10, borderBottom: "1px solid #222" };

const editBtn = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #cba58a",
  background: "transparent",
  color: "#cba58a",
  cursor: "pointer",
};

const overlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const modal = {
  background: "#111",
  padding: 30,
  borderRadius: 12,
  width: 400,
  color: "#fff",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const input = {
  padding: 8,
  borderRadius: 6,
  border: "1px solid #333",
  background: "#1a1a1a",
  color: "#fff",
};

const saveBtn = {
  padding: "8px 16px",
  background: "#cba58a",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  cursor: "pointer",
};

const cancelBtn = {
  padding: "8px 16px",
  background: "#333",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  cursor: "pointer",
};