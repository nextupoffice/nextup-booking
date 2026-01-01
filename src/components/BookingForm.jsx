import { useState } from "react";
import { supabase } from "../supabase/client";
import {
  formatRupiahInput,
  formatRupiahDisplay,
} from "../utils/format";

const TEAM = ["Azky", "Resty", "Daffa", "Tio"];
const JOBDESK = [
  "Fotografer",
  "Videografer",
  "Editor",
  "Asisten",
  "Drone Pilot",
];

export default function BookingForm() {
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [acara, setAcara] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [dp, setDp] = useState("");
  const [pelunasan, setPelunasan] = useState("");

  const [teamData, setTeamData] = useState({
    Azky: { income: 0, role: "" },
    Resty: { income: 0, role: "" },
    Daffa: { income: 0, role: "" },
    Tio: { income: 0, role: "" },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const teamJobs = Object.entries(teamData)
      .filter(([_, v]) => v.income > 0 && v.role)
      .map(([name, v]) => ({
        name,
        role: v.role,
        income: v.income,
      }));

    const { error } = await supabase.from("bookings").insert([
      {
        client_name: clientName,
        phone,
        acara,
        date,
        time,
        location,
        dp: Number(dp.replace(/\D/g, "")),
        pelunasan: Number(pelunasan.replace(/\D/g, "")),
        team_jobs: teamJobs,
      },
    ]);

    if (error) {
      alert("Gagal menyimpan booking");
      console.error(error);
      return;
    }

    alert("Booking berhasil disimpan");

    setClientName("");
    setPhone("");
    setAcara("");
    setDate("");
    setTime("");
    setLocation("");
    setDp("");
    setPelunasan("");
    setTeamData({
      Azky: { income: 0, role: "" },
      Resty: { income: 0, role: "" },
      Daffa: { income: 0, role: "" },
      Tio: { income: 0, role: "" },
    });
  };

  return (
    <div className="card">
      <h3>Booking Client</h3>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <input placeholder="Nama Client" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          <input placeholder="No HP" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input placeholder="Acara" value={acara} onChange={(e) => setAcara(e.target.value)} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <input placeholder="Lokasi" value={location} onChange={(e) => setLocation(e.target.value)} />

          <input
            placeholder="DP"
            value={dp}
            onChange={(e) =>
              setDp(formatRupiahInput(e.target.value.replace(/\D/g, "")))
            }
          />

          <input
            placeholder="Pelunasan"
            value={pelunasan}
            onChange={(e) =>
              setPelunasan(formatRupiahInput(e.target.value.replace(/\D/g, "")))
            }
          />
        </div>

        <h4 style={{ marginTop: 24 }}>Team yang Mengambil Job</h4>

        {TEAM.map((name) => (
  <div key={name} className="team-grid">
    {/* NAMA TIM */}
    <strong style={{ minWidth: 70 }}>{name}</strong>

    {/* JOBDESK */}
    <select
      value={teamData[name].role}
      onChange={(e) =>
        setTeamData({
          ...teamData,
          [name]: {
            ...teamData[name],
            role: e.target.value,
          },
        })
      }
      style={{
        width: 130,
        padding: "8px 10px",
        borderRadius: 8,
        background: "#2a2a2a",
        color: "#eee",
        border: "1px solid #333",
        fontSize: 13,
      }}
    >
      <option value="">Jobdesk</option>
      {JOBDESK.map((j) => (
        <option key={j} value={j}>
          {j}
        </option>
      ))}
    </select>

    {/* NOMINAL */}
    <input
      value={formatRupiahInput(teamData[name].income)}
      onChange={(e) =>
        setTeamData({
          ...teamData,
          [name]: {
            ...teamData[name],
            income: Number(e.target.value.replace(/\D/g, "")),
          },
        })
      }
      style={{ maxWidth: 160 }}
    />

    <span className="team-rupiah">
      {formatRupiahDisplay(teamData[name].income)}
    </span>
  </div>
))}


        <button type="submit">Simpan Booking</button>
      </form>
    </div>
  );
}
