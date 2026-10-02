import React from 'react';
import {
  NavigationArrowIcon,
  UsersIcon,
  GuardianMeshIcon,
  ChevronRightIcon,
  ToolkitIcon
} from './Icons';

interface SafetyShortcutsProps {
  onSafeRouteClick: () => void;
  onContactsClick: () => void;
  onGuardianClick: () => void;
  onToolkitClick: () => void;
}

export const SafetyShortcuts: React.FC<SafetyShortcutsProps> = ({
  onSafeRouteClick,
  onContactsClick,
  onGuardianClick,
  onToolkitClick,
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

      {/* Secondary Row: Nearby Guardian */}
      <div className="shortcuts-row-two-col">
        <button
          className="shortcut-card primary-card"
          onClick={onGuardianClick}
          aria-label="Open Nearby Guardian mesh network"
        >
          <div className="shortcut-icon-circle bg-blue-tint">
            <GuardianMeshIcon size={20} color="#3B82F6" />
          </div>
          <div className="shortcut-text-block">
            <span className="shortcut-title">Nearby Guardian</span>
            <span className="shortcut-subtitle">People around you</span>
          </div>
          <div className="shortcut-arrow">
            <ChevronRightIcon size={16} color="#94A3B8" />
          </div>
        </button>

        <button
          className="shortcut-card primary-card"
          onClick={onToolkitClick}
          aria-label="Open Safety Toolkit"
        >
          <div className="shortcut-icon-circle bg-blue-tint">
            <ToolkitIcon size={20} color="#3B82F6" />
          </div>
          <div className="shortcut-text-block">
            <span className="shortcut-title">Safety Toolkit</span>
            <span className="shortcut-subtitle">More features</span>
          </div>
          <div className="shortcut-arrow">
            <ChevronRightIcon size={16} color="#94A3B8" />
          </div>
        </button>
      </div>
    </section>
  );
};

export default SafetyShortcuts;
