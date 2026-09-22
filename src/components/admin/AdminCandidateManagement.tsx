import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Users, PlusCircle, Edit, Ban, Eye, CheckCircle2, AlertCircle, 
  ArrowLeft, Search, ShieldCheck, FileText, Check, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { Candidate, Election, CandidateStatus, CandidateType } from '../../types/index.js';

export const AdminCandidateManagement: React.FC = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const { adminSession } = useAuth();

  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Form State
  const [formCandidateId, setFormCandidateId] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formParty, setFormParty] = useState<string>('');
  const [formType, setFormType] = useState<CandidateType>('Party');
  const [formSymbol, setFormSymbol] = useState<string>('');
  const [formPhoto, setFormPhoto] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formInformation, setFormInformation] = useState<string>('');
  const [formStatus, setFormStatus] = useState<CandidateStatus>('ACTIVE');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchElectionAndCandidates = async () => {
    if (!electionId) return;
    setLoading(true);
    try {
      const elecRes = await fetch(`/api/v1/elections/${electionId}`);
      if (elecRes.ok) {
        const elecData = await elecRes.json();
        setElection(elecData);
      }

      const candRes = await fetch(`/api/v1/elections/${electionId}/candidates`);
      if (candRes.ok) {
        const candData = await candRes.json();
        setCandidates(candData);
      }
    } catch (err) {
      console.error('Failed to load election candidates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElectionAndCandidates();
  }, [electionId]);

  const openAddModal = () => {
    const nextNum = (candidates.length + 1).toString().padStart(2, '0');
    setFormCandidateId(`CAND-${nextNum}`);
    setFormName('');
    setFormParty('');
    setFormType('Party');
    setFormSymbol('');
    setFormPhoto('');
    setFormDescription('');
    setFormInformation('');
    setFormStatus('ACTIVE');
    setErrorMessage(null);
    setShowAddModal(true);
  };

  const openEditModal = (c: Candidate) => {
    setSelectedCandidate(c);
    setFormCandidateId(c.id);
    setFormName(c.name);
    setFormParty(c.party || '');
    setFormType(c.candidateType || 'Party');
    setFormSymbol(c.symbol || '');
    setFormPhoto(c.photo || '');
    setFormDescription(c.description || '');
    setFormInformation(c.information || '');
    setFormStatus(c.status || 'ACTIVE');
    setErrorMessage(null);
    setShowEditModal(true);
  };

  const openViewModal = (c: Candidate) => {
    setSelectedCandidate(c);
    setShowViewModal(true);
  };

  // Submit Add Candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!electionId || !election) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/admin/elections/${electionId}/candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession?.token}`,
        },
        body: JSON.stringify({
          id: formCandidateId,
          name: formName,
          party: formType === 'Party' ? formParty : 'Independent',
          candidate_type: formType,
          constituency: election.constituency,
          symbol: formSymbol,
          photo: formPhoto,
          description: formDescription,
          information: formInformation,
          status: formStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Validation failed.');
      } else {
        setStatusMessage(`Candidate ${data.candidate.name} added successfully.`);
        setShowAddModal(false);
        fetchElectionAndCandidates();
      }
    } catch (err) {
      setErrorMessage('Network error creating candidate.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Candidate
  const handleEditCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!electionId || !selectedCandidate) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/admin/elections/${electionId}/candidates/${selectedCandidate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession?.token}`,
        },
        body: JSON.stringify({
          name: formName,
          party: formType === 'Party' ? formParty : 'Independent',
          candidate_type: formType,
          symbol: formSymbol,
          photo: formPhoto,
          description: formDescription,
          information: formInformation,
          status: formStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Failed to update candidate.');
      } else {
        setStatusMessage(`Candidate ${selectedCandidate.id} updated successfully.`);
        setShowEditModal(false);
        fetchElectionAndCandidates();
      }
    } catch (err) {
      setErrorMessage('Network error updating candidate.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Disable Candidate
  const handleDisableCandidate = async (candidateId: string) => {
    if (!electionId) return;
    const confirm = window.confirm(
      `Are you sure you want to mark candidate ${candidateId} as DISABLED? This candidate will no longer accept votes, but their record remains preserved in the audit log.`
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/v1/admin/elections/${electionId}/candidates/${candidateId}/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession?.token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Failed to disable candidate.');
      } else {
        setStatusMessage(data.message);
        fetchElectionAndCandidates();
      }
    } catch (err) {
      alert('Network error disabling candidate.');
    }
  };

  const getStatusBadge = (status: CandidateStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">ACTIVE</span>;
      case 'INACTIVE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">INACTIVE</span>;
      case 'DISABLED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">DISABLED</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex items-center space-x-2">
        <Link
          to="/admin/dashboard"
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-xs font-bold">
              Election: {electionId}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              election?.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
            }`}>
              {election?.status || 'DRAFT'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Candidate Roster & Validation Management
          </h1>
          <p className="text-xs text-slate-500">
            Constituency: <strong>{election?.constituency}</strong>. Candidates belong strictly to this election and constituency.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Add Candidate</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono flex items-center justify-between shadow-sm">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">×</button>
        </div>
      )}

      {/* Candidate List Table (Section 7 Requirement) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700">
            Registered Candidates ({candidates.length})
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Constituency Scoped • Non-Transferable
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold">Candidate ID</th>
                <th className="py-3 px-4 font-bold">Candidate</th>
                <th className="py-3 px-4 font-bold">Party</th>
                <th className="py-3 px-4 font-bold">Constituency</th>
                <th className="py-3 px-4 font-bold">Symbol</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidates.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                    {c.id}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2.5">
                      {c.photo ? (
                        <img
                          src={c.photo}
                          alt={c.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{c.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    <div>{c.party}</div>
                    <div className="text-[10px] text-slate-400">{c.candidateType}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {c.constituency}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">
                    {c.symbol}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(c.status)}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => openViewModal(c)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Edit Candidate"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {c.status !== 'DISABLED' && (
                      <button
                        onClick={() => handleDisableCandidate(c.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Disable Candidate"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {candidates.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No candidates registered yet for this election.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD CANDIDATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Candidate</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleAddCandidate} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700">Candidate ID *</label>
                  <input
                    type="text"
                    required
                    value={formCandidateId}
                    onChange={(e) => setFormCandidateId(e.target.value)}
                    placeholder="e.g. CAND-05"
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700">Candidate Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as CandidateType)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="Party">Recognized Political Party</option>
                    <option value="Independent">Independent Candidate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700">Full Candidate Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Dr. A. Ramanathan"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700">Party Name</label>
                  <input
                    type="text"
                    disabled={formType === 'Independent'}
                    value={formParty}
                    onChange={(e) => setFormParty(e.target.value)}
                    placeholder={formType === 'Independent' ? 'Independent' : 'e.g. Democratic Alliance'}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700">Electoral Symbol</label>
                  <input
                    type="text"
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value)}
                    placeholder="e.g. Rising Sun / Two Leaves / Book"
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700">Photo URL</label>
                <input
                  type="url"
                  value={formPhoto}
                  onChange={(e) => setFormPhoto(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700">Brief Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="One sentence summary of public service record"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700">Candidate Information & Credentials</label>
                <textarea
                  rows={3}
                  value={formInformation}
                  onChange={(e) => setFormInformation(e.target.value)}
                  placeholder="Detailed public profile, qualifications, civic background..."
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {submitting ? 'Validating...' : 'Save Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CANDIDATE MODAL */}
      {showEditModal && selectedCandidate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Candidate: {selectedCandidate.id}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleEditCandidate} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700">Full Candidate Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700">Party</label>
                  <input
                    type="text"
                    value={formParty}
                    onChange={(e) => setFormParty(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700">Symbol</label>
                  <input
                    type="text"
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as CandidateStatus)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700">Information</label>
                <textarea
                  rows={3}
                  value={formInformation}
                  onChange={(e) => setFormInformation(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {submitting ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW CANDIDATE MODAL */}
      {showViewModal && selectedCandidate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-mono text-xs font-bold text-blue-700">{selectedCandidate.id}</span>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-3">
              {selectedCandidate.photo ? (
                <img
                  src={selectedCandidate.photo}
                  alt={selectedCandidate.name}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-lg">
                  {selectedCandidate.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedCandidate.name}</h3>
                <p className="text-xs font-semibold text-blue-700">{selectedCandidate.party}</p>
                <p className="text-[11px] text-slate-500">Symbol: {selectedCandidate.symbol}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
              <div><strong>Constituency:</strong> {selectedCandidate.constituency}</div>
              <div><strong>Status:</strong> {selectedCandidate.status}</div>
              <div><strong>Candidate Type:</strong> {selectedCandidate.candidateType}</div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed">
              <strong className="block font-semibold text-slate-800 mb-1">Candidate Profile:</strong>
              {selectedCandidate.information || selectedCandidate.description || 'No additional bio provided.'}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
