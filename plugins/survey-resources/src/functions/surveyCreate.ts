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

import { type DocData, generateId, getCurrentAccount, type Ref, type TxOperations } from '@hcengineering/core'
import type { Survey } from '@hcengineering/survey'
import survey from '../plugin'
import core from '@hcengineering/core/lib/component'

export async function surveyCreate (client: TxOperations, object: DocData<Survey>): Promise<Ref<Survey>> {
  const owner = getCurrentAccount()
  const id = generateId<Survey>()

  return await client.createDoc(
    survey.class.Survey,
    core.space.Space,
    {
      ...object,
      questions: 0,
      description: `Survey ${object.name}`,
      members: [owner._id],
      private: true,
      archived: false
    },
    id
  )
}
