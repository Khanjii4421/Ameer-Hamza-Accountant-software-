'use client';
import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { generateResignationLetterPDF } from '@/utils/hrPdfGenerator';
import { api, CompanyProfile } from '@/lib/api';

export default function ResignationLetterPage() {
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [formData, setFormData] = useState({
        employee_name: '',
        designation: '',
        employee_id: '',
        resignation_date: new Date().toISOString().split('T')[0],
        last_working_day: '',
        reason: '',
        contact_number: '',
        email: ''
    });

    useEffect(() => {
        api.profile.get().then(res => {
            if (res) setProfile(res);
        });
    }, []);

    const handleGenerate = async () => {
        if (!formData.employee_name || !formData.designation || !formData.last_working_day) {
            alert('Please fill all required fields');
            return;
        }

        try {
            await generateResignationLetterPDF(formData, profile);
        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    const handleSaveAndGenerate = async () => {
        if (!formData.employee_name || !formData.designation || !formData.last_working_day) {
            alert('Please fill all required fields');
            return;
        }

        try {
            const response = await fetch('/api/hr-resignation-letters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                await generateResignationLetterPDF(formData, profile);
                alert('✅ Resignation letter saved and PDF generated!');
                handleReset();
            } else {
                alert('Failed to save: ' + result.error);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save resignation letter.');
        }
    };

    const handleReset = () => {
        setFormData({
            employee_name: '',
            designation: '',
            employee_id: '',
            resignation_date: new Date().toISOString().split('T')[0],
            last_working_day: '',
            reason: '',
            contact_number: '',
            email: ''
        });
    };

    return (
        <div className="p-4 lg:p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Resignation Letter</h1>
                <p className="text-gray-500 mt-2">Generate professional resignation letter on company letterhead</p>
            </div>

            <Card className="max-w-4xl">
                <div className="space-y-6">
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
                                label="Employee ID"
                                value={formData.employee_id}
                                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                placeholder="Optional"
                            />
                            <Input
                                label="Contact Number"
                                value={formData.contact_number}
                                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                                placeholder="Mobile number"
                            />
                            <Input
                                label="Email Address"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="email@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">Resignation Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DatePicker
                                label="Resignation Date"
                                value={formData.resignation_date}
                                onChange={(val) => setFormData({ ...formData, resignation_date: val })}
                            />
                            <DatePicker
                                label="Last Working Day *"
                                value={formData.last_working_day}
                                onChange={(val) => setFormData({ ...formData, last_working_day: val })}
                                required
                            />
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Reason (Optional)</label>
                                <textarea
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none min-h-[100px]"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Optional: Brief reason for resignation..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 pt-4 border-t">
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

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800">
                            <strong>Note:</strong> The generated PDF will be on official company letterhead with professional formatting.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
