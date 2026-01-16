import { useState } from "react";
import { supabase } from "../supabase/client";
import {
  formatRupiahInput,
  formatRupiahDisplay,
} from "../utils/format";

const TEAM_INTERNAL = ["Azky", "Resty", "Daffa", "Tio"];

const JOBDESK = [
  "Owner",
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

  // TEAM INTERNAL
  const [teamData, setTeamData] = useState({
    Azky: { income: 0, role: "" },
    Resty: { income: 0, role: "" },
    Daffa: { income: 0, role: "" },
    Tio: { income: 0, role: "" },
  });

  // TEAM FREELANCE
  const [freelanceTeam, setFreelanceTeam] = useState([]);

  const addFreelance = () => {
    setFreelanceTeam([
      ...freelanceTeam,
      { name: "", role: "", income: 0 },
    ]);
  };

  const updateFreelance = (index, field, value) => {
    const updated = [...freelanceTeam];
    updated[index][field] = value;
    setFreelanceTeam(updated);
  };

  const removeFreelance = (index) => {
    const updated = [...freelanceTeam];
    updated.splice(index, 1);
    setFreelanceTeam(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // TEAM INTERNAL
    const internalJobs = Object.entries(teamData)
      .filter(([_, v]) => v.income > 0 && v.role)
      .map(([name, v]) => ({
        name,
        role: v.role,
        income: v.income,
        type: "internal",
      }));

    // TEAM FREELANCE
    const freelanceJobs = freelanceTeam
      .filter((m) => m.name && m.role && m.income > 0)
      .map((m) => ({
        ...m,
        type: "freelance",
      }));

    const teamJobs = [...internalJobs, ...freelanceJobs];

    // VALIDASI 1 OWNER SAJA
    const ownerCount = teamJobs.filter(
      (t) => t.role === "Owner"
    ).length;

    if (ownerCount > 1) {
      alert("Hanya boleh 1 Owner dalam 1 booking");
      return;
    }

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
      return;
    }

    alert("Booking berhasil disimpan");

    // RESET
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
    setFreelanceTeam([]);
  };

  return (
    <div className="card">
      <h3>Booking Client</h3>

      <form onSubmit={handleSubmit}>
        {/* ===== FORM UTAMA ===== */}
        <div className="form-grid">
          <input placeholder="Nama Client" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          <input placeholder="No HP" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input placeholder="Acara" value={acara} onChange={(e) => setAcara(e.target.value)} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <input placeholder="Lokasi" value={location} onChange={(e) => setLocation(e.target.value)} />
          <input placeholder="DP" value={dp} onChange={(e) => setDp(formatRupiahInput(e.target.value.replace(/\D/g, "")))} />
          <input placeholder="Pelunasan" value={pelunasan} onChange={(e) => setPelunasan(formatRupiahInput(e.target.value.replace(/\D/g, "")))} />
        </div>

        {/* ===== TEAM INTERNAL ===== */}
        <h4 style={{ marginTop: 24 }}>Team Internal</h4>

        {TEAM_INTERNAL.map((name) => (
          <div key={name} className="team-card">
            <div className="team-name">{name}</div>

            <select
              value={teamData[name].role}
              onChange={(e) =>
                setTeamData({
                  ...teamData,
                  [name]: { ...teamData[name], role: e.target.value },
                })
              }
            >
              <option value="">Pilih Jobdesk</option>
              {JOBDESK.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>

            <input
              placeholder="Nominal"
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
            />

            <div className="team-rupiah">
              {formatRupiahDisplay(teamData[name].income)}
            </div>
          </div>
        ))}

        {/* ===== TEAM FREELANCE ===== */}
        <h4 style={{ marginTop: 32 }}>Team Freelance</h4>

        {freelanceTeam.map((m, i) => (
          <div key={i} className="team-card freelance">
            <input
              placeholder="Nama Freelance"
              value={m.name}
              onChange={(e) => updateFreelance(i, "name", e.target.value)}
            />

            <select
              value={m.role}
              onChange={(e) => updateFreelance(i, "role", e.target.value)}
            >
              <option value="">Jobdesk</option>
              {JOBDESK.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>

            <input
              placeholder="Nominal"
              value={formatRupiahInput(m.income)}
              onChange={(e) =>
                updateFreelance(i, "income", Number(e.target.value.replace(/\D/g, "")))
              }
            />

            <button type="button" onClick={() => removeFreelance(i)}>✕</button>
          </div>
        ))}

        <button type="button" onClick={addFreelance} style={{ marginTop: 8 }}>
          + Tambah Freelance
        </button>

        <button type="submit" style={{ width: "100%", marginTop: 24 }}>
          Simpan Booking
        </button>
      </form>
    </div>
  );
}
