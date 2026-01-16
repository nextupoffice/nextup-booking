import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

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

    if (!error) setBookings(data);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  const renderDay = (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const dayBookings = bookings.filter(
      (b) => b.date === dateStr
    );

    return (
      <td key={day} className={dayBookings.length ? "filled" : ""}>
        <div className="day-number">{day}</div>

        {dayBookings.map((b) => (
          <div key={b.id} className="event">
            <strong>{b.acara}</strong>
            <div className="client">{b.client_name}</div>
          </div>
        ))}
      </td>
    );
  };

  const days = Array.from({ length: getDaysInMonth() }, (_, i) => i + 1);

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
          <tr>
            {days.map(renderDay)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
