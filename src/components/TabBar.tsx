import { NavLink } from "react-router-dom";

export function TabBar() {
  return (
    <nav className="tabbar">
      <NavLink to="/" end>
        <span className="icon">🏠</span>Home
      </NavLink>
      <NavLink to="/events">
        <span className="icon">📅</span>Events
      </NavLink>
      <NavLink to="/rides">
        <span className="icon">🚗</span>Rides
      </NavLink>
      <NavLink to="/children">
        <span className="icon">👧</span>Kids
      </NavLink>
      <NavLink to="/settings">
        <span className="icon">⚙️</span>Settings
      </NavLink>
    </nav>
  );
}
