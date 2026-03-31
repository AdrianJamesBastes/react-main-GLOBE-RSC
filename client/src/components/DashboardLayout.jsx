import '../styles/Dashboard_styles.css';
import LoadingScreen from './LoadingScreen';

// A very light wrapper that renders the shared container, header and loader.
// `headerActions` is a JSX fragment rendered next to the logo.
export default function DashboardLayout({ isLoading, logo, onLogoClick, headerActions, children }) {
  return (
    <div className="app-container">
      {isLoading && <LoadingScreen logo={logo} />}

      <header className="top-bar">
        <div className="logo-section">
          <img
            className="globe-logo"
            onClick={onLogoClick} style={{cursor: 'pointer'}}
            src={logo}
            alt="Globe Logo"
          />
        </div>
        {headerActions}
      </header>

      <div className="main-layout">
        {children}
      </div>
    </div>
  );
}
