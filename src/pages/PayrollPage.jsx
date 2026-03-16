import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { formatRupiahDisplay } from "../utils/format";

export default function PayrollPage() {

  const [payrollData, setPayrollData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [months, setMonths] = useState([]);

  /* ================= FETCH DATA ================= */
  const fetchPayroll = async () => {

    const { data: bookings } = await supabase
      .from("bookings")
      .select("date, team_jobs");

    const { data: adjustments } = await supabase
      .from("team_adjustments")
      .select("*");

    if (!bookings) return;

    const payrollMap = {};
    const monthSet = new Set();

    bookings.forEach((b) => {

      if (!b.date) return;

      const monthKey = new Date(b.date).toLocaleString("id-ID", {
        month: "long",
        year: "numeric",
      });

      monthSet.add(monthKey);

      let team = [];

      if (Array.isArray(b.team_jobs)) team = b.team_jobs;
      else if (typeof b.team_jobs === "string") {
        try { team = JSON.parse(b.team_jobs); } catch {}
      }

      team.forEach((t) => {

        const name = t?.name || "Tanpa Nama";
        const income = Number(t?.income) || 0;

        const key = `${name}-${monthKey}`;

        if (!payrollMap[key]) {
          payrollMap[key] = {
            name,
            month: monthKey,
            totalJob: 0,
            incomeBooking: 0,
            bonus: 0,
            potongan: 0,
          };
        }

        payrollMap[key].totalJob += 1;
        payrollMap[key].incomeBooking += income;

      });

    });

    /* ================= APPLY ADJUSTMENTS ================= */

    adjustments?.forEach((adj) => {

      Object.values(payrollMap).forEach((p) => {

        if (p.name === adj.team_name) {
          p.bonus += Number(adj.bonus) || 0;
          p.potongan += Number(adj.potongan) || 0;
        }

      });

    });

    const result = Object.values(payrollMap).map((p) => ({
      ...p,
      totalGaji:
        (Number(p.incomeBooking) || 0) +
        (Number(p.bonus) || 0) -
        (Number(p.potongan) || 0),
    }));

    setPayrollData(result);
    setMonths(Array.from(monthSet));

    if (!selectedMonth && monthSet.size > 0) {
      setSelectedMonth(Array.from(monthSet).pop());
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  /* ================= FILTER DATA ================= */

  const filteredData = payrollData.filter(
    (p) => p.month === selectedMonth
  );

  return (
    <div className="card">

      <h2>Payroll Tim</h2>

      {/* ================= MONTH SELECT ================= */}

      <div style={{ marginBottom: 20 }}>

        {months.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(m)}
            style={{
              marginRight: 10,
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid #333",
              background: selectedMonth === m ? "#cba58a" : "#111",
              color: selectedMonth === m ? "#000" : "#cba58a",
              cursor: "pointer"
            }}
          >
            {m}
          </button>
        ))}

      </div>

      {/* ================= TABLE ================= */}

      <table style={{ width: "100%" }}>

        <thead>
          <tr>
            <th style={th}>Nama Tim</th>
            <th style={th}>Total Job</th>
            <th style={th}>Income Booking</th>
            <th style={th}>Bonus</th>
            <th style={th}>Potongan</th>
            <th style={th}>Total Gaji</th>
          </tr>
        </thead>

        <tbody>

          {filteredData.map((row, i) => (

            <tr key={i}>

              <td style={td}>{row.name}</td>

              <td style={td}>{row.totalJob}</td>

              <td style={td}>
                {formatRupiahDisplay(row.incomeBooking)}
              </td>

              <td style={td}>
                {formatRupiahDisplay(row.bonus)}
              </td>

              <td style={td}>
                {formatRupiahDisplay(row.potongan)}
              </td>

              <td style={{ ...td, fontWeight: 600 }}>
                {formatRupiahDisplay(row.totalGaji)}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

/* ================= STYLE ================= */

const th = {
  padding: 10,
  textAlign: "left",
  color: "#cba58a",
};

const td = {
  padding: 10,
  borderBottom: "1px solid #222",
};