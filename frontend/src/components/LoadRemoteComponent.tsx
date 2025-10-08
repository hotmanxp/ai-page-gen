import * as React from 'react'
import ReactDOM from 'react-dom'
import * as antd from 'antd'
import * as antdIcon from '@ant-design/icons'
import * as antdMobile from 'antd-mobile'

const LoadRemoteComponent = ({ pageId }: { pageId: string }) => {
React.useEffect(() => {
  console.log('ReactDOM')
    window.React = React
    window.ReactDOM = ReactDOM
    //@ts-ignore
    window.antd = antd
    //@ts-ignore
    window.icons = antdIcon
    //@ts-ignore
    window.antdMobile = antdMobile
}, [])
const [Component, setComponent] = React.useState<React.ComponentType>()
React.useEffect(() => {
    if(!pageId) return
    const script = document.createElement('script')
    script.src = `/api/pages/${pageId}/component`
    script.onload = () => {
        //@ts-ignore
        const Component = window[`PageComponent_${pageId}`]
        setComponent(() => (Component.default || Component))
    }
    document.body.appendChild(script)

}, [pageId])


if(!Component) {
    return null
}
return (
    <Component />
)

}
export default LoadRemoteComponent