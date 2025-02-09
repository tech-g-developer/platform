//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { writable } from 'svelte/store'
import chunter, {
  type Backlink,
  type Channel,
  type ChatMessage,
  type ChunterMessage,
  type ChunterSpace,
  type DirectMessage,
  type Message,
  type ThreadMessage
} from '@hcengineering/chunter'
import core, {
  type Data,
  type Doc,
  type DocumentQuery,
  type Ref,
  type RelatedDocument,
  type Space,
  getCurrentAccount
} from '@hcengineering/core'
import { NotificationClientImpl } from '@hcengineering/notification-resources'
import { type IntlString, type Resources, translate } from '@hcengineering/platform'
import preference from '@hcengineering/preference'
import { MessageBox, getClient } from '@hcengineering/presentation'
import { getLocation, navigate, showPopup } from '@hcengineering/ui'

import ChannelHeader from './components/ChannelHeader.svelte'
import ChannelPresenter from './components/ChannelPresenter.svelte'
import ChannelView from './components/ChannelView.svelte'
import ChannelViewPanel from './components/ChannelViewPanel.svelte'
import ChunterBrowser from './components/ChunterBrowser.svelte'
import ConvertDmToPrivateChannelModal from './components/ConvertDmToPrivateChannel.svelte'
import CreateChannel from './components/CreateChannel.svelte'
import CreateDirectMessage from './components/CreateDirectMessage.svelte'
import DirectMessagePresenter from './components/DirectMessagePresenter.svelte'
import DmHeader from './components/DmHeader.svelte'
import DmPresenter from './components/DmPresenter.svelte'
import DirectMessageInput from './components/DirectMessageInput.svelte'
import EditChannel from './components/EditChannel.svelte'
import MessagePresenter from './components/MessagePresenter.svelte'
import ChannelPreview from './components/ChannelPreview.svelte'
import MessagePreview from './components/MessagePreview.svelte'
import SavedMessages from './components/SavedMessages.svelte'
import ThreadParentPresenter from './components/ThreadParentPresenter.svelte'
import ThreadView from './components/ThreadView.svelte'
import ThreadViewPanel from './components/ThreadViewPanel.svelte'
import Thread from './components/Thread.svelte'
import Threads from './components/Threads.svelte'
import BacklinkContent from './components/BacklinkContent.svelte'
import BacklinkReference from './components/BacklinkReference.svelte'
import TxCommentCreate from './components/activity/TxCommentCreate.svelte'
import TxMessageCreate from './components/activity/TxMessageCreate.svelte'
import BacklinkCreatedLabel from './components/activity/BacklinkCreatedLabel.svelte'
import ChatMessagePresenter from './components/chat-message/ChatMessagePresenter.svelte'
import ChatMessageInput from './components/chat-message/ChatMessageInput.svelte'
import ChatMessagesPresenter from './components/chat-message/ChatMessagesPresenter.svelte'

import { updateBacklinksList } from './backlinks'
import { getDmName, getLink, getTitle, resolveLocation } from './utils'
import activity, { type ActivityMessage, type DocUpdateMessage } from '@hcengineering/activity'
import notification from '@hcengineering/notification'

export { default as ChatMessagesPresenter } from './components/chat-message/ChatMessagesPresenter.svelte'
export { default as ChatMessagePopup } from './components/chat-message/ChatMessagePopup.svelte'
export { default as Header } from './components/Header.svelte'
export { classIcon } from './utils'
export { Thread }

async function MarkUnread (object: Message): Promise<void> {
  const client = NotificationClientImpl.getClient()
  await client.forceRead(object.space, chunter.class.ChunterSpace)
}

async function MarkCommentUnread (object: ThreadMessage): Promise<void> {
  const client = NotificationClientImpl.getClient()
  await client.forceRead(object.attachedTo, object.attachedToClass)
}

async function SubscribeMessage (object: Message): Promise<void> {
  const client = getClient()
  const acc = getCurrentAccount()
  const hierarchy = client.getHierarchy()
  if (hierarchy.isDerived(object._class, chunter.class.ThreadMessage)) {
    await client.updateMixin(
      object.attachedTo,
      object.attachedToClass,
      object.space,
      notification.mixin.Collaborators,
      {
        $push: {
          collaborators: acc._id
        }
      }
    )
  } else {
    await client.updateMixin(object._id, object._class, object.space, notification.mixin.Collaborators, {
      $push: {
        collaborators: acc._id
      }
    })
  }
}

async function UnsubscribeMessage (object: ChunterMessage): Promise<void> {
  const client = getClient()
  const acc = getCurrentAccount()
  const hierarchy = client.getHierarchy()
  const notificationClient = NotificationClientImpl.getClient()
  if (hierarchy.isDerived(object._class, chunter.class.ThreadMessage)) {
    await client.updateMixin(
      object.attachedTo,
      object.attachedToClass,
      object.space,
      notification.mixin.Collaborators,
      {
        $pull: {
          collaborators: acc._id
        }
      }
    )
    const docUpdate = notificationClient.docUpdatesMap.get(object.attachedTo)
    if (docUpdate !== undefined) {
      await client.remove(docUpdate)
    }
  } else {
    await client.updateMixin(object._id, object._class, object.space, notification.mixin.Collaborators, {
      $pull: {
        collaborators: acc._id
      }
    })
    const docUpdate = notificationClient.docUpdatesMap.get(object._id)
    if (docUpdate !== undefined) {
      await client.remove(docUpdate)
    }
  }
}

