import React, { useState } from 'react';

const AdminApp: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState('1');

  const menuItems = [
    { key: '1', label: '仪表盘' },
    { key: '2', label: '用户管理' },
    { key: '3', label: '设置' }
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">管理后台</h1>
        </div>
        <nav className="p-2">
          <ul className="space-y-1">
            {menuItems.map(item => (
              <li key={item.key}>
                <button
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeMenu === item.key 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setActiveMenu(item.key)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm p-4">
          <h2 className="text-xl font-semibold text-gray-800">欢迎使用管理后台</h2>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {menuItems.find(item => item.key === activeMenu)?.label}
            </h3>
            <p className="text-gray-600">
              这是管理后台的内容区域。当前选中：{menuItems.find(item => item.key === activeMenu)?.label}
            </p>
            
            {/* Dashboard Content */}
            {activeMenu === '1' && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800">用户总数</h4>
                  <p className="text-2xl font-bold text-blue-600">1,234</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800">订单数量</h4>
                  <p className="text-2xl font-bold text-green-600">567</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-800">收入统计</h4>
                  <p className="text-2xl font-bold text-purple-600">¥89,000</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminApp;