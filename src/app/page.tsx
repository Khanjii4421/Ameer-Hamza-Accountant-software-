'use client';
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/layout/Header";
import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";

// --- Dashboard Chart Component ---
const DashboardChart = ({ ledger, officeExpenses, laborExpenses, laborPaymentsReceived }: { ledger: any[], officeExpenses: any[], laborExpenses: any[], laborPaymentsReceived: any[] }) => {

  const chartData = useMemo(() => {
    // 1. Combine all transactions
    const allTxns = [
      ...ledger.map(e => ({
        date: e.date,
        amount: Number(e.amount),
        type: e.type === 'CREDIT' ? 'income' : 'expense'
      })),
      ...officeExpenses.map(e => ({
        date: e.date,
        amount: Number(e.amount),
        type: 'expense'
      })),
      ...laborExpenses.map((e: any) => ({
        date: e.date,
        amount: Number(e.amount),
        type: 'expense'
      })),
      ...laborPaymentsReceived.map((e: any) => ({
        date: e.date,
        amount: Number(e.amount),
        type: 'income' // Treat labor payments received as income
      }))
    ];

    // 2. Group by Month (default for Dashboard)
    const groups: Record<string, { income: number, expense: number, label: string, sortKey: string }> = {};


    allTxns.forEach(txn => {
      const date = new Date(txn.date);
      // Default to Monthly view for Dashboard
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const sortKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;

      if (!groups[key]) groups[key] = { income: 0, expense: 0, label, sortKey };
      if (txn.type === 'income') groups[key].income += Number(txn.amount);
      else groups[key].expense += Number(txn.amount);
    });

    // 3. Sort
    let data = Object.values(groups).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    // Limit to last 12 months
    if (data.length > 12) data = data.slice(data.length - 12);

    // If empty, return dummy for visual
    if (data.length === 0) return []; // Or handle empty state
    return data;
  }, [ledger, officeExpenses, laborExpenses, laborPaymentsReceived]);

  if (chartData.length === 0) {
    return <div className="h-[300px] flex items-center justify-center text-gray-400">No chart data available yet.</div>;
  }

  // Chart Config
  const width = 800;
  const height = 300;
  const padding = 20;
  const maxValue = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1000);
  const xStep = (width - padding * 2) / (Math.max(chartData.length - 1, 1));

  const getPoints = (type: 'income' | 'expense') => {
    return chartData.map((d, i) => {
      const x = padding + i * xStep;
      const y = height - padding - ((d[type] / maxValue) * (height - padding * 2));
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="relative h-[300px] w-full min-w-[600px] mt-4 select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(p => {
            const y = height - padding - (p * (height - padding * 2));
            return (
              <g key={p}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                <text x={padding - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
                  {Math.round(p * maxValue).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Income Area */}
          <path
            d={`${getPoints('income').replace(/ /g, ' L ')} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`.replace(/^/, 'M ')}
            fill="rgba(34, 197, 94, 0.1)"
            stroke="none"
          />
          <polyline
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={getPoints('income')}
          />

          {/* Expense Area */}
          <path
            d={`${getPoints('expense').replace(/ /g, ' L ')} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`.replace(/^/, 'M ')}
            fill="rgba(239, 68, 68, 0.1)"
            stroke="none"
          />
          <polyline
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={getPoints('expense')}
          />

          {/* Dots */}
          {chartData.map((d, i) => {
            const x = padding + i * xStep;
            const yInc = height - padding - ((d.income / maxValue) * (height - padding * 2));
            const yExp = height - padding - ((d.expense / maxValue) * (height - padding * 2));

            return (
              <g key={`group-${i}`} className="group">
                <line x1={x} y1={padding} x2={x} y2={height - padding} stroke="#e5e7eb" strokeDasharray="4" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                <circle cx={x} cy={yInc} r="4" fill="#22c55e" className="group-hover:r-6 transition-all ring-4 ring-white" />
                <circle cx={x} cy={yExp} r="4" fill="#ef4444" className="group-hover:r-6 transition-all ring-4 ring-white" />
                <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <rect x={x - 60} y={10} width="120" height="60" rx="8" fill="rgba(255, 255, 255, 0.95)" className="shadow-lg border" />
                  <text x={x} y={30} textAnchor="middle" fill="#374151" fontSize="12" fontWeight="bold">{d.label}</text>
                  <text x={x} y={45} textAnchor="middle" fill="#16a34a" fontSize="11">In: Rs. {d.income.toLocaleString()}</text>
                  <text x={x} y={60} textAnchor="middle" fill="#dc2626" fontSize="11">Out: Rs. {d.expense.toLocaleString()}</text>
                </g>
              </g>
            );
          })}

          {/* X Labels */}
          {chartData.map((d, i) => {
            const x = padding + i * xStep;
            return (
              <text key={i} x={x} y={height} textAnchor="middle" fontSize="10" fill="#6b7280" dy="15">
                {d.label}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  );
};

export default function Dashboard() {
  // State
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [officeExpenses, setOfficeExpenses] = useState<any[]>([]);
  const [laborExpenses, setLaborExpenses] = useState<any[]>([]);
  const [laborPaymentsReceived, setLaborPaymentsReceived] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // -- Filter State --
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [showWelcome, setShowWelcome] = useState(false);

  // Load Data
  useEffect(() => {
    loadData();

    // Check if welcome was already shown in this session
    const welcomeShown = sessionStorage.getItem('welcome_shown');
    if (!welcomeShown) {
      setShowWelcome(true);
      sessionStorage.setItem('welcome_shown', 'true');
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 2500); // 2s animation + 0.5s fadeOut
      return () => clearTimeout(timer);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allClients, allProjects, allLedger, allOfficeExpenses, allLaborExpenses, allLaborPaymentsReceived] = await Promise.all([
        api.clients.getAll(),
        api.projects.getAll(),
        api.ledger.getAll(),
        api.officeExpenses.getAll(),
        api.laborExpenses.getAll(),
        api.laborPaymentsReceived.getAll()
      ]);
      setClients(allClients || []);
      setProjects(allProjects || []);
      setLedger(allLedger || []);
      setOfficeExpenses(allOfficeExpenses || []);
      setLaborExpenses(allLaborExpenses || []);
      setLaborPaymentsReceived(allLaborPaymentsReceived || []);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // -- Filter Logic --
  // IMPORTANT: Filter out orphaned projects (projects without valid clients)
  // Note: projects from API already have client_id.
  // We can filter based on that.

  const filteredProjects = selectedClientId === 'all'
    ? projects
    : projects.filter(p => p.client_id === selectedClientId);

  const filteredProjectIds = new Set(filteredProjects.map(p => p.id));

  // 2. Filter Ledger Entries based on filtered projects
  // Ledger from API has project_id
  const filteredEntries = ledger.filter(e => filteredProjectIds.has(e.project_id));

  // 3. Filter Labor Payments Received
  const filteredLaborPaymentsReceived = laborPaymentsReceived.filter(p =>
    selectedClientId === 'all' || p.client_id === selectedClientId
  );

  // 4. Calculate Stats
  const totalReceived = filteredEntries
    .filter(e => e.type === 'CREDIT') // API uses 'CREDIT'
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalProjectExpenses = filteredEntries
    .filter(e => e.type === 'DEBIT') // API uses 'DEBIT'
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Office Expenses: Show only if viewing 'All' (Global)
  const totalOfficeExpenses = selectedClientId === 'all'
    ? officeExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
    : 0;

  // Labor Expenses
  // If we want to filter by project, we need to check if laborExpenses has site_id and if that site_id is in filteredProjectIds.
  const filteredLaborExpenses = laborExpenses
    .filter(e => selectedClientId === 'all' || (e.site_id && filteredProjectIds.has(e.site_id)));

  const totalLaborExpenses = filteredLaborExpenses
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Labor Received
  const totalLaborReceived = filteredLaborPaymentsReceived.reduce((sum, p) => sum + Number(p.amount), 0);

  // Labor Profit
  const laborProfit = totalLaborReceived - totalLaborExpenses;

  const netBalance = totalReceived - totalProjectExpenses;

  // Total Net Profit calculation to include Labor Profit
  // Net Profit = (Project Balance) + (Labor Profit) - Office Overheads
  // Or: (Total Income + Labor Received) - (Project Exp + Labor Exp + Office Exp)
  // Let's keep it simple: Project Net + Labor Profit - Office
  const netProfit = netBalance + laborProfit - totalOfficeExpenses;

  // Currency Formatter
  const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

  if (loading) return <div className="p-8 text-center">Loading Dashboard...</div>;

  return (
    <>
      {showWelcome && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-xl animate-welcome-screen">
          <div className="text-center space-y-4 animate-welcome-text">
            <div className="text-[120px] font-black tracking-tighter leading-none welcome-gradient-text">
              WELCOME
            </div>
            <div className="text-2xl font-bold text-slate-400 uppercase tracking-[0.5em]">
              TO CONSTRUCTION CMS
            </div>
            <div className="flex justify-center gap-2">
              <div className="w-12 h-1 bg-accent rounded-full animate-pulse" />
              <div className="w-4 h-1 bg-slate-200 rounded-full" />
              <div className="w-4 h-1 bg-slate-200 rounded-full" />
            </div>
          </div>
        </div>
      )}
      <Header
        title="Dashboard"
        action={
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Filter by Client</span>
              <select
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary outline-none min-w-[200px] shadow-sm"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="all">Global Overview (All)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id.toString()}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        }
      />

      <div className="p-4 md:p-8 grid gap-6">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="border-l-4 border-green-500">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">{selectedClientId === 'all' ? 'Total Project Income' : 'Client Paid'}</p>
              <h3 className="text-2xl font-bold text-gray-900">{fmt(totalReceived)}</h3>
              <p className="text-xs text-green-600">From {filteredProjects.length} Active Projects</p>
            </div>
          </Card>

          <Card className="border-l-4 border-red-500">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Project Expenses</p>
              <h3 className="text-2xl font-bold text-gray-900">{fmt(totalProjectExpenses)}</h3>
              <p className="text-xs text-red-600">Cost of Sales</p>
            </div>
          </Card>

          <Card className="border-l-4 border-blue-500">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Labor Profit</p>
              <h3 className={`text-2xl font-bold ${laborProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                {fmt(laborProfit)}
              </h3>
              <p className="text-xs text-gray-500">Rec: {fmt(totalLaborReceived)} | Paid: {fmt(totalLaborExpenses)}</p>
            </div>
          </Card>

          {/* Separate Labor Expenses Card might be redundant if shown in Labor Profit details, but kept for clarity/legacy if needed or just replace it */}
          {/* If we have 5 cols, we can keep it. */}
          <Card className="border-l-4 border-yellow-500">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Total Labor Paid</p>
              <h3 className="text-2xl font-bold text-gray-900">{fmt(totalLaborExpenses)}</h3>
              <p className="text-xs text-yellow-600">To Vendors/Labor</p>
            </div>
          </Card>

          <Card className={`border-l-4 ${netProfit >= 0 ? 'border-primary' : 'border-red-600'}`}>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Net Profit (Total)</p>
              <h3 className={`text-2xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-red-600'}`}>{fmt(netProfit)}</h3>
              <p className="text-xs text-gray-500">Incl. Projects & Labor</p>
            </div>
          </Card>
        </div>

        {/* --- PERFORMANCE TREND CHART --- */}
        <div className="grid grid-cols-1">
          <Card title="Financial Overview (Trend)">
            <DashboardChart
              ledger={filteredEntries}
              officeExpenses={selectedClientId === 'all' ? officeExpenses : []}
              laborExpenses={filteredLaborExpenses}
              laborPaymentsReceived={filteredLaborPaymentsReceived}
            />
          </Card>
        </div>

        {/* Quick Navigation / Projects Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Management Shortcuts" className="md:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <a href="/clients" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center group border border-transparent hover:border-gray-200">
                <span className="text-2xl block mb-2">👥</span>
                <span className="font-semibold text-gray-700 group-hover:text-primary">Clients</span>
              </a>
              <a href="/vendors" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center group border border-transparent hover:border-gray-200">
                <span className="text-2xl block mb-2">🏗️</span>
                <span className="font-semibold text-gray-700 group-hover:text-primary">Vendors</span>
              </a>
              <a href="/reports" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center group border border-transparent hover:border-gray-200">
                <span className="text-2xl block mb-2">📊</span>
                <span className="font-semibold text-gray-700 group-hover:text-primary">Reports</span>
              </a>
              <a href="/settings" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center group border border-transparent hover:border-gray-200">
                <span className="text-2xl block mb-2">⚙️</span>
                <span className="font-semibold text-gray-700 group-hover:text-primary">Settings</span>
              </a>
            </div>
          </Card>

          <Card title="System Database">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Total Projects</span>
                <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded shadow-sm">{filteredProjects.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Ledger Entries</span>
                <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded shadow-sm">{filteredEntries.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Expenses</span>
                <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded shadow-sm">{officeExpenses.length} entries</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                <span className="text-gray-600">Labor Entries</span>
                <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded shadow-sm">{laborExpenses.length} entries</span>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </>
  );
}
