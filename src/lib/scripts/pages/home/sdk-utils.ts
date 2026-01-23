export async function downloadSDK(dynamicTypes: string) {
    const response = await fetch('/api/download-sdk', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dynamicTypes })
    });

    if (!response.ok) {
        throw new Error('Failed to download SDK');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ocsf-sdk.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
