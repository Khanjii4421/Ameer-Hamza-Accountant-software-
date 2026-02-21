'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api, DailyWorkLog, Project, CompanyProfile, HREmployee } from "@/lib/api";

type ViewMode = 'day' | 'week' | 'month' | 'quarter' | 'year';

export default function DailyWorkLogPage() {
    const [logs, setLogs] = useState<DailyWorkLog[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [employees, setEmployees] = useState<HREmployee[]>([]);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('day');

    // Filter States
    const today = new Date().toISOString().split('T')[0];
    const [filterDate, setFilterDate] = useState(today);

    // Form States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<DailyWorkLog | null>(null);
    const [formData, setFormData] = useState({
        date: today,
        project_id: '',
        weather: '',
        description: '',
        work_description: '',
        feet: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [l, p, prof, emps] = await Promise.all([
                api.dailyWorkLogs.getAll(),
                api.projects.getAll(),
                api.profile.get(),
                api.hrEmployees.getAll()
            ]);
            // Sort by Sr No (which we will simulate by date/creation for now or index) - User asked for automatic Sr No.
            // We will sort by Date descending by default.
            setLogs((l || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setProjects(p || []);
            setProfile(prof);
            setEmployees(emps || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (editingLog) {
                await api.dailyWorkLogs.update(editingLog.id, formData);
            } else {
                await api.dailyWorkLogs.add(formData);
            }
            setIsFormOpen(false);
            setEditingLog(null);
            setFormData({
                date: today,
                project_id: '',
                weather: '',
                description: '',
                work_description: '',
                feet: ''
            });
            loadData();
        } catch (e) {
            alert('Failed to save log');
            console.error(e);
        }
    };

    const handleEdit = (log: DailyWorkLog) => {
        setEditingLog(log);
        setFormData({
            date: log.date,
            project_id: log.project_id || '',
            weather: log.weather || '',
            description: log.description || '',
            work_description: log.work_description || '',
            feet: log.feet || ''
        });
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this log?')) return;
        try {
            await api.dailyWorkLogs.delete(id);
            setLogs(prev => prev.filter(l => l.id !== id));
        } catch (e) {
            alert('Failed to delete');
        }
    };

    // --- Filtering Logic ---
    const filteredLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        const filter = new Date(filterDate);

        if (viewMode === 'day') {
            return log.date === filterDate;
        }
        if (viewMode === 'week') {
            const startOfWeek = new Date(filter);
            startOfWeek.setDate(filter.getDate() - filter.getDay()); // Sunday
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return logDate >= startOfWeek && logDate <= endOfWeek;
        }
        if (viewMode === 'month') {
            return logDate.getMonth() === filter.getMonth() && logDate.getFullYear() === filter.getFullYear();
        }
        if (viewMode === 'quarter') {
            const q = Math.floor(filter.getMonth() / 3);
            const startQ = new Date(filter.getFullYear(), q * 3, 1);
            const endQ = new Date(filter.getFullYear(), (q + 1) * 3, 0);
            return logDate >= startQ && logDate <= endQ;
        }
        if (viewMode === 'year') {
            return logDate.getFullYear() === filter.getFullYear();
        }
        return true;
    });


    // --- Excel-Like Table Rendering ---
    // User requested: "simple sa 5 Colourm Hon jasa ka Excel Like he ho ga us main ik heading date aya or likhna b excel jasa ho ga na ka box wghra main sr No date site Automatic aya gi or aga ik descrption ka ik coloum hon pora or aga Weather ho aga work ka coloum ho pora or sath ik pdf boutton ho download krna ha week month today and quater and yealry work main ik detailed discrption ho or aga Feet Ka alga sa coloum ho ya kr den"

    // Columns: Sr No (Auto), Date (Auto sorted), Site (Project), Description, Weather, Work (Detailed Desc), Feet

    const handleDownloadPDF = async () => {
        try {
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;

            const doc = new jsPDF({ orientation: 'landscape' });

            // Header
            doc.setFontSize(18);
            doc.text(profile?.name || 'Daily Work Log', 14, 15);
            doc.setFontSize(10);
            doc.text(`Report Period: ${viewMode.toUpperCase()} ending ${filterDate}`, 14, 22);

            const tableBody = filteredLogs.map((log, index) => [
                index + 1,
                new Date(log.date).toLocaleDateString(),
                log.project_title || projects.find(p => p.id === log.project_id)?.title || '-',
                log.description || '-',
                log.weather || '-',
                log.work_description || '-',
                log.feet || '-'
            ]);

            autoTable(doc, {
                startY: 25,
                head: [['Sr No', 'Date', 'Site / Project', 'Description', 'Weather', 'Work Description', 'Feet']],
                body: tableBody,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                columnStyles: {
                    0: { cellWidth: 15 }, // Sr No
                    1: { cellWidth: 25 }, // Date
                    2: { cellWidth: 40 }, // Site
                    3: { cellWidth: 50 }, // Description
                    4: { cellWidth: 25 }, // Weather
                    5: { cellWidth: 'auto' }, // Work Description (Fluid)
                    6: { cellWidth: 20 }  // Feet
                }
            });

            doc.save(`Daily_Work_Log_${viewMode}_${filterDate}.pdf`);

        } catch (e) {
            console.error(e);
            alert('Failed to generate PDF');
        }
    };


    return (
        <>
            <Header title="Daily Work Log Manager" />
            <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

                {/* Controls */}
                <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex gap-2 items-center">
                        <span className="text-gray-600 font-medium text-sm">View Mode:</span>
                        {(['day', 'week', 'month', 'quarter', 'year'] as ViewMode[]).map(m => (
                            <button
                                key={m}
                                onClick={() => setViewMode(m)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded capitalize transition-colors
                                    ${viewMode === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                `}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-4 items-center">
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                        />
                        <Button onClick={handleDownloadPDF} variant="secondary" className="text-xs h-9">
                            📄 Download PDF
                        </Button>
                        <Button onClick={() => setIsFormOpen(true)} className="text-xs h-9">
                            ➕ Add New Log
                        </Button>
                    </div>
                </div>

                {/* Excel-like Table */}
                <div className="bg-white border border-gray-300 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b border-gray-300 text-gray-700">
                                    <th className="border-r border-gray-300 p-2 w-12 text-center">Sr No</th>
                                    <th className="border-r border-gray-300 p-2 w-24">Date</th>
                                    <th className="border-r border-gray-300 p-2 w-32">Employee</th>
                                    <th className="border-r border-gray-300 p-2 w-48">Site / Project</th>
                                    <th className="border-r border-gray-300 p-2 w-64">Description</th>
                                    <th className="border-r border-gray-300 p-2 w-24">Weather</th>
                                    <th className="border-r border-gray-300 p-2">Work Description</th>
                                    <th className="border-r border-gray-300 p-2 w-24">Feet</th>
                                    <th className="p-2 w-20 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan={9} className="p-4 text-center text-gray-500">Loading data...</td></tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-gray-400">No logs found for this period.</td></tr>
                                ) : filteredLogs.map((log, index) => (
                                    <tr key={log.id} className="hover:bg-blue-50 transition-colors group">
                                        <td className="border-r border-gray-200 p-2 text-center text-gray-500 bg-gray-50">
                                            {index + 1}
                                        </td>
                                        <td className="border-r border-gray-200 p-2 whitespace-nowrap">
                                            {new Date(log.date).toLocaleDateString()}
                                        </td>
                                        <td className="border-r border-gray-200 p-2 font-medium text-gray-900">
                                            {employees.find(e => e.id === log.employee_id)?.employee_name || <span className="text-gray-400 italic">Admin/System</span>}
                                        </td>
                                        <td className="border-r border-gray-200 p-2 truncate max-w-[12rem]" title={log.project_title}>
                                            {log.project_title || projects.find(p => p.id === log.project_id)?.title || <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="border-r border-gray-200 p-2 truncate max-w-[16rem]" title={log.description}>
                                            {log.description || <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="border-r border-gray-200 p-2">
                                            {log.weather || <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="border-r border-gray-200 p-2 text-gray-800" title={log.work_description}>
                                            {log.work_description || <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="border-r border-gray-200 p-2 font-mono text-blue-700">
                                            {log.feet || <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="p-2 text-center">
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(log)} className="text-blue-600 hover:text-blue-800">✎</button>
                                                <button onClick={() => handleDelete(log.id)} className="text-red-600 hover:text-red-800">✕</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add/Edit Modal */}
                {isFormOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
                            <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-bold text-lg">{editingLog ? 'Edit Work Log' : 'Add Daily Work Log'}</h3>
                                <button onClick={() => setIsFormOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600">Date</label>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600">Project / Site</label>
                                    <select
                                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.project_id}
                                        onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                                    >
                                        <option value="">Select Site...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600">Weather</label>
                                    <select
                                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.weather}
                                        onChange={e => setFormData({ ...formData, weather: e.target.value })}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Sunny">Sunny ☀️</option>
                                        <option value="Cloudy">Cloudy ☁️</option>
                                        <option value="Rainy">Rainy 🌧️</option>
                                        <option value="Windy">Windy 💨</option>
                                        <option value="Clear">Clear</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600">Feet / Measurement</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 500 sft"
                                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.feet}
                                        onChange={e => setFormData({ ...formData, feet: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs font-semibold text-gray-600">Short Description</label>
                                    <input
                                        type="text"
                                        placeholder="Brief title or summary..."
                                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs font-semibold text-gray-600">Detailed Work Description</label>
                                    <textarea
                                        placeholder="Detailed log of work done..."
                                        rows={4}
                                        className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        value={formData.work_description}
                                        onChange={e => setFormData({ ...formData, work_description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                                <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                                <Button onClick={handleSave}>{editingLog ? 'Update Log' : 'Save Log'}</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
