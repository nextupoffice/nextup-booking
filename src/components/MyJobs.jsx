import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { formatRupiahDisplay } from "../utils/format";

export default function MyJobs() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [jobs, setJobs] = useState([]);

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

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("date", { ascending: true });

    if (error) return console.error(error);

    const myJobs = [];

    data.forEach((b) => {
      b.team_jobs?.forEach((t) => {
        if (t.name === user.username) {
          myJobs.push({
            id: b.id + t.name,
            acara: b.acara,
            date: b.date,
            time: b.time,
            location: b.location,
            phone: b.phone,
            role: t.role,
            income: t.income,
          });
        }
      });
    });

    setJobs(myJobs);
  };

  // === GROUP PER BULAN ===
  const grouped = jobs.reduce((acc, job) => {
    const month = job.date.slice(0, 7); // YYYY-MM
    if (!acc[month]) acc[month] = [];
    acc[month].push(job);
    return acc;
  }, {});

  return (
    <div className="card">
      <h3>My Jobs</h3>

      {Object.entries(grouped).map(([month, items]) => {
        const total = items.reduce((s, i) => s + i.income, 0);

        return (
          <div key={month} style={{ marginTop: 24 }}>
            <h4 style={{ color: "#cba58a" }}>
              {new Date(month + "-01").toLocaleString("id-ID", {
                month: "long",
                year: "numeric",
              })}
            </h4>

            {items.map((job) => (
              <div
                key={job.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  padding: "14px 0",
                  borderBottom: "1px solid #222",
                }}
              >
                {/* KIRI */}
                <div>
                  <strong>{job.acara}</strong>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    {job.phone}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {job.date} • {job.time}
                  </div>
                  <div style={{ fontSize: 13 }}>{job.location}</div>

                  {/* 👉 INI BAGIAN ROLE / JOBDESK */}
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

                {/* KANAN */}
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
                marginTop: 10,
                fontWeight: 600,
                color: "#cba58a",
              }}
            >
              Total: {formatRupiahDisplay(total)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
