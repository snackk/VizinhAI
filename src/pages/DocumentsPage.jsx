import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FolderOpen, UploadCloud, X, Settings, FileText, Download, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

function DocumentsPage({ documents, docTypes, isAdmin, currentUser, db, appId, storage, selectedCondoId }) {
  const [showForm, setShowForm] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [file, setFile] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState({});

  const toggleType = (type) => {
    setExpandedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!editingDoc && !file) return alert('Por favor selecione um ficheiro');
    if (!selectedType) return alert('Por favor selecione um tipo de documento');
    if (!docTitle) return alert('Por favor introduza um título');

    setLoading(true);
    try {
      let fileUrl = editingDoc?.url || '';
      let fileName = editingDoc?.fileName || '';

      if (file) {
        const timestamp = Date.now();
        fileName = `${timestamp}_${file.name}`;
        const fileRef = ref(storage, `condos/${selectedCondoId}/documents/${fileName}`);
        await uploadBytes(fileRef, file);
        fileUrl = await getDownloadURL(fileRef);
      }

      const docData = {
        title: docTitle,
        type: selectedType,
        url: fileUrl,
        fileName: fileName,
        updatedAt: new Date().toISOString(),
        createdBy: currentUser.firestoreId
      };

      if (editingDoc) {
        await updateDoc(doc(db, 'condos', selectedCondoId, 'documents', editingDoc.firestoreId), docData);
      } else {
        await addDoc(collection(db, 'condos', selectedCondoId, 'documents'), docData);
      }

      setShowForm(false);
      setEditingDoc(null);
      setFile(null);
      setDocTitle('');
      setSelectedType('');
    } catch (err) {
      alert('Erro ao processar documento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'condos', selectedCondoId, 'docTypes'), {
        name: newTypeName.trim(),
        createdAt: new Date().toISOString()
      });
      setNewTypeName('');
      setShowTypeForm(false);
    } catch (err) {
      alert('Erro ao adicionar tipo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteType = async (typeId, typeName) => {
    const hasDocs = documents.some(d => d.type === typeName);
    if (hasDocs) return alert('Não é possível eliminar este tipo pois existem documentos associados.');
    if (!confirm('Tem a certeza que deseja eliminar este tipo de documento?')) return;
    
    try {
      await deleteDoc(doc(db, 'condos', selectedCondoId, 'docTypes', typeId));
    } catch (err) {
      alert('Erro ao eliminar tipo: ' + err.message);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Tem a certeza que deseja eliminar este documento?')) return;
    try {
      await deleteDoc(doc(db, 'condos', selectedCondoId, 'documents', docId));
    } catch (err) {
      alert('Erro ao eliminar documento: ' + err.message);
    }
  };

  const handleEditDoc = (d) => {
    setEditingDoc(d);
    setDocTitle(d.title);
    setSelectedType(d.type);
    setShowForm(true);
  };

  const groupedDocs = documents.reduce((acc, d) => {
    if (!acc[d.type]) acc[d.type] = [];
    acc[d.type].push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <div>
          <h2 className="text-[26px] font-bold text-slate-800 tracking-tight">Documentos</h2>
          <p className="text-slate-500 text-sm mt-1">Partilha de atas, faturas e outros ficheiros</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => { setShowTypeForm(!showTypeForm); setShowForm(false); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors">
              <Settings className="w-5 h-5" /> Tipos
            </button>
            <button onClick={() => { setShowForm(!showForm); setShowTypeForm(false); setEditingDoc(null); setFile(null); setDocTitle(''); setSelectedType(''); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
              {showForm ? <X className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />} {showForm ? 'Cancelar' : 'Upload'}
            </button>
          </div>
        )}
      </div>

      {showTypeForm && isAdmin && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-lg text-slate-800">Gerir Tipos de Documentos</h3>
          <form onSubmit={handleAddType} className="flex gap-2">
            <input required placeholder="Novo tipo (ex: Atas, Seguros)" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} className="flex-1 px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={loading} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50">Adicionar</button>
          </form>
          <div className="flex flex-wrap gap-2 pt-2">
            {docTypes.map(type => (
              <div key={type.firestoreId} className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg group">
                <span className="text-sm font-medium text-slate-700">{type.name}</span>
                <button onClick={() => handleDeleteType(type.firestoreId, type.name)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && isAdmin && (
        <form onSubmit={handleFileUpload} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="font-bold text-lg text-slate-800">{editingDoc ? 'Editar Documento' : 'Novo Documento'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase">Título do Documento</label>
              <input required placeholder="Ex: Ata Assembleia Março 2024" value={docTitle} onChange={e => setDocTitle(e.target.value)} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 ml-1 uppercase">Tipo</label>
              <select required value={selectedType} onChange={e => setSelectedType(e.target.value)} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                <option value="">Selecionar tipo...</option>
                {docTypes.map(type => <option key={type.firestoreId} value={type.name}>{type.name}</option>)}
              </select>
            </div>
            {!editingDoc && (
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 ml-1 uppercase">Ficheiro (PDF, Imagem, ZIP)</label>
                <input required type="file" onChange={e => setFile(e.target.files[0])} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
            )}
            {editingDoc && (
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 ml-1 uppercase">Substituir Ficheiro (Opcional)</label>
                <input type="file" onChange={e => setFile(e.target.files[0])} className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button type="submit" disabled={loading} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50 shadow-lg shadow-slate-900/10">
              {loading ? 'A processar...' : editingDoc ? 'Atualizar Documento' : 'Submeter Documento'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {Object.keys(groupedDocs).length > 0 ? Object.keys(groupedDocs).sort().map(type => (
          <div key={type} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all duration-300">
            <div 
              className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center cursor-pointer hover:bg-slate-100/50 transition-colors"
              onClick={() => toggleType(type)}
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2.5 rounded-2xl text-blue-600">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{type}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-500 border border-slate-100 shadow-sm">
                  {groupedDocs[type].length} {groupedDocs[type].length === 1 ? 'Doc' : 'Docs'}
                </span>
                {expandedTypes[type] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>
            </div>
            {expandedTypes[type] && (
              <div className="p-4 space-y-3 flex-1 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {groupedDocs[type].map(d => (
                  <div key={d.firestoreId} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700 text-sm truncate">{d.title}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{new Date(d.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                      </a>
                      {isAdmin && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); handleEditDoc(d); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteDoc(d.firestoreId); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )) : (
          <div className="md:col-span-2 p-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">Ainda não existem documentos partilhados.</p>
            {isAdmin && <button onClick={() => setShowForm(true)} className="mt-4 text-blue-600 font-bold hover:underline">Fazer o primeiro upload</button>}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentsPage;

