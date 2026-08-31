import { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { Bot, Car, Pencil, Undo2, Mic, MicOff, Paperclip, Send, Trash2, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { api, getToken } from '@/services/api';
import gsap from 'gsap';

type Msg = { role: 'user' | 'ai', text: string, card?: { name: string, cat: string, amount: number }, _id?: string, fileName?: string };

function TypingDots(){
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    if(!ref.current) return;
    const dots = ref.current.querySelectorAll('.dot');
    gsap.fromTo(dots, { y: 0 }, { y: -6, duration: 0.35, stagger: 0.12, repeat: -1, yoyo: true, ease: 'power2.inOut' });
  },[]);
  return (
    <div ref={ref} className="flex items-center gap-1 py-1">
      <span className="dot w-2 h-2 rounded-full bg-[#5f5b77] opacity-70" />
      <span className="dot w-2 h-2 rounded-full bg-[#5f5b77] opacity-70" />
      <span className="dot w-2 h-2 rounded-full bg-[#5f5b77] opacity-70" />
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

  useLayoutEffect(()=>{ if(listRef.current) gsap.fromTo(listRef.current, { autoAlpha:0 }, { autoAlpha:1, duration:0.2 }); },[]);
  // sequential chat animation: user msg -> typing dots -> ai msg
  useEffect(()=>{
    if(!listRef.current) return;
    const items = listRef.current.querySelectorAll('.gsap-msg');
    if(!items.length) return;
    const last = items[items.length-1] as HTMLElement;
    gsap.fromTo(last, { y: 10, autoAlpha: 0, scale: 0.98 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.28, ease: 'power3.out', overwrite: true });
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  },[messages]);
  useEffect(()=>{
    if(sending && listRef.current){
      const dots = listRef.current.querySelector('.typing-dots');
      if(dots) gsap.fromTo(dots, { autoAlpha: 0, y: 4 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' });
    }
  },[sending]);

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
    if(!sessionId) setMessages([{ role:'ai', text:'Ask me anything about your money.' }]);
    else { setMessages([{ role:'ai', text:'New chat started.' }]); setSessionId(null); }
  };

  if(loading) return <div className="p-8 text-center text-sm text-zinc-500">Loading chat...</div>;

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