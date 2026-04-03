/*****************************************************************
 Original script by Maksim Bashov 2012-10-23.

 Modified by ShenJia Zhang 2013-11-11. Added Time and 3BV.

 Modified during 2019-02 by Damien Moore. Added ELSE statements so Mode and Marks
 always print (so same number of lines in output), changed Version code to work with
 older versions and to retrieve the third part if it exists (i.e., 0.52.3 or 0.45
 DEBUG), added Style and BBBVS variables and tested parser with all versions since
 0.43 demo3. On 2019-02-22 fixed issue caused by Custom games having more bytes in
 the header. On 2019-02-24 fixed bug caused when score_ths has a leading zero. Also
 fixed errors with Time rounding versus truncating to 3 decimal places.

 Modified by Damien Moore 2020-01-24. Corrected minor error where the leading empty
 space in third part of Version was being deleted. Tidied up code and wrote comments.
 Modified 2020-02-07 to make backwards compatible to 0.35. This is being released as
 Arbiter RAW version 6.

 Updated 2021-05-26 by Damien to remove legacy Freesweeper code and remove Arbiter cheat
 code as Arbiter does not allow cheat mode videos.

 Modified by Enbin Hu (Flop) 2021-11-07. Rewrote with TypeScript.

 Note Arbiter internals operate to 2 decimal places. You cannot get 3 decimal places
 by subtracting timestamp_a from timestamp_b because these timestamps do not perfectly
 match start and finish of the game timer. This versions adds a fake 0 as the third
 decimal place for consistency with the other official minesweeper versions.

 Tested successfully on Arbiter 0.35 and later.
 *****************************************************************/

import { BaseVideo, VideoEvent } from '@/game/BaseVideo'

interface Event {
  time: number
  x: number
  y: number
  event: 'lc' | 'lr' | 'rc' | 'rr' | 'mc' | 'mr' | 'mv' | 'sc' | 'mt'
}

export class AVFVideo extends BaseVideo {
  protected readonly mName = 'AVFVideo'
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
    // 解析 AVF 录像
    
    await this.readavf();
    
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
    
    for (let i = 0; i < this.video.length; ++i) {
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
  private async readavf () {
    // Initialise local variables
    let i, j;

    const ms = await import("ms-toollib");

    let aa = new ms.AvfVideo(this.mData, "");
    
    aa.parse();
    aa.analyse();
    this.w = aa.column;
    this.h = aa.row;
    this.m = aa.mine_num;
    this.squareSize = aa.pix_size;
    this.qm = 0;
    this.level = aa.level - 3;
    aa.current_time = 1e8;
    let game_board: Array<Array<number>> = aa.game_board;
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
    this.name = new TextEncoder().encode(aa.player_identifier)
    if(total_10 != this.m){
      this.error('不能播放没有扫完的录像。')
    }
   
    for (let e of aa.events) {
      if(!e.event.is_mouse()){
        continue;
      }
      const e_mouse = e.event.unwrap_mouse();
      
      this.video.push({
        time: Math.round((Math.max(e.time + aa.video_start_time, 0)) * 1000),
        x: e_mouse.x,
        y: e_mouse.y,
        event: e_mouse.mouse as "lc" | "rc" | "lr" | "rr" | "mc" | "mr" | "mv" | "sc" | "mt"
      })
    }

    return 1;

  }
}


