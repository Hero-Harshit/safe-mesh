interface StatusMessageProps {
  message: string | null;
}

const StatusMessage: React.FC<StatusMessageProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="status-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
};

export default StatusMessage;
