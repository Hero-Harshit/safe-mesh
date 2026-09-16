interface StatusMessageProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
}

const StatusMessage: React.FC<StatusMessageProps> = ({ message, type = 'info' }) => {
  if (!message) return null;
  
  const backgroundColor = type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--text-secondary)';
  
  return (
    <div className="status-toast" role="status" aria-live="polite" style={{ background: backgroundColor }}>
      {message}
    </div>
  );
};

export default StatusMessage;
