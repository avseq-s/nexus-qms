"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Image as ImageIcon, Save, CheckCircle } from 'lucide-react';

export default function SystemSettingsPage() {
  const [appName, setAppName] = useState('EF Prism');
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('QMS_APP_NAME');
    const savedLogo = localStorage.getItem('QMS_APP_LOGO');
    if (savedName) setAppName(savedName);
    if (savedLogo) setAppLogo(savedLogo);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAppLogo(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    localStorage.setItem('QMS_APP_NAME', appName);
    if (appLogo) {
      localStorage.setItem('QMS_APP_LOGO', appLogo);
    } else {
      localStorage.removeItem('QMS_APP_LOGO');
    }
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    
    // Quick reload warning to apply to sidebar
    if (confirm('Settings saved! Would you like to reload the page to apply the branding changes immediately?')) {
      window.location.reload();
    }
  };

  const handleClearLogo = () => {
    setAppLogo(null);
  };

  return (
    <div className="animate-fade-in stagger-1">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">System Settings</h1>
          <p className="text-secondary">Configure global brand identity and application parameters</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '800px' }}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={20} color="var(--accent-primary)" />
            Brand Identity Configuration
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Application Name</label>
              <input 
                className="input-field" 
                value={appName} 
                onChange={(e) => setAppName(e.target.value)} 
                placeholder="e.g. EF Prism"
              />
              <p style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: 'var(--text-muted)' }}>
                This is displayed in the sidebar, login screen, and generated PDF reports.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">Custom Application Logo</label>
              
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginTop: '0.5rem' }}>
                <div style={{ 
                  width: '80px', height: '80px', borderRadius: 'var(--radius-md)', 
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden'
                 }}>
                  {appLogo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={appLogo} alt="App Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <ImageIcon size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <button className="btn btn-secondary" onClick={() => document.getElementById('logo-upload')?.click()} style={{ marginBottom: '0.5rem' }}>
                    <ImageIcon size={16} /> Upload New Logo
                  </button>
                  <input type="file" id="logo-upload" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                  
                  {appLogo && (
                    <button className="btn btn-secondary" onClick={handleClearLogo} style={{ marginLeft: '0.5rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                      Revert to Default
                    </button>
                  )}
                  
                  <p style={{ fontSize: '0.75rem', marginTop: '0.6rem', color: 'var(--text-muted)' }}>
                    Upload a transparent PNG or SVG file. Recommended size: 256x256px.
                    The logo will automatically scale for the sidebar and login menus.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '1rem 0' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={16} />
                Save Changes & Apply
              </button>
              {isSaved && (
                <span className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.85rem' }}>
                  <CheckCircle size={14} /> Settings Saved
                </span>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
