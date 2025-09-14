import { useEffect, useRef } from 'react'

interface PreviewAreaProps {
  pageType: string
  pageContent?: string
}

function PreviewArea({ pageType, pageContent }: PreviewAreaProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (pageContent && iframeRef.current) {
      // 创建完整的HTML文档
      const iframe = iframeRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      
      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write(pageContent)
        iframeDoc.close()
      }
    }
  }, [pageContent])

  const getPreviewFrame = () => {
    if (pageType === 'h5') {
      return (
        <div className="flex justify-center items-center h-full">
          <div className="relative">
            {/* Phone frame */}
            <div className="w-80 h-[640px] bg-gray-900 rounded-[30px] p-3 shadow-lg">
              <div className="w-full h-full bg-white rounded-[20px] overflow-hidden">
                <iframe
                  ref={iframeRef}
                  className="w-full h-full border-0"
                  src="about:blank"
                  title="Mobile Preview"
                />
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="h-full bg-white rounded-lg overflow-hidden border">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          src="about:blank"
          title="Page Preview"
        />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-200px)]">
      {getPreviewFrame()}
    </div>
  )
}

export default PreviewArea