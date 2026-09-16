import React from 'react';

interface StatusMessageProps {
  message: string | null;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="status-message">
      {message}
    </div>
  );
};
