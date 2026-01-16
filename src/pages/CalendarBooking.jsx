import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import "../assets/calendar.css";

export default function CalendarBooking() {
  const [bookings, setBookings] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, client_name, acara, date");

    if (!error) setBookings(data || []);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Minggu

  const changeMonth = (offset) => {
    const newDate = new Date(year, month + offset, 1);
    setCurrentMonth(newDate);
  };

  /* ===== BUILD CALENDAR ===== */
  const calendarCells = [];

  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day);
  }

  const weeks = [];
  for (let i = 0; i < calendarCells.length; i += 7) {
    weeks.push(calendarCells.slice(i, i + 7));
  }

  const renderDay = (day, index) => {
    if (!day) {
      return <td key={`empty-${index}`} className="empty"></td>;
    }

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    const dayBookings = bookings.filter((b) => b.date === dateStr);

    return (
      <td key={day}>
        <div className="day-number">{day}</div>

        {/* EVENT LIST (ANTI KACAU) */}
        <div className="events">
          {dayBookings.map((b) => (
            <div key={b.id} className="event">
              <strong>{b.acara}</strong>
              <div className="client">{b.client_name}</div>
            </div>
          ))}
        </div>
      </td>
    );
  };

  return (
    <div className="calendar-card">
      <div className="calendar-header">
        <button onClick={() => changeMonth(-1)}>‹</button>

        <h3>
          {currentMonth.toLocaleString("id-ID", {
            month: "long",
            year: "numeric",
          })}
        </h3>

        <button onClick={() => changeMonth(1)}>›</button>
      </div>

      {/* ===== MOBILE SCROLL WRAPPER (WAJIB) ===== */}
      <div className="calendar-scroll">
        <table className="calendar-table">
          <thead>
            <tr>
              <th>Min</th>
              <th>Sen</th>
              <th>Sel</th>
              <th>Rab</th>
              <th>Kam</th>
              <th>Jum</th>
              <th>Sab</th>
            </tr>
          </thead>

          <tbody>
            {weeks.map((week, i) => (
              <tr key={i}>
                {week.map(renderDay)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
