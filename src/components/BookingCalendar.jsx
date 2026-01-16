import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

export default function BookingCalendar({ user }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    let query = supabase
      .from("bookings")
      .select(`
        id,
        date,
        start_time,
        end_time,
        status,
        client_name,
        services(name),
        booking_talents(talent_id)
      `);

    // Kalau talent → hanya lihat job sendiri
    if (user.role === "talent") {
      query = query.eq("booking_talents.talent_id", user.id);
    }

    const { data, error } = await query;
    if (error) return console.error(error);

    const calendarEvents = data.map((b) => ({
      id: b.id,
      title: `${b.services?.name || "Job"} – ${b.client_name}`,
      start: `${b.date}T${b.start_time}`,
      end: `${b.date}T${b.end_time}`,
      backgroundColor: getStatusColor(b.status),
    }));

    setEvents(calendarEvents);
  }

  function getStatusColor(status) {
    switch (status) {
      case "confirmed":
        return "#C9A27E"; // gold NextUp
      case "done":
        return "#4CAF50";
      default:
        return "#666";
    }
  }

  return (
    <div style={{ background: "#121212", padding: 16, borderRadius: 12 }}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        height="auto"
      />
    </div>
  );
}
