import React, { useState, useRef, useEffect } from "react"
import PaddleOCR from "paddleocr-js"
import "./OCRComponent.css"

// 组件属性接口
interface OCRComponentProps {
  // 模型路径，默认为'/models'
  modelPath?: string
  // 识别语言，默认为'ch'（中文）
  language?: string
  // 是否使用WebAssembly加速，默认为true
  useWasm?: boolean
  // 是否启用表格识别，默认为false
  enableTable?: boolean
  // 是否启用版面分析，默认为false
  enableLayout?: boolean
  // 初始化后的回调函数
  onInitialized?: () => void
  // 识别结果回调函数
  onResult?: (result: any) => void
}

/**
 * PaddleOCR React组件
 * 提供OCR识别功能，支持拖拽上传、相机拍照和选择本地文件
 */
const OCRComponent: React.FC<OCRComponentProps> = ({
  modelPath = "/models",
  language = "ch",
  useWasm = true,
  enableTable = false,
  enableLayout = false,
  onInitialized,
  onResult,
}) => {
  // OCR实例
  const [ocrInstance, setOcrInstance] = useState<any>(null)

  // 界面状态
  const [isInitializing, setIsInitializing] = useState<boolean>(false)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [progressStage, setProgressStage] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  // 识别结果
  const [result, setResult] = useState<any>(null)
  const [resultType, setResultType] = useState<"text" | "table" | "layout">(
    "text"
  )

  // 图像数据
  const [imageData, setImageData] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<{
    width: number
    height: number
  } | null>(null)

  // DOM引用
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const resultCanvasRef = useRef<HTMLCanvasElement>(null)

  // 拍照相关
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isCapturing, setIsCapturing] = useState<boolean>(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // 初始化OCR
  useEffect(() => {
    const initializeOCR = async () => {
      try {
        setIsInitializing(true)
        setError(null)

        // 创建OCR实例
        const paddleOCR = new PaddleOCR({
          modelPath,
          language,
          useWasm,
          enableTable,
          enableLayout,
          onProgress: (p, stage) => {
            setProgress(p)
            setProgressStage(stage)
          },
        })

        // 初始化模型
        await paddleOCR.init()

        setOcrInstance(paddleOCR)
        setIsInitialized(true)

        if (onInitialized) {
          onInitialized()
        }
      } catch (err) {
        console.error("OCR初始化失败:", err)
        setError(`初始化失败: ${(err as Error).message}`)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeOCR()

    // 组件卸载时释放资源
    return () => {
      if (ocrInstance) {
        ocrInstance.dispose().catch(console.error)
      }
      stopCamera()
    }
  }, [modelPath, language, useWasm, enableTable, enableLayout, onInitialized])

  // 清理函数
  const resetState = () => {
    setImageData(null)
    setImageSize(null)
    setResult(null)
    setError(null)
  }

  // 处理文件上传
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    resetState()

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataURL = e.target?.result as string
      loadImage(dataURL)
    }
    reader.onerror = () => {
      setError("文件读取错误")
    }
    reader.readAsDataURL(file)
  }

  // 处理拖放文件
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const file = event.dataTransfer.files[0]
    if (!file) return

    resetState()

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataURL = e.target?.result as string
      loadImage(dataURL)
    }
    reader.onerror = () => {
      setError("文件读取错误")
    }
    reader.readAsDataURL(file)
  }

  // 处理拖拽事件
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  // 加载图像到Canvas
  const loadImage = (src: string) => {
    const img = new Image()
    img.onload = () => {
      if (!canvasRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // 计算适合显示区域的尺寸，保持纵横比
      const maxWidth = 600
      const scale = img.width > maxWidth ? maxWidth / img.width : 1

      const width = Math.floor(img.width * scale)
      const height = Math.floor(img.height * scale)

      // 设置Canvas尺寸
      canvas.width = width
      canvas.height = height

      // 清除Canvas
      ctx.clearRect(0, 0, width, height)

      // 绘制图像
      ctx.drawImage(img, 0, 0, width, height)

      // 保存图像信息
      setImageData(src)
      setImageSize({ width: img.width, height: img.height })
    }
    img.onerror = () => {
      setError("图像加载失败")
    }
    img.src = src
  }

  // 执行OCR识别
  const performOCR = async () => {
    if (!ocrInstance || !imageData || !isInitialized) {
      setError("OCR未初始化或未加载图像")
      return
    }

    try {
      setIsProcessing(true)
      setError(null)

      let recognitionResult

      // 根据启用的功能选择处理方法
      if (enableLayout) {
        recognitionResult = await ocrInstance.analyzeLayout(canvasRef.current!)
        setResultType("layout")
      } else if (enableTable) {
        recognitionResult = await ocrInstance.recognizeTable(canvasRef.current!)
        setResultType("table")
      } else {
        recognitionResult = await ocrInstance.recognize(canvasRef.current!)
        setResultType("text")
      }

      setResult(recognitionResult)

      // 在结果Canvas上绘制检测框
      drawDetectionBoxes(recognitionResult)

      // 调用结果回调
      if (onResult) {
        onResult(recognitionResult)
      }
    } catch (err) {
      console.error("OCR处理失败:", err)
      setError(`处理失败: ${(err as Error).message}`)
      setResult(null)
    } finally {
      setIsProcessing(false)
    }
  }

  // 绘制检测框
  const drawDetectionBoxes = (result: any) => {
    if (!resultCanvasRef.current || !canvasRef.current || !result) return

    const resultCanvas = resultCanvasRef.current
    const sourceCanvas = canvasRef.current

    resultCanvas.width = sourceCanvas.width
    resultCanvas.height = sourceCanvas.height

    const ctx = resultCanvas.getContext("2d")
    if (!ctx) return

    // 先绘制原始图像
    ctx.drawImage(sourceCanvas, 0, 0)

    // 如果是文本识别结果，绘制检测框
    if (
      resultType === "text" &&
      result.textDetection &&
      result.textDetection.length > 0
    ) {
      result.textDetection.forEach((box: any, index: number) => {
        if (!box.box || box.box.length !== 4) return

        // 绘制框
        ctx.beginPath()
        ctx.moveTo(box.box[0].x, box.box[0].y)
        ctx.lineTo(box.box[1].x, box.box[1].y)
        ctx.lineTo(box.box[2].x, box.box[2].y)
        ctx.lineTo(box.box[3].x, box.box[3].y)
        ctx.closePath()

        ctx.strokeStyle = "rgba(0, 255, 0, 0.8)"
        ctx.lineWidth = 2
        ctx.stroke()

        // 绘制索引标签
        ctx.fillStyle = "rgba(0, 255, 0, 0.7)"
        ctx.fillRect(box.box[0].x, box.box[0].y - 20, 20, 20)
        ctx.fillStyle = "white"
        ctx.font = "14px Arial"
        ctx.fillText(String(index + 1), box.box[0].x + 5, box.box[0].y - 5)
      })
    }
    // 如果是版面分析结果，绘制区域框
    else if (
      resultType === "layout" &&
      result.regions &&
      result.regions.length > 0
    ) {
      const colors: Record<string, string> = {
        text: "rgba(0, 255, 0, 0.3)",
        title: "rgba(0, 0, 255, 0.3)",
        figure: "rgba(255, 0, 0, 0.3)",
        table: "rgba(255, 165, 0, 0.3)",
        list: "rgba(128, 0, 128, 0.3)",
      }

      result.regions.forEach((region: any) => {
        if (!region.box || region.box.length !== 4) return

        const color = colors[region.type] || "rgba(128, 128, 128, 0.3)"

        // 绘制填充区域
        ctx.beginPath()
        ctx.moveTo(region.box[0].x, region.box[0].y)
        ctx.lineTo(region.box[1].x, region.box[1].y)
        ctx.lineTo(region.box[2].x, region.box[2].y)
        ctx.lineTo(region.box[3].x, region.box[3].y)
        ctx.closePath()

        ctx.fillStyle = color
        ctx.fill()

        // 绘制边框
        ctx.strokeStyle = color.replace("0.3", "0.8")
        ctx.lineWidth = 2
        ctx.stroke()

        // 绘制类型标签
        ctx.fillStyle = color.replace("0.3", "0.7")
        ctx.fillRect(region.box[0].x, region.box[0].y - 25, 80, 20)
        ctx.fillStyle = "white"
        ctx.font = "12px Arial"
        ctx.fillText(region.type, region.box[0].x + 5, region.box[0].y - 10)
      })
    }
  }

  // 初始化摄像头设备列表
  const initCameraDevices = async () => {
    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = mediaDevices.filter(
        (device) => device.kind === "videoinput"
      )
      setDevices(videoDevices)

      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId)
      }
    } catch (err) {
      console.error("获取摄像头设备失败:", err)
      setError(`无法访问摄像头: ${(err as Error).message}`)
    }
  }

  // 启动摄像头
  const startCamera = async () => {
    try {
      if (!selectedDeviceId) {
        await initCameraDevices()
        return
      }

      // 停止之前的摄像头流
      stopCamera()

      // 重置状态
      resetState()

      // 打开摄像头
      const constraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        mediaStreamRef.current = stream
        setIsCapturing(true)
      }
    } catch (err) {
      console.error("启动摄像头失败:", err)
      setError(`启动摄像头失败: ${(err as Error).message}`)
      setIsCapturing(false)
    }
  }

  // 停止摄像头
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsCapturing(false)
  }

  // 拍照
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // 设置Canvas尺寸为视频尺寸
    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight

    // 计算适合显示区域的尺寸，保持纵横比
    const maxWidth = 600
    const scale = videoWidth > maxWidth ? maxWidth / videoWidth : 1

    const width = Math.floor(videoWidth * scale)
    const height = Math.floor(videoHeight * scale)

    canvas.width = width
    canvas.height = height

    // 清除Canvas
    ctx.clearRect(0, 0, width, height)

    // 绘制视频帧到Canvas
    ctx.drawImage(video, 0, 0, width, height)

    // 获取图像数据
    setImageData(canvas.toDataURL("image/png"))
    setImageSize({ width: videoWidth, height: videoHeight })

    // 停止摄像头
    stopCamera()
  }

  // 清除当前图像和结果
  const clearCanvas = () => {
    resetState()

    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    if (resultCanvasRef.current) {
      const canvas = resultCanvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }

  // 切换识别模式
  const changeOCRMode = (newType: "text" | "table" | "layout") => {
    const shouldUpdateType = newType !== resultType

    if (resultType === "text" && newType === "table") {
      setResultType("table")
      if (ocrInstance) {
        ocrInstance.updateOptions({ enableTable: true, enableLayout: false })
      }
    } else if (resultType === "text" && newType === "layout") {
      setResultType("layout")
      if (ocrInstance) {
        ocrInstance.updateOptions({ enableTable: false, enableLayout: true })
      }
    } else if (resultType === "table" && newType === "text") {
      setResultType("text")
      if (ocrInstance) {
        ocrInstance.updateOptions({ enableTable: false, enableLayout: false })
      }
    } else if (resultType === "table" && newType === "layout") {
      setResultType("layout")
      if (ocrInstance) {
        ocrInstance.updateOptions({ enableTable: false, enableLayout: true })
      }
    } else if (resultType === "layout" && newType === "text") {
      setResultType("text")
      if (ocrInstance) {
        ocrInstance.updateOptions({ enableTable: false, enableLayout: false })
      }
    } else if (resultType === "layout" && newType === "table") {
      setResultType("table")
      if (ocrInstance) {
        ocrInstance.updateOptions({ enableTable: true, enableLayout: false })
      }
    }

    if (shouldUpdateType && imageData) {
      // 如果已有图像且类型改变，重新执行OCR
      setTimeout(performOCR, 0)
    }
  }

  // 渲染文本识别结果
  const renderTextResult = () => {
    if (
      !result ||
      !result.textRecognition ||
      result.textRecognition.length === 0
    ) {
      return <div className='no-result'>无识别结果</div>
    }

    return (
      <div className='text-result'>
        <div className='result-header'>
          <h3>识别结果</h3>
          <span className='result-count'>
            {result.textRecognition.length} 个文本
          </span>
        </div>
        <div className='result-content'>
          {result.textRecognition.map((item: any, index: number) => (
            <div key={index} className='text-item'>
              <span className='text-index'>{index + 1}.</span>
              <span className='text-content'>{item.text}</span>
              <span className='text-score'>
                {(item.score * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
        <div className='timing-info'>
          <p>预处理: {result.duration?.preprocess || 0}ms</p>
          <p>检测: {result.duration?.detection || 0}ms</p>
          <p>识别: {result.duration?.recognition || 0}ms</p>
          <p>总耗时: {result.duration?.total || 0}ms</p>
        </div>
      </div>
    )
  }

  // 渲染表格识别结果
  const renderTableResult = () => {
    if (!result || !result.html) {
      return <div className='no-result'>无表格结果</div>
    }

    return (
      <div className='table-result'>
        <div className='result-header'>
          <h3>表格识别结果</h3>
          <span className='result-count'>
            {result.cells?.length || 0} 个单元格
          </span>
        </div>
        <div
          className='table-html'
          dangerouslySetInnerHTML={{ __html: result.html }}
        />
      </div>
    )
  }

  // 渲染版面分析结果
  const renderLayoutResult = () => {
    if (!result || !result.regions || result.regions.length === 0) {
      return <div className='no-result'>无版面分析结果</div>
    }

    return (
      <div className='layout-result'>
        <div className='result-header'>
          <h3>版面分析结果</h3>
          <span className='result-count'>{result.regions.length} 个区域</span>
        </div>
        <div className='region-list'>
          {result.regions.map((region: any, index: number) => (
            <div key={index} className={`region-item region-${region.type}`}>
              <div className='region-header'>
                <span className='region-type'>{region.type}</span>
                <span className='region-score'>
                  {(region.score * 100).toFixed(1)}%
                </span>
              </div>
              <div className='region-content'>
                {region.type === "table" && region.content ? (
                  <div
                    className='table-html'
                    dangerouslySetInnerHTML={{ __html: region.content.html }}
                  />
                ) : (
                  <p>{region.content || "(无内容)"}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='ocr-component'>
      <div className='ocr-header'>
        <h2>PaddleOCR 文字识别</h2>
        <div className='ocr-controls'>
          <div className='ocr-mode-selector'>
            <button
              className={`mode-btn ${resultType === "text" ? "active" : ""}`}
              onClick={() => changeOCRMode("text")}
              disabled={isProcessing}
            >
              文本识别
            </button>
            <button
              className={`mode-btn ${resultType === "table" ? "active" : ""}`}
              onClick={() => changeOCRMode("table")}
              disabled={isProcessing}
            >
              表格识别
            </button>
            <button
              className={`mode-btn ${resultType === "layout" ? "active" : ""}`}
              onClick={() => changeOCRMode("layout")}
              disabled={isProcessing}
            >
              版面分析
            </button>
          </div>
        </div>
      </div>

      <div className='ocr-main'>
        <div className='ocr-input-panel'>
          <div
            className='dropzone'
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {isCapturing ? (
              <div className='video-container'>
                <video ref={videoRef} autoPlay playsInline muted />
                <div className='camera-controls'>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    disabled={devices.length <= 1}
                  >
                    {devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `相机 ${devices.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                  <button onClick={captureImage}>拍照</button>
                  <button onClick={stopCamera}>取消</button>
                </div>
              </div>
            ) : (
              <>
                <canvas ref={canvasRef} className='preview-canvas' />
                <canvas ref={resultCanvasRef} className='result-canvas' />
                {imageData ? null : (
                  <div className='dropzone-placeholder'>
                    <p>拖放图像到此处</p>
                    <p>或</p>
                    <div className='upload-buttons'>
                      <button onClick={() => fileInputRef.current?.click()}>
                        选择文件
                      </button>
                      <button onClick={startCamera}>使用相机</button>
                    </div>
                    <input
                      type='file'
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept='image/*'
                      style={{ display: "none" }}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {imageData && !isCapturing && (
            <div className='image-controls'>
              <button
                onClick={performOCR}
                disabled={isProcessing || !isInitialized}
                className='primary-button'
              >
                {isProcessing ? "处理中..." : "开始识别"}
              </button>
              <button onClick={clearCanvas}>清除</button>
            </div>
          )}

          {error && (
            <div className='error-message'>
              <p>{error}</p>
            </div>
          )}

          {isInitializing && (
            <div className='loading-indicator'>
              <div className='progress-bar'>
                <div
                  className='progress-fill'
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p>{progressStage || "初始化中..."}</p>
            </div>
          )}
        </div>

        <div className='ocr-result-panel'>
          {resultType === "text" && renderTextResult()}
          {resultType === "table" && renderTableResult()}
          {resultType === "layout" && renderLayoutResult()}
        </div>
      </div>
    </div>
  )
}

export default OCRComponent
