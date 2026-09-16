import React from 'react';
import {
  NavigationArrowIcon,
  UsersIcon,
  PhoneCallIcon,
  GuardianMeshIcon,
  SettingsGearIcon,
  ChevronRightIcon,
} from './Icons';

interface SafetyShortcutsProps {
  onSafeRouteClick: () => void;
  onContactsClick: () => void;
  onCall112Click: () => void;
  onGuardianClick: () => void;
  onSettingsClick: () => void;
}

export const SafetyShortcuts: React.FC<SafetyShortcutsProps> = ({
  onSafeRouteClick,
  onContactsClick,
  onCall112Click,
  onGuardianClick,
  onSettingsClick,
}) => {
  return (
    <section className="safety-shortcuts-container" aria-label="Safety Shortcuts">
      {/* Primary Row: Safe Route + Emergency Contacts */}
      <div className="shortcuts-row-two-col">
        <button
          className="shortcut-card primary-card"
          onClick={onSafeRouteClick}
          aria-label="Open Safe Route navigation"
        >
          <div className="shortcut-icon-circle bg-blue-tint">
            <NavigationArrowIcon size={20} color="#3B82F6" />
          </div>
          <div className="shortcut-text-block">
            <span className="shortcut-title">Safe Route</span>
            <span className="shortcut-subtitle">Find a safer way</span>
          </div>
          <div className="shortcut-arrow">
            <ChevronRightIcon size={16} color="#94A3B8" />
          </div>
        </button>

        <button
          className="shortcut-card primary-card"
          onClick={onContactsClick}
          aria-label="Manage Emergency Contacts"
        >
          <div className="shortcut-icon-circle bg-purple-tint">
            <UsersIcon size={20} color="#8B5CF6" />
          </div>
          <div className="shortcut-text-block">
            <span className="shortcut-title">Emergency Contacts</span>
            <span className="shortcut-subtitle">Reach your people</span>
          </div>
          <div className="shortcut-arrow">
            <ChevronRightIcon size={16} color="#94A3B8" />
          </div>
        </button>
      </div>

      {/* Secondary Row: Call 112 + Nearby Guardian + Settings */}
      <div className="shortcuts-row-three-col">
        <button
          className="shortcut-card compact-card"
          onClick={onCall112Click}
          aria-label="Call 112 Emergency Helpline"
        >
          <div className="compact-header-row">
            <div className="shortcut-icon-circle bg-green-tint">
              <PhoneCallIcon size={18} color="#10B981" />
            </div>
            <div className="compact-arrow">
              <ChevronRightIcon size={13} color="#94A3B8" />
            </div>
          </div>
          <div className="shortcut-text-block compact-text">
            <span className="shortcut-title">Call 112</span>
            <span className="shortcut-subtitle">Emergency Helpline</span>
          </div>
        </button>

        <button
          className="shortcut-card compact-card"
          onClick={onGuardianClick}
          aria-label="Open Nearby Guardian mesh network"
        >
          <div className="compact-header-row">
            <div className="shortcut-icon-circle bg-amber-tint">
              <GuardianMeshIcon size={18} color="#F59E0B" />
            </div>
            <div className="compact-arrow">
              <ChevronRightIcon size={13} color="#94A3B8" />
            </div>
          </div>
          <div className="shortcut-text-block compact-text">
            <span className="shortcut-title">Nearby Guardian</span>
            <span className="shortcut-subtitle">People around you</span>
          </div>
        </button>

        <button
          className="shortcut-card compact-card"
          onClick={onSettingsClick}
          aria-label="Open SafeMesh App Settings"
        >
          <div className="compact-header-row">
            <div className="shortcut-icon-circle bg-slate-tint">
              <SettingsGearIcon size={18} color="#64748B" />
            </div>
            <div className="compact-arrow">
              <ChevronRightIcon size={13} color="#94A3B8" />
            </div>
          </div>
          <div className="shortcut-text-block compact-text">
            <span className="shortcut-title">Settings</span>
            <span className="shortcut-subtitle">App preferences</span>
          </div>
        </button>
      </div>
    </section>
  );
};

export default SafetyShortcuts;
