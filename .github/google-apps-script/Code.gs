/**
 * Google Apps Script — Sincronização automática GitHub -> Google Drive
 * Pasta padrão: "Planilha Diária de Tarefas"
 *
 * Como configurar:
 * 1. Acesse https://script.google.com e crie um "Novo projeto".
 * 2. Cole todo este código em Code.gs.
 * 3. Em Configurações do projeto -> Propriedades do script, adicione:
 *      Propriedade: SYNC_SECRET
 *      Valor:       uma senha forte de sua escolha (a mesma que irá no GitHub Secret GDRIVE_SYNC_SECRET)
 *    (Opcionalmente, você pode preencher FALLBACK_SYNC_SECRET abaixo se preferir.)
 * 4. Clique em "Implantar" -> "Nova implantação" -> tipo "App da Web":
 *      - Executar como: Eu (sua conta Google)
 *      - Quem pode acessar: Qualquer pessoa
 * 5. Autorize o acesso ao Google Drive e copie a URL gerada (termina em /exec).
 * 6. No GitHub (Settings -> Secrets and variables -> Actions), cadastre:
 *      - GDRIVE_WEBHOOK_URL = URL copiada no passo 5
 *      - GDRIVE_SYNC_SECRET = mesma senha definida no passo 3
 */

const DEFAULT_ROOT_FOLDER_ID = '1D89YqTGSKaA2bvUdupbfAknGM9jyy9rL';
const FALLBACK_SYNC_SECRET = 'TROQUE_POR_UM_SEGREDO_FORTE';

function getConfiguredSecret_() {
  const propSecret = PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');
  if (propSecret && propSecret.trim() !== '') {
    return propSecret.trim();
  }
  return FALLBACK_SYNC_SECRET;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonResponse_({
    ok: true,
    service: 'GitHub -> Google Drive Sync',
    folder: 'Planilha Diária de Tarefas',
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, error: 'Corpo da requisição vazio.' });
    }

    const data = JSON.parse(e.postData.contents);
    const expectedSecret = getConfiguredSecret_();

    if (!expectedSecret || expectedSecret === 'TROQUE_POR_UM_SEGREDO_FORTE') {
      return jsonResponse_({
        ok: false,
        error: 'SYNC_SECRET não configurado no Google Apps Script.',
      });
    }

    if (!data.secret || data.secret !== expectedSecret) {
      return jsonResponse_({ ok: false, error: 'Não autorizado (secret inválido).' });
    }

    const rawPath = String(data.path || '').replace(/\\/g, '/').trim();
    if (!rawPath || rawPath.startsWith('/') || rawPath.includes('..')) {
      return jsonResponse_({ ok: false, error: 'Caminho de arquivo inválido: ' + rawPath });
    }

    if (typeof data.contentBase64 !== 'string') {
      return jsonResponse_({ ok: false, error: 'Campo contentBase64 ausente.' });
    }

    lock.waitLock(30000);

    const folderId = String(data.folderId || DEFAULT_ROOT_FOLDER_ID).trim() || DEFAULT_ROOT_FOLDER_ID;
    const rootFolder = DriveApp.getFolderById(folderId);

    const parts = rawPath.split('/').filter(Boolean);
    const fileName = parts.pop();
    let targetFolder = rootFolder;

    for (let i = 0; i < parts.length; i++) {
      targetFolder = getOrCreateSubfolder_(targetFolder, parts[i]);
    }

    const bytes = Utilities.base64Decode(data.contentBase64);
    const mimeType = String(data.mimeType || 'application/octet-stream');
    const blob = Utilities.newBlob(bytes, mimeType, fileName);

    const existingFiles = targetFolder.getFilesByName(fileName);
    if (existingFiles.hasNext()) {
      const existingFile = existingFiles.next();

      if (data.isText === true) {
        existingFile.setContent(blob.getDataAsString('UTF-8'));
        return jsonResponse_({
          ok: true,
          action: 'updated',
          path: rawPath,
          fileId: existingFile.getId(),
        });
      }

      // Para arquivos binários (ex: .png, .jpg), atualiza in-place se o serviço avançado Drive estiver ativo;
      // caso contrário, move a versão anterior para a lixeira e cria o arquivo atualizado sem duplicar.
      if (typeof Drive !== 'undefined' && Drive.Files && typeof Drive.Files.update === 'function') {
        Drive.Files.update({}, existingFile.getId(), blob);
        return jsonResponse_({
          ok: true,
          action: 'updated',
          path: rawPath,
          fileId: existingFile.getId(),
        });
      }

      existingFile.setTrashed(true);
      const replacedFile = targetFolder.createFile(blob);
      return jsonResponse_({
        ok: true,
        action: 'replaced',
        path: rawPath,
        fileId: replacedFile.getId(),
      });
    }

    const createdFile = targetFolder.createFile(blob);
    return jsonResponse_({
      ok: true,
      action: 'created',
      path: rawPath,
      fileId: createdFile.getId(),
    });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {
      // ignora caso o lock não tenha sido adquirido
    }
  }
}

function getOrCreateSubfolder_(parentFolder, name) {
  const folders = parentFolder.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(name);
}
