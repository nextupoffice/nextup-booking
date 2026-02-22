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
  const [teamList, setTeamList] = useState([]);

  /* ================= FETCH TEAM ================= */
  const fetchTeam = async () => {
    const { data } = await supabase.from("team").select("*");
    setTeamList(data || []);
  };

  /* ================= FETCH BOOKING ================= */
  const fetchData = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (!data) return setGroupedData({});

    const grouped = {};

    data.forEach((b) => {
      const monthKey = new Date(b.date).toLocaleString("id-ID", {
        month: "long",
        year: "numeric",
      });

      if (!grouped[monthKey])
        grouped[monthKey] = { rows: [], total: 0 };

      grouped[monthKey].rows.push(b);

      grouped[monthKey].total +=
        user?.role === "admin"
          ? (Number(b.dp) || 0) + (Number(b.pelunasan) || 0)
          : 0;
    });

    setGroupedData(grouped);
  };

  useEffect(() => {
    fetchData();
    fetchTeam();

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
    if (months.length > 0 && !selectedMonth)
      setSelectedMonth(months[months.length - 1]);
  }, [groupedData]);

  /* ================= PDF ================= */
  const downloadPDF = () => {
    if (!selectedMonth) return;

    const doc = new jsPDF();
    const rows = groupedData[selectedMonth].rows;

    autoTable(doc, {
      head: [["Client", "Acara", "Tanggal", "Total"]],
      body: rows.map((b) => [
        b.client_name,
        b.acara,
        b.date,
        formatRupiahDisplay(
          (Number(b.dp) || 0) + (Number(b.pelunasan) || 0)
        ),
      ]),
    });

    doc.save(`Booking-${selectedMonth}.pdf`);
  };

  /* ================= SAVE EDIT ================= */
  const handleSave = async () => {
    if (!editingBooking) return;

    await supabase
      .from("bookings")
      .update({
        client_name: editingBooking.client_name,
        phone: editingBooking.phone,
        acara: editingBooking.acara,
        dp: editingBooking.dp,
        pelunasan: editingBooking.pelunasan,
        team_detail: editingBooking.team_detail,
      })
      .eq("id", editingBooking.id);

    alert("Booking berhasil disimpan");
    setEditingBooking(null);
    fetchData();
  };

  /* ================= TEAM UPDATE ================= */
  const updateTeamMember = (index, field, value) => {
    const updated = [...editingBooking.team_detail];
    updated[index][field] = value;
    setEditingBooking({ ...editingBooking, team_detail: updated });
  };

  const addTeam = () => {
    const updated = [
      ...(editingBooking.team_detail || []),
      { name: "", role: "", nominal: 0 },
    ];
    setEditingBooking({ ...editingBooking, team_detail: updated });
  };

  const removeTeam = (index) => {
    const updated = editingBooking.team_detail.filter(
      (_, i) => i !== index
    );
    setEditingBooking({ ...editingBooking, team_detail: updated });
  };

  return (
    <>
      <div className="card">
        <h3>Data Booking</h3>

        {/* BULAN */}
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
              }}
            >
              {month}
            </button>
          ))}

          {user?.role === "admin" && selectedMonth && (
            <button onClick={downloadPDF} style={saveBtn}>
              Download PDF
            </button>
          )}
        </div>

        {/* TABLE */}
        {selectedMonth && groupedData[selectedMonth] && (
          <>
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={th}>Client</th>
                  <th style={th}>Acara</th>
                  <th style={th}>Tanggal</th>
                  <th style={th}>Total</th>
                  <th style={th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {groupedData[selectedMonth].rows.map((b) => (
                  <tr key={b.id}>
                    <td style={td}>{b.client_name}</td>
                    <td style={td}>{b.acara}</td>
                    <td style={td}>{b.date}</td>
                    <td style={td}>
                      {formatRupiahDisplay(
                        (Number(b.dp) || 0) +
                          (Number(b.pelunasan) || 0)
                      )}
                    </td>
                    <td style={td}>
                      <button
                        style={editBtn}
                        onClick={() =>
                          setEditingBooking({
                            ...b,
                            team_detail: b.team_detail || [],
                          })
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ textAlign: "right", marginTop: 10 }}>
              Total Bulan Ini:{" "}
              {formatRupiahDisplay(
                groupedData[selectedMonth].total
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL EDIT */}
      {editingBooking && (
        <div style={overlay}>
          <div style={modal}>
            <h3>Edit Booking</h3>

            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <input
                style={input}
                value={editingBooking.client_name || ""}
                onChange={(e) =>
                  setEditingBooking({
                    ...editingBooking,
                    client_name: e.target.value,
                  })
                }
                placeholder="Client"
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

              <h4 style={{ marginTop: 20 }}>Tim</h4>

              {editingBooking.team_detail?.map((t, i) => (
                <div key={i} style={teamBox}>
                  <select
                    style={input}
                    value={t.name}
                    onChange={(e) =>
                      updateTeamMember(i, "name", e.target.value)
                    }
                  >
                    <option value="">Pilih Nama</option>
                    {teamList.map((tm) => (
                      <option key={tm.id} value={tm.name}>
                        {tm.name}
                      </option>
                    ))}
                  </select>

                  <input
                    style={input}
                    value={t.role}
                    onChange={(e) =>
                      updateTeamMember(i, "role", e.target.value)
                    }
                    placeholder="Role"
                  />

                  <input
                    style={input}
                    type="number"
                    value={t.nominal}
                    onChange={(e) =>
                      updateTeamMember(i, "nominal", e.target.value)
                    }
                    placeholder="Nominal"
                  />

                  <button
                    style={cancelBtn}
                    onClick={() => removeTeam(i)}
                  >
                    Hapus
                  </button>
                </div>
              ))}

              <button style={editBtn} onClick={addTeam}>
                + Tambah Tim
              </button>
            </div>

            <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
              <button style={saveBtn} onClick={handleSave}>
                Save
              </button>
              <button
                style={cancelBtn}
                onClick={() => setEditingBooking(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= STYLE ================= */

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

const teamBox = {
  border: "1px solid #222",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
  display: "flex",
  flexDirection: "column",
  gap: 6,
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
  width: 500,
  color: "#fff",
  display: "flex",
  flexDirection: "column",
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
  padding: "6px 12px",
  background: "#333",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  cursor: "pointer",
};