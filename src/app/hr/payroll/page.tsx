'use client';
import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { api, CompanyProfile, HREmployee, HRSalaryRecord, HRAdvance, HRIncrement, HRAttendance, HRLeave } from "@/lib/api";
import { generateSalarySlipPDF } from "@/utils/salarySlipPdf";
import { useAuth } from "@/context/AuthContext";

type TabType = 'employees' | 'salary' | 'slip' | 'advances' | 'increments' | 'history';

export default function PayrollPage() {
    const { user } = useAuth();
    const canEdit = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Accountant';
    const [activeTab, setActiveTab] = useState<TabType>('employees');
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [employees, setEmployees] = useState<HREmployee[]>([]);
    const [salaryRecords, setSalaryRecords] = useState<HRSalaryRecord[]>([]);
    const [advances, setAdvances] = useState<HRAdvance[]>([]);
    const [increments, setIncrements] = useState<HRIncrement[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'employee' | 'salary' | 'advance' | 'increment'>('employee');
    const [selectedEmployee, setSelectedEmployee] = useState<HREmployee | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<HREmployee | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Salary Slip Generator
    const [slipEmployeeId, setSlipEmployeeId] = useState('');
    const [slipFromDate, setSlipFromDate] = useState('');
    const [slipToDate, setSlipToDate] = useState('');
    const [slipAmountPaid, setSlipAmountPaid] = useState(0);
    const [slipGenerated, setSlipGenerated] = useState(false);

    // Employee Form
    const emptyEmployee = {
        employee_name: '', father_name: '', designation: '', department: '',
        cnic: '', contact: '', email: '', address: '', joining_date: '',
        basic_salary: 0, house_rent: 0, medical_allowance: 0,
        transport_allowance: 0, other_allowance: 0, bank_name: '',
        bank_account_no: '', status: 'Active' as const
    };
    const [empForm, setEmpForm] = useState(emptyEmployee);

    // Salary Form
    const emptySalary = {
        employee_id: '', salary_month: '', total_days_in_month: 30,
        days_worked: 30, basic_salary: 0, house_rent: 0,
        medical_allowance: 0, transport_allowance: 0, other_allowance: 0,
        overtime_hours: 0, overtime_rate: 0, deductions: 0,
        advance_deduction: 0, loan_deduction: 0, tax_deduction: 0,
        other_deduction: 0, bonus: 0, net_salary: 0,
        payment_date: '', payment_status: 'Pending' as const, remarks: ''
    };
    const [salaryForm, setSalaryForm] = useState(emptySalary);

    // Advance Form
    const emptyAdvance = { employee_id: '', amount: 0, date: '', reason: '', deducted: 0 };
    const [advanceForm, setAdvanceForm] = useState(emptyAdvance);

    // Increment Form
    const emptyIncrement = {
        employee_id: '', previous_salary: 0, new_salary: 0,
        increment_amount: 0, increment_type: 'Fixed' as const,
        effective_date: '', reason: ''
    };
    const [incrementForm, setIncrementForm] = useState(emptyIncrement);

    // History filters
    const [historyEmployeeId, setHistoryEmployeeId] = useState('');
    const [historyFrom, setHistoryFrom] = useState('');
    const [historyTo, setHistoryTo] = useState('');
    const [isPayDay, setIsPayDay] = useState(false);

    useEffect(() => {
        loadData();
        if (new Date().getDate() === 1) setIsPayDay(true);
    }, []);

    const loadData = async () => {
        try {
            const [p, e, s, a, i] = await Promise.all([
                api.profile.get(), api.hrEmployees.getAll(),
                api.hrSalaryRecords.getAll(), api.hrAdvances.getAll(),
                api.hrIncrements.getAll()
            ]);
            setProfile(p); setEmployees(e); setSalaryRecords(s);
            setAdvances(a); setIncrements(i);
        } catch (err) { console.error(err); }
    };

    const fmt = (n: number) => `Rs. ${(n || 0).toLocaleString()}`;
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    const grossSalary = (f: typeof salaryForm) =>
        (f.basic_salary || 0) + (f.house_rent || 0) + (f.medical_allowance || 0) +
        (f.transport_allowance || 0) + (f.other_allowance || 0) +
        ((f.overtime_hours || 0) * (f.overtime_rate || 0)) + (f.bonus || 0);

    const totalDeductions = (f: typeof salaryForm) =>
        (f.deductions || 0) + (f.advance_deduction || 0) + (f.loan_deduction || 0) +
        (f.tax_deduction || 0) + (f.other_deduction || 0);

    // ✅ FIXED: Net = (Gross × payable_ratio) - absent_deduction - other_deductions
    // Absent deduction = absent_days × daily_rate (daily_rate = gross / 30)
    const netSalary = (f: typeof salaryForm) => {
        const g = grossSalary(f);
        const d = totalDeductions(f);
        const daysRatio = (f.days_worked || 30) / (f.total_days_in_month || 30);
        const dailyRate = g / 30;
        const absentDeduction = ((f as any).absent_count || 0) * dailyRate;
        return Math.round((g * daysRatio) - absentDeduction - d);
    };

    // Helper: format local date as YYYY-MM-DD without UTC shift
    const toLocalDateStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Open modal helpers
    const openAddEmployee = () => { setEmpForm(emptyEmployee); setEditingEmployee(null); setModalType('employee'); setShowModal(true); };
    const openEditEmployee = (emp: HREmployee) => {
        setEditingEmployee(emp);
        setEmpForm({ ...emp } as any);
        setModalType('employee'); setShowModal(true);
    };

    // ✅ FIXED: Async salary opener with correct local-date handling
    const openAddSalary = async (emp?: HREmployee) => {
        setLoading(true);
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        let newForm = { ...emptySalary, salary_month: monthStr };

        if (emp) {
            newForm = {
                ...newForm,
                employee_id: emp.id,
                basic_salary: emp.basic_salary, house_rent: emp.house_rent,
                medical_allowance: emp.medical_allowance,
                transport_allowance: emp.transport_allowance,
                other_allowance: emp.other_allowance
            };

            try {
                // 2. Fetch Pending Advances
                const advances = await api.hrAdvances.getAll(emp.id);
                const pendingAmount = advances.filter((a: any) => !a.deducted).reduce((sum: number, a: any) => sum + a.amount, 0);
                if (pendingAmount > 0) {
                    newForm.advance_deduction = pendingAmount;
                    newForm.remarks = `Advance Deduction of Rs.${pendingAmount.toLocaleString()} applied automatically.`;
                }

                // 3. ✅ FIXED ATTENDANCE CALCULATION
                // Parse salary_month (YYYY-MM) properly — never use now.getMonth() blindly
                const [yr, mn] = (newForm.salary_month || monthStr).split('-').map(Number);
                const startOfMonth = new Date(yr, mn - 1, 1);
                const endOfMonth = new Date(yr, mn, 0); // Last day of the salary month

                const [atts, leaves] = await Promise.all([
                    api.hrAttendance.getAll(newForm.salary_month || monthStr, emp.id),
                    api.hrLeaves.getAll('Approved')
                ]);

                const empAtts = atts.filter((a: any) => a.employee_id === emp.id);
                const empLeaves = leaves.filter((l: any) => l.employee_id === emp.id);

                let payableDays = 0;
                let leavesCount = 0;
                let absentCount = 0;
                let currentDate = new Date(startOfMonth);

                while (currentDate <= endOfMonth) {
                    // ✅ KEY FIX: Use LOCAL date string, NOT toISOString() which shifts to UTC
                    const dStr = toLocalDateStr(currentDate);
                    const dayNum = currentDate.getDate();
                    const dayOfWeek = currentDate.getDay(); // 0 = Sunday

                    // Skip 31st (free day per company rule)
                    if (dayNum === 31) {
                        currentDate.setDate(dayNum + 1);
                        continue;
                    }

                    if (dayOfWeek === 0) {
                        // Sunday = paid holiday, never absent
                        payableDays++;
                    } else if (empAtts.some((a: any) => a.date === dStr && (a.status === 'Present' || a.status === 'Late'))) {
                        // Present or Late = payable working day
                        payableDays++;
                    } else if (empLeaves.some((l: any) => {
                        const ls = new Date(l.from_date + 'T00:00:00');
                        const le = new Date(l.to_date + 'T00:00:00');
                        const cd = new Date(dStr + 'T00:00:00');
                        return cd >= ls && cd <= le;
                    })) {
                        // Approved leave = payable (counts as paid leave)
                        payableDays++;
                        leavesCount++;
                    } else {
                        // Mon–Sat, no attendance, no leave = ABSENT (deducted)
                        absentCount++;
                    }

                    currentDate.setDate(currentDate.getDate() + 1);
                }

                // Cap at 30? logic: 30 days divisor.
                // If standard month (30 days) and worked all -> 30.
                // If 28 days (Feb) and worked all -> 28 (But formula uses /30).
                // Wait, if it's Feb and I worked all 28 days + 4 sundays = 28.
                // 28 * (Salary/30) < Salary.
                // Standard practice is usually: If Full Month Worked -> Full Salary.
                // But user "daily rate... fixed... basic salary / 30".
                // This implies strict 30-day math.
                // So if I work 28 days, I get 28/30 salary.
                // User said: "mahina 30 ka a giya to wo b solved ho ga... 35 he raha gi".
                // This implies for a 30-day month, result is 30/30 = 1.
                // For 31 day, we skip 31st, so 30/30 = 1.
                // For Feb (28 days), it will be 28/30 * Salary.

                newForm.days_worked = payableDays;
                newForm.total_days_in_month = 30; // Fixed basis
                (newForm as any).leaves_count = leavesCount;
                (newForm as any).absent_count = absentCount;

            } catch (err) { console.error('Error auto-calc attendance/advance', err); }
        }

        setSalaryForm(newForm);
        setModalType('salary');
        setShowModal(true);
        setLoading(false);
    };
    const openAddAdvance = (emp?: HREmployee) => {
        setAdvanceForm({ ...emptyAdvance, employee_id: emp?.id || '', date: new Date().toISOString().split('T')[0] });
        setModalType('advance'); setShowModal(true);
    };
    const openAddIncrement = (emp?: HREmployee) => {
        setIncrementForm({
            ...emptyIncrement, employee_id: emp?.id || '',
            previous_salary: emp?.basic_salary || 0,
            effective_date: new Date().toISOString().split('T')[0]
        });
        setModalType('increment'); setShowModal(true);
    };

    // Save handlers
    const saveEmployee = async () => {
        setLoading(true);
        try {
            if (editingEmployee) { await api.hrEmployees.update(editingEmployee.id, empForm); }
            else { await api.hrEmployees.add(empForm as any); }
            setShowModal(false); loadData();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const saveSalary = async () => {
        setLoading(true);
        try {
            const finalNet = netSalary(salaryForm);
            const finalGross = grossSalary(salaryForm);
            const leavesCount = (salaryForm as any).leaves_count || 0;
            const absentCount = (salaryForm as any).absent_count || 0;
            await api.hrSalaryRecords.add({
                ...salaryForm,
                net_salary: finalNet,
                gross_salary: finalGross,
                leaves_count: leavesCount,
                absent_count: absentCount,
                remarks: `Attendance: ${salaryForm.days_worked - leavesCount} Present | ${leavesCount} Leave | ${absentCount} Absent. ${salaryForm.remarks || ''}`
            } as any);

            // Automatic Advance Clearance
            if (salaryForm.advance_deduction > 0 && salaryForm.employee_id) {
                const pendingAdvances = await api.hrAdvances.getAll(salaryForm.employee_id);
                // Filter only unpaid
                const unpaid = pendingAdvances.filter(a => !a.deducted);

                let deductedSoFar = 0;
                const totalToDeduct = salaryForm.advance_deduction;

                for (const adv of unpaid) {
                    if (deductedSoFar >= totalToDeduct) break;

                    // Logic: Mark as deducted. 
                    // Verify if we are deducting the full amount of this advance
                    // For simplicity, we mark 'deducted' = amount (truthy) if fully covered.
                    // Or minimal logic: just set deducted=1.

                    // We assume the form auto-filled the SUM of all pending.
                    // So we mark them all as deducted.
                    await api.hrAdvances.update(adv.id, { deducted: 1 } as any);
                    deductedSoFar += adv.amount;
                }
            }

            setShowModal(false); loadData();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const saveAdvance = async () => {
        setLoading(true);
        try {
            await api.hrAdvances.add(advanceForm as any);
            setShowModal(false); loadData();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const saveIncrement = async () => {
        setLoading(true);
        try {
            await api.hrIncrements.add(incrementForm as any);
            setShowModal(false); loadData();
        } catch (err: any) { alert(err.message); }
        setLoading(false);
    };

    const deleteEmployee = async (id: string) => {
        if (!confirm('Delete this employee?')) return;
        await api.hrEmployees.delete(id); loadData();
    };
    const deleteSalaryRecord = async (id: string) => {
        if (!confirm('Delete this salary record?')) return;
        await api.hrSalaryRecords.delete(id); loadData();
    };
    const deleteAdvance = async (id: string) => {
        if (!confirm('Delete this advance?')) return;
        await api.hrAdvances.delete(id); loadData();
    };

    const downloadSlip = async (record: HRSalaryRecord) => {
        const emp = employees.find(e => e.id === record.employee_id);
        if (!emp || !profile) { alert('Data missing'); return; }
        await generateSalarySlipPDF(record, emp, profile);
    };

    const filteredEmployees = employees.filter(e =>
        e.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.designation?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getHistoryRecords = () => {
        let records = salaryRecords;
        if (historyEmployeeId) records = records.filter(r => r.employee_id === historyEmployeeId);
        if (historyFrom) records = records.filter(r => r.salary_month >= historyFrom);
        if (historyTo) records = records.filter(r => r.salary_month <= historyTo);
        return records;
    };

    const getEmployeePendingAdvances = (empId: string) =>
        advances.filter(a => a.employee_id === empId && !a.deducted).reduce((s, a) => s + a.amount, 0);

    // Salary Slip Date-Range Calculator
    const getSlipCalculation = () => {
        const emp = employees.find(e => e.id === slipEmployeeId);
        if (!emp || !slipFromDate || !slipToDate) return null;

        const from = new Date(slipFromDate);
        const to = new Date(slipToDate);
        const totalDays = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (totalDays <= 0) return null;

        const monthlySalary = emp.basic_salary + emp.house_rent + emp.medical_allowance + emp.transport_allowance + emp.other_allowance;

        // Accurate calculation based on month days
        let tempDate = new Date(from);
        let totalEarned = 0;
        let actualDays = 0;
        let payableDays = 0;
        // Fixed 30 Days Rate Calculation
        const dailyRate = monthlySalary / 30;

        // Loop to count days
        while (tempDate <= to) {
            actualDays++;
            // User Condition: 31st day is "free" (not payable).
            // Logic: Pay for max 30 days per month. Ignore day 31.
            if (tempDate.getDate() !== 31) {
                payableDays++;
                totalEarned += dailyRate;
            }
            tempDate.setDate(tempDate.getDate() + 1);
        }

        totalEarned = Math.round(totalEarned);
        const amountPaid = slipAmountPaid || 0;
        const remaining = totalEarned - amountPaid;

        return {
            emp,
            totalDays: actualDays,
            payableDays, // Export payable days for UI
            monthlySalary,
            dailyRate: Math.round(dailyRate),
            totalEarned,
            amountPaid,
            remaining
        };
    };

    const handleGenerateSlip = async () => {
        const calc = getSlipCalculation();
        if (!calc || !profile) { alert('Please fill all fields'); return; }

        // ── Fetch attendance data for the selected period ──────────────────
        let leavesCount = 0;
        let absentCount = 0;
        try {
            const monthStr = slipFromDate.slice(0, 7); // YYYY-MM
            const [atts, allLeaves] = await Promise.all([
                api.hrAttendance.getAll(monthStr, slipEmployeeId),
                api.hrLeaves.getAll('Approved')
            ]);
            const empLeaves = allLeaves.filter((l: any) => l.employee_id === slipEmployeeId);
            const from = new Date(slipFromDate);
            const to = new Date(slipToDate);
            let cur = new Date(from);
            while (cur <= to) {
                const dStr = cur.toISOString().split('T')[0];
                const dayNum = cur.getDate();
                const dow = cur.getDay();
                if (dayNum !== 31 && dow !== 0) {
                    const isPresent = atts.some((a: any) => a.date === dStr && a.status === 'Present');
                    const isLeave = empLeaves.some((l: any) => new Date(l.from_date) <= cur && new Date(l.to_date) >= cur);
                    if (isLeave) { leavesCount++; }
                    else if (!isPresent) { absentCount++; }
                }
                cur.setDate(cur.getDate() + 1);
            }
        } catch (e) { console.warn('Could not fetch attendance for slip:', e); }

        const record = {
            id: '', employee_id: slipEmployeeId, employee_name: calc.emp.employee_name,
            designation: calc.emp.designation, department: calc.emp.department,
            salary_month: `${slipFromDate} to ${slipToDate}`,
            total_days_in_month: 30,
            days_worked: calc.payableDays,
            leaves_count: leavesCount,
            absent_count: absentCount,
            basic_salary: calc.emp.basic_salary, house_rent: calc.emp.house_rent,
            medical_allowance: calc.emp.medical_allowance, transport_allowance: calc.emp.transport_allowance,
            other_allowance: calc.emp.other_allowance, overtime_hours: 0, overtime_rate: 0,
            deductions: calc.amountPaid, advance_deduction: 0, loan_deduction: 0,
            tax_deduction: 0, other_deduction: 0, bonus: 0,
            gross_salary: calc.totalEarned, net_salary: calc.remaining,
            payment_date: new Date().toISOString().split('T')[0],
            payment_status: 'Pending' as const,
            remarks: `Amount Already Paid: Rs. ${calc.amountPaid.toLocaleString()} | Daily Rate: Rs. ${calc.dailyRate.toLocaleString()}/day`,
            company_id: '', created_at: ''
        };
        await generateSalarySlipPDF(record, calc.emp, profile);
    };


    const tabs: { key: TabType; label: string; icon: string }[] = [
        { key: 'employees', label: 'Employees', icon: '👥' },
        { key: 'salary', label: 'Generate Salary', icon: '💰' },
        { key: 'slip', label: 'Salary Slip', icon: '🧾' },
        { key: 'advances', label: 'Advances', icon: '💳' },
        { key: 'increments', label: 'Increments', icon: '📈' },
        { key: 'history', label: 'Salary History', icon: '📋' },
    ];

    const inputCls = "w-full px-4 py-3 rounded-xl border border-black/10 bg-black/5 text-black focus:bg-white focus:ring-4 focus:ring-black/5 font-bold uppercase text-xs outline-none transition-all";
    const labelCls = "text-[9px] uppercase font-black text-black block mb-1 tracking-wider";

    return (
        <div className="flex flex-col min-h-screen bg-transparent relative">
            <Header title="Payroll Management" />
            <div className="fixed inset-0 bg-gray-50 -z-10"></div>
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] -z-10"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] -z-10"></div>

            <div className="p-3 md:p-8 max-w-7xl mx-auto w-full flex-grow">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                    {[
                        { label: 'Total Employees', value: employees.filter(e => e.status === 'Active').length, color: 'bg-emerald-500', icon: '👥' },
                        { label: 'Monthly Payroll', value: fmt(salaryRecords.filter(r => r.salary_month === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).reduce((s, r) => s + r.net_salary, 0)), color: 'bg-blue-500', icon: '💰' },
                        { label: 'Pending Advances', value: fmt(advances.filter(a => !a.deducted).reduce((s, a) => s + a.amount, 0)), color: 'bg-amber-500', icon: '💳' },
                        { label: 'This Month Slips', value: salaryRecords.filter(r => r.salary_month === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).length, color: 'bg-purple-500', icon: '📄' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-black/5 shadow-lg hover:shadow-xl transition-all group">
                            <div className="flex items-center gap-3">
                                <div className={`${s.color} w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-lg`}>{s.icon}</div>
                                <div>
                                    <p className="text-[9px] uppercase font-black text-black/40 tracking-widest">{s.label}</p>
                                    <p className="text-lg font-black text-black">{s.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* PAY DAY ALERT */}
                {isPayDay && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg flex items-center justify-between text-white animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">💰</div>
                            <div>
                                <h3 className="font-black text-lg">It's Pay Day!</h3>
                                <p className="text-white/80 text-sm">Today is the 1st of the month. Don't forget to generate salaries.</p>
                            </div>
                        </div>
                        <button onClick={() => { setActiveTab('salary'); setShowModal(true); setModalType('salary'); }} className="px-6 py-2 bg-white text-emerald-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-50 transition-colors">
                            Generate Now
                        </button>
                    </div>
                )}

                {/* Tabs & Global Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex gap-1 bg-white/60 dark:bg-black/20 backdrop-blur-xl rounded-2xl p-1.5 border border-black/5 dark:border-white/5 shadow-sm overflow-x-auto w-full sm:w-auto">
                        {tabs.map(t => (
                            <button key={t.key} onClick={() => setActiveTab(t.key)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === t.key ? 'bg-primary text-primary-foreground shadow-lg' : 'text-foreground/60 hover:bg-black/5 dark:hover:bg-white/5'}`}>
                                <span>{t.icon}</span>{t.label}
                            </button>
                        ))}
                    </div>

                    {canEdit && (
                        <button onClick={openAddEmployee} className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30 whitespace-nowrap flex items-center justify-center gap-2">
                            <span>➕</span> Add New Employee
                        </button>
                    )}
                </div>

                {/* EMPLOYEES TAB */}
                {activeTab === 'employees' && (
                    <Card className="bg-white/70 backdrop-blur-2xl border border-black/10 shadow-2xl p-6 rounded-3xl">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tight">Employee Register</h2>
                            <div className="flex gap-3 w-full md:w-auto">
                                <input type="text" placeholder="Search employees..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    className="flex-1 md:w-64 px-4 py-2.5 rounded-xl border border-black/10 bg-black/5 text-xs font-bold outline-none focus:ring-2 focus:ring-black/10" />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[900px]">
                                <thead>
                                    <tr className="bg-black/5 text-[9px] font-black uppercase tracking-widest text-black/60">
                                        <th className="p-3 text-left rounded-l-xl">#</th>
                                        <th className="p-3 text-left">Name</th>
                                        <th className="p-3 text-left">Designation</th>
                                        <th className="p-3 text-left">Joining</th>
                                        <th className="p-3 text-right">Basic Salary</th>
                                        <th className="p-3 text-right">Total Package</th>
                                        <th className="p-3 text-center">Advance</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3 text-center rounded-r-xl">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {filteredEmployees.map((emp, i) => (
                                        <tr key={emp.id} className="hover:bg-black/[0.02] transition-colors group">
                                            <td className="p-3 font-black text-black/30">{i + 1}</td>
                                            <td className="p-3">
                                                <div className="font-black text-black">{emp.employee_name}</div>
                                                <div className="text-[9px] text-black/60 font-bold tracking-widest uppercase">{emp.employee_id_str || 'EMP-XXX'} • {emp.department}</div>
                                            </td>
                                            <td className="p-3 font-bold">{emp.designation}</td>
                                            <td className="p-3">{fmtDate(emp.joining_date)}</td>
                                            <td className="p-3 text-right font-black">{fmt(emp.basic_salary)}</td>
                                            <td className="p-3 text-right font-black text-emerald-600">
                                                {fmt(emp.basic_salary + emp.house_rent + emp.medical_allowance + emp.transport_allowance + emp.other_allowance)}
                                            </td>
                                            <td className="p-3 text-center">
                                                {getEmployeePendingAdvances(emp.id) > 0 && (
                                                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black">
                                                        {fmt(getEmployeePendingAdvances(emp.id))}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {emp.status}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    {canEdit ? (
                                                        <>
                                                            <button onClick={() => openAddSalary(emp)} title="Generate Salary" className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors">💰</button>
                                                            <button onClick={() => openAddAdvance(emp)} title="Add Advance" className="p-2 hover:bg-amber-50 rounded-lg text-amber-600 transition-colors">💳</button>
                                                            <button onClick={() => openAddIncrement(emp)} title="Increment" className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors">📈</button>
                                                            <button onClick={() => openEditEmployee(emp)} title="Edit" className="p-2 hover:bg-black/5 rounded-lg transition-colors">✏️</button>
                                                            <button onClick={() => deleteEmployee(emp.id)} title="Delete" className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors">🗑️</button>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400">View Only</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredEmployees.length === 0 && (
                                <div className="text-center py-16 text-black/30">
                                    <div className="text-5xl mb-4">👥</div>
                                    <p className="font-black uppercase tracking-widest text-sm">No Employees Found</p>
                                    <p className="text-xs mt-1">Add your first employee to get started</p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* SALARY TAB */}
                {activeTab === 'salary' && (
                    <Card className="bg-white/70 backdrop-blur-2xl border border-black/10 shadow-2xl p-6 rounded-3xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tight">Monthly Salary Records</h2>
                            <button onClick={() => openAddSalary()} className="px-6 py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-600 transition-colors shadow-lg">
                                + Generate Salary
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[800px]">
                                <thead>
                                    <tr className="bg-black/5 text-[9px] font-black uppercase tracking-widest text-black/60">
                                        <th className="p-3 text-left rounded-l-xl">Employee</th>
                                        <th className="p-3 text-left">Month</th>
                                        <th className="p-3 text-center">Days</th>
                                        <th className="p-3 text-right">Gross</th>
                                        <th className="p-3 text-right">Deductions</th>
                                        <th className="p-3 text-right">Net Salary</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3 text-center rounded-r-xl">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {salaryRecords.slice(0, 50).map(r => (
                                        <tr key={r.id} className="hover:bg-black/[0.02]">
                                            <td className="p-3 font-black">{r.employee_name || '-'}</td>
                                            <td className="p-3 font-bold">{r.salary_month}</td>
                                            <td className="p-3 text-center">{r.days_worked}/{r.total_days_in_month}</td>
                                            <td className="p-3 text-right font-bold">{fmt(r.gross_salary)}</td>
                                            <td className="p-3 text-right font-bold text-red-500">
                                                {fmt((r.deductions || 0) + (r.advance_deduction || 0) + (r.loan_deduction || 0) + (r.tax_deduction || 0) + (r.other_deduction || 0))}
                                            </td>
                                            <td className="p-3 text-right font-black text-emerald-600">{fmt(r.net_salary)}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 text-[9px] font-black rounded-lg ${r.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {r.payment_status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => downloadSlip(r)} title="Download Slip" className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors">📄</button>
                                                    <button onClick={() => deleteSalaryRecord(r.id)} title="Delete" className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* SALARY SLIP GENERATOR TAB */}
                {activeTab === 'slip' && (
                    <Card className="bg-white/70 backdrop-blur-2xl border border-black/10 shadow-2xl p-6 rounded-3xl">
                        <h2 className="text-xl font-black uppercase tracking-tight mb-6">🧾 Salary Slip Generator</h2>
                        <p className="text-xs text-black/50 mb-6">Select employee, date range, and enter amount already paid to calculate remaining salary</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-5 bg-black/[0.02] rounded-2xl border border-black/5">
                            <div className="lg:col-span-2">
                                <label className={labelCls}>Employee *</label>
                                <select className={inputCls} value={slipEmployeeId} onChange={e => {
                                    setSlipEmployeeId(e.target.value);
                                    setSlipGenerated(false);
                                    const emp = employees.find(x => x.id === e.target.value);
                                    if (emp?.joining_date) setSlipFromDate(emp.joining_date);
                                }}>
                                    <option value="">Select Employee</option>
                                    {employees.filter(e => e.status === 'Active').map(e => (
                                        <option key={e.id} value={e.id}>{e.employee_name} - {e.designation} ({fmt(e.basic_salary + e.house_rent + e.medical_allowance + e.transport_allowance + e.other_allowance)})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>From Date *</label>
                                <input type="date" className={inputCls} value={slipFromDate} onChange={e => { setSlipFromDate(e.target.value); setSlipGenerated(false); }} />
                            </div>
                            <div>
                                <label className={labelCls}>To Date *</label>
                                <input type="date" className={inputCls} value={slipToDate} onChange={e => { setSlipToDate(e.target.value); setSlipGenerated(false); }} />
                            </div>
                        </div>

                        <div className="p-5 bg-black/[0.02] rounded-2xl border border-black/5 mb-6">
                            <label className={labelCls}>Amount Already Paid (Rs.) *</label>
                            <input type="number" className={`${inputCls} text-lg`} value={slipAmountPaid || ''} onChange={e => { setSlipAmountPaid(+e.target.value); setSlipGenerated(false); }} placeholder="ENTER TOTAL AMOUNT PAID SO FAR" />
                        </div>

                        {(() => {
                            const calc = getSlipCalculation();
                            if (!calc) return (
                                <div className="text-center py-16 text-black/30">
                                    <div className="text-5xl mb-4">🧾</div>
                                    <p className="font-black uppercase tracking-widest text-sm">Select Employee & Date Range</p>
                                    <p className="text-xs mt-1">Fill all fields above to see salary calculation</p>
                                </div>
                            );
                            return (
                                <div className="space-y-4">
                                    {/* Employee Info Bar */}
                                    <div className="flex flex-wrap items-center gap-3 p-4 bg-gradient-to-r from-black to-gray-800 rounded-2xl text-white">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">👤</div>
                                        <div className="flex-1">
                                            <p className="font-black text-lg">{calc.emp.employee_name}</p>
                                            <p className="text-[10px] text-white/60 uppercase tracking-wider">{calc.emp.designation} • {calc.emp.department}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] uppercase tracking-wider text-white/50">Monthly Salary</p>
                                            <p className="font-black text-lg">{fmt(calc.monthlySalary)}</p>
                                        </div>
                                    </div>

                                    {/* Calculation Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                                            <p className="text-[9px] uppercase font-black text-blue-400 tracking-widest">Total Days</p>
                                            <p className="text-3xl font-black text-blue-600 mt-1">{calc.payableDays}</p>
                                            <p className="text-[9px] text-blue-400 mt-1">Payable Days (Act: {calc.totalDays})</p>
                                        </div>
                                        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-center">
                                            <p className="text-[9px] uppercase font-black text-purple-400 tracking-widest">Daily Rate</p>
                                            <p className="text-2xl font-black text-purple-600 mt-1">{fmt(calc.dailyRate)}</p>
                                            <p className="text-[9px] text-purple-400 mt-1">Fixed Rate</p>
                                        </div>
                                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                                            <p className="text-[9px] uppercase font-black text-emerald-400 tracking-widest">Total Earned</p>
                                            <p className="text-2xl font-black text-emerald-600 mt-1">{fmt(calc.totalEarned)}</p>
                                            <p className="text-[9px] text-emerald-400 mt-1">{calc.payableDays} days × {fmt(calc.dailyRate)} (30d base)</p>
                                        </div>
                                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                                            <p className="text-[9px] uppercase font-black text-amber-400 tracking-widest">Already Paid</p>
                                            <p className="text-2xl font-black text-amber-600 mt-1">{fmt(calc.amountPaid)}</p>
                                            <p className="text-[9px] text-amber-400 mt-1">Paid in advance</p>
                                        </div>
                                    </div>

                                    {/* Final Result */}
                                    <div className={`rounded-2xl p-6 text-center border-2 ${calc.remaining >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-black/40 mb-2">
                                            {calc.remaining >= 0 ? '✅ REMAINING SALARY PAYABLE' : '⚠️ OVERPAID AMOUNT'}
                                        </p>
                                        <p className={`text-4xl font-black ${calc.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {fmt(Math.abs(calc.remaining))}
                                        </p>
                                        <p className="text-xs text-black/40 mt-2 font-bold">
                                            {fmt(calc.totalEarned)} (earned) − {fmt(calc.amountPaid)} (paid) = {fmt(calc.remaining)}
                                        </p>
                                    </div>

                                    {/* Breakdown Table */}
                                    <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
                                        <div className="p-3 bg-black/5 text-[9px] font-black uppercase tracking-widest text-black/50">📊 Detailed Breakdown</div>
                                        <table className="w-full text-xs">
                                            <tbody className="divide-y divide-black/5">
                                                <tr className="hover:bg-black/[0.02]"><td className="p-3 text-black/50">Employee Name</td><td className="p-3 text-right font-black">{calc.emp.employee_name}</td></tr>
                                                <tr className="hover:bg-black/[0.02]"><td className="p-3 text-black/50">Joining Date</td><td className="p-3 text-right font-black">{fmtDate(calc.emp.joining_date)}</td></tr>
                                                <tr className="hover:bg-black/[0.02]"><td className="p-3 text-black/50">Period</td><td className="p-3 text-right font-black">{fmtDate(slipFromDate)} → {fmtDate(slipToDate)}</td></tr>
                                                <tr className="hover:bg-black/[0.02]"><td className="p-3 text-black/50">Payable Days (Excl. 31st)</td><td className="p-3 text-right font-black text-blue-600">{calc.payableDays} Days</td></tr>
                                                <tr className="hover:bg-black/[0.02]"><td className="p-3 text-black/50">Monthly Salary</td><td className="p-3 text-right font-black">{fmt(calc.monthlySalary)}</td></tr>
                                                <tr className="hover:bg-black/[0.02]"><td className="p-3 text-black/50">Daily Rate (30 Days)</td><td className="p-3 text-right font-black text-purple-600">{fmt(calc.dailyRate)}</td></tr>
                                                <tr className="hover:bg-black/[0.02]"><td className="p-3 text-black/50 font-bold">Total Salary Earned</td><td className="p-3 text-right font-black text-emerald-600 text-sm">{fmt(calc.totalEarned)}</td></tr>
                                                <tr className="hover:bg-black/[0.02] bg-amber-50"><td className="p-3 text-black/50 font-bold">Amount Already Paid (−)</td><td className="p-3 text-right font-black text-amber-600 text-sm">{fmt(calc.amountPaid)}</td></tr>
                                                <tr className={`${calc.remaining >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}><td className="p-3 font-black text-sm">REMAINING BALANCE</td><td className={`p-3 text-right font-black text-lg ${calc.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(calc.remaining)}</td></tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Download Button */}
                                    <button onClick={handleGenerateSlip}
                                        className="w-full py-4 bg-black text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl hover:shadow-2xl active:scale-[0.98]">
                                        📄 Download Salary Slip PDF
                                    </button>
                                </div>
                            );
                        })()}
                    </Card>
                )}

                {activeTab === 'advances' && (
                    <Card className="bg-white/70 backdrop-blur-2xl border border-black/10 shadow-2xl p-6 rounded-3xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tight">Employee Advances</h2>
                            <button onClick={() => openAddAdvance()} className="px-6 py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-600 transition-colors shadow-lg">
                                + Add Advance
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-black/5 text-[9px] font-black uppercase tracking-widest text-black/60">
                                        <th className="p-3 text-left rounded-l-xl">Employee</th>
                                        <th className="p-3 text-left">Date</th>
                                        <th className="p-3 text-right">Amount</th>
                                        <th className="p-3 text-left">Reason</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3 text-center rounded-r-xl">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {advances.map(a => (
                                        <tr key={a.id} className="hover:bg-black/[0.02]">
                                            <td className="p-3 font-black">{a.employee_name || '-'}</td>
                                            <td className="p-3">{fmtDate(a.date)}</td>
                                            <td className="p-3 text-right font-black text-amber-600">{fmt(a.amount)}</td>
                                            <td className="p-3">{a.reason}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 text-[9px] font-black rounded-lg ${a.deducted ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {a.deducted ? 'Deducted' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => deleteAdvance(a.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600">🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* INCREMENTS TAB */}
                {activeTab === 'increments' && (
                    <Card className="bg-white/70 backdrop-blur-2xl border border-black/10 shadow-2xl p-6 rounded-3xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tight">Salary Increments</h2>
                            <button onClick={() => openAddIncrement()} className="px-6 py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-lg">
                                + Add Increment
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-black/5 text-[9px] font-black uppercase tracking-widest text-black/60">
                                        <th className="p-3 text-left rounded-l-xl">Employee</th>
                                        <th className="p-3 text-left">Effective Date</th>
                                        <th className="p-3 text-right">Previous</th>
                                        <th className="p-3 text-right">Increment</th>
                                        <th className="p-3 text-right">New Salary</th>
                                        <th className="p-3 text-left rounded-r-xl">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {increments.map(inc => (
                                        <tr key={inc.id} className="hover:bg-black/[0.02]">
                                            <td className="p-3 font-black">{inc.employee_name || '-'}</td>
                                            <td className="p-3">{fmtDate(inc.effective_date)}</td>
                                            <td className="p-3 text-right">{fmt(inc.previous_salary)}</td>
                                            <td className="p-3 text-right font-black text-emerald-600">+{fmt(inc.increment_amount)}</td>
                                            <td className="p-3 text-right font-black text-blue-600">{fmt(inc.new_salary)}</td>
                                            <td className="p-3">{inc.reason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <Card className="bg-white/70 backdrop-blur-2xl border border-black/10 shadow-2xl p-6 rounded-3xl">
                        <h2 className="text-xl font-black uppercase tracking-tight mb-6">Salary History</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-black/[0.02] rounded-2xl border border-black/5">
                            <div>
                                <label className={labelCls}>Employee</label>
                                <select className={inputCls} value={historyEmployeeId} onChange={e => setHistoryEmployeeId(e.target.value)}>
                                    <option value="">All Employees</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.employee_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>From Month</label>
                                <input type="month" className={inputCls} value={historyFrom} onChange={e => setHistoryFrom(e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>To Month</label>
                                <input type="month" className={inputCls} value={historyTo} onChange={e => setHistoryTo(e.target.value)} />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs min-w-[700px]">
                                <thead>
                                    <tr className="bg-black/5 text-[9px] font-black uppercase tracking-widest text-black/60">
                                        <th className="p-3 text-left rounded-l-xl">Employee</th>
                                        <th className="p-3 text-left">Month</th>
                                        <th className="p-3 text-center">Days Worked</th>
                                        <th className="p-3 text-right">Gross</th>
                                        <th className="p-3 text-right">Net</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3 text-center rounded-r-xl">Slip</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {getHistoryRecords().map(r => (
                                        <tr key={r.id} className="hover:bg-black/[0.02]">
                                            <td className="p-3 font-black">{r.employee_name}</td>
                                            <td className="p-3">{r.salary_month}</td>
                                            <td className="p-3 text-center">{r.days_worked}/{r.total_days_in_month}</td>
                                            <td className="p-3 text-right font-bold">{fmt(r.gross_salary)}</td>
                                            <td className="p-3 text-right font-black text-emerald-600">{fmt(r.net_salary)}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 text-[9px] font-black rounded-lg ${r.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {r.payment_status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => downloadSlip(r)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600">📄</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* MODALS */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-black/5">
                            <h3 className="text-lg font-black uppercase tracking-tight">
                                {modalType === 'employee' && (editingEmployee ? 'Edit Employee' : 'Add New Employee')}
                                {modalType === 'salary' && 'Generate Monthly Salary'}
                                {modalType === 'advance' && 'Add Advance'}
                                {modalType === 'increment' && 'Salary Increment'}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* EMPLOYEE FORM */}
                            {modalType === 'employee' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className={labelCls}>Employee Name *</label><input className={inputCls} value={empForm.employee_name} onChange={e => setEmpForm({ ...empForm, employee_name: e.target.value })} placeholder="FULL NAME" /></div>
                                        <div><label className={labelCls}>Father Name</label><input className={inputCls} value={empForm.father_name} onChange={e => setEmpForm({ ...empForm, father_name: e.target.value })} placeholder="FATHER NAME" /></div>
                                        <div><label className={labelCls}>Designation</label><input className={inputCls} value={empForm.designation} onChange={e => setEmpForm({ ...empForm, designation: e.target.value })} placeholder="SITE ENGINEER" /></div>
                                        <div><label className={labelCls}>Department</label><input className={inputCls} value={empForm.department} onChange={e => setEmpForm({ ...empForm, department: e.target.value })} placeholder="ENGINEERING" /></div>
                                        <div><label className={labelCls}>CNIC</label><input className={inputCls} value={empForm.cnic} onChange={e => setEmpForm({ ...empForm, cnic: e.target.value })} placeholder="00000-0000000-0" /></div>
                                        <div><label className={labelCls}>Contact</label><input className={inputCls} value={empForm.contact} onChange={e => setEmpForm({ ...empForm, contact: e.target.value })} placeholder="03XXXXXXXXX" /></div>
                                        <div><label className={labelCls}>Joining Date</label><input type="date" className={inputCls} value={empForm.joining_date} onChange={e => setEmpForm({ ...empForm, joining_date: e.target.value })} /></div>
                                        <div><label className={labelCls}>Status</label>
                                            <select className={inputCls} value={empForm.status} onChange={e => setEmpForm({ ...empForm, status: e.target.value as any })}>
                                                <option>Active</option><option>Inactive</option><option>Terminated</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="border-t border-black/5 pt-4 mt-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-3">💰 Salary Breakdown</p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div><label className={labelCls}>Basic Salary</label><input type="number" className={inputCls} value={empForm.basic_salary || ''} onChange={e => setEmpForm({ ...empForm, basic_salary: +e.target.value })} /></div>
                                            <div><label className={labelCls}>House Rent</label><input type="number" className={inputCls} value={empForm.house_rent || ''} onChange={e => setEmpForm({ ...empForm, house_rent: +e.target.value })} /></div>
                                            <div><label className={labelCls}>Medical Allowance</label><input type="number" className={inputCls} value={empForm.medical_allowance || ''} onChange={e => setEmpForm({ ...empForm, medical_allowance: +e.target.value })} /></div>
                                            <div><label className={labelCls}>Transport Allowance</label><input type="number" className={inputCls} value={empForm.transport_allowance || ''} onChange={e => setEmpForm({ ...empForm, transport_allowance: +e.target.value })} /></div>
                                            <div><label className={labelCls}>Other Allowance</label><input type="number" className={inputCls} value={empForm.other_allowance || ''} onChange={e => setEmpForm({ ...empForm, other_allowance: +e.target.value })} /></div>
                                        </div>
                                    </div>
                                    <div className="border-t border-black/5 pt-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-3">🏦 Bank Details</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className={labelCls}>Bank Name</label><input className={inputCls} value={empForm.bank_name} onChange={e => setEmpForm({ ...empForm, bank_name: e.target.value })} placeholder="HBL, MEEZAN" /></div>
                                            <div><label className={labelCls}>Account Number</label><input className={inputCls} value={empForm.bank_account_no} onChange={e => setEmpForm({ ...empForm, bank_account_no: e.target.value })} placeholder="IBAN / ACCOUNT NO" /></div>
                                        </div>
                                    </div>
                                    <div className="bg-black/5 rounded-2xl p-4 text-center">
                                        <p className="text-xs font-black text-black/50">Total Monthly Package</p>
                                        <p className="text-2xl font-black text-emerald-600">{fmt((empForm.basic_salary || 0) + (empForm.house_rent || 0) + (empForm.medical_allowance || 0) + (empForm.transport_allowance || 0) + (empForm.other_allowance || 0))}</p>
                                    </div>
                                    <div className="flex gap-3 justify-end mt-6">
                                        <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl border border-black/10 text-xs font-black uppercase tracking-wider hover:bg-black/5 transition-colors">Cancel</button>
                                        <button onClick={saveEmployee} disabled={loading} className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
                                            {loading ? 'Saving...' : (editingEmployee ? 'Update Employee' : 'Save Employee')}
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* SALARY FORM */}
                            {modalType === 'salary' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2"><label className={labelCls}>Employee *</label>
                                            <select className={inputCls} value={salaryForm.employee_id} onChange={e => {
                                                const emp = employees.find(x => x.id === e.target.value);
                                                setSalaryForm({
                                                    ...salaryForm, employee_id: e.target.value,
                                                    basic_salary: emp?.basic_salary || 0, house_rent: emp?.house_rent || 0,
                                                    medical_allowance: emp?.medical_allowance || 0,
                                                    transport_allowance: emp?.transport_allowance || 0,
                                                    other_allowance: emp?.other_allowance || 0
                                                });
                                            }}>
                                                <option value="">Select Employee</option>
                                                {employees.filter(e => e.status === 'Active').map(e => <option key={e.id} value={e.id}>{e.employee_name} - {e.designation}</option>)}
                                            </select>
                                        </div>
                                        <div><label className={labelCls}>Salary Month</label><input type="month" className={inputCls} value={salaryForm.salary_month} onChange={e => {
                                            const m = e.target.value;
                                            let days = 30;
                                            if (m) {
                                                const [y, mon] = m.split('-').map(Number);
                                                days = new Date(y, mon, 0).getDate();
                                            }
                                            setSalaryForm({ ...salaryForm, salary_month: m, total_days_in_month: days });
                                        }} /></div>
                                        <div><label className={labelCls}>Payment Date</label><input type="date" className={inputCls} value={salaryForm.payment_date} onChange={e => setSalaryForm({ ...salaryForm, payment_date: e.target.value })} /></div>
                                        <div><label className={labelCls}>Total Days in Month</label><input type="number" className={inputCls} value={salaryForm.total_days_in_month} onChange={e => setSalaryForm({ ...salaryForm, total_days_in_month: +e.target.value })} /></div>
                                        <div><label className={labelCls}>Days Worked (Payable)</label><input type="number" className={inputCls} value={salaryForm.days_worked} onChange={e => setSalaryForm({ ...salaryForm, days_worked: +e.target.value })} /></div>
                                    </div>

                                    {/* Attendance Summary Banner */}
                                    {(salaryForm as any).leaves_count !== undefined && (
                                        <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="text-center">
                                                <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">✅ Present</p>
                                                <p className="text-xl font-black text-emerald-600">{salaryForm.days_worked - ((salaryForm as any).leaves_count || 0)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">📋 Leaves</p>
                                                <p className="text-xl font-black text-blue-600">{(salaryForm as any).leaves_count || 0}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">❌ Absent</p>
                                                <p className="text-xl font-black text-red-600">{(salaryForm as any).absent_count || 0}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">🗓 Payable</p>
                                                <p className="text-xl font-black text-slate-800">{salaryForm.days_worked}/{salaryForm.total_days_in_month}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="border-t border-black/5 pt-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3">💰 Earnings</p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            <div><label className={labelCls}>Basic Salary</label><input type="number" className={inputCls} value={salaryForm.basic_salary || ''} onChange={e => setSalaryForm({ ...salaryForm, basic_salary: +e.target.value })} /></div>
                                            <div><label className={labelCls}>House Rent</label><input type="number" className={inputCls} value={salaryForm.house_rent || ''} onChange={e => setSalaryForm({ ...salaryForm, house_rent: +e.target.value })} /></div>
                                            <div><label className={labelCls}>Medical</label><input type="number" className={inputCls} value={salaryForm.medical_allowance || ''} onChange={e => setSalaryForm({ ...salaryForm, medical_allowance: +e.target.value })} /></div>
                                            <div><label className={labelCls}>Transport</label><input type="number" className={inputCls} value={salaryForm.transport_allowance || ''} onChange={e => setSalaryForm({ ...salaryForm, transport_allowance: +e.target.value })} /></div>
                                            <div><label className={labelCls}>Other</label><input type="number" className={inputCls} value={salaryForm.other_allowance || ''} onChange={e => setSalaryForm({ ...salaryForm, other_allowance: +e.target.value })} /></div>
                                            <div><label className={labelCls}>Bonus</label><input type="number" className={inputCls} value={salaryForm.bonus || ''} onChange={e => setSalaryForm({ ...salaryForm, bonus: +e.target.value })} /></div>
                                        </div>
                                    </div>
                                    <div className="border-t border-black/5 pt-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-3">➖ Deductions</p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            <div><label className={labelCls}>Advance Deduction</label><input type="number" className={inputCls} value={salaryForm.advance_deduction || ''} onChange={e => setSalaryForm({ ...salaryForm, advance_deduction: +e.target.value })} /></div>
                                            <div><label className={labelCls}>Loan Deduction</label><input type="number" className={inputCls} value={salaryForm.loan_deduction || ''} onChange={e => setSalaryForm({ ...salaryForm, loan_deduction: +e.target.value })} /></div>
                                            <div><label className={labelCls}>Tax</label><input type="number" className={inputCls} value={salaryForm.tax_deduction || ''} onChange={e => setSalaryForm({ ...salaryForm, tax_deduction: +e.target.value })} /></div>
                                            <div><label className={labelCls}>Other Deduction</label><input type="number" className={inputCls} value={salaryForm.other_deduction || ''} onChange={e => setSalaryForm({ ...salaryForm, other_deduction: +e.target.value })} /></div>
                                        </div>
                                    </div>
                                    <div><label className={labelCls}>Payment Status</label>
                                        <select className={inputCls} value={salaryForm.payment_status} onChange={e => setSalaryForm({ ...salaryForm, payment_status: e.target.value as any })}>
                                            <option>Pending</option><option>Paid</option><option>Partial</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-3 justify-end mt-6 col-span-2">
                                        <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl border border-black/10 text-xs font-black uppercase tracking-wider hover:bg-black/5 transition-colors">Cancel</button>
                                        <button onClick={saveSalary} disabled={loading} className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
                                            {loading ? 'Saving...' : 'Save Salary Record'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* ADVANCE FORM */}
                            {modalType === 'advance' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className={labelCls}>Select Employee *</label>
                                            <select className={inputCls} value={advanceForm.employee_id} onChange={e => setAdvanceForm({ ...advanceForm, employee_id: e.target.value })}>
                                                <option value="">Select Employee</option>
                                                {employees.map(e => <option key={e.id} value={e.id}>{e.employee_name}</option>)}
                                            </select>
                                        </div>
                                        <div><label className={labelCls}>Advance Amount *</label><input type="number" className={inputCls} value={advanceForm.amount} onChange={e => setAdvanceForm({ ...advanceForm, amount: +e.target.value })} /></div>
                                        <div><label className={labelCls}>Date *</label><input type="date" className={inputCls} value={advanceForm.date} onChange={e => setAdvanceForm({ ...advanceForm, date: e.target.value })} /></div>
                                        <div className="md:col-span-2"><label className={labelCls}>Reason / Remarks</label><textarea className={inputCls} rows={3} value={advanceForm.reason} onChange={e => setAdvanceForm({ ...advanceForm, reason: e.target.value })} /></div>
                                    </div>
                                    <div className="flex gap-3 justify-end mt-6">
                                        <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl border border-black/10 text-xs font-black uppercase tracking-wider hover:bg-black/5 transition-colors">Cancel</button>
                                        <button onClick={saveAdvance} disabled={loading} className="px-8 py-3 bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200">
                                            {loading ? 'Saving...' : 'Save Advance'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* INCREMENT FORM */}
                            {modalType === 'increment' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className={labelCls}>Select Employee *</label>
                                            <select className={inputCls} value={incrementForm.employee_id} onChange={e => {
                                                const emp = employees.find(x => x.id === e.target.value);
                                                setIncrementForm({
                                                    ...incrementForm, employee_id: e.target.value,
                                                    previous_salary: emp?.basic_salary || 0
                                                });
                                            }}>
                                                <option value="">Select Employee</option>
                                                {employees.map(e => <option key={e.id} value={e.id}>{e.employee_name}</option>)}
                                            </select>
                                        </div>
                                        <div><label className={labelCls}>Previous Basic Salary</label><input type="number" disabled className={`${inputCls} bg-black/5`} value={incrementForm.previous_salary} /></div>
                                        <div><label className={labelCls}>Increment Type</label>
                                            <select className={inputCls} value={incrementForm.increment_type} onChange={e => setIncrementForm({ ...incrementForm, increment_type: e.target.value as any })}>
                                                <option>Fixed</option><option>Percentage</option>
                                            </select>
                                        </div>
                                        <div><label className={labelCls}>Increment Amount / %</label><input type="number" className={inputCls} value={incrementForm.increment_amount} onChange={e => {
                                            const val = +e.target.value;
                                            const newSal = incrementForm.increment_type === 'Fixed'
                                                ? (incrementForm.previous_salary + val)
                                                : (incrementForm.previous_salary + (incrementForm.previous_salary * val / 100));
                                            setIncrementForm({ ...incrementForm, increment_amount: val, new_salary: newSal });
                                        }} />
                                        </div>
                                        <div><label className={labelCls}>New Basic Salary</label><input type="number" className={`${inputCls} font-black text-emerald-600`} value={incrementForm.new_salary} readOnly /></div>
                                        <div><label className={labelCls}>Effective Date</label><input type="date" className={inputCls} value={incrementForm.effective_date} onChange={e => setIncrementForm({ ...incrementForm, effective_date: e.target.value })} /></div>
                                        <div className="md:col-span-2"><label className={labelCls}>Reason</label><textarea className={inputCls} rows={2} value={incrementForm.reason} onChange={e => setIncrementForm({ ...incrementForm, reason: e.target.value })} /></div>
                                    </div>
                                    <div className="flex gap-3 justify-end mt-6">
                                        <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl border border-black/10 text-xs font-black uppercase tracking-wider hover:bg-black/5 transition-colors">Cancel</button>
                                        <button onClick={saveIncrement} disabled={loading} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                                            {loading ? 'Saving...' : 'Save Increment'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
