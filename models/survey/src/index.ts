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

import { type Builder } from '@hcengineering/model'

import core from '@hcengineering/model-core'
import workbench from '@hcengineering/model-workbench'
import { surveyId } from '@hcengineering/survey'
import survey from './plugin'

export { surveyId } from '@hcengineering/survey'
export { default } from './plugin'

export function createModel (builder: Builder): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: survey.string.SurveyApplication,
      icon: survey.icon.SurveyApplication,
      alias: surveyId,
      hidden: false
    },
    survey.app.Survey
  )
}
