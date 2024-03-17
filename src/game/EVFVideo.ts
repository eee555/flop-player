/*****************************************************************
 Original script by eee555 2024-2-5.
 *****************************************************************/

import { BaseVideo, VideoEvent } from '@/game/BaseVideo'

interface Event {
  time: number
  x: number
  y: number
  event: 'lc' | 'lr' | 'rc' | 'rr' | 'mc' | 'mr' | 'mv' | 'sc' | 'mt'
}

export class EVFVideo extends BaseVideo {
  protected mName = 'EVFVideo'
  protected mWidth: number
  protected mHeight: number
  protected mMines: number
  protected mMarks: boolean
  protected mLevel: number
  protected mBoard: number[]
  protected mPlayer: Uint8Array
  protected mEvents: VideoEvent[] = []

  // Mode
  private mode = 0
  // Level
  private level = 0
  // Width
  private w = 0
  // Height
  private h = 0
  // Mines
  private m = 0
  // Number of game events
  private size = 0
  // Stores board and mine locations
  private board: number[] = []
  // Questionmarks
  private qm = 0
  // Style
  private nf = 0
  // Player name
  private name: Uint8Array = new Uint8Array();
  // Player nickname
  // Program
  // Game events
  private video: Event[] = []
  // Cell size used in mouse movement calculations
  private squareSize = 16

  constructor (data: ArrayBuffer) {
    super(data)
    this.mWidth = 0;
    this.mHeight = 0;
    this.mMines = 0;
    this.mMarks = false;
    this.mLevel = 0;
    this.mBoard = [];
    this.mPlayer = new Uint8Array();
  }

  async init(){
    // 解析 EVF 录像
    await this.readevf();
    
    // 设置录像基本信息
    this.mWidth = this.w
    this.mHeight = this.h
    this.mMines = this.m
    this.mMarks = this.qm !== 0
    this.mLevel = this.level + 1
    this.mBoard = this.board
    // 设置玩家名称
    this.mPlayer = this.name
    // 设置录像事件
    // const eventNames: ('mv' | 'lc' | 'lr' | 'rc' | 'rr' | 'mc' | 'mr')[] = ['mv', 'lc', 'lr', 'rc', 'rr', 'mc', 'mr']
    
    for (let i = 0; i < this.size; ++i) {
      const e = this.video[i]
      // Mouse event
      
      if (e.event) {
        this.mEvents.push({
          time: e.time,
          mouse: e.event,
          column: Math.floor(e.x / this.squareSize),
          row: Math.floor(e.y / this.squareSize),
          x: e.x / this.squareSize * 16,
          y: e.y / this.squareSize * 16
        })
      }
    }
  }

  /**
   * Function is used to read video data
   */
  private async readevf () {
    // Initialise local variables
    let i, j;

    const ms = await import("ms-toollib");

    let aa = ms.EvfVideo.new(this.mData, "");
    aa.parse_video();
    aa.analyse();
    this.w = aa.get_column;
    this.h = aa.get_row;
    this.m = aa.get_mine_num;
    this.squareSize = aa.get_pix_size;
    this.qm = 0;
    this.level = aa.get_level - 3;
    aa.current_time = 1e8;
    let game_board = JSON.parse(aa.get_game_board) as Array<Array<number>>;
    this.board = new Array(this.w * this.h).fill(0)
    let total_10 = 0; // 每扫开的格子数量，看是否等于雷数
    for(i = 0; i < this.h; i++){
      for(j = 0; j < this.w; j++){
        if (game_board[i][j] >= 10){
          this.board[i * this.w + j] = 1;
          total_10 += 1;
        }
      }
    }
    this.name = aa.get_player_designator
    if(total_10 != this.m){
      this.error('不能播放没有扫完的录像。')
    }
    
    this.size = aa.get_events_len;
    for(i = 0; i < aa.get_events_len; i++){
      let events_mouse;
      if(aa.events_mouse(i) == "cc"){
        if(aa.events_mouse_state(i - 1) == 2 || aa.events_mouse_state(i - 1) == 3){
          events_mouse = "lc";
        } else if (aa.events_mouse_state(i - 1) == 4 || aa.events_mouse_state(i - 1) == 7) {
          events_mouse = "rc";
        } else{
          this.error('鼠标状态和鼠标操作发生矛盾。')
        }
      } else {
        events_mouse = aa.events_mouse(i);
      }
      
      this.video.push({
        time: Math.round((Math.max(aa.events_time(i) + aa.get_video_start_time, 0)) * 1000),
        x: aa.events_x(i),
        y: aa.events_y(i),
        event: events_mouse as "lc" | "rc" | "lr" | "rr" | "mc" | "mr" | "mv" | "sc" | "mt"
      })
    }

    return 1;

  }
}
