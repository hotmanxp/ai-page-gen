import { Outlet } from 'react-router-dom'
import { Layout as AntLayout } from 'antd'

const { Header, Content } = AntLayout

function Layout() {
  return (
    <AntLayout className="h-screen">
      <Header className="bg-white shadow-sm flex items-center px-6">
        <div className="text-xl font-bold text-gray-800">AI页面生成器</div>
      </Header>
      <Content className="bg-gray-50">
        <Outlet />
      </Content>
    </AntLayout>
  )
}

export default Layout