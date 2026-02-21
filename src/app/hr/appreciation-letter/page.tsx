'use client';
import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { generateAppreciationLetterPDF } from '@/utils/hrPdfGenerator';
import { api, CompanyProfile } from '@/lib/api';
import { DatePicker } from "@/components/ui/DatePicker";

export default function AppreciationLetterPage() {
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [formData, setFormData] = useState({
        employee_name: '',
        designation: '',
        letter_date: new Date().toISOString().split('T')[0],
        achievement: ''
    });

    useEffect(() => {
        api.profile.get().then(res => {
            if (res) setProfile(res);
        });
    }, []);

    const handleGenerate = async () => {
        if (!formData.employee_name || !formData.designation) {
            alert('Please fill all required fields');
            return;
        }

        try {
            await generateAppreciationLetterPDF(formData, profile);
        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    const handleSaveAndGenerate = async () => {
        if (!formData.employee_name || !formData.designation) {
            alert('Please fill all required fields');
            return;
        }

        try {
            const response = await fetch('/api/hr-appreciation-letters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                await generateAppreciationLetterPDF(formData, profile);
                alert('✅ Appreciation letter saved and PDF generated!');
                handleReset();
            } else {
                alert('Failed to save: ' + result.error);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save appreciation letter.');
        }
    };

    const handleReset = () => {
        setFormData({
            employee_name: '',
            designation: '',
            letter_date: new Date().toISOString().split('T')[0],
            achievement: ''
        });
    };

    return (
        <div className="p-4 lg:p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Appreciation Letter</h1>
                <p className="text-gray-500 mt-2">Generate professional appreciation letter for excellent work</p>
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
                            <DatePicker
                                label="Letter Date"
                                value={formData.letter_date}
                                onChange={(val) => setFormData({ ...formData, letter_date: val })}
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">Achievement Details</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Achievement Description (Optional)</label>
                            <textarea
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none min-h-[120px]"
                                value={formData.achievement}
                                onChange={(e) => setFormData({ ...formData, achievement: e.target.value })}
                                placeholder="Describe the specific achievement or excellent work performed by the employee. Leave blank for generic appreciation..."
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                If left blank, a standard appreciation message will be used.
                            </p>
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
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3"
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

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800">
                            <strong>✨ Note:</strong> The generated PDF will include an "EXCELLENT PERFORMANCE" badge and be on official company letterhead.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
