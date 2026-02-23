import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabase/client";
import { formatRupiahDisplay } from "../utils/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function BookingTable() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [groupedData, setGroupedData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);

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

      const monthKey = new Date(b.date).toLocaleString("id-ID", {
        month: "long",
        year: "numeric",
      });

      if (!grouped[monthKey])
        grouped[monthKey] = { rows: [], total: 0 };

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
  }, []);

  useEffect(() => {
    const months = Object.keys(groupedData);
    if (months.length > 0 && !selectedMonth)
      setSelectedMonth(months[months.length - 1]);
  }, [groupedData]);

  /* ================= PDF ================= */
  const downloadPDF = () => {
    if (!selectedMonth) return;

    const doc = new jsPDF();
    const rows = groupedData[selectedMonth].rows;

    autoTable(doc, {
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
          (Number(b.dp) || 0) + (Number(b.pelunasan) || 0)
        ),
      ]),
    });

    doc.save(`Booking-${selectedMonth}.pdf`);
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
        phone: editingBooking.phone,
        acara: editingBooking.acara,
        date: editingBooking.date,
        time: editingBooking.time,
        location: editingBooking.location,
        dp: Number(editingBooking.dp) || 0,
        pelunasan: Number(editingBooking.pelunasan) || 0,
        team_jobs: cleanedTeam,
      })
      .eq("id", editingBooking.id);

    if (error) {
      console.error("Gagal menyimpan:", error);
      return;
    }

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

  return (
    <>
      <div className="card">
        <h3>Data Booking</h3>

        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
          {Object.keys(groupedData).map((month) => (
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
              {month}
            </button>
          ))}

          {user?.role==="admin" && selectedMonth && (
            <button onClick={downloadPDF} style={saveBtn}>
              Download PDF
            </button>
          )}
        </div>

        {editingBooking && (
          <div style={overlay}>
            <div style={modal}>
              <h3>Edit Booking</h3>

              <div style={modalContent}>
                <input style={input} value={editingBooking.client_name || ""} onChange={(e)=>setEditingBooking({...editingBooking, client_name:e.target.value})} placeholder="Nama Client" />
                <input style={input} value={editingBooking.phone || ""} onChange={(e)=>setEditingBooking({...editingBooking, phone:e.target.value})} placeholder="No HP" />
                <input style={input} value={editingBooking.acara || ""} onChange={(e)=>setEditingBooking({...editingBooking, acara:e.target.value})} placeholder="Acara" />
                <input style={input} type="date" value={editingBooking.date || ""} onChange={(e)=>setEditingBooking({...editingBooking, date:e.target.value})} />
                <input style={input} type="time" value={editingBooking.time || ""} onChange={(e)=>setEditingBooking({...editingBooking, time:e.target.value})} />
                <input style={input} value={editingBooking.location || ""} onChange={(e)=>setEditingBooking({...editingBooking, location:e.target.value})} placeholder="Alamat" />
                <input style={input} type="number" value={editingBooking.dp || 0} onChange={(e)=>setEditingBooking({...editingBooking, dp:e.target.value})} placeholder="DP" />
                <input style={input} type="number" value={editingBooking.pelunasan || 0} onChange={(e)=>setEditingBooking({...editingBooking, pelunasan:e.target.value})} placeholder="Pelunasan" />

                <h4 style={{ marginTop:20 }}>Tim yang Turun</h4>

                {editingBooking.team_jobs?.map((t,i)=>(
                  <div key={i} style={teamBox}>
                    <input style={input} value={t.name || ""} onChange={(e)=>updateTeamMember(i,"name",e.target.value)} placeholder="Nama" />
                    <input style={input} value={t.role || ""} onChange={(e)=>updateTeamMember(i,"role",e.target.value)} placeholder="Role" />
                    <input style={input} type="number" value={t.income || 0} onChange={(e)=>updateTeamMember(i,"income",e.target.value)} placeholder="Income" />
                    <button style={cancelBtn} onClick={()=>removeTeam(i)}>Hapus</button>
                  </div>
                ))}

                <div style={{ marginTop:10, fontWeight:600 }}>
                  Total Income Tim: {formatRupiahDisplay(totalTeamIncome)}
                </div>

                <button style={editBtn} onClick={addTeam}>
                  + Tambah Tim / Freelance
                </button>
              </div>

              <div style={modalFooter}>
                <button style={saveBtn} onClick={handleSave}>Save</button>
                <button style={cancelBtn} onClick={()=>setEditingBooking(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ================= STYLE ================= */

const th = { padding:10, color:"#cba58a", textAlign:"left" };
const td = { padding:10, borderBottom:"1px solid #222" };
const editBtn = { padding:"6px 12px", borderRadius:6, border:"1px solid #cba58a", background:"transparent", color:"#cba58a", cursor:"pointer" };
const teamBox = { border:"1px solid #222", padding:10, borderRadius:8, marginBottom:10, display:"flex", flexDirection:"column", gap:6 };

const overlay = { 
  position:"fixed",
  inset:0,
  background:"rgba(0,0,0,0.6)",
  display:"flex",
  justifyContent:"center",
  alignItems:"flex-start",
  overflowY:"auto",
  padding:"40px 15px",
  zIndex:999
};

const modal = { 
  background:"#111",
  borderRadius:16,
  width:"100%",
  maxWidth:520,
  maxHeight:"90vh",
  display:"flex",
  flexDirection:"column",
  color:"#fff"
};

const modalContent = {
  padding:24,
  overflowY:"auto",
  flex:1,
  display:"flex",
  flexDirection:"column",
  gap:8
};

const modalFooter = {
  padding:16,
  borderTop:"1px solid #222",
  display:"flex",
  gap:10,
  justifyContent:"flex-end",
  background:"#111"
};

const input = { padding:8, borderRadius:6, border:"1px solid #333", background:"#1a1a1a", color:"#fff" };
const saveBtn = { padding:"8px 16px", background:"#cba58a", border:"none", borderRadius:6, fontWeight:600, cursor:"pointer" };
const cancelBtn = { padding:"6px 12px", background:"#333", border:"none", borderRadius:6, color:"#fff", cursor:"pointer" };