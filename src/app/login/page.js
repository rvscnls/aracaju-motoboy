'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setEntrando(false);
    if (error) {
      setErro('E-mail ou senha incorretos.');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <div
      style={{ fontFamily: 'var(--font-body)', background: 'var(--bg)', color: 'var(--ink)' }}
      className="w-full min-h-full flex items-center justify-center p-4"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        :root {
          --bg: #FBFAF6;
          --ink: #1C2A28;
          --ink-soft: #5B6D69;
          --line: #DEDCD1;
          --card: #FFFFFF;
          --perigo-ink: #9C2B2B;
          --font-display: 'Space Grotesk', sans-serif;
          --font-body: 'IBM Plex Sans', sans-serif;
        }
        .disp { font-family: var(--font-display); }
      `}</style>

      <form
        onSubmit={entrar}
        className="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-3"
        style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
      >
        <div className="disp text-xl font-semibold tracking-tight">Aracaju Motoboy</div>
        <div className="text-xs mb-2" style={{ color: 'var(--ink-soft)' }}>painel de despacho — login</div>

        <input
          aria-label="e-mail"
          type="email"
          required
          autoFocus
          className="text-sm px-3 py-2 rounded-lg outline-none"
          style={{ border: '1px solid var(--line)' }}
          placeholder="e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          aria-label="senha"
          type="password"
          required
          className="text-sm px-3 py-2 rounded-lg outline-none"
          style={{ border: '1px solid var(--line)' }}
          placeholder="senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        {erro && (
          <div className="text-xs" style={{ color: 'var(--perigo-ink)' }}>{erro}</div>
        )}

        <button
          type="submit"
          disabled={entrando}
          className="disp mt-1 text-sm font-semibold text-white rounded-lg py-2 disabled:opacity-40"
          style={{ background: 'var(--ink)' }}
        >
          {entrando ? 'entrando...' : 'entrar'}
        </button>
      </form>
    </div>
  );
}
