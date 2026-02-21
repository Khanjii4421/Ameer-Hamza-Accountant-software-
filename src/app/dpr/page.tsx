'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Header } from '@/components/layout/Header';
import { DatePicker } from "@/components/ui/DatePicker";
import { api, DPRVendor, DPRLabor, DPRProject, DPRWork, DPREntry, CompanyProfile, DPRRate } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DPRPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [vendors, setVendors] = useState<DPRVendor[]>([]);
    const [labors, setLabors] = useState<DPRLabor[]>([]);
    const [projects, setProjects] = useState<DPRProject[]>([]);
    const [works, setWorks] = useState<DPRWork[]>([]);
    const [entries, setEntries] = useState<DPREntry[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [showToast, setShowToast] = useState({ visible: false, message: '' });
    const [fixedRates, setFixedRates] = useState<DPRRate[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filterVendorId, setFilterVendorId] = useState<string>('');

    // Forms
    const [newVendor, setNewVendor] = useState('');
    const [newLabor, setNewLabor] = useState('');
    const [newLaborRole, setNewLaborRole] = useState('Laborer');
    const [laborVendorId, setLaborVendorId] = useState('');
    const [newWork, setNewWork] = useState('');
    const [newProject, setNewProject] = useState({ name: '', contractor: '' });

    const [newRateForm, setNewRateForm] = useState({ project_id: '', vendor_id: '', work_id: '', rate: 0 });

    // Inline Entry Form
    const [formEntry, setFormEntry] = useState<Partial<DPREntry>>({
        date: new Date().toISOString().split('T')[0],
        weather: 'Sunny',
        vendor_id: '',
        labor_ids: [],
        work_id: '',
        inches: 9,
        sft: 0,
        rate: 0,
        remarks: ''
    });

    useEffect(() => {
        if (user) {
            loadInitialData();
        }
    }, [user]);

    useEffect(() => {
        if (selectedProjectId) {
            loadEntries(selectedProjectId);
        }
    }, [selectedProjectId]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [vRes, lRes, pRes, wRes, rRes, profRes] = await Promise.all([
                api.dpr.vendors.getAll(),
                api.dpr.labors.getAll(),
                api.dpr.projects.getAll(),
                api.dpr.works.getAll(),
                api.dpr.rates.getAll(),
                api.profile.get()
            ]);
            setVendors(Array.isArray(vRes) ? vRes : []);
            setLabors(Array.isArray(lRes) ? lRes : []);
            setProjects(Array.isArray(pRes) ? pRes : []);
            setWorks(Array.isArray(wRes) ? wRes : []);
            setFixedRates(Array.isArray(rRes) ? rRes : []);
            setProfile(profRes);
        } catch (error) {
            console.error("Failed to load DPR data", error);
        } finally {
            setLoading(false);
        }
    };

    const loadEntries = async (projectId: string) => {
        try {
            const data = await api.dpr.entries.getAll(projectId);
            setEntries(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load DPR entries", error);
            setEntries([]);
        }
    };

    const addVendor = async () => {
        if (!newVendor) return;
        try {
            const data = await api.dpr.vendors.add(newVendor);
            setVendors(prev => [data, ...prev]);
            setNewVendor('');
            toast("Vendor added successfully");
        } catch (error) {
            alert("Error adding vendor");
        }
    };

    const addLabor = async () => {
        if (!newLabor || !laborVendorId) return alert("Please select a Contractor first");
        try {
            const data = await api.dpr.labors.add(newLabor, newLaborRole, laborVendorId);
            setLabors(prev => [data, ...prev]);
            setNewLabor('');
            toast(`Added ${newLaborRole}: ${newLabor}`);
        } catch (error) {
            alert("Error adding labor");
        }
    };

    const addFixedRate = async (rate: number, pId: string, vId: string, wId: string) => {
        try {
            const data = await api.dpr.rates.add({ project_id: pId, vendor_id: vId, work_id: wId, rate });
            setFixedRates(prev => [data, ...prev]);
            toast("Fixed rate saved");
        } catch (error) { alert("Error saving rate"); }
    };

    const addWork = async () => {
        if (!newWork) return;
        try {
            const data = await api.dpr.works.add(newWork);
            setWorks(prev => [data, ...prev]);
            setNewWork('');
            toast("Work type added successfully");
        } catch (error) {
            alert("Error adding work type");
        }
    };

    const addProject = async () => {
        if (!newProject.name) return;
        try {
            const data = await api.dpr.projects.add(newProject.name, newProject.contractor);
            setProjects(prev => [data, ...prev]);
            setNewProject({ name: '', contractor: '' });
            setSelectedProjectId(data.id);
            toast("Project created successfully");
        } catch (error) {
            alert("Error creating project");
        }
    };

    useEffect(() => {
        // Auto-fill rate based on fixedRates using the globally selected project
        if (selectedProjectId && formEntry.vendor_id && formEntry.work_id) {
            const found = fixedRates.find(r =>
                r.project_id === selectedProjectId &&
                r.vendor_id === formEntry.vendor_id &&
                r.work_id === formEntry.work_id
            );
            if (found) {
                setFormEntry(prev => ({ ...prev, rate: found.rate }));
            } else {
                setFormEntry(prev => ({ ...prev, rate: 0 }));
            }
        }
    }, [selectedProjectId, formEntry.vendor_id, formEntry.work_id, fixedRates]);

    const saveEntry = async () => {
        if (!selectedProjectId) return alert("Select a project first");

        const total_balance = (formEntry.sft || 0) * (formEntry.rate || 0);

        if (editingId) {
            try {
                await api.dpr.entries.update(editingId, { ...formEntry, total_balance });
                loadEntries(selectedProjectId);
                setEditingId(null);
                setFormEntry({
                    date: new Date().toISOString().split('T')[0],
                    weather: 'Sunny',
                    vendor_id: '',
                    labor_ids: [],
                    work_id: '',
                    inches: 9,
                    sft: 0,
                    rate: 0,
                    remarks: ''
                });
                toast("Entry updated successfully");
            } catch (error) {
                alert("Error updating entry");
            }
            return;
        }

        const nextSrNo = entries.length > 0 ? Math.max(...entries.map(e => e.sr_no)) + 1 : 1;

        const payload = {
            project_id: selectedProjectId,
            sr_no: nextSrNo,
            date: formEntry.date || '',
            weather: formEntry.weather || '',
            vendor_id: formEntry.vendor_id || '',
            labor_ids: formEntry.labor_ids || [],
            work_id: formEntry.work_id || '',
            inches: formEntry.inches || 0,
            sft: formEntry.sft || 0,
            rate: formEntry.rate || 0,
            remarks: formEntry.remarks || '',
            total_balance
        } as any;

        try {
            await api.dpr.entries.add(payload);
            loadEntries(selectedProjectId);
            setFormEntry({
                ...formEntry,
                sft: 0,
                remarks: ''
            });
            toast("Entry added successfully");
        } catch (error) {
            alert("Error saving entry");
        }
    };

    // Search state is already declared at the top, removing the duplicate here.

    const selectedProject = useMemo(() => {
        return projects.find(p => p.id === selectedProjectId);
    }, [projects, selectedProjectId]);

    const stats = useMemo(() => {
        const totalSFT = entries.reduce((sum, e) => sum + (e.sft || 0), 0);
        const totalBalance = entries.reduce((sum, e) => sum + (e.total_balance || 0), 0);
        return { totalSFT, totalBalance };
    }, [entries]);

    const startEdit = (entry: DPREntry) => {
        setEditingId(entry.id);
        setFormEntry({
            date: entry.date,
            weather: entry.weather,
            vendor_id: entry.vendor_id,
            labor_ids: entry.labor_ids || [],
            work_id: entry.work_id,
            inches: entry.inches,
            sft: entry.sft,
            rate: entry.rate,
            remarks: entry.remarks
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getDayName = (dateStr: string) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(dateStr).getDay()];
    };

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            const matchesSearch =
                e.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.work_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.sr_no.toString().includes(searchTerm);

            const matchesVendor = !filterVendorId || e.vendor_id === filterVendorId;

            return matchesSearch && matchesVendor;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [entries, searchTerm, filterVendorId]);

    const contractorStats = useMemo(() => {
        const statsMap: Record<string, { sft: number, balance: number }> = {};
        entries.forEach(e => {
            const name = e.vendor_name || 'Unassigned';
            if (!statsMap[name]) statsMap[name] = { sft: 0, balance: 0 };
            statsMap[name].sft += (e.sft || 0);
            statsMap[name].balance += (e.total_balance || 0);
        });
        return Object.entries(statsMap).map(([name, data]) => ({ name, ...data }));
    }, [entries]);

    const activityChart = useMemo(() => {
        const last7 = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();
        const max = Math.max(...last7.map(d => entries.filter(e => e.date === d).length), 1);
        return last7.map(d => ({
            date: d,
            count: entries.filter(e => e.date === d).length,
            percent: (entries.filter(e => e.date === d).length / max) * 100
        }));
    }, [entries]);

    const availableLabors = useMemo(() => {
        if (!formEntry.vendor_id) return [];
        return labors.filter(l => l.vendor_id === formEntry.vendor_id);
    }, [labors, formEntry.vendor_id]);

    const generateDPRPdf = () => {
        if (!selectedProject) return alert("Select a project first");

        // 1. Password Protection & Tracking
        const pwd = prompt("Enter Download Password (Required):");
        if (!pwd) return;

        let downloadedBy = '';
        if (pwd === 'Raheen123') downloadedBy = 'Raheen';
        else if (pwd === 'Khalil123@') downloadedBy = 'Khalil';
        else return alert("Invalid Password! Download Denied.");


        // Switched to Portrait A4 as requested
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // --- Color Palette (Professional Construction Theme) ---
        const colors: { [key: string]: [number, number, number] } = {
            primary: [1, 50, 32],      // Deep Forest Green (Trust/Construction)
            secondary: [212, 175, 55], // Gold (Premium)
            text: [51, 65, 85],        // Slate-700
            stripe: [248, 250, 252]    // Slate-50
        };

        const formatHeight = (totalInches: number) => {
            if (!totalInches) return '-';
            const ft = Math.floor(totalInches / 12);
            const inc = totalInches % 12;
            return inc > 0 ? `${ft}'${inc}"` : `${ft}'`;
        };

        const drawHeader = (data: any) => {
            const headerHeight = 40;
            if (profile?.letterhead_url) {
                try {
                    const ext = profile.letterhead_url.split('.').pop()?.toLowerCase() || 'jpeg';
                    const format = ext === 'png' ? 'PNG' : 'JPEG';
                    doc.addImage(profile.letterhead_url, format, 0, 10, pageWidth, headerHeight);
                } catch (e) {
                    // Fallback Plain Header
                    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                    doc.rect(0, 0, pageWidth, headerHeight, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(22);
                    doc.text((profile?.name || "MIRAN BUILDERS").toUpperCase(), 10, 18);

                    doc.setFontSize(9);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(200, 200, 200);
                    doc.text(profile?.address || "Engineering & Construction Services", 10, 26);
                }
            } else {
                // Fallback Plain Header (if no URL at all)
                doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.rect(0, 0, pageWidth, headerHeight, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.text((profile?.name || "MIRAN BUILDERS").toUpperCase(), 10, 23); // Shifted down 5mm (18->23)

                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(200, 200, 200);
                doc.text(profile?.address || "Engineering & Construction Services", 10, 31); // Shifted down 5mm (26->31)
            }

            // --- Project Info Banner (Filling the whitespace) ---
            doc.setFillColor(241, 245, 249); // Light Gray Background
            doc.setDrawColor(203, 213, 225); // Border Color
            doc.rect(0, headerHeight + 10, pageWidth, 18, 'F');
            doc.line(0, headerHeight + 28, pageWidth, headerHeight + 28); // Bottom divider

            // Left: Project Name
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]); // Primary Color
            doc.text(`PROJECT: ${selectedProject.name.toUpperCase()}`, 10, headerHeight + 8);



            // Right: Date
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(0);
            const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
            doc.text(dateStr, pageWidth - 10, headerHeight + 11, { align: 'right' });
        };

        const totalSFT = entries.reduce((sum, e) => sum + (e.sft || 0), 0);
        const totalBalance = entries.reduce((sum, e) => sum + (e.total_balance || 0), 0);

        const tableBody = entries.map(e => {
            // Fix missing names using state lookups
            const vendorName = e.vendor_name || vendors.find(v => v.id === e.vendor_id)?.name || '';
            const workName = e.work_name || works.find(w => w.id === e.work_id)?.name || '';

            let laborNames = e.labor_name;
            if (!laborNames && e.labor_ids && e.labor_ids.length > 0) {
                laborNames = e.labor_ids.map(id => labors.find(l => l.id === id)?.name).filter(Boolean).join(', ');
            }

            return [
                (e.sr_no || 0).toString().padStart(3, '0'),
                `${new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\n(${getDayName(e.date)})`,
                e.weather,
                vendorName,
                laborNames || '-',
                workName,
                formatHeight(e.inches),
                e.sft.toLocaleString(),
                e.rate.toLocaleString(),
                e.total_balance.toLocaleString()
            ];
        });

        tableBody.push([
            '',
            'TOTALS',
            '',
            '',
            '',
            '',
            '',
            totalSFT.toLocaleString(),
            '',
            `Rs. ${totalBalance.toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: 72, // Shifted down from 62
            head: [['Sr', 'Date', 'Weather', 'Vendor', 'Labor', 'Work', 'Height', 'SFT', 'Rate/SFT', 'Bal']],
            body: tableBody,
            theme: 'striped',
            headStyles: {
                fillColor: colors.primary,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'center',
                valign: 'middle',
                cellPadding: 3
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                font: 'helvetica',
                valign: 'middle',
                overflow: 'linebreak',
                lineWidth: 0.1,
                lineColor: [220, 220, 220]
            },
            alternateRowStyles: {
                fillColor: colors.stripe
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10, fontStyle: 'bold', textColor: [100, 100, 100] },
                1: { fontStyle: 'bold', cellWidth: 20 },
                2: { cellWidth: 15 },
                5: { cellWidth: 25 },
                6: { halign: 'center', cellWidth: 15 }, // Height
                7: { halign: 'center', fontStyle: 'bold', cellWidth: 15 }, // SFT
                8: { halign: 'center', cellWidth: 15 }, // Rate
                9: { halign: 'right', fontStyle: 'bold', textColor: [0, 100, 0], cellWidth: 25 } // Bal
            },
            margin: { top: 72, left: 10, right: 10 },
            didDrawPage: (data) => {
                drawHeader(data);

                // Footer
                doc.setFontSize(7);
                doc.setTextColor(150);
                doc.setFont("helvetica", "italic");

                // Left
                doc.text("System Generated", 10, pageHeight - 8, { align: 'left' });

                // Center (Password User)
                doc.text(`Downloaded by: ${downloadedBy}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

                // Right
                doc.text(`Page ${data.pageNumber}`, pageWidth - 10, pageHeight - 8, { align: 'right' });
            },
            willDrawCell: (data) => {
                if (data.row.index === tableBody.length - 1 && data.section === 'body') {
                    doc.setFont('helvetica', 'bold');
                    doc.setFillColor(240, 255, 240);
                    doc.setTextColor(0, 0, 0);
                }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;
        // Increased threshold to account for +135mm from table end
        const checkPageBreak = finalY > pageHeight - 150;

        if (checkPageBreak) {
            doc.addPage();
            drawHeader(null);
        }

        const sigY = checkPageBreak ? 80 : finalY;

        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);

        // Offset Calculation: Adjusted to fit A4 height correctly
        const lineOffset = 118; // Moves signature up to ~25mm from bottom
        const textOffset = 123;

        // Left Signature
        doc.line(20, sigY + lineOffset, 70, sigY + lineOffset);
        doc.text("SITE SUPERVISOR", 45, sigY + textOffset, { align: 'center' });

        // Right Signature
        doc.line(pageWidth - 70, sigY + lineOffset, pageWidth - 20, sigY + lineOffset);
        doc.text("CEO", pageWidth - 45, sigY + textOffset, { align: 'center' });
        doc.text("Adnan Zafar", pageWidth - 45, sigY + textOffset + 5, { align: 'center' }); // Name below title

        doc.save(`${selectedProject.name.replace(/\s+/g, '_')}_DPR.pdf`);
    };



    const deleteEntry = async (id: string) => {
        if (!confirm("Delete this progress entry?")) return;
        try {
            await api.dpr.entries.delete(id);
            setEntries(entries.filter(e => e.id !== id));
            toast("Entry deleted");
        } catch (error: any) {
            alert("Error deleting entry: " + (error.message || "Unknown error"));
        }
    };

    const deleteProject = async (id: string) => {
        if (!confirm("Delete site? This will remove all associated records!")) return;
        try {
            await api.dpr.projects.delete(id);
            setProjects(projects.filter(p => p.id !== id));
            if (selectedProjectId === id) {
                setSelectedProjectId('');
                setEntries([]);
            }
            toast("Site deleted");
        } catch (error: any) { alert("Error deleting site: " + (error.message || "Unknown error")); }
    };

    const deleteVendor = async (id: string) => {
        if (!confirm("Delete contractor?")) return;
        try {
            await api.dpr.vendors.delete(id);
            setVendors(vendors.filter(v => v.id !== id));
            toast("Contractor deleted");
        } catch (error: any) { alert("Error deleting contractor: " + (error.message || "Unknown error")); }
    };

    const deleteLabor = async (id: string) => {
        if (!confirm("Delete labor?")) return;
        try {
            await api.dpr.labors.delete(id);
            setLabors(labors.filter(l => l.id !== id));
            toast("Labor deleted");
        } catch (error: any) { alert("Error deleting labor: " + (error.message || "Unknown error")); }
    };

    const deleteWork = async (id: string) => {
        if (!confirm("Delete work type?")) return;
        try {
            await api.dpr.works.delete(id);
            setWorks(works.filter(w => w.id !== id));
            toast("Work type deleted");
        } catch (error: any) { alert("Error deleting work type: " + (error.message || "Unknown error")); }
    };

    const deleteFixedRate = async (id: string) => {
        if (!confirm("Delete fixed rate?")) return;
        try {
            await api.dpr.rates.delete(id);
            setFixedRates(fixedRates.filter(r => r.id !== id));
            toast("Fixed rate removed");
        } catch (error) { alert("Error deleting rate"); }
    };

    const toast = (msg: string) => {
        setShowToast({ visible: true, message: msg });
        setTimeout(() => setShowToast({ visible: false, message: '' }), 3000);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading DPR System...</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Header title="Daily Progress Report (DPR)" />

            {/* Success Toast */}
            {showToast.visible && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
                    <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2">
                        <span>✅</span> {showToast.message}
                    </div>
                </div>
            )}

            <main className="max-w-[1600px] mx-auto px-4 mt-8 space-y-8">

                {/* Visual Overview Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">🏢</div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Items</p>
                            <p className="text-xl font-black text-slate-900">{vendors.length} Contractors</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl">👷</div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Registered Labor</p>
                            <p className="text-xl font-black text-slate-900">{labors.length} persons</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">🏗️</div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Managed Sites</p>
                            <p className="text-xl font-black text-slate-900">{projects.length} sites</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Weekly Activity</p>
                        <div className="flex items-end gap-1.5 h-10 px-1">
                            {activityChart.map((d, i) => {
                                const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-sky-500', 'bg-rose-500', 'bg-violet-500'];
                                return (
                                    <div
                                        key={i}
                                        className={`flex-1 ${colors[i % colors.length]} rounded-t-sm relative group opacity-80 hover:opacity-100 transition-all`}
                                        style={{ height: `${d.percent}%` }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded mb-1 whitespace-nowrap z-20">
                                            {d.count} entries ({d.date.split('-').slice(1).join('/')})
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: SETUP & ENTRY */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* STEP 1: SITE SELECTION */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm">1</div>
                                <h3 className="font-black text-slate-900 uppercase tracking-tight">Step 1: Select Your Site</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-slate-800"
                                        value={selectedProjectId}
                                        onChange={e => setSelectedProjectId(e.target.value)}
                                    >
                                        <option value="">-- Choose Construction Site --</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    {selectedProjectId && (
                                        <button onClick={() => deleteProject(selectedProjectId)} className="w-12 h-12 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-100">🗑️</button>
                                    )}
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Quick Add New Site</p>
                                    <div className="space-y-2">
                                        <Input placeholder="Site Name (e.g. 88D)" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} className="h-9 text-xs" />
                                        <Input placeholder="Main Contractor Name" value={newProject.contractor} onChange={e => setNewProject({ ...newProject, contractor: e.target.value })} className="h-9 text-xs" />
                                        <Button onClick={addProject} className="w-full h-9 text-xs uppercase font-black">Create Site</Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* STEP 2: TEAM SETUP */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black text-sm">2</div>
                                <h3 className="font-black text-slate-900 uppercase tracking-tight">Step 2: Setup Team & Trades</h3>
                            </div>
                            <div className="space-y-5">
                                <div className="p-3 bg-slate-50 rounded-2xl space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">🏢 CONTRACTOR / VENDOR</label>
                                    <div className="flex gap-2">
                                        <Input placeholder="e.g. Ali Electric / Al-Noor Masons" value={newVendor} onChange={e => setNewVendor(e.target.value)} className="h-9 text-xs" />
                                        <Button onClick={addVendor} variant="primary" className="h-9 px-3 font-black">+</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                                        {vendors.map(v => (
                                            <span key={v.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600">
                                                {v.name}
                                                <button onClick={() => deleteVendor(v.id)} className="text-red-400 hover:text-red-600 px-0.5">×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">👷 LABOR NAME / HEAD</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                                            value={laborVendorId}
                                            onChange={e => setLaborVendorId(e.target.value)}
                                        >
                                            <option value="">-- Contractor --</option>
                                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                        <select
                                            className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                                            value={newLaborRole}
                                            onChange={e => setNewLaborRole(e.target.value)}
                                        >
                                            <option value="Laborer">Laborer</option>
                                            <option value="Mason">Mason</option>
                                            <option value="Helper">Helper</option>
                                            <option value="Foreman">Foreman</option>
                                            <option value="Mistri">Mistri</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input placeholder="Laborer Name..." value={newLabor} onChange={e => setNewLabor(e.target.value)} className="h-9 text-xs" />
                                        <Button onClick={addLabor} variant="primary" className="h-9 px-3 font-black">+</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                                        {labors.filter(l => !laborVendorId || l.vendor_id === laborVendorId).map(l => (
                                            <span key={l.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[9px] font-bold text-indigo-600">
                                                {l.name} ({l.role})
                                                <button onClick={() => deleteLabor(l.id)} className="text-red-400 hover:text-red-600 px-0.5">×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">🔨 TRADE / WORK TYPE</label>
                                    <div className="flex gap-2">
                                        <Input placeholder="e.g. Plumbing / Masonry" value={newWork} onChange={e => setNewWork(e.target.value)} className="h-9 text-xs" />
                                        <Button onClick={addWork} variant="primary" className="h-9 px-3 font-black">+</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2 max-h-20 overflow-y-auto">
                                        {works.map(w => (
                                            <span key={w.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-md text-[9px] font-bold text-emerald-600">
                                                {w.name}
                                                <button onClick={() => deleteWork(w.id)} className="text-red-400 hover:text-red-600 px-0.5">×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-900 rounded-2xl space-y-2 border-2 border-emerald-500/20">
                                    <label className="text-[10px] font-black text-emerald-400 uppercase flex items-center gap-1">💰 FIXED RATES FOR {selectedProject?.name || 'ALL SITES'}</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select className="h-8 px-2 bg-slate-800 border-none rounded text-[10px] text-white outline-none" value={newRateForm.project_id || selectedProjectId} onChange={e => setNewRateForm({ ...newRateForm, project_id: e.target.value })}>
                                            <option value="">-- Site --</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <select className="h-8 px-2 bg-slate-800 border-none rounded text-[10px] text-white outline-none" value={newRateForm.vendor_id} onChange={e => setNewRateForm({ ...newRateForm, vendor_id: e.target.value })}>
                                            <option value="">-- Cont. --</option>
                                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                        <select className="h-8 px-2 bg-slate-800 border-none rounded text-[10px] text-white outline-none" value={newRateForm.work_id} onChange={e => setNewRateForm({ ...newRateForm, work_id: e.target.value })}>
                                            <option value="">-- Trade --</option>
                                            {works.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                        <div className="flex gap-1">
                                            <input type="number" placeholder="Rate" className="w-full h-8 px-2 bg-slate-800 border-none rounded text-[10px] text-white outline-none" value={newRateForm.rate || ''} onChange={e => setNewRateForm({ ...newRateForm, rate: Number(e.target.value) })} />
                                            <Button onClick={() => addFixedRate(newRateForm.rate, newRateForm.project_id || selectedProjectId, newRateForm.vendor_id, newRateForm.work_id)} className="h-8 px-2 bg-emerald-500 hover:bg-emerald-400 font-black">+</Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 mt-3 max-h-32 overflow-y-auto">
                                        {fixedRates.filter(r => !selectedProjectId || r.project_id === selectedProjectId).map(r => {
                                            const v = vendors.find(x => x.id === r.vendor_id);
                                            const w = works.find(x => x.id === r.work_id);
                                            return (
                                                <div key={r.id} className="flex justify-between items-center p-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] text-slate-400">{v?.name}</span>
                                                        <span className="text-[10px] font-black text-white">{w?.name}: Rs. {r.rate}</span>
                                                    </div>
                                                    <button onClick={() => deleteFixedRate(r.id)} className="text-red-400 hover:text-red-600 text-[10px] font-bold">×</button>
                                                </div>
                                            );
                                        })}
                                        {fixedRates.filter(r => !selectedProjectId || r.project_id === selectedProjectId).length === 0 && (
                                            <p className="text-[10px] text-slate-500 italic text-center py-2">No fixed rates setup for this site.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: DATA ENTRY & OVERVIEW */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* STEP 3: DAILY ENTRY */}
                        <div className="bg-white rounded-3xl p-4 lg:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 transform translate-x-1/4 -translate-y-1/4 opacity-5">
                                <div className="text-9xl font-black text-slate-900">3</div>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm">3</div>
                                    <h3 className="font-black text-slate-900 uppercase tracking-wider text-xl">
                                        {editingId ? 'EDITING PROGRESS' : 'NEW DAILY PROGRESS'}
                                        {selectedProject && <span className="ml-3 text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">SITE: {selectedProject.name}</span>}
                                    </h3>
                                </div>
                                {selectedProject && (
                                    <Button onClick={generateDPRPdf} variant="primary" className="bg-slate-900 text-white hover:bg-slate-800 font-black h-11 px-6 shadow-xl">
                                        📄 DOWNLOAD PDF REPORT
                                    </Button>
                                )}
                            </div>

                            {!selectedProjectId ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem]">
                                    <div className="text-6xl mb-4">📍</div>
                                    <h4 className="text-xl font-black text-slate-900 uppercase">No Site Selected</h4>
                                    <p className="text-slate-500 font-medium">Please select a Construction Site from Step 1 to begin entries.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    <div className="space-y-1.5 date-picker-dpr">
                                        <DatePicker
                                            label="Date"
                                            value={formEntry.date || ''}
                                            onChange={val => setFormEntry({ ...formEntry, date: val })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Weather</label>
                                        <select className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none" value={formEntry.weather} onChange={e => setFormEntry({ ...formEntry, weather: e.target.value })}>
                                            <option value="Sunny">Sunny ☀️</option>
                                            <option value="Cloudy">Cloudy ☁️</option>
                                            <option value="Hot">Hot 🌡️</option>
                                            <option value="Rainy">Rainy 🌧️</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase ml-1">CONTRACTOR</label>
                                        <select className="w-full h-11 px-4 bg-slate-50 border border-emerald-100 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/10" value={formEntry.vendor_id} onChange={e => setFormEntry({ ...formEntry, vendor_id: e.target.value, labor_ids: [] })}>
                                            <option value="">-- Choose Contractor --</option>
                                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Assigned Labor(s)</label>
                                        <div className="flex flex-wrap gap-1 p-2 bg-slate-50 border border-dashed border-slate-200 rounded-xl min-h-[44px]">
                                            {availableLabors.length === 0 && <p className="text-[10px] text-slate-400 m-auto">{formEntry.vendor_id ? '-- Choose Labors below --' : '-- Select Contractor first --'}</p>}
                                            {(formEntry.labor_ids || []).map(id => {
                                                const lab = labors.find(l => l.id === id);
                                                return (
                                                    <span key={id} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black flex items-center gap-1">
                                                        {lab?.name}
                                                        <button onClick={() => setFormEntry(prev => ({ ...prev, labor_ids: (prev.labor_ids || []).filter(lid => lid !== id) }))} className="text-red-500">×</button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <select
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none mt-1"
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val && !formEntry.labor_ids?.includes(val)) {
                                                    setFormEntry(prev => ({ ...prev, labor_ids: [...(prev.labor_ids || []), val] }));
                                                }
                                            }}
                                            value=""
                                        >
                                            <option value="">+ Add More Mazdoors/Laborers</option>
                                            {availableLabors.filter(l => !formEntry.labor_ids?.includes(l.id)).map(l => (
                                                <option key={l.id} value={l.id}>{l.name} ({l.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">TRADE / WORK TYPE</label>
                                        <select className="w-full h-11 px-4 bg-slate-50 border border-indigo-100 rounded-xl text-slate-900 outline-none" value={formEntry.work_id} onChange={e => setFormEntry({ ...formEntry, work_id: e.target.value })}>
                                            <option value="">-- Choose Trade --</option>
                                            {works.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Wall Inches</label>
                                            <select
                                                className="w-full h-11 px-4 bg-slate-50 border border-amber-100 rounded-xl text-slate-900 outline-none"
                                                value={formEntry.inches}
                                                onChange={e => setFormEntry({ ...formEntry, inches: Number(e.target.value) })}
                                            >
                                                <option value="4.5">4.5" Wall</option>
                                                <option value="9">9" Wall</option>
                                                <option value="13.5">13.5" Wall</option>
                                                <option value="18">18" Wall</option>
                                                <option value="23">23" Wall</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-emerald-600 uppercase ml-1">SFT</label>
                                            <Input type="number" value={formEntry.sft || ''} onChange={e => setFormEntry({ ...formEntry, sft: Number(e.target.value) })} className="bg-slate-50 border-emerald-100 text-slate-900 h-11 font-black" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Rate / Unit Cost</label>
                                        <Input type="number" value={formEntry.rate || ''} onChange={e => setFormEntry({ ...formEntry, rate: Number(e.target.value) })} className="bg-slate-50 border-slate-200 text-slate-900 h-11" placeholder="Rs. Per SFT" />
                                    </div>
                                    <div className="lg:col-span-2 space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Execution Remarks</label>
                                        <Input value={formEntry.remarks} onChange={e => setFormEntry({ ...formEntry, remarks: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900 h-11" placeholder="Describe progress details..." />
                                    </div>
                                    <div className="flex gap-2 pt-5">
                                        <Button onClick={saveEntry} className="flex-1 h-12 text-sm font-black tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg border-none uppercase">
                                            {editingId ? '✓ Update Record' : '+ Add Progress Record'}
                                        </Button>
                                        {editingId && (
                                            <Button onClick={() => setEditingId(null)} className="h-12 w-12 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xl border border-slate-200">✕</Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SITE CONTRACTOR BREAKDOWN */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Contractors Distribution
                                </h3>
                                <div className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{selectedProject?.name || 'All Sites'}</div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {contractorStats.length > 0 ? contractorStats.map((cs, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-all">
                                        <p className="text-[10px] font-black text-slate-400 uppercase truncate mb-1">{cs.name}</p>
                                        <div className="flex justify-between items-end">
                                            <p className="text-xl font-black text-slate-900">{cs.sft.toLocaleString()}<span className="text-[10px] text-slate-400 font-bold ml-1">SFT</span></p>
                                            <p className="text-[10px] font-black text-emerald-600">Rs. {cs.balance.toLocaleString()}</p>
                                        </div>
                                    </div>
                                )) : <div className="col-span-4 py-8 text-center text-slate-400 italic text-sm">No contractor data matched.</div>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* STEP 4: HISTORY TABLE */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-lg">4</div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Step 4: Progress Audit & History</h2>
                                <p className="text-xs text-slate-500 font-medium">Verify daily entries and manage records</p>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                            <select
                                className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none w-full md:w-48"
                                value={filterVendorId}
                                onChange={e => setFilterVendorId(e.target.value)}
                            >
                                <option value="">All Contractors</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                            <div className="relative w-full md:w-80">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search by Trade, Sr No, Remarks..."
                                    className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-left border-b border-slate-100">
                                    <th className="py-5 px-6 font-black text-[10px] uppercase tracking-widest">SR# / ID</th>
                                    <th className="py-5 px-6 font-black text-[10px] uppercase tracking-widest">Timing / Day</th>
                                    <th className="py-5 px-6 font-black text-[10px] uppercase tracking-widest">Weather</th>
                                    <th className="py-5 px-6 font-black text-[10px] uppercase tracking-widest">Primary Contractor</th>
                                    <th className="py-5 px-6 font-black text-[10px] uppercase tracking-widest">Technical Trade</th>
                                    <th className="py-5 px-6 font-black text-[10px] uppercase tracking-widest">Measurements</th>
                                    <th className="py-5 px-6 font-black text-[10px] uppercase tracking-widest">Performance Remarks</th>
                                    <th className="py-5 px-6 font-black text-[10px] uppercase tracking-widest text-right">Valuation</th>
                                    <th className="py-5 px-6 font-black text-[10px] uppercase tracking-widest text-center">Operation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredEntries.length > 0 ? filteredEntries.map((e) => (
                                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-5 px-6 text-sm font-mono font-bold text-slate-400">#{(e.sr_no || 0).toString().padStart(3, '0')}</td>
                                        <td className="py-5 px-6">
                                            <p className="text-sm font-black text-slate-800 whitespace-nowrap">
                                                {new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                            <p className="text-[9px] font-black text-indigo-400 uppercase">{getDayName(e.date)}</p>
                                        </td>
                                        <td className="py-5 px-6 text-sm font-medium text-slate-600">{e.weather}</td>
                                        <td className="py-5 px-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-black text-slate-900">{e.vendor_name || 'N/A'}</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {(e.labor_ids || []).map(lid => {
                                                        const lab = labors.find(l => l.id === lid);
                                                        return (
                                                            <span key={lid} className="text-[10px] text-white bg-slate-500 rounded px-1.5 py-0.5 font-bold uppercase" title={lab?.role}>
                                                                {lab?.name || 'Unknown'}
                                                            </span>
                                                        );
                                                    })}
                                                    {(e.labor_ids || []).length === 0 && <span className="text-[10px] text-slate-400 font-bold">No Labor Assigned</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-slate-200 italic">
                                                {e.work_name || 'UNSPECIFIED'}
                                            </span>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-black text-slate-900">{e.sft.toLocaleString()}</span>
                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">SFT</span>
                                                {e.inches > 0 && <span className="text-[10px] font-black text-amber-600">{e.inches}" In.</span>}
                                            </div>
                                        </td>
                                        <td className="py-5 px-6">
                                            <p className="text-xs text-slate-500 font-medium italic max-w-[200px] leading-relaxed line-clamp-2" title={e.remarks}>
                                                {e.remarks || 'No remarks recorded...'}
                                            </p>
                                        </td>
                                        <td className="py-5 px-6 text-right">
                                            <p className="text-[10px] font-black text-slate-400">@ Rs. {e.rate.toLocaleString()}</p>
                                            <p className="text-base font-black text-emerald-600">Rs. {e.total_balance.toLocaleString()}</p>
                                        </td>
                                        <td className="py-5 px-6">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEdit(e)} className="w-9 h-9 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">✏️</button>
                                                <button onClick={() => deleteEntry(e.id)} className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={10} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-40">
                                                <span className="text-6xl">📥</span>
                                                <p className="font-black text-slate-900 text-xl">NO RECORDS MATCHED</p>
                                                <p className="text-sm font-medium text-slate-500 max-w-xs">Start by selecting a project and filling the entry form in Step 3.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {filteredEntries.length > 0 && (
                                <tfoot className="bg-slate-900 text-white">
                                    <tr>
                                        <td colSpan={5} className="py-6 px-6 text-right font-black text-slate-500 uppercase tracking-widest text-xs">Project Filtered Totals</td>
                                        <td className="py-6 px-6 font-black text-emerald-400 text-lg">
                                            {filteredEntries.reduce((sum, e) => sum + (e.sft || 0), 0).toLocaleString()} <span className="text-[10px] ml-1">SFT</span>
                                        </td>
                                        <td colSpan={1}></td>
                                        <td className="py-6 px-6 text-right font-black text-amber-400 text-lg">
                                            <span className="text-[10px] mr-2">Valuation:</span>
                                            Rs. {filteredEntries.reduce((sum, e) => sum + (e.total_balance || 0), 0).toLocaleString()}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
