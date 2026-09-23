import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, ArrowLeft, CheckCircle2, AlertCircle, Calendar, MapPin, FileText, Settings2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const AdminElectionCreate: React.FC = () => {
  const navigate = useNavigate();
  const { adminSession } = useAuth();

  const [title, setTitle] = useState<string>('Tamil Nadu Legislative Assembly Election 2026');
  const [type, setType] = useState<'PARLIAMENTARY' | 'ASSEMBLY' | 'MUNICIPAL'>('ASSEMBLY');
  const [description, setDescription] = useState<string>('General Assembly election for electing Member of Legislative Assembly (MLA) for Thousand Lights Assembly Constituency.');
  const [constituency, setConstituency] = useState<string>('Thousand Lights (Constituency No. 20)');
  const [state, setState] = useState<string>('Tamil Nadu');
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('07:00');
  const [endDate, setEndDate] = useState<string>(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState<string>('18:00');
  const [allowNOTA, setAllowNOTA] = useState<boolean>(true);
  const [seniorAccessibility, setSeniorAccessibility] = useState<boolean>(true);
  const [languages, setLanguages] = useState<string[]>(['en', 'ta']);
  const [totalElectors, setTotalElectors] = useState<number>(245000);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
    const endIso = new Date(`${endDate}T${endTime}:00`).toISOString();

    try {
      const res = await fetch('/api/v1/admin/elections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession?.token}`,
        },
        body: JSON.stringify({
          title,
          type,
          description,
          constituency,
          state,
          start_time: startIso,
          end_time: endIso,
          rules: {
            maxSelections: 1,
            allowNOTA,
            requireMFAForAuthority: true,
            seniorAccessibilityEnabled: seniorAccessibility,
          },
          languages,
          total_eligible_voters: totalElectors,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Failed to create election.');
      } else {
        // Created in DRAFT state, now navigate to candidates management
        navigate(`/admin/elections/${data.election.id}/candidates`);
      }
    } catch (err) {
      setErrorMessage('Network error communicating with administrative backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex items-center space-x-2">
        <Link
          to="/admin/dashboard"
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">
          Create New Election (Draft State)
        </h1>
        <p className="text-xs text-slate-500">
          Statutory election configuration. All elections initially instantiate in DRAFT status. Candidates must be assigned before scheduling or opening.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        {/* Election Title & Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700">Election Name *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Parliamentary General Election 2026"
              className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Election Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="PARLIAMENTARY">Parliamentary (Lok Sabha)</option>
              <option value="ASSEMBLY">Legislative Assembly (Vidhan Sabha)</option>
              <option value="MUNICIPAL">Municipal / Local Body</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700">Election Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
            placeholder="Official gazette description of the electoral event..."
          />
        </div>

        {/* Constituency & State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700">Constituency *</label>
            <input
              type="text"
              required
              value={constituency}
              onChange={(e) => setConstituency(e.target.value)}
              placeholder="e.g. Central Chennai (Constituency No. 04)"
              className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">State / Union Territory *</label>
            <input
              type="text"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Tamil Nadu"
              className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Start & End Dates/Times */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700">Start Date *</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">Start Time *</label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">End Date *</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700">End Time *</label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Total Electors & Rules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700">Total Registered Electors</label>
            <input
              type="number"
              value={totalElectors}
              onChange={(e) => setTotalElectors(Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2 pt-5">
            <input
              type="checkbox"
              id="allowNOTA"
              checked={allowNOTA}
              onChange={(e) => setAllowNOTA(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="allowNOTA" className="text-xs font-semibold text-slate-700">
              Enable NOTA (Rule 49-O)
            </label>
          </div>

          <div className="flex items-center space-x-2 pt-5">
            <input
              type="checkbox"
              id="seniorAccessibility"
              checked={seniorAccessibility}
              onChange={(e) => setSeniorAccessibility(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <label htmlFor="seniorAccessibility" className="text-xs font-semibold text-slate-700">
              Senior Citizen Accessibility Mode
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
          <Link
            to="/admin/dashboard"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-2 shadow-sm disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{loading ? 'Creating Election Draft...' : 'Create Election Draft'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
