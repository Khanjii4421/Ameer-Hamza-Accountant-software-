import jsPDF from 'jspdf';

/**
 * Configures the document to automatically apply the letterhead to every new page.
 * This uses the internal 'addPage' event of jsPDF.
 */
export const setupLetterhead = async (doc: jsPDF, profile: any) => {
    if (!profile?.letterhead_url) return { startY: 30 };

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Helper to get image data synchronously if possible or pre-load
    const getImageData = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = reject;
            img.src = url;
        });
    };

    try {
        const imgData = await getImageData(profile.letterhead_url);

        // Apply to current page (Page 1)
        doc.addImage(imgData, 'PNG', 0, 0, width, height);

        // REMOVED: Subscribe to addPage event for future pages
        // We only want the letterhead on the first page now.

        return { startY: 60 }; // Content starts lower
    } catch (e) {
        console.warn('Letterhead setup failed', e);
        return { startY: 30 };
    }
};

/**
 * Legacy/Single page applier alias
 */
export const applyLetterhead = setupLetterhead;
