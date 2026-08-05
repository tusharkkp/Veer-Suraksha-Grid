import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSystem } from '@/contexts/SystemContext';
import { MessageSquare, Bell, Send } from 'lucide-react';

const CommPanel: React.FC = () => {
  const { t, lang } = useLanguage();
  const { chatMessages, eventLog, sendChat } = useSystem();
  const [tab, setTab] = useState<'chat' | 'alerts'>('chat');
  const [input, setInput] = useState('');

  const alerts = eventLog.filter(e => e.severity === 'warning' || e.severity === 'critical').slice(0, 20);

  const handleSend = () => {
    if (!input.trim()) return;
    sendChat(input, input, true);
    // Simulate worker reply
    setTimeout(() => {
      const replies = lang === 'mr'
        ? ['समजले, ठीक आहे', 'होय, PPE तयार', 'मी जागेवर आहे', 'सेन्सर तपासत आहे']
        : ['Understood, okay', 'Yes, PPE ready', 'I am on site', 'Checking sensors'];
      sendChat(replies[Math.floor(Math.random() * replies.length)], replies[Math.floor(Math.random() * replies.length)], false);
    }, 2000);
    setInput('');
  };

  return (
    <div className="gov-card p-4 flex flex-col h-80">
      <h3 className="panel-header flex items-center gap-2">
        <MessageSquare className="h-4 w-4"/>{t('comms.title')}
      </h3>

      <div className="flex gap-1 mb-3">
        <button onClick={() => setTab('chat')} className={`px-3 py-1 text-xs rounded font-medium transition-colors ${tab === 'chat' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
          {t('comms.chat')}
        </button>
        <button onClick={() => setTab('alerts')} className={`px-3 py-1 text-xs rounded font-medium transition-colors ${tab === 'alerts' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
          {t('comms.alerts')} {alerts.length > 0 && <span className="ml-1 bg-[hsl(var(--risk-red))] text-white px-1.5 rounded-full text-[10px]">{alerts.length}</span>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-0">
        {tab === 'chat' ? (
          chatMessages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{lang === 'mr' ? 'संवाद सुरू करा...' : 'Start a conversation...'}</p>
          ) : (
            chatMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] px-3 py-1.5 rounded-lg text-xs ${msg.isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="font-semibold text-[10px] mb-0.5">{lang === 'mr' ? msg.fromMr : msg.from}</p>
                  <p>{lang === 'mr' ? msg.messageMr : msg.message}</p>
                  <p className="text-[9px] opacity-60 mt-0.5">{msg.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          )
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className={`p-2 rounded border text-xs ${alert.severity === 'critical' ? 'bg-[hsl(var(--risk-red-bg))] border-[hsl(var(--risk-red)/0.3)]' : 'bg-[hsl(var(--risk-yellow-bg))] border-[hsl(var(--risk-yellow)/0.3)]'}`}>
              <div className="flex items-center gap-1.5">
                <Bell className="h-3 w-3"/>
                <span className="font-semibold">{lang === 'mr' ? alert.messageMr : alert.message}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{alert.timestamp.toLocaleTimeString()} — {alert.source}</p>
            </div>
          ))
        )}
      </div>

      {tab === 'chat' && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={t('comms.type_msg')}
            className="flex-1 px-3 py-1.5 text-xs border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button onClick={handleSend} className="p-2 bg-primary text-primary-foreground rounded hover:opacity-90 active:scale-95 transition-all">
            <Send className="h-3.5 w-3.5"/>
          </button>
        </div>
      )}
    </div>
  );
};

export default CommPanel;
