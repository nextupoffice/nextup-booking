import { useEffect, useState, useMemo } from "react";
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
      if (!b.date) return;

      const monthKey = new Date(b.date).toLocaleString("id-ID", {
        month: "long",
        year: "numeric",
      });

      if (!grouped[monthKey])
        grouped[monthKey] = { rows: [], total: 0 };

      grouped[monthKey].rows.push(b);

      if (user?.role === "admin") {
        grouped[monthKey].total +=
          (Number(b.dp) || 0) + (Number(b.pelunasan) || 0);
      }
    });

    setGroupedData(grouped);
  };

  useEffect(() => {
    fetchData();
    fetchTeam();
  }, []);

  useEffect(() => {
    const months = Object.keys(groupedData);
    if (months.length > 0 && !selectedMonth)
      setSelectedMonth(months[months.length - 1]);
  }, [groupedData]);

  /* ================= TOTAL INCOME REALTIME ================= */
  const totalTeamIncome = useMemo(() => {
    if (!editingBooking?.team_jobs) return 0;
    return editingBooking.team_jobs.reduce(
      (acc, t) => acc + Number(t.income || 0),
      0
    );
  }, [editingBooking]);

  /* ================= SAVE EDIT ================= */
  const handleSave = async () => {
    if (!editingBooking) return;

    const cleanedTeam =
      editingBooking.team_jobs?.map((t) => ({
        name: t?.name?.trim() || "",
        role: t?.role?.trim() || "",
        income: Number(t?.income) || 0,
      })) || [];

    const { error } = await supabase
      .from("bookings")
      .update({
        client_name: editingBooking.client_name,
        acara: editingBooking.acara,
        date: editingBooking.date,
        time: editingBooking.time,
        location: editingBooking.location,
        dp: Number(editingBooking.dp) || 0,
        pelunasan: Number(editingBooking.pelunasan) || 0,
        team_jobs: cleanedTeam,
      })
      .eq("id", editingBooking.id);

    if (error) {
      alert("Gagal menyimpan booking");
      return;
    }

    alert("Booking berhasil disimpan");
    setEditingBooking(null);
    fetchData();
  };

  /* ================= TEAM CONTROL ================= */
  const updateTeamMember = (index, field, value) => {
    const updated = [...(editingBooking.team_jobs || [])];

    updated[index] = {
      ...updated[index],
      [field]: field === "income" ? Number(value) : value,
    };

    setEditingBooking({
      ...editingBooking,
      team_jobs: updated,
    });
  };

  const addTeam = () => {
    setEditingBooking({
      ...editingBooking,
      team_jobs: [
        ...(editingBooking.team_jobs || []),
        { name: "", role: "", income: 0 },
      ],
    });
  };

  const removeTeam = (index) => {
    setEditingBooking({
      ...editingBooking,
      team_jobs: editingBooking.team_jobs.filter((_, i) => i !== index),
    });
  };

  /* ================= NORMALIZE TEAM ================= */
  const openEdit = (b) => {
    let parsedTeam = [];

    if (b.team_jobs) {
      if (Array.isArray(b.team_jobs)) parsedTeam = b.team_jobs;
      else {
        try {
          parsedTeam = JSON.parse(b.team_jobs);
        } catch {
          parsedTeam = [];
        }
      }
    }

    const normalized = parsedTeam.map((t) => ({
      name: t?.name || "",
      role: t?.role || "",
      income: Number(t?.income ?? t?.nominal) || 0,
    }));

    setEditingBooking({
      ...b,
      team_jobs: normalized.length
        ? normalized
        : [{ name: "", role: "", income: 0 }],
    });
  };

  /* ================= UNIQUE ROLE LIST ================= */
  const uniqueRoles = [...new Set(teamList.map((t) => t.role))];

  return (
    <>
      {/* ===== MODAL EDIT ===== */}
      {editingBooking && (
        <div style={overlay}>
          <div style={modal}>
            <h3>Edit Booking</h3>

            <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <h4>Tim yang Turun</h4>

              {editingBooking.team_jobs?.map((t, i) => (
                <div key={i} style={teamBox}>
                  
                  {/* NAMA AUTOCOMPLETE */}
                  <input
                    style={input}
                    list={`team-list-${i}`}
                    value={t.name || ""}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const found = teamList.find(
                        (tm) => tm.name === selectedName
                      );

                      updateTeamMember(i, "name", selectedName);

                      if (found) {
                        updateTeamMember(i, "role", found.role || "");
                      }
                    }}
                    placeholder="Ketik atau pilih nama"
                  />
                  <datalist id={`team-list-${i}`}>
                    {teamList.map((tm) => (
                      <option key={tm.id} value={tm.name} />
                    ))}
                  </datalist>

                  {/* ROLE AUTOCOMPLETE */}
                  <input
                    style={input}
                    list={`role-list-${i}`}
                    value={t.role || ""}
                    onChange={(e) =>
                      updateTeamMember(i, "role", e.target.value)
                    }
                    placeholder="Role"
                  />
                  <datalist id={`role-list-${i}`}>
                    {uniqueRoles.map((role, idx) => (
                      <option key={idx} value={role} />
                    ))}
                  </datalist>

                  {/* INCOME */}
                  <input
                    style={input}
                    type="number"
                    value={t.income || 0}
                    onChange={(e) =>
                      updateTeamMember(i, "income", e.target.value)
                    }
                    placeholder="Income"
                  />

                  <button style={cancelBtn} onClick={() => removeTeam(i)}>
                    Hapus
                  </button>
                </div>
              ))}

              <button style={editBtn} onClick={addTeam}>
                + Tambah Tim / Freelance
              </button>

              {/* TOTAL REALTIME */}
              <div
                style={{
                  marginTop: 15,
                  fontWeight: "bold",
                  fontSize: 16,
                  color: "#cba58a",
                }}
              >
                Total Income Tim: {formatRupiahDisplay(totalTeamIncome)}
              </div>
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
  width: 520,
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