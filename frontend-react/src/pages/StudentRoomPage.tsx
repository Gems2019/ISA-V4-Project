import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const StudentRoomPage = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string>('');
  
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection
  useEffect(() => {
    if (!roomCode) return;

    // Use WebSocket URL from backend response
    const wsUrl = (location.state as { wsUrl?: string })?.wsUrl;
    if (!wsUrl) {
      setError('WebSocket URL not provided');
      return;
    }

    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      setError('');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'transcription' && data.text) {
          setTranscriptions(prev => [...prev, data.text]);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection error');
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [roomCode, location.state]);

  const handleLeaveRoom = () => {
    navigate('/student');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Student Room: {roomCode}</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <p>
          <strong>Status:</strong>{' '}
          {wsConnected ? (
            <span style={{ color: 'green' }}>Connected</span>
          ) : (
            <span style={{ color: 'red' }}>Disconnected</span>
          )}
        </p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleLeaveRoom}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            backgroundColor: '#757575',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Leave Room
        </button>
      </div>

      <div style={{ 
        border: '1px solid #ccc', 
        borderRadius: '4px', 
        padding: '15px',
        minHeight: '300px',
        maxHeight: '500px',
        overflowY: 'auto',
        backgroundColor: '#f9f9f9'
      }}>
        <h3>Transcriptions:</h3>
        {transcriptions.length === 0 ? (
          <p style={{ color: '#666' }}>Waiting for transcriptions...</p>
        ) : (
          <p style={{ lineHeight: '1.5' }}>
            {transcriptions.join(' ')}
          </p>
        )}
      </div>
    </div>
  );
};

export default StudentRoomPage;
