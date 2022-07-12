const markdown = document.getElementById("Markdown")
const renderedContainer = document.getElementById("content")

function html2MarkDown(markdown) {
    let newHTML = markdown;

    // Heading Rules
    const regh1 = /^#{1}\s\w+.*$/gimu
    const regh2 = /^#{2}\s\w+.*$/gimu
    const regh3 = /^#{3}\s\w+.*$/gimu
    const regh4 = /^#{4}\s\w+.*$/gimu
    const regh5 = /^#{5}\s\w+.*$/gimu
    const regh6 = /^#{6}\s\w+.*$/gimu

    // Katex
    const reginlineKatex = /^\${2}.*\${2}$/gimu
    const regkatex = /^\$\$\s*\n.*\n\$\$\n/gimu

    // Lists
    const regli = /^-\s.*$/gimu
    const regol = /^\d\.\s(.*)/gimu // Arreglarla para el orden

    // Text
    const reghr = /^[-]+(\s+)?$/gimu

    // Code
    const regcode = /^```(c|js)?\n(.*\n)*```/gimu
    const regInlineCode = /(\s|^\`)[\`]{1}([^\`]+)[\`]{1}(\s|^\`)/g

    const regLink = /[\[]{1}([^\]]+)[\]]{1}[\(]{1}([^\)\"]+)(\"(.+)\")?[\)]{1}/g

    // Images
    const regImg = /\!\[([^\]]+)\]\(([^\)]+)\)\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]/g

    //font styles
    const regBold = /[\*\_]{2}([^\*\_]+)[\*\_]{2}/g
    const regItalic = /[\*]{1}([^\*\`]+)[\*]{1}/g
    const regDel = /[\~]{2}([^\~]+)[\~]{2}/g
    const regMark = /[\=]{2}([^\*\_]+)[\=]{2}/g

    // Heading
    newHTML = newHTML.replaceAll(regh1, (cad) => {
        return `<h1>${cad.split("# ")[1]}</h1>`
    })
    newHTML = newHTML.replaceAll(regh2, (cad) => {
        return `<h2>${cad.split("# ")[1]}</h2>`
    })
    newHTML = newHTML.replaceAll(regh3, (cad) => {
        return `<h3>${cad.split("# ")[1]}</h3>`
    })
    newHTML = newHTML.replaceAll(regh4, (cad) => {
        return `<h4>${cad.split("# ")[1]}</h4>`
    })
    newHTML = newHTML.replaceAll(regh5, (cad) => {
        return `<h5>${cad.split("# ")[1]}</h5>`
    })
    newHTML = newHTML.replaceAll(regh6, (cad) => {
        return `<h6>${cad.split("# ")[1]}</h6>`
    })

    // Lists
    newHTML = newHTML.replaceAll(regli, (cad) => {
        return `<li>${cad.split("- ")[1]}</li>`
    })
    newHTML = newHTML.replaceAll(regol, (cad) => {
        return `<ol>${cad}</ol>`
    })

    // Katex 
    newHTML = newHTML.replaceAll(regkatex, (cad) => {
        return `<p class="katex">${cad}</p>`
    })
    newHTML = newHTML.replaceAll(reginlineKatex, (cad) => {
        return `<p class="katex">${cad}</p>`
    })

    // Images
    newHTML = newHTML.replace(regImg, '<img src="$2" alt="$1" width="$3" height="$4" class="$5" />');
    //links
    newHTML = newHTML.replace(regLink, '<a href="$2" title="$4">$1</a>');

    // Font Styles
    newHTML = newHTML.replace(regBold, '<b>$1</b>');
    newHTML = newHTML.replace(regItalic, '<i>$1</i>');
    newHTML = newHTML.replace(regDel, '<del>$1</del>');
    newHTML = newHTML.replace(regMark, '<span class="marked" >$1</span>');
    newHTML = newHTML.replaceAll(reghr, '<hr>')

    // Pre
    newHTML = newHTML.replaceAll(regcode, (cad) => {
        return `<pre>${cad.replaceAll("```", "")}</pre>`
    })

    // Inline code
    newHTML = newHTML.replace(regInlineCode, ' <code>$2</code> ');

    //blockquote
    newHTML = newHTML.replace(/^\>(.+)/gm, '<blockquote>$1</blockquote>');

    return newHTML;
}

function renderMarkdown(markdownCode, renderedContainer) {
    renderedContainer.innerHTML = html2MarkDown(markdownCode);
    console.log(renderedContainer.innerHTML)

    renderMathInElement(document.body, {
        // customised options
        // • auto-render specific keys, e.g.:
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
        ],
        // • rendering keys, e.g.:
        throwOnError: false
    });
}

markdown.onkeyup = () => {
    renderMarkdown(markdown.value, renderedContainer)
}
