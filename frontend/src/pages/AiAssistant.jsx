import React, { useState } from 'react';
import { Bot, Send, Sparkles, AlertCircle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { aiApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { normalizeBrandName, formatPlantName } from '../utils/brand';

export default function AiAssistant() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState('idle'); // 'idle' | 'submitting' | 'answer' | 'no_info' | 'error' | 'network_error'
  const [errorMsg, setErrorMsg] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to AI Plant. Ask me questions about raw material stock levels, critical reorders, demand forecasts, supplier reliability scores, production runs, or QC defect diagnostics.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        'What is the current raw material stock?',
        'Which raw materials are low in stock?',
        'Who are our top rated suppliers?',
        'Show QC defect root cause analysis',
        'Show 30-day demand forecast',
        'What are my assigned roles?'
      ]
    },
  ]);

  // Determine whether a question relates to StockAI plant operations
  const isStockAiRelated = (query) => {
    const q = query.toLowerCase();
    const keywords = [
      'stock', 'material', 'inventory', 'silo', 'warehouse', 'rack', 'shelf', 'bin',
      'reorder', 'purchase', 'procurement', 'order', 'supplier', 'vendor', 'rating', 'score',
      'production', 'run', 'bom', 'extrusion', 'loom', 'conversion', 'machine',
      'qc', 'quality', 'defect', 'inspection', 'root cause', 'mfi', 'astm', 'lab',
      'dispatch', 'shipment', 'delivery', 'pallet', 'gate pass', 'challan', 'truck',
      'role', 'plant', 'user', 'profile', 'mfa', 'totp', 'security', 'auth', 'svp', 'vidha', 'vidhya',
      'forecast', 'demand', 'burn rate', 'capacity', 'workflow', 'system'
    ];
    return keywords.some(k => q.includes(k));
  };

  // Check if query is about the current user's authenticated profile/roles/plant
  const isProfileQuery = (query) => {
    const q = query.toLowerCase();
    return (
      q.includes('who am i') || 
      q.includes('my profile') || 
      q.includes('which plant') || 
      q.includes('assigned plant') || 
      q.includes('mfa') ||
      (q.includes('role') && (q.includes('my') || q.includes('assigned') || q.includes('what') || q.includes('who')))
    );
  };

  const handleSend = async (queryText) => {
    const textToSend = (typeof queryText === 'string' ? queryText : prompt).trim();
    if (!textToSend || loading) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', content: textToSend, timestamp: time }]);
    setPrompt('');
    setErrorMsg(null);
    setLoading(true);
    setState('submitting');

    // 1. Boundary check: unrelated non-project questions
    if (!isStockAiRelated(textToSend)) {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'I can help with StockAI project and operational questions.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestions: [
              'What is the current raw material stock?',
              'Show me 30-day demand forecast',
              'Who are our top rated suppliers?'
            ]
          }
        ]);
        setState('answer');
        setLoading(false);
      }, 300);
      return;
    }

    // 2. Direct Profile / Roles / Plant response from real session
    if (isProfileQuery(textToSend)) {
      setTimeout(() => {
        const rolesList = user?.roles?.join(', ') || 'OPERATOR';
        const plantName = formatPlantName(user?.plantName);
        const reply = `You are authenticated as **${user?.name || 'Operator'}** (${user?.email || 'admin@stockai.internal'}). Your assigned roles are: **${rolesList}**. You are assigned to **${plantName}**. Account status is Active.`;
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestions: ['What is the current raw material stock?', 'Show top suppliers']
          }
        ]);
        setState('answer');
        setLoading(false);
      }, 300);
      return;
    }

    // 3. Genuine Backend AI Query Execution
    try {
      const res = await aiApi.query(textToSend);
      const data = res.data;
      const rawAnswer = data?.answer || data?.response || null;
      const answer = normalizeBrandName(rawAnswer);

      if (!answer && (!data?.structuredData || data.structuredData.length === 0)) {
        setState('no_info');
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'No specific project information was found matching your query.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setState('answer');
        const normalizedStructured = Array.isArray(data?.structuredData)
          ? data.structuredData.map(item => {
              if (item && typeof item === 'object' && item.plantName) {
                return { ...item, plantName: formatPlantName(item.plantName) };
              }
              return item;
            })
          : [];

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: answer,
            intent: data?.intent,
            structuredData: normalizedStructured,
            suggestions: Array.isArray(data?.suggestedActions) ? data.suggestedActions : [],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      const isNetError = !err.response && Boolean(err.message);
      const msg = err.response?.data?.message || err.message || 'Backend AI query service error.';
      setState(isNetError ? 'network_error' : 'error');
      setErrorMsg(msg);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Operational Error: ${msg}`,
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      height: '100%',
      maxWidth: '920px',
      margin: '0 auto',
      width: '100%',
      minHeight: 0,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div>
        <h1 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--accent-cyan)" /> AI Plant
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Ask about StockAI operations and project data
        </p>
      </div>

      {/* Question Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          className="input"
          placeholder="Ask about raw materials, low stock, demand forecast, top suppliers, QC diagnostics..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
          style={{ flex: 1, fontSize: '12.5px' }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!prompt.trim() || loading}
          style={{ minWidth: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          <span>{loading ? 'Asking...' : 'Ask'}</span>
        </button>
      </form>

      {/* Suggested Quick Question Chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[
          'What is the current raw material stock?',
          'Which raw materials are low in stock?',
          'Who are our top rated suppliers?',
          'Show QC defect root cause analysis',
          'Show 30-day demand forecast'
        ].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSend(q)}
            disabled={loading}
            className="btn btn-secondary btn-xs"
            style={{ fontSize: '11px', padding: '3px 8px' }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* State / Error Notification */}
      {errorMsg && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-coral)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Conversation Area Underneath */}
      <div style={{
        flex: 1,
        minHeight: 0,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: m.role === 'user' ? 'var(--bg-surface-active)' : 'var(--bg-card)',
              border: '1px solid',
              borderColor: m.isError ? 'rgba(239, 68, 68, 0.4)' : (m.role === 'user' ? 'var(--border-strong)' : 'var(--border-subtle)'),
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              lineHeight: '1.5'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '10.5px', color: 'var(--text-muted)' }}>
              {m.role === 'user' ? (
                <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>You</span>
              ) : (
                <span style={{ fontWeight: '600', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Bot size={13} /> AI Plant
                </span>
              )}
              <span>· {m.timestamp}</span>
              {m.intent && (
                <span style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(0, 210, 255, 0.12)',
                  color: 'var(--accent-cyan)',
                  marginLeft: 'auto'
                }}>
                  {m.intent}
                </span>
              )}
            </div>

            <div>{m.content}</div>

            {/* Structured Data Table/Grid if returned */}
            {m.structuredData && m.structuredData.length > 0 && (
              <div style={{
                marginTop: '10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                padding: '8px',
                maxHeight: '180px',
                overflowY: 'auto'
              }}>
                <div style={{ fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Operational Records ({m.structuredData.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {m.structuredData.slice(0, 5).map((row, rIdx) => (
                    <div key={rIdx} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '3px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
                        {row.materialName || row.supplierName || row.primaryRootCause || row.orderNumber || JSON.stringify(row).slice(0, 40)}
                      </span>
                      <span className="font-mono" style={{ color: row.status === 'LOW_STOCK' ? 'var(--accent-coral)' : 'var(--accent-cyan)' }}>
                        {row.availableStockKg !== undefined ? `${row.availableStockKg} kg` : (row.compositeScore ? `Score: ${row.compositeScore}` : (row.status || ''))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Follow-up Prompts */}
            {m.suggestions && m.suggestions.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {m.suggestions.map((s, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => handleSend(s)}
                    disabled={loading}
                    className="btn btn-ghost btn-xs"
                    style={{ fontSize: '10.5px', padding: '2px 6px', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 210, 255, 0.2)' }}
                  >
                    <ChevronRight size={11} /> {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Loader2 size={14} className="animate-spin" color="var(--accent-cyan)" />
            <span>Analyzing StockAI project and operational telemetry...</span>
          </div>
        )}
      </div>
    </div>
  );
}
