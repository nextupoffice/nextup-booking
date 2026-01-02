import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png"; // ✅ WAJIB IMPORT

const users = [
  { username: "Nextup", password: "Nextup123", role: "admin" },
  { username: "Azky", password: "1234", role: "tim" },
  { username: "Resty", password: "1234", role: "tim" },
  { username: "Daffa", password: "1234", role: "tim" },
  { username: "Tio", password: "1234", role: "tim" },
];

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      localStorage.setItem(
        "user",
        JSON.stringify({ username: user.username, role: user.role })
      );
      navigate("/dashboard");
    } else {
      setError("Username atau password salah!");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#121212",
        padding: 16, // ✅ MOBILE AMAN
      }}
    >
      <form
        className="card"
        style={{
          width: "100%",
          maxWidth: 360, // ✅ RESPONSIVE
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: 28,
        }}
        onSubmit={handleLogin}
      >
        {/* LOGO */}
        <img
          src={logo}               // ✅ INI KUNCI FIX VERCEL
          alt="NextUp Logo"
          style={{
            width: 90,
            margin: "0 auto 10px",
            display: "block",
          }}
        />

        <h2 style={{ textAlign: "center" }}>Login</h2>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <span
            style={{
              color: "red",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {error}
          </span>
        )}

        <button type="submit">Masuk</button>
      </form>
    </div>
  );
}
