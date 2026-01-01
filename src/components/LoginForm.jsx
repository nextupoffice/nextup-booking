import { useState } from "react";

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!username || !password) {
      setError("Username dan password wajib diisi");
      return;
    }
    onLogin({ username, role: "tim" });
  };

  return (
    <div className="card" style={{ maxWidth: 400 }}>
      <h2 style={{ color: "#cba58a", textAlign: "center" }}>Login Tim</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: "100%", padding: 10 }}
      />
      <input
        type={showPassword ? "text" : "password"}
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 10 }}
      />
      <label style={{ fontSize: 12 }}>
        <input
          type="checkbox"
          checked={showPassword}
          onChange={() => setShowPassword(!showPassword)}
        /> Tampilkan password
      </label>
      <button
        onClick={handleLogin}
        style={{
          width: "100%",
          padding: 12,
          marginTop: 10,
          backgroundColor: "#a98367",
          color: "white",
          border: "none",
          borderRadius: 4
        }}
      >
        Login
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
