import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const ShieldLogoIcon: React.FC<IconProps> = ({ size = 28, color = '#EF4444', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 7V13M9 10L15 10M12 16.5H12.01"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const LocationPinIcon: React.FC<IconProps> = ({ size = 18, color = '#10B981', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" />
    <circle cx="12" cy="10" r="3" fill={color} stroke="none" />
  </svg>
);

export const NavigationArrowIcon: React.FC<IconProps> = ({ size = 20, color = '#4F46E5', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="3 11 22 2 13 21 11 13 3 11" fill={color} fillOpacity="0.15" />
  </svg>
);

export const UsersIcon: React.FC<IconProps> = ({ size = 20, color = '#8B5CF6', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" />
    <circle cx="9" cy="7" r="4" fill={color} fillOpacity="0.15" />
    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" />
    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" />
  </svg>
);

export const PhoneCallIcon: React.FC<IconProps> = ({ size = 20, color = '#10B981', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path
      d="M22 16.92V19.92C22.0011 20.1986 21.9441 20.4743 21.8326 20.7294C21.721 20.9845 21.5574 21.2137 21.3522 21.4019C21.147 21.5902 20.9046 21.7336 20.6407 21.8228C20.3769 21.912 20.0974 21.9452 19.82 21.92C16.7428 21.5857 13.787 20.5342 11.19 18.85C8.77382 17.3148 6.72533 15.2663 5.19 12.85C3.49997 10.2413 2.44824 7.27109 2.12 4.18C2.09501 3.90356 2.12787 3.62502 2.2165 3.36208C2.30512 3.09913 2.44763 2.85744 2.63476 2.65275C2.8219 2.44806 3.04958 2.28487 3.30308 2.17376C3.55657 2.06266 3.83033 2.00608 4.107 2.00799H7.107C7.5953 1.99523 8.06798 2.16709 8.43365 2.49033C8.79932 2.81358 9.03058 3.26466 9.083 3.75799C9.18121 4.68819 9.40874 5.60228 9.76 6.47799C9.9148 6.85871 9.94828 7.27599 9.85642 7.67566C9.76456 8.07533 9.55135 8.43884 9.244 8.71799L7.972 9.98999C9.39077 12.4849 11.5151 14.6092 14.01 16.028L15.282 14.756C15.5612 14.4486 15.9247 14.2354 16.3243 14.1436C16.724 14.0517 17.1413 14.0852 17.522 14.24C18.3977 14.5913 19.3118 14.8188 20.242 14.917C20.7408 14.9698 21.1966 15.2052 21.5208 15.5772C21.8449 15.9492 22.0131 16.4299 21.993 16.92H22Z"
      fill={color}
      fillOpacity="0.15"
    />
  </svg>
);

export const GuardianMeshIcon: React.FC<IconProps> = ({ size = 20, color = '#F59E0B', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="7" r="4" fill={color} fillOpacity="0.15" />
    <path d="M5.5 21C5.5 17.41 8.41 14.5 12 14.5C15.59 14.5 18.5 17.41 18.5 21" />
    <path d="M19 8C20.66 8 22 9.34 22 11C22 12.66 20.66 14 19 14" strokeWidth="1.8" strokeDasharray="2 2" />
    <path d="M5 8C3.34 8 2 9.34 2 11C2 12.66 3.34 14 5 14" strokeWidth="1.8" strokeDasharray="2 2" />
  </svg>
);

export const SettingsGearIcon: React.FC<IconProps> = ({ size = 20, color = '#64748B', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="3" fill={color} fillOpacity="0.15" />
    <path d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L20.12 17.21A2 2 0 1 1 17.29 20.04L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14 20.85V21.5A2 2 0 1 1 10 21.5V20.85A1.65 1.65 0 0 0 8.92 19.32A1.65 1.65 0 0 0 7.1 19.65L6.71 20.04A2 2 0 1 1 3.88 17.21L4.27 16.82A1.65 1.65 0 0 0 4.6 15A1.65 1.65 0 0 0 3.07 13.92H2.42A2 2 0 1 1 2.42 9.92H3.07A1.65 1.65 0 0 0 4.6 8.84A1.65 1.65 0 0 0 4.27 7.02L3.88 6.63A2 2 0 1 1 6.71 3.8L7.1 4.19A1.65 1.65 0 0 0 8.92 4.52A1.65 1.65 0 0 0 10 2.99V2.34A2 2 0 1 1 14 2.34V2.99A1.65 1.65 0 0 0 15.08 4.52A1.65 1.65 0 0 0 16.9 4.19L17.29 3.8A2 2 0 1 1 20.12 6.63L19.73 7.02A1.65 1.65 0 0 0 19.4 8.84A1.65 1.65 0 0 0 20.93 9.92H21.58A2 2 0 1 1 21.58 13.92H20.93A1.65 1.65 0 0 0 19.4 15Z" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 16, color = '#94A3B8', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({ size = 18, color = '#10B981', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 22S4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z" fill={color} fillOpacity="0.15" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

export const UserAvatarIcon: React.FC<IconProps> = ({ size = 18, color = '#475569', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" />
    <circle cx="12" cy="7" r="4" fill={color} fillOpacity="0.2" />
  </svg>
);

export const SosBroadcastIcon: React.FC<IconProps> = ({ size = 32, color = '#FFFFFF', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 16.92V19.92C22.0011 20.1986 21.9441 20.4743 21.8326 20.7294C21.721 20.9845 21.5574 21.2137 21.3522 21.4019C21.147 21.5902 20.9046 21.7336 20.6407 21.8228C20.3769 21.912 20.0974 21.9452 19.82 21.92C16.7428 21.5857 13.787 20.5342 11.19 18.85C8.77382 17.3148 6.72533 15.2663 5.19 12.85C3.49997 10.2413 2.44824 7.27109 2.12 4.18C2.09501 3.90356 2.12787 3.62502 2.2165 3.36208C2.30512 3.09913 2.44763 2.85744 2.63476 2.65275C2.8219 2.44806 3.04958 2.28487 3.30308 2.17376C3.55657 2.06266 3.83033 2.00608 4.107 2.00799H7.107C7.5953 1.99523 8.06798 2.16709 8.43365 2.49033C8.79932 2.81358 9.03058 3.26466 9.083 3.75799C9.18121 4.68819 9.40874 5.60228 9.76 6.47799C9.9148 6.85871 9.94828 7.27599 9.85642 7.67566C9.76456 8.07533 9.55135 8.43884 9.244 8.71799L7.972 9.98999C9.39077 12.4849 11.5151 14.6092 14.01 16.028L15.282 14.756C15.5612 14.4486 15.9247 14.2354 16.3243 14.1436C16.724 14.0517 17.1413 14.0852 17.522 14.24C18.3977 14.5913 19.3118 14.8188 20.242 14.917C20.7408 14.9698 21.1966 15.2052 21.5208 15.5772C21.8449 15.9492 22.0131 16.4299 21.993 16.92H22Z" fill="currentColor" fillOpacity="0.2" />
    <path d="M14 1C17.866 1.5 21 4.634 21.5 8.5" strokeWidth="2" />
    <path d="M14 4.5C16 5 17.5 6.5 18 8.5" strokeWidth="2" />
  </svg>
);
