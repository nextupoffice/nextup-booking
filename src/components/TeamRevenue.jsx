import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { formatRupiahDisplay } from "../utils/format";

export default function TeamRevenue() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);

  // ❌ ADMIN TIDAK MELIHAT HALAMAN INI
  if (!user || user.role !== "tim") return null;

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("team-revenue-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        fetchData
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("bookings").select("*");

    if (!data) return;

    let rows = [];
    let sum = 0;

    data.forEach((b) => {
      const income = b.team_split?.[user.username];

      if (income && income > 0) {
        rows.push({
          id: b.id,
          client_name: b.client_name,
          phone: b.phone,
          acara: b.acara,
          date: b.date,
          time: b.time,
          location: b.location,
          income,
        });

        sum += income;
      }
    });

    setJobs(rows);
    setTotal(sum);
  };

  return (
    <div className="card">
      <h3>Pendapatan Saya</h3>

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
                "Pendapatan",
              ].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td style={td}>{j.client_name}</td>
                <td style={td}>{j.phone}</td>
                <td style={td}>{j.acara}</td>
                <td style={td}>{j.date}</td>
                <td style={td}>{j.time}</td>
                <td style={td}>{j.location}</td>
                <td style={{ ...td, color: "#cba58a" }}>
                  {formatRupiahDisplay(j.income)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, textAlign: "right" }}>
        <strong>Total: {formatRupiahDisplay(total)}</strong>
      </div>
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
