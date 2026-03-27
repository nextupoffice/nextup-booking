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
    const fetchAdjustments = async () => {
  const { data, error } = await supabase
    .from("team_adjustments")
    .select("*");

  if (error) {
    console.error(error);
    return;
  }

  setAdjustments(data || []);
};
    const { data } = await supabase.from("team").select("*");
    setTeamList(data || []);
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

  /* ================= EXTRACT TEAM OPTIONS FROM BOOKING ================= */
  const teamNameOptions = useMemo(() => {
    const names = new Set();

    Object.values(groupedData).forEach((month) => {
      month.rows.forEach((b) => {
        let parsed = [];

        if (Array.isArray(b.team_jobs)) parsed = b.team_jobs;
        else if (typeof b.team_jobs === "string") {
          try { parsed = JSON.parse(b.team_jobs); } catch {}
        }

        parsed.forEach((t) => {
          if (t?.name) names.add(t.name);
        });
      });
    });

    return Array.from(names);
  }, [groupedData]);

  const roleOptions = useMemo(() => {
    const roles = new Set();

    Object.values(groupedData).forEach((month) => {
      month.rows.forEach((b) => {
        let parsed = [];

        if (Array.isArray(b.team_jobs)) parsed = b.team_jobs;
        else if (typeof b.team_jobs === "string") {
          try { parsed = JSON.parse(b.team_jobs); } catch {}
        }

        parsed.forEach((t) => {
          if (t?.role) roles.add(t.role);
        });
      });
    });

    return Array.from(roles);
  }, [groupedData]);

  /* ================= PDF ================= */
