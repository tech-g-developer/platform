//
// Copyright © 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import attachment, { Attachment } from '@hcengineering/attachment'
import client from '@hcengineering/client'
import clientResources from '@hcengineering/client-resources'
import core, { Client, MeasureContext, Ref, TxOperations } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { setMetadata } from '@hcengineering/platform'
import { Token, generateToken } from '@hcengineering/server-token'
import { Extension, onLoadDocumentPayload, onStoreDocumentPayload } from '@hocuspocus/server'
import { applyUpdate, encodeStateAsUpdate } from 'yjs'
import config from '../config'
import { Context } from '../context'

// eslint-disable-next-line
const WebSocket = require('ws')

async function connect (transactorUrl: string, token: Token): Promise<Client> {
  const encodedToken = generateToken(token.email, token.workspace)
  // We need to override default factory with 'ws' one.
  setMetadata(client.metadata.ClientSocketFactory, (url) => {
    return new WebSocket(url, {
      headers: {
        'User-Agent': config.ServiceID
      }
    })
  })
  return await (await clientResources()).function.GetClient(encodedToken, transactorUrl)
}

export interface StorageConfiguration {
  ctx: MeasureContext
  minio: MinioService
  transactorUrl: string
}

export class StorageExtension implements Extension {
  private readonly configuration: StorageConfiguration

  constructor (configuration: StorageConfiguration) {
    this.configuration = configuration
  }

  async getMinioDocument (documentId: string, token: Token): Promise<Buffer | undefined> {
    const buffer = await this.configuration.minio.read(token.workspace, documentId)
    return Buffer.concat(buffer)
  }

  async onLoadDocument (data: onLoadDocumentPayload): Promise<any> {
    console.log('load document', data.documentName)

    const documentId = data.documentName
    const { token, initialContentId } = data.context as Context

    await this.configuration.ctx.with('load-document', {}, async () => {
      let minioDocument: Buffer | undefined
      try {
        minioDocument = await this.getMinioDocument(documentId, token)
      } catch (err: any) {
        if (initialContentId !== undefined && initialContentId.length > 0) {
          minioDocument = await this.getMinioDocument(initialContentId, token)
        }
      }

      if (minioDocument !== undefined && minioDocument.length > 0) {
        try {
          const uint8arr = new Uint8Array(minioDocument)
          applyUpdate(data.document, uint8arr)
        } catch (err) {
          console.error(err)
        }
      }
    })

    return data.document
  }

  async onStoreDocument (data: onStoreDocumentPayload): Promise<void> {
    console.log('store document', data.documentName)

    const documentId = data.documentName
    const { token } = data.context as Context

    await this.configuration.ctx.with('store-document', {}, async (ctx) => {
      const updates = encodeStateAsUpdate(data.document)
      const buffer = Buffer.from(updates.buffer)

      // persist document to Minio
      await ctx.with('minio', {}, async () => {
        const metaData = { 'content-type': 'application/ydoc' }
        await this.configuration.minio.put(token.workspace, documentId, buffer, buffer.length, metaData)
      })

      // notify platform about changes
      await ctx.with('platform', {}, async () => {
        try {
          const connection = await connect(this.configuration.transactorUrl, token)

          // token belongs to the first user opened the document, this is not accurate, but
          // since the document is collaborative, we need to choose some account to update the doc
          const account = await connection.findOne(core.class.Account, { email: token.email })
          const accountId = account?._id ?? core.account.System

          const client = new TxOperations(connection, accountId, true)
          const current = await client.findOne(attachment.class.Attachment, { _id: documentId as Ref<Attachment> })
          if (current !== undefined) {
            console.debug('platform notification for document', documentId)
            await client.update(current, { lastModified: Date.now(), size: buffer.length })
          } else {
            console.debug('platform attachment document not found', documentId)
          }

          await connection.close()
        } catch (err: any) {
          console.debug('failed to notify platform', documentId, err)
        }
      })
    })
  }
}
