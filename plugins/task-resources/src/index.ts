//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { get, writable } from 'svelte/store'
import {
  toIdMap,
  type Attribute,
  type Class,
  type Doc,
  type DocumentQuery,
  type IdMap,
  type Ref,
  type Status,
  type TxOperations
} from '@hcengineering/core'
import { type IntlString, type Resources } from '@hcengineering/platform'
import { createQuery, getClient } from '@hcengineering/presentation'
import task, {
  calcRank,
  getStatusIndex,
  type Project,
  type ProjectType,
  type Task,
  type TaskType
} from '@hcengineering/task'
import { getCurrentLocation, navigate, showPopup } from '@hcengineering/ui'
import { type ViewletDescriptor } from '@hcengineering/view'
import { CategoryQuery, statusStore } from '@hcengineering/view-resources'

import AssignedTasks from './components/AssignedTasks.svelte'
import CreateStatePopup from './components/CreateStatePopup.svelte'
import Dashboard from './components/Dashboard.svelte'
import DueDateEditor from './components/DueDateEditor.svelte'
import KanbanTemplatePresenter from './components/KanbanTemplatePresenter.svelte'
import StatusFilter from './components/StatusFilter.svelte'
import StatusSelector from './components/StatusSelector.svelte'
import StatusTableView from './components/StatusTableView.svelte'
import TaskHeader from './components/TaskHeader.svelte'
import TaskPresenter from './components/TaskPresenter.svelte'
import TemplatesIcon from './components/TemplatesIcon.svelte'
import TypesView from './components/TypesView.svelte'
import KanbanView from './components/kanban/KanbanView.svelte'
import ProjectEditor from './components/projectTypes/ProjectEditor.svelte'
import ProjectTypeSelector from './components/projectTypes/ProjectTypeSelector.svelte'
import StateEditor from './components/state/StateEditor.svelte'
import StatePresenter from './components/state/StatePresenter.svelte'
import StateRefPresenter from './components/state/StateRefPresenter.svelte'
import TypeStatesPopup from './components/state/TypeStatesPopup.svelte'
import TaskTypeClassPresenter from './components/taskTypes/TaskTypeClassPresenter.svelte'
import ProjectTypeClassPresenter from './components/taskTypes/ProjectTypeClassPresenter.svelte'
import TaskTypePresenter from './components/taskTypes/TaskTypePresenter.svelte'
import ProjectTypePresenter from './components/projectTypes/ProjectTypePresenter.svelte'
import TodoItemPresenter from './components/todos/TodoItemPresenter.svelte'
import TodoItemsPopup from './components/todos/TodoItemsPopup.svelte'
import TodoStatePresenter from './components/todos/TodoStatePresenter.svelte'
import Todos from './components/todos/Todos.svelte'
import StateIconPresenter from './components/state/StateIconPresenter.svelte'
import TaskKindSelector from './components/taskTypes/TaskKindSelector.svelte'

import ManageProjects from './components/projectTypes/ManageProjects.svelte'
import ManageProjectsTools from './components/projectTypes/ManageProjectsTools.svelte'
import ManageProjectsContent from './components/projectTypes/ManageProjectsContent.svelte'

export { default as AssigneePresenter } from './components/AssigneePresenter.svelte'
export { default as TypeSelector } from './components/TypeSelector.svelte'
export * from './utils'
export { StatePresenter, StateRefPresenter, TypeStatesPopup, TaskKindSelector }

async function editStatuses (object: Project, ev: Event): Promise<void> {
  const client = getClient()
  const descriptor = await client.findOne(task.class.ProjectTypeDescriptor, { attachedToClass: object._class })
  const loc = getCurrentLocation()
  loc.path[2] = 'setting'
  loc.path[3] = 'setting'
  loc.path[4] = 'statuses'
  loc.query =
    descriptor != null
      ? {
          descriptorId: descriptor._id,
          typeId: object.type
        }
      : {
          typeId: object.type
        }
  navigate(loc)
}

async function selectStatus (
  doc: Task | Task[],
  ev: any,
  props: {
    ofAttribute: Ref<Attribute<Status>>
    placeholder: IntlString
    _class: Ref<Class<Status>>
  }
): Promise<void> {
  showPopup(
    StatusSelector,
    { value: doc, ofAttribute: props.ofAttribute, _class: props._class, placeholder: props.placeholder },
    'top'
  )
}

export type StatesBarPosition = 'start' | 'middle' | 'end' | undefined

export default async (): Promise<Resources> => ({
  component: {
    TaskPresenter,
    KanbanTemplatePresenter,
    Dashboard,
    KanbanView,
    StatePresenter,
    StateEditor,
    Todos,
    TodoItemPresenter,
    TodoStatePresenter,
    StatusTableView,
    TaskHeader,
    ProjectEditor,
    ProjectTypeSelector,
    AssignedTasks,
    StateRefPresenter,
    TodoItemsPopup,
    DueDateEditor,
    CreateStatePopup,
    StatusSelector,
    TemplatesIcon,
    TypesView,
    StateIconPresenter,
    StatusFilter,
    TaskTypePresenter,
    TaskTypeClassPresenter,
    ProjectTypeClassPresenter,
    ManageProjects,
    ManageProjectsTools,
    ManageProjectsContent,
    ProjectTypePresenter
  },
  actionImpl: {
    EditStatuses: editStatuses,
    SelectStatus: selectStatus
  },
  function: {
    GetAllStates: getAllStates,
    StatusSort: statusSort
  }
})

