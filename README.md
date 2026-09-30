# DexVault V17 — catálogo híbrido, repetidas e comparação de trocas

## Instalação
Abra esta pasta pelo VS Code e execute `index.html` com Live Server. Não abra com `file://` (o catálogo JSON usa fetch).

## O que mudou
- O botão **Tenho** agora centraliza corretamente o conteúdo dentro do card.
- Novo **Exportar trocas JSON**: cria um arquivo com as cartas repetidas da coleção aberta.
- Novo **Comparar arquivo**: importe o JSON de outro colecionador e veja imediatamente quais repetidas dele ainda faltam para você. A leitura é local no navegador.
- Cartas não adquiridas aparecem em cinza; ao marcar **Tenho**, ficam coloridas.
- Botões +/− registram quantas cópias você possui; a partir de duas, o excedente conta como repetida.
- Filtro **Repetidas**, indicador de progresso e exportações CSV (adquiridas, faltantes, repetidas). CSV separado por `;` e com BOM UTF-8 para abrir no Excel em português.
- As marcações antigas da V15 continuam na chave `dexvault-cartas-v1` do mesmo navegador e endereço.
- 30th Celebration prioriza `dados/30th-celebration.json` quando o arquivo contiver cartas válidas. Enquanto vazio, usa a API da V15. As outras duas coleções continuam na API.

## Preparar a primeira coleção com os dados reais
1. Abra **30th Celebration** com internet. Clique **Baixar catálogo JSON**.
2. Substitua `dados/30th-celebration.json` pelo arquivo baixado. Atualize a página (Ctrl+F5). A partir daí os nomes/números da coleção principal vêm do seu arquivo.
3. Opcional: adicione `001.webp`, `002.webp` etc. em `assets/img/cartas/30th-celebration/` conforme a numeração real. O navegador tenta a imagem local e, se não existir, recorre à API. Cartas especiais/variantes podem exigir nomes exclusivos definidos em `imagemLocal` no JSON.
4. Para baixar automaticamente as imagens usando as URLs que já estão no seu JSON, no terminal do VS Code execute: `powershell -ExecutionPolicy Bypass -File .\scripts\baixar-imagens-30th.ps1`. O script detecta se cada arquivo é WebP, PNG ou JPG, salva com a extensão correta e atualiza `imagemLocal` no JSON.
5. O script não inclui imagens dentro deste ZIP; ele apenas baixa no seu computador as URLs registradas no catálogo quando você o executa.

## Atenção
- A geração inicial do JSON depende de a API fornecer a coleção completa; revise os dados antes de considerá-los definitivos. O botão exporta as cartas **que a API devolveu**, sem inventar registros ausentes.
- O CSV contém os dados da coleção atualmente aberta. Cópias/repetidas ficam salvas somente no navegador até implementarmos autenticação.
- Para comparar trocas com amigos, use **Exportar trocas JSON** e **Comparar arquivo** dentro da mesma coleção. Nesta versão a comparação é por coleção, não por conta online.
- Faça backup da V15 antes de substituir a pasta. No GitHub Pages, use o mesmo endereço para manter o armazenamento local existente.
