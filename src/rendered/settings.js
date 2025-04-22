// settings.js

(async () => {
    // Obtener elementos del DOM
    const favContainer = document.getElementById('favoriteDirsContainer');
    const baseSelect = document.getElementById('currentBaseDir');
    const form = document.getElementById('configForm');
    const addFavBtn = document.getElementById('addFavoriteDir');
    const cancelBtn = document.getElementById('cancelBtn');
    const applyBtn = document.getElementById('applyBtn');
    const acceptBtn = document.getElementById('acceptBtn');

    // Crea input para un directorio favorito
    function addFavInput(value = '') {
        const div = document.createElement('div');
        div.className = 'list-item';
        const input = document.createElement('input');
        input.type = 'text';
        input.name = 'favoriteDirs';
        input.value = value;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '×';
        btn.onclick = () => favContainer.removeChild(div);
        div.append(input, btn);
        favContainer.appendChild(div);
    }

    // Recoge valores del formulario en objeto config
    function collectFormValues() {
        const favs = Array.from(form.querySelectorAll('input[name="favoriteDirs"]'))
            .map(i => i.value.trim()).filter(v => v);

        return {
            favoriteDirs: favs,
            currentBaseDir: baseSelect.value,
            globalThemeCSSPath: form.globalThemeCSSPath.value,
            editorThemeCSSPath: form.editorThemeCSSPath.value,
            editorMonospaceFont: form.editorMonospaceFont.value,
            editorLanguage: form.editorLanguage.value,
            dateFormat: form.dateFormat.value,
            sintaxTheme: form.sintaxTheme.value,
            pdfSize: form.pdfSize.value,
            editorFontSize: form.editorFontSize.value,
            autosave: form.autosave.checked
        };
    }

    // Carga config y pobla la UI
    const cfg = await window.api.getConfig();

    // Favoritos
    favContainer.innerHTML = '';
    cfg.favoriteDirs.forEach(dir => addFavInput(dir));

    // Base select
    baseSelect.innerHTML = '';
    cfg.favoriteDirs.forEach(dir => {
        const opt = document.createElement('option');
        opt.value = dir;
        opt.textContent = dir.split('/').pop();
        if (dir === cfg.currentBaseDir) opt.selected = true;
        baseSelect.appendChild(opt);
    });

    // Otros campos
    form.globalThemeCSSPath.value = cfg.globalThemeCSSPath;
    form.editorThemeCSSPath.value = cfg.editorThemeCSSPath;
    form.editorMonospaceFont.value = cfg.editorMonospaceFont;
    form.editorLanguage.value = cfg.editorLanguage;
    form.dateFormat.value = cfg.dateFormat;
    form.sintaxTheme.value = cfg.sintaxTheme;
    form.pdfSize.value = cfg.pdfSize;
    form.editorFontSize.value = cfg.editorFontSize;
    form.autosave.checked = cfg.autosave;

    // Eventos
    addFavBtn.onclick = () => addFavInput();

    cancelBtn.onclick = () => {
        window.api.navigateTo('rendered/index.html');
    };

    applyBtn.onclick = async () => {
        const updates = collectFormValues();
        await window.api.updateConfig(updates);
        alert('Configuración aplicada.');
    };

    acceptBtn.onclick = async () => {
        const updates = collectFormValues();
        await window.api.updateConfig(updates);
        window.api.navigateTo('rendered/index.html');
    };
})();