async function getAllStates (
  query: DocumentQuery<Doc> | undefined,
  onUpdate: () => void,
  queryId: Ref<Doc>,
  attr: Attribute<Status>
): Promise<any[]> {
  const typeId = get(selectedTypeStore)
  const taskTypeId = get(selectedTaskTypeStore)
  if (taskTypeId === undefined) {
    return []
  }
  const type = typeId !== undefined ? get(typeStore).get(typeId) : undefined
  const taskType = get(taskTypeStore).get(taskTypeId)
  if (taskType === undefined) {
    return []
  }
  if (type !== undefined) {
    const statusMap = get(statusStore).byId
    const statuses = (taskType.statuses.map((p) => statusMap.get(p)) as Status[]) ?? []
    return statuses
      .filter((p) => p?.category !== task.statusCategory.Lost && p?.category !== task.statusCategory.Won)
      .map((p) => p?._id)
  }
  const _space = query?.space
  if (_space !== undefined) {
    const promise = new Promise<Array<Ref<Doc>>>((resolve, reject) => {
      let refresh: boolean = false
      const lq = CategoryQuery.getLiveQuery(queryId)
      refresh = lq.query(task.class.Project, { _id: _space as Ref<Project> }, (res) => {
        const statusMap = get(statusStore).byId
        const statuses = (taskType.statuses.map((p) => statusMap.get(p)) as Status[]) ?? []
        const result = statuses
          .filter((p) => p?.category !== task.statusCategory.Lost && p?.category !== task.statusCategory.Won)
          .map((p) => p?._id)
        CategoryQuery.results.set(queryId, result)
        resolve(result)
        onUpdate()
      })

      if (!refresh) {
        resolve(CategoryQuery.results.get(queryId) ?? [])
      }
    })
    return await promise
  }
  return get(statusStore)
    .array.filter(
      (p) =>
        p.ofAttribute === attr._id && p.category !== task.statusCategory.Lost && p.category !== task.statusCategory.Won
    )
    .map((p) => p._id)
}

async function statusSort (
  client: TxOperations,
  value: Array<Ref<Status>>,
  space: Ref<Project> | undefined,
  viewletDescriptorId?: Ref<ViewletDescriptor>
): Promise<Array<Ref<Status>>> {
  const typeId = get(selectedTypeStore)
  const type = typeId !== undefined ? get(typeStore).get(typeId) : undefined
  const statuses = get(statusStore).byId
  const taskTypes = get(taskTypeStore)

  if (type !== undefined) {
    value.sort((a, b) => {
      const aVal = statuses.get(a) as Status
      const bVal = statuses.get(b) as Status
      if (type != null) {
        const aIndex = getStatusIndex(type, taskTypes, a)
        const bIndex = getStatusIndex(type, taskTypes, b)
        return aIndex - bIndex
      } else {
        return aVal.name.localeCompare(bVal.name)
      }
    })
  } else {
    const res = new Map<Ref<Status>, string>()
    let prevRank: string | undefined
    const types = await client.findAll(task.class.ProjectType, {})
    for (const state of value) {
      if (res.has(state)) continue
      const index = types.findIndex((p) => p.tasks.some((q) => taskTypes.get(q)?.statuses.includes(state)))
      if (index === -1) break
      const type = types.splice(index, 1)[0]
      const statuses =
        type.tasks.map((it) => taskTypes.get(it)).find((it) => it?.statuses.includes(state))?.statuses ?? []

      // TODO: Check correctness
      for (let index = 0; index < statuses.length; index++) {
        const st = statuses[index]
        const prev = index > 0 ? res.get(statuses[index - 1]) : prevRank
        const next = index < statuses.length - 1 ? res.get(statuses[index + 1]) : undefined
        const rank = calcRank(
          prev !== undefined ? { rank: prev } : undefined,
          next !== undefined ? { rank: next } : undefined
        )
        res.set(st, rank)
        prevRank = rank
      }
    }
    const result: Array<{
      _id: Ref<Status>
      rank: string
    }> = []
    for (const [key, value] of res.entries()) {
      result.push({ _id: key, rank: value })
    }
    result.sort((a, b) => a.rank.localeCompare(b.rank))
    return result.filter((p) => value.includes(p._id)).map((p) => p._id)
  }
  return value
}

export const typeStore = writable<IdMap<ProjectType>>(new Map())
export const taskTypeStore = writable<IdMap<TaskType>>(new Map())

function fillStores (): void {
  const client = getClient()

  if (client !== undefined) {
    const query = createQuery(true)
    query.query(task.class.ProjectType, {}, (res) => {
      typeStore.set(toIdMap(res))
    })

    const taskQuery = createQuery(true)
    taskQuery.query(task.class.TaskType, {}, (res) => {
      taskTypeStore.set(toIdMap(res))
    })
  } else {
    setTimeout(() => {
      fillStores()
    }, 50)
  }
}

fillStores()

export const selectedTypeStore = writable<Ref<ProjectType> | undefined>(undefined)
export const selectedTaskTypeStore = writable<Ref<TaskType> | undefined>(undefined)

export const activeProjects = writable<IdMap<Project>>(new Map())
const activeProjectsQuery = createQuery(true)

activeProjectsQuery.query(task.class.Project, { archived: false }, (projects) => {
  activeProjects.set(toIdMap(projects))
})
