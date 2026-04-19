export default function Logo() {
  return (
    <div className="logo">
      <div className="logo-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="18" height="18" aria-hidden="true">
          <line x1="208" y1="128" x2="128" y2="208" stroke="var(--bg)" strokeLinecap="round" strokeWidth="30" />
          <line x1="192" y1="40"  x2="40"  y2="192" stroke="var(--bg)" strokeLinecap="round" strokeWidth="30" />
        </svg>
      </div>
      <span className="logo-text" >FFG WebApps</span>
    </div>
  );
}
