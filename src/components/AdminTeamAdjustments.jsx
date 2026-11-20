import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

export default function AdminTeamAdjustments() {
  const [teams, setTeams] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
 const [bonus, setBonus] = useState("");
const [potongan, setPotongan] = useState("");
const [description, setDescription] = useState("");
const [editingId, setEditingId] = useState(null);

  /* ================= FORMAT RUPIAH (AMAN) ================= */
  const formatRupiah = (value = "") => {
    const numberString = String(value).replace(/[^,\d]/g, "");
    const sisa = numberString.length % 3;
    let rupiah = numberString.substr(0, sisa);
    const ribuan = numberString.substr(sisa).match(/\d{3}/g);

    if (ribuan) {
      const separator = sisa ? "." : "";
      rupiah += separator + ribuan.join(".");
    }

    return rupiah;
  };

  const parseNumber = (val = "") =>
    Number(String(val).replace(/\./g, "")) || 0;

  /* ================= INIT ================= */
  useEffect(() => {
    fetchTeams();
    fetchAdjustments();
  }, []);

  /* ================= FETCH TEAM ================= */
const fetchTeams = async () => {
  const { data, error } = await supabase
    .from("bookings")
    .select("team_jobs");

  if (error) {
    console.error(error);
    return;
  }

  if (data) {
    let names = [];

    data.forEach((booking) => {
      let team = [];

      if (Array.isArray(booking.team_jobs)) {
        team = booking.team_jobs;
      } else if (typeof booking.team_jobs === "string") {
        try {
          team = JSON.parse(booking.team_jobs);
        } catch {
          team = [];
        }
      }

      team.forEach((member) => {
        if (member?.name) names.push(member.name);
      });
    });

    setTeams([...new Set(names)]);
  }
};

  /* ================= FETCH ADJUSTMENTS ================= */
  const fetchAdjustments = async () => {
    const { data, error } = await supabase
      .from("team_adjustments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setAdjustments(data || []);
  };

  /* ================= SAVE / UPDATE ================= */
  const handleSave = async () => {
    if (!selectedName || !selectedMonth) return;

    const payload = {
  team_name: selectedName,
  bonus: parseNumber(bonus),
  potongan: parseNumber(potongan),
  bulan: selectedMonth,
  description: description
};

    let error;

    if (editingId) {
      const { error: updateError } = await supabase
        .from("team_adjustments")
        .update(payload)
        .eq("id", editingId);

      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("team_adjustments")
        .insert([payload]);

      error = insertError;
    }

    if (!error) {
      setSelectedName("");
      setSelectedMonth("");
    setBonus("");
setPotongan("");
setDescription("");
setEditingId(null);
      fetchAdjustments();
    } else {
      console.error("Gagal menyimpan:", error);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    const { error } = await supabase
      .from("team_adjustments")
      .delete()
      .eq("id", id);

    if (!error) {
      fetchAdjustments();
    } else {
      console.error("Gagal menghapus:", error);
    }
  };

  /* ================= EDIT ================= */
  const handleEdit = (item) => {
    setEditingId(item.id);
    setSelectedName(item.team_name);
    setSelectedMonth(item.bulan || "");
    setBonus(formatRupiah(item.bonus));
setPotongan(formatRupiah(item.potongan));
setDescription(item.description || "");
  };

return (
  <div
    style={{
      marginTop: 40,
      padding: 24,
      background: "#0f0f0f",
      borderRadius: 16,
      border: "1px solid #1f1f1f",
    }}
  >
<h3
  style={{
    marginBottom: 20,
    color: "#cba58a",
    fontWeight: 600,
    letterSpacing: 0.5,
  }}
>
  Bonus & Potongan Tim
</h3>
      {/* ================= FORM ================= */}
<div
  style={{
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr 1fr 1fr 2fr auto",
    gap: 12,
    alignItems: "center",
    marginBottom: 20,
    padding: 16,
    background: "#151515",
    borderRadius: 12,
    border: "1px solid #222",
  }}
>

<input
  style={inputStyle}
  type="text"
  list="team-options"
  value={selectedName}
  onChange={(e) => setSelectedName(e.target.value)}
  placeholder="Pilih atau ketik nama tim"
/>

<datalist id="team-options">
  {teams.map((name, index) => (
    <option key={index} value={name} />
  ))}
</datalist>

        <select style={inputStyle}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="">Pilih Bulan</option>
          <option value="Januari 2026">Januari 2026</option>
          <option value="Februari 2026">Februari 2026</option>
          <option value="Maret 2026">Maret 2026</option>
          <option value="April 2026">April 2026</option>
          <option value="Mei 2026">Mei 2026</option>
          <option value="Juni 2026">Juni 2026</option>
          <option value="Juli 2026">Juli 2026</option>
          <option value="Agustus 2026">Agustus 2026</option>
          <option value="September 2026">September 2026</option>
          <option value="Oktober 2026">Oktober 2026</option>
          <option value="November 2026">November 2026</option>
          <option value="Desember 2026">Desember 2026</option>
        </select>

        <input
          type="text"
          placeholder="Bonus"
          value={bonus}
          onChange={(e) =>
            setBonus(formatRupiah(e.target.value))
          }
        />

        <input
          type="text"
          placeholder="Potongan"
          value={potongan}
          onChange={(e) =>
            setPotongan(formatRupiah(e.target.value))
          }
        />
<textarea
  style={{ ...inputStyle, minHeight: 40 }}
  placeholder="Deskripsi (alasan bonus / potongan)"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>
        <button
  onClick={handleSave}
  style={{
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#cba58a",
    color: "#000",
    fontWeight: 600,
    cursor: "pointer",
  }}
>
          {editingId ? "Update" : "Simpan"}
        </button>
      </div>

      {/* ================= TABLE ================= */}
      {adjustments.length > 0 && (
  <div
    style={{
      marginTop: 20,
      background: "#111",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid #222",
    }}
  >
    <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Nama</th>
              <th style={thStyle}>Bulan</th>
              <th style={thStyle}>Bonus</th>
              <th style={thStyle}>Potongan</th>
              <th style={thStyle}>Deskripsi</th>
              <th style={thStyle}>Tanggal</th>
              <th style={thStyle}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((item) => (
              <tr key={item.id}>
                <td style={tdStyle}>{item.team_name}</td>
                <td style={tdStyle}>{item.bulan || "-"}</td>
                <td style={tdStyle}>
                  Rp {(Number(item.bonus) || 0).toLocaleString()}
                </td>
                <td style={tdStyle}>
  Rp {(Number(item.potongan) || 0).toLocaleString()}
</td>

<td style={tdStyle}>
  {item.description || "-"}
</td>

<td style={tdStyle}>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString()
                    : "-"}
                </td>
                <td style={tdStyle}>
                  <button
  onClick={() => handleEdit(item)}
  style={{
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #cba58a",
    background: "transparent",
    color: "#cba58a",
    cursor: "pointer",
    marginRight: 6,
  }}
>
  Edit
</button>
                 <button
  onClick={() => handleDelete(item.id)}
  style={{
    padding: "6px 10px",
    borderRadius: 6,
    background: "#7a1c1c",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  }}
>
  Hapus
</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
      )}
    </div>
  );
}

/* ================= STYLE ================= */

const thStyle = {
  padding: 12,
  textAlign: "left",
  background: "#151515",
  color: "#cba58a",
  fontWeight: 600,
  fontSize: 13,
  borderBottom: "1px solid #222",
};

const tdStyle = {
  padding: 12,
  borderBottom: "1px solid #1f1f1f",
  fontSize: 13,
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #2a2a2a",
  background: "#1a1a1a",
  color: "#fff",
  outline: "none",
  fontSize: 13,
};