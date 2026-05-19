import { useEffect } from 'react';
import { useAI } from '../hooks/useAI';
import ChatBox from '../components/ChatBox';
import GrafanaPanel from '../components/GrafanaPanel';

export default function AIAnalyst() {
  const { messages, loading, briefing, loadBriefing, sendMessage } = useAI();

  useEffect(() => {
    loadBriefing();
  }, [loadBriefing]);

  return (
    <GrafanaPanel className="min-h-[600px] col-span-12">
      <ChatBox
        messages={messages}
        onSend={sendMessage}
        loading={loading}
        briefing={briefing}
      />
    </GrafanaPanel>
  );
}
