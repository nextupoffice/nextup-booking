import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

export default function AdminTeamAdjustments() {
  const [teams, setTeams] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [bonus, setBonus] = useState("");
  const [potongan, setPotongan] = useState("");

  /* =========================
     FORMAT RUPIAH
     ========================= */
  const formatRupiah = (value) => {
    const numberString = value.replace(/[^,\d]/g, "");
    const split = numberString.split(",");
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? "." : "";
      rupiah += separator + ribuan.join(".");
    }

    return rupiah;
  };

  /* =========================
     FETCH TEAM (UNTUK DROPDOWN)
     ========================= */
  useEffect(() => {
    fetchTeams();
    fetchAdjustments();
  }, []);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("team_jobs");

    if (!error && data) {
      let names = [];

      data.forEach((booking) => {
        if (booking.team_jobs) {
          booking.team_jobs.forEach((member) => {
            if (member.name) {
              names.push(member.name);
            }
          });
        }
      });

      const uniqueNames = [...new Set(names)];
      setTeams(uniqueNames);
    }
  };

  const fetchAdjustments = async () => {
    const { data, error } = await supabase
      .from("team_adjustments")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setAdjustments(data || []);
    }
  };

  /* =========================
     SAVE DATA
     ========================= */
  const handleSave = async () => {
    if (!selectedName) return alert("Pilih nama tim dulu");

    const { error } = await supabase.from("team_adjustments").insert([
      {
        name: selectedName,
        bonus: Number(bonus.replace(/\./g, "")) || 0,
        potongan: Number(potongan.replace(/\./g, "")) || 0,
      },
    ]);

    if (!error) {
      setSelectedName("");
      setBonus("");
      setPotongan("");
      fetchAdjustments();
    }
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
        {/* NAMA (DROPDOWN) */}
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

        {/* BONUS */}
        <input
          type="text"
          placeholder="Bonus"
          value={bonus}
          onChange={(e) => setBonus(formatRupiah(e.target.value))}
        />

        {/* POTONGAN */}
        <input
          type="text"
          placeholder="Potongan"
          value={potongan}
          onChange={(e) => setPotongan(formatRupiah(e.target.value))}
        />

        <button onClick={handleSave}>Simpan</button>
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
            </tr>
          </thead>
          <tbody>
            {adjustments.map((item) => (
              <tr key={item.id}>
                <td style={tdStyle}>{item.name}</td>
                <td style={tdStyle}>
                  Rp {item.bonus?.toLocaleString()}
                </td>
                <td style={tdStyle}>
                  Rp {item.potongan?.toLocaleString()}
                </td>
                <td style={tdStyle}>
                  {new Date(item.created_at).toLocaleDateString()}
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