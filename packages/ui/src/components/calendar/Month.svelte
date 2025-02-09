<!--
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
-->
<script lang="ts">
  import { afterUpdate, createEventDispatcher } from 'svelte'
  import { capitalizeFirstLetter } from '../../utils'
  import Icon from '../Icon.svelte'
  import IconNavNext from '../icons/NavNext.svelte'
  import IconNavPrev from '../icons/NavPrev.svelte'
  import {
    ICell,
    TCellStyle,
    areDatesEqual,
    day,
    daysInMonth,
    firstDay,
    getMonthName,
    getUserTimezone,
    getWeekDayName
  } from './internal/DateUtils'
  import moment from 'moment-timezone'

  export let currentDate: Date | null
  export let mondayStart: boolean = true
  export let timeZone: string = getUserTimezone()
  export let hideNavigator: boolean = false

  const dispatch = createEventDispatcher()

  let monthYear: string
  const today: Date = new Date(Date.now())
  const viewDate: Date = new Date(currentDate ?? today)
  $: firstDayOfCurrentMonth = firstDay(viewDate, mondayStart)
  const isToday = (n: number): boolean => {
    if (areDatesEqual(today, new Date(viewDate.getFullYear(), viewDate.getMonth(), n))) return true
    return false
  }

  let days: ICell[] = []
  const getDateStyle = (date: Date): TCellStyle => {
    if (currentDate != null) {
      const zonedTime = moment(currentDate).tz(timeZone)
      if (
        zonedTime.date() === date.getDate() &&
        zonedTime.year() === date.getFullYear() &&
        zonedTime.month() === date.getMonth()
      ) {
        return 'selected'
      }
    }
    return 'not-selected'
  }
  const renderCellStyles = (): void => {
    days = []
    for (let i = 1; i <= daysInMonth(viewDate); i++) {
      const tempDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), i)
      days.push({
        dayOfWeek: tempDate.getDay() === 0 ? 7 : tempDate.getDay(),
        style: getDateStyle(tempDate)
      })
    }
    days = days
    monthYear = capitalizeFirstLetter(getMonthName(viewDate)) + ' ' + viewDate.getFullYear()
  }

  afterUpdate(() => {
    if (viewDate) renderCellStyles()
  })
</script>

<div class="month-container">
  <div class="header">
    {#if viewDate}
      <div class="monthYear">{monthYear}</div>
      <div class="group" class:hideNavigator>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="btn"
          on:click={() => {
            viewDate.setMonth(viewDate.getMonth() - 1)
            renderCellStyles()
          }}
        >
          <div class="icon-btn"><Icon icon={IconNavPrev} size={'full'} /></div>
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="btn"
          on:click={() => {
            viewDate.setMonth(viewDate.getMonth() + 1)
            renderCellStyles()
          }}
        >
          <div class="icon-btn"><Icon icon={IconNavNext} size={'full'} /></div>
        </div>
      </div>
    {/if}
  </div>

  {#if viewDate}
    <div class="calendar">
      {#each [...Array(7).keys()] as dayOfWeek}
        <span class="caption"
          >{capitalizeFirstLetter(getWeekDayName(day(firstDayOfCurrentMonth, dayOfWeek), 'short'))}</span
        >
      {/each}
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      {#each days as day, i}
        <div
          class="day {day.style}"
          class:today={isToday(i + 1)}
          class:day-off={day.dayOfWeek > 5}
          style="grid-column: {day.dayOfWeek}/{day.dayOfWeek + 1};"
          on:click|stopPropagation={() => {
            viewDate.setDate(i + 1)
            dispatch('update', viewDate)
          }}
        >
          {i + 1}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .month-container {
    display: flex;
    flex-direction: column;
    min-height: 0;
    width: 100%;
    height: 100%;
    color: var(--caption-color);

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1rem 0.75rem;
      color: var(--caption-color);

      .monthYear {
        font-weight: 500;
        font-size: 1rem;
        &::first-letter {
          text-transform: capitalize;
        }
      }
      .group {
        display: flex;
        align-items: center;

        &.hideNavigator {
          visibility: hidden;
        }
        .btn {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 1.25rem;
          height: 1.75rem;
          color: var(--dark-color);
          cursor: pointer;

          .icon-btn {
            height: 0.75rem;
          }
          &:hover {
            color: var(--accent-color);
          }
        }
      }
    }
  }

  .calendar {
    position: relative;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    padding: 0 1rem 1rem;

    .caption,
    .day {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 2rem;
      height: 2rem;
      margin: 0.125rem;
      font-size: 1rem;
      color: var(--content-color);
    }
    .caption {
      align-items: start;
      height: 2rem;
      color: var(--dark-color);
      &::first-letter {
        text-transform: capitalize;
      }
    }
    .day {
      position: relative;
      color: var(--accent-color);
      background-color: rgba(var(--accent-color), 0.05);
      border: 1px solid transparent;
      border-radius: 0.25rem;
      cursor: pointer;

      &.day-off {
        color: var(--content-color);
      }
      &.today:not(.selected, :hover) {
        font-weight: 500;
        background-color: rgba(76, 56, 188, 0.2);
        border-radius: 50%;
      }
      &.focused {
        box-shadow: 0 0 0 3px var(--primary-button-outline);
      }
      &.selected {
        color: var(--primary-button-color);
        background-color: var(--primary-button-default);
      }
      &:hover {
        color: var(--caption-color);
        background-color: var(--primary-button-transparent);
      }

      &:before {
        content: '';
        position: absolute;
        inset: -0.625rem;
      }
    }

    &::before {
      position: absolute;
      content: '';
      top: 2rem;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: var(--button-bg-color);
    }
  }
</style>
