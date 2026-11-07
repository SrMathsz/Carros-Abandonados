// Reduz a foto antes de enviar (economiza dados do celular) e converte para JPEG.
// Ao redesenhar no canvas, os metadados da foto, como o GPS do EXIF, são descartados.
export async function reduzirImagem(arquivo, ladoMaximo = 1280, qualidade = 0.8) {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, largura, altura);
  if (bitmap.close) bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao processar a foto'))),
      'image/jpeg',
      qualidade
    );
  });
}
