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