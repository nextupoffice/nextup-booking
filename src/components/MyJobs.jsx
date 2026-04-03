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
      let team = [];

if (Array.isArray(b.team_jobs)) {
  team = b.team_jobs;
} else if (typeof b.team_jobs === "string") {
  try {
    team = JSON.parse(b.team_jobs);
  } catch {
    team = [];
  }
}

      const myTeamJobs = team.filter((t) => {
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
      .ilike("team_name", user.username);

    setAdjustments(data || []);
  };

  /* ================= GROUP PER BULAN (AMAN ANTAR TAHUN) ================= */
  const grouped = jobs.reduce((acc, job) => {
    if (!job.date) return acc;

    const d = new Date(job.date);

    const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    const label = d.toLocaleString("id-ID", {
      month: "long",
      year: "numeric",
    });

    if (!acc[sortKey]) {
      acc[sortKey] = {
        label,
        jobs: [],
      };
    }

    acc[sortKey].jobs.push(job);

    return acc;
  }, {});

  const sortedMonths = Object.keys(grouped).sort((a, b) =>
    a.localeCompare(b)
  );

  useEffect(() => {
    if (sortedMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(sortedMonths[sortedMonths.length - 1]);
    }
  }, [jobs]);

  /* ================= BONUS & POTONGAN BERDASARKAN BULAN ================= */
  const getMonthAdjustment = () => {
    if (!selectedMonth) return { bonus: 0, potongan: 0 };

    const label = grouped[selectedMonth]?.label;

    let bonus = 0;
    let potongan = 0;

    adjustments.forEach((adj) => {
      if (adj.bulan === label) {
        bonus += Number(adj.bonus) || 0;
        potongan += Number(adj.potongan) || 0;
      }
    });

    return { bonus, potongan };
  };

  /* ================= DOWNLOAD PDF ================= */
const checkPageBreak = (doc, y, margin = 14) => {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y > pageHeight - margin) {
    doc.addPage();

    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, 210, 297, "F");

    return 20;
  }

  return y;
};

const loadImageBase64 = async (url) => {
  const res = await fetch(url);
  const blob = await res.blob();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

const downloadPDF = async () => {
  try {
    if (!selectedMonth || !grouped[selectedMonth]) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const margin = 14;
    const pageWidth = 210;
    let y = 20;

    const monthJobs = grouped[selectedMonth].jobs;

    // ================= DARK BG =================
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, 210, 297, "F");

    // ================= LOGO =================
    const logoBase64 = await loadImageBase64("/logo.png");

    // ================= TOTAL =================
    const incomeTotal = monthJobs.reduce(
      (sum, i) => sum + (Number(i.income) || 0),
      0
    );

    const { bonus, potongan } = getMonthAdjustment();
    const finalTotal = incomeTotal + bonus - potongan;

    // ================= TABLE =================
    autoTable(doc, {
      startY: 55,
      margin: { left: margin, right: margin },

      head: [[
        "Acara",
        "Client",
        "Tanggal",
        "Waktu",
        "Lokasi",
        "Jobdesk",
        "Income"
      ]],

      body: monthJobs.map((job) => [
        job.acara,
        job.client_name || "-",
        job.date,
        job.time,
        job.location,
        job.role,
        formatRupiahDisplay(job.income),
      ]),

      styles: {
        fontSize: 8,
        textColor: [255,255,255],
        fillColor: [25,25,25],
        cellPadding: 2,
      },

      headStyles: {
        fillColor: [203,165,138],
        textColor: [0,0,0],
        fontStyle: "bold",
      },

      alternateRowStyles: {
        fillColor: [20,20,20],
      },

      theme: "grid",

      willDrawPage: () => {
        doc.setFillColor(15, 15, 15);
        doc.rect(0, 0, 210, 297, "F");

        doc.addImage(logoBase64, "PNG", margin - 8, 8, 40, 40);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(203,165,138);
        doc.text("MY JOB REPORT", margin + 30, 30);

        doc.setFontSize(10);
        doc.setTextColor(200,200,200);
        doc.text(grouped[selectedMonth].label, margin, 45);
      },
    });

    let finalY = doc.lastAutoTable.finalY + 10;

    // ================= SUMMARY =================
    doc.setFont("helvetica","bold");
    doc.setTextColor(203,165,138);
    doc.setFontSize(11);

    doc.text(`Total Job: ${monthJobs.length}`, margin, finalY);

    finalY += 6;

    doc.text(
      `Total Income: ${formatRupiahDisplay(incomeTotal)}`,
      margin,
      finalY
    );

    finalY += 10;
    finalY = checkPageBreak(doc, finalY);

    // ================= ADJUSTMENT =================
    doc.setFontSize(10);
    doc.setTextColor(220,220,220);

    doc.text("Penyesuaian:", margin, finalY);
    finalY += 6;

    adjustments
      .filter((a) => a.bulan === grouped[selectedMonth].label)
      .forEach((adj) => {
        doc.text(
          `${adj.description || "-"} `,
          margin,
          finalY
        );

        const nilai =
          (Number(adj.bonus) || 0) -
          (Number(adj.potongan) || 0);

        doc.text(
          formatRupiahDisplay(nilai),
          pageWidth - margin,
          finalY,
          { align: "right" }
        );

        finalY += 5;
      });

    finalY += 10;
    finalY = checkPageBreak(doc, finalY);

    // ================= FINAL TOTAL =================
    doc.setFont("helvetica","bold");
    doc.setFontSize(14);
    doc.setTextColor(203,165,138);

    doc.text(
      `TOTAL PENDAPATAN: ${formatRupiahDisplay(finalTotal)}`,
      margin,
      finalY
    );

    doc.save(`MyJobs-${selectedMonth}.pdf`);
  } catch (err) {
    console.error("PDF ERROR:", err);
    alert("Gagal generate PDF");
  }
};

  const { bonus, potongan } = getMonthAdjustment();

  return (
    <div className="card">
      <h3>My Jobs</h3>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        {sortedMonths.map((key) => (
          <button
            key={key}
            onClick={() => setSelectedMonth(key)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid #333",
              background: selectedMonth === key ? "#cba58a" : "#111",
              color: selectedMonth === key ? "#000" : "#cba58a",
              cursor: "pointer",
            }}
          >
            {grouped[key].label}
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
          {grouped[selectedMonth].jobs.map((job) => (
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

          <div style={{ textAlign: "right", marginTop: 12, color: "#cba58a" }}>
            Income:{" "}
            {formatRupiahDisplay(
              grouped[selectedMonth].jobs.reduce(
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
                grouped[selectedMonth].jobs.reduce(
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