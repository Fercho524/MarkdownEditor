document.addEventListener('DOMContentLoaded', () => {
    const mdArea = document.getElementById('editor');
    const mdRender = document.getElementById('content');

    window.api.getDirectoryData().then(d => window.currentDir = d.currentDir);

    function renderMarkdown() {
        mdRender.innerHTML = html2MarkDown(mdArea.value);

        // Katex function to render math.
        renderMathInElement(mdRender, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ],
            ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre']
        });
    }

    // When Input Render Update
    mdArea.addEventListener('input', () => {
        renderMarkdown()
        if (currentFilePath) fileStates[currentFilePath].edited = true;
    });

    mdArea.addEventListener('focusout', async () => {
        if (currentFileName) {
            const content = mdArea.value;
            await window.api.saveFile(currentFileName, content);
            console.log('Guardado automático por inactividad');
        }
    })

    // Avoid Default Tab
    mdArea.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const s = mdArea.selectionStart, e2 = mdArea.selectionEnd;
            mdArea.value = mdArea.value.slice(0, s) + '\t' + mdArea.value.slice(e2);
            mdArea.selectionStart = mdArea.selectionEnd = s + 1;
        }
    });

    // CTRL + V Paste Image
    mdArea.addEventListener('paste', async e => {
        for (const item of e.clipboardData.items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64 = reader.result.split(',')[1];
                    const relPath = await window.api.saveClipboardImage(base64);
                    const pos = mdArea.selectionStart;
                    mdArea.setRangeText(`![pasted image](${relPath})`, pos, pos, 'end');
                    renderMarkdown();
                };
                reader.readAsDataURL(item.getAsFile());
            }
        }
    });

    // CTRL + S Save Document
    mdArea.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            document.getElementById('saveBtn').click();
        }
    });
});

