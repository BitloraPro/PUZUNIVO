import React from 'react';
import { Link } from 'react-router-dom';
import ApperIcon from '@/components/ApperIcon';
import AdminShell from '@/components/AdminShell';
import { ADMOB, getAdMobStatus } from '@/services/admob';

export const route = { path: '/admin/settings', layout: 'owner', access: "profile === 'Admin_c'" };

const Item = ({ title, ready, children }) => (
  <div className="pz-admin-row" style={{ alignItems: 'start' }}>
    <span className="pz-admin-tag" aria-label={ready ? 'Ready' : 'Pending'} style={{ background: ready ? '#116c5b' : '#6e3a25' }}>
      {ready ? 'READY' : 'PENDING'}
    </span>
    <div style={{ flex: 1 }}>
      <strong>{title}</strong>
      <p className="pz-copy" style={{ marginTop: 5, fontSize: 12 }}>{children}</p>
    </div>
  </div>
);

export default function AdminSettings() {
  const ads = getAdMobStatus();
  return (
    <AdminShell
      title="Settings & Monetization"
      subtitle="PUZUNIVO's actual environment settings, configured ad identifiers, and release requirements."
    >
      <div className="pz-admin-panels">
        <section className="pz-admin-panel">
          <h2><ApperIcon name="Smartphone" size={21} className="inline-block" /> Google AdMob</h2>
          <p className="pz-copy" style={{ fontSize: 13, marginBottom: 18 }}>
            Your public production ad unit IDs are configured in this Apper project. Test IDs are used in native development builds.
          </p>
          <div className="pz-admin-row" style={{ display: 'block' }}>
            <p className="pz-eyebrow">ANDROID ADMOB APP ID</p>
            <strong style={{ overflowWrap: 'anywhere' }}>{ADMOB.androidAppId || 'Not configured'}</strong>
            <p className="pz-copy" style={{ fontSize: 12, marginTop: 5 }}>
              Provided App ID is configured. The native AndroidManifest will be patched when the Android project is generated and synchronized.
            </p>
          </div>
          <div className="pz-admin-row" style={{ display: 'block' }}>
            <p className="pz-eyebrow">INTERSTITIAL</p>
            <strong style={{ overflowWrap: 'anywhere' }}>{ADMOB.interstitial || 'Not configured'}</strong>
            <p className="pz-copy" style={{ fontSize: 12, marginTop: 5 }}>
              Intended placement: after every third successfully completed level, not after incorrect answers.
            </p>
          </div>
          <div className="pz-admin-row" style={{ display: 'block' }}>
            <p className="pz-eyebrow">REWARDED</p>
            <strong style={{ overflowWrap: 'anywhere' }}>{ADMOB.rewarded || 'Not configured'}</strong>
            <p className="pz-copy" style={{ fontSize: 12, marginTop: 5 }}>
              Intended placement: optional "Watch Ad" after the third incorrect attempt to restore three device-local lives.
            </p>
          </div>
          <div className="pz-admin-row" style={{ display: 'block' }}>
            <p className="pz-eyebrow">AD DELIVERY MODE</p>
            <strong>{ads.testMode ? 'Google test units' : 'Production ad units'}</strong>
          </div>
          <div className="pz-admin-row" style={{ display: 'block' }}>
            <p className="pz-eyebrow">CURRENT RUNTIME</p>
            <strong>{ads.native ? 'Native mobile environment' : 'Web preview'}</strong>
            <p className="pz-copy" style={{ fontSize: 12, marginTop: 5 }}>{ads.reason}</p>
          </div>
        </section>
        <section className="pz-admin-panel">
          <h2>Release Readiness</h2>
          <Item title="Ad Unit IDs" ready={ads.unitsConfigured}>Both production ad unit identifiers use the expected Google format.</Item>
          <Item title="Apper Live Database" ready>PUZUNIVO's existing tables and Admin/Player profiles are connected. This does not mean client gameplay is server-authoritative.</Item>
          <Item title="Android AdMob App ID configured" ready={ads.appIdConfigured}>The supplied Android App ID is saved. Native packaging must still run the manifest configuration script and pass device verification.</Item>
          <Item title="Native Android/iOS package" ready={ads.native}>AdMob cannot display through a standard browser preview. Build the app with the Google Mobile Ads plugin and native SDK.</Item>
          <Item title="Google test-ad mode" ready={ads.testMode}>Test ad units are the default while preparing and validating an Android release. Physical-device consent testing is still pending.</Item>
          <Item title="AdMob server-side verification" ready={false}>Google's signed callback, replay protection, and account-bound reward grants are required for authoritative cloud life/refill credits.</Item>
          <Item title="Secure cloud gameplay scoring" ready={false}>Level completion, XP, and coins must be validated on the backend before release.</Item>
        </section>
      </div>
      <div className="pz-admin-panel" style={{ marginTop: 18 }}>
        <h2>Game Rules</h2>
        <div className="pz-statbar">
          <div className="pz-statbox"><strong>3</strong><span>Lives per game</span></div>
          <div className="pz-statbox"><strong>15 min</strong><span>Free refill timer</span></div>
          <div className="pz-statbox"><strong>30</strong><span>Level slots per difficulty</span></div>
        </div>
        <p className="pz-copy" style={{ fontSize: 12, marginTop: 14 }}>
          These values describe the current gameplay implementation. Rewarded and interstitial ads are never faked on web.
        </p>
        <Link className="pz-button pz-button-secondary" style={{ marginTop: 15 }} to="/admin/games">
          Open Game Manager
        </Link>
      </div>
    </AdminShell>
  );
}
