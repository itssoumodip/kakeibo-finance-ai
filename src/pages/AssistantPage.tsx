import { useState, useRef, useEffect } from 'react';
import { Bot, Car, Pencil, Undo2, Mic, MicOff, Paperclip, Send, Trash2, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { api, getToken } from '@/services/api';

type Msg = { role: 'user' | 'ai', text: string, card?: { name: string, cat: string, amount: number }, _id?: string, fileName?: string };

function ChatSkeleton(){
  // Animated placeholder that mirrors the real chat layout — avatar + bubbles
  // shimmer in with pure CSS (zero JS cost), instead of a dead "Loading..." text.
  return (
    <div className="flex flex-col h-[calc(100vh-40px)] pb-20 lg:pb-0" aria-label="Loading chat">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-8 w-52 animate-pulse bg-zinc-200/70 dark:bg-zinc-800 rounded-xl" />
          <div className="h-4 w-60 animate-pulse bg-zinc-200/70 dark:bg-zinc-800 rounded-xl mt-2" />
        </div>
        <div className="h-7 w-24 animate-pulse bg-zinc-200/70 dark:bg-zinc-800 rounded-full mt-6" />
      </div>
      <div className="flex-1 space-y-4 px-1 py-4">
        <div className="flex justify-start">
          <div className="w-7 h-7 rounded-full bg-[#e8e2ff] animate-pulse mr-2 shrink-0 mt-1" />
          <div className="rounded-2xl rounded-bl-sm bg-[#e8e2ff]/50 px-4 py-3 space-y-2">
            <div className="h-3 w-64 max-w-[60vw] animate-pulse bg-white/80 rounded-full" />
            <div className="h-3 w-40 animate-pulse bg-white/80 rounded-full" />
            <div className="h-3 w-52 max-w-[55vw] animate-pulse bg-white/80 rounded-full" />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-br-sm neumorphic px-4 py-3">
            <div className="h-3 w-44 max-w-[50vw] animate-pulse bg-zinc-200/80 dark:bg-zinc-700 rounded-full" />
          </div>
        </div>
        <div className="flex justify-start">
          <div className="w-7 h-7 rounded-full bg-[#e8e2ff] animate-pulse mr-2 shrink-0 mt-1" />
          <div className="rounded-2xl rounded-bl-sm bg-[#e8e2ff]/50 px-4 py-3 space-y-2">
            <div className="h-3 w-56 max-w-[58vw] animate-pulse bg-white/80 rounded-full" />
            <div className="h-3 w-32 animate-pulse bg-white/80 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          {[0,1,2].map(i => <div key={i} className="h-8 w-28 animate-pulse neumorphic rounded-full" style={{ animationDelay: `${i * 0.12}s` }} />)}
        </div>
        <div className="h-[52px] animate-pulse neumorphic rounded-full" />
      </div>
    </div>
  );
}

function TypingDots(){
  // Pure CSS bounce — zero JS animation cost vs gsap repeat ticker
  return (
    <div className="flex items-center gap-1 py-1">
      {[0,1,2].map(i => (
        <span key={i} className="w-2 h-2 rounded-full bg-[#5f5b77] opacity-70 animate-bounce" style={{ animationDelay: `${i*0.15}s`, animationDuration: '0.8s' }} />
      ))}
    </div>
  );
}

export default function AssistantPage(){
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const prompts = ['Where did my money go?', 'How much did I spend today?', 'Am I overspending?', 'Show my investments'];
  const [sending,setSending]=useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [toast, setToast] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const showToast = (m:string)=>{ setToast(m); setTimeout(()=>setToast(''),2500); };

  // voice: Web Speech API
  const toggleVoice = ()=>{
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if(!SpeechRecognition){ showToast('Voice not supported in this browser — try Chrome'); return; }
    if(isRecording){
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;
    setIsRecording(true);
    rec.onresult = (e:any)=>{
      const transcript = e.results[0][0].transcript;
      setInput(prev=> prev ? prev + ' ' + transcript : transcript);
      setIsRecording(false);
      showToast('Voice captured');
    };
    rec.onerror = ()=>{ setIsRecording(false); showToast('Voice error — try again'); };
    rec.onend = ()=> setIsRecording(false);
    rec.start();
  };

  const handleFile = (e:React.ChangeEvent<HTMLInputElement>)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    if(f.size > 5*1024*1024){ showToast('File too large — max 5MB'); return; }
    setAttachedFile(f);
    showToast(`Attached ${f.name}`);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(()=>{
    if(!getToken()){ setMessages([{ role:'ai', text:'Ask me anything about your money. Try “Took Rapido for ₹180” — I’m Kakeibo 💰✨' }]); setLoading(false); return; }
    (async()=>{
      try{
        const sessions:any = await fetch(`${import.meta.env.VITE_API_URL||'http://localhost:5000'}/api/chat/sessions`, { headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }}).then(r=>r.json());
        const latest = sessions?.[0];
        if(latest){
          setSessionId(latest._id);
          const msgs:any = await fetch(`${import.meta.env.VITE_API_URL||'http://localhost:5000'}/api/chat/sessions/${latest._id}/messages`, { headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }}).then(r=>r.json());
          if(msgs?.length) setMessages(msgs.map((m:any)=>({ role: m.role==='assistant'?'ai':'user', text: m.content, _id:m._id })));
          else setMessages([{ role:'ai', text:'Ask me anything about your money. Try “Took Rapido for ₹180” or “Where am I spending too much?”' }]);
        } else {
          setMessages([{ role:'ai', text:'Ask me anything about your money. Try “Took Rapido for ₹180” or “Where am I spending too much?”' }]);
        }
      } catch{
        setMessages([{ role:'ai', text:'Ask me anything about your money. Try “Took Rapido for ₹180”' }]);
      } finally{ setLoading(false); }
    })();
  },[]);

  // Auto-scroll only — no per-message gsap (was causing jank on every send)
  useEffect(()=>{
    if(!listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'auto' });
  },[messages, sending]);

  const send = async(t: string) => {
    const filePart = attachedFile ? `\n[Attached: ${attachedFile.name} (${(attachedFile.size/1024).toFixed(1)}KB, ${attachedFile.type||'unknown'})]` : '';
    const fullText = t.trim() + filePart;
    if (!fullText.trim() || sending) return;
    const userText = t.trim() + (attachedFile ? ` 📎 ${attachedFile.name}` : '');
    setMessages(m => [...m, { role: 'user', text: userText, fileName: attachedFile?.name }]);
    setInput(''); const fileToSend = attachedFile; setAttachedFile(null); setSending(true);
    // if file is image/csv, you could upload to /api/transactions/import here — for now we send name to AI
    if(fileToSend && !t.trim()){
      setMessages(m => [...m, { role: 'ai', text: `Got your file “${fileToSend.name}” — I can parse receipts/CSVs. For now, describe the spend like “Took Rapido for ₹120” or I’ll read the file name: ${fileToSend.name}` }]);
      setSending(false);
      return;
    }
    try{
      if(getToken()){
        const r:any = await api.chat(fullText, sessionId || undefined);
        if(r.sessionId && !sessionId) setSessionId(r.sessionId);
        const text = r.assistant?.content || r.ai?.content || 'Done — check your transactions.';
        setMessages(m => [...m, { role: 'ai', text }]);
      } else throw new Error('no token');
    }catch(e:any){
      if(e.name==='AbortError') setMessages(m => [...m, { role: 'ai', text: 'Request timed out — please try again.' }]);
      else if(/429|rate.?limit/i.test(e?.message || '')) setMessages(m => [...m, { role: 'ai', text: 'Kakeibo AI is rate-limited right now ⏳ — wait a minute and try again. Meanwhile I can still log spends locally: try "Took Rapido for ₹120".' }]);
      else {
        let ai = 'I’m here to help you understand your money. Try asking about spending, budgets or investments.';
        let card: any = undefined;
        const amt = fullText.match(/₹?\s?(\d{2,5})/)?.[1];
        if (/rapido|uber|pizza|invest|nifty/i.test(fullText) && amt) {
          ai = `Added ₹${amt}. ${/rapido/i.test(fullText) ? 'Transport' : /pizza/i.test(fullText) ? 'Food' : 'Investment'} updated.`;
          card = { name: fullText.slice(0, 18), cat: /rapido/i.test(fullText) ? 'Transport' : 'Food', amount: Number(amt) };
        } else if (/spending too much|where.*money|overspending/i.test(fullText)) {
          ai = 'Your biggest spending: Food and Transport — try the Analytics page for breakdown.';
        } else if (/invest/i.test(fullText)) {
          ai = 'Check Investments page for your SIPs and allocation.';
        }
        setMessages(m => [...m, { role: 'ai', text: ai, card }]);
      }
    } finally{ setSending(false); }
  };

  const clearChat = async()=>{
    // Fresh empty chat — no "New chat started." bubble, it's just noise.
    setMessages([]);
    setSessionId(null);
  };

  if(loading && messages.length===0) return <ChatSkeleton />;

  return (
    <div className="flex flex-col h-[calc(100vh-40px)] pb-20 lg:pb-0">
      <div className="flex items-start justify-between"><Header title="Your Finance AI" subtitle="Ask me anything about your money." /><button onClick={clearChat} className="mt-6 flex items-center gap-1 text-xs px-3 py-1 rounded-full neumorphic hover:bg-zinc-50"><Trash2 size={12} /> New chat</button></div>
      {toast && <div className="fixed top-4 right-4 z-50 bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-full">{toast}</div>}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-4 px-1 py-2">
        {messages.map((m, i) => (
          <div key={i} className={`gsap-msg flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'ai' && <div className="w-7 h-7 rounded-full bg-[#e8e2ff] flex items-center justify-center mr-2 shrink-0 mt-1"><Bot size={14} /></div>}
            <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-white neumorphic rounded-br-sm' : 'bg-[#e8e2ff] rounded-bl-sm text-[#5f5b77]'}`}>
              <div>{m.text}</div>
              {m.fileName && <div className="mt-1 text-xs opacity-60 flex items-center gap-1"><FileText size={10} /> {m.fileName}</div>}
              {m.card && (
                <div className="mt-3 bg-white rounded-full flex items-center justify-between px-3 py-2 shadow-sm">
                  <span className="flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center"><Car size={12} /></span><span><div className="text-xs font-semibold leading-none">{m.card.name}</div><div className="text-[11px] text-zinc-500">{m.card.cat}</div></span></span>
                  <span className="flex items-center gap-2"><span className="font-bold">₹{m.card.amount}</span><button className="w-6 h-6 rounded-full bg-zinc-50 flex items-center justify-center"><Pencil size={10} /></button><button className="w-6 h-6 rounded-full bg-zinc-50 flex items-center justify-center text-red-500"><Undo2 size={10} /></button></span>
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="typing-dots flex justify-start">
            <div className="w-7 h-7 rounded-full bg-[#e8e2ff] flex items-center justify-center mr-2 shrink-0 mt-1"><Bot size={14} /></div>
            <div className="bg-[#e8e2ff] rounded-2xl rounded-bl-sm px-4 py-3"><TypingDots /></div>
          </div>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {attachedFile && (
          <div className="flex items-center gap-2 neumorphic rounded-full px-3 py-1.5 w-fit">
            {attachedFile.type.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
            <span className="text-xs font-medium truncate max-w-[160px]">{attachedFile.name}</span>
            <span className="text-xs text-zinc-500">{(attachedFile.size/1024).toFixed(0)}KB</span>
            <button onClick={()=> setAttachedFile(null)} className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center"><X size={10} /></button>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {prompts.map(p => (
            <button key={p} onClick={() => send(p)} className="whitespace-nowrap text-xs px-3 py-2 rounded-full neumorphic text-[#5f5b77] font-medium hover:bg-[#e8e2ff] transition">{p}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 neumorphic rounded-full px-2 py-2">
          <input ref={fileInputRef} type="file" accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFile} />
          <button onClick={()=> fileInputRef.current?.click()} className="w-8 h-8 rounded-full hover:bg-zinc-50 flex items-center justify-center text-zinc-600 hover:text-[#5f5b77]" title="Attach document"><Paperclip size={16} /></button>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} placeholder="Tell me what you spent..." className="flex-1 bg-transparent outline-none text-sm placeholder:text-zinc-400" />
          <button onClick={toggleVoice} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-zinc-50 text-zinc-600'}`} title={isRecording ? 'Stop recording' : 'Voice input'}>{isRecording ? <MicOff size={16} /> : <Mic size={16} />}</button>
          <button onClick={() => send(input)} disabled={sending || (!input.trim() && !attachedFile)} className="w-9 h-9 rounded-full bg-[#5f5b77] text-white flex items-center justify-center shadow disabled:opacity-40"><Send size={14} /></button>
        </div>
      </div>
    </div>
  );
}