import { State } from './state'
import { store } from '@/store/index'
import { plus, times } from 'number-precision'
import { ImgCellType } from '@/util/image'
import { SPEED_ARRAY, SQUARE_SIZE_ARRAY } from '@/game/constants'
import { i18n } from '@/plugins/i18n'
import { message } from 'ant-design-vue'
import { BaseParser } from '@/game/BaseParser'
import { VideoParser } from '@/game/VideoParser'
import { CustomVideo } from '@/game/CustomVideo'
import { DefaultParser } from '@/game/DefaultParser'

/**
 * Mutations 函数定义，使用类型推断的方式，可以快速找到函数的所有 Usages
 */
export const mutations = {
  /** 设置是否显示录像地图 */
  setVideoMap: (state: State, isVideoMap: boolean): void => {
    state.isVideoMap = isVideoMap
  },
  /** 设置是否显示鼠标移动轨迹图 */
  setMousePathMove: (state: State, isMousePathMove: boolean): void => {
    state.isMousePathMove = isMousePathMove
  },
  /** 设置是否显示鼠标左键散点图 */
  setMousePathLeft: (state: State, isMousePathLeft: boolean): void => {
    state.isMousePathLeft = isMousePathLeft
  },
  /** 设置是否显示鼠标右键散点图 */
  setMousePathRight: (state: State, isMousePathRight: boolean): void => {
    state.isMousePathRight = isMousePathRight
  },
  /** 设置是否显示鼠标双击散点图 */
  setMousePathDouble: (state: State, isMousePathDouble: boolean): void => {
    state.isMousePathDouble = isMousePathDouble
  },
  /** 设置是否显示开空区域 */
  setShowOpening: (state: State, isShowOpening: boolean): void => {
    state.isShowOpening = isShowOpening
  },
  /** 设置方块实际显示边长 */
  setSquareSize: (state: State, squareSize: number): void => {
    if (SQUARE_SIZE_ARRAY.includes(squareSize)) {
      state.squareSize = squareSize
    }
  },
  /** 设置当前语言 */
  setLocale: (state: State, locale: string): void => {
    if (i18n.global.availableLocales.includes(locale)) {
      state.locale = locale
    }
  },
  /** 设置游戏开始的时间（毫秒） */
  setGameStartTime: (state: State, time: number): void => {
    // 非录像播放模式下，还没有方块被打开时不进行计时，只模拟游戏事件，如：标雷
    state.gameStartTime = state.gameType === 'Video' || state.gameStarted ? time : 0.0
  },
  /** 设置游戏速度 */
  setGameSpeed: (state: State, speed: number): void => {
    // 判断速度的值是否合法，不合法则不对游戏速度进行修改
    if (SPEED_ARRAY.indexOf(speed) !== -1) {
      state.gameSpeed = speed
    }
  },
  /** 设置游戏经过的时间（毫秒），拖动控制条调用此处时要进行节流处理 */
  setGameElapsedTime: (state: State, time: number): void => {
    // 当游戏经过的时间小于等于设置的时间时，遍历模拟下一个游戏事件，要判断等于的情况是因为游戏经过的时间可能是 0 ms，如：UPK 模式下还没有方块被打开，即游戏还未正式开始时
    if (state.gameElapsedTime <= time) {
      state.gameElapsedTime = time
      while (state.gameEventIndex < state.gameEvents.length && state.gameElapsedTime >= state.gameEvents[state.gameEventIndex].time) {
        store.commit('performNextEvent')
      }
    } else if (state.gameElapsedTime > time) {
      state.gameElapsedTime = time
      // 游戏事件索引可能等于游戏事件总数，需要防止数组越界，因为会对 gameEventIndex 会进行自减操作，所以此处最大值是游戏事件的长度
      state.gameEventIndex = Math.min(state.gameEventIndex, state.gameEvents.length)
      // 模拟上一个游戏事件，需要与上一个游戏事件的时间进行比较，当游戏经过的时间小于等于 0 时，模拟所有剩余事件，将游戏状态全部重置
      while (state.gameEventIndex > 0 && (state.gameElapsedTime < state.gameEvents[state.gameEventIndex - 1].time || state.gameElapsedTime <= 0)) {
        store.commit('performPreviousEvent')
      }
    }
  },
  /** 初始化游戏 */
  initGame: (state: State, parser: BaseParser): void => {
    state.width = parser.getWidth()
    state.height = parser.getHeight()
    state.mines = parser.getMines()
    state.playerArray = parser.getPlayerArray()
    state.level = parser.getLevel()
    state.bbbv = parser.getBBBV()
    state.openings = parser.getOpenings()
    state.islands = parser.getIslands()
    state.gameEvents = parser.getGameEvents()
    state.gameCellBoard = parser.getGameBoard()
  },
  /** 添加玩家操作事件 */
  pushUserEvent: (state: State, { mouse, x, y }: { mouse: 'lc' | 'lr' | 'rc' | 'rr' | 'mc' | 'mr' | 'mv' | 'sc' | 'mt', x: number, y: number }): void => {
    // 如果当前正在播放录像或者鼠标移动事件之前没有其他录像事件，则不添加当前事件
    if (state.gameType === 'Video' || (mouse === 'mv' && state.gameEvents.length === 0)) return
    state.gameEvents = state.userParser.appendEvent({ time: state.gameElapsedTime, mouse: mouse, column: Math.floor(x / 16), row: Math.floor(y / 16), x: x, y: y })
  },
  /** 接收并处理录像数据 */
  receiveVideo: (state: State, video: BaseParser): void => {
    state.videoParser = video
    // 录像解析结束后取消页面的加载状态
    store.commit('setLoading', false)
    store.commit('initGame', state.videoParser)
    store.commit('replayVideo')
  },
  /** 设置页面加载状态 */
  setLoading: (state: State, loading: boolean): void => {
    state.loading = loading
    // 如果页面处于加载状态则暂停录像播放
    if (state.loading) store.commit('setVideoPaused')
  },
  /** 设置是否匿名显示玩家名称 */
  setAnonymous: (state: State, anonymous?: boolean): void => {
    state.anonymous = anonymous === true
  },
  /** 设置页面退出状态 */
  setExit: (state: State, exit: boolean): void => {
    // 如果设置页面退出，则重置游戏相关变量
    if (exit) {
      state.gameType = 'Video'
      state.videoParser = state.userParser = new DefaultParser()
      store.commit('initGame', state.videoParser)
      store.commit('resetGame')
      // 销毁全局消息提示
      message.destroy()
    }
    state.exit = exit
  },
  /** 设置分享页面链接 */
  setShareLink: (state: State, shareLink: string): void => {
    state.shareLink = shareLink
  },
  /** 设置录像 URI */
  setURI: (state: State, uri: string): void => {
    state.uri = uri
  },
  /** 设置录像 URI 是否请求成功 */
  setURISuccess: (state: State, uriSuccess: boolean): void => {
    state.uriSuccess = uriSuccess
  },

  setVideoArray: (state: State, videoArray: Uint8Array): void => {
    state.videoArray = videoArray
  },
  setFileName: (state: State, fileName: string): void => {
    state.fileName = fileName
  },

  downloadFile: (state: State): void => {
    const blob = new Blob([state.videoArray], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = state.fileName; // 设置下载文件名  
    a.style.display = 'none'; // 隐藏a标签  
    document.body.appendChild(a); // 将a标签添加到DOM中  
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /** 切换问号标记模式 */
  toggleMarks: (state: State): void => {
    state.marks = !state.marks
  },
  /** 切换是否检测文件拖放 */
  toggleFileDrag: (state: State): void => {
    state.fileDrag = !state.fileDrag
  },
  /** 暂停录像播放 */
  setVideoPaused: (state: State): void => {
    // 只在录像播放时停止动画
    if (state.gameType === 'Video') state.videoAnimationId = 0
  },
  /** 模拟上一个游戏事件 */
  performPreviousEvent: (state: State): void => {
    // 保存并更新当前事件索引
    const eventIndex = --state.gameEventIndex
    // 根据事件索引获取游戏事件
    const event = state.gameEvents[eventIndex]
    // 根据坐标获取图片索引
    const imgIndex = event.column + event.row * state.width
    // 如果存在快照信息，一般是先模拟下一个事件再回放模拟上一个事件，所以都是有快照信息的
    if (event.snapshot) {
      // 根据快照还原图片状态
      state.gameImgBoard[imgIndex] = event.snapshot.cellType
      // 根据快照还原笑脸状态
      state.faceStatus = event.snapshot.faceStatus
    }
    switch (event.name) {
      case 'Start':
        state.gameStarted = false
        break
      case 'MouseMove':
        state.gameMousePoints.pop()
        break
      case 'LeftIncrease':
        state.gameLeftPoints.pop()
        break
      case 'RightIncrease':
        state.gameRightPoints.pop()
        break
      case 'DoubleIncrease':
        state.gameDoublePoints.pop()
        break
    }
  },
  /** 模拟下一个游戏事件 */
  performNextEvent: (state: State): void => {
    // 保存并更新当前事件索引
    const eventIndex = state.gameEventIndex++
    // 根据事件索引获取游戏事件
    const event = state.gameEvents[eventIndex]
    // 根据坐标获取图片索引
    const imgIndex = event.column + event.row * state.width
    // 在更新前保存快照
    event.snapshot = {
      cellType: state.gameImgBoard[imgIndex],
      faceStatus: state.faceStatus
    }
    switch (event.name) {
      case 'Start':
        state.gameStarted = true
        break
      case 'MouseMove':
        state.gameMousePoints.push({ x: event.x, y: event.y })
        break
      case 'LeftIncrease':
        state.gameLeftPoints.push({ x: event.x, y: event.y })
        break
      case 'RightIncrease':
        state.gameRightPoints.push({ x: event.x, y: event.y })
        break
      case 'DoubleIncrease':
        state.gameDoublePoints.push({ x: event.x, y: event.y })
        break
      case 'LeftPress':
        state.faceStatus = 'face-press-cell'
        break
      case 'LeftPressWithShift':
        state.faceStatus = 'face-press-cell'
        break
      case 'LeftRelease':
        state.faceStatus = 'face-normal'
        break
      case 'RightPress':
        state.faceStatus = 'face-press-cell'
        break
      case 'RightRelease':
        state.faceStatus = 'face-normal'
        break
      case 'MiddlePress':
        state.faceStatus = 'face-press-cell'
        break
      case 'MiddleRelease':
        state.faceStatus = 'face-normal'
        break
      case 'Flag':
        state.gameImgBoard[imgIndex] = 'cell-flag'
        break
      case 'RemoveFlag':
        state.gameImgBoard[imgIndex] = 'cell-normal'
        break
      case 'QuestionMark':
        state.gameImgBoard[imgIndex] = 'cell-question'
        break
      case 'RemoveQuestionMark':
        state.gameImgBoard[imgIndex] = 'cell-normal'
        break
      case 'Press':
        state.gameImgBoard[imgIndex] = 'cell-press'
        break
      case 'Release':
        state.gameImgBoard[imgIndex] = 'cell-normal'
        break
      case 'Mine':
        state.gameImgBoard[imgIndex] = 'cell-mine'
        break
      case 'Mislabeled':
        state.gameImgBoard[imgIndex] = 'cell-flag-wrong'
        break
      case 'Blast':
        state.gameImgBoard[imgIndex] = 'cell-mine-bomb'
        break
      case 'Open':
        state.gameImgBoard[imgIndex] = ('cell-number-' + event.number) as ImgCellType
        break
      case 'Win':
        // 停止游戏动画
        state.videoAnimationId = 0
        state.faceStatus = 'face-win'
        console.log('Game win')
        break
      case 'Lose':
        state.videoAnimationId = 0
        state.faceStatus = 'face-lose'
        console.log('Game lose')
        break
      case 'UnexpectedEnd':
        // 录像意外结尾时只停止游戏动画，即游戏事件全部模拟完成后没有胜利也没有失败
        state.videoAnimationId = 0
        console.log('Unexpected end of the game')
        break
    }
  },
  /** 重置游戏参数 */
  resetGame: (state: State): void => {
    state.gameImgBoard = Array.from(Array(state.width * state.height), () => 'cell-normal')
    state.gameStarted = false
    state.gameElapsedTime = 0.0
    state.gameEventIndex = 0
    state.faceStatus = 'face-normal'
    state.gameMousePoints = []
    state.gameLeftPoints = []
    state.gameRightPoints = []
    state.gameDoublePoints = []
  },
  /** 重开游戏 */
  upk: (state: State): void => {
    const parser = state.videoParser
    const video = new CustomVideo(parser.getWidth(), parser.getHeight(), parser.getMines(), state.marks, parser.getLevel(), parser.getVideoBoard())
    state.userParser = new VideoParser(video, true)
    store.commit('initGame', state.userParser)
    // 设置游戏类型
    state.gameType = 'UPK'
    // 重置变量
    store.commit('resetGame')
    // 播放录像
    store.commit('playVideo')
  },
  /** 重新播放游戏录像，TODO 进行函数节流处理 */
  replayVideo: (state: State): void => {
    state.gameEvents = state.videoParser.getGameEvents()
    // 设置游戏类型
    state.gameType = 'Video'
    // 重置变量
    store.commit('resetGame')
    // 播放录像
    store.commit('playVideo')
  },
  /** 播放游戏录像，TODO 进行函数节流处理 */
  playVideo: (state: State): void => {
    // 重置游戏开始时间
    state.gameStartTime = 0.0
    // 直接使用 requestAnimationFrame 回调的时间戳，可能会有较大误差，包括回调时间戳本身的误差和小数计算产生的误差，特别是在 Vuex 开启严格模式的时候
    const animationId = requestAnimationFrame(function performEvent() {
      const timestamp = Date.now()
      // 此处不判断当前游戏事件索引是否大于游戏事件数量，因为非录像模式下两者是相等的，如：UPK
      if (state.videoAnimationId !== animationId || state.exit) {
        // 停止更新动画
        return
      }
      // 更新游戏经过的时间（毫秒）,首次时间为 0 ms
      const elapsedTime = state.gameStartTime === 0 ? 0 : timestamp - state.gameStartTime
      // 非录像播放时速度始终为一倍速
      store.commit('setGameElapsedTime', plus(state.gameElapsedTime, times(elapsedTime, state.gameType === 'Video' ? state.gameSpeed : 1)))
      // 重置游戏开始时间（毫秒）
      store.commit('setGameStartTime', timestamp)
      window.requestAnimationFrame(performEvent)
    })
    // 更新动画ID，取消其他动画
    state.videoAnimationId = animationId
  }
}

/** payload 参数可以为空的函数名称集合 */
const EmptyPayloadFunction = [
  'upk',
  'toggleMarks',
  'toggleFileDrag',
  'setVideoPaused',
  'performPreviousEvent',
  'performNextEvent',
  'resetGame',
  'replayVideo',
  'playVideo',
  'downloadFile',
] as const

/** payload 参数不能为空的函数类型集合 */
export type MutationsMustPayload = Omit<typeof mutations, typeof EmptyPayloadFunction[number]>

/** payload 参数可以为空的函数类型集合 */
export type MutationsEmptyPayload = Omit<typeof mutations, keyof MutationsMustPayload>
