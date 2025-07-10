import React, { useState, useEffect, useRef } from 'react'
import './QuickInput.css'

declare global {
  interface Window {
    lavel: {
      quickInput: {
        submit: (content: string) => Promise<{ success: boolean }>
        cancel: () => Promise<void>
      }
    }
  }
}

const QuickInput: React.FC = () => {
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // 自动聚焦到输入框
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      await window.lavel.quickInput.submit(input.trim())
    } catch (error) {
      console.error('提交快速输入失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    try {
      await window.lavel.quickInput.cancel()
    } catch (error) {
      console.error('取消快速输入失败:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className="w-full h-screen flex flex-col justify-center items-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl p-5 font-sans">
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入内容..."
          className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-base bg-white dark:bg-gray-700 dark:text-white transition-all duration-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
          disabled={isSubmitting}
          autoComplete="off"
          spellCheck={false}
        />
        
        <div className="flex gap-2 justify-end">
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-all duration-200 outline-none disabled:cursor-not-allowed"
          >
            {isSubmitting ? '提交中...' : '提交'}
          </button>
          
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-md transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
        </div>
      </form>
      
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        按 Enter 提交，按 Esc 取消
      </div>
    </div>
  )
}

export default QuickInput 