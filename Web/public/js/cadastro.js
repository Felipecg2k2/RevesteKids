document.addEventListener('DOMContentLoaded', () => {
    // Se o input de foto de cadastro existir na página atual
    const fileInput = document.getElementById('foto_perfil_cadastro');
    if (fileInput) {
        const fileNameDisplay = document.getElementById('file-name-display');
        const labelFile = document.querySelector('.label-file');
        
        // Função para atualizar a exibição ao selecionar um arquivo
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                // Exibe o nome do arquivo
                fileNameDisplay.textContent = `Arquivo selecionado: ${e.target.files[0].name}`;
                // Muda o texto do botão para indicar que a foto foi carregada
                labelFile.innerHTML = '<i class="fas fa-check-circle"></i> Foto Carregada';
                labelFile.classList.add('loaded'); 
            } else {
                fileNameDisplay.textContent = 'Nenhum arquivo selecionado.';
                labelFile.innerHTML = '<i class="fas fa-camera"></i> Foto de Perfil (Opcional)';
                labelFile.classList.remove('loaded');
            }
        });
    }
});