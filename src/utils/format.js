import dayjs from 'dayjs';
export function formatDateTime(value) {
    if (!value)
        return undefined;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : value;
}
export function formatBytes(bytes) {
    if (typeof bytes !== 'number')
        return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}
export function unmaskCpf(value) {
    if (!value)
        return '';
    return value.replace(/\D/g, '').slice(0, 11);
}
export function formatCpf(value) {
    const digits = unmaskCpf(value);
    if (!digits)
        return value ?? '';
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 9);
    const part4 = digits.slice(9, 11);
    if (digits.length <= 3)
        return part1;
    if (digits.length <= 6)
        return `${part1}.${part2}`;
    const base = `${part1}.${part2}.${part3}`;
    return part4 ? `${base}-${part4}` : base;
}
