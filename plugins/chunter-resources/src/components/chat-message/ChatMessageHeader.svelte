<!--
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
-->
<script lang="ts">
  import { DocNavLink } from '@hcengineering/view-resources'
  import { Doc } from '@hcengineering/core'
  import { Label } from '@hcengineering/ui'
  import { Person } from '@hcengineering/contact'
  import { ChatMessage, ChatMessageViewlet } from '@hcengineering/chunter'
  import { getLinkData, LinkData } from '@hcengineering/activity-resources'
  import notification from '@hcengineering/notification'

  export let message: ChatMessage
  export let person: Person | undefined
  export let viewlet: ChatMessageViewlet | undefined
  export let object: Doc | undefined
  export let parentObject: Doc | undefined

  let linkData: LinkData | undefined = undefined

  $: getLinkData(message, object, parentObject, person).then((data) => {
    linkData = data
  })
</script>

{#if viewlet?.label}
  <span class="text-sm lower"> <Label label={viewlet.label} /></span>

  {#if linkData}
    <span class="text-sm lower"><Label label={linkData.preposition} /></span>
    <span class="text-sm">
      <DocNavLink {object} component={linkData.panelComponent} shrink={0}>
        <span class="overflow-label select-text">{linkData.title}</span>
      </DocNavLink>
    </span>
    {#if message.isEdited}
      <span class="text-sm lower"><Label label={notification.string.Edited} /></span>
    {/if}
  {/if}
{/if}

<style lang="scss">
  span {
    margin-left: 0.25rem;
    font-weight: 400;
    line-height: 1.25rem;
  }
</style>
