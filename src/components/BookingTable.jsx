import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabase/client";
import { formatRupiahDisplay } from "../utils/format";

export default function BookingTable() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [groupedData, setGroupedData] = useState({});
  const [editingBooking, setEditingBooking] = useState(null);

  const [allTeamNames, setAllTeamNames] = useState([]);
  const [allRoles, setAllRoles] = useState([]);

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
    const names = new Set();
    const roles = new Set();

    data.forEach((b) => {
      const monthKey = new Date(b.date).toLocaleString("id-ID", {
        month: "long",
        year: "numeric",
      });

      if (!grouped[monthKey]) {
        grouped[monthKey] = { rows: [], total: 0 };
      }

      const teamJobs = Array.isArray(b.team_jobs) ? b.team_jobs : [];

      teamJobs.forEach((t) => {
        if (t.name) names.add(t.name);
        if (t.role) roles.add(t.role);
      });

      const myJob = teamJobs.find((j) => j.name === user.username);

      const value =
        user.role === "admin"
          ? (b.dp || 0) + (b.pelunasan || 0)
          : myJob?.income || 0;

      grouped[monthKey].rows.push({
        ...b,
        team_jobs: teamJobs,
      });

      grouped[monthKey].total += value;
    });

    setGroupedData(grouped);
    setAllTeamNames([...names]);
    setAllRoles([...roles]);
  };

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
                      <th key={h} style={th}>{h}</th>
                    ))}
                </tr>
              </thead>

              <tbody>
                {groupedData[month].rows.map((b) => {
                  const dp = b.dp || 0;
                  const pelunasan = b.pelunasan || 0;

                  const myJob = b.team_jobs.find(
                    (j) => j.name === user.username
                  );

                  const pendapatan = myJob?.income || 0;

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
                        <td style={td}>{formatRupiahDisplay(pendapatan)}</td>
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
        </div>
      ))}

      {/* ===== MODAL EDIT ===== */}
      {editingBooking && (
        <div style={modal}>
          <div style={modalBoxScrollable}>
            <h3>Edit Booking</h3>

            {user.role === "admin" && (
              <>
                <h4 style={{ color: "#cba58a" }}>Tim & Pembagian</h4>

                {editingBooking.team_jobs.map((job, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr auto",
                      gap: 6,
                    }}
                  >
                    {/* NAMA */}
                    <input
                      list={job.type !== "freelance" ? "team-names" : undefined}
                      value={job.name}
                      placeholder="Nama"
                      onChange={(e) => {
                        const updated = [...editingBooking.team_jobs];
                        updated[i].name = e.target.value;
                        setEditingBooking({ ...editingBooking, team_jobs: updated });
                      }}
                    />

                    {/* ROLE */}
                    <input
                      list="team-roles"
                      value={job.role}
                      placeholder="Role"
                      onChange={(e) => {
                        const updated = [...editingBooking.team_jobs];
                        updated[i].role = e.target.value;
                        setEditingBooking({ ...editingBooking, team_jobs: updated });
                      }}
                    />

                    {/* INCOME */}
                    <input
                      type="number"
                      value={job.income}
                      onChange={(e) => {
                        const updated = [...editingBooking.team_jobs];
                        updated[i].income = Number(e.target.value);
                        setEditingBooking({ ...editingBooking, team_jobs: updated });
                      }}
                    />

                    {/* REMOVE */}
                    <button
                      onClick={() =>
                        setEditingBooking({
                          ...editingBooking,
                          team_jobs: editingBooking.team_jobs.filter((_, idx) => idx !== i),
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
                        {
                          user_id: crypto.randomUUID(),
                          name: "",
                          role: "",
                          income: 0,
                          type: "internal",
                        },
                      ],
                    })
                  }
                >
                  + Tambah Tim
                </button>
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

            {/* ===== DATALIST ===== */}
            <datalist id="team-names">
              {allTeamNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>

            <datalist id="team-roles">
              {allRoles.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
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

const modalBoxScrollable = {
  background: "#111",
  padding: 20,
  borderRadius: 8,
  width: 420,
  maxHeight: "85vh",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
