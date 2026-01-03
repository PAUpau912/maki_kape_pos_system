import { useEffect, useState } from "react";
import Sidebar from "./assets/components/sidebar";
import { supabase } from "../src/supabaseClient";
import "../src/assets/css/settings.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  // Account info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [profilePic, setProfilePic] = useState(""); // filename stored in DB

  // Preview and new file state
  const [newProfilePicFile, setNewProfilePicFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Security
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // 🔹 Fetch logged-in user
  useEffect(() => {
  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUser(user);
    setEmail(user.email);

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", user.id)
      .single();

      if (data) {
    setFullName(data.full_name ?? "");
    setRole(data.role ?? "");
    setProfilePic(data.profile_pic ?? "");
    if (data.profile_pic) {
      setPreviewUrl(await getSignedUrl(data.profile_pic));
    }
  }


    // Removed login history
  };

  fetchUser();
}, []);


  // 🔹 Generate signed URL for private avatar
  const getSignedUrl = async (filename: string) => {
    const { data, error } = await supabase.storage
      .from("avatars")
      .createSignedUrl(filename, 60);

    if (error) {
      console.error("Error getting signed URL:", error.message);
      return "/default-avatar.png";
    }

    return data.signedUrl;
  };
  // 🔹 Select new image (preview only)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file only");
      return;
    }
    setNewProfilePicFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // 🔹 Update profile (name + optional new image)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let filename = profilePic;

      if (newProfilePicFile) {
        setUploading(true);
        const fileExt = newProfilePicFile.name.split(".").pop();
        filename = `${user.id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filename, newProfilePicFile, { upsert: true });

        if (uploadError) throw uploadError;
        setUploading(false);
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ full_name: fullName, profile_pic: filename })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfilePic(filename);
      setNewProfilePicFile(null);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      alert("Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) alert("Error changing password");
    else {
      alert("Password changed successfully!");
      setNewPassword("");
    }
  };

  // 🔹 Logout securely
  const handleLogout = async () => {
    await supabase.auth.signOut();

    // Redirect and prevent back button
    navigate("/", { replace: true });
    window.history.pushState(null, "", "/");
    window.onpopstate = () => window.history.go(1);
  };

  return (
    <div className="settings-container">
      <Sidebar />
      <div className="settings-content">
        <div className="settings-header">
          <h2>Settings</h2>
          <p>Manage your account and security preferences</p>
        </div>

        <div className="settings-grid">
          {/* ================= ACCOUNT SETTINGS ================= */}
          <section className="settings-section">
            <h3>Account Settings</h3>
            <form onSubmit={handleUpdateProfile} className="settings-form">
              <label>Profile Picture</label>
              <div className="profile-upload">
                {previewUrl && <img src={previewUrl} alt="Profile" className="profile-preview" />}
                <input type="file" accept="image/*" onChange={handleImageSelect} disabled={uploading} />
              </div>
              {uploading && <small>Uploading image...</small>}

              <label>Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />

              <label>Email</label>
              <input type="email" value={email} disabled />

              <label>Role</label>
              <input type="text" value={role} disabled />

              <button type="submit" disabled={loading || uploading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </form>

            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </section>

          {/* ================= SECURITY SETTINGS ================= */}
         <section className="settings-section security">
            <h3>Security Settings</h3>
            <form onSubmit={handleChangePassword} className="settings-form">
              <label>New Password</label>
              <div className="password-input-wrapper" style={{ position: 'relative', width: '100%' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    paddingRight: '2.5rem', // space for icon
                    boxSizing: 'border-box',
                  }}
                />
                <span
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    color: '#555',
                  }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              <button type="submit" style={{ marginTop: '1rem' }}>Change Password</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;
