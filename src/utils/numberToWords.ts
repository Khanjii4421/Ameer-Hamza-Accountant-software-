export function numberToWords(num: number): string {
    if (num === 0) return 'Zero';

    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];

    function convertChunk(n: number): string {
        let chunk = '';
        if (n >= 100) {
            chunk += units[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            chunk += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        } else if (n >= 10) {
            chunk += teens[n - 10] + ' ';
            return chunk;
        }
        if (n > 0) {
            chunk += units[n] + ' ';
        }
        return chunk;
    }

    let result = '';
    let scaleIdx = 0;

    // Handle decimal part separately if needed, but usually for currency it's "amount only"
    const integerPart = Math.floor(num);

    let n = integerPart;
    while (n > 0) {
        const chunk = n % 1000;
        if (chunk > 0) {
            result = convertChunk(chunk) + scales[scaleIdx] + ' ' + result;
        }
        n = Math.floor(n / 1000);
        scaleIdx++;
    }

    return result.trim() + ' Rupees Only';
}
