import React, { useState } from 'react';

export default function App() {
  const [accounts, setAccounts] = useState([
    { id: 'acc-01', owner: 'Treasury Reserve', number: '0001-9', balance: 150000.00 },
    { id: 'acc-02', owner: 'Merchant Settlement', number: '0002-7', balance: 42500.50 },
    { id: 'acc-03', owner: 'Retail Escrow', number: '0003-5', balance: 12800.00 }
  ]);

  const [ledger, setLedger] = useState([
    { id: 'tx-901', type: 'CREDIT', account: '0001-9', amount: 50000.00, desc: 'Initial Liquidity Injection', time: '10:00:12' },
    { id: 'tx-902', type: 'DEBIT', account: '0001-9', amount: 12500.00, desc: 'Merchant Batch Payout', time: '10:15:44' }
  ]);

  const [sourceId, setSourceId] = useState('acc-01');
  const [destId, setDestId] = useState('acc-02');
  const [amount, setAmount] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const handleTransfer = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0 || sourceId === destId) {
      setStatusMsg('Erro: Verifique os dados e contas selecionadas.');
      return;
    }

    const srcAcc = accounts.find(a => a.id === sourceId);
    if (srcAcc.balance < val) {
      setStatusMsg('Erro: Saldo insuficiente na conta de origem.');
      return;
    }

    setAccounts(prev => prev.map(acc => {
      if (acc.id === sourceId) return { ...acc, balance: acc.balance - val };
      if (acc.id === destId) return { ...acc, balance: acc.balance + val };
      return acc;
    }));

    const now = new Date().toLocaleTimeString();
    const txId = `tx-${Math.floor(100 + Math.random() * 900)}`;

    setLedger(prev => [
      { id: `${txId}-C`, type: 'CREDIT', account: accounts.find(a => a.id === destId).number, amount: val, desc: 'Real-Time P2P Settlement', time: now },
      { id: `${txId}-D`, type: 'DEBIT', account: srcAcc.number, amount: val, desc: 'Real-Time P2P Settlement', time: now },
      ...prev
    ]);

    setAmount('');
    setStatusMsg(`Sucesso: Transferência de R$ ${val.toFixed(2)} liquidada via Double-Entry.`);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', padding: '2rem' }}>
      <header style={{ borderBottom: '1px solid #1e293b', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#38bdf8' }}>FinTech Real-Time Ledger</h1>
        <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Double-Entry Financial Engine & ACID Settlement Monitor</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {accounts.map(acc => (
          <div key={acc.id} style={{ backgroundColor: '#1e293b', padding: '1.25rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Conta {acc.number}</span>
            <h3 style={{ margin: '0.25rem 0', fontSize: '1.1rem' }}>{acc.owner}</h3>
            <p style={{ margin: '0.5rem 0 0', fontSize: '1.4rem', fontWeight: 'bold', color: '#10b981' }}>
              R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <form onSubmit={handleTransfer} style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Executar Liquidação</h2>
          
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Conta de Origem</label>
          <select value={sourceId} onChange={e => setSourceId(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155' }}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.owner} ({a.number})</option>)}
          </select>

          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Conta de Destino</label>
          <select value={destId} onChange={e => setDestId(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155' }}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.owner} ({a.number})</option>)}
          </select>

          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Valor (BRL)</label>
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155' }} />

          <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            Liquidar Transação
          </button>

          {statusMsg && <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#38bdf8' }}>{statusMsg}</p>}
        </form>

        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Livro-Razão Imutável (Audit Trail)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '0.5rem' }}>Hora</th>
                <th style={{ padding: '0.5rem' }}>Conta</th>
                <th style={{ padding: '0.5rem' }}>Tipo</th>
                <th style={{ padding: '0.5rem' }}>Descrição</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '0.5rem' }}>{item.time}</td>
                  <td style={{ padding: '0.5rem' }}>{item.account}</td>
                  <td style={{ padding: '0.5rem', color: item.type === 'CREDIT' ? '#10b981' : '#f43f5e', fontWeight: 'bold' }}>{item.type}</td>
                  <td style={{ padding: '0.5rem' }}>{item.desc}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right' }}>R$ {item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}