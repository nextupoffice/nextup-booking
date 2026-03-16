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

      const d = new Date(b.date);

      const sortKey = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;

      const label = d.toLocaleString("id-ID", {
        month: "long",
        year: "numeric",
      });

      if (!grouped[sortKey]) {
        grouped[sortKey] = {
          label,
          rows: [],
          total: 0,
        };
      }

      grouped[sortKey].rows.push(b);

      if (user?.role === "admin") {
        grouped[sortKey].total +=
          (Number(b.dp) || 0) + (Number(b.pelunasan) || 0);
      }
    });

    setGroupedData(grouped);
  };

  /* ================= SORT MONTH ================= */
  const sortedMonths = Object.keys(groupedData).sort((a, b) =>
    a.localeCompare(b)
  );

  useEffect(() => {
    fetchData();
    fetchTeam();
  }, []);

  useEffect(() => {
    if (sortedMonths.length > 0 && !selectedMonth)
      setSelectedMonth(sortedMonths[sortedMonths.length - 1]);
  }, [groupedData]);

  /* ================= EXTRACT TEAM OPTIONS ================= */
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

    doc.save(`Booking-${groupedData[selectedMonth].label}.pdf`);
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

/* ================= RENDER ================= */

  return (
    <>
      <div className="card">
        <h3>Data Booking</h3>

        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
          {sortedMonths.map((key) => (
            <button
              key={key}
              onClick={() => setSelectedMonth(key)}
              style={{
                padding:"6px 14px",
                borderRadius:20,
                border:"1px solid #333",
                background:selectedMonth===key?"#cba58a":"#111",
                color:selectedMonth===key?"#000":"#cba58a",
              }}
            >
              {groupedData[key].label}
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
    </>
  );
}

/* ================= STYLE ================= */

const th = { padding:10, color:"#cba58a", textAlign:"left" };
const td = { padding:10, borderBottom:"1px solid #222" };
const editBtn = { padding:"6px 12px", borderRadius:6, border:"1px solid #cba58a", background:"transparent", color:"#cba58a", cursor:"pointer" };
const saveBtn = { padding:"8px 16px", background:"#cba58a", border:"none", borderRadius:6, fontWeight:600, cursor:"pointer" };