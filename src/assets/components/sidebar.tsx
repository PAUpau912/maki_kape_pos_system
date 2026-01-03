import '../css/sidebar.css';
import logo from '../img/maki_kape.jpg';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; 

// react-icons
import {
  FaStore,
  FaHome,
  FaBox,
  FaCog,
  FaBars,
  FaTimes
} from 'react-icons/fa';

interface ProfileData {
  user_id: string;
  full_name: string | null;
  profile_pic: string | null;
}

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const [profile, setProfile] = useState<ProfileData | null>(null);

  // fetch profile
  const getProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, full_name, profile_pic')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return;

      // fetch signed URL for profile pic if available
      if (data.profile_pic) {
        const { data: urlData, error: urlError } = await supabase.storage
          .from('avatars')
          .createSignedUrl(data.profile_pic, 60);
        if (!urlError) data.profile_pic = urlData.signedUrl;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // check auth and fetch profile
  useEffect(() => {
    const fetchAuthProfile = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!session?.user) return;
      if (error) return console.error(error);
      await getProfile(session.user.id);
    };

    fetchAuthProfile();

    // listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setProfile(null);
      } else {
        getProfile(session.user.id);
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  const sidebarItems = [
    { icon: <FaStore />, label: 'Menu', route: '/menu' },
    { icon: <FaHome />, label: 'Dashboard', route: '/dashboard' },
    { icon: <FaBox />, label: 'Inventory', route: '/inventory' },
    { icon: <FaCog />, label: 'Settings', route: '/settings' },
  ];

  return (
    <>
      {/* HAMBURGER BUTTON (MOBILE ONLY) */}
      <button className="hamburger-btn" onClick={() => setIsOpen(true)}>
        <FaBars />
      </button>

      {/* OVERLAY */}
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}

      {/* SIDEBAR */}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar_logo">
          <img src={logo} alt="Maki Kape Logo" />
          <button className="close-btn" onClick={() => setIsOpen(false)}>
            <FaTimes />
          </button>
        </div>

        {sidebarItems.map(item => {
          const isActive = location.pathname === item.route;
          return (
            <div
              key={item.label}
              className={`sidebar__item${isActive ? ' active' : ''}`}
              onClick={() => {
                navigate(item.route);
                setIsOpen(false);
              }}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}

        {/* --- Profile at the bottom --- */}
        {profile && (
          <div className="sidebar__profile">
            <img
              src={profile.profile_pic ?? '/default-avatar.png'}
              alt="Profile"
              className="sidebar__profile-pic"
            />
            <span className="sidebar__profile-name">{profile.full_name ?? "User"}</span>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
