import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { Plus, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

function AssembleiasPage({ db, t, selectedCondoId, users, condo, currentUser }) {
  const [assembleias, setAssembleias] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [numero, setNumero] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [tipo, setTipo] = useState('geral');
  const [pontos, setPontos] = useState(['']);
  const [convidados, setConvidados] = useState([]);
  const [convidadosOpen, setConvidadosOpen] = useState(false);

  useEffect(() => {
    if (!selectedCondoId) return;
    const col = collection(db, 'condos', selectedCondoId, 'assembleias');
    const unsub = onSnapshot(col, (snap) => {
      const items = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
      items.sort((a, b) => {
        const dA = a.data ? new Date(a.data) : new Date(0);
        const dB = b.data ? new Date(b.data) : new Date(0);
        return dB - dA;
      });
      setAssembleias(items);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedCondoId]);

  const addPonto = () => setPontos([...pontos, '']);
  const removePonto = (idx) => setPontos(pontos.filter((_, i) => i !== idx));
  const updatePonto = (idx, val) => { const copy = [...pontos]; copy[idx] = val; setPontos(copy); };

  const toggleConvidado = (userId) => {
    setConvidados(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const selectAllConvidados = () => {
    if (convidados.length === users.length) {
      setConvidados([]);
    } else {
      setConvidados(users.map(u => u.firestoreId));
    }
  };

  const formatDateExtended = (dateStr) => {
    const d = new Date(dateStr);
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  };

  const addMinutes = (timeStr, mins) => {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + mins;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!numero || !data || !hora || pontos.filter(p => p.trim()).length === 0 || convidados.length === 0) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    setSending(true);
    try {
      const pontosLimpos = pontos.filter(p => p.trim());
      const assembleiaData = {
        numero, data, hora, tipo,
        pontos: pontosLimpos,
        convidados,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'condos', selectedCondoId, 'assembleias'), assembleiaData);

      const adminUser = users.find(u => u.role === 'admin') || currentUser;
      const adminName = adminUser?.name || 'A Administração';
      const condoName = condo?.name || '';
      const condoAddress = condo?.address || '';
      const tipoLabel = tipo === 'extraordinaria' ? ' Extraordinária' : '';
      const dataExtenso = formatDateExtended(data);
      const hora2a = addMinutes(hora, 30);

      const pontosHtml = pontosLimpos.map((p, i) => `${i + 1}. ${p}`).join('<br>');

      for (const userId of convidados) {
        const user = users.find(u => u.firestoreId === userId);
        if (!user || !user.email) continue;

        let pdfBase64 = null;
        try {
          const pdfDoc = new jsPDF();
          const pageWidth = pdfDoc.internal.pageSize.getWidth();
          let y = 20;

          pdfDoc.setFontSize(11);
          pdfDoc.text(user.name || '', 14, y); y += 8;
          pdfDoc.setFontSize(10);
          pdfDoc.text(condoName, 14, y); y += 5;
          pdfDoc.text(condoAddress, 14, y); y += 12;

          pdfDoc.setFontSize(16);
          pdfDoc.setFont(undefined, 'bold');
          pdfDoc.text('PROCURAÇÃO', pageWidth / 2, y, { align: 'center' }); y += 12;

          pdfDoc.setFontSize(10);
          pdfDoc.setFont(undefined, 'normal');
          pdfDoc.text(condoAddress, 14, y); y += 10;

          const procText = `Eu, ${user.name}, constituo meu bastante procurador:`;
          pdfDoc.text(procText, 14, y); y += 8;

          pdfDoc.text('Nome: _________________________________________________________________', 14, y); y += 7;
          pdfDoc.text('Morada: ________________________________________________________________', 14, y); y += 7;
          pdfDoc.text('Doc. Id.:  BI [  ]   /   CC [  ]   /   Passaporte [  ]', 14, y); y += 7;
          pdfDoc.text('Nº: ____________________________________', 14, y); y += 10;

          const poderText = `, a quem confiro os poderes de, em meu nome, deliberar e votar todas as propostas que forem apresentadas na reunião de assembleia de condóminos a realizar em ${condoAddress}, no dia ${dataExtenso} às ${hora}H, ou, alternativamente, no dia ${dataExtenso} às ${hora2a}H, incluindo poderes de substabelecimento, com as seguintes recomendações e/ou exceções:`;
          const splitPoder = pdfDoc.splitTextToSize(poderText, pageWidth - 28);
          pdfDoc.text(splitPoder, 14, y); y += splitPoder.length * 5 + 10;

          pdfDoc.setFont(undefined, 'bold');
          pdfDoc.text('Frações de que sou titular:', 14, y); y += 7;
          pdfDoc.setFont(undefined, 'normal');

          pdfDoc.setFillColor(240, 240, 240);
          pdfDoc.rect(14, y - 1, pageWidth - 28, 7, 'F');
          pdfDoc.text('Permilagem', 16, y + 4);
          pdfDoc.text('Fração', 70, y + 4);
          pdfDoc.text('Nº Votos', 130, y + 4);
          y += 9;

          pdfDoc.text(user.permilagem ? String(user.permilagem) + '‰' : '', 16, y + 4);
          pdfDoc.text(user.fraction || '', 70, y + 4);
          pdfDoc.text('1', 130, y + 4);
          y += 9;

          pdfDoc.line(14, y, pageWidth - 14, y); y += 12;

          pdfDoc.text('Data: ____ / ____ / ________', 14, y); y += 10;
          pdfDoc.text('Assinatura: ______________________________________________________________', 14, y); y += 14;

          pdfDoc.setFontSize(8);
          pdfDoc.setFont(undefined, 'italic');
          const nota = 'NOTA: Esta procuração deverá ser devidamente preenchida, assinada e remetida ou entregue à Administração do Condomínio.';
          pdfDoc.text(nota, 14, y);

          pdfBase64 = pdfDoc.output('datauristring').split(',')[1];
        } catch (pdfErr) {
          console.error("Erro ao gerar PDF procuração:", pdfErr);
        }

        const htmlBody = `
          <p><strong>${condoName}</strong></p>
          <br>
          <p>Exmº(ª) Senhor(ª)<br>${user.name}</p>
          <br>
          <p>O Administrador do edifício em referência, <strong>${adminName}</strong>, nos termos e para os efeitos do que dispõem os artigos 1431º e 1432º do Código Civil, convocam Vª Exª para a <strong>Assembleia Geral${tipoLabel}</strong> a realizar no próximo dia <strong>${dataExtenso}</strong> pelas <strong>${hora}</strong>H em <strong>${condoAddress}</strong>, com a seguinte ordem de trabalhos:</p>
          <br>
          <p>${pontosHtml}</p>
          <br>
          <p><strong>Informação Legal (2.ª Convocatória):</strong></p>
          <p>Se à hora marcada não se encontrar reunido o quórum legal necessário para deliberar, fica desde já convocada a Assembleia para reunir em segunda convocatória, no mesmo dia e local, às <strong>${hora2a}</strong>H, deliberando a assembleia com os condóminos presentes, desde que estes representem, pelo menos, um quarto do valor total do prédio, conforme o n.º 4 do Artigo 1432.º do Código Civil.</p>
          <br>
          <p>Caso não possa estar presente, poderá fazer-se representar por outra pessoa, desde que esta se faça acompanhar da respetiva procuração.</p>
          <br>
          <p>Com os melhores cumprimentos,<br><strong>${adminName}</strong></p>
        `;

        const fractionLabel = (user.fraction || 'X').replace(/\s+/g, '-');
        const mailData = {
          to: user.email,
          condoId: selectedCondoId,
          message: {
            subject: `Convocatória - Assembleia Geral${tipoLabel} nº ${numero} - ${condoName}`,
            html: htmlBody
          }
        };

        if (pdfBase64) {
          mailData.message.attachments = [{
            filename: `${fractionLabel}_PROCURACAO.pdf`,
            content: pdfBase64,
            encoding: 'base64'
          }];
        }

        await addDoc(collection(db, 'mail'), mailData);
      }

      alert(t('assembleiaCreated'));
      setShowForm(false);
      setConvidadosOpen(false);
      setNumero(''); setData(''); setHora(''); setTipo('geral'); setPontos(['']); setConvidados([]);
    } catch (err) {
      console.error("Erro ao criar assembleia:", err);
      alert('Erro ao criar assembleia: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const getTipoLabel = (tipo) => tipo === 'extraordinaria' ? t('extraordinaria') : t('geral');

  return (
    <div className="space-y-6">
      <div className="pt-2 flex justify-between items-center">
        <div>
          <h2 className="text-[26px] font-bold text-slate-800 tracking-tight">{t('assembleias')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('assembleiasDesc')}</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (!showForm) setConvidados(users.map(u => u.firestoreId)); }} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
          <Plus className="w-5 h-5" /> {t('novaAssembleia')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">{t('numeroAssembleia')}</label>
              <input type="text" value={numero} onChange={e => setNumero(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">{t('dataAssembleia')}</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">{t('horaAssembleia')}</label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">{t('tipoAssembleia')}</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="geral">{t('geral')}</option>
              <option value="extraordinaria">{t('extraordinaria')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">{t('pontosOrdem')}</label>
            <div className="space-y-2">
              {pontos.map((ponto, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-sm font-bold text-slate-400 w-6">{idx + 1}.</span>
                  <input
                    type="text" value={ponto} onChange={e => updatePonto(idx, e.target.value)}
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Ponto ${idx + 1}...`} required
                  />
                  {pontos.length > 1 && (
                    <button type="button" onClick={() => removePonto(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addPonto} className="mt-2 flex items-center gap-1 text-sm text-blue-600 font-semibold hover:text-blue-700">
              <Plus className="w-4 h-4" /> {t('adicionarPonto')}
            </button>
          </div>

          <div className="relative">
            <label className="block text-sm font-semibold text-slate-600 mb-2">{t('convidados')}</label>
            <button
              type="button" onClick={() => setConvidadosOpen(!convidadosOpen)}
              className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-left outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <span className="text-sm text-slate-700 truncate">
                {convidados.length === users.length
                  ? `Todos selecionados (${users.length})`
                  : convidados.length === 0
                    ? 'Nenhum selecionado'
                    : `${convidados.length} de ${users.length} selecionados`}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${convidadosOpen ? 'rotate-180' : ''}`} />
            </button>

            {convidadosOpen && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('convidados')}</span>
                  <button type="button" onClick={selectAllConvidados} className="text-xs text-blue-600 font-semibold hover:underline">
                    {convidados.length === users.length ? 'Desselecionar Todos' : 'Selecionar Todos'}
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                  {users.map(user => (
                    <label key={user.firestoreId} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={convidados.includes(user.firestoreId)}
                        onChange={() => toggleConvidado(user.firestoreId)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
                        {user.fraction && <p className="text-xs text-slate-400">{user.fraction}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={sending} className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-xl font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors">
              {sending ? 'A enviar...' : t('criarAssembleia')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-4 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">A carregar...</div>
      ) : assembleias.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t('nenhumaAssembleia')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assembleias.map(a => {
            const isExpanded = expandedId === a.firestoreId;
            const dateObj = a.data ? new Date(a.data) : null;
            const dateFormatted = dateObj ? dateObj.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
            return (
              <div key={a.firestoreId} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : a.firestoreId)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-100 text-blue-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800">Assembleia nº {a.numero}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${a.tipo === 'extraordinaria' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {getTipoLabel(a.tipo)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{dateFormatted} {a.hora ? `às ${a.hora}` : ''}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                    <h4 className="text-sm font-semibold text-slate-600 mb-2">Ordem de Trabalhos:</h4>
                    <ol className="list-decimal pl-5 space-y-1">
                      {(a.pontos || []).map((p, i) => (
                        <li key={i} className="text-sm text-slate-700">{p}</li>
                      ))}
                    </ol>
                    {a.convidados && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-slate-600 mb-1">Convidados ({a.convidados.length}):</h4>
                        <div className="flex flex-wrap gap-1">
                          {a.convidados.map(cId => {
                            const u = users.find(u => u.firestoreId === cId);
                            return u ? <span key={cId} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{u.name}</span> : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AssembleiasPage;

