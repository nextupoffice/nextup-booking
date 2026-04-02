import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabase/client";
import { formatRupiahDisplay } from "../utils/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../assets/logo.png";

export default function BookingTable() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [groupedData, setGroupedData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [teamList, setTeamList] = useState([]);
  const [adjustments, setAdjustments] = useState([]);

  /* ================= FETCH TEAM ================= */
  const fetchTeam = async () => {
    const { data } = await supabase.from("team").select("*");
    setTeamList(data || []);
  };

  /* ================= FETCH ADJUSTMENTS ================= */
  const fetchAdjustments = async () => {
    const { data, error } = await supabase
      .from("team_adjustments")
      .select("*");

    if (error) {
      console.error("Adjustment error:", error);
      return;
    }

    setAdjustments(data || []);
  };

  /* ================= FETCH BOOKING ================= */
  const fetchData = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (!data) return setGroupedData({});

    const grouped = {};

    data.forEach((b) => {
      if (!b.date) return;

      const d = new Date(b.date);

      const monthKey = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;

      const monthLabel = d.toLocaleString("id-ID", {
        month: "long",
        year: "numeric",
      });

      if (!grouped[monthKey])
        grouped[monthKey] = { label: monthLabel, rows: [], total: 0 };

      grouped[monthKey].rows.push(b);

      if (user?.role === "admin") {
        grouped[monthKey].total +=
          (Number(b.dp) || 0) + (Number(b.pelunasan) || 0);
      }
    });

    setGroupedData(grouped);
  };

  useEffect(() => {
    fetchData();
    fetchTeam();
    fetchAdjustments();
  }, []);

  useEffect(() => {
    const months = Object.keys(groupedData);
    if (months.length > 0 && !selectedMonth)
      setSelectedMonth(months[months.length - 1]);
  }, [groupedData]);

  /* ================= EDIT FUNCTION ================= */

// buka modal edit
const openEdit = (booking) => {
  let parsedTeam = [];

  if (Array.isArray(booking.team_jobs)) {
    parsedTeam = booking.team_jobs;
  } else if (typeof booking.team_jobs === "string") {
    try {
      parsedTeam = JSON.parse(booking.team_jobs || "[]");
    } catch {
      parsedTeam = [];
    }
  }

  setEditingBooking({
    ...booking,
    team_jobs: parsedTeam,
  });
};

// update isi tim
const updateTeamMember = (index, field, value) => {
  const updated = [...editingBooking.team_jobs];
  updated[index][field] = value;

  setEditingBooking({
    ...editingBooking,
    team_jobs: updated,
  });
};

// hapus tim
const removeTeam = (index) => {
  const updated = editingBooking.team_jobs.filter((_, i) => i !== index);

  setEditingBooking({
    ...editingBooking,
    team_jobs: updated,
  });
};

// tambah tim
const addTeam = () => {
  const newTeam = {
    name: "",
    role: "",
    income: 0,
  };

  setEditingBooking({
    ...editingBooking,
    team_jobs: [...(editingBooking.team_jobs || []), newTeam],
  });
};

// hitung total income tim
const totalTeamIncome = useMemo(() => {
  if (!editingBooking?.team_jobs) return 0;

  return editingBooking.team_jobs.reduce(
    (acc, t) => acc + (Number(t.income) || 0),
    0
  );
}, [editingBooking]);

// opsi dropdown
const teamNameOptions = teamList.map((t) => t.name);
const roleOptions = ["Fotografer", "Videografer", "Editor", "Crew"];

