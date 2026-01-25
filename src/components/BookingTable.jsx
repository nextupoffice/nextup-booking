import { useEffect, useState, useMemo } from "react";
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

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) return;

    const grouped = {};

    data.forEach((b) => {
      // ✅ FIX KRITIKAL LAPTOP (hindari render crash)
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

      const adminTotal =
        (Number(b.dp) || 0) + (Number(b.pelunasan) || 0);

      const value =
        user.role === "admin" ? adminTotal : myIncome;

      grouped[monthKey].rows.push({
        ...b,
        team_jobs: teamJobs,
        _myIncome: myIncome,
      });

      grouped[monthKey].total += value;
    });

    setGroupedData(grouped);
  };

  /* ================= MASTER DATA ================= */
  const teamMaster = useMemo(() => {
    return Object.values(groupedData)
      .flatMap((m) => m.rows)
      .flatMap((b) => b.team_jobs || []);
  }, [groupedData]);

  const teamNames = useMemo(
    () => [...new Set(teamMaster.map((j) => j.name).filter(Boolean))],
    [teamMaster]
  );

  const roleOptions = useMemo(
    () => [...new Set(teamMaster.map((j) => j.role).filter(Boolean))],
    [teamMaster]
  );

  /* ================= SAVE ================= */
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
        team_jobs: editingBooking.team_jobs,
      })
      .eq("id", editingBooking.id);

    setEditingBooking(null);
  };

  return (
    <div className="card" style={{ width: "100%", overflow: "visible" }}>
      <h3>Data Booking</h3>

      {Object.keys(groupedData).map((month) => (
        <div key={month} style={{ marginTop: 24 }}>
          <h4>{month}</h4>

          {/* ✅ FIX TABEL LAPTOP */}
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 900, // 🔥 penting untuk desktop
                borderCollapse: "collapse",
              }}
            >
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
                  const dp = Number(b.dp) || 0;
                  const pelunasan = Number(b.pelunasan) || 0;
                  const pendapatan = b._myIncome || 0;

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
                          <td style={td}>{formatRupiahDisplay(pelunasan)}</td>
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
                              setEditingBooking({
                                ...b,
                                team_jobs: b.team_jobs || [],
                              })
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

          {user.role === "admin" && (
            <div
              style={{
                textAlign: "right",
                marginTop: 10,
                fontWeight: 600,
                color: "#cba58a",
              }}
            >
              Total Bulan Ini:{" "}
              {formatRupiahDisplay(groupedData[month].total)}
            </div>
          )}
        </div>
      ))}

      {/* MODAL TIDAK DIUBAH */}
      {editingBooking && (
        <div style={modal}>
          <div style={modalBox}>{/* isi sama */}</div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLE ================= */
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
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "6vh",
  zIndex: 99,
};

const modalBox = {
  background: "#111",
  padding: 20,
  borderRadius: 10,
  width: 420,
  maxHeight: "88vh",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
