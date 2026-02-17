import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { formatRupiahDisplay } from "../utils/format";

export default function MyJobs() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [jobs, setJobs] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    fetchJobs();

    const channel = supabase
      .channel("myjobs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        fetchJobs
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    const months = Object.keys(grouped);
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [jobs]);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    const myJobs = [];

    data.forEach((b) => {
      if (!Array.isArray(b.team_jobs)) return;

      const myTeamJobs = b.team_jobs.filter((t) => {
        if (t.user_id && user?.id) {
          return t.user_id === user.id;
        }

        return (
          t.name &&
          user?.username &&
          t.name.toLowerCase() === user.username.toLowerCase()
        );
      });

      if (myTeamJobs.length === 0) return;

      myTeamJobs.forEach((t) => {
        myJobs.push({
          id: `${b.id}-${t.user_id || t.name}`,
          acara: b.acara,
          client_name: b.client_name,
          phone: b.phone,
          date: b.date,
          time: b.time,
          location: b.location,
          role: t.role,
          income: Number(t.income) || 0,
        });
      });
    });

    setJobs(myJobs);
  };

  // === GROUP PER BULAN ===
  const grouped = jobs.reduce((acc, job) => {
    if (!job.date) return acc;

    const monthKey = new Date(job.date).toLocaleString("id-ID", {
      month: "long",
      year: "numeric",
    });

    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(job);

    return acc;
  }, {});

  return (
    <div className="card">
      <h3>My Jobs</h3>

      {/* ==== BUTTON BULAN ==== */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {Object.keys(grouped).map((month) => (
          <button
            key={month}
            onClick={() => setSelectedMonth(month)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid #333",
              background: selectedMonth === month ? "#cba58a" : "#111",
              color: selectedMonth === month ? "#000" : "#cba58a",
              cursor: "pointer",
            }}
          >
            {month}
          </button>
        ))}
      </div>

      {/* ==== DATA BULAN TERPILIH ==== */}
      {selectedMonth && grouped[selectedMonth] && (
        <>
          {grouped[selectedMonth].map((job) => (
            <div
              key={job.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                padding: "14px 0",
                borderBottom: "1px solid #222",
              }}
            >
              <div>
                <strong>{job.acara}</strong>

                {job.client_name && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "#cba58a",
                      marginTop: 2,
                    }}
                  >
                    Client: <strong>{job.client_name}</strong>
                  </div>
                )}

                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {job.phone}
                </div>

                <div style={{ fontSize: 13 }}>
                  {job.date} • {job.time}
                </div>

                <div style={{ fontSize: 13 }}>{job.location}</div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: "#cba58a",
                  }}
                >
                  Jobdesk: {job.role}
                </div>
              </div>

              <div
                style={{
                  alignSelf: "center",
                  color: "#cba58a",
                  fontWeight: 600,
                }}
              >
                {formatRupiahDisplay(job.income)}
              </div>
            </div>
          ))}

          <div
            style={{
              textAlign: "right",
              marginTop: 12,
              fontWeight: 600,
              color: "#cba58a",
            }}
          >
            Total:{" "}
            {formatRupiahDisplay(
              grouped[selectedMonth].reduce(
                (sum, i) => sum + (Number(i.income) || 0),
                0
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}