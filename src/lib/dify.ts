// Dify Knowledge Base API ヘルパー

const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1'
const DIFY_DATASET_API_KEY = process.env.DIFY_DATASET_API_KEY || ''
const DIFY_DATASET_ID = process.env.DIFY_DATASET_ID || ''

export function isDifyConfigured(): boolean {
  return !!(DIFY_DATASET_API_KEY && DIFY_DATASET_ID)
}

export function getDifyConfig() {
  return {
    apiUrl: DIFY_API_URL,
    apiKey: DIFY_DATASET_API_KEY,
    datasetId: DIFY_DATASET_ID,
    isConfigured: isDifyConfigured(),
  }
}

// Difyにドキュメントをアップロード
export async function uploadToDify(
  filename: string, 
  buffer: Buffer, 
  mimeType: string
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  if (!isDifyConfigured()) {
    return { success: false, error: 'Dify設定が不足しています' }
  }

  try {
    const formData = new FormData()
    const blob = new Blob([buffer], { type: mimeType })
    formData.append('file', blob, filename)
    
    const data = JSON.stringify({
      indexing_technique: 'high_quality',
      process_rule: {
        mode: 'automatic'
      }
    })
    formData.append('data', data)

    const response = await fetch(
      `${DIFY_API_URL.replace('/v1', '')}/v1/datasets/${DIFY_DATASET_ID}/document/create-by-file`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DIFY_DATASET_API_KEY}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Dify upload error:', response.status, errorText)
      return { success: false, error: `Dify API error: ${response.status}` }
    }

    const result = await response.json()
    console.log('Dify upload success:', result)
    
    return { 
      success: true, 
      documentId: result.document?.id 
    }
  } catch (error) {
    console.error('Dify upload exception:', error)
    return { success: false, error: String(error) }
  }
}

// Difyからドキュメントを削除
export async function deleteFromDify(documentId: string): Promise<{ success: boolean; error?: string }> {
  if (!isDifyConfigured()) {
    return { success: false, error: 'Dify設定が不足しています' }
  }

  try {
    const response = await fetch(
      `${DIFY_API_URL.replace('/v1', '')}/v1/datasets/${DIFY_DATASET_ID}/documents/${documentId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${DIFY_DATASET_API_KEY}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Dify delete error:', response.status, errorText)
      // 404の場合は既に削除されているので成功扱い
      if (response.status === 404) {
        return { success: true }
      }
      return { success: false, error: `Dify API error: ${response.status}` }
    }

    console.log('Dify delete success:', documentId)
    return { success: true }
  } catch (error) {
    console.error('Dify delete exception:', error)
    return { success: false, error: String(error) }
  }
}
