import { useEffect, useRef, useState } from 'react'
import './App.css'

const canvasWidth = 448
const canvasHeight = 400

const paddleHeight = 10
const paddleWidth = 50

const ballRadius = 3
const ballSpeed = 3

const textColor = 'white'

const frameRate = 60
const msPerFrame = 1000 / frameRate

const clamp = (value: number, min: number, max: number) => {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

const clampInWidth = (value: number, offset: number = 0) => clamp(value, 0, canvasWidth - offset)
const clampInHeight = (value: number, offset: number = 0) => clamp(value, 0 + offset, canvasHeight - offset)

const bricksOffsetTop = 30
const bricksOffsetLeft = 45
const bricksCols = 9
const bricksRows = 5
const brickWidth = 16
const brickHeight = 8
const brickScale = 2.5

const randomBricks: {
  x: number
  y: number
  status: 'normal' | 'broken'
  color: number
}[] = []

for (let c = 0; c < bricksCols; c++) {
  for (let r = 0; r < bricksRows; r++) {
    randomBricks.push({
      x: bricksOffsetLeft + c * brickWidth * brickScale,
      y: bricksOffsetTop + r * brickHeight * brickScale,
      status: 'normal',
      color: Math.floor(Math.random() * 8)
    })
  }
}

function App() {
  const [gameState, setGameState] = useState<'paused' | 'over' | 'win' | 'playing'>('paused')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spritesRef = useRef<HTMLImageElement>(null)
  const paddleRef = useRef({ x: (canvasWidth - paddleWidth) / 2, y: canvasHeight - paddleHeight - 10 })
  const ballRef = useRef({ x: canvasWidth / 2, y: canvasHeight - 30, xSpeed: ballSpeed, ySpeed: -ballSpeed })
  const bricksRef = useRef(randomBricks)
  const destroyedBricksRef = useRef(0)
  const keysRef = useRef({ left: false, right: false })

  useEffect(() => {
    if (gameState === 'over') {
      alert('Game Over')
      window.location.reload()
    }

    if (gameState === 'win') {
      alert('You win!')
      window.location.reload()
    }

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    let prevTime = window.performance.now()
    let prevFrameTime = prevTime + 1000
    let framesPerSec = frameRate
    let frames = 0
    let frameId: number

    function handleKeydown (e: KeyboardEvent) {
      if (gameState === 'paused') {
        setGameState('playing')
        return
      }

      if (e.key === 'ArrowLeft') {
        keysRef.current.left = true
      } 
      if (e.key === 'ArrowRight') {
        keysRef.current.right = true
      }
    }

    function handleKeyup (e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        keysRef.current.left = false
      } 
      if (e.key === 'ArrowRight') {
        keysRef.current.right = false
      }
    }

    function render () {
      frameId = window.requestAnimationFrame(render)
      const time = window.performance.now()
      const msDelta = time - prevTime
      if (msDelta < msPerFrame) {
        return
      }
      frames++
      const excess = msDelta % msPerFrame
      prevTime = time - excess
      if (prevFrameTime < time) {
        prevFrameTime = time + 1000
        framesPerSec = frames
        frames = 0
      }

      if (gameState === 'playing') {
        // paddle logic
        let paddleX = paddleRef.current.x
        if (keysRef.current.left) paddleX -= 5
        if (keysRef.current.right) paddleX += 5
        paddleX = clampInWidth(paddleX, paddleWidth)
        paddleRef.current.x = paddleX

        // ball logic
        const ballX = clampInWidth(ballRef.current.x + ballRef.current.xSpeed, ballRadius)
        const ballY = clampInHeight(ballRef.current.y + ballRef.current.ySpeed, ballRadius)

        // wall collision
        if (ballX <= ballRadius || ballX >= canvasWidth - ballRadius) {
          ballRef.current.xSpeed *= -1
        }
        if (ballY <= ballRadius) {
          ballRef.current.ySpeed *= -1
        }
        if (ballY >= canvasHeight - ballRadius) {
          setGameState('over')
        }

        console.log(ballY, canvasHeight - paddleHeight * 2 - ballRadius)

        // paddle collision
        if (
          ballX >= paddleX && 
          ballX <= paddleX + paddleWidth && 
          ballY <= canvasHeight - paddleHeight - ballRadius  &&
          ballY >= canvasHeight - paddleHeight * 2 - ballRadius
        ) {
          ballRef.current.ySpeed *= -1
        }

        // brick collision
        for (const brick of bricksRef.current) {
          if (brick.status === 'broken') {
            continue
          }
          if (
            ballX >= brick.x && 
            ballX <= brick.x + brickWidth * brickScale && 
            ballY >= brick.y && 
            ballY <= brick.y + brickHeight * brickScale
          ) {
            ballRef.current.ySpeed *= -1
            brick.status = 'broken'
            destroyedBricksRef.current++
            if (destroyedBricksRef.current === bricksRef.current.length) {
              setGameState('win')
            }
          }
        }

        ballRef.current.x = ballX
        ballRef.current.y = ballY
      }
      
      // clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      // draw fps
      ctx.fillStyle = textColor
      ctx.fillText(`FPS: ${framesPerSec}`, 10, 20)

      // draw paddle
      ctx.drawImage(
        spritesRef.current!,
        29, 
        174, 
        paddleWidth, 
        paddleHeight,
        paddleRef.current.x, 
        paddleRef.current.y, 
        paddleWidth, 
        paddleHeight
      )

      // draw ball
      ctx.beginPath()
      ctx.arc(ballRef.current.x, ballRef.current.y, ballRadius, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.closePath()

      // draw bricks
      for (const brick of bricksRef.current) {
        if (brick.status === 'broken') {
          continue
        }
        ctx.drawImage(
          spritesRef.current!,
          30 + brick.color * brickWidth, 
          83, 
          brickWidth, 
          brickHeight,
          brick.x, 
          brick.y, 
          brickWidth * brickScale, 
          brickHeight * brickScale
        )
      }


      ctx.fillStyle = 'black'
    }

    render()
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('keyup', handleKeyup)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('keydown', handleKeydown)
      window.removeEventListener('keyup', handleKeyup)
    }
  }, [gameState])

  return (
    <main>
      <canvas 
        width={canvasWidth} 
        height={canvasHeight}
        ref={canvasRef}
      />
      {gameState === 'paused' && (
        <p>Press any key to start</p>
      )}
      <img ref={spritesRef} src='/sprites.png' hidden />
    </main>
  )
}

export default App
