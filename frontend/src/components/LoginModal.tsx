import React, { useState } from 'react';
import {
  X, ShieldCheck, UserCheck, Lock, ArrowRight,
  AlertTriangle, KeyRound, Building, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requiredRole?: 'officer' | 'citizen';
}

export const LoginModal: React.FC<Props> = ({ isOpen, onClose, requiredRole }) => {
  const { user, loginDemo, loginCredentials, logout, loading, error, clearError } = useAuth();
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectRole = async (role: 'citizen' | 'officer') => {
    await loginDemo(role);
    onClose();
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setFormError('Please enter username and password');
      return;
    }
    try {
      setFormError(null);
      await loginCredentials(username, password);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Invalid credentials');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm font-body">
      <div className="relative w-full max-w-lg bg-white border-3 border-rt-ink rounded-[6px] shadow-brutal-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="bg-rt-primary border-b-3 border-rt-ink p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white border-2 border-rt-ink rounded-[3px] flex items-center justify-center font-black text-sm">
              <Lock className="w-4 h-4 text-rt-ink" />
            </div>
            <div>
              <h3 className="font-headline font-black text-sm text-rt-ink uppercase tracking-wider">
                {requiredRole === 'officer' ? 'Municipal Officer Authentication Required' : 'Select Verified Identity Workspace'}
              </h3>
              <p className="text-[11px] font-mono text-rt-ink">
                Session-backed role authorization &bull; RupeeTrace Public Integrity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white rounded border border-rt-ink transition-colors"
          >
            <X className="w-5 h-5 text-rt-ink" />
          </button>
        </div>

        {/* Notice Banner if blocked by role */}
        {requiredRole === 'officer' && (
          <div className="bg-rt-coral text-white p-3 border-b-2 border-rt-ink text-xs font-mono flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Restricted Area: Officer credentials required to access audits, tenders, and budget simulators.
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          <div className="text-center space-y-1">
            <h4 className="font-headline font-black text-lg text-rt-ink">
              Authenticate With Demo Identity or Credentials
            </h4>
            <p className="text-xs font-mono text-rt-secondary-text">
              Selecting an identity issues a separate server-backed Bearer session token. Permissions are enforced by backend APIs.
            </p>
          </div>

          {/* 2 Big Persona Demo Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Card 1: Citizen Persona */}
            <div
              onClick={() => handleSelectRole('citizen')}
              className={`p-4 border-3 border-rt-ink rounded-[6px] cursor-pointer transition-all flex flex-col justify-between space-y-3 group ${
                user?.role === 'citizen'
                  ? 'bg-rt-primary shadow-brutal translate-x-[-1px] translate-y-[-1px]'
                  : 'bg-rt-canvas hover:bg-white shadow-brutal-sm'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded bg-white border-2 border-rt-ink flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-rt-ink" />
                  </span>
                  <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-white border border-rt-ink">
                    DEMO IDENTITY &bull; CITIZEN
                  </span>
                </div>
                <h5 className="font-headline font-black text-sm text-rt-ink group-hover:underline">
                  Sunita Sharma
                </h5>
                <p className="text-[11px] font-mono text-rt-secondary-text">
                  Ward K/E Resident &bull; Andheri East
                </p>
                <div className="pt-2 text-[10px] font-mono text-rt-ink space-y-1 border-t border-rt-ink/20">
                  <div>&bull; Public Road Passports</div>
                  <div>&bull; 7-Stage Repair Photo Verification</div>
                  <div>&bull; JANMAT Participatory Voting</div>
                  <div>&bull; Personal Activity Tracker</div>
                </div>
              </div>

              <button className="w-full py-1.5 bg-white group-hover:bg-rt-primary border-2 border-rt-ink rounded font-headline font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0px_#171717]">
                <span>Authenticate Citizen</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Card 2: Officer Persona */}
            <div
              onClick={() => handleSelectRole('officer')}
              className={`p-4 border-3 border-rt-ink rounded-[6px] cursor-pointer transition-all flex flex-col justify-between space-y-3 group ${
                user?.role === 'officer'
                  ? 'bg-rt-mint shadow-brutal translate-x-[-1px] translate-y-[-1px]'
                  : 'bg-rt-canvas hover:bg-white shadow-brutal-sm'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded bg-white border-2 border-rt-ink flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-rt-ink" />
                  </span>
                  <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-rt-mint border border-rt-ink text-rt-ink">
                    DEMO IDENTITY &bull; OFFICER
                  </span>
                </div>
                <h5 className="font-headline font-black text-sm text-rt-ink group-hover:underline">
                  Er. R. K. Patil
                </h5>
                <p className="text-[11px] font-mono text-rt-secondary-text">
                  Executive Engineer &bull; AC Office K/East
                </p>
                <div className="pt-2 text-[10px] font-mono text-rt-ink space-y-1 border-t border-rt-ink/20">
                  <div>&bull; Money Trace Investigation Board</div>
                  <div>&bull; DLP Sentinel &amp; Forensic Audits</div>
                  <div>&bull; Contractor Scorecards &amp; Tenders</div>
                  <div>&bull; Next Rupee Budget Optimizer</div>
                </div>
              </div>

              <button className="w-full py-1.5 bg-white group-hover:bg-rt-mint border-2 border-rt-ink rounded font-headline font-bold text-xs uppercase flex items-center justify-center gap-1 shadow-[1px_1px_0px_#171717]">
                <span>Authenticate Officer</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

          </div>

          {/* Toggle for Custom Username/Password */}
          <div className="pt-2 text-center">
            <button
              onClick={() => {
                setShowCustomForm(!showCustomForm);
                setFormError(null);
                clearError();
              }}
              className="text-xs font-mono font-bold text-rt-ink underline hover:text-neutral-600 flex items-center justify-center gap-1 mx-auto"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showCustomForm ? 'Hide Credential Login' : 'Sign in with Custom Username / Password'}</span>
            </button>
          </div>

          {/* Custom Credential Form */}
          {showCustomForm && (
            <form onSubmit={handleCustomSubmit} className="p-4 bg-rt-canvas border-2 border-rt-ink rounded-[4px] space-y-3 font-mono text-xs">
              {(formError || error) && (
                <div className="p-2 bg-rt-coral text-white rounded font-bold text-[11px]">
                  {formError || error}
                </div>
              )}
              <div>
                <label className="font-bold text-rt-ink block mb-1">Username (citizen / officer)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. officer"
                  className="w-full bg-white border border-rt-ink p-2 rounded focus:outline-none focus:ring-1 focus:ring-rt-ink"
                />
              </div>
              <div>
                <label className="font-bold text-rt-ink block mb-1">Password (citizen123 / officer123)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. officer123"
                  className="w-full bg-white border border-rt-ink p-2 rounded focus:outline-none focus:ring-1 focus:ring-rt-ink"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-rt-primary border-2 border-rt-ink rounded font-headline font-black text-xs uppercase hover:bg-yellow-300"
              >
                {loading ? 'Authenticating...' : 'Authenticate Credentials &rarr;'}
              </button>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="bg-rt-canvas border-t-2 border-rt-ink p-3 text-center text-[10px] font-mono text-rt-secondary-text">
          Session tokens are securely transmitted in all API headers via <code>Authorization: Bearer &lt;token&gt;</code>.
        </div>

      </div>
    </div>
  );
};
