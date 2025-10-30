import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { generatePresignedUpload, finalizeDocumentUpload, uploadDocumentMultipart } from '@/api/document';
const PRESIGNED_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5MB
async function uploadViaPresigned(input, onProgress) {
    const { file, category, metadata, isFinal, issuingDate, author, comment, filename } = input;
    const presignedPayload = {
        category,
        metadata,
        isFinal,
        fileName: filename,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        issuingDate,
        author,
        comment
    };
    const presignedResponse = await generatePresignedUpload(presignedPayload);
    await uploadToStorageWithProgress({
        url: presignedResponse.url,
        file,
        onProgress,
        contentType: file.type || 'application/octet-stream'
    });
    const finalizePayload = {
        version: presignedResponse.id.version,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream'
    };
    return finalizeDocumentUpload(presignedResponse.id.id, finalizePayload);
}
function uploadToStorageWithProgress({ url, file, contentType, onProgress }) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) {
                return;
            }
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
        };
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== XMLHttpRequest.DONE) {
                return;
            }
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress(100);
                resolve();
            }
            else {
                reject(new Error(`Falha ao enviar arquivo para armazenamento (status ${xhr.status})`));
            }
        };
        xhr.onerror = () => {
            reject(new Error('Falha ao enviar arquivo para armazenamento (erro de rede).'));
        };
        xhr.open('PUT', url, true);
        xhr.setRequestHeader('Content-Type', contentType);
        onProgress(0);
        xhr.send(file);
    });
}
async function uploadViaMultipart(input) {
    const { file, category, metadata, isFinal, issuingDate, author, comment, filename } = input;
    const formData = new FormData();
    formData.append('category', category);
    formData.append('metadata', metadata);
    formData.append('isFinal', String(isFinal));
    formData.append('document', file, file.name);
    if (issuingDate)
        formData.append('issuingDate', issuingDate);
    if (author)
        formData.append('author', author);
    if (comment)
        formData.append('comment', comment);
    if (filename)
        formData.append('filename', filename);
    return uploadDocumentMultipart(formData);
}
export function useUploadDocument() {
    const [progress, setProgress] = useState(null);
    const [isUploadingToStorage, setIsUploadingToStorage] = useState(false);
    const mutation = useMutation({
        mutationFn: async (input) => {
            const shouldUsePresigned = input.file.type.startsWith('video/') || input.file.size >= PRESIGNED_THRESHOLD_BYTES;
            if (shouldUsePresigned) {
                setIsUploadingToStorage(true);
                return uploadViaPresigned(input, (value) => setProgress(value));
            }
            setProgress(null);
            return uploadViaMultipart(input);
        },
        onSettled: () => {
            setIsUploadingToStorage(false);
        },
        onError: () => {
            setProgress(null);
        }
    });
    const reset = () => {
        mutation.reset();
        setProgress(null);
        setIsUploadingToStorage(false);
    };
    return {
        ...mutation,
        progress,
        isUploadingToStorage,
        reset
    };
}
