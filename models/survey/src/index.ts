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
import { type Class, type Ref } from '@hcengineering/core'
import core from '@hcengineering/model-core'
import workbench from '@hcengineering/model-workbench'
import {
  type QuestionData,
  type QuestionDataEditor,
  type QuestionDataEditorComponent,
  surveyId
} from '@hcengineering/survey'
import survey from './plugin'
import view from '@hcengineering/model-view'
import {
  TCheckboxes,
  TInfo,
  TQuestion,
  TQuestionData,
  TQuestionDataEditor,
  TRadioButtons,
  TSurvey,
  TTypeRank
} from './types'

export { surveyOperation } from './migration'
export { surveyId } from '@hcengineering/survey'
export { default } from './plugin'

// TODO: Should we place it into plugin itself, e.g. survey.routingParts.surveyId?
export enum SurveyRoutingParts {
  SurveysId = 'surveys'
}

export function createModel (builder: Builder): void {
  defineSurvey(builder)
  defineQuestion(builder)
  defineQuestionTypes(builder)
  defineApplication(builder)
}

export function defineQuestionDataEditor<TQuestionData extends QuestionData> (
  builder: Builder,
  questionClassRef: Ref<Class<TQuestionData>>,
  editor: QuestionDataEditorComponent<TQuestionData>
): void {
  builder.mixin<Class<TQuestionData>, QuestionDataEditor<TQuestionData>>(
    questionClassRef,
    core.class.Class,
    survey.mixin.QuestionDataEditor,
    {
      editor
    }
  )
}

function defineSurvey (builder: Builder): void {
  builder.createModel(TSurvey)
  builder.createDoc(
    view.class.Viewlet,
    core.space.Model,
    {
      attachTo: survey.class.Survey,
      descriptor: view.viewlet.Table,
      config: [
        {
          key: '',
          label: survey.string.SurveyName,
          presenter: survey.component.SurveyNamePresenter
        },
        {
          key: 'questions',
          label: survey.string.Questions,
          presenter: view.component.NumberPresenter
        },
        'createdBy',
        'createdOn',
        'modifiedBy',
        'modifiedOn'
      ]
    },
    survey.viewlet.SurveysTable
  )
  builder.mixin(survey.class.Survey, core.class.Class, view.mixin.IgnoreActions, {
    actions: [
      // TODO: Conditionally disable delete
      view.action.Open,
      view.action.Archive
    ]
  })
}

function defineQuestion (builder: Builder): void {
  builder.createModel(TQuestion, TTypeRank)
  builder.mixin(survey.class.Question, core.class.Class, view.mixin.CollectionEditor, {
    editor: survey.component.QuestionCollectionEditor
  })
}

function defineQuestionTypes (builder: Builder): void {
  builder.createModel(TQuestionDataEditor)
  builder.createModel(TQuestionData)

  builder.createModel(TCheckboxes)
  defineQuestionDataEditor(builder, survey.class.Checkboxes, survey.component.OptionsQuestionDataEditor)

  builder.createModel(TInfo)
  // TODO: Define editor
  // builder.mixin(survey.class.InfoQuestionTemplate, core.class.Class, view.mixin.ObjectEditor, {
  //   editor: ...
  // })

  builder.createModel(TRadioButtons)
  defineQuestionDataEditor(builder, survey.class.RadioButtons, survey.component.OptionsQuestionDataEditor)
}

function defineApplication (builder: Builder): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: survey.string.SurveyApplication,
      icon: survey.icon.SurveyApplication,
      alias: surveyId,
      hidden: false,
      navigatorModel: {
        spaces: [],
        specials: [
          {
            id: SurveyRoutingParts.SurveysId,
            position: 'top',
            component: workbench.component.SpecialView,
            icon: survey.icon.Survey,
            label: survey.string.Surveys,
            componentProps: {
              _class: survey.class.Survey,
              icon: survey.icon.Survey,
              label: survey.string.Surveys,
              createLabel: survey.string.SurveyCreate,
              createComponent: survey.component.SurveyCreator
            }
          }
        ]
      }
    },
    survey.app.SurveyApplication
  )
}
