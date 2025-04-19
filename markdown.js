document.addEventListener('DOMContentLoaded', () => {
    const mdArea = document.getElementById('editor');
    const mdRender = document.getElementById('content');
    const toggleBtn = document.getElementById('toggleViewBtn');
    let viewMode = 'render'; // 'split' | 'markdown' | 'render'

    // — Inicializar currentDir para que html2MarkDown pueda usarlo al renderizar imágenes —
    window.api.getDirectoryData().then(data => {
        window.currentDir = data.currentDir;
    });

   


    // Función de tu compilador (simplificada para ejemplos)
    function html2MarkDown(md) {
        let html = md;

        const rules = [
            // Matemáticas (KaTeX)
            //{ re: /\$\$([\s\S]+?)\$\$/gm, tpl: '<div class="katex-display">\\[ $1 \\]</div>' },
            //{ re: /\$([^\$\n]+?)\$/g, tpl: '<span class="katex-inline">\\( $1 \\)</span>' },

            // Encabezados
            { re: /^#{6}\s+(.*)$/gm, tpl: '<h6>$1</h6>' },
            { re: /^#{5}\s+(.*)$/gm, tpl: '<h5>$1</h5>' },
            { re: /^#{4}\s+(.*)$/gm, tpl: '<h4>$1</h4>' },
            { re: /^#{3}\s+(.*)$/gm, tpl: '<h3>$1</h3>' },
            { re: /^#{2}\s+(.*)$/gm, tpl: '<h2>$1</h2>' },
            { re: /^#{1}\s+(.*)$/gm, tpl: '<h1>$1</h1>' },
            { re: /`([^`\n]+?)`/g, tpl: '<code>$1</code>' },

            // Código en bloque
            { re: /^```(?:\w*)\n([\s\S]*?)```$/gm, tpl: '<pre>$1</pre>' },
            // Código inline
            { re: /``([^`]+)``/g, tpl: '<code>$1</code>' },

            // Blockquotes
            { re: /^>\s+(.*)$/gm, tpl: '<blockquote>$1</blockquote>' },

            // Separador horizontal
            { re: /^-{3,}$/gm, tpl: '<hr>' },

            // Imágenes y enlaces
            { re: /!\[([^\]]+)\]\(([^)]+)\)/g, tpl: '<img src="$2" alt="$1">' },
            { re: /\[([^\]]+)\]\(([^)]+)\)/g, tpl: '<a href="$2">$1</a>' },

            // Negrita e itálica
            { re: /\*\*(.*?)\*\*/g, tpl: '<b>$1</b>' },
            { re: /\*(.*?)\*/g, tpl: '<i>$1</i>' },

            // Listas: marcamos <li> para luego envolver
            { re: /^\s*\d+\.\s+(.*)$/gm, tpl: '<li class="ol">$1</li>' },
            { re: /^\s*[-*]\s+(.*)$/gm, tpl: '<li class="ul">$1</li>' },
        ];

        // Aplicar reglas generales
        rules.forEach(r => {
            html = html.replace(r.re, r.tpl);
        });

        // Envolver listas en <ol> y <ul>
        html = html.replace(
            /((?:<li class="ol">[\s\S]*?<\/li>\s*)+)/g,
            match => '<ol>\n' + match.trim() + '\n</ol>'
        );
        html = html.replace(
            /((?:<li class="ul">[\s\S]*?<\/li>\s*)+)/g,
            match => '<ul>\n' + match.trim() + '\n</ul>'
        );
        html = html.replace(/ class="(?:ol|ul)"/g, '');

        html = html.replace(
            /<img src="([^"]+)" alt="([^"]+)">/g,
            (m, src, alt) => {
                if (!/^[a-z]+:\/\//i.test(src)) {
                    src = `file://${window.currentDir}/${src}`;
                }
                return `<img src="${src}" alt="${alt}">`;
            }
        );


        // Tablas: procesar bloque completo
        html = html.replace(
            /(^\|.+\|[\r\n]+^\|(?:\s*:?-+:?\s*\|)+[\r\n]+(?:\|.*\|(?:[\r\n]+|$))+)/gm,
            tableBlock => {
                const lines = tableBlock.trim().split(/\r?\n/);
                // Cabecera
                const headers = lines[0].slice(1, -1).split('|').map(s => s.trim());
                // Filas de datos (descartar separador)
                const dataLines = lines.slice(2);
                const rows = dataLines.map(line =>
                    line.slice(1, -1).split('|').map(s => s.trim())
                );
                // Construir HTML
                let out = '<table>\n<thead>\n<tr>';
                headers.forEach(cell => { out += `<th>${cell}</th>`; });
                out += '</tr>\n</thead>\n<tbody>\n';
                rows.forEach(row => {
                    out += '<tr>';
                    row.forEach(cell => { out += `<td>${cell}</td>`; });
                    out += '</tr>\n';
                });
                out += '</tbody>\n</table>';
                return out;
            }
        );

        html = html.replace(/\n\n/g, '<br/><br/>');


        return html;
    }

    function renderMarkdown() {
        mdRender.innerHTML = html2MarkDown(mdArea.value);

        renderMathInElement(mdRender, {
            // Ajusta delimitadores si quieres $$…$$ para display y $…$ inline
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ],
            // Ignora etiquetas donde no quieras renderizar (p.ej., dentro de <code>)
            ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre']
        });
    }

    // Cada vez que el usuario escribe
    mdArea.addEventListener('input', () => {
        renderMarkdown();
    });

    // Alternar vistas
    toggleBtn.addEventListener('click', () => {
        if (viewMode === 'split') {
            // Solo Markdown
            mdArea.style.display = 'block';
            mdRender.style.display = 'none';
            toggleBtn.textContent = 'Vista Markdown';
            viewMode = 'markdown';
        } else if (viewMode === 'markdown') {
            // Solo renderizado
            mdArea.style.display = 'none';
            mdRender.style.display = 'block';
            toggleBtn.textContent = 'Vista HTML';
            viewMode = 'render';
        } else {
            // Dividida
            mdArea.style.display = 'block';
            mdRender.style.display = 'block';
            toggleBtn.textContent = 'Vista Dividida';
            viewMode = 'split';
        }
    });

    mdArea.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('saveBtn').click();
        }
    });

    // — Tabulación dentro del textarea —
    mdArea.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = mdArea.selectionStart;
            const end = mdArea.selectionEnd;
            mdArea.value = mdArea.value.slice(0, start) + '\t' + mdArea.value.slice(end);
            mdArea.selectionStart = mdArea.selectionEnd = start + 1;
        }
    });

    // — Pegar imágenes desde portapapeles —
    mdArea.addEventListener('paste', async e => {
        for (const item of e.clipboardData.items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64 = reader.result.split(',')[1];
                    const relPath = await window.api.saveClipboardImage(base64);
                    const cursor = mdArea.selectionStart;
                    const snippet = `![pasted image](${relPath})`;
                    mdArea.setRangeText(snippet, cursor, cursor, 'end');
                    renderMarkdown();
                };
                reader.readAsDataURL(blob);
            }
        }
    });


    // Interceptar fillEditor de renderer.js para inicializar Markdown
    if (typeof window.fillEditor === 'function') {
        const origFill = window.fillEditor;
        window.fillEditor = (text) => {
            origFill(text);

            // cargamos el texto en el textarea y el render
            mdArea.value = text;
            renderMarkdown();

            // habilitamos el toggle
            toggleBtn.disabled = false;

            // vista inicial: SOLO RENDER
            viewMode = 'render';
            mdArea.style.display = 'none';
            mdRender.style.display = 'block';
            toggleBtn.textContent = 'Vista Dividida';
        };
    }
});