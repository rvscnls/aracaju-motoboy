'use client';

import { useState, useMemo } from 'react';
import { Plus, Bike, MapPin, Phone, Wallet, CheckCircle2, Package, Users, Trash2, UserCheck } from 'lucide-react';

const FORMAS_PAGAMENTO = [
  { valor: 'pix', label: 'Pix' },
  { valor: 'dinheiro', label: 'Dinheiro' },
  { valor: 'cartao', label: 'Cartão' },
];

const COMISSAO_POR_ENTREGA = 6;

function horaAgora() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

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

export default function PainelDespacho() {
  const [abaAtiva, setAbaAtiva] = useState('despacho');

  const [clientes, setClientes] = useState([
    { id: 1, nome: 'Ana Beatriz', telefone: '(79) 99911-2233', endereco: 'Rua Laranjeiras, 210 — Jardins', observacoes: '' },
    { id: 2, nome: 'Ricardo Melo', telefone: '(79) 98822-1144', endereco: 'Av. Beira Mar, 1900 — Atalaia', observacoes: 'prefere pagar em dinheiro' },
    { id: 3, nome: 'Fernanda Alves', telefone: '(79) 99700-5566', endereco: 'Rua Itabaianinha, 88 — Centro', observacoes: '' },
  ]);
  const [proxClienteId, setProxClienteId] = useState(4);
  const [formCliente, setFormCliente] = useState({ nome: '', telefone: '', endereco: '', observacoes: '' });
  const [buscaCliente, setBuscaCliente] = useState('');

  const [motoboys, setMotoboys] = useState([
    { id: 1, nomeCompleto: 'Carlos Eduardo Santos', credencial: 'MT-2024-0113', celular: '(79) 99123-4455', cpf: '123.456.789-00', endereco: 'Rua dos Coqueiros, 45 — Coroa do Meio', placa: 'QRS1A23' },
    { id: 2, nomeCompleto: 'Junior Pereira Lima', credencial: 'MT-2024-0114', celular: '(79) 99234-5566', cpf: '234.567.890-11', endereco: 'Av. Ivo do Prado, 302 — Centro', placa: 'QRS2B34' },
    { id: 3, nomeCompleto: 'Marcos Vinícius Souza', credencial: 'MT-2024-0115', celular: '(79) 99345-6677', cpf: '345.678.901-22', endereco: 'Rua São Cristóvão, 78 — Getúlio Vargas', placa: 'QRS3C45' },
  ]);
  const [proxMotoboyId, setProxMotoboyId] = useState(4);
  const [formMotoboy, setFormMotoboy] = useState({ nomeCompleto: '', credencial: '', celular: '', cpf: '', endereco: '', placa: '' });

  const [pedidos, setPedidos] = useState([
    { id: 1, cliente: 'Ana Beatriz', telefone: '(79) 99911-2233', endereco: 'Rua Laranjeiras, 210 — Jardins', valor: 22, pagamento: 'pix', status: 'entregue', motoboyId: 2, clienteId: 1, hora: '13:48' },
    { id: 2, cliente: 'Ricardo Melo', telefone: '(79) 98822-1144', endereco: 'Av. Beira Mar, 1900 — Atalaia', valor: 35, pagamento: 'dinheiro', status: 'em_rota', motoboyId: 1, clienteId: 2, hora: '14:12' },
    { id: 3, cliente: 'Fernanda Alves', telefone: '(79) 99700-5566', endereco: 'Rua Itabaianinha, 88 — Centro', valor: 18, pagamento: 'cartao', status: 'pendente', motoboyId: null, clienteId: 3, hora: '14:20' },
  ]);
  const [proxId, setProxId] = useState(4);
  const [form, setForm] = useState({ cliente: '', telefone: '', endereco: '', valor: '', pagamento: 'pix', clienteId: null });

  const pendentes = pedidos.filter((p) => p.status === 'pendente');
  const emRota = pedidos.filter((p) => p.status === 'em_rota');
  const entregues = pedidos.filter((p) => p.status === 'entregue');
  const faturamentoHoje = entregues.reduce((soma, p) => soma + Number(p.valor), 0);
  const podeLancar = form.cliente.trim() && form.endereco.trim() && form.valor;
  const podeCadastrarCliente = formCliente.nome.trim() && formCliente.telefone.trim();
  const podeCadastrarMotoboy = formMotoboy.nomeCompleto.trim() && formMotoboy.celular.trim() && formMotoboy.placa.trim();

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

  function pedidosDoCliente(clienteId) {
    return pedidos.filter((p) => p.clienteId === clienteId).length;
  }

  function selecionarClienteNoPedido(e) {
    const id = e.target.value;
    if (!id) {
      setForm({ ...form, clienteId: null, cliente: '', telefone: '', endereco: '' });
      return;
    }
    const c = clientes.find((c) => c.id === Number(id));
    if (c) setForm({ ...form, clienteId: c.id, cliente: c.nome, telefone: c.telefone, endereco: c.endereco });
  }

  function lancarPedido() {
    if (!podeLancar) return;
    let clienteId = form.clienteId;
    if (!clienteId) {
      clienteId = proxClienteId;
      setClientes((atual) => [...atual, { id: proxClienteId, nome: form.cliente, telefone: form.telefone, endereco: form.endereco, observacoes: '' }]);
      setProxClienteId((n) => n + 1);
    }
    setPedidos((atual) => [
      { id: proxId, cliente: form.cliente, telefone: form.telefone, endereco: form.endereco, valor: Number(form.valor), pagamento: form.pagamento, clienteId, status: 'pendente', motoboyId: null, hora: horaAgora() },
      ...atual,
    ]);
    setProxId((n) => n + 1);
    setForm({ cliente: '', telefone: '', endereco: '', valor: '', pagamento: 'pix', clienteId: null });
  }

  function despachar(pedidoId, motoboyId) {
    setPedidos((atual) => atual.map((p) => (p.id === pedidoId ? { ...p, motoboyId: Number(motoboyId), status: 'em_rota' } : p)));
  }

  function marcarEntregue(pedidoId) {
    setPedidos((atual) => atual.map((p) => (p.id === pedidoId ? { ...p, status: 'entregue' } : p)));
  }

  function nomeMotoboy(id) {
    const m = motoboys.find((m) => m.id === id);
    return m ? primeiroNome(m.nomeCompleto) : '—';
  }

  function aoTeclar(e) {
    if (e.key === 'Enter') lancarPedido();
  }

  function cadastrarCliente() {
    if (!podeCadastrarCliente) return;
    setClientes((atual) => [...atual, { id: proxClienteId, ...formCliente }]);
    setProxClienteId((n) => n + 1);
    setFormCliente({ nome: '', telefone: '', endereco: '', observacoes: '' });
  }

  function aoTeclarCliente(e) {
    if (e.key === 'Enter') cadastrarCliente();
  }

  function removerCliente(id) {
    setClientes((atual) => atual.filter((c) => c.id !== id));
  }

  function cadastrarMotoboy() {
    if (!podeCadastrarMotoboy) return;
    setMotoboys((atual) => [...atual, { id: proxMotoboyId, ...formMotoboy }]);
    setProxMotoboyId((n) => n + 1);
    setFormMotoboy({ nomeCompleto: '', credencial: '', celular: '', cpf: '', endereco: '', placa: '' });
  }

  function aoTeclarMotoboy(e) {
    if (e.key === 'Enter') cadastrarMotoboy();
  }

  function removerMotoboy(id) {
    setMotoboys((atual) => atual.filter((m) => m.id !== id));
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
          <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>painel de despacho — protótipo</div>
        </div>
        <div className="text-xs px-3 py-1 rounded-full capitalize" style={{ background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
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
                    <Plus size={15} /> lançar pedido
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
                  <Plus size={15} /> cadastrar cliente
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
                  <Plus size={15} /> cadastrar motoboy
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

      <div className="text-xs mt-6 text-center" style={{ color: 'var(--ink-soft)' }}>
        protótipo com dados de exemplo — sem persistência real e sem GPS de verdade
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