// save ke database
const handleSave = async () => {
  if (!editingBooking) return;

  const { id, team_jobs, ...rest } = editingBooking;

  const { error } = await supabase
    .from("bookings")
    .update({
      ...rest,
      team_jobs: JSON.stringify(team_jobs || []),
    })
    .eq("id", id);

  if (error) {
    console.error("Update error:", error);
    alert("Gagal update");
    return;
  }

  alert("Berhasil update");

  setEditingBooking(null);
  fetchData();
};

  /* ================= PDF ================= */
  const downloadPDF = () => {
    if (!selectedMonth) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const margin = 14;
    const pageWidth = 210;
    let y = 20;

    const rows = groupedData[selectedMonth].rows;

    const gold = [203, 165, 138];
    const dark = [15, 15, 15];
    const light = [230, 230, 230];

    doc.setFillColor(...dark);
    doc.rect(0, 0, 210, 35, "F");

    doc.addImage(logo, "PNG", margin, 10, 28, 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...gold);
    doc.text("INVOICE", pageWidth - margin, 18, { align: "right" });

    doc.setFontSize(10);
    doc.setTextColor(...light);
    doc.text(
      groupedData[selectedMonth].label,
      pageWidth - margin,
      25,
      { align: "right" }
    );

    y = 45;

    let totalDP = 0;
    let totalPelunasan = 0;

    rows.forEach((b) => {
      totalDP += Number(b.dp) || 0;
      totalPelunasan += Number(b.pelunasan) || 0;
    });

    const totalOmzet = totalDP + totalPelunasan;

    autoTable(doc, {
      startY: y,
      head: [[
        "Nama","Acara","Tanggal","Waktu","Alamat","DP","Pelunasan","Total"
      ]],
      body: rows.map((b) => [
        b.client_name,
        b.acara,
        b.date,
        b.time,
        b.location,
        formatRupiahDisplay(b.dp),
        formatRupiahDisplay(b.pelunasan),
        formatRupiahDisplay(
          (Number(b.dp)||0)+(Number(b.pelunasan)||0)
        ),
      ]),
    });

    let finalY = doc.lastAutoTable.finalY + 10;

    doc.text(`Total Omzet : ${formatRupiahDisplay(totalOmzet)}`, margin, finalY);

    finalY += 10;

    const teamPayroll = {};

    rows.forEach((b) => {
      let team = [];
      if (Array.isArray(b.team_jobs)) team = b.team_jobs;
      else if (typeof b.team_jobs === "string") {
        try { team = JSON.parse(b.team_jobs); } catch {}
      }

      team.forEach((t) => {
        const name = t?.name || "Tanpa Nama";
        const income = Number(t?.income) || 0;

        if (!teamPayroll[name]) teamPayroll[name] = 0;
        teamPayroll[name] += income;
      });
    });

    let totalGajiTim = 0;

    Object.entries(teamPayroll).forEach(([name, salary]) => {
      totalGajiTim += salary;
      doc.text(`${name} : ${formatRupiahDisplay(salary)}`, margin, finalY);
      finalY += 5;
    });

    doc.text(`Total Gaji Tim : ${formatRupiahDisplay(totalGajiTim)}`, margin, finalY);

    finalY += 10;

    const monthAdjustments = adjustments.filter(
      (a) => a.bulan === groupedData[selectedMonth].label
    );

    if (monthAdjustments.length === 0) {
      doc.text("Tidak ada penyesuaian", margin, finalY);
    } else {
      monthAdjustments.forEach((adj) => {
        doc.text(
          `${adj.team_name} (${adj.description || "-"})`,
          margin,
          finalY
        );
        finalY += 5;
      });
    }

    finalY += 10;

    const totalKeseluruhan = totalOmzet - totalGajiTim;

    doc.text(
      `TOTAL : ${formatRupiahDisplay(totalKeseluruhan)}`,
      margin,
      finalY
    );

    doc.save(`Invoice-${selectedMonth}.pdf`);
  };

