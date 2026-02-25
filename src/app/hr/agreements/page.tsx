'use client';
import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { api, CompanyProfile } from "@/lib/api";
import { generateAgreementPDF } from "@/utils/hrPdfGenerator";

export default function AgreementsPage() {
    const [loading, setLoading] = useState(false);
    const [uiLanguage, setUiLanguage] = useState<'en' | 'ur'>('ur');
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [agreements, setAgreements] = useState<any[]>([]);
    const [includeStamp, setIncludeStamp] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.profile.get();
                setProfile(res);
            } catch (error) {
                console.error("Failed to load profile", error);
            }
        };
        fetchProfile();
        loadAgreements();
    }, []);

    const loadAgreements = async () => {
        try {
            const data = await api.hrAgreements.getAll();
            setAgreements(data);
        } catch (error) {
            console.error("Failed to load agreements", error);
        }
    };

    const [formData, setFormData] = useState({
        title: '',
        party_one_name: '',
        party_one_details: '',
        sections: [
            { id: 1, heading: 'ورک سکوپ', items: [''] },
            { id: 2, heading: 'ادائیگی کی شرح', items: [''] },
            { id: 3, heading: 'ادائیگی کا طریقہ کار', items: [''] }
        ]
    });

    // Removed useEffect that was resetting headings on language change to allow manual editing

    const addSection = () => {
        const newId = formData.sections.length > 0 ? Math.max(...formData.sections.map(s => s.id)) + 1 : 1;
        setFormData(prev => ({
            ...prev,
            sections: [...prev.sections, { id: newId, heading: uiLanguage === 'ur' ? 'نئی ہیڈنگ' : 'New Heading', items: [''] }]
        }));
    };

    const removeSection = (id: number) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.filter(s => s.id !== id)
        }));
    };

    const updateSectionHeading = (id: number, heading: string) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === id ? { ...s, heading } : s)
        }));
    };

    const addLine = (sectionId: number) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === sectionId ? { ...s, items: [...s.items, ''] } : s)
        }));
    };

    const updateLine = (sectionId: number, itemIndex: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(s => {
                if (s.id === sectionId) {
                    const newItems = [...s.items];
                    newItems[itemIndex] = value;
                    return { ...s, items: newItems };
                }
                return s;
            })
        }));
    };

    const removeLine = (sectionId: number, itemIndex: number) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(s => {
                if (s.id === sectionId) {
                    return { ...s, items: s.items.filter((_, i) => i !== itemIndex) };
                }
                return s;
            })
        }));
    };

    const handleSaveAndDownload = async (language: 'en' | 'ur') => {
        if (!formData.title || !formData.party_one_name) {
            alert("Please fill all required fields (Title, Client 1 Name)");
            return;
        }

        setLoading(true);
        try {
            // Clean up empty lines
            const cleanedSections = formData.sections.map(s => ({
                heading: s.heading,
                items: s.items.filter(i => i.trim() !== '')
            }));

            const cleanedData = {
                title: formData.title,
                party_one_name: formData.party_one_name,
                party_one_details: formData.party_one_details,
                scope_of_work: {
                    is_dynamic: true,
                    sections: cleanedSections
                },
                rates_of_work: [],
                payment_schedule: []
            };

            // Save to DB
            await api.hrAgreements.add(cleanedData);
            await loadAgreements();

            // Generate PDF
            if (profile) {
                await generateAgreementPDF(cleanedData, profile, language, includeStamp);
            } else {
                alert("Company profile not loaded. PDF might miss letterhead.");
                await generateAgreementPDF(cleanedData, {}, language, includeStamp);
            }

            // reset form
            setFormData({
                title: '',
                party_one_name: '',
                party_one_details: '',
                sections: [
                    { id: 1, heading: uiLanguage === 'ur' ? 'ورک سکوپ' : 'Scope of Work', items: [''] },
                    { id: 2, heading: uiLanguage === 'ur' ? 'ادائیگی کی شرح' : 'Rates of Work', items: [''] },
                    { id: 3, heading: uiLanguage === 'ur' ? 'ادائیگی کا طریقہ کار' : 'Payment Schedule', items: [''] }
                ]
            });

            alert(uiLanguage === 'ur' ? "معاہدہ محفوظ اور PDF ڈاؤن لوڈ ہو گیا!" : "Agreement Saved and PDF Downloaded!");
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to save agreement.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadExisting = async (agreement: any, language: 'en' | 'ur') => {
        if (profile) {
            await generateAgreementPDF(agreement, profile, language, includeStamp);
        } else {
            await generateAgreementPDF(agreement, {}, language, includeStamp);
        }
    };

    const deleteAgreement = async (id: string) => {
        if (!confirm("Are you sure you want to delete this agreement?")) return;
        try {
            await api.hrAgreements.delete(id);
            await loadAgreements();
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Failed to delete agreement");
        }
    };

    return (
        <div dir={uiLanguage === 'ur' ? "rtl" : "ltr"} className={uiLanguage === 'ur' ? "font-urdu" : ""}>
            <Header title={uiLanguage === 'ur' ? "کمپنی کے معاہدے" : "Company Agreements"} />

            <div className="p-8 max-w-5xl mx-auto space-y-8 text-right">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setUiLanguage('ur')}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${uiLanguage === 'ur' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}`}
                        >
                            اردو
                        </button>
                        <button
                            onClick={() => setUiLanguage('en')}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${uiLanguage === 'en' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}`}
                        >
                            English
                        </button>
                    </div>
                </div>
                <Card className="bg-white/90 backdrop-blur-sm shadow-xl p-8">
                    <div className="space-y-6 text-right">

                        <div className="text-center border-b pb-6 mb-6">
                            <h2 className="text-3xl font-bold uppercase tracking-wide text-gray-800">
                                {uiLanguage === 'ur' ? "نیا معاہدہ بنائیں" : "Create New Agreement"}
                            </h2>
                            <p className="text-gray-500 text-sm mt-2">
                                {uiLanguage === 'ur' ? "کام کی تفصیل اور معاہدہ جات تیار کریں اور محفوظ کریں" : "Prepare and save scope of work and agreements"}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-base font-semibold text-gray-700 block mb-1">
                                    {uiLanguage === 'ur' ? "مین ہیڈنگ / عنوان" : "Main Heading / Title"}
                                </label>
                                <input
                                    type="text"
                                    required
                                    className={`w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none mt-1 ${uiLanguage === 'ur' ? 'text-right' : 'text-left'}`}
                                    placeholder={uiLanguage === 'ur' ? "مثال: یورو آئل سائٹ پر اینٹوں کے کام کا معاہدہ" : "e.g. Agreement for Brick Work at Euro Oil Site"}
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="bg-white/80 backdrop-blur-md border border-emerald-100/50 shadow-sm p-6 rounded-2xl space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-base font-semibold text-gray-700 block mb-1">
                                            {uiLanguage === 'ur' ? "فریق اول کا نام (کلائنٹ)" : "Party 1 Name (Client)"}
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            className={`w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${uiLanguage === 'ur' ? 'text-right' : 'text-left'}`}
                                            value={formData.party_one_name}
                                            onChange={e => setFormData({ ...formData, party_one_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-base font-semibold text-gray-700 block mb-1">
                                            {uiLanguage === 'ur' ? "فریق دوم (کمپنی کا نام)" : "Party 2 (Company Name)"}
                                        </label>
                                        <input
                                            type="text"
                                            disabled
                                            className={`w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed outline-none font-medium ${uiLanguage === 'ur' ? 'text-right' : 'text-left'}`}
                                            value={profile?.name || (uiLanguage === 'ur' ? "میران بلڈرز" : "Miran Builders")}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-base font-semibold text-gray-700 block mb-1">
                                        {uiLanguage === 'ur' ? "فریق اول کی تفصیلات (کام، شناختی کارڈ، فون وغیرہ)" : "Party 1 Details (Work, CNIC, Phone etc.)"}
                                    </label>
                                    <textarea
                                        rows={3}
                                        className={`w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${uiLanguage === 'ur' ? 'text-right' : 'text-left'}`}
                                        value={formData.party_one_details}
                                        onChange={e => setFormData({ ...formData, party_one_details: e.target.value })}
                                    />
                                </div>
                            </div>


                            {formData.sections.map((section, sIndex) => (
                                <div key={section.id} className="pt-4 border max-w-full p-4 rounded-xl shadow-sm bg-gray-50/50">
                                    <div className="flex justify-between items-center mb-4 border-b-2 border-emerald-500 pb-2 gap-4">
                                        <input
                                            className="text-xl font-bold text-gray-800 bg-transparent outline-none flex-1 placeholder-gray-400"
                                            value={section.heading}
                                            placeholder={uiLanguage === 'ur' ? "ہیڈنگ کا نام لکھیں..." : "Section Heading..."}
                                            onChange={e => updateSectionHeading(section.id, e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeSection(section.id)}
                                            className="text-red-500 hover:text-white hover:bg-red-500 transition-colors px-3 py-1 rounded-lg text-sm font-bold border border-red-200"
                                        >
                                            {uiLanguage === 'ur' ? "سیکشن ختم کریں" : "Remove Section"}
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {section.items.map((line, index) => (
                                            <div key={index} className="flex gap-2 items-center">
                                                <span className="font-bold text-gray-500 w-8 text-center">{index + 1}.</span>
                                                <input
                                                    type="text"
                                                    className={`flex-1 px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none ${uiLanguage === 'ur' ? 'text-right' : 'text-left'}`}
                                                    placeholder={uiLanguage === 'ur' ? "تفصیل لکھیں..." : "Enter point details..."}
                                                    value={line}
                                                    onChange={e => updateLine(section.id, index, e.target.value)}
                                                />
                                                {section.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLine(section.id, index)}
                                                        className="bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200 font-bold"
                                                    >
                                                        ✗
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => addLine(section.id)}
                                        className="mt-4 px-4 py-2 bg-emerald-50 text-emerald-700 font-semibold rounded hover:bg-emerald-100 transition-colors inline-block"
                                    >
                                        + {uiLanguage === 'ur' ? "نیا پوائنٹ شامل کریں" : "Add New Point"}
                                    </button>
                                </div>
                            ))}

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={addSection}
                                    className="w-full py-3 border-2 border-dashed border-emerald-300 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors"
                                >
                                    + {uiLanguage === 'ur' ? "نیا سیکشن (ہیڈنگ) شامل کریں" : "Add New Section (Heading)"}
                                </button>
                            </div>

                        </div>

                        <div className={`flex items-center space-x-2 bg-emerald-50 p-4 rounded-lg mt-6 ${uiLanguage === 'ur' ? 'space-x-reverse' : ''}`}>
                            <input
                                type="checkbox"
                                id="includeStamp"
                                className="w-5 h-5 cursor-pointer"
                                checked={includeStamp}
                                onChange={e => setIncludeStamp(e.target.checked)}
                            />
                            <label htmlFor="includeStamp" className={`text-sm font-bold text-emerald-900 cursor-pointer ${uiLanguage === 'ur' ? 'mr-2' : 'ml-2'}`}>
                                {uiLanguage === 'ur' ? "معاہدے پر ڈیجیٹل سی ای او مہر شامل کریں" : "Include Digital CEO Stamp on Agreement"}
                            </label>
                        </div>

                        <div className="pt-6 flex flex-wrap gap-4 justify-start">
                            <button
                                type="button"
                                onClick={() => handleSaveAndDownload(uiLanguage)}
                                disabled={loading}
                                className={`px-8 py-4 bg-emerald-600 text-white font-extrabold rounded-xl shadow-lg hover:bg-emerald-700 transition-all transform hover:scale-105
                                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? (uiLanguage === 'ur' ? 'جاری ہے...' : 'Processing...') : (uiLanguage === 'ur' ? 'محفوظ کریں اور PDF ڈاؤن لوڈ کریں' : 'Save & Download PDF')}
                            </button>

                            {uiLanguage === 'ur' ? (
                                <button
                                    type="button"
                                    onClick={() => handleSaveAndDownload('en')}
                                    disabled={loading}
                                    className="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl shadow hover:bg-gray-700 transition-colors"
                                >
                                    Save & Download (English)
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleSaveAndDownload('ur')}
                                    disabled={loading}
                                    className="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl shadow hover:bg-gray-700 transition-colors font-urdu"
                                >
                                    محفوظ کریں اور اردو PDF ڈاؤن لوڈ
                                </button>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Saved Agreements */}
                {agreements.length > 0 && (
                    <Card className="bg-white/90 backdrop-blur-sm shadow-xl p-8">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 border-emerald-500 pb-2">
                            {uiLanguage === 'ur' ? "محفوظ شدہ معاہدے" : "Saved Agreements"}
                        </h3>
                        <div className="overflow-x-auto">
                            <table className={`w-full border-collapse ${uiLanguage === 'ur' ? 'text-right' : 'text-left'}`}>
                                <thead>
                                    <tr className="bg-emerald-50/50">
                                        <th className="p-3 border-b font-bold text-gray-700">{uiLanguage === 'ur' ? 'تاریخ' : 'Date'}</th>
                                        <th className="p-3 border-b font-bold text-gray-700">{uiLanguage === 'ur' ? 'عنوان' : 'Title'}</th>
                                        <th className="p-3 border-b font-bold text-gray-700">{uiLanguage === 'ur' ? 'فریق اول' : 'Party 1'}</th>
                                        <th className="p-3 border-b font-bold text-gray-700">{uiLanguage === 'ur' ? 'حصے' : 'Points'}</th>
                                        <th className="p-3 border-b font-bold text-gray-700 text-center">{uiLanguage === 'ur' ? 'ایکشن' : 'Action'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agreements.map((agr) => (
                                        <tr key={agr.id} className="hover:bg-emerald-50/20 transition-colors">
                                            <td className="p-3 border-b text-sm text-gray-600">
                                                {new Date(agr.created_at).toLocaleDateString('ur-PK')}
                                            </td>
                                            <td className="p-3 border-b font-medium text-gray-800">{agr.title}</td>
                                            <td className="p-3 border-b text-gray-600">{agr.party_one_name}</td>
                                            <td className="p-3 border-b text-xs text-gray-500">
                                                {agr.scope_of_work?.is_dynamic ? (
                                                    (agr.scope_of_work?.sections || []).map((sec: any, i: number) => (
                                                        <div key={i}>{sec.heading}: {sec.items?.length || 0} پوائنٹس</div>
                                                    ))
                                                ) : (
                                                    <>
                                                        تفصیل: {Array.isArray(agr.scope_of_work) ? agr.scope_of_work.length : 0} پوائنٹس<br />
                                                        ریٹ: {Array.isArray(agr.rates_of_work) ? agr.rates_of_work.length : 0} پوائنٹس
                                                    </>
                                                )}
                                            </td>
                                            <td className="p-3 border-b">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleDownloadExisting(agr, 'ur')}
                                                        className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors font-urdu"
                                                    >
                                                        اردو PDF
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadExisting(agr, 'en')}
                                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                                                    >
                                                        EN PDF
                                                    </button>
                                                    <button
                                                        onClick={() => deleteAgreement(agr.id)}
                                                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                                                    >
                                                        {uiLanguage === 'ur' ? 'حذف کریں' : 'Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
