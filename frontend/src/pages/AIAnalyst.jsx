import { useEffect } from 'react';
import { useAI } from '../hooks/useAI';
import ChatBox from '../components/ChatBox';

export default function AIAnalyst() {
  const { messages, loading, briefing, loadBriefing, sendMessage } = useAI();

  useEffect(() => {
    loadBriefing();
  }, [loadBriefing]);

  return (
    <div className="card min-h-[600px]">
      <ChatBox
        messages={messages}
        onSend={sendMessage}
        loading={loading}
        briefing={briefing}
      />
    </div>
  );
}
