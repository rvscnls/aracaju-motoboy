'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Bike, MapPin, Phone, Wallet, CheckCircle2, Package, Users, Trash2, UserCheck, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const FORMAS_PAGAMENTO = [
  { valor: 'pix', label: 'Pix' },
  { valor: 'dinheiro', label: 'Dinheiro' },
  { valor: 'cartao', label: 'Cartão' },
];

const COMISSAO_POR_ENTREGA = 6;

function primeiroNome(nomeCompleto) {
  return (nomeCompleto || '').split(' ')[0] || '—';
}

function formatarCPF(valor) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatarHora(isoString) {
  return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function mapCliente(row) {
  return { id: row.id, nome: row.nome, telefone: row.telefone, endereco: row.endereco, observacoes: row.observacoes };
}

function mapMotoboy(row) {
  return {
    id: row.id,
    nomeCompleto: row.nome_completo,
    credencial: row.credencial,
    celular: row.celular,
    cpf: row.cpf,
    endereco: row.endereco,
    placa: row.placa,
  };
}

function mapPedido(row) {
  return {
    id: row.id,
    cliente: row.cliente,
    telefone: row.telefone,
    endereco: row.endereco,
    valor: Number(row.valor),
    pagamento: row.pagamento,
    status: row.status,
    motoboyId: row.motoboy_id,
    clienteId: row.cliente_id,
    hora: formatarHora(row.created_at),
  };
}

function aplicarMudancaRealtime(setState, mapRow, payload, { prepend = false } = {}) {
  setState((atual) => {
    if (payload.eventType === 'INSERT') {
      const novo = mapRow(payload.new);
      if (atual.some((item) => item.id === novo.id)) return atual;
      return prepend ? [novo, ...atual] : [...atual, novo];
    }
    if (payload.eventType === 'UPDATE') {
      const atualizado = mapRow(payload.new);
      return atual.map((item) => (item.id === atualizado.id ? atualizado : item));
    }
    if (payload.eventType === 'DELETE') {
      return atual.filter((item) => item.id !== payload.old.id);
    }
    return atual;
  });
}

export default function PainelDespacho() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [abaAtiva, setAbaAtiva] = useState('despacho');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [clientes, setClientes] = useState([]);
  const [formCliente, setFormCliente] = useState({ nome: '', telefone: '', endereco: '', observacoes: '' });
  const [buscaCliente, setBuscaCliente] = useState('');
  const [salvandoCliente, setSalvandoCliente] = useState(false);

  const [motoboys, setMotoboys] = useState([]);
  const [formMotoboy, setFormMotoboy] = useState({ nomeCompleto: '', credencial: '', celular: '', cpf: '', endereco: '', placa: '' });
  const [salvandoMotoboy, setSalvandoMotoboy] = useState(false);

  const [pedidos, setPedidos] = useState([]);
  const [form, setForm] = useState({ cliente: '', telefone: '', endereco: '', valor: '', pagamento: 'pix', clienteId: null });
  const [salvandoPedido, setSalvandoPedido] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function carregarDados() {
      const [resClientes, resMotoboys, resPedidos] = await Promise.all([
        supabase.from('clientes').select('*').order('nome'),
        supabase.from('motoboys').select('*').order('nome_completo'),
        supabase.from('pedidos').select('*').order('created_at', { ascending: false }),
      ]);
      if (!ativo) return;
      const primeiroErro = resClientes.error || resMotoboys.error || resPedidos.error;
      if (primeiroErro) {
        setErro(primeiroErro.message);
        setCarregando(false);
        return;
      }
      setClientes(resClientes.data.map(mapCliente));
      setMotoboys(resMotoboys.data.map(mapMotoboy));
      setPedidos(resPedidos.data.map(mapPedido));
      setCarregando(false);
    }
    carregarDados();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const canal = supabase
      .channel('painel-despacho')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, (payload) =>
        aplicarMudancaRealtime(setPedidos, mapPedido, payload, { prepend: true })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, (payload) =>
        aplicarMudancaRealtime(setClientes, mapCliente, payload)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motoboys' }, (payload) =>
        aplicarMudancaRealtime(setMotoboys, mapMotoboy, payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const pendentes = pedidos.filter((p) => p.status === 'pendente');
  const emRota = pedidos.filter((p) => p.status === 'em_rota');
  const entregues = pedidos.filter((p) => p.status === 'entregue');
  const faturamentoHoje = entregues.reduce((soma, p) => soma + Number(p.valor), 0);
  const podeLancar = form.cliente.trim() && form.endereco.trim() && form.valor && !salvandoPedido;
  const podeCadastrarCliente = formCliente.nome.trim() && formCliente.telefone.trim() && !salvandoCliente;
  const podeCadastrarMotoboy = formMotoboy.nomeCompleto.trim() && formMotoboy.celular.trim() && formMotoboy.placa.trim() && !salvandoMotoboy;

  const frota = useMemo(() => {
    return motoboys.map((m) => {
      const corridas = pedidos.filter((p) => p.motoboyId === m.id && p.status !== 'pendente').length;
      const ocupado = pedidos.some((p) => p.motoboyId === m.id && p.status === 'em_rota');
      return { ...m, corridas, ocupado };
    });
  }, [pedidos, motoboys]);

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter((c) => c.nome.toLowerCase().includes(termo) || c.telefone.includes(termo));
  }, [clientes, buscaCliente]);

  const pedidosDoCliente = useCallback(
    (clienteId) => pedidos.filter((p) => p.clienteId === clienteId).length,
    [pedidos]
  );

  function selecionarClienteNoPedido(e) {
    const id = e.target.value;
    if (!id) {
      setForm({ ...form, clienteId: null, cliente: '', telefone: '', endereco: '' });
      return;
    }
    const c = clientes.find((c) => c.id === id);
    if (c) setForm({ ...form, clienteId: c.id, cliente: c.nome, telefone: c.telefone, endereco: c.endereco });
  }

  async function lancarPedido() {
    if (!podeLancar) return;
    setSalvandoPedido(true);
    try {
      let clienteId = form.clienteId;
      if (!clienteId) {
        const { data, error } = await supabase
          .from('clientes')
          .insert({ nome: form.cliente, telefone: form.telefone, endereco: form.endereco, observacoes: '' })
          .select()
          .single();
        if (error) throw error;
        clienteId = data.id;
      }
      const { error } = await supabase.from('pedidos').insert({
        cliente_id: clienteId,
        motoboy_id: null,
        cliente: form.cliente,
        telefone: form.telefone,
        endereco: form.endereco,
        valor: Number(form.valor),
        pagamento: form.pagamento,
        status: 'pendente',
      });
      if (error) throw error;
      setForm({ cliente: '', telefone: '', endereco: '', valor: '', pagamento: 'pix', clienteId: null });
    } catch (error) {
      alert('Não deu pra lançar o pedido: ' + error.message);
    } finally {
      setSalvandoPedido(false);
    }
  }

  async function despachar(pedidoId, motoboyId) {
    const { error } = await supabase.from('pedidos').update({ motoboy_id: motoboyId, status: 'em_rota' }).eq('id', pedidoId);
    if (error) alert('Não deu pra despachar: ' + error.message);
  }

  async function marcarEntregue(pedidoId) {
    const { error } = await supabase.from('pedidos').update({ status: 'entregue' }).eq('id', pedidoId);
    if (error) alert('Não deu pra marcar como entregue: ' + error.message);
  }

  function nomeMotoboy(id) {
    const m = motoboys.find((m) => m.id === id);
    return m ? primeiroNome(m.nomeCompleto) : '—';
  }

  function aoTeclar(e) {
    if (e.key === 'Enter') lancarPedido();
  }

  async function cadastrarCliente() {
    if (!podeCadastrarCliente) return;
    setSalvandoCliente(true);
    try {
      const { error } = await supabase.from('clientes').insert({ ...formCliente });
      if (error) throw error;
      setFormCliente({ nome: '', telefone: '', endereco: '', observacoes: '' });
    } catch (error) {
      alert('Não deu pra cadastrar o cliente: ' + error.message);
    } finally {
      setSalvandoCliente(false);
    }
  }

  function aoTeclarCliente(e) {
    if (e.key === 'Enter') cadastrarCliente();
  }

  async function removerCliente(id) {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) alert('Não deu pra remover o cliente: ' + error.message);
  }

  async function cadastrarMotoboy() {
    if (!podeCadastrarMotoboy) return;
    setSalvandoMotoboy(true);
    try {
      const { error } = await supabase.from('motoboys').insert({
        nome_completo: formMotoboy.nomeCompleto,
        credencial: formMotoboy.credencial,
        celular: formMotoboy.celular,
        cpf: formMotoboy.cpf,
        endereco: formMotoboy.endereco,
        placa: formMotoboy.placa,
      });
      if (error) throw error;
      setFormMotoboy({ nomeCompleto: '', credencial: '', celular: '', cpf: '', endereco: '', placa: '' });
    } catch (error) {
      alert('Não deu pra cadastrar o motoboy: ' + error.message);
    } finally {
      setSalvandoMotoboy(false);
    }
  }

  function aoTeclarMotoboy(e) {
    if (e.key === 'Enter') cadastrarMotoboy();
  }

  async function removerMotoboy(id) {
    const { error } = await supabase.from('motoboys').delete().eq('id', id);
    if (error) alert('Não deu pra remover o motoboy: ' + error.message);
  }

  async function sair() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--bg)', color: 'var(--ink)' }} className="w-full min-h-full p-4 md:p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        :root {
          --bg: #FBFAF6;
          --ink: #1C2A28;
          --ink-soft: #5B6D69;
          --line: #DEDCD1;
          --card: #FFFFFF;
          --accent: #FF5A2E;
          --accent-ink: #7A2200;
          --transito: #F5B400;
          --transito-ink: #6B4E00;
          --sucesso: #0E9C6E;
          --sucesso-ink: #054D36;
          --perigo-ink: #9C2B2B;
          --font-display: 'Space Grotesk', sans-serif;
          --font-body: 'IBM Plex Sans', sans-serif;
        }
        .disp { font-family: var(--font-display); }
        @keyframes andar { 0% { left: 2%; } 50% { left: 76%; } 100% { left: 2%; } }
        .rota-track { position: relative; height: 2px; background-image: repeating-linear-gradient(90deg, var(--transito) 0 6px, transparent 6px 12px); border-radius: 2px; margin-top: 8px; }
        .rota-bike { position: absolute; top: -8px; animation: andar 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .rota-bike { animation: none; left: 40%; } }
      `}</style>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="disp text-xl md:text-2xl font-semibold tracking-tight">Aracaju Motoboy</div>
          <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>painel de despacho</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs px-3 py-1 rounded-full capitalize" style={{ background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
          <button
            type="button"
            onClick={sair}
            className="text-xs px-3 py-1 rounded-full flex items-center gap-1"
            style={{ background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
          >
            <LogOut size={12} /> sair
          </button>
        </div>
      </div>

      <div className="inline-flex flex-wrap p-1 rounded-full mb-6 gap-1" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
        <button type="button" onClick={() => setAbaAtiva('despacho')} className="disp text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5" style={abaAtiva === 'despacho' ? { background: 'var(--ink)', color: 'white' } : { color: 'var(--ink-soft)' }}>
          <Bike size={14} /> despacho
        </button>
        <button type="button" onClick={() => setAbaAtiva('clientes')} className="disp text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5" style={abaAtiva === 'clientes' ? { background: 'var(--ink)', color: 'white' } : { color: 'var(--ink-soft)' }}>
          <Users size={14} /> clientes ({clientes.length})
        </button>
        <button type="button" onClick={() => setAbaAtiva('motoboys')} className="disp text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5" style={abaAtiva === 'motoboys' ? { background: 'var(--ink)', color: 'white' } : { color: 'var(--ink-soft)' }}>
          <UserCheck size={14} /> motoboys ({motoboys.length})
        </button>
      </div>

      {erro && (
        <div className="rounded-xl p-3 mb-4 text-sm" style={{ background: '#FBE7E7', color: 'var(--perigo-ink)', border: '1px solid var(--perigo-ink)' }}>
          Não consegui carregar os dados do Supabase: {erro}
        </div>
      )}

      {carregando && !erro && (
        <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>carregando dados...</div>
      )}

      {!carregando && !erro && (
        <>
          {abaAtiva === 'despacho' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard icon={<Package size={16} />} label="pendentes" valor={pendentes.length} />
                <StatCard icon={<Bike size={16} />} label="em rota" valor={emRota.length} cor="var(--transito-ink)" />
                <StatCard icon={<CheckCircle2 size={16} />} label="entregues hoje" valor={entregues.length} cor="var(--sucesso-ink)" />
                <StatCard icon={<Wallet size={16} />} label="faturado hoje" valor={`R$ ${faturamentoHoje.toFixed(2)}`} cor="var(--accent-ink)" />
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex flex-col gap-4 md:w-80 md:flex-shrink-0">
                  <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                    <div className="disp text-sm font-semibold mb-3">novo pedido</div>
                    <div className="flex flex-col gap-2">
                      <select aria-label="cliente cadastrado" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} value={form.clienteId ?? ''} onChange={selecionarClienteNoPedido}>
                        <option value="">+ cliente novo</option>
                        {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <input aria-label="cliente" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="nome do cliente" value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} onKeyDown={aoTeclar} />
                      <input aria-label="telefone" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} onKeyDown={aoTeclar} />
                      <input aria-label="endereço de entrega" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="endereço de entrega" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} onKeyDown={aoTeclar} />
                      <div className="flex gap-2">
                        <input aria-label="valor" type="number" min="0" step="0.5" className="text-sm px-3 py-2 rounded-lg outline-none w-1/2" style={{ border: '1px solid var(--line)' }} placeholder="valor (R$)" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} onKeyDown={aoTeclar} />
                        <select aria-label="forma de pagamento" className="text-sm px-3 py-2 rounded-lg outline-none w-1/2" style={{ border: '1px solid var(--line)' }} value={form.pagamento} onChange={(e) => setForm({ ...form, pagamento: e.target.value })}>
                          {FORMAS_PAGAMENTO.map((f) => <option key={f.valor} value={f.valor}>{f.label}</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={lancarPedido} disabled={!podeLancar} className="disp mt-1 text-sm font-semibold text-white rounded-lg py-2 flex items-center justify-center gap-1 disabled:opacity-40" style={{ background: 'var(--ink)' }}>
                        <Plus size={15} /> {salvandoPedido ? 'lançando...' : 'lançar pedido'}
                      </button>
                      {!form.clienteId && form.cliente.trim() && (
                        <div className="text-xs text-center" style={{ color: 'var(--ink-soft)' }}>cliente novo — vai ser cadastrado automaticamente</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                    <div className="disp text-sm font-semibold mb-3">frota hoje</div>
                    <div className="flex flex-col gap-3">
                      {frota.map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span style={{ width: 8, height: 8, borderRadius: 999, background: m.ocupado ? 'var(--transito)' : 'var(--sucesso)', display: 'inline-block' }} />
                            {primeiroNome(m.nomeCompleto)}
                          </div>
                          <div style={{ color: 'var(--ink-soft)' }} className="text-xs text-right">
                            {m.ocupado ? 'em rota' : 'livre'} · {m.corridas} corrida{m.corridas === 1 ? '' : 's'} · R$ {(m.corridas * COMISSAO_POR_ENTREGA).toFixed(2)}
                          </div>
                        </div>
                      ))}
                      {frota.length === 0 && <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>nenhum motoboy cadastrado ainda.</div>}
                    </div>
                  </div>
                </div>

                <div className="flex-1 rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                  <div className="disp text-sm font-semibold mb-3">fila de despacho</div>
                  {pedidos.length === 0 && <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>nenhum pedido lançado ainda.</div>}
                  <div className="flex flex-col gap-3">
                    {pedidos.map((p) => (
                      <div key={p.id} className="rounded-xl p-3" style={{ border: '1px solid var(--line)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-medium">{p.cliente}</div>
                            <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--ink-soft)' }}><MapPin size={12} /> {p.endereco}</div>
                            <div className="text-xs flex items-center gap-3 mt-0.5 flex-wrap" style={{ color: 'var(--ink-soft)' }}>
                              <span className="flex items-center gap-1"><Phone size={12} /> {p.telefone || '—'}</span>
                              <span className="flex items-center gap-1"><Wallet size={12} /> R$ {Number(p.valor).toFixed(2)} · {p.pagamento}</span>
                            </div>
                          </div>
                          <Badge status={p.status} />
                        </div>

                        {p.status === 'pendente' && (
                          <div className="flex items-center gap-2 mt-3">
                            <select aria-label="despachar para" className="text-xs px-2 py-1.5 rounded-lg outline-none flex-1" style={{ border: '1px solid var(--line)' }} defaultValue="" onChange={(e) => e.target.value && despachar(p.id, e.target.value)}>
                              <option value="" disabled>despachar para...</option>
                              {frota.filter((m) => !m.ocupado).map((m) => <option key={m.id} value={m.id}>{primeiroNome(m.nomeCompleto)}</option>)}
                            </select>
                          </div>
                        )}

                        {p.status === 'em_rota' && (
                          <div className="mt-3">
                            <div className="text-xs flex items-center justify-between flex-wrap gap-2" style={{ color: 'var(--ink-soft)' }}>
                              <span>{nomeMotoboy(p.motoboyId)} · saiu às {p.hora}</span>
                              <button type="button" onClick={() => marcarEntregue(p.id)} className="text-xs font-medium px-2 py-1 rounded-lg text-white" style={{ background: 'var(--sucesso)' }}>
                                marcar entregue
                              </button>
                            </div>
                            <div className="rota-track">
                              <Bike size={14} className="rota-bike" style={{ color: 'var(--transito-ink)' }} />
                            </div>
                          </div>
                        )}

                        {p.status === 'entregue' && (
                          <div className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--sucesso-ink)' }}>
                            <CheckCircle2 size={12} /> entregue por {nomeMotoboy(p.motoboyId)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {abaAtiva === 'clientes' && (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex flex-col gap-4 md:w-80 md:flex-shrink-0">
                <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                  <div className="disp text-sm font-semibold mb-3">novo cliente</div>
                  <div className="flex flex-col gap-2">
                    <input aria-label="nome do cliente" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="nome" value={formCliente.nome} onChange={(e) => setFormCliente({ ...formCliente, nome: e.target.value })} onKeyDown={aoTeclarCliente} />
                    <input aria-label="telefone do cliente" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="telefone" value={formCliente.telefone} onChange={(e) => setFormCliente({ ...formCliente, telefone: e.target.value })} onKeyDown={aoTeclarCliente} />
                    <input aria-label="endereço do cliente" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="endereço (opcional)" value={formCliente.endereco} onChange={(e) => setFormCliente({ ...formCliente, endereco: e.target.value })} onKeyDown={aoTeclarCliente} />
                    <input aria-label="observações" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="observações (opcional)" value={formCliente.observacoes} onChange={(e) => setFormCliente({ ...formCliente, observacoes: e.target.value })} onKeyDown={aoTeclarCliente} />
                    <button type="button" onClick={cadastrarCliente} disabled={!podeCadastrarCliente} className="disp mt-1 text-sm font-semibold text-white rounded-lg py-2 flex items-center justify-center gap-1 disabled:opacity-40" style={{ background: 'var(--ink)' }}>
                      <Plus size={15} /> {salvandoCliente ? 'cadastrando...' : 'cadastrar cliente'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div className="disp text-sm font-semibold">clientes cadastrados</div>
                  <input aria-label="buscar cliente" className="text-xs px-3 py-1.5 rounded-lg outline-none" style={{ border: '1px solid var(--line)', minWidth: 180 }} placeholder="buscar por nome ou telefone" value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  {clientesFiltrados.length === 0 && <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>nenhum cliente encontrado.</div>}
                  {clientesFiltrados.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 flex items-start justify-between gap-2" style={{ border: '1px solid var(--line)' }}>
                      <div>
                        <div className="text-sm font-medium">{c.nome}</div>
                        <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--ink-soft)' }}><Phone size={12} /> {c.telefone}</div>
                        {c.endereco && <div className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--ink-soft)' }}><MapPin size={12} /> {c.endereco}</div>}
                        {c.observacoes && <div className="text-xs italic mt-1" style={{ color: 'var(--ink-soft)' }}>{c.observacoes}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--ink-soft)' }}>{pedidosDoCliente(c.id)} pedido{pedidosDoCliente(c.id) === 1 ? '' : 's'}</span>
                        <button type="button" onClick={() => removerCliente(c.id)} className="text-xs flex items-center gap-1" style={{ color: 'var(--perigo-ink)' }}>
                          <Trash2 size={12} /> remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {abaAtiva === 'motoboys' && (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex flex-col gap-4 md:w-80 md:flex-shrink-0">
                <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                  <div className="disp text-sm font-semibold mb-3">novo motoboy</div>
                  <div className="flex flex-col gap-2">
                    <input aria-label="nome completo" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="nome completo" value={formMotoboy.nomeCompleto} onChange={(e) => setFormMotoboy({ ...formMotoboy, nomeCompleto: e.target.value })} onKeyDown={aoTeclarMotoboy} />
                    <input aria-label="credencial" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="credencial" value={formMotoboy.credencial} onChange={(e) => setFormMotoboy({ ...formMotoboy, credencial: e.target.value })} onKeyDown={aoTeclarMotoboy} />
                    <input aria-label="celular" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="número do celular" value={formMotoboy.celular} onChange={(e) => setFormMotoboy({ ...formMotoboy, celular: e.target.value })} onKeyDown={aoTeclarMotoboy} />
                    <input aria-label="CPF" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="CPF" value={formMotoboy.cpf} onChange={(e) => setFormMotoboy({ ...formMotoboy, cpf: formatarCPF(e.target.value) })} onKeyDown={aoTeclarMotoboy} />
                    <input aria-label="endereço" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="endereço" value={formMotoboy.endereco} onChange={(e) => setFormMotoboy({ ...formMotoboy, endereco: e.target.value })} onKeyDown={aoTeclarMotoboy} />
                    <input aria-label="placa da moto" className="text-sm px-3 py-2 rounded-lg outline-none" style={{ border: '1px solid var(--line)' }} placeholder="placa da moto" value={formMotoboy.placa} onChange={(e) => setFormMotoboy({ ...formMotoboy, placa: e.target.value.toUpperCase() })} onKeyDown={aoTeclarMotoboy} />
                    <button type="button" onClick={cadastrarMotoboy} disabled={!podeCadastrarMotoboy} className="disp mt-1 text-sm font-semibold text-white rounded-lg py-2 flex items-center justify-center gap-1 disabled:opacity-40" style={{ background: 'var(--ink)' }}>
                      <Plus size={15} /> {salvandoMotoboy ? 'cadastrando...' : 'cadastrar motoboy'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                <div className="disp text-sm font-semibold mb-3">motoboys cadastrados</div>
                <div className="flex flex-col gap-2">
                  {motoboys.length === 0 && <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>nenhum motoboy cadastrado ainda.</div>}
                  {motoboys.map((m) => (
                    <div key={m.id} className="rounded-xl p-3" style={{ border: '1px solid var(--line)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{m.nomeCompleto}</div>
                          <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5" style={{ color: 'var(--ink-soft)' }}>
                            <span>credencial: {m.credencial || '—'}</span>
                            <span>placa: {m.placa || '—'}</span>
                            <span className="flex items-center gap-1"><Phone size={11} /> {m.celular || '—'}</span>
                            <span>CPF: {m.cpf || '—'}</span>
                          </div>
                          {m.endereco && <div className="text-xs flex items-center gap-1 mt-1" style={{ color: 'var(--ink-soft)' }}><MapPin size={12} /> {m.endereco}</div>}
                        </div>
                        <button type="button" onClick={() => removerMotoboy(m.id)} className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: 'var(--perigo-ink)' }}>
                          <Trash2 size={12} /> remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="text-xs mt-6 text-center" style={{ color: 'var(--ink-soft)' }}>
        dados salvos em tempo real no Supabase — sem GPS de verdade
      </div>
    </div>
  );
}

function StatCard({ icon, label, valor, cor = 'var(--ink)' }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-soft)' }}>{icon} {label}</div>
      <div className="disp text-lg font-semibold mt-1" style={{ color: cor }}>{valor}</div>
    </div>
  );
}

function Badge({ status }) {
  const map = {
    pendente: { texto: 'pendente', bg: '#F1EFE6', cor: '#5B6D69' },
    em_rota: { texto: 'em rota', bg: '#FCF0CC', cor: '#6B4E00' },
    entregue: { texto: 'entregue', bg: '#DDF3E8', cor: '#054D36' },
  };
  const s = map[status];
  return <span className="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0" style={{ background: s.bg, color: s.cor }}>{s.texto}</span>;
}
