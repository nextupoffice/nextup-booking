import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabase/client";
import { formatRupiahDisplay } from "../utils/format";

export default function BookingTable() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [groupedData, setGroupedData] = useState({});
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

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (!data) return;

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
        user.role === "admin"
          ? (Number(b.dp) || 0) + (Number(b.pelunasan) || 0)
          : myIncome;
    });

    setGroupedData(grouped);
  };

  /* ================= MASTER TEAM ================= */
  const teamMaster = useMemo(() => {
    return Object.values(groupedData)
      .flatMap((m) => m.rows)
      .flatMap((b) => b.team_jobs || []);
  }, [groupedData]);

  const teamNames = [...new Set(teamMaster.map((j) => j.name).filter(Boolean))];
  const roleOptions = [...new Set(teamMaster.map((j) => j.role).filter(Boolean))];

  /* ================= SAVE ================= */
  const saveRevision = async () => {
    if (!window.confirm("Simpan perubahan booking ini?")) return;

    const { error } = await supabase
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
        team_jobs: editingBooking.team_jobs,
      })
      .eq("id", editingBooking.id);

    if (error) {
      alert("❌ Gagal menyimpan booking");
      return;
    }

    alert("✅ Booking berhasil diperbarui");
    setEditingBooking(null);
    setOriginalBooking(null);
  };

  return (
    <>
      <div className="card" style={{ width: "100%", overflow: "visible" }}>
        <h3>Data Booking</h3>

        {Object.keys(groupedData).map((month) => (
          <div key={month} style={{ marginTop: 24 }}>
            <h4>{month}</h4>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 900 }}>
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
                        <th key={h} style={th}>{h}</th>
                      ))}
                  </tr>
                </thead>

                <tbody>
                  {groupedData[month].rows.map((b) => {
                    const total =
                      user.role === "admin"
                        ? (Number(b.dp) || 0) + (Number(b.pelunasan) || 0)
                        : b._myIncome;

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
                            <td style={td}>{formatRupiahDisplay(b.dp)}</td>
                            <td style={td}>{formatRupiahDisplay(b.pelunasan)}</td>
                          </>
                        ) : (
                          <td style={td}>{formatRupiahDisplay(b._myIncome)}</td>
                        )}

                        <td style={{ ...td, color: "#cba58a" }}>
                          {formatRupiahDisplay(total)}
                        </td>

                        {user.role === "admin" && (
                          <td style={td}>
                            <button
                              onClick={() => {
                                const clone = JSON.parse(JSON.stringify({
                                  ...b,
                                  team_jobs: Array.isArray(b.team_jobs)
                                    ? b.team_jobs
                                    : [],
                                }));
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
            </div>
          </div>
        ))}
      </div>

      {/* ================= MODAL EDIT ================= */}
      {editingBooking && (
        <div style={modal}>
          <div style={modalBox}>
            <h3>Edit Booking</h3>

            {["client_name","phone","acara","date","time","location"].map((k) => (
              <input
                key={k}
                value={editingBooking[k] || ""}
                onChange={(e) =>
                  setEditingBooking({ ...editingBooking, [k]: e.target.value })
                }
              />
            ))}

            <input
              type="number"
              placeholder="DP"
              value={editingBooking.dp || 0}
              onChange={(e) =>
                setEditingBooking({ ...editingBooking, dp: +e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Pelunasan"
              value={editingBooking.pelunasan || 0}
              onChange={(e) =>
                setEditingBooking({ ...editingBooking, pelunasan: +e.target.value })
              }
            />

            <h4>Tim</h4>

            {editingBooking.team_jobs.map((j, i) => (
              <div key={i} style={{ display: "flex", gap: 6 }}>
                <select
                  value={j.name || ""}
                  onChange={(e) => {
                    const t = [...editingBooking.team_jobs];
                    t[i].name = e.target.value;
                    setEditingBooking({ ...editingBooking, team_jobs: t });
                  }}
                >
                  <option value="">Pilih Tim</option>
                  {teamNames.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                  <option value="Freelance">Freelance</option>
                </select>

                <select
                  value={j.role || ""}
                  onChange={(e) => {
                    const t = [...editingBooking.team_jobs];
                    t[i].role = e.target.value;
                    setEditingBooking({ ...editingBooking, team_jobs: t });
                  }}
                >
                  <option value="">Role</option>
                  {roleOptions.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>

                <input
                  type="number"
                  value={j.income || 0}
                  onChange={(e) => {
                    const t = [...editingBooking.team_jobs];
                    t[i].income = +e.target.value;
                    setEditingBooking({ ...editingBooking, team_jobs: t });
                  }}
                  placeholder="Rp"
                />

                <button
                  onClick={() =>
                    setEditingBooking({
                      ...editingBooking,
                      team_jobs: editingBooking.team_jobs.filter((_, x) => x !== i),
                    })
                  }
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              onClick={() =>
                setEditingBooking({
                  ...editingBooking,
                  team_jobs: [
                    ...editingBooking.team_jobs,
                    { name: "", role: "", income: 0 },
                  ],
                })
              }
            >
              + Tambah Tim
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveRevision}>Simpan</button>
              <button
                onClick={() => {
                  if (!window.confirm("Batalkan perubahan booking?")) return;
                  setEditingBooking(null);
                  setOriginalBooking(null);
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= STYLE ================= */
const th = { padding: 10, color: "#cba58a" };
const td = { padding: 10, borderBottom: "1px solid #222" };

const modal = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "4vh 12px",
  overflowY: "auto",
  zIndex: 99,
};

const modalBox = {
  background: "#111",
  padding: 20,
  width: 460,
  maxWidth: "100%",
  maxHeight: "92vh",
  overflowY: "auto",
  borderRadius: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
