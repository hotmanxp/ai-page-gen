import React, { useState } from 'react';

const H5App: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-500 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">移动端页面</h1>
          <button 
            className="bg-white text-blue-500 rounded-full w-8 h-8 flex items-center justify-center font-bold"
            onClick={() => setCount(count + 1)}
          >
            {count}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">欢迎使用移动端页面模板</h2>
          <p className="text-gray-600 mb-4">
            这是一个基于React和TailwindCSS构建的移动端页面模板。
          </p>
          <div className="flex space-x-2">
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              onClick={() => setCount(count + 1)}
            >
              点击计数
            </button>
            <button 
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
              onClick={() => setCount(0)}
            >
              重置
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-md font-semibold mb-3">功能特点</h3>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-500 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">1</span>
              <span className="text-gray-700">响应式设计，适配各种移动设备</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-500 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">2</span>
              <span className="text-gray-700">使用TailwindCSS进行样式设计</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-500 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">3</span>
              <span className="text-gray-700">轻量级React组件实现</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 p-4 text-center text-gray-500 text-sm">
        <p>© 2025 移动端页面模板</p>
      </footer>
    </div>
  );
};

export default H5App;