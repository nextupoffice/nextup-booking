import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { formatRupiahDisplay } from "../utils/format";

export default function BookingTable() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [groupedData, setGroupedData] = useState({});
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

  const fetchData = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) return;

    const grouped = {};

    data.forEach((b) => {
      const monthKey = new Date(b.date).toLocaleString("id-ID", {
        month: "long",
        year: "numeric",
      });

      if (!grouped[monthKey]) {
        grouped[monthKey] = { rows: [], total: 0 };
      }

      const value =
        user.role === "admin"
          ? (b.dp || 0) + (b.pelunasan || 0)
          : b.team_split?.[user.username] || 0;

      grouped[monthKey].rows.push(b);
      grouped[monthKey].total += value;
    });

    setGroupedData(grouped);
  };

  /* =====================
     SAVE REVISI
  ===================== */
  const saveRevision = async () => {
    await supabase
      .from("bookings")
      .update({
        client_name: editingBooking.client_name,
        phone: editingBooking.phone,
        acara: editingBooking.acara,
        date: editingBooking.date,
        time: editingBooking.time,
        location: editingBooking.location,
        dp: editingBooking.dp,
        pelunasan: editingBooking.pelunasan,
        team_split: editingBooking.team_split,
      })
      .eq("id", editingBooking.id);

    setEditingBooking(null);
  };

  return (
    <div className="card">
      <h3>Data Booking</h3>

      {Object.keys(groupedData).map((month) => (
        <div key={month} style={{ marginTop: 24 }}>
          <h4>{month}</h4>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    "Client",
                    "No HP",
                    "Acara",
                    "Tanggal",
                    "Waktu",
                    "Lokasi",
                    user.role === "admin" ? "DP" : "Pendapatan",
                    user.role === "admin" ? "Pelunasan" : "",
                    "Total",
                    user.role === "admin" ? "Aksi" : "",
                  ]
                    .filter(Boolean)
                    .map((h) => (
                      <th key={h} style={th}>
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>

              <tbody>
                {groupedData[month].rows.map((b) => {
                  const dp = b.dp || 0;
                  const pelunasan = b.pelunasan || 0;
                  const pendapatan =
                    b.team_split?.[user.username] || 0;

                  const total =
                    user.role === "admin"
                      ? dp + pelunasan
                      : pendapatan;

                  return (
                    <tr key={b.id}>
                      <td style={td}>{b.client_name}</td>
                      <td style={td}>{b.phone}</td>
                      <td style={td}>{b.acara}</td>
                      <td style={td}>{b.date}</td>
                      <td style={td}>{b.time}</td>
                      <td style={td}>{b.location}</td>

                      {user.role === "admin" ? (
                        <>
                          <td style={td}>{formatRupiahDisplay(dp)}</td>
                          <td style={td}>
                            {formatRupiahDisplay(pelunasan)}
                          </td>
                        </>
                      ) : (
                        <td style={td}>
                          {formatRupiahDisplay(pendapatan)}
                        </td>
                      )}

                      <td style={{ ...td, color: "#cba58a" }}>
                        {formatRupiahDisplay(total)}
                      </td>

                      {user.role === "admin" && (
                        <td style={td}>
                          <button
                            onClick={() =>
                              setEditingBooking({ ...b })
                            }
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
          </div>

          <div style={{ textAlign: "right", marginTop: 8 }}>
            <strong>
              Total Bulan Ini:{" "}
              {formatRupiahDisplay(groupedData[month].total)}
            </strong>
          </div>
        </div>
      ))}

      {/* =====================
          MODAL EDIT
      ===================== */}
      {editingBooking && (
        <div style={modal}>
          <div style={modalBox}>
            <h3>Edit Booking</h3>

            {[
              ["Client", "client_name"],
              ["No HP", "phone"],
              ["Acara", "acara"],
              ["Tanggal", "date", "date"],
              ["Waktu", "time"],
              ["Lokasi", "location"],
            ].map(([label, key, type]) => (
              <input
                key={key}
                type={type || "text"}
                placeholder={label}
                value={editingBooking[key] || ""}
                onChange={(e) =>
                  setEditingBooking({
                    ...editingBooking,
                    [key]: e.target.value,
                  })
                }
              />
            ))}

            {user.role === "admin" && (
              <>
                <input
                  type="number"
                  placeholder="DP"
                  value={editingBooking.dp || 0}
                  onChange={(e) =>
                    setEditingBooking({
                      ...editingBooking,
                      dp: Number(e.target.value),
                    })
                  }
                />

                <input
                  type="number"
                  placeholder="Pelunasan"
                  value={editingBooking.pelunasan || 0}
                  onChange={(e) =>
                    setEditingBooking({
                      ...editingBooking,
                      pelunasan: Number(e.target.value),
                    })
                  }
                />
              </>
            )}

            <div style={{ marginTop: 12 }}>
              <button onClick={saveRevision}>Simpan</button>
              <button
                onClick={() => setEditingBooking(null)}
                style={{ marginLeft: 8 }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== STYLE ===== */
const th = {
  padding: 10,
  textAlign: "left",
  borderBottom: "1px solid #333",
  color: "#cba58a",
  fontSize: 13,
};

const td = {
  padding: 10,
  borderBottom: "1px solid #222",
  fontSize: 13,
};

const modal = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99,
};

const modalBox = {
  background: "#111",
  padding: 20,
  borderRadius: 8,
  width: 320,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
