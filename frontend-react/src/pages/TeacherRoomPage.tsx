import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Config from '../config';

const TeacherRoomPage = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string>('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Start recording with chunked sending every 5 seconds
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // Use webm format with opus codec (widely supported)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          await sendAudioChunk();
        }
        audioChunksRef.current = [];
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setError('');

      // Send audio chunk every 5 seconds
      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          // Stop and restart to trigger ondataavailable
          mediaRecorderRef.current.stop();
          audioChunksRef.current = [];
          mediaRecorderRef.current.start();
        }
      }, 5000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    setIsRecording(false);
  };

  // Simplified WAV conversion - directly encode PCM data
  const convertToWav = async (blob: Blob): Promise<Blob> => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Get mono channel data
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = 16000;
    const numSamples = Math.floor(audioBuffer.duration * sampleRate);
    
    // Create WAV file
    const wavData = new Int16Array(numSamples);
    
    // Resample if needed and convert float32 to int16
    const ratio = audioBuffer.length / numSamples;
    for (let i = 0; i < numSamples; i++) {
      const srcIndex = Math.floor(i * ratio);
      const sample = Math.max(-1, Math.min(1, channelData[srcIndex]));
      wavData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    // Build WAV file
    const wavBuffer = new ArrayBuffer(44 + wavData.length * 2);
    const view = new DataView(wavBuffer);
    
    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + wavData.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(36, 'data');
    view.setUint32(40, wavData.length * 2, true);
    
    // Write PCM data
    for (let i = 0; i < wavData.length; i++) {
      view.setInt16(44 + i * 2, wavData[i], true);
    }
    
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  // Send audio chunk to backend
  const sendAudioChunk = async () => {
    if (audioChunksRef.current.length === 0) return;

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    
    try {
      // Convert to WAV format with correct specifications
      const wavBlob = await convertToWav(audioBlob);
      
      const formData = new FormData();
      formData.append('audio_file', wavBlob, 'recording.wav');
      formData.append('room', roomCode || '');

      const response = await fetch(`${Config.ROOMS_BASE_URL}/process-audio`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process audio');
      }
    } catch (err) {
      console.error('Error sending audio:', err);
      setError('Failed to send audio chunk');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleLeaveRoom = () => {
    stopRecording();
    navigate('/teacher');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Teacher Room: {roomCode}</h2>
      
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
        {!isRecording ? (
          <button 
            onClick={startRecording}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Start Recording
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Stop Recording
          </button>
        )}
        
        <button 
          onClick={handleLeaveRoom}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            marginLeft: '10px',
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
          <p style={{ color: '#666' }}>No transcriptions yet. Start recording to begin.</p>
        ) : (
          <p style={{ lineHeight: '1.5' }}>
            {transcriptions.join(' ')}
          </p>
        )}
      </div>
    </div>
  );
};

export default TeacherRoomPage;
