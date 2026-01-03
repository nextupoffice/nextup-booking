import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "../assets/logo.png";

import BookingForm from "../components/BookingForm";
import TeamRevenue from "../components/TeamRevenue";
import BookingTable from "../components/BookingTable";
import MyJobs from "../components/MyJobs";

import { supabase } from "../supabase/client";
import { exportBookingToExcel } from "../utils/exportBooking";

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const [bookings, setBookings] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  /* =========================
     FETCH DATA BOOKING (ADMIN)
     ========================= */
  useEffect(() => {
    if (user?.role === "admin") {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("date", { ascending: false });

    if (!error) {
      setBookings(data || []);
    }
  };

  return (
    <div className="dashboard-wrapper">
      
      {/* ================= HEADER ================= */}
<header className="dashboard-header">
  <div className="dashboard-brand">
    <img
      src={logo}
      alt="NextUp Logo"
      className="dashboard-logo"
    />
    <h2 className="dashboard-title">Dashboard</h2>
  </div>

  <button className="logout-btn" onClick={handleLogout}>
    Logout
  </button>
</header>

      {/* ================= ADMIN VIEW ================= */}
      {user?.role === "admin" && (
        <div className="admin-dashboard">
          <BookingForm />

          {/* DOWNLOAD EXCEL */}
          <div className="excel-action">
            <button onClick={() => exportBookingToExcel(bookings)}>
              Download Data Booking (Excel)
            </button>
          </div>

          <BookingTable data={bookings} />
          <TeamRevenue />
        </div>
      )}

      {/* ================= TIM VIEW ================= */}
      {user?.role === "tim" && (
        <div className="tim-dashboard">
          <MyJobs />
        </div>
      )}
    </div>
  );
}
