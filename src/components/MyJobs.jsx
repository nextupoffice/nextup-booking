import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { formatRupiahDisplay } from "../utils/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function MyJobs() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [jobs, setJobs] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    fetchJobs();
    fetchAdjustments();

    const channel = supabase
      .channel("myjobs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        fetchJobs
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_adjustments" },
        fetchAdjustments
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

  const fetchAdjustments = async () => {
    if (!user?.username) return;

    const { data } = await supabase
      .from("team_adjustments")
      .select("*")
      .eq("team_name", user.username); // ✅ FIXED

    setAdjustments(data || []);
  };

  /* ================= GROUP PER BULAN ================= */
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

  useEffect(() => {
    const months = Object.keys(grouped);
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [jobs]);

  /* ================= HITUNG TOTAL ================= */
  const getMonthAdjustment = () => {
    if (!selectedMonth) return { bonus: 0, potongan: 0 };

    const bonus = adjustments.reduce(
      (sum, a) => sum + (Number(a.bonus) || 0),
      0
    );

    const potongan = adjustments.reduce(
      (sum, a) => sum + (Number(a.potongan) || 0),
      0
    );

    return { bonus, potongan };
  };

  /* ================= DOWNLOAD PDF ================= */
  const downloadPDF = () => {
    if (!selectedMonth || !grouped[selectedMonth]) return;

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const monthJobs = grouped[selectedMonth];

    const incomeTotal = monthJobs.reduce(
      (sum, i) => sum + (Number(i.income) || 0),
      0
    );

    const { bonus, potongan } = getMonthAdjustment();
    const finalTotal = incomeTotal + bonus - potongan;

    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    doc.setTextColor(203, 165, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("NEXTUP STUDIO", 14, 20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Monthly Job Report", 14, 27);
    doc.text(selectedMonth, 14, 33);

    doc.setDrawColor(203, 165, 138);
    doc.line(14, 38, pageWidth - 14, 38);

    autoTable(doc, {
      startY: 45,
      margin: { left: 14, right: 14 },
      head: [["Acara", "Client", "Tanggal", "Jobdesk", "Income"]],
      body: monthJobs.map((job) => [
        job.acara,
        job.client_name || "-",
        job.date,
        job.role,
        formatRupiahDisplay(job.income),
      ]),
      styles: {
        fontSize: 8,
        textColor: [255, 255, 255],
        fillColor: [25, 25, 25],
      },
      headStyles: {
        fillColor: [203, 165, 138],
        textColor: [0, 0, 0],
      },
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setTextColor(203, 165, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);

    doc.text(
      `Income: ${formatRupiahDisplay(incomeTotal)}`,
      14,
      finalY
    );
    doc.text(
      `Bonus: ${formatRupiahDisplay(bonus)}`,
      14,
      finalY + 6
    );
    doc.text(
      `Potongan: ${formatRupiahDisplay(potongan)}`,
      14,
      finalY + 12
    );
    doc.text(
      `Final Total: ${formatRupiahDisplay(finalTotal)}`,
      14,
      finalY + 20
    );

    doc.save(`NEXTUP-Report-${selectedMonth}.pdf`);
  };

  const { bonus, potongan } = getMonthAdjustment();

  return (
    <div className="card">
      <h3>My Jobs</h3>

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

        {selectedMonth && (
          <button
            onClick={downloadPDF}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "none",
              background: "#cba58a",
              color: "#000",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Download Premium PDF
          </button>
        )}
      </div>

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
                <div style={{ fontSize: 13 }}>
                  {job.date} • {job.time}
                </div>
                <div style={{ fontSize: 13 }}>{job.location}</div>
                <div style={{ fontSize: 13, color: "#cba58a" }}>
                  Jobdesk: {job.role}
                </div>
              </div>

              <div style={{ alignSelf: "center", color: "#cba58a", fontWeight: 600 }}>
                {formatRupiahDisplay(job.income)}
              </div>
            </div>
          ))}

          <div style={{ textAlign: "right", marginTop: 12, color: "#cba58a" }}>
            Income:{" "}
            {formatRupiahDisplay(
              grouped[selectedMonth].reduce(
                (sum, i) => sum + (Number(i.income) || 0),
                0
              )
            )}
            <br />
            Bonus: {formatRupiahDisplay(bonus)}
            <br />
            Potongan: {formatRupiahDisplay(potongan)}
            <br />
            <strong>
              Final Total:{" "}
              {formatRupiahDisplay(
                grouped[selectedMonth].reduce(
                  (sum, i) => sum + (Number(i.income) || 0),
                  0
                ) +
                  bonus -
                  potongan
              )}
            </strong>
          </div>
        </>
      )}
    </div>
  );
}