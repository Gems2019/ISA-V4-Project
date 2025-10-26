// src/pages/UserLandingPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthTokenRole';
import apiClient from '../services/apiClient';

interface ApiUsage {
  count: number;
  limit: number;
}

const StudentLandingPage = () => {
  const { auth, logout } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [apiUsage, setApiUsage] = useState<ApiUsage>({ count: 0, limit: 20 });
  const [loading, setLoading] = useState(false);

  // Fetch API usage count when the page loads
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await apiClient.get<ApiUsage>('/api/usage');
        setApiUsage(response.data);
      } catch (error) {
        console.error('Failed to fetch API usage', error);
      }
    };
    fetchUsage();
  }, []); // The empty array [] means this runs only once on load

  const handlePromptSubmit = async () => {
    setLoading(true);
    try {
      // Our API helper automatically adds the token!
      const response = await apiClient.post('/your-ai-endpoint', { prompt });
      setAiResponse(response.data.story); // Or whatever your AI returns
      
      // Update the usage count
      setApiUsage((prev) => ({ ...prev, count: prev.count + 1 }));

    } catch (error) {
      console.error('Failed to call AI service', error);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Welcome, Student!</h2>
      <p>
        API Calls Used: {apiUsage.count} / {apiUsage.limit}
      </p>
      
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your AI prompt..."
      />
      <button onClick={handlePromptSubmit} disabled={loading}>
        {loading ? 'Thinking...' : 'Generate'}
      </button>

      {aiResponse && (
        <article>
          <h3>AI Response:</h3>
          <p>{aiResponse}</p>
        </article>
      )}

      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default StudentLandingPage;