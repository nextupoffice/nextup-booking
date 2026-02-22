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
  const [originalBooking, setOriginalBooking] = useState(null);

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

      const teamJobs = Array.isArray(b.team_jobs) ? b.team_jobs : [];

      const myJobs = teamJobs.filter((j) => {
        if (j.user_id && user?.id) return j.user_id === user.id;
        return j.name?.toLowerCase() === user?.username?.toLowerCase();
      });

      const myIncome = myJobs.reduce(
        (sum, j) => sum + (Number(j.income) || 0),
        0
      );

      grouped[monthKey].rows.push({
        ...b,
        team_jobs: teamJobs,
        _myIncome: myIncome,
      });

      grouped[monthKey].total +=
        user?.role === "admin"
          ? (Number(b.dp) || 0) + (Number(b.pelunasan) || 0)
          : myIncome;
    });

    setGroupedData(grouped);
  };

  /* ================= DOWNLOAD PDF ================= */
  const downloadPDF = () => {
    if (!selectedMonth || !groupedData[selectedMonth]) return;

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const rows = groupedData[selectedMonth].rows;
    const totalIncome = groupedData[selectedMonth].total;

    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    doc.setTextColor(203, 165, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("NEXTUP STUDIO", 14, 20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Monthly Booking Report", 14, 27);

    doc.setFontSize(11);
    doc.text(selectedMonth, 14, 33);

    doc.setDrawColor(203, 165, 138);
    doc.line(14, 38, pageWidth - 14, 38);

    autoTable(doc, {
      startY: 45,
      margin: { left: 14, right: 14 },
      head: [["Client","Acara","Tanggal","Waktu","Lokasi","Total"]],
      body: rows.map((b) => {
        const total =
          user?.role === "admin"
            ? (Number(b.dp) || 0) + (Number(b.pelunasan) || 0)
            : b._myIncome || 0;

        return [
          b.client_name,
          b.acara,
          b.date,
          b.time,
          b.location,
          formatRupiahDisplay(total),
        ];
      }),
      styles: {
        fontSize: 8,
        textColor: [255, 255, 255],
        fillColor: [25, 25, 25],
      },
      headStyles: {
        fillColor: [203, 165, 138],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setTextColor(203, 165, 138);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Total Income: ${formatRupiahDisplay(totalIncome)}`,
      14,
      finalY + 8
    );

    doc.save(`NEXTUP-Booking-${selectedMonth}.pdf`);
  };

  return (
    <>
      <div className="card" style={{ width: "100%" }}>
        <h3>Data Booking</h3>

        {/* ==== BUTTON BULAN ==== */}
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

        {/* ==== TABLE ==== */}
        {selectedMonth && groupedData[selectedMonth] && (
          <div style={{ marginTop: 24 }}>
            <h4>{selectedMonth}</h4>

            <div style={{ overflowX: "auto" }}>
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
                      user?.role === "admin" ? "DP" : "Pendapatan",
                      user?.role === "admin" ? "Pelunasan" : "",
                      "Total",
                      user?.role === "admin" ? "Aksi" : "",
                    ]
                      .filter(Boolean)
                      .map((h) => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                  </tr>
                </thead>

                <tbody>
                  {groupedData[selectedMonth].rows.map((b) => {
                    const total =
                      user?.role === "admin"
                        ? (Number(b.dp) || 0) + (Number(b.pelunasan) || 0)
                        : b._myIncome || 0;

                    return (
                      <tr key={b.id}>
                        <td style={td}>{b.client_name}</td>
                        <td style={td}>{b.phone}</td>
                        <td style={td}>{b.acara}</td>
                        <td style={td}>{b.date}</td>
                        <td style={td}>{b.time}</td>
                        <td style={td}>{b.location}</td>

                        {user?.role === "admin" ? (
                          <>
                            <td style={td}>{formatRupiahDisplay(b.dp || 0)}</td>
                            <td style={td}>{formatRupiahDisplay(b.pelunasan || 0)}</td>
                          </>
                        ) : (
                          <td style={td}>{formatRupiahDisplay(b._myIncome || 0)}</td>
                        )}

                        <td style={{ ...td, color: "#cba58a", fontWeight: 600 }}>
                          {formatRupiahDisplay(total)}
                        </td>

                        {user?.role === "admin" && (
                          <td style={td}>
                            <button
                              style={editBtn}
                              onClick={() => {
                                const clone = JSON.parse(
                                  JSON.stringify({
                                    ...b,
                                    team_jobs: Array.isArray(b.team_jobs)
                                      ? b.team_jobs
                                      : [],
                                  })
                                );
                                setOriginalBooking(clone);
                                setEditingBooking(clone);
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div
                style={{
                  textAlign: "right",
                  marginTop: 12,
                  fontWeight: 700,
                  color: "#cba58a",
                }}
              >
                Total Bulan Ini:{" "}
                {formatRupiahDisplay(groupedData[selectedMonth].total || 0)}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const th = { padding: 10, color: "#cba58a", textAlign: "left" };
const td = { padding: 10, borderBottom: "1px solid #222" };

const editBtn = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #cba58a",
  background: "transparent",
  color: "#cba58a",
  cursor: "pointer",
  fontWeight: 600,
};