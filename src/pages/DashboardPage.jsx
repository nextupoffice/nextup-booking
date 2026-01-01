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
      <header
        className="dashboard-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={logo} alt="NextUp Logo" style={{ width: 90 }} />
          <h2>Dashboard</h2>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            color: "#cba58a",
            border: "1px solid #cba58a",
            padding: "8px 14px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </header>

      {/* ================= ADMIN VIEW ================= */}
      {user?.role === "admin" && (
        <>
          <BookingForm />

          {/* 🔽 TOMBOL DOWNLOAD EXCEL (POSISI JELAS) */}
          <div style={{ margin: "12px 0" }}>
            <button
              onClick={() => exportBookingToExcel(bookings)}
              style={{
                background: "#cba58a",
                color: "#000",
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Download Data Booking (Excel)
            </button>
          </div>

          {/* TABEL BOOKING */}
          <BookingTable data={bookings} />

          <TeamRevenue />
        </>
      )}

      {/* ================= TIM VIEW ================= */}
      {user?.role === "tim" && <MyJobs />}
    </div>
  );
}
