'use client';
import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { generateLeaveApplicationPDF } from '@/utils/hrPdfGenerator';
import { api, CompanyProfile } from '@/lib/api';

export default function LeaveApplicationPage() {
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [formData, setFormData] = useState({
        employee_name: '',
        designation: '',
        department: '',
        leave_type: 'Casual Leave',
        start_date: '',
        end_date: '',
        total_days: 1,
        reason: '',
        contact_number: '',
        contact_number_2: '',
        backup_person: '',
        application_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        api.profile.get().then(res => {
            if (res) setProfile(res);
        });
    }, []);

    useEffect(() => {
        // Calculate total days when dates change
        if (formData.start_date && formData.end_date) {
            const start = new Date(formData.start_date);
            const end = new Date(formData.end_date);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setFormData(prev => ({ ...prev, total_days: diffDays }));
        }
    }, [formData.start_date, formData.end_date]);

    const handleGenerate = async () => {
        if (!formData.employee_name || !formData.designation || !formData.start_date || !formData.end_date) {
            alert('Please fill all required fields');
            return;
        }

        try {
            await generateLeaveApplicationPDF(formData, profile);
        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    const handleSave = async () => {
        if (!formData.employee_name || !formData.designation || !formData.start_date || !formData.end_date) {
            alert('Please fill all required fields');
            return;
        }

        try {
            const response = await fetch('/api/hr-leave-applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ Leave application saved successfully!');
                handleReset();
            } else {
                alert('Failed to save: ' + result.error);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save leave application. Please try again.');
        }
    };

    const handleSaveAndGenerate = async () => {
        if (!formData.employee_name || !formData.designation || !formData.start_date || !formData.end_date) {
            alert('Please fill all required fields');
            return;
        }

        try {
            // Save first
            const response = await fetch('/api/hr-leave-applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                // Then generate PDF
                await generateLeaveApplicationPDF(formData, profile);
                alert('✅ Leave application saved and PDF generated!');
                handleReset();
            } else {
                alert('Failed to save: ' + result.error);
            }
        } catch (error) {
            console.error('Save and generate error:', error);
            alert('Failed to save and generate PDF. Please try again.');
        }
    };

    const handleReset = () => {
        setFormData({
            employee_name: '',
            designation: '',
            department: '',
            leave_type: 'Casual Leave',
            start_date: '',
            end_date: '',
            total_days: 1,
            reason: '',
            contact_number: '',
            contact_number_2: '',
            backup_person: '',
            application_date: new Date().toISOString().split('T')[0]
        });
    };

    return (
        <div className="p-4 lg:p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Leave Application</h1>
                <p className="text-gray-500 mt-2">Generate professional leave application on company letterhead</p>
            </div>

            <Card className="max-w-4xl">
                <div className="space-y-6">
                    {/* Employee Information */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">Employee Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Employee Name *"
                                value={formData.employee_name}
                                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                                placeholder="Full Name"
                                required
                            />
                            <Input
                                label="Designation *"
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                placeholder="e.g., Site Engineer"
                                required
                            />
                            <Input
                                label="Department"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                placeholder="e.g., Engineering"
                            />
                            <Input
                                label="Contact Number 1"
                                value={formData.contact_number}
                                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                                placeholder="Primary mobile number"
                            />
                            <Input
                                label="Contact Number 2 (Optional)"
                                value={formData.contact_number_2}
                                onChange={(e) => setFormData({ ...formData, contact_number_2: e.target.value })}
                                placeholder="Secondary mobile number"
                            />
                        </div>
                    </div>

                    {/* Leave Details */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">Leave Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type *</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={formData.leave_type}
                                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                                >
                                    <option value="Casual Leave">Casual Leave</option>
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Annual Leave">Annual Leave</option>
                                    <option value="Emergency Leave">Emergency Leave</option>
                                    <option value="Unpaid Leave">Unpaid Leave</option>
                                    <option value="Half Day Leave">Half Day Leave</option>
                                    <option value="Short Leave">Short Leave</option>
                                </select>
                            </div>
                            <DatePicker
                                label="Application Date"
                                value={formData.application_date}
                                onChange={(val) => setFormData({ ...formData, application_date: val })}
                            />
                            <DatePicker
                                label="Start Date *"
                                value={formData.start_date}
                                onChange={(val) => setFormData({ ...formData, start_date: val })}
                                required
                            />
                            <DatePicker
                                label="End Date *"
                                value={formData.end_date}
                                onChange={(val) => setFormData({ ...formData, end_date: val })}
                                required
                            />
                            <div className="md:col-span-2">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm font-bold text-blue-800">
                                        Total Days: <span className="text-2xl">{formData.total_days}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reason & Additional Info */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">Additional Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Leave *</label>
                                <textarea
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none min-h-[100px]"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Briefly explain the reason for your leave request..."
                                    required
                                />
                            </div>
                            <Input
                                label="Backup Person (Optional)"
                                value={formData.backup_person}
                                onChange={(e) => setFormData({ ...formData, backup_person: e.target.value })}
                                placeholder="Name of person covering your duties"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col md:flex-row gap-4 pt-4 border-t">
                        <Button
                            onClick={handleSave}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3"
                        >
                            💾 Save Document
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
                        >
                            📄 Generate PDF Only
                        </Button>
                        <Button
                            onClick={handleSaveAndGenerate}
                            className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3"
                        >
                            💾📄 Save & Generate PDF
                        </Button>
                        <Button
                            onClick={handleReset}
                            className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                        >
                            Reset
                        </Button>
                    </div>

                    {/* Info Box */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800">
                            <strong>Note:</strong> The generated PDF will be on official company letterhead with proper formatting.
                            It includes an approval section for management use.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