type PinnedChunterSpace = ChunterSpace

async function PinMessage (message: ChunterMessage): Promise<void> {
  const client = getClient()

  await client.updateDoc<PinnedChunterSpace>(
    chunter.class.ChunterSpace,
    core.space.Space,
    message.space as Ref<PinnedChunterSpace>,
    {
      $push: { pinned: message._id }
    }
  )
}

export async function UnpinMessage (message: ChunterMessage): Promise<void> {
  const client = getClient()

  await client.updateDoc<PinnedChunterSpace>(
    chunter.class.ChunterSpace,
    core.space.Space,
    message.space as Ref<PinnedChunterSpace>,
    {
      $pull: { pinned: message._id }
    }
  )
}

export async function ArchiveChannel (channel: Channel, evt: any, afterArchive?: () => void): Promise<void> {
  showPopup(
    MessageBox,
    {
      label: chunter.string.ArchiveChannel,
      message: chunter.string.ArchiveConfirm
    },
    undefined,
    (result: boolean) => {
      if (result) {
        const client = getClient()

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        client.update(channel, { archived: true })
        if (afterArchive != null) afterArchive()

        const loc = getLocation()
        if (loc.path[3] === channel._id) {
          loc.path.length = 3
          navigate(loc)
        }
      }
    }
  )
}

async function UnarchiveChannel (channel: Channel): Promise<void> {
  showPopup(
    MessageBox,
    {
      label: chunter.string.UnarchiveChannel,
      message: chunter.string.UnarchiveConfirm
    },
    undefined,
    (result: boolean) => {
      if (result) {
        const client = getClient()

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        client.update(channel, { archived: false })
      }
    }
  )
}

async function ConvertDmToPrivateChannel (dm: DirectMessage): Promise<void> {
  showPopup(ConvertDmToPrivateChannelModal, {
    label: chunter.string.ConvertToPrivate,
    dm
  })
}

export async function AddMessageToSaved (message: ChunterMessage): Promise<void> {
  const client = getClient()

  await client.createDoc(chunter.class.SavedMessages, preference.space.Preference, {
    attachedTo: message._id
  })
}

export async function DeleteMessageFromSaved (message: ChunterMessage): Promise<void> {
  const client = getClient()

  const current = await client.findOne(chunter.class.SavedMessages, { attachedTo: message._id })
  if (current !== undefined) {
    await client.remove(current)
  }
}

export const userSearch = writable('')

export async function chunterBrowserVisible (spaces: Space[]): Promise<boolean> {
  return false
}

async function update (source: Doc, key: string, target: RelatedDocument[], msg: IntlString): Promise<void> {
  const message = await translate(msg, {})
  const backlinks: Array<Data<Backlink>> = target.map((it) => ({
    backlinkId: source._id,
    backlinkClass: source._class,
    attachedTo: it._id,
    attachedToClass: it._class,
    message,
    collection: key
  }))

  const q: DocumentQuery<Backlink> = { backlinkId: source._id, backlinkClass: source._class, collection: key }

  await updateBacklinksList(getClient(), q, backlinks)
}

export function backlinksFilter (message: ActivityMessage, _class?: Ref<Doc>): boolean {
  if (message._class === activity.class.DocUpdateMessage) {
    return (message as DocUpdateMessage).objectClass === chunter.class.Backlink
  }
  return false
}

export function chatMessagesFilter (message: ActivityMessage): boolean {
  return message._class === chunter.class.ChatMessage
}

export async function deleteChatMessage (message: ChatMessage): Promise<void> {
  const client = getClient()
  // TODO: move to server?
  const notifications = await client.findAll(notification.class.InboxNotification, { attachedTo: message._id })

  await Promise.all([
    client.remove(message),
    ...notifications.map(async (notification) => await client.remove(notification))
  ])
}

export default async (): Promise<Resources> => ({
  filter: {
    BacklinksFilter: backlinksFilter,
    ChatMessagesFilter: chatMessagesFilter
  },
  component: {
    CreateChannel,
    CreateDirectMessage,
    ThreadParentPresenter,
    ThreadViewPanel,
    ChannelHeader,
    ChannelView,
    ChannelViewPanel,
    ChannelPresenter,
    DirectMessagePresenter,
    MessagePresenter,
    MessagePreview,
    ChannelPreview,
    ChunterBrowser,
    DmHeader,
    DmPresenter,
    DirectMessageInput,
    EditChannel,
    Thread,
    Threads,
    ThreadView,
    SavedMessages,
    BacklinkContent,
    BacklinkReference,
    ChatMessagePresenter,
    ChatMessageInput,
    ChatMessagesPresenter
  },
  function: {
    GetDmName: getDmName,
    ChunterBrowserVisible: chunterBrowserVisible,
    GetFragment: getTitle,
    GetLink: getLink
  },
  activity: {
    TxCommentCreate,
    TxMessageCreate,
    BacklinkCreatedLabel
  },
  actionImpl: {
    MarkUnread,
    MarkCommentUnread,
    SubscribeMessage,
    UnsubscribeMessage,
    PinMessage,
    UnpinMessage,
    ArchiveChannel,
    UnarchiveChannel,
    ConvertDmToPrivateChannel,
    DeleteChatMessage: deleteChatMessage
  },
  backreference: {
    Update: update
  },
  resolver: {
    Location: resolveLocation
  }
})
