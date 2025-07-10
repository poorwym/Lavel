import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [electronStatus, setElectronStatus] = useState<string>('检测中...')
  const [platform, setPlatform] = useState<string>('未知')
  const [quickInputHistory, setQuickInputHistory] = useState<string[]>([])

  useEffect(() => {
    // 检测是否在 Electron 环境中
    if (window.lavel) {
      setElectronStatus('✅ Electron 环境检测成功')
      setPlatform(window.lavel.platform)
      
      // 监听快速输入内容
      const handleQuickInput = (event: any, content: string) => {
        console.log('收到快速输入:', content)
        setQuickInputHistory(prev => [content, ...prev.slice(0, 9)]) // 保留最近10条
      }
      
      window.lavel.on('quick-input-received', handleQuickInput)
      
      return () => {
        window.lavel.off('quick-input-received', handleQuickInput)
      }
    } else {
      setElectronStatus('❌ 浏览器环境（非 Electron）')
    }
  }, [])

  const testElectronAPI = async () => {
    if (window.lavel) {
      try {
        const result = await window.lavel.ping()
        alert(`Electron API 测试成功: ${result}`)
      } catch (error) {
        alert(`Electron API 测试失败: ${error}`)
      }
    } else {
      alert('当前不在 Electron 环境中')
    }
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Lavel Desktop App</h1>
      
      {/* Electron 状态信息 */}
      <div className="card">
        <h3>🖥️ 环境信息</h3>
        <p>{electronStatus}</p>
        <p>平台: {platform}</p>
      </div>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          计数器: {count}
        </button>
        <button onClick={testElectronAPI} style={{ marginLeft: '10px' }}>
          测试 Electron API
        </button>
        <p>
          编辑 <code>src/App.tsx</code> 并保存以测试热重载
        </p>
      </div>

      {/* 快速输入历史 */}
      <div className="card">
        <h3>⚡ 快速输入历史</h3>
        <p style={{ fontSize: '14px', color: '#666' }}>
          使用 {platform === 'darwin' ? 'Cmd+Space' : 'Ctrl+Space'} 触发快速输入
        </p>
        {quickInputHistory.length > 0 ? (
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {quickInputHistory.map((item, index) => (
              <div 
                key={index} 
                style={{ 
                  padding: '8px 12px', 
                  margin: '4px 0', 
                  background: '#f5f5f5', 
                  borderRadius: '4px',
                  fontSize: '14px',
                  textAlign: 'left'
                }}
              >
                {item}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#999', fontStyle: 'italic' }}>
            暂无快速输入记录
          </p>
        )}
      </div>
      
      <p className="read-the-docs">
        点击 Vite 和 React 图标了解更多信息
      </p>
    </>
  )
}

export default App
