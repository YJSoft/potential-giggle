import { BlobServiceClient } from '@azure/storage-blob'
import { randomUUID } from 'crypto'

function getBlobServiceClient() {
  const connStr =
    process.env.AZURE_STORAGE_CONNECTION_STRING ??
    'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OGLjX+N6+RKV2PqCl3LZ9MrX+3EMh2S6g==;BlobEndpoint=http://localhost:10000/devstoreaccount1;'
  return BlobServiceClient.fromConnectionString(connStr)
}

export async function uploadReceipt(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME ?? 'receipts'
  const client = getBlobServiceClient()
  const containerClient = client.getContainerClient(containerName)

  await containerClient.createIfNotExists()

  const ext = mimeType.split('/')[1] ?? 'bin'
  const blobName = `receipts/${randomUUID()}.${ext}`
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
  })

  // Return a SAS URL (prod) or direct URL (local Azurite)
  if (process.env.NODE_ENV !== 'production') {
    return blockBlobClient.url
  }

  const sasUrl = await blockBlobClient.generateSasUrl({
    expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    permissions: { read: true } as never,
  })
  return sasUrl
}
