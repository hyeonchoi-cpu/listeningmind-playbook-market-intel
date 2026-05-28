export function TopNav() {
  return (
    <div className="nav">
      <a href="#cover" className="nav-brand">
        <div className="nav-logo" />
        ListeningMind <span className="sep">/</span>
        <span className="sub">Enterprise Playbook</span>
      </a>
      <div className="nav-tabs">
        <a href="#cover" className="nav-tab" data-active="true">12 Things</a>
        <a href="#cmo" className="nav-tab">CMO</a>
        <a href="#mi" className="nav-tab">MI</a>
        <a href="#md" className="nav-tab">MD</a>
        <a href="#pm" className="nav-tab">PM</a>
        <a href="#gro" className="nav-tab">GRO</a>
        <a href="#dat" className="nav-tab">DAT</a>
      </div>
    </div>
  );
}
