import React, { useState } from 'react';

const App: React.FC = () => {
  const [counter, setCounter] = useState(0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">默认页面模板</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">欢迎使用默认页面模板</h2>
          
          <p className="text-gray-600 mb-8">
            这是一个基于React和TailwindCSS构建的默认页面模板，具有响应式设计和现代化的UI组件。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">功能特性</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>响应式布局设计</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>现代化UI组件</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">✓</span>
                  <span>高性能React实现</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">交互演示</h3>
              <div className="flex items-center space-x-4">
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                  onClick={() => setCounter(counter + 1)}
                >
                  点击计数
                </button>
                <span className="text-lg font-medium text-gray-700">计数器: {counter}</span>
                <button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                  onClick={() => setCounter(0)}
                >
                  重置
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">页面信息</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">页面类型</p>
                <p className="font-medium">默认页面</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">技术栈</p>
                <p className="font-medium">React + TailwindCSS</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">计数器值</p>
                <p className="font-medium">{counter}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-6">
        <div className="container mx-auto px-6 text-center text-gray-600">
          <p>© 2025 默认页面模板 - 基于React和TailwindCSS构建</p>
        </div>
      </footer>
    </div>
  );
};

export default App;