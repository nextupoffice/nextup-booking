import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { formatRupiahDisplay } from "../utils/format";

export default function AdminTeamAdjustments() {
  const [data, setData] = useState([]);
  const [newRow, setNewRow] = useState({
    team_name: "",
    bonus: 0,
    potongan: 0,
  });

  const fetchData = async () => {
    const { data } = await supabase
      .from("team_adjustments")
      .select("*")
      .order("team_name", { ascending: true });

    setData(data || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!newRow.team_name) return alert("Nama tim wajib diisi");

    const { error } = await supabase
      .from("team_adjustments")
      .upsert({
        team_name: newRow.team_name,
        bonus: Number(newRow.bonus) || 0,
        potongan: Number(newRow.potongan) || 0,
      }, { onConflict: "team_name" });

    if (error) return alert("Gagal menyimpan");

    setNewRow({ team_name: "", bonus: 0, potongan: 0 });
    fetchData();
  };

  const handleUpdate = async (row) => {
    await supabase
      .from("team_adjustments")
      .update({
        bonus: Number(row.bonus) || 0,
        potongan: Number(row.potongan) || 0,
      })
      .eq("id", row.id);

    fetchData();
  };

  return (
    <div className="card">
      <h3>Bonus & Potongan Global Tim</h3>

      <table style={{ width: "100%", marginBottom: 20 }}>
        <thead>
          <tr>
            <th style={th}>Nama Tim</th>
            <th style={th}>Bonus</th>
            <th style={th}>Potongan</th>
            <th style={th}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td style={td}>{row.team_name}</td>

              <td style={td}>
                <input
                  type="number"
                  value={row.bonus}
                  onChange={(e) =>
                    setData((prev) =>
                      prev.map((d) =>
                        d.id === row.id
                          ? { ...d, bonus: e.target.value }
                          : d
                      )
                    )
                  }
                  style={input}
                />
              </td>

              <td style={td}>
                <input
                  type="number"
                  value={row.potongan}
                  onChange={(e) =>
                    setData((prev) =>
                      prev.map((d) =>
                        d.id === row.id
                          ? { ...d, potongan: e.target.value }
                          : d
                      )
                    )
                  }
                  style={input}
                />
              </td>

              <td style={td}>
                <button style={saveBtn} onClick={() => handleUpdate(row)}>
                  Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4>Tambah / Update Tim</h4>

      <div style={{ display: "flex", gap: 10 }}>
        <input
          style={input}
          placeholder="Nama Tim"
          value={newRow.team_name}
          onChange={(e) =>
            setNewRow({ ...newRow, team_name: e.target.value })
          }
        />
        <input
          style={input}
          type="number"
          placeholder="Bonus"
          value={newRow.bonus}
          onChange={(e) =>
            setNewRow({ ...newRow, bonus: e.target.value })
          }
        />
        <input
          style={input}
          type="number"
          placeholder="Potongan"
          value={newRow.potongan}
          onChange={(e) =>
            setNewRow({ ...newRow, potongan: e.target.value })
          }
        />
        <button style={saveBtn} onClick={handleSave}>
          Simpan
        </button>
      </div>
    </div>
  );
}

/* ===== STYLE ===== */

const th = { padding: 10, textAlign: "left", color: "#cba58a" };
const td = { padding: 10, borderBottom: "1px solid #222" };
const input = {
  padding: 6,
  borderRadius: 6,
  border: "1px solid #333",
  background: "#1a1a1a",
  color: "#fff",
};
const saveBtn = {
  padding: "6px 12px",
  background: "#cba58a",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
};