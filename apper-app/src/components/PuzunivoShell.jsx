import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';
import { useSelector } from 'react-redux';
import './puzunivo-neon.css';

const NAV = [
  { path: '/', label: 'Home', icon: 'House' },
  { path: '/games', label: 'Games', icon: 'Gamepad2' },
  { path: '/challenges', label: 'Challenges', icon: 'Gift' },
  { path: '/rewards', label: 'Rewards', icon: 'Trophy' },
  { path: '/profile', label: 'Profile', icon: 'UserRound' },
];

export function GlowCard({ children, className = '' }) {
  return <div className={'pz-card ' + className}>{children}</div>;
}

export function SectionHeading({ eyebrow, title, action, to }) {
  return (
    <div className="pz-heading-row">
      <div>
        {eyebrow && <p className="pz-kicker">{eyebrow}</p>}
        <h2 className="pz-section-title">{title}</h2>
      </div>
      {to && <Link className="pz-more" to={to}>{action || 'See all'} →</Link>}
    </div>
  );
}

export default function PuzunivoShell({ children, pageTitle = 'PUZUNIVO' }) {
  const user = useSelector(state => state.user.user);
  return (
    <div className="pz-root" aria-label={pageTitle}>
      <header className="pz-neon-header">
        <div className="pz-neon-header-inner">
          <Link to="/" className="pz-logo">
            <span className="pz-logo-brain"><ApperIcon name="BrainCircuit" size={31}/></span>
            <span>PUZUNIVO<small>THINK. PLAY. DISCOVER.</small></span>
          </Link>
          <nav className="pz-neon-nav" aria-label="Main navigation">
            {NAV.map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'}>{item.label}</NavLink>)}
          </nav>
          <div className="pz-header-actions">
            {!user && <Link to="/player/login" className="pz-button pz-button-secondary" style={{minHeight:38,padding:'8px 13px',fontSize:12}}>Sign in</Link>}
            <Link to="/profile" className="pz-round" aria-label="My profile"><ApperIcon name="UserRound" size={21}/></Link>
          </div>
        </div>
      </header>
      <main className="pz-main">{children}</main>
      <nav className="pz-bottom-bar" aria-label="Mobile navigation">
        {NAV.map(item => (
          <NavLink to={item.path} end={item.path === '/'} key={item.path}>
            <ApperIcon name={item.icon} size={21}/>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