return (
  <>
    <div className="card">
      <h3>Data Booking</h3>

      <div style={{ marginBottom: 20 }}>
        {Object.keys(groupedData).map((month) => (
          <button key={month} onClick={() => setSelectedMonth(month)}>
            {groupedData[month].label}
          </button>
        ))}

        {user?.role === "admin" && (
          <button onClick={downloadPDF}>
            Download PDF
          </button>
        )}
      </div>

      {selectedMonth && groupedData[selectedMonth] && (
        <>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>Nama</th>
                <th style={th}>Acara</th>
                <th style={th}>Tanggal</th>
                <th style={th}>Waktu</th>
                <th style={th}>Alamat</th>
                <th style={th}>DP</th>
                <th style={th}>Pelunasan</th>
                <th style={th}>Total</th>
                <th style={th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {groupedData[selectedMonth].rows.map((b) => (
                <tr key={b.id}>
                  <td style={td}>{b.client_name}</td>
                  <td style={td}>{b.acara}</td>
                  <td style={td}>{b.date}</td>
                  <td style={td}>{b.time}</td>
                  <td style={td}>{b.location}</td>
                  <td style={td}>{formatRupiahDisplay(b.dp)}</td>
                  <td style={td}>{formatRupiahDisplay(b.pelunasan)}</td>
                  <td style={td}>
                    {formatRupiahDisplay(
                      (Number(b.dp) || 0) + (Number(b.pelunasan) || 0)
                    )}
                  </td>
                  <td style={td}>
                    <button style={editBtn} onClick={() => openEdit(b)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {user?.role === "admin" && (
            <div style={{ textAlign: "right", marginTop: 10 }}>
              Total Bulan Ini:{" "}
              {formatRupiahDisplay(groupedData[selectedMonth].total)}
            </div>
          )}
        </>
      )}
    </div>

    {editingBooking && (
      <div style={overlay}>
        <div style={modal}>
          <h3 style={{ marginBottom: 10 }}>Edit Booking</h3>

<div style={modalBody}>
  <h4>Informasi Booking</h4>

  <input
    style={input}
    value={editingBooking.client_name || ""}
    onChange={(e)=>
      setEditingBooking({
        ...editingBooking,
        client_name: e.target.value
      })
    }
    placeholder="Nama Client"
  />

  <input
    style={input}
    value={editingBooking.acara || ""}
    onChange={(e)=>
      setEditingBooking({
        ...editingBooking,
        acara: e.target.value
      })
    }
    placeholder="Acara"
  />

  <input
    style={input}
    type="date"
    value={editingBooking.date || ""}
    onChange={(e)=>
      setEditingBooking({
        ...editingBooking,
        date: e.target.value
      })
    }
  />

  <input
    style={input}
    type="time"
    value={editingBooking.time || ""}
    onChange={(e)=>
      setEditingBooking({
        ...editingBooking,
        time: e.target.value
      })
    }
  />

  <textarea
    style={{ ...input, minHeight:80 }}
    value={editingBooking.location || ""}
    onChange={(e)=>
      setEditingBooking({
        ...editingBooking,
        location: e.target.value
      })
    }
    placeholder="Alamat"
  />

  <input
    style={input}
    value={editingBooking.dp || ""}
    onChange={(e)=>
      setEditingBooking({
        ...editingBooking,
        dp: Number(e.target.value)
      })
    }
    placeholder="DP"
  />

  <input
    style={input}
    value={editingBooking.pelunasan || ""}
    onChange={(e)=>
      setEditingBooking({
        ...editingBooking,
        pelunasan: Number(e.target.value)
      })
    }
    placeholder="Pelunasan"
  />
</div>

          <div style={modalFooter}>
            <button style={saveBtn} onClick={handleSave}>
              Save
            </button>
            <button
              style={cancelBtn}
              onClick={() => setEditingBooking(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}

/* ================= STYLE ================= */

const th = { padding:10, color:"#cba58a", textAlign:"left" };
const td = { padding:10, borderBottom:"1px solid #222" };
const editBtn = { padding:"6px 12px", borderRadius:6, border:"1px solid #cba58a", background:"transparent", color:"#cba58a", cursor:"pointer" };
const teamBox = { border:"1px solid #222", padding:10, borderRadius:8, marginBottom:10, display:"flex", flexDirection:"column", gap:6 };
const overlay = { position:"fixed", top:0, left:0, width:"100%", height:"100%", background:"rgba(0,0,0,0.6)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:999 };
const modal = {
  background:"#111",
  borderRadius:12,
  width:"90%",
  maxWidth:600,
  height:"90vh",
  display:"flex",
  flexDirection:"column",
  color:"#fff",
};

const modalBody = {
  flex:1,
  overflowY:"auto",
  padding:25,
  display:"flex",
  flexDirection:"column",
  gap:10,
};

const modalFooter = {
  padding:20,
  borderTop:"1px solid #222",
  display:"flex",
  gap:10,
};
const input = { padding:8, borderRadius:6, border:"1px solid #333", background:"#1a1a1a", color:"#fff" };
const saveBtn = { padding:"8px 16px", background:"#cba58a", border:"none", borderRadius:6, fontWeight:600, cursor:"pointer" };
const cancelBtn = { padding:"6px 12px", background:"#333", border:"none", borderRadius:6, color:"#fff", cursor:"pointer" };