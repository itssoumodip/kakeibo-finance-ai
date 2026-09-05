import { useEffect, useState } from 'react';
import { Download, Check, Zap, WifiOff, Maximize, Share, MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';

export default function InstallPage(){
  const [canInstall, setCanInstall] = useState<boolean>(
    () => typeof window !== 'undefined' && !!(window as any).__pwaInstallPrompt
  );
  const [installed, setInstalled] = useState<boolean>(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(display-mode: standalone)').matches
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const isIOS = typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  useEffect(()=>{
    const onReady = ()=> setCanInstall(true);
    const onInstalled = ()=> {
      setInstalled(true); setDone('Kakeibo is installed 🎉 — launch it from your home screen.');
      (window as any).__pwaInstallPrompt = null; setCanInstall(false);
    };
    window.addEventListener('pwa-prompt-ready', onReady);
    window.addEventListener('appinstalled', onInstalled);
    return ()=>{
      window.removeEventListener('pwa-prompt-ready', onReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  },[]);

  const install = async()=>{
    const p = (window as any).__pwaInstallPrompt;
    if(!p) return;
    setBusy(true);
    try{
      await p.prompt();
      const c = await p.userChoice;
      if(c?.outcome === 'accepted') setDone('Installing… check your home screen 📲');
      (window as any).__pwaInstallPrompt = null; setCanInstall(false);
    } catch { /* dismissed */ } finally{ setBusy(false); }
  };

  return (
    <div className="space-y-5 pb-20 max-w-[640px] mx-auto">
      <Header title="Get the App" subtitle="Install Kakeibo on your phone or desktop." />

      <Card className="p-6 md:p-8 flex items-center gap-5">
        <img src="/icons/icon-512.png" alt="Kakeibo app icon" className="w-20 h-20 md:w-24 md:h-24 rounded-[22px] shadow-lg shrink-0" />
        <div className="min-w-0">
          <div className="text-xl font-extrabold tracking-tight">Kakeibo</div>
          <div className="text-sm text-zinc-500">AI Financial Assistant · free · ~800KB</div>
          {installed ? (
            <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
              <Check size={14} /> You&apos;re running the app
            </div>
          ) : canInstall ? (
            <button onClick={install} disabled={busy} className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5f5b77] text-white text-sm font-medium hover:bg-[#4a4760] disabled:opacity-60">
              <Download size={15} /> {busy ? 'Installing…' : 'Install app'}
            </button>
          ) : (
            <div className="mt-2 text-sm text-zinc-500">Follow the steps below for your device 👇</div>
          )}
        </div>
      </Card>

      {done && <div className="bg-zinc-900 text-white text-sm px-4 py-2.5 rounded-2xl w-fit">{done}</div>}

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Zap, t: 'Instant opens', d: 'Loads in a blink after first visit' },
          { icon: WifiOff, t: 'Works offline', d: 'App shell + recent data cached' },
          { icon: Maximize, t: 'Fullscreen', d: 'No browser bars, real app feel' },
        ].map(b => (
          <Card key={b.t} className="p-4 text-center">
            <b.icon size={18} className="mx-auto text-[#5f5b77]" />
            <div className="text-sm font-semibold mt-2">{b.t}</div>
            <div className="text-xs text-zinc-500 mt-1">{b.d}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Install steps</h3>
        <div className="space-y-3 text-sm">
          {!isIOS && (
            <div className="neumorphic-inset rounded-2xl p-4">
              <div className="font-semibold flex items-center gap-2"><MoreVertical size={14} /> Android / Chrome</div>
              <ol className="text-zinc-600 mt-1 ml-4 list-decimal space-y-0.5">
                <li>Open this site in Chrome</li>
                <li>Tap ⋮ menu → <b>Install app</b> (or Add to Home screen)</li>
                <li>Confirm — Kakeibo appears on your home screen</li>
              </ol>
            </div>
          )}
          {isIOS && (
            <div className="neumorphic-inset rounded-2xl p-4">
              <div className="font-semibold flex items-center gap-2"><Share size={14} /> iPhone / Safari</div>
              <ol className="text-zinc-600 mt-1 ml-4 list-decimal space-y-0.5">
                <li>Open this site in Safari</li>
                <li>Tap <b>Share</b> → <b>Add to Home Screen</b></li>
                <li>Tap Add — launch it like any app</li>
              </ol>
            </div>
          )}
          <div className="neumorphic-inset rounded-2xl p-4">
            <div className="font-semibold flex items-center gap-2"><Download size={14} /> Desktop / Chrome & Edge</div>
            <ol className="text-zinc-600 mt-1 ml-4 list-decimal space-y-0.5">
              <li>Open this site on desktop</li>
              <li>Click the <b>install icon</b> in the address bar (or ⋮ → Install Kakeibo)</li>
              <li>It runs in its own window, pinned to taskbar/dock</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