const downloadPDF = () => {

  if (!selectedMonth) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const margin = 14;
  const pageWidth = 210;

  let y = 20;

  const rows = groupedData[selectedMonth].rows;

  /* ================= COLOR ================= */

  const gold = [203,165,138];
  const dark = [15,15,15];
  const light = [230,230,230];

  /* ================= HEADER ================= */

  doc.setFillColor(...dark);
  doc.rect(0,0,210,35,"F");

  // logo kiri
  doc.addImage(logo,"PNG",margin,10,28,14);

  // judul kanan
  doc.setFont("helvetica","bold");
  doc.setFontSize(18);
  doc.setTextColor(...gold);

  doc.text(
    "INVOICE",
    pageWidth - margin,
    18,
    {align:"right"}
  );

  doc.setFontSize(10);
  doc.setTextColor(...light);

  doc.text(
    groupedData[selectedMonth].label,
    pageWidth - margin,
    25,
    {align:"right"}
  );

  y = 45;

  /* ================= HITUNG TOTAL ================= */

  let totalDP = 0;
  let totalPelunasan = 0;

  rows.forEach((b)=>{
    totalDP += Number(b.dp) || 0;
    totalPelunasan += Number(b.pelunasan) || 0;
  });

  const totalOmzet = totalDP + totalPelunasan;

  /* ================= TABLE ================= */

  autoTable(doc,{
    startY: y,

    head:[[
      "Nama","Acara","Tanggal","Waktu","Alamat","DP","Pelunasan","Total"
    ]],

    body: rows.map((b)=>[
      b.client_name,
      b.acara,
      b.date,
      b.time,
      b.location,
      formatRupiahDisplay(b.dp),
      formatRupiahDisplay(b.pelunasan),
      formatRupiahDisplay(
        (Number(b.dp)||0)+(Number(b.pelunasan)||0)
      )
    ]),

    theme:"grid",

    styles:{
      fontSize:9,
      cellPadding:3,
      textColor:20
    },

    headStyles:{
      fillColor:gold,
      textColor:0,
      halign:"center"
    },

    alternateRowStyles:{
      fillColor:[245,245,245]
    },

    columnStyles:{
      5:{halign:"right"},
      6:{halign:"right"},
      7:{halign:"right"}
    },

    didDrawPage:(data)=>{
      // header ulang tiap halaman
      doc.setFillColor(...dark);
      doc.rect(0,0,210,35,"F");

      doc.addImage(logo,"PNG",margin,10,28,14);

      doc.setFont("helvetica","bold");
      doc.setFontSize(18);
      doc.setTextColor(...gold);

      doc.text(
        "INVOICE",
        pageWidth - margin,
        18,
        {align:"right"}
      );

      doc.setFontSize(10);
      doc.setTextColor(...light);

      doc.text(
        groupedData[selectedMonth].label,
        pageWidth - margin,
        25,
        {align:"right"}
      );
    }

  });

  let finalY = doc.lastAutoTable.finalY + 10;

  /* ================= TOTAL BOOKING ================= */

  doc.setFont("helvetica","bold");
  doc.setFontSize(11);

  doc.text("Ringkasan Booking",margin,finalY);

  finalY += 6;

  doc.setFont("helvetica","normal");

  doc.text(`Total DP : ${formatRupiahDisplay(totalDP)}`,margin,finalY);
  finalY += 5;

  doc.text(`Total Pelunasan : ${formatRupiahDisplay(totalPelunasan)}`,margin,finalY);
  finalY += 5;

  doc.setFont("helvetica","bold");

  doc.text(`Total Omzet : ${formatRupiahDisplay(totalOmzet)}`,margin,finalY);

  finalY += 12;

  /* ================= GAJI TIM ================= */

  const teamPayroll = {};

  rows.forEach((b)=>{

    let team=[];

    if(Array.isArray(b.team_jobs)) team=b.team_jobs;
    else if(typeof b.team_jobs==="string"){
      try{team=JSON.parse(b.team_jobs)}catch{}
    }

    team.forEach((t)=>{
  const name = t?.name || "Tanpa Nama";
  const income = Number(t?.income) || 0;

  if(!teamPayroll[name]) teamPayroll[name]=0;
  teamPayroll[name]+=income;
    });

  });

doc.setFont("helvetica","bold");
doc.text("Gaji Tim",margin,finalY);

  finalY += 6;

  let totalGajiTim = 0;

  doc.setFont("helvetica","normal");

  Object.entries(teamPayroll).forEach(([name,salary])=>{

  totalGajiTim += salary;

    doc.text(name,margin,finalY);

    doc.text(
      formatRupiahDisplay(salary),
      pageWidth - margin,
      finalY,
      {align:"right"}
    );

    finalY += 5;

  });

  doc.setFont("helvetica","bold");

  doc.text("Total Gaji Tim",margin,finalY);

  doc.text(
    formatRupiahDisplay(totalGajiTim),
    pageWidth - margin,
    finalY,
    {align:"right"}
  );

  finalY += 12;

  /* ================= BONUS & POTONGAN ================= */

  doc.setFont("helvetica","bold");
  doc.text("Bonus & Potongan",margin,finalY);

  finalY += 6;

  const monthAdjustments = adjustments.filter(
    (a)=>a.bulan===groupedData[selectedMonth].label
  );

doc.setFont("helvetica","normal");

  if(monthAdjustments.length===0){

    doc.text("Tidak ada penyesuaian.",margin,finalY);

    finalY += 6;

  }else{

    monthAdjustments.forEach((adj)=>{

      let text = `${adj.team_name} : `;

      if(adj.bonus>0)
        text+=`+${formatRupiahDisplay(adj.bonus)} `;

      if(adj.potongan>0)
        text+=`-${formatRupiahDisplay(adj.potongan)} `;

      if(adj.description)
        text+=`(${adj.description})`;

      doc.text(text,margin,finalY);

      finalY += 5;

    });

  }

  finalY += 8;

  /* ================= TOTAL KESELURUHAN ================= */

  const totalKeseluruhan =
    totalOmzet - totalGajiTim;

  doc.setFont("helvetica","bold");
  doc.setFontSize(13);

  doc.text(
    "TOTAL KESELURUHAN",
    margin,
    finalY
  );

  doc.text(
    formatRupiahDisplay(totalKeseluruhan),
    pageWidth - margin,
    finalY,
    {align:"right"}
  );

  /* ================= SAVE ================= */

  doc.save(`Invoice-${selectedMonth}.pdf`);
};
  /* ================= SAVE EDIT ================= */
  const handleSave = async () => {
    if (!editingBooking) return;

    const cleanedTeam =
      editingBooking.team_jobs?.map((t) => ({
        name: t?.name?.trim() || "",
        role: t?.role?.trim() || "",
        income: Number(t?.income) || 0,
      })) || [];

    const { error } = await supabase
      .from("bookings")
      .update({
        client_name: editingBooking.client_name,
        acara: editingBooking.acara,
        date: editingBooking.date,
        time: editingBooking.time,
        location: editingBooking.location,
        dp: Number(editingBooking.dp) || 0,
        pelunasan: Number(editingBooking.pelunasan) || 0,
        team_jobs: cleanedTeam,
      })
      .eq("id", editingBooking.id);

    if (error) return alert("Gagal menyimpan booking");

    alert("Booking berhasil disimpan");
    setEditingBooking(null);
    fetchData();
  };

  /* ================= TEAM CONTROL ================= */
  const updateTeamMember = (index, field, value) => {
    const updated = [...(editingBooking.team_jobs || [])];
    updated[index] = {
      ...updated[index],
      [field]: field === "income" ? Number(value) : value,
    };
    setEditingBooking({ ...editingBooking, team_jobs: updated });
  };

  const addTeam = () => {
    setEditingBooking({
      ...editingBooking,
      team_jobs: [
        ...(editingBooking.team_jobs || []),
        { name: "", role: "", income: 0 },
      ],
    });
  };

  const removeTeam = (index) => {
    setEditingBooking({
      ...editingBooking,
      team_jobs: editingBooking.team_jobs.filter((_, i) => i !== index),
    });
  };

  /* ================= NORMALIZE TEAM ================= */
  const openEdit = (b) => {
    let parsedTeam = [];

    if (b.team_jobs) {
      if (Array.isArray(b.team_jobs)) parsedTeam = b.team_jobs;
      else if (typeof b.team_jobs === "string") {
        try { parsedTeam = JSON.parse(b.team_jobs); } catch {}
      }
    }

    const normalized = parsedTeam.map((t) => ({
      name: t?.name || "",
      role: t?.role || "",
      income: Number(t?.income ?? t?.nominal) || 0,
    }));

    setEditingBooking({ ...b, team_jobs: normalized });
  };

  const totalTeamIncome = useMemo(() => {
    if (!editingBooking?.team_jobs) return 0;
    return editingBooking.team_jobs.reduce(
      (total, t) => total + (Number(t.income) || 0),
      0
    );
  }, [editingBooking]);

