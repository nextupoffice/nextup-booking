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
  const [teamList, setTeamList] = useState([]);

  /* ================= FETCH TEAM ================= */
  const fetchTeam = async () => {
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
    fetchTeam();
  }, []);

  useEffect(() => {
    const months = Object.keys(groupedData);
    if (months.length > 0 && !selectedMonth)
      setSelectedMonth(months[months.length - 1]);
  }, [groupedData]);

  /* ================= TEAM OPTIONS ================= */

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
        bonus: Number(t?.bonus) || 0,
        potongan: Number(t?.potongan) || 0,
        bulan: t?.bulan || "",
        deskripsi: t?.deskripsi || "",
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
      [field]: ["income","bonus","potongan"].includes(field)
        ? Number(value)
        : value,
    };
    setEditingBooking({ ...editingBooking, team_jobs: updated });
  };

  const addTeam = () => {
    setEditingBooking({
      ...editingBooking,
      team_jobs: [
        ...(editingBooking.team_jobs || []),
        {
          name: "",
          role: "",
          income: 0,
          bonus: 0,
          potongan: 0,
          bulan: "",
          deskripsi: ""
        },
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
      bonus: Number(t?.bonus) || 0,
      potongan: Number(t?.potongan) || 0,
      bulan: t?.bulan || "",
      deskripsi: t?.deskripsi || "",
    }));

    setEditingBooking({ ...b, team_jobs: normalized });
  };

  /* ================= TOTAL TIM ================= */

  const totalTeamIncome = useMemo(() => {
    if (!editingBooking?.team_jobs) return 0;

    return editingBooking.team_jobs.reduce((total, t) => {
      const income = Number(t.income) || 0;
      const bonus = Number(t.bonus) || 0;
      const potongan = Number(t.potongan) || 0;
      return total + income + bonus - potongan;
    }, 0);

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
{/* ======= BAGIAN ATAS TIDAK BERUBAH ======= */}

{editingBooking && (
<div style={overlay}>
<div style={modal}>
<h3 style={{ marginBottom: 10 }}>Edit Booking</h3>

<div style={modalBody}>

<h4>Tim yang Turun</h4>

{editingBooking.team_jobs?.map((t,i)=>(
<div key={i} style={teamBox}>

<input
style={input}
list="team-name-options"
value={t.name || ""}
onChange={(e)=>updateTeamMember(i,"name",e.target.value)}
placeholder="Nama"
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
onChange={(e)=>updateTeamMember(i,"income",parseRupiahToNumber(e.target.value))}
placeholder="Income"
/>

<input
style={input}
value={formatRupiahInput(t.bonus)}
onChange={(e)=>updateTeamMember(i,"bonus",parseRupiahToNumber(e.target.value))}
placeholder="Bonus"
/>

<input
style={input}
value={formatRupiahInput(t.potongan)}
onChange={(e)=>updateTeamMember(i,"potongan",parseRupiahToNumber(e.target.value))}
placeholder="Potongan"
/>

<select
style={input}
value={t.bulan || ""}
onChange={(e)=>updateTeamMember(i,"bulan",e.target.value)}
>
<option value="">Bulan Berlaku</option>
<option>Januari</option>
<option>Februari</option>
<option>Maret</option>
<option>April</option>
<option>Mei</option>
<option>Juni</option>
<option>Juli</option>
<option>Agustus</option>
<option>September</option>
<option>Oktober</option>
<option>November</option>
<option>Desember</option>
</select>

<textarea
style={{...input,minHeight:60}}
value={t.deskripsi || ""}
onChange={(e)=>updateTeamMember(i,"deskripsi",e.target.value)}
placeholder="Alasan bonus / potongan"
/>

<button style={cancelBtn} onClick={()=>removeTeam(i)}>Hapus</button>

</div>
))}

<div style={{ marginTop:10,fontWeight:600 }}>
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

</>
);
}

/* ================= STYLE ================= */

const input = { padding:8,borderRadius:6,border:"1px solid #333",background:"#1a1a1a",color:"#fff" };
const editBtn = { padding:"6px 12px",borderRadius:6,border:"1px solid #cba58a",background:"transparent",color:"#cba58a",cursor:"pointer" };
const teamBox = { border:"1px solid #222",padding:10,borderRadius:8,marginBottom:10,display:"flex",flexDirection:"column",gap:6 };
const overlay = { position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"rgba(0,0,0,0.6)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:999 };
const modal = { background:"#111",borderRadius:12,width:"90%",maxWidth:600,height:"90vh",display:"flex",flexDirection:"column",color:"#fff" };
const modalBody = { flex:1,overflowY:"auto",padding:25,display:"flex",flexDirection:"column",gap:10 };
const modalFooter = { padding:20,borderTop:"1px solid #222",display:"flex",gap:10 };
const saveBtn = { padding:"8px 16px",background:"#cba58a",border:"none",borderRadius:6,fontWeight:600,cursor:"pointer" };
const cancelBtn = { padding:"6px 12px",background:"#333",border:"none",borderRadius:6,color:"#fff",cursor:"pointer" };