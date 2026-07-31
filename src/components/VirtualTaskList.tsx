import { useRef, useCallback, memo, useState } from 'react'
import React from 'react'

interface VirtualTaskListProps {
  tasks: Array<{ id: number | string; title: string; [key: string]: any }>
  renderItem: (task: any, style: React.CSSProperties) => React.ReactNode
  itemHeight?: number
  overscan?: number
  containerHeight?: number
}

export const VirtualTaskList = memo(function VirtualTaskList({
  tasks,
  renderItem,
  itemHeight = 48,
  overscan = 10,
  containerHeight = 600,
}: VirtualTaskListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = React.useState(0)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const totalHeight = tasks.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(tasks.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan)
  const visibleTasks = tasks.slice(startIndex, endIndex)
  const offsetY = startIndex * itemHeight

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      style={{ height: containerHeight, overflowY: 'auto' }}
      className="virtual-list"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleTasks.map((task, i) =>
          renderItem(task, {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: itemHeight,
            transform: `translateY(${offsetY + i * itemHeight}px)`,
          })
        )}
      </div>
    </div>
  )
})
