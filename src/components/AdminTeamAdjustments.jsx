import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

export default function AdminTeamAdjustments() {
  const [teams, setTeams] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [bonus, setBonus] = useState("");
  const [potongan, setPotongan] = useState("");
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
        booking.team_jobs?.forEach((member) => {
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
    if (!selectedName) return;

    const payload = {
      team_name: selectedName,
      bonus: parseNumber(bonus),
      potongan: parseNumber(potongan),
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
      setBonus("");
      setPotongan("");
      setEditingId(null);
      fetchAdjustments();
    } else {
      console.error("Gagal menyimpan:", error);
    }
  };

  /* ================= DELETE (AMAN PWA) ================= */
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
    setBonus(formatRupiah(item.bonus));
    setPotongan(formatRupiah(item.potongan));
  };

  return (
    <div style={{ marginTop: 40 }}>
      <h3>Bonus & Potongan Global Tim</h3>

      {/* ================= FORM ================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr 1fr auto",
          gap: 12,
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <select
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
        >
          <option value="">Pilih Nama Tim</option>
          {teams.map((name, index) => (
            <option key={index} value={name}>
              {name}
            </option>
          ))}
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

        <button onClick={handleSave}>
          {editingId ? "Update" : "Simpan"}
        </button>
      </div>

      {/* ================= TABLE ================= */}
      {adjustments.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Nama</th>
              <th style={thStyle}>Bonus</th>
              <th style={thStyle}>Potongan</th>
              <th style={thStyle}>Tanggal</th>
              <th style={thStyle}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((item) => (
              <tr key={item.id}>
                <td style={tdStyle}>{item.team_name}</td>
                <td style={tdStyle}>
                  Rp {(Number(item.bonus) || 0).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  Rp {(Number(item.potongan) || 0).toLocaleString()}
                </td>
                <td style={tdStyle}>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString()
                    : "-"}
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleEdit(item)}
                    style={{ marginRight: 8 }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      background: "#b00020",
                      color: "#fff",
                      border: "none",
                      padding: "4px 8px",
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
      )}
    </div>
  );
}

/* ================= STYLE ================= */

const thStyle = {
  borderBottom: "1px solid #ddd",
  padding: 8,
  textAlign: "left",
  background: "#f5f5f5",
};

const tdStyle = {
  borderBottom: "1px solid #eee",
  padding: 8,
};