/* ================= RUPIAH INPUT FORMAT ================= */
const formatRupiahInput = (value) => {
  if (!value) return "";
  const number = value.toString().replace(/\D/g, "");
  return new Intl.NumberFormat("id-ID").format(number);
};

const parseRupiahToNumber = (value) => {
  if (!value) return 0;
  return Number(value.toString().replace(/\D/g, ""));
};

  return (
    <>
      <div className="card">
        <h3>Data Booking</h3>

        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
          {Object.keys(groupedData)
  .sort()
  .map((month) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              style={{
                padding:"6px 14px",
                borderRadius:20,
                border:"1px solid #333",
                background:selectedMonth===month?"#cba58a":"#111",
                color:selectedMonth===month?"#000":"#cba58a",
              }}
            >
              {groupedData[month].label}
            </button>
          ))}

          {user?.role==="admin" && selectedMonth && (
            <button onClick={downloadPDF} style={saveBtn}>
              Download PDF
            </button>
          )}
        </div>

        {selectedMonth && groupedData[selectedMonth] && (
          <>
            <table style={{ width:"100%" }}>
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
                {groupedData[selectedMonth].rows.map((b)=>(
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
                        (Number(b.dp)||0)+(Number(b.pelunasan)||0)
                      )}
                    </td>
                    <td style={td}>
                      <button style={editBtn} onClick={()=>openEdit(b)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {user?.role==="admin" && (
              <div style={{ textAlign:"right", marginTop:10 }}>
                Total Bulan Ini: {formatRupiahDisplay(groupedData[selectedMonth].total)}
              </div>
            )}
          </>
        )}
      </div>

      {editingBooking && (
  <div style={overlay}>
    <div style={modal}>
      <h3 style={{ marginBottom: 10 }}>Edit Booking</h3>

      {/* ===== SCROLL AREA ===== */}
      <div style={modalBody}>

        {/* ================= DATA BOOKING ================= */}
        <h4>Informasi Booking</h4>

        <input
          style={input}
          value={editingBooking.client_name || ""}
          onChange={(e)=>setEditingBooking({...editingBooking, client_name:e.target.value})}
          placeholder="Nama Client"
        />

        <input
          style={input}
          value={editingBooking.phone || ""}
          onChange={(e)=>setEditingBooking({...editingBooking, phone:e.target.value})}
          placeholder="No HP"
        />

        <input
          style={input}
          value={editingBooking.acara || ""}
          onChange={(e)=>setEditingBooking({...editingBooking, acara:e.target.value})}
          placeholder="Acara"
        />

        <input
          style={input}
          type="date"
          value={editingBooking.date || ""}
          onChange={(e)=>setEditingBooking({...editingBooking, date:e.target.value})}
        />

        <input
          style={input}
          type="time"
          value={editingBooking.time || ""}
          onChange={(e)=>setEditingBooking({...editingBooking, time:e.target.value})}
        />

        <textarea
          style={{ ...input, minHeight:80 }}
          value={editingBooking.location || ""}
          onChange={(e)=>setEditingBooking({...editingBooking, location:e.target.value})}
          placeholder="Alamat"
        />

        <input
          style={input}
          value={formatRupiahInput(editingBooking.dp)}
          onChange={(e)=>
            setEditingBooking({
              ...editingBooking,
              dp: parseRupiahToNumber(e.target.value),
            })
          }
          placeholder="DP"
        />

        <input
          style={input}
          value={formatRupiahInput(editingBooking.pelunasan)}
          onChange={(e)=>
            setEditingBooking({
              ...editingBooking,
              pelunasan: parseRupiahToNumber(e.target.value),
            })
          }
          placeholder="Pelunasan"
        />

        {/* ================= TEAM SECTION (TIDAK DIUBAH) ================= */}
        <h4 style={{ marginTop:30 }}>Tim yang Turun</h4>

        {editingBooking.team_jobs?.map((t,i)=>(
          <div key={i} style={teamBox}>
            <input
              style={input}
              list="team-name-options"
              value={t.name || ""}
              onChange={(e)=>updateTeamMember(i,"name",e.target.value)}
              placeholder="Ketik atau pilih nama"
            />

            <input
              style={input}
              list="role-options"
              value={t.role || ""}
              onChange={(e)=>updateTeamMember(i,"role",e.target.value)}
              placeholder="Role"
            />

            <input
              style={input}
              value={formatRupiahInput(t.income)}
              onChange={(e)=>
                updateTeamMember(
                  i,
                  "income",
                  parseRupiahToNumber(e.target.value)
                )
              }
              placeholder="Income"
            />

            <button style={cancelBtn} onClick={()=>removeTeam(i)}>Hapus</button>
          </div>
        ))}

        <datalist id="team-name-options">
          {teamNameOptions.map((name,idx)=>(
            <option key={idx} value={name} />
          ))}
        </datalist>

        <datalist id="role-options">
          {roleOptions.map((role,idx)=>(
            <option key={idx} value={role} />
          ))}
        </datalist>

        <div style={{ marginTop:10, fontWeight:600 }}>
          Total Income Tim: {formatRupiahDisplay(totalTeamIncome)}
        </div>

        <button style={editBtn} onClick={addTeam}>
          + Tambah Tim / Freelance
        </button>

      </div>

      {/* ===== FIXED FOOTER ===== */}
      <div style={modalFooter}>
        <button style={saveBtn} onClick={handleSave}>Save</button>
        <button style={cancelBtn} onClick={()=>setEditingBooking(null)}>Cancel</button>
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