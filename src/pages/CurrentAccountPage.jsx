import React from 'react';
import { jsPDF } from 'jspdf';
import { setDoc, doc, collection, addDoc, runTransaction } from 'firebase/firestore';
import { Wallet, CheckCircle } from 'lucide-react';

function CurrentAccountPage({ budgets, users, quotas, isAdmin, db, appId, condo, t, selectedCondoId }) {
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

  const months = getMonths(currentBudget.startDate, currentBudget.endDate).reverse();
  const rfPerc = currentBudget.reserveFundPercentage ?? 10;
  const monthlyTotal = currentBudget.totalAmount / 12;

  const togglePaid = async (userId, monthKey) => {
    if (!isAdmin) return;
    const quotaId = `${userId}_${monthKey}`;
    const existing = quotas.find(q => q.firestoreId === quotaId);

    if (existing) {
      alert('Uma quota já paga não pode ser revertida, pois o recibo já foi enviado por e-mail.');
      return;
    }

    const user = users.find(u => u.firestoreId === userId);
    const [year, monthIdx] = monthKey.split('-').map(Number);
    const monthName = t(`months.${monthIdx}`);

    if (!confirm(`Tem a certeza que deseja marcar a quota de ${monthName} ${year} (${user.fraction}) como paga? Esta ação é irreversível e enviará um e-mail de recibo.`)) {
      return;
    }

    try {
      let receiptNumber = 1;
      const condoRef = doc(db, 'condos', selectedCondoId);
      
      try {
        await runTransaction(db, async (transaction) => {
          const condoDoc = await transaction.get(condoRef);
          if (!condoDoc.exists()) {
            throw "Documento do condomínio não existe!";
          }
          receiptNumber = (condoDoc.data().lastReceiptNumber || 0) + 1;
          transaction.update(condoRef, { lastReceiptNumber: receiptNumber });
        });
      } catch (transErr) {
        console.error("Erro na transação do contador:", transErr);
        throw transErr;
      }

      await setDoc(doc(db, 'condos', selectedCondoId, 'quotas', quotaId), {
        userId,
        monthKey,
        status: 'paid',
        receiptNumber,
        updatedAt: new Date().toISOString()
      });
      
      try {
        if (user && user.email) {
          const perm = parseFloat(user.permilagem) || 0;
          const quotaBase = (monthlyTotal * (perm / 1000));
          const reserveFund = quotaBase * (rfPerc / 100);
          const total = quotaBase + reserveFund;
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

            docPdf.text(docDate, 15, rowY);
            docPdf.text(dueDate, 40, rowY);
            docPdf.text(user.fraction, 65, rowY);
            docPdf.text(`Quota do orçamento - ${monthNameStr} / ${year}`, 85, rowY);
            docPdf.text(quotaBase.toFixed(2).replace('.', ','), 195, rowY, { align: "right" });

            rowY += 6;
            docPdf.text(docDate, 15, rowY);
            docPdf.text(dueDate, 40, rowY);
            docPdf.text(user.fraction, 65, rowY);
            docPdf.text(`Quota do fundo comum de reserva - ${monthNameStr} / ${year}`, 85, rowY);
            docPdf.text(reserveFund.toFixed(2).replace('.', ','), 195, rowY, { align: "right" });

            rowY += 6;
            docPdf.line(15, rowY, 195, rowY);

            rowY += 6;
            docPdf.setFontSize(8);
            docPdf.text("Isento de I.V.A. nos termos do artº 9º do nº21 do CIVA", 15, rowY);
            docPdf.setFontSize(9);
            docPdf.setFont("helvetica", "bold");
            docPdf.text("Total:", 160, rowY);
            docPdf.text(total.toFixed(2).replace('.', ','), 195, rowY, { align: "right" });

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
        alert('Quota marcada como paga, mas houve um erro ao enviar o e-mail: ' + mailErr.message + '\n\nCertifique-se de que adicionou a regra para a coleção "mail" no Firestore.');
      }
    } catch (err) {
      alert('Erro ao atualizar estado de pagamento: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <h2 className="text-[26px] font-bold text-slate-800">Conta Corrente</h2>
        <p className="text-slate-500 text-sm mt-1">Controlo de quotas pagas por condómino</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <th className="px-4 py-4 font-semibold sticky left-0 bg-slate-50 min-w-[150px] z-10">Fração / Mês</th>
              {months.map((m, idx) => (
                <th key={idx} className="px-4 py-4 font-semibold text-center min-w-[120px]">
                  {m.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(user => {
              const perm = parseFloat(user.permilagem) || 0;
              const quotaBase = (monthlyTotal * (perm / 1000));
              const reserveFund = quotaBase * (rfPerc / 100);
              const total = quotaBase + reserveFund;

              return (
                <tr key={user.firestoreId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-50">
                    <p className="font-bold text-slate-900">{user.fraction}</p>
                    <p className="text-[11px] text-slate-400 truncate w-32">{user.name}</p>
                  </td>
                  {months.map((m, idx) => {
                    const monthKey = `${m.getFullYear()}-${m.getMonth()}`;
                    const isPaid = quotas.some(q => q.userId === user.firestoreId && q.monthKey === monthKey);
                    return (
                      <td key={idx} className="px-4 py-4 text-center">
                        <button 
                          onClick={() => togglePaid(user.firestoreId, monthKey)}
                          disabled={!isAdmin || isPaid}
                          className={`w-full p-2 rounded-xl transition-all border ${isPaid ? 'bg-green-50 border-green-100 text-green-700 cursor-not-allowed opacity-100' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
                        >
                          {isPaid ? (
                            <div className="flex flex-col items-center">
                              <CheckCircle className="w-4 h-4 mb-0.5" />
                              <span className="text-[10px] font-bold uppercase tracking-tight">Pago</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center opacity-60 group-hover:opacity-100">
                              <div className="text-[10px] font-medium leading-tight">
                                <div>Q: {quotaBase.toFixed(2)}€</div>
                                <div>FR: {reserveFund.toFixed(2)}€</div>
                                <div className="border-t border-slate-200 mt-1 pt-0.5 font-bold text-slate-600">Σ {total.toFixed(2)}€</div>
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
      <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
        <div className="w-3 h-3 bg-green-50 border border-green-100 rounded"></div>
        <span>Pago</span>
        <div className="w-3 h-3 bg-white border border-slate-100 rounded ml-4"></div>
        <span>Pendente (Q: Quota, FR: Fundo Reserva, Σ: Total)</span>
      </div>
    </div>
  );
}

export default CurrentAccountPage;

