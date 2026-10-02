import React from 'react';
import {
  NavigationArrowIcon,
  GuardianMeshIcon,
  ChevronRightIcon,
  ToolkitIcon,
  TimerIcon
} from './Icons';

interface SafetyShortcutsProps {
  onSafeRouteClick: () => void;
  onGuardianClick: () => void;
  onTimerClick: () => void;
  onToolkitClick: () => void;
}

export const SafetyShortcuts: React.FC<SafetyShortcutsProps> = ({
  onSafeRouteClick,
  onGuardianClick,
  onTimerClick,
  onToolkitClick,
}) => {
  return (
    <section className="safety-shortcuts-container" aria-label="Safety Shortcuts">
      {/* Primary Row: Safe Route + Nearby Guardian */}
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
      </div>

      {/* Secondary Row: Safety Timer + Toolkit */}
      <div className="shortcuts-row-two-col">
        <button
          className="shortcut-card primary-card"
          onClick={onTimerClick}
          aria-label="Open Safety Timer"
        >
          <div className="shortcut-icon-circle bg-blue-tint">
            <TimerIcon size={20} color="#3B82F6" />
          </div>
          <div className="shortcut-text-block">
            <span className="shortcut-title">Safe Timer</span>
            <span className="shortcut-subtitle">Dead man's switch</span>
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
