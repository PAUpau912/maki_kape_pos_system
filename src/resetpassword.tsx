import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import "../src/assets/css/resetpassword.css";
import bg from "./assets/img/signin.jpg";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError("Invalid or expired reset link.");
      }
    });
  }, []);

  const handleReset = async () => {
    if (!password) {
      setError("Please enter a new password");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setMsg("Password updated successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 3000);
    }
  };

  return (
    <div className="container" style={{ backgroundImage: `url(${bg})` }}>
      <div className="login_form">
        <h2>Reset Password</h2>

        {error && <div className="error-message">{error}</div>}
        {msg && <div className="success-message">{msg}</div>}

        {!msg && !error && (
          <div className="form-group">
            <label>New Password:</label>
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            <button onClick={handleReset}>Set New Password</button>
          </div>
        )}

        {error && (
          <button className="secondary" onClick={() => navigate("/login")}>
            Request new reset link
          </button>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
