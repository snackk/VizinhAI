import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { setDoc, doc, collection, addDoc, runTransaction, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { Wallet, CheckCircle, PlusCircle, X, Trash2 } from 'lucide-react';

function CurrentAccountPage({ budgets, users, quotas, isAdmin, db, appId, condo, t, selectedCondoId }) {
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraMonth, setExtraMonth] = useState('');
  const [extraYear, setExtraYear] = useState('');
  const [extraQuotas, setExtraQuotas] = useState({});
  const [loadingExtra, setLoadingExtra] = useState(false);
  // Payment modal state
  const [paymentModal, setPaymentModal] = useState(null); // { userId, monthKey, isExtra, owedAmount }
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const sortedBudgets = [...budgets].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  const currentBudget = sortedBudgets[0];

  if (!currentBudget) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
        <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 font-medium">Por favor, configure um orçamento primeiro.</p>
      </div>
    );
  }

  const getMonths = (start, end) => {
    const months = [];
    let current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  };

  const months = getMonths(currentBudget.startDate, currentBudget.endDate);
  const rfPerc = currentBudget.reserveFundPercentage ?? 10;
  const monthlyTotal = currentBudget.totalAmount / 12;

  const budgetMonthKeys = new Set(months.map(m => `${m.getFullYear()}-${m.getMonth()}`));
  const extraMonthKeys = [...new Set(
    quotas
      .filter(q => q.isExtra && !budgetMonthKeys.has(q.monthKey))
      .map(q => q.monthKey)
  )].sort((a, b) => {
    const [yA, mA] = a.split('-').map(Number);
    const [yB, mB] = b.split('-').map(Number);
    return yA !== yB ? yA - yB : mA - mB;
  });

  // Calculate carryover for a user: sum of unpaid differences from previous months
  const getCarryover = (userId, currentMonthIndex) => {
    let carry = 0;
    for (let i = 0; i < currentMonthIndex; i++) {
      const m = months[i];
      const monthKey = `${m.getFullYear()}-${m.getMonth()}`;
      const quota = quotas.find(q => q.firestoreId === `${userId}_${monthKey}`);
      if (quota && quota.status === 'paid' && quota.paidAmount !== undefined) {
        const perm = parseFloat(users.find(u => u.firestoreId === userId)?.permilagem) || 0;
        const qBase = (monthlyTotal * (perm / 1000));
        const rf = qBase * (rfPerc / 100);
        const expectedTotal = qBase + rf + (quota.carryoverAmount || 0);
        const diff = expectedTotal - quota.paidAmount;
        if (diff > 0.01) {
          carry += diff;
        }
      } else if (!quota || quota.status !== 'paid') {
        // Unpaid month - no carryover generated from it (it's still owed in full)
        // But if previous months had carryover, it accumulates
      }
    }
    // Actually, simpler approach: carryover is only from the immediately prior paid months
    // Let's recalculate properly - each month's remainder passes to the next
    carry = 0;
    for (let i = 0; i < currentMonthIndex; i++) {
      const m = months[i];
      const monthKey = `${m.getFullYear()}-${m.getMonth()}`;
      const quota = quotas.find(q => q.firestoreId === `${userId}_${monthKey}`);
      const perm = parseFloat(users.find(u => u.firestoreId === userId)?.permilagem) || 0;
      const qBase = (monthlyTotal * (perm / 1000));
      const rf = qBase * (rfPerc / 100);

      if (quota && quota.status === 'paid') {
        // Total expected = quota base + reserve fund + carryover from previous months
        const totalExpected = qBase + rf + carry;
        const paid = quota.paidAmount !== undefined ? quota.paidAmount : totalExpected;
        // Reserve fund is fixed and does NOT carry over to next months
        // Only the quota base deficit carries over
        const deficit = totalExpected - paid;
        if (deficit > 0.01) {
          // The deficit should not exceed qBase + carry (exclude RF from carryover)
          carry = Math.min(deficit, qBase + carry);
        } else {
          carry = 0;
        }
      }
      // If not paid, the carry doesn't reset - it stays but this month is still fully owed
      // So carryover only comes from partial payments of paid months
    }
    return carry;
  };

  const handleAddExtraMonth = async () => {
    if (!extraMonth || !extraYear) return alert('Preencha mês e ano.');
    const monthIdx = parseInt(extraMonth);
    const year = parseInt(extraYear);
    const key = `${year}-${monthIdx}`;

    if (budgetMonthKeys.has(key)) {
      return alert('Este mês já faz parte do orçamento atual.');
    }
    if (extraMonthKeys.includes(key)) {
      return alert('Este mês extra já foi adicionado.');
    }

    const amounts = {};
    let hasValues = false;
    for (const [userId, val] of Object.entries(extraQuotas)) {
      const amount = parseFloat(val);
      if (amount > 0) {
        amounts[userId] = amount;
        hasValues = true;
      }
    }

    if (!hasValues) return alert('Introduza pelo menos um valor de quota.');

    setLoadingExtra(true);
    try {
      for (const [userId, amount] of Object.entries(amounts)) {
        const quotaId = `${userId}_${key}`;
        await setDoc(doc(db, 'condos', selectedCondoId, 'quotas', quotaId), {
          userId,
          monthKey: key,
          status: 'pending',
          isExtra: true,
          extraAmount: amount,
          createdAt: new Date().toISOString()
        });
      }
      setShowExtraForm(false);
      setExtraMonth('');
      setExtraYear('');
      setExtraQuotas({});
    } catch (err) {
      alert('Erro ao adicionar mês extra: ' + err.message);
    }
    setLoadingExtra(false);
  };

  const handleDeleteExtraMonth = async (monthKey) => {
    if (!confirm(`Tem a certeza que deseja remover este mês extra e todas as quotas associadas?`)) return;
    try {
      const extraQuotasForMonth = quotas.filter(q => q.isExtra && q.monthKey === monthKey);
      for (const q of extraQuotasForMonth) {
        if (q.status === 'paid') {
          alert('Não é possível remover meses com quotas já pagas.');
          return;
        }
      }
      for (const q of extraQuotasForMonth) {
        await deleteDoc(doc(db, 'condos', selectedCondoId, 'quotas', q.firestoreId));
      }
    } catch (err) {
      alert('Erro ao remover mês extra: ' + err.message);
    }
  };

  // Open payment modal when admin clicks a quota cell
  const openPaymentModal = (userId, monthKey, isExtra, owedAmount) => {
    if (!isAdmin) return;
    setPaymentModal({ userId, monthKey, isExtra, owedAmount });
    setPaymentAmount(owedAmount.toFixed(2));
  };

  const handlePayment = async () => {
    if (!paymentModal) return;
    const { userId, monthKey, isExtra, owedAmount } = paymentModal;
    const paid = parseFloat(paymentAmount);

    if (isNaN(paid) || paid <= 0) return alert('Introduza um valor válido.');
    if (paid > owedAmount + 0.01) return alert(`O valor não pode exceder o montante em dívida (${owedAmount.toFixed(2)}€).`);

    const user = users.find(u => u.firestoreId === userId);
    const [year, monthIdx] = monthKey.split('-').map(Number);
    const monthName = t(`months.${monthIdx}`);

    if (!confirm(`Confirma o pagamento de ${paid.toFixed(2)}€ referente a ${monthName} ${year} (${user.fraction})? Esta ação é irreversível e enviará um e-mail de recibo.`)) {
      return;
    }

    setPaymentLoading(true);
    try {
      let receiptNumber = 1;
      const condoRef = doc(db, 'condos', selectedCondoId);
      
      await runTransaction(db, async (transaction) => {
        const condoDoc = await transaction.get(condoRef);
        if (!condoDoc.exists()) throw "Documento do condomínio não existe!";
        receiptNumber = (condoDoc.data().lastReceiptNumber || 0) + 1;
        transaction.update(condoRef, { lastReceiptNumber: receiptNumber });
      });

      const quotaId = `${userId}_${monthKey}`;
      const existing = quotas.find(q => q.firestoreId === quotaId);

      if (isExtra) {
        const currentAmount = existing?.extraAmount || owedAmount;
        const isFullPayment = paid >= currentAmount - 0.01;

        if (isFullPayment) {
          // Full payment of extra quota
          await setDoc(doc(db, 'condos', selectedCondoId, 'quotas', quotaId), {
            ...(existing || {}),
            userId,
            monthKey,
            isExtra: true,
            extraAmount: currentAmount,
            status: 'paid',
            paidAmount: paid,
            receiptNumber,
            updatedAt: new Date().toISOString()
          });
        } else {
          // Partial payment - reduce extraAmount, create a payment record
          const remaining = currentAmount - paid;
          await setDoc(doc(db, 'condos', selectedCondoId, 'quotas', quotaId), {
            ...(existing || {}),
            userId,
            monthKey,
            isExtra: true,
            extraAmount: remaining,
            status: 'pending',
            updatedAt: new Date().toISOString()
          });
          // Store partial payment record
          await addDoc(collection(db, 'condos', selectedCondoId, 'quotas'), {
            userId,
            monthKey,
            isExtra: true,
            isPartialPayment: true,
            paidAmount: paid,
            receiptNumber,
            status: 'paid',
            createdAt: new Date().toISOString()
          });
        }
      } else {
        // Budget month payment
        const perm = parseFloat(user.permilagem) || 0;
        const qBase = (monthlyTotal * (perm / 1000));
        const rf = qBase * (rfPerc / 100);
        const baseMonthly = qBase + rf;
        const monthIndex = months.findIndex(m => `${m.getFullYear()}-${m.getMonth()}` === monthKey);
        const carryover = getCarryover(userId, monthIndex);
        const isFullPayment = paid >= owedAmount - 0.01;

        await setDoc(doc(db, 'condos', selectedCondoId, 'quotas', quotaId), {
          userId,
          monthKey,
          status: 'paid',
          paidAmount: paid,
          carryoverAmount: carryover,
          receiptNumber,
          updatedAt: new Date().toISOString()
        });
      }

      // Generate PDF and send email
      try {
        if (user && user.email) {
          const dateObj = new Date();
          const today = dateObj.toLocaleDateString('pt-PT');
          const condoName = condo?.name || 'Condomínio';
          const admin = users.find(u => u.role === 'admin');
          const adminName = admin?.name || 'A Administração';

          let pdfBase64 = null;
          try {
            const docPdf = new jsPDF();
            docPdf.setFont("helvetica");
            docPdf.setFontSize(10);
            docPdf.setFont("helvetica", "bold");
            docPdf.text(condoName, 15, 20);
            docPdf.setFontSize(12);
            docPdf.text(`RECIBO ${receiptNumber}`, 195, 20, { align: "right" });
            docPdf.setFontSize(10);
            docPdf.setFont("helvetica", "normal");
            const addressLines = docPdf.splitTextToSize(condo?.address || 'N/A', 80);
            docPdf.text(addressLines, 15, 25);
            const nifY = 25 + (addressLines.length * 5);
            docPdf.text(`NIF: ${condo?.nif || 'N/A'}`, 15, nifY);

            const rightX = 195;
            docPdf.setFont("helvetica", "bold");
            docPdf.text("Exmo(a) Sr.(a):", rightX, nifY + 10, { align: "right" });
            docPdf.setFont("helvetica", "normal");
            docPdf.text(user.name, rightX, nifY + 15, { align: "right" });
            docPdf.text(`${user.fraction}`, rightX, nifY + 20, { align: "right" });

            const midY = nifY + 40;
            docPdf.setFont("helvetica", "bold");
            docPdf.text(`V/ NIF: ${user.nif || '999999990'}`, 15, midY);
            docPdf.text("Data de pagamento: ", 15, midY + 8);
            docPdf.setFont("helvetica", "normal");
            docPdf.text(today.replace(/\//g, '-'), 50, midY + 8);
            docPdf.text("Recebemos de V. Ex.ª o pagamento dos seguintes valores:", 15, midY + 16);

            const tableY = midY + 30;
            docPdf.setFontSize(9);
            docPdf.setFont("helvetica", "bold");
            docPdf.text("Data", 15, tableY);
            docPdf.text("Vencimento", 40, tableY);
            docPdf.text("Fração", 65, tableY);
            docPdf.text("Descrição", 85, tableY);
            docPdf.text("Recebido (€)", 195, tableY, { align: "right" });
            docPdf.setLineWidth(0.2);
            docPdf.line(15, tableY + 2, 195, tableY + 2);

            docPdf.setFont("helvetica", "normal");
            let rowY = tableY + 8;
            const docDate = `01-${String(monthIdx + 1).padStart(2, '0')}-${year}`;
            const dueDate = `08-${String(monthIdx + 1).padStart(2, '0')}-${year}`;
            const monthNameStr = monthName.charAt(0).toUpperCase() + monthName.slice(1);

            if (isExtra) {
              docPdf.text(docDate, 15, rowY);
              docPdf.text(dueDate, 40, rowY);
              docPdf.text(user.fraction, 65, rowY);
              docPdf.text(`Quota em atraso - ${monthNameStr} / ${year}`, 85, rowY);
              docPdf.text(paid.toFixed(2).replace('.', ','), 195, rowY, { align: "right" });
            } else {
              const perm = parseFloat(user.permilagem) || 0;
              const qBase = (monthlyTotal * (perm / 1000));
              const rf = qBase * (rfPerc / 100);
              // Show quota + reserve fund proportionally
              const proportion = paid / owedAmount;
              const quotaPart = qBase * proportion;
              const rfPart = rf * proportion;

              docPdf.text(docDate, 15, rowY);
              docPdf.text(dueDate, 40, rowY);
              docPdf.text(user.fraction, 65, rowY);
              docPdf.text(`Quota do orçamento - ${monthNameStr} / ${year}`, 85, rowY);
              docPdf.text(quotaPart.toFixed(2).replace('.', ','), 195, rowY, { align: "right" });

              rowY += 6;
              docPdf.text(docDate, 15, rowY);
              docPdf.text(dueDate, 40, rowY);
              docPdf.text(user.fraction, 65, rowY);
              docPdf.text(`Quota do fundo comum de reserva - ${monthNameStr} / ${year}`, 85, rowY);
              docPdf.text(rfPart.toFixed(2).replace('.', ','), 195, rowY, { align: "right" });

              if (owedAmount > qBase + rf + 0.01) {
                const carryPart = paid - quotaPart - rfPart;
                if (carryPart > 0.01) {
                  rowY += 6;
                  docPdf.text(docDate, 15, rowY);
                  docPdf.text(dueDate, 40, rowY);
                  docPdf.text(user.fraction, 65, rowY);
                  docPdf.text(`Regularização de valor em atraso`, 85, rowY);
                  docPdf.text(carryPart.toFixed(2).replace('.', ','), 195, rowY, { align: "right" });
                }
              }
            }

            rowY += 6;
            docPdf.line(15, rowY, 195, rowY);
            rowY += 6;
            docPdf.setFontSize(8);
            docPdf.text("Isento de I.V.A. nos termos do artº 9º do nº21 do CIVA", 15, rowY);
            docPdf.setFontSize(9);
            docPdf.setFont("helvetica", "bold");
            docPdf.text("Total:", 160, rowY);
            docPdf.text(paid.toFixed(2).replace('.', ','), 195, rowY, { align: "right" });
            rowY += 6;
            docPdf.setFont("helvetica", "bold");
            docPdf.text("Pagamento:", 15, rowY);
            docPdf.setFont("helvetica", "normal");
            docPdf.text("Transferência", 35, rowY);

            const pdfOutput = docPdf.output('datauristring');
            pdfBase64 = pdfOutput.split(',')[1];
          } catch (pdfErr) {
            console.error("Erro ao gerar PDF:", pdfErr);
          }

          const mailData = {
            to: user.email,
            condoId: selectedCondoId,
            message: {
              subject: `Recibo ${receiptNumber} - Quota de ${monthName} ${year} - ${user.fraction}`,
              html: `
                <p>Exmo. condómino<br>${user.name}</p>
                <p>Em anexo segue o seu recibo de pagamento referente ao ${condoName}.</p>
                <p>A administração do condomínio,<br>${adminName}</p>
              `
            }
          };

          if (pdfBase64) {
            mailData.message.attachments = [
              {
                filename: `Recibo_${receiptNumber}_Fração_${user.fraction}.pdf`,
                content: pdfBase64,
                encoding: 'base64'
              }
            ];
          }

          await addDoc(collection(db, 'mail'), mailData);
        }
      } catch (mailErr) {
        console.error("Erro ao enviar email:", mailErr);
        alert('Quota marcada como paga, mas houve um erro ao enviar o e-mail: ' + mailErr.message);
      }

      setPaymentModal(null);
      setPaymentAmount('');
    } catch (err) {
      alert('Erro ao processar pagamento: ' + err.message);
    }
    setPaymentLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h2 className="text-[26px] font-bold text-slate-800">Conta Corrente</h2>
          <p className="text-slate-500 text-sm mt-1">Controlo de quotas pagas por condómino</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowExtraForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Mês Extra
          </button>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setPaymentModal(null); setPaymentAmount(''); }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Registar Pagamento</h3>
              <button onClick={() => { setPaymentModal(null); setPaymentAmount(''); }} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {(() => {
              const user = users.find(u => u.firestoreId === paymentModal.userId);
              const [year, monthIdx] = paymentModal.monthKey.split('-').map(Number);
              return (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
                    <p className="text-sm text-slate-500">Condómino</p>
                    <p className="font-bold text-slate-800">{user?.fraction} - {user?.name}</p>
                    <p className="text-sm text-slate-500 mt-2">Referência</p>
                    <p className="font-semibold text-slate-700 capitalize">{t(`months.${monthIdx}`)} {year} {paymentModal.isExtra && <span className="text-amber-600 text-xs">(Extra)</span>}</p>
                    <p className="text-sm text-slate-500 mt-2">Valor em dívida</p>
                    <p className="font-bold text-red-600 text-xl">{paymentModal.owedAmount.toFixed(2)} €</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor pago (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={paymentModal.owedAmount}
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-lg font-semibold text-center"
                      autoFocus
                    />
                    {parseFloat(paymentAmount) < paymentModal.owedAmount - 0.01 && parseFloat(paymentAmount) > 0 && (
                      <p className="text-xs text-amber-600 mt-2 font-medium">
                        ⚠️ Pagamento parcial — {paymentModal.isExtra ? 'o valor restante ficará pendente nesta quota extra' : 'a diferença será adicionada ao próximo mês'}.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handlePayment}
                    disabled={paymentLoading || !paymentAmount || parseFloat(paymentAmount) <= 0}
                    className="w-full py-3 bg-green-600 text-white rounded-2xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {paymentLoading ? 'A processar...' : `Emitir Recibo de ${parseFloat(paymentAmount || 0).toFixed(2)}€`}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal para adicionar mês extra */}
      {showExtraForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowExtraForm(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Adicionar Mês Extra</h3>
              <button onClick={() => setShowExtraForm(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Adicione quotas em atraso de meses anteriores ao orçamento atual.</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mês</label>
                <select value={extraMonth} onChange={e => setExtraMonth(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm">
                  <option value="">Selecionar...</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>{t(`months.${i}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ano</label>
                <input
                  type="number"
                  value={extraYear}
                  onChange={e => setExtraYear(e.target.value)}
                  placeholder="2024"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-slate-700">Valor da quota por condómino (€)</label>
              {[...users].sort((a, b) => (a.fraction || '').localeCompare(b.fraction || '', 'pt')).map(user => (
                <div key={user.firestoreId} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700 w-32 truncate">{user.fraction} - {user.name}</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={extraQuotas[user.firestoreId] || ''}
                    onChange={e => setExtraQuotas(prev => ({ ...prev, [user.firestoreId]: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleAddExtraMonth}
              disabled={loadingExtra}
              className="w-full py-3 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loadingExtra ? 'A guardar...' : 'Adicionar Mês Extra'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <th className="px-4 py-4 font-semibold sticky left-0 bg-slate-50 min-w-[150px] z-10">Fração / Mês</th>
              {extraMonthKeys.map(key => {
                const [y, m] = key.split('-').map(Number);
                const d = new Date(y, m);
                return (
                  <th key={key} className="px-4 py-4 font-semibold text-center min-w-[120px] bg-amber-50/50">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-amber-700">{d.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' })}</span>
                      {isAdmin && (
                        <button onClick={() => handleDeleteExtraMonth(key)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
              {months.map((m, idx) => (
                <th key={idx} className="px-4 py-4 font-semibold text-center min-w-[120px]">
                  {m.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {[...users].sort((a, b) => (a.fraction || '').localeCompare(b.fraction || '', 'pt')).map(user => {
              const perm = parseFloat(user.permilagem) || 0;
              const quotaBase = (monthlyTotal * (perm / 1000));
              const reserveFund = quotaBase * (rfPerc / 100);
              const baseTotal = quotaBase + reserveFund;

              return (
                <tr key={user.firestoreId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-50">
                    <p className="font-bold text-slate-900">{user.fraction}</p>
                    <p className="text-[11px] text-slate-400 truncate w-32">{user.name}</p>
                  </td>
                  {/* Extra month columns */}
                  {extraMonthKeys.map(key => {
                    const extraQuota = quotas.find(q => q.isExtra && q.userId === user.firestoreId && q.monthKey === key && !q.isPartialPayment);
                    if (!extraQuota) {
                      return (
                        <td key={key} className="px-4 py-4 text-center bg-amber-50/20">
                          <span className="text-slate-300 text-xs">—</span>
                        </td>
                      );
                    }
                    const isPaid = extraQuota.status === 'paid';
                    const amount = extraQuota.extraAmount || 0;
                    return (
                      <td key={key} className="px-4 py-4 text-center bg-amber-50/20">
                        <button
                          onClick={() => !isPaid && openPaymentModal(user.firestoreId, key, true, amount)}
                          disabled={!isAdmin || isPaid}
                          className={`w-full p-2 rounded-xl transition-all border ${isPaid ? 'bg-green-50 border-green-100 text-green-700 cursor-not-allowed' : 'bg-white border-amber-200 text-amber-600 hover:border-amber-300'}`}
                        >
                          {isPaid ? (
                            <div className="flex flex-col items-center">
                              <CheckCircle className="w-4 h-4 mb-0.5" />
                              <span className="text-[10px] font-bold uppercase tracking-tight">Pago</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="text-[10px] font-medium leading-tight">
                                <div className="font-bold text-amber-700">Σ {amount.toFixed(2)}€</div>
                              </div>
                            </div>
                          )}
                        </button>
                      </td>
                    );
                  })}
                  {/* Regular budget month columns */}
                  {months.map((m, idx) => {
                    const monthKey = `${m.getFullYear()}-${m.getMonth()}`;
                    const quota = quotas.find(q => q.firestoreId === `${user.firestoreId}_${monthKey}`);
                    const isPaid = quota && quota.status === 'paid';
                    const carryover = getCarryover(user.firestoreId, idx);
                    const totalWithCarry = baseTotal + carryover;

                    return (
                      <td key={idx} className="px-4 py-4 text-center">
                        <button 
                          onClick={() => !isPaid && openPaymentModal(user.firestoreId, monthKey, false, totalWithCarry)}
                          disabled={!isAdmin || isPaid}
                          className={`w-full p-2 rounded-xl transition-all border ${isPaid ? 'bg-green-50 border-green-100 text-green-700 cursor-not-allowed opacity-100' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
                        >
                          {isPaid ? (
                            <div className="flex flex-col items-center">
                              <CheckCircle className="w-4 h-4 mb-0.5" />
                              <span className="text-[10px] font-bold uppercase tracking-tight">Pago</span>
                              {quota.paidAmount !== undefined && quota.paidAmount < totalWithCarry - 0.01 && (
                                <span className="text-[9px] text-amber-600 font-medium">{quota.paidAmount.toFixed(2)}€</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center opacity-60 group-hover:opacity-100">
                              <div className="text-[10px] font-medium leading-tight">
                                <div>Q: {quotaBase.toFixed(2)}€</div>
                                <div>FR: {reserveFund.toFixed(2)}€</div>
                                {carryover > 0.01 && (
                                  <div className="text-amber-600">+{carryover.toFixed(2)}€</div>
                                )}
                                <div className="border-t border-slate-200 mt-1 pt-0.5 font-bold text-slate-600">Σ {totalWithCarry.toFixed(2)}€</div>
                              </div>
                            </div>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400 px-2 flex-wrap">
        <div className="w-3 h-3 bg-green-50 border border-green-100 rounded"></div>
        <span>Pago</span>
        <div className="w-3 h-3 bg-white border border-slate-100 rounded ml-4"></div>
        <span>Pendente (Q: Quota, FR: Fundo Reserva, Σ: Total)</span>
        <div className="w-3 h-3 bg-amber-50 border border-amber-200 rounded ml-4"></div>
        <span>Mês Extra (quota em atraso)</span>
      </div>
    </div>
  );
}

export default CurrentAccountPage;